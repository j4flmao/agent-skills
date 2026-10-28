# Error Taxonomy and Classification for Agent Systems

A shared taxonomy of agent failures lets the harness route each error to the right recovery (retry, repair, fallback, escalate) and lets teams measure which failure classes dominate. This reference defines the classes, a classifier, and how to use the labels.

## 1. Taxonomy

| Class | Subclass | Examples | Default recovery |
|---|---|---|---|
| **Transient infrastructure** | network, rate limit, overload, timeout | 429, 503, connection reset | Retry with backoff |
| **Permanent infrastructure** | auth, quota exhausted, not found, bad request | 401/403, 400 invalid params, model not found | Fail fast, alert operator |
| **Model output** | malformed format, schema violation, truncation | Invalid JSON, missing field, `max_tokens` stop | Repair prompt / continue |
| **Model reasoning** | wrong tool, wrong arguments, hallucinated fact, unfinished task | Calls `delete_file` instead of `read_file`; cites non-existent API | Verification + correction loop; escalate if repeated |
| **Tool execution** | tool bug, dependency down, business rule rejection | Tool raised exception; API says "invoice locked" | Return as tool result; fallback tool; escalate |
| **Context** | overflow, lost instructions, stale memory | Context length exceeded; agent forgets constraint after compaction | Compact/summarize; reinject key instructions |
| **Control flow** | loop, stall, step/budget exhaustion | Same tool call repeated; no progress in N steps | Loop breaker, re-plan, stop |
| **Safety / policy** | guardrail block, refusal, injection detected | Input classifier flags prompt injection | Stop or sanitize; never auto-retry around |
| **Environment** | sandbox crash, missing file, permission denied | Container OOM, `EACCES` | Restore checkpoint; fix environment |

Two properties matter for every class: **retryable?** and **who must act?** (harness, model, operator, user).

## 2. Error Record Schema

```python
from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

class ErrorClass(str, Enum):
    TRANSIENT_INFRA = "transient_infra"
    PERMANENT_INFRA = "permanent_infra"
    MODEL_OUTPUT = "model_output"
    MODEL_REASONING = "model_reasoning"
    TOOL_EXECUTION = "tool_execution"
    CONTEXT = "context"
    CONTROL_FLOW = "control_flow"
    SAFETY = "safety"
    ENVIRONMENT = "environment"

class Actor(str, Enum):
    HARNESS = "harness"; MODEL = "model"; OPERATOR = "operator"; USER = "user"

@dataclass(frozen=True, slots=True)
class AgentError:
    error_class: ErrorClass
    subclass: str
    retryable: bool
    actor: Actor
    message: str
    run_id: str
    step: int
    source: str                       # "llm", "tool:<name>", "guardrail:<name>", "harness"
    details: dict[str, Any] = field(default_factory=dict)
```

## 3. Classifier

Rules first; they cover most infrastructure and format errors deterministically.

```python
import json

HTTP_RULES: dict[int, tuple[ErrorClass, str, bool, Actor]] = {
    429: (ErrorClass.TRANSIENT_INFRA, "rate_limit", True, Actor.HARNESS),
    408: (ErrorClass.TRANSIENT_INFRA, "timeout", True, Actor.HARNESS),
    500: (ErrorClass.TRANSIENT_INFRA, "server_error", True, Actor.HARNESS),
    502: (ErrorClass.TRANSIENT_INFRA, "bad_gateway", True, Actor.HARNESS),
    503: (ErrorClass.TRANSIENT_INFRA, "unavailable", True, Actor.HARNESS),
    504: (ErrorClass.TRANSIENT_INFRA, "gateway_timeout", True, Actor.HARNESS),
    529: (ErrorClass.TRANSIENT_INFRA, "overloaded", True, Actor.HARNESS),
    400: (ErrorClass.PERMANENT_INFRA, "bad_request", False, Actor.OPERATOR),
    401: (ErrorClass.PERMANENT_INFRA, "auth", False, Actor.OPERATOR),
    403: (ErrorClass.PERMANENT_INFRA, "forbidden", False, Actor.OPERATOR),
    404: (ErrorClass.PERMANENT_INFRA, "not_found", False, Actor.OPERATOR),
}

def classify_http(status: int, body: str, *, run_id: str, step: int, source: str) -> AgentError:
    if status == 400 and "context" in body.lower() and "length" in body.lower():
        return AgentError(ErrorClass.CONTEXT, "overflow", False, Actor.HARNESS, body[:500], run_id, step, source)
    cls, sub, retry, actor = HTTP_RULES.get(
        status, (ErrorClass.PERMANENT_INFRA, f"http_{status}", False, Actor.OPERATOR))
    return AgentError(cls, sub, retry, actor, body[:500], run_id, step, source)

def classify_output(raw: str, schema_validator, *, run_id: str, step: int) -> AgentError | None:
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as e:
        return AgentError(ErrorClass.MODEL_OUTPUT, "malformed_json", True, Actor.MODEL,
                          f"{e.msg} at pos {e.pos}", run_id, step, "llm")
    errors = list(schema_validator.iter_errors(payload))
    if errors:
        return AgentError(ErrorClass.MODEL_OUTPUT, "schema_violation", True, Actor.MODEL,
                          "; ".join(err.message for err in errors[:5]), run_id, step, "llm")
    return None
```

For reasoning failures (wrong answer, unfinished task), deterministic rules rarely suffice: use verifiers (tests, checkers) and, where needed, an LLM judge with a fixed rubric. Label judge-derived classes with lower confidence.

## 4. Routing by Class

```python
def route(err: AgentError) -> str:
    match err.error_class:
        case ErrorClass.TRANSIENT_INFRA:  return "retry"
        case ErrorClass.MODEL_OUTPUT:     return "repair"
        case ErrorClass.TOOL_EXECUTION:   return "return_to_model"
        case ErrorClass.CONTEXT:          return "compact_and_resume"
        case ErrorClass.CONTROL_FLOW:     return "replan_or_stop"
        case ErrorClass.MODEL_REASONING:  return "verify_and_correct"
        case ErrorClass.SAFETY:           return "stop"
        case ErrorClass.ENVIRONMENT:      return "restore_checkpoint"
        case _:                           return "escalate"
```

Every route has a cap; after the cap the error escalates (fallback chain, human, or failed run with a clear reason).

## 5. Using the Taxonomy for Improvement

- Count errors per class per 1,000 runs and per model/prompt version.
- Track recovery success per class (did retry/repair succeed?).
- Prioritize fixes by (frequency × cost), e.g. schema violations fixed by structured output features or tighter tool schemas.
- Feed labelled failures into eval datasets so regressions are caught before release.

## Pitfalls

- One generic `AgentError` with free-text messages: no routing, no metrics.
- Treating tool business errors as exceptions that abort the run instead of information for the model.
- Retrying safety blocks with rephrased prompts.
- Classifying by string matching on provider messages that change; prefer status codes and typed SDK exceptions.

## Checklist

- [ ] Every error recorded with class, subclass, retryable, actor, run ID, step.
- [ ] Deterministic classifier for infra and format errors.
- [ ] Routing table with caps per class.
- [ ] Dashboards of error rates and recovery success by class.
- [ ] Failure samples flow into evaluation datasets.
