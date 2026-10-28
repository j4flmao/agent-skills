# Fallback Chain Patterns for Agents

When the primary path fails after its retries, a fallback chain tries progressively more conservative alternatives: another model, a simpler prompt, a cached answer, a deterministic method, and finally a human or a graceful failure. This reference covers chain design, circuit breakers, and quality controls so fallbacks do not silently lower correctness.

## 1. Fallback Ladder

| Level | Example | Cost/quality trade-off |
|---|---|---|
| 0. Primary | Main model, full toolset | Best quality |
| 1. Same model, repaired request | Shorter context, stricter output format | Minor quality change |
| 2. Alternative model / provider | Different deployment or region; another model tier | Behaviour differences; re-validate outputs |
| 3. Reduced capability | Fewer tools, read-only mode, smaller task scope | Partial result |
| 4. Deterministic path | Rules, templates, search results without synthesis | Predictable, less flexible |
| 5. Cached / last-known-good | Previous answer for the same normalized input | Possibly stale |
| 6. Human or explicit failure | Queue for review; tell user what failed | Slow but safe |

Each level must produce output that passes the same validators as the primary, or be clearly labelled as degraded.

## 2. Chain Implementation

```python
from __future__ import annotations
import logging
from dataclasses import dataclass
from typing import Callable, Generic, TypeVar

T = TypeVar("T")
log = logging.getLogger(__name__)

class ValidationFailed(Exception):
    pass

@dataclass(frozen=True, slots=True)
class Option(Generic[T]):
    name: str
    run: Callable[[], T]
    degraded: bool = False

@dataclass(frozen=True, slots=True)
class Outcome(Generic[T]):
    value: T
    used: str
    degraded: bool
    failures: tuple[str, ...]

def run_chain(options: list[Option[T]], validate: Callable[[T], None], *, run_id: str) -> Outcome[T]:
    failures: list[str] = []
    for opt in options:
        try:
            value = opt.run()
            validate(value)                       # same acceptance criteria for every level
            if failures:
                log.warning("run=%s fallback used=%s after failures=%s", run_id, opt.name, failures)
            return Outcome(value, opt.name, opt.degraded, tuple(failures))
        except Exception as e:                    # recorded, then next option
            failures.append(f"{opt.name}: {type(e).__name__}: {e}")
            log.warning("run=%s option=%s failed: %s", run_id, opt.name, e)
    raise RuntimeError(f"run={run_id} all fallbacks failed: {failures}")
```

Usage:

```python
outcome = run_chain([
    Option("primary", lambda: agent.answer(q, model=PRIMARY)),
    Option("secondary_model", lambda: agent.answer(q, model=SECONDARY)),
    Option("retrieval_only", lambda: summarize_top_docs_template(q), degraded=True),
], validate=answer_validator, run_id=run_id)
```

## 3. Circuit Breakers

Skip a failing option quickly instead of paying its timeout on every request.

```python
import time

class CircuitBreaker:
    def __init__(self, failure_threshold: int = 5, reset_after: float = 30.0):
        self.failure_threshold, self.reset_after = failure_threshold, reset_after
        self.failures, self.opened_at = 0, 0.0

    def allow(self) -> bool:
        if self.failures < self.failure_threshold:
            return True
        return time.monotonic() - self.opened_at >= self.reset_after   # half-open trial

    def record(self, ok: bool) -> None:
        if ok:
            self.failures = 0
        else:
            self.failures += 1
            if self.failures >= self.failure_threshold:
                self.opened_at = time.monotonic()
```

Wrap each option: if `allow()` is false, record "circuit open" and move to the next option. In production use a maintained library (e.g. `pybreaker`, `aiobreaker`, Resilience4j on the JVM, Polly on .NET) or gateway-level outlier detection, and share breaker state across workers when traffic is distributed.

## 4. Model Fallback Specifics

- Prompts tuned for one model may underperform on another. Keep per-model prompt variants and test them in evals.
- Tool-calling formats differ across providers; use an abstraction layer or gateway that normalizes tool schemas, and validate tool arguments regardless of model.
- Context windows differ; the fallback model may need a compacted context.
- Record which model produced each output for audits and quality tracking.

## 5. Fallbacks for Tools

| Tool failure | Fallback |
|---|---|
| Primary search API down | Secondary search provider or internal index |
| Code execution sandbox unavailable | Static analysis only; mark result unverified |
| Write API rejects | Queue the write for later with idempotency key; tell the user it is pending |
| Data source stale | Serve with explicit "as of" timestamp |

Never fall back from a safe tool to a more privileged one (e.g. from a scoped API to raw shell access).

## 6. Caching as Fallback

- Key on normalized input plus versions (prompt, model, data snapshot).
- Store validation status; serve only validated cached results.
- Attach age to the response; set a maximum staleness per use case.
- Do not cache personalized or permission-dependent answers across users.

## 7. Telling Users

Degraded outputs should say so in the product: "Answer generated from search results only; full analysis unavailable." Hidden degradation erodes trust when users find errors.

## Pitfalls

- Fallback outputs not validated: the chain converts errors into wrong answers.
- Fallback to a different model that lacks the safety configuration of the primary.
- Long chains where each level times out serially: total latency explodes. Set per-option timeouts and an overall deadline.
- Fallbacks hiding a persistent outage: alert on fallback usage rate.

## Checklist

- [ ] Ordered ladder defined per task, ending in human/explicit failure.
- [ ] Same validators applied at every level; degraded results labelled.
- [ ] Circuit breakers on remote options; per-option timeouts and overall deadline.
- [ ] Per-model prompt variants evaluated.
- [ ] Fallback usage monitored and alerted.
