# Graceful Degradation for Agent Products

Graceful degradation keeps an agent useful when parts of the system are impaired: return a partial or simplified result with clear labelling instead of failing outright. Fallback chains (`fallback-chain-patterns.md`) are one mechanism; this reference covers the degradation modes, how to decide when to enter them, and how to communicate them.

## 1. Degradation Modes

| Mode | Trigger | Behaviour |
|---|---|---|
| Reduced tools | A tool or dependency is down | Disable that tool in the toolset; agent works with the rest and states the limitation |
| Read-only | Write path unhealthy or risk elevated | Agent can analyze and draft, not execute changes |
| Smaller scope | Budget or latency pressure | Answer the core question; skip optional enrichment |
| Cheaper model | Primary model overloaded or cost cap reached | Route to a smaller model for low-risk tasks only |
| Cached / stale data | Data source unavailable | Serve last-known-good with timestamp |
| Draft for human | Low confidence or verification failed | Produce a draft routed for review rather than acting |
| Queue and notify | Capacity exhausted | Accept request, process asynchronously, notify on completion |

## 2. Health-Driven Mode Selection

```python
from __future__ import annotations
from dataclasses import dataclass
from enum import Enum

class Mode(str, Enum):
    FULL = "full"
    REDUCED_TOOLS = "reduced_tools"
    READ_ONLY = "read_only"
    QUEUED = "queued"

@dataclass(frozen=True, slots=True)
class Health:
    model_ok: bool
    tools_down: frozenset[str]
    write_api_ok: bool
    queue_depth: int

def select_mode(h: Health, *, max_queue: int) -> tuple[Mode, frozenset[str]]:
    if not h.model_ok or h.queue_depth > max_queue:
        return Mode.QUEUED, h.tools_down
    if not h.write_api_ok:
        return Mode.READ_ONLY, h.tools_down
    if h.tools_down:
        return Mode.REDUCED_TOOLS, h.tools_down
    return Mode.FULL, frozenset()
```

Health comes from circuit-breaker state, provider status checks, and recent error rates, not from a single failed call.

## 3. Applying a Mode to the Agent

```python
def build_toolset(all_tools: dict[str, Tool], mode: Mode, down: frozenset[str]) -> list[Tool]:
    tools = [t for name, t in all_tools.items() if name not in down]
    if mode is Mode.READ_ONLY:
        tools = [t for t in tools if t.read_only]
    return tools

def system_notice(mode: Mode, down: frozenset[str]) -> str:
    if mode is Mode.FULL:
        return ""
    parts = [f"Operating in {mode.value} mode."]
    if down:
        parts.append(f"Unavailable tools: {', '.join(sorted(down))}.")
    if mode is Mode.READ_ONLY:
        parts.append("Do not attempt changes; propose them for the user to apply later.")
    parts.append("Tell the user which parts of the request could not be completed.")
    return " ".join(parts)
```

Remove unavailable tools from the toolset rather than leaving them and hoping the model avoids them; the model will otherwise call them and fail.

## 4. Partial Results

Structure responses so partial completion is explicit:

```json
{
  "status": "partial",
  "completed": ["summarized Q3 revenue", "listed top 5 customers"],
  "not_completed": [{"item": "churn forecast", "reason": "forecasting service unavailable"}],
  "data_as_of": "2026-10-27T08:00:00Z"
}
```

Downstream automation must check `status` before acting on the result.

## 5. Risk-Aware Degradation

Not every task may degrade the same way:

| Task risk | Allowed degradation |
|---|---|
| Low (summaries, drafts, search) | Cheaper model, cached data, reduced tools |
| Medium (internal reports, code suggestions) | Reduced tools, read-only; require labelling |
| High (payments, production changes, medical/legal content) | Read-only or queue for human; never silently switch model or skip verification |

Encode this per task type in configuration, not in prompts.

## 6. Recovery

- Re-check health periodically; return to full mode when dependencies recover (with hysteresis to avoid flapping).
- Re-process queued requests in order with idempotency keys.
- Optionally re-run degraded results in full mode and notify users if the answer changes materially.

## 7. Monitoring

| Metric | Use |
|---|---|
| Time in each mode | Reliability reporting |
| Requests served degraded / total | SLO input |
| Partial completion rate | Product quality signal |
| User follow-ups after degraded answers | Whether degradation was acceptable |

## Pitfalls

- Silent degradation: users assume full analysis.
- Degrading high-risk tasks the same way as low-risk ones.
- Flapping between modes on every transient error.
- Leaving disabled tools in the prompt or tool list.

## Checklist

- [ ] Degradation modes defined per task type and risk level.
- [ ] Mode selection driven by aggregated health signals with hysteresis.
- [ ] Toolset and instructions adjusted per mode.
- [ ] Partial results explicitly structured and labelled to users.
- [ ] Degraded-mode metrics part of SLO reporting.
