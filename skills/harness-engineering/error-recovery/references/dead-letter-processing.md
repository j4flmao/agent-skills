# Dead-Letter Processing for Agent Tasks

Agent tasks that exhaust retries and fallbacks must not vanish. A dead-letter queue (DLQ) captures them with enough context to diagnose, fix, and replay. This reference covers DLQ design for agent workloads, triage, replay, and retention.

## 1. When a Task Goes to the DLQ

| Condition | Example |
|---|---|
| Retries exhausted on transient errors | Provider outage outlasted the retry deadline |
| Permanent error | Invalid input, missing permissions, unsupported file type |
| Validation repeatedly failed | Output never passed schema/verification after repair attempts |
| Budget exceeded | Step, token, or cost limit reached without completion |
| Safety stop | Guardrail blocked; needs human review, not replay |
| Poison input | Same task crashes the worker every time |

Distinguish "retry later" (transient, replayable after recovery) from "needs a fix" (code, prompt, or data change) and "needs a human" (safety, ambiguous request).

## 2. Dead-Letter Record

```python
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

@dataclass(frozen=True, slots=True)
class DeadLetter:
    task_id: str
    run_id: str
    queue: str                          # origin queue/workflow
    payload: dict[str, Any]             # original task input (redacted where required)
    error_class: str                    # from the error taxonomy
    error_message: str
    attempts: int
    first_failed_at: datetime
    last_failed_at: datetime
    config: dict[str, str]              # model, prompt_version, toolset_version
    checkpoint_ref: str | None          # pointer to last checkpoint for resume
    disposition: str = "retry_later"    # retry_later | needs_fix | needs_human | discard
    tags: dict[str, str] = field(default_factory=dict)
```

Store the checkpoint reference so replay can resume rather than restart, avoiding repeated side effects.

## 3. Broker Support

| Broker | DLQ mechanism |
|---|---|
| Amazon SQS | Redrive policy `maxReceiveCount` → DLQ; DLQ redrive API moves messages back |
| RabbitMQ | Dead-letter exchange (`x-dead-letter-exchange`) on reject/expiry/length limit; quorum queues support `x-delivery-limit` |
| Kafka | No built-in DLQ; consumer writes failures to a `<topic>.dlq` topic (Kafka Connect has `errors.deadletterqueue.topic.name`) |
| Google Pub/Sub | Dead-letter topic with `max_delivery_attempts` |
| Azure Service Bus | Built-in `$DeadLetterQueue` sub-queue per queue/subscription |
| Celery / RQ / workflow engines | Failed task registries; workflow engines keep failed executions inspectable |

Broker-level DLQs catch crashes and poison messages; the harness should also dead-letter tasks it gives up on deliberately, with the richer record above (often in a database table).

## 4. Writing to the DLQ

```python
import json, logging
log = logging.getLogger(__name__)

def dead_letter(store, sqs, dl: DeadLetter, dlq_url: str) -> None:
    store.insert_dead_letter(dl)                       # queryable record for triage
    sqs.send_message(QueueUrl=dlq_url, MessageBody=json.dumps({"task_id": dl.task_id}))
    log.error("dead-lettered task=%s run=%s class=%s attempts=%d: %s",
              dl.task_id, dl.run_id, dl.error_class, dl.attempts, dl.error_message)
```

Redact secrets and unnecessary personal data from payloads before storage; DLQs are often readable by more people than the source system.

## 5. Triage Workflow

```
New dead letters
  ├─ group by (error_class, subclass, config version)   → spot systemic causes
  ├─ transient + dependency now healthy                  → bulk replay
  ├─ needs_fix                                           → ticket; replay after deploy
  ├─ needs_human                                         → review queue with context
  └─ invalid input                                       → notify requester; discard
```

Useful triage query:

```sql
SELECT error_class, config->>'prompt_version' AS prompt_version, count(*) AS n,
       min(first_failed_at) AS since
FROM dead_letters
WHERE disposition IN ('retry_later', 'needs_fix') AND resolved_at IS NULL
GROUP BY 1, 2 ORDER BY n DESC;
```

## 6. Replay

```python
def replay(store, enqueue, *, error_class: str, limit: int, rate_per_sec: float) -> int:
    import time
    count = 0
    for dl in store.unresolved(error_class=error_class, limit=limit):
        enqueue(dl.payload, resume_from=dl.checkpoint_ref, idempotency_key=dl.task_id)
        store.mark_replayed(dl.task_id)
        count += 1
        time.sleep(1.0 / rate_per_sec)            # avoid overwhelming the recovered dependency
    return count
```

Rules:
- Replay with the same idempotency key so completed side effects are not repeated.
- Rate-limit replays; a backlog replayed at once can cause a second outage.
- Decide whether replay uses the original config or the fixed version; record which.
- Cap replays per task; a task that dead-letters again after replay goes to `needs_human`.

## 7. Alerting and Metrics

| Metric | Alert when |
|---|---|
| DLQ arrival rate | Spikes above baseline (systemic failure) |
| DLQ age (oldest unresolved) | Exceeds triage SLA |
| DLQ size by class | Growing steadily |
| Replay success rate | Low (fix did not work) |

## 8. Retention

Keep dead letters long enough for triage and audit (for example 14–30 days for operational queues; SQS maximum message retention is 14 days, so persist records elsewhere if longer is needed). Purge or anonymize payloads per data-retention policy.

## Pitfalls

- DLQ with no owner or alert: failures accumulate silently.
- Replaying from scratch instead of the checkpoint: duplicated side effects and wasted tokens.
- Storing full prompts with secrets or PII in a widely readable DLQ.
- Auto-replaying safety-stopped tasks.

## Checklist

- [ ] Every give-up path writes a structured dead-letter record.
- [ ] Dispositions distinguish retry, fix, human, discard.
- [ ] Triage grouped by error class and config version, with an owner and SLA.
- [ ] Replays idempotent, rate-limited, capped.
- [ ] DLQ arrival and age alerts; retention and redaction policy applied.
