# Failure Mitigation in Multi-Agent Systems

Multi-agent systems fail more often than single agents because errors compound across steps and handoffs. This reference catalogs failure modes, the arithmetic of compounding errors, and concrete mitigations: validation at boundaries, bounded retries, checkpoints, circuit breakers, fallbacks, and human escalation.

## Why Failures Compound

If each step of a pipeline succeeds independently with probability p, a chain of n steps succeeds with probability p^n. For example, five steps at 0.95 each give about 0.77 end-to-end. Mitigations either raise per-step reliability, shorten chains, or detect and recover from failures before they propagate.

## Failure Taxonomy

| Category | Examples |
|---|---|
| Specification | Ambiguous task, agent role overlap, missing acceptance criteria |
| Model output | Hallucinated facts or tool arguments, malformed JSON, ignoring instructions |
| Tool/environment | Timeouts, rate limits, API errors, stale data, sandbox failures |
| Coordination | Lost context in handoff, two agents editing the same artifact, deadlock waiting on each other, infinite delegation loops |
| Termination | Premature "done", never terminating, verification skipped |
| Security | Prompt injection via tool output, privilege escalation through another agent |
| Resource | Token/cost overruns, context window overflow |

## Mitigations by Layer

### 1. Specification and roles
- Each agent has one responsibility, a small tool set, and explicit done criteria.
- Handoff contracts: typed input/output schemas between agents.
- Prefer the simplest topology; add agents only when evals show the single agent failing.

### 2. Validate at every boundary
```python
from __future__ import annotations

import logging

from pydantic import BaseModel, ValidationError

log = logging.getLogger(__name__)


class ResearchResult(BaseModel):
    claims: list[str]
    sources: list[str]


def parse_handoff(raw: str, agent_id: str, task_id: str) -> ResearchResult:
    try:
        result = ResearchResult.model_validate_json(raw)
    except ValidationError as exc:
        log.warning("Invalid handoff from agent=%s task=%s: %s", agent_id, task_id, exc)
        raise
    if len(result.sources) < len(result.claims):
        raise ValueError(f"Agent {agent_id} task {task_id}: claims without sources")
    return result
```
Use structured outputs / JSON schema modes where the model API supports them; still validate.

### 3. Bounded retries with feedback
- Retry transient tool errors with capped exponential backoff and jitter.
- Retry invalid model output by feeding the validation error back, at most 1–3 times.
- Never retry non-idempotent side effects without an idempotency key.

### 4. Loop and budget limits
| Limit | Typical control |
|---|---|
| Max steps / recursion | LangGraph `recursion_limit`, agent SDK `max_turns` |
| Max delegation depth | Counter in shared state |
| Token / cost budget | Track usage per run; stop at cap |
| Wall-clock timeout | Per tool call and per run |
| Repeated-action detection | Same tool + args N times -> stop |

```python
config = {"recursion_limit": 25, "configurable": {"thread_id": run_id}}
result = graph.invoke(initial_state, config=config)
```

### 5. Checkpointing and resumability
Persist state after each node (LangGraph checkpointers, durable workflow engines such as Temporal). On failure, resume from the last good checkpoint instead of restarting the whole run, and avoid repeating completed side effects.

### 6. Verification before completion
- Code: tests, linters, type checks run by a tool, not judged by an LLM.
- Facts: citations resolved and checked against retrieved text.
- Data changes: dry-run diff reviewed before apply.
- Require the verifier's evidence in state before the run can end as "success".

### 7. Circuit breakers and fallbacks
- If a tool or model fails repeatedly, open a breaker and stop calling it for a cool-down period.
- Fallbacks: alternative model, cached result, reduced-functionality answer, or explicit "cannot complete" with reasons.

### 8. Human escalation
Escalate when: verification fails after retries, confidence/agreement is low, an action is destructive or irreversible, or the budget is exhausted. Use interrupts (`interrupt_before=["apply_changes"]` or `interrupt()` in the node, with a checkpointer) and include a concise summary of state for the reviewer.

### 9. Isolation
- Agents with write access work in sandboxes or branches; merge only after checks.
- Single-writer rule per artifact; others propose changes.
- Least-privilege tools per agent; reviewers read-only.

## Failure-Handling State
```python
from typing import Literal, TypedDict


class RunState(TypedDict):
    task: str
    step: int
    max_steps: int
    tokens_used: int
    token_budget: int
    errors: list[dict]                 # {"agent", "kind", "message", "step"}
    retries: dict[str, int]            # per node
    status: Literal["running", "needs_human", "failed", "succeeded"]
```
Routing functions read `status`, `retries`, and budgets, not free-text messages.

## Observability for Failure Analysis
Log per tool call: agent, tool name, arguments (redacted), result size, latency, error. Tag runs with outcome and failure category. Review failed traces regularly and turn recurring ones into eval cases.

| Metric | Use |
|---|---|
| Task success rate (end-to-end, verified) | Primary quality signal |
| Failure category distribution | Where to invest |
| Retries per run, escalation rate | Hidden fragility |
| Cost and latency per successful task | Efficiency |

## Anti-Patterns
- Agents grading their own work as the only check.
- Unlimited "reflect and retry" loops.
- Swallowing tool errors and continuing with partial data.
- Passing entire chat histories between agents instead of compact, validated handoffs.
- Treating tool output as instructions.

## Checklist
- [ ] Typed handoff schemas validated at each boundary
- [ ] Bounded retries, steps, delegation depth, tokens and time
- [ ] Checkpoints enable resume without repeating side effects
- [ ] Programmatic verification required for "success"
- [ ] Breakers and fallbacks for flaky tools/models
- [ ] Human approval for destructive actions and unresolved failures
- [ ] Failure categories tracked and fed into evals
