# Tool Error Handling in Agent Harnesses

How an agent harness should detect, classify, report and recover from tool failures so the model can self-correct without loops, silent data loss or unsafe retries. Covers error taxonomy, the structure of error results returned to the model, retry and timeout policy, circuit breaking, loop bounds, and observability. Idempotency of side-effecting tools is covered in `idempotency-patterns.md`.

## Principles

1. **Errors are data for the model**: return tool failures as tool results flagged as errors (for example `is_error: true` in a Claude `tool_result`, `isError: true` in an MCP `CallToolResult`), not as exceptions that abort the agent loop.
2. **Classify before acting**: the harness, not the model, decides whether a failure is retryable.
3. **Teach the fix**: error messages include what went wrong and what a valid call looks like.
4. **Bound everything**: per-call timeouts, retry counts, total steps, tokens and cost.
5. **Never let tool output escalate privileges**: error text from tools is untrusted content, the same as normal results.

## Error Taxonomy

| Class | Examples | Who handles | Retry? |
|-------|----------|-------------|--------|
| Invalid arguments | Schema violation, unknown enum value, path outside allowed roots | Model (fix the call) | No automatic retry; return a teaching error |
| Not found / precondition | File missing, record does not exist, stale version | Model (choose different action) | No |
| Permission denied | Policy blocks the action, user declined approval | Model and user | No; do not suggest workarounds that bypass policy |
| Transient | Timeout, connection reset, HTTP 429/502/503/504 | Harness | Yes, with backoff, if the operation is idempotent or keyed |
| Rate limited | 429 with `Retry-After` | Harness | Yes, honoring `Retry-After`, within budget |
| Dependency outage | Repeated 5xx, circuit open | Harness, then model | Fail fast once the breaker is open |
| Output too large | Result exceeds token budget | Harness | Truncate with a continuation cursor |
| Internal bug | Unexpected exception in tool code | Harness (log), model (gets generic error) | No |
| Ambiguous outcome | Timeout after a write was sent | Harness | Only with idempotency key or after checking state |

## Error Result Shape

Keep the shape stable and machine-readable, with a closed set of codes:

```json
{
  "error": "invalid_argument",
  "message": "sheet 'Sales2025' not found",
  "hint": "Valid sheets: ['Sales', 'Costs']. Example: read(path='report.xlsx', sheet='Sales', range='A1:D20')",
  "retryable": false
}
```

```python
from dataclasses import dataclass, asdict
from enum import Enum
import json


class ToolErrorCode(str, Enum):
    INVALID_ARGUMENT = "invalid_argument"
    NOT_FOUND = "not_found"
    PERMISSION_DENIED = "permission_denied"
    TIMEOUT = "timeout"
    RATE_LIMITED = "rate_limited"
    UNAVAILABLE = "unavailable"
    OUTPUT_TRUNCATED = "output_truncated"
    INTERNAL = "internal"


@dataclass(frozen=True, slots=True)
class ToolError:
    error: ToolErrorCode
    message: str
    hint: str = ""
    retryable: bool = False

    def to_tool_result(self, tool_use_id: str) -> dict:
        return {
            "type": "tool_result",
            "tool_use_id": tool_use_id,
            "is_error": True,
            "content": json.dumps(asdict(self), default=str),
        }
```

Guidelines for messages:
- Say what failed with the specific value (`path '/etc/passwd' is outside allowed roots`), and give valid choices when the set is small.
- Do not include stack traces, secrets, internal hostnames or full request payloads.
- For `internal` errors, return a generic message and a correlation ID; log details server-side.

## Argument Validation

Validate before executing; most "errors" are malformed calls:

```python
from pydantic import BaseModel, Field, ValidationError


class ReadFileArgs(BaseModel):
    path: str = Field(min_length=1)
    max_bytes: int = Field(default=65_536, gt=0, le=1_048_576)


def validate_args(raw: dict) -> ReadFileArgs | ToolError:
    try:
        return ReadFileArgs.model_validate(raw)
    except ValidationError as exc:
        first = exc.errors()[0]
        field = ".".join(str(p) for p in first["loc"])
        return ToolError(
            ToolErrorCode.INVALID_ARGUMENT,
            f"argument '{field}': {first['msg']}",
            hint="Example: read_file(path='src/app.py', max_bytes=65536)",
        )
```

Use strict JSON schemas (`additionalProperties: false`, enums, bounds) in tool definitions so many errors are prevented by the model's constrained generation or caught early.

## Retry Policy (Harness Level)

```python
import random
import time


def call_with_retry(fn, *, attempts: int = 3, base: float = 0.5, cap: float = 8.0, is_retryable):
    for attempt in range(1, attempts + 1):
        try:
            return fn()
        except Exception as exc:
            if attempt == attempts or not is_retryable(exc):
                raise
            delay = getattr(exc, "retry_after", None) or random.uniform(0, min(cap, base * 2 ** attempt))
            time.sleep(delay)
```

Rules:
- Retry only transient classes, and only idempotent operations or those carrying an idempotency key.
- Full jitter exponential backoff, bounded attempts (typically 3), honor `Retry-After`.
- Retry at one layer: if the HTTP client already retries, the harness should not add another loop.
- Do not ask the model to retry transient failures by itself; it wastes tokens and often changes arguments unnecessarily. Report to the model only after harness retries are exhausted.

## Timeouts

| Scope | Guidance |
|-------|----------|
| Per tool call | Explicit timeout per tool (for example 30 s for HTTP, longer for builds), always shorter than the agent turn deadline |
| Long-running jobs | Start asynchronously, return a job ID, provide a status tool; do not block the loop |
| Cancellation | Propagate cancellation (context/AbortSignal) so abandoned calls stop consuming resources |
| Subprocesses | Kill the process group on timeout; capture partial output |

## Circuit Breaking

Track failures per dependency. After N consecutive failures (or an error-rate threshold), open the circuit: return `unavailable` immediately with a hint ("payments API unavailable; retry later or choose another action") for a cool-down period, then allow a probe call. This stops the model from repeatedly calling a broken tool and burning budget.

## Loop and Budget Bounds

| Guard | Purpose |
|-------|---------|
| Maximum steps per task | Stops infinite tool loops |
| Repeated-call detection | Same tool + same arguments + same error N times triggers a stop or escalation |
| Token and cost budget | Hard ceiling per task/session |
| Wall-clock deadline | Bounded user wait |
| Error budget per task | Too many errors escalate to a human instead of continuing |

When a bound is hit, return a clear final state to the user: what was done, what failed, what remains.

## Partial Failures and Batches

- Batch tools return per-item results: successes, failures with codes, and a summary. Do not fail the whole batch for one bad item unless atomicity is required.
- For atomic operations, report whether anything was applied (`applied: false`) so the model does not assume partial state.
- After an ambiguous failure on a write, the harness should check state (read back or look up by idempotency key) before reporting to the model.

## Human-in-the-Loop Errors

When a user declines approval for a destructive or sensitive tool:
- Return `permission_denied` with the reason ("user declined"), not a generic failure.
- Instruct (in the system prompt or tool description) that the model must not try alternative tools to achieve the same effect.

## Observability

Log every tool call with: tool name, argument summary (redacted), duration, result size, error code, retry count, circuit state, and a trace/span ID (OpenTelemetry). Aggregate:
- Error rate by tool and code (high `invalid_argument` rates indicate poor tool descriptions or schemas).
- Retries and timeouts by dependency.
- Loop terminations by guard type.

Use these metrics to improve tool descriptions and schemas; teaching errors and schema fixes usually reduce failures more than additional retries.

## Testing

- Unit tests per error class: each produces the right code, message and `is_error` flag.
- Fault injection: simulated timeouts, 429s with `Retry-After`, 5xx bursts, slow responses, malformed responses.
- Agent-level evals: tasks where the first call is predictably wrong; measure whether the model recovers within N steps from the hint.
- Verify no secrets appear in error results or logs.

## Checklist

- [ ] Tool failures returned as error tool results with a closed set of codes
- [ ] Messages specific, actionable, with valid choices or an example call; no internals
- [ ] Arguments validated against strict schemas before execution
- [ ] Harness-level retries only for transient, idempotent or keyed operations
- [ ] Per-tool timeouts, cancellation and async job pattern for long tasks
- [ ] Circuit breakers per dependency
- [ ] Step, token, cost, time and repeated-error bounds
- [ ] Tool call telemetry used to improve schemas and descriptions
