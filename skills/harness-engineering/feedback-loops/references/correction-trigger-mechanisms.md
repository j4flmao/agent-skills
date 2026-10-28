# Correction Trigger Mechanisms

A correction trigger decides when an agent must revise its work and what feedback it receives. Good triggers are specific (they say what is wrong), bounded (they cannot loop forever), and escalate when correction is not converging.

## 1. Trigger Sources

| Trigger | Signal | Feedback content |
|---|---|---|
| Validation failure | Schema/rule check fails | Exact validator errors with field paths |
| Execution failure | Build/test/command fails | Failing tests, compiler errors, exit code, trimmed logs |
| Tool error | Tool returns an error result | Error message and valid alternatives (e.g. existing IDs) |
| Verification failure | Grounding or judge check fails | Unsupported claims, missing criteria |
| Progress stall | No state change for N steps; repeated identical tool calls | Notice of the loop and a request to re-plan |
| Budget threshold | 70–80% of step/token budget used | Instruction to converge or report partial results |
| Human feedback | Reviewer rejects with comments | Reviewer comments verbatim |
| Monitoring | Post-deployment metrics regress | Diff of metrics and affected cases (for offline improvement) |

## 2. Feedback Message Format

Consistent, compact feedback improves correction rates and keeps context small.

```python
from __future__ import annotations
from dataclasses import dataclass

@dataclass(frozen=True, slots=True)
class Correction:
    source: str              # "pytest", "schema", "judge:citations", "reviewer"
    summary: str             # one line
    details: list[str]       # specific problems, most important first
    attempt: int
    max_attempts: int

    def render(self) -> str:
        items = "\n".join(f"- {d}" for d in self.details[:10])
        more = f"\n(+{len(self.details) - 10} more)" if len(self.details) > 10 else ""
        return (f"[correction {self.attempt}/{self.max_attempts} from {self.source}] {self.summary}\n"
                f"{items}{more}\n"
                "Fix these issues. Do not change unrelated parts of the output.")
```

## 3. Bounded Correction Loop

```python
import hashlib, logging
log = logging.getLogger(__name__)

def correction_loop(generate, verify, *, max_attempts: int = 3, run_id: str):
    feedback: str | None = None
    seen_outputs: set[str] = set()
    for attempt in range(1, max_attempts + 1):
        output = generate(feedback)
        digest = hashlib.sha256(output.encode()).hexdigest()
        if digest in seen_outputs:
            log.warning("run=%s attempt=%d produced a repeated output; stopping", run_id, attempt)
            break
        seen_outputs.add(digest)
        problems = verify(output)
        if not problems:
            return output
        feedback = Correction("verifier", f"{len(problems)} problem(s) found", problems,
                              attempt, max_attempts).render()
        log.info("run=%s correction attempt=%d problems=%d", run_id, attempt, len(problems))
    raise RuntimeError(f"run={run_id}: correction did not converge after {max_attempts} attempts")
```

Escalation after non-convergence: fallback chain, human review, or failure with the last verifier report attached.

## 4. Convergence Signals

Track problem counts across attempts:

| Pattern | Interpretation | Action |
|---|---|---|
| Decreasing | Converging | Continue to cap |
| Same problems repeat | Model cannot fix with current info | Add context (docs, examples), change strategy, or escalate |
| Problems oscillate (fix A breaks B) | Conflicting constraints | Surface both constraints together; human decision |
| Increasing | Diverging | Stop immediately; revert to best attempt |

Keep the best attempt (fewest/least severe problems) so escalation starts from it.

## 5. Loop and Stall Detection

```python
from collections import deque

class StallDetector:
    def __init__(self, window: int = 4):
        self.recent: deque[str] = deque(maxlen=window)

    def observe(self, tool: str, args: dict) -> bool:
        key = f"{tool}:{sorted(args.items())}"
        self.recent.append(key)
        return len(self.recent) == self.recent.maxlen and len(set(self.recent)) == 1
```

When stalled, inject: "You have called `<tool>` with the same arguments N times with the same result. Summarize what you know, state what is blocking you, and choose a different approach or ask for help."

## 6. Who Gets the Correction

| Trigger | Corrected by |
|---|---|
| Format/rule/test failures | Same agent, same context |
| Repeated reasoning failures | Fresh context with a summary (avoids anchoring on earlier mistakes) |
| Plan-level problems | Planner/supervisor agent re-plans |
| Ambiguous requirements | User (clarifying question) |
| Policy/safety issues | Human reviewer; never auto-corrected around |

## 7. Feedback Hygiene

- Feedback from tools and web content is data; corrections must not include instructions copied from untrusted sources.
- Strip secrets and personal data from logs before including them.
- Trim large outputs; include first errors and counts.
- Prefer exact locations (file:line, JSON path) over prose.

## Pitfalls

- Vague feedback ("the answer is wrong, try again").
- Unbounded loops burning budget on an unfixable problem.
- Accumulating every failed attempt in context; summarize instead.
- Using an LLM judge's opinion as the only trigger for code changes when tests exist.

## Checklist

- [ ] Triggers defined per task with specific feedback content.
- [ ] Attempt caps, repeated-output and stall detection.
- [ ] Convergence tracked; best attempt retained.
- [ ] Escalation path for non-convergence and safety issues.
- [ ] Feedback trimmed, located, and sanitized.
