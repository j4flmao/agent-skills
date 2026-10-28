# Retry Strategies for Agent Harnesses

How an agent harness should retry failed model calls and tool calls: what is retryable, backoff with jitter, retry budgets, idempotency for side-effecting tools, and when to stop retrying and escalate to fallback or a human.

## 1. Retry Decision Table

| Failure | Retry? | Notes |
|---|---|---|
| Network error, connection reset, timeout before response | Yes | Only if the operation is idempotent or carries an idempotency key |
| HTTP 429 rate limited | Yes | Honour `Retry-After`; shared rate budget across workers |
| HTTP 408, 502, 503, 504; provider "overloaded" (e.g. 529) | Yes | Backoff with jitter |
| HTTP 500 | Limited (1–2) | May be persistent |
| HTTP 400/401/403/404/422 | No | Fix request, credentials, or input |
| Model output fails schema validation | Yes, as a *repair* retry | Send the validation error back to the model (see `fallback-chain-patterns.md` and correction loops) |
| Tool returned a business error ("insufficient funds", "file not found") | No blind retry | Return the error to the model as a tool result so it can re-plan |
| Context length exceeded | No | Compact context or switch strategy |
| Content policy refusal | No | Surface to the caller |

## 2. Exponential Backoff with Full Jitter

```python
from __future__ import annotations
import logging, random, time
from dataclasses import dataclass
from typing import Callable, TypeVar

T = TypeVar("T")
log = logging.getLogger(__name__)

class RetryableError(Exception):
    def __init__(self, msg: str, retry_after: float | None = None):
        super().__init__(msg)
        self.retry_after = retry_after

@dataclass(frozen=True, slots=True)
class RetryPolicy:
    max_attempts: int = 4
    base_delay: float = 0.5      # seconds
    max_delay: float = 30.0
    deadline: float = 120.0      # total seconds for all attempts

def call_with_retry(op: Callable[[], T], policy: RetryPolicy, *, name: str) -> T:
    start = time.monotonic()
    for attempt in range(1, policy.max_attempts + 1):
        try:
            return op()
        except RetryableError as e:
            elapsed = time.monotonic() - start
            if attempt == policy.max_attempts:
                log.error("op=%s failed after %d attempts: %s", name, attempt, e)
                raise
            delay = e.retry_after if e.retry_after is not None else \
                random.uniform(0, min(policy.max_delay, policy.base_delay * 2 ** (attempt - 1)))
            if elapsed + delay > policy.deadline:
                log.error("op=%s retry deadline exceeded after %d attempts", name, attempt)
                raise
            log.warning("op=%s attempt=%d retrying in %.2fs: %s", name, attempt, delay, e)
            time.sleep(delay)
    raise AssertionError("unreachable")
```

Full jitter (`uniform(0, cap)`) spreads retries from many agents so they do not hit the provider in synchronized waves.

## 3. Retry Budgets

Per-call retry limits are not enough when hundreds of agent runs fail at once. Add a budget:

```python
import threading, time

class RetryBudget:
    """Allow retries up to `ratio` of recent successful calls (token bucket)."""
    def __init__(self, ratio: float = 0.1, min_per_sec: float = 1.0):
        self.ratio, self.min_per_sec = ratio, min_per_sec
        self.tokens, self.last = 10.0, time.monotonic()
        self.lock = threading.Lock()

    def on_success(self) -> None:
        with self.lock:
            self.tokens = min(100.0, self.tokens + self.ratio)

    def try_spend(self) -> bool:
        with self.lock:
            now = time.monotonic()
            self.tokens = min(100.0, self.tokens + (now - self.last) * self.min_per_sec)
            self.last = now
            if self.tokens >= 1.0:
                self.tokens -= 1.0
                return True
            return False
```

When the budget is exhausted, fail fast and let the fallback chain or circuit breaker take over.

## 4. Retry at One Layer Only

Agent stacks often have several retry layers: SDK client, HTTP gateway, harness, orchestrator. Retries multiply (3 × 3 × 3 = 27 attempts). Pick one owner:

| Layer | Recommended |
|---|---|
| SDK client (e.g. provider SDK `max_retries`) | Transport-level retries for 429/5xx, or disable and let the harness own them |
| Harness | Policy-aware retries, budgets, logging, fallbacks |
| Orchestrator (workflow engine) | Retries whole steps only for crashes, with checkpoints |

Document which layer owns retries and set others to zero.

## 5. Idempotency for Side-Effecting Tools

A timeout after a `send_email` or `create_ticket` call does not mean it failed. Before retrying:
- Generate an idempotency key per logical action (`run_id:step:tool_call_id`) and pass it to the tool/API.
- Tool implementations store key → result and return the stored result on repeats.
- If the API lacks idempotency keys, query for the effect (did the ticket get created?) before retrying.

```python
def create_ticket(args: dict, *, idempotency_key: str, store, api) -> dict:
    if (prior := store.get(idempotency_key)) is not None:
        return prior
    result = api.create_ticket(**args, idempotency_key=idempotency_key)
    store.put(idempotency_key, result)
    return result
```

## 6. Model-Level Retries vs Re-Prompting

| Situation | Action |
|---|---|
| Transport failure | Same request, backoff |
| Truncated output (`max_tokens` stop) | Continue generation or raise the limit; do not resend blindly |
| Invalid JSON / schema mismatch | Repair prompt including the validator error; cap at 1–2 repairs |
| Tool chosen with invalid arguments | Return validation error as tool result; let the model correct |
| Repeated identical failing action | Stop: loop detection, escalate |

## 7. Observability

Log per attempt: operation, attempt number, error class, delay, idempotency key, run ID. Metrics: retry rate per provider/tool, retries per successful call, budget exhaustion events. A rising retry rate is an early outage signal.

## Pitfalls

- Retrying non-idempotent tools after timeouts: duplicate emails, payments, tickets.
- Ignoring `Retry-After`, prolonging rate limiting.
- Unbounded retries inside an agent loop that already has a step limit, burning tokens.
- Retrying 4xx errors that will never succeed.
- Same seedless backoff across workers (no jitter): thundering herd.

## Checklist

- [ ] Error classification decides retryability.
- [ ] Exponential backoff with full jitter, max attempts, and total deadline.
- [ ] Retry budget shared across concurrent runs.
- [ ] One layer owns retries.
- [ ] Side-effecting tools use idempotency keys.
- [ ] Retry metrics and logs with run IDs.
