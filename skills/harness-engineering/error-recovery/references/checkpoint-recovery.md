# Checkpoint and Resume for Long-Running Agents

Long agent runs (multi-step research, coding tasks, workflows with human approvals) must survive crashes, deploys, timeouts, and pauses. Checkpointing persists the run's state after each step so it can resume without repeating completed work or side effects.

## 1. What to Persist

| State | Why |
|---|---|
| Run metadata: run ID, task, config versions (model, prompt, toolset) | Resume with the same behaviour |
| Message history or a compacted summary | Model context |
| Structured working state (plan, completed steps, artifacts, variables) | Routing decisions read fields, not prose |
| Pending tool calls and their idempotency keys | Avoid duplicate side effects |
| Completed tool results | Do not re-execute on resume |
| Budget counters: steps, tokens, cost, wall time | Limits continue across resumes |
| Pending human approvals | Resume after approval |
| Environment references: sandbox snapshot ID, branch, file hashes | Restore workspace |

## 2. Step Protocol (Write-Ahead)

```
for each step:
  1. load checkpoint (state version N)
  2. decide next action (model call)
  3. persist intent: {step N+1, tool, args, idempotency_key, status: "pending"}
  4. execute tool with idempotency_key
  5. persist result: status "done", output, state version N+1
```

On restart, any step in `pending` state is reconciled: re-execute with the same idempotency key (safe if the tool honours keys) or query the external system for the effect.

## 3. Checkpoint Store

```python
from __future__ import annotations
import json, logging
from dataclasses import dataclass, asdict, field
from typing import Any

log = logging.getLogger(__name__)

@dataclass(slots=True)
class RunState:
    run_id: str
    version: int
    status: str                                   # running | waiting_approval | done | failed
    config: dict[str, str]                        # model, prompt_version, toolset_version
    plan: list[str]
    completed_steps: list[dict[str, Any]] = field(default_factory=list)
    pending_step: dict[str, Any] | None = None
    messages: list[dict[str, Any]] = field(default_factory=list)
    budget: dict[str, float] = field(default_factory=dict)

class CheckpointStore:
    """Postgres-backed; optimistic concurrency on version."""
    def __init__(self, conn):
        self.conn = conn

    def save(self, s: RunState) -> None:
        with self.conn.cursor() as cur:
            cur.execute(
                """INSERT INTO agent_checkpoints (run_id, version, state)
                   VALUES (%s, %s, %s::jsonb)""",
                (s.run_id, s.version, json.dumps(asdict(s))))
        self.conn.commit()

    def load_latest(self, run_id: str) -> RunState:
        with self.conn.cursor() as cur:
            cur.execute("""SELECT state FROM agent_checkpoints
                           WHERE run_id = %s ORDER BY version DESC LIMIT 1""", (run_id,))
            row = cur.fetchone()
        if row is None:
            raise LookupError(f"no checkpoint for run_id={run_id}")
        return RunState(**row[0])
```

```sql
CREATE TABLE agent_checkpoints (
  run_id   TEXT NOT NULL,
  version  INT  NOT NULL,
  state    JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (run_id, version)        -- concurrent writers of the same version conflict
);
```

The primary key makes two workers resuming the same run fail on the second write instead of forking the run.

## 4. Framework Support

| Framework | Mechanism |
|---|---|
| LangGraph | Checkpointers (`InMemorySaver` for tests, `PostgresSaver`, `SqliteSaver`, Redis) keyed by `thread_id`; `interrupt()` for human-in-the-loop resumes via `Command(resume=...)` |
| Temporal / durable workflow engines | Workflow history replay; activities retried with deterministic workflow code |
| AWS Step Functions, Azure Durable Functions | State machine state persisted per execution |
| OpenAI Agents SDK / Claude Agent SDK | Session/conversation persistence; application stores structured state |

Durable execution engines give crash recovery for orchestration code, but tool side effects still need idempotency.

## 5. Context on Resume

- Long histories: resume from a checkpointed summary plus the last K messages, not the full transcript.
- Re-inject invariant instructions (task, constraints, safety rules) after compaction.
- Version the prompt/toolset in the checkpoint; if the deployed version changed, either resume with the old version or deliberately migrate the state.

## 6. Environment Checkpoints

For coding/computer-use agents the workspace is state too:
- Commit work-in-progress to a branch per run, or snapshot the sandbox/container volume.
- Store file hashes of key artifacts in the checkpoint to detect drift on resume.
- Restore sandbox from snapshot before replaying the next step.

## 7. Rollback to an Earlier Checkpoint

Useful when the agent went down a wrong path:
- Load version N, discard later versions (keep them for audit), and continue with a corrective instruction.
- External side effects after version N are not undone automatically; list them from the completed-steps log and compensate where needed.

## Pitfalls

- Checkpointing only the transcript: structured progress must be re-derived from prose on resume.
- Executing a tool before persisting the intent: crash in between causes a duplicate on resume.
- Two workers resuming the same run concurrently.
- Resuming with a newer prompt/model silently, changing behaviour mid-run.
- Unbounded checkpoint growth: keep the last few versions plus milestones.

## Checklist

- [ ] Typed run state persisted after every step with a version number.
- [ ] Write-ahead intent with idempotency keys for side-effecting tools.
- [ ] Single-writer guarantee per run (unique version constraint or lease).
- [ ] Budgets and config versions carried across resumes.
- [ ] Workspace snapshots for agents that modify environments.
- [ ] Resume path tested by killing workers mid-run.
