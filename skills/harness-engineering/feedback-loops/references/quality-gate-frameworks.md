# Quality Gate Frameworks for Agent Work

Quality gates are explicit pass/fail checkpoints an agent's output must clear before it advances: from draft to review, from review to merge, from staging to production. This reference defines gate design, gate configuration as code, and how gates apply both to agent-produced artifacts (code, documents, data) and to changes in the agent itself (prompts, models, tools).

## 1. Gate Stages

| Gate | Applies to | Typical criteria |
|---|---|---|
| G0 Task acceptance | Incoming task | Clear goal, inputs available, within agent scope and permissions |
| G1 Self-check | Agent's own output | Builds, tests pass, schema valid, acceptance criteria addressed |
| G2 Automated review | Output before human review | Lint, security scan, coverage threshold, diff size limits, judge rubric |
| G3 Human review | Medium/high-risk outputs | Reviewer approval with checklist |
| G4 Release | Merge/deploy | CI green, required approvals, change window, rollback plan |
| G5 Post-release | After deployment | SLOs healthy, no error-budget burn, canary metrics |

## 2. Gate Definition as Code

```yaml
# quality-gates.yaml
gates:
  self_check:
    required:
      - id: build
        command: "uv run python -m compileall -q src"
      - id: unit_tests
        command: "uv run pytest -q"
      - id: types
        command: "uv run mypy src"
    max_attempts: 3
  automated_review:
    required:
      - id: lint
        command: "uv run ruff check ."
      - id: secrets
        command: "gitleaks detect --no-banner --redact"
      - id: coverage
        command: "uv run pytest --cov=src --cov-fail-under=80 -q"
    advisory:
      - id: diff_size
        rule: "changed_lines <= 400"
  human_review:
    required_when:
      - "risk in ['medium', 'high']"
      - "touches_paths matches 'infra/**|migrations/**|auth/**'"
    approvers: 1
```

```python
from __future__ import annotations
import subprocess
from dataclasses import dataclass

@dataclass(frozen=True, slots=True)
class CheckResult:
    id: str
    passed: bool
    output: str
    required: bool

def run_gate(gate: dict) -> list[CheckResult]:
    results = []
    for kind in ("required", "advisory"):
        for check in gate.get(kind, []):
            if "command" not in check:
                continue
            p = subprocess.run(check["command"], shell=True, capture_output=True, text=True)
            results.append(CheckResult(check["id"], p.returncode == 0,
                                       (p.stdout + p.stderr)[-3000:], kind == "required"))
    return results

def gate_passed(results: list[CheckResult]) -> bool:
    return all(r.passed for r in results if r.required)
```

Gate commands come from the repository's configuration, never from model output. `shell=True` is acceptable only because the commands are trusted config.

## 3. Gates for Changes to the Agent Itself

Prompt, model, tool, and retrieval changes alter behaviour as much as code changes.

| Gate | Check |
|---|---|
| Offline eval | Regression suite (golden tasks) score ≥ baseline − tolerance; no critical-case regressions |
| Safety eval | Prompt-injection and jailbreak suites; refusal/over-refusal rates within bounds |
| Cost/latency | Tokens per task and p95 latency within budget |
| Canary | Online SLIs for canary cohort vs control |
| Rollback | Previous prompt/model version deployable in one step |

```python
def eval_gate(candidate: dict[str, float], baseline: dict[str, float], *,
              tolerance: float = 0.01, critical_failures: int) -> tuple[bool, list[str]]:
    reasons = []
    for metric, base in baseline.items():
        if candidate.get(metric, 0.0) < base - tolerance:
            reasons.append(f"{metric} regressed: {candidate.get(metric)} < {base} - {tolerance}")
    if critical_failures > 0:
        reasons.append(f"{critical_failures} critical eval cases failed")
    return (not reasons, reasons)
```

Use repeated runs or confidence intervals for eval scores; single runs of stochastic agents are noisy.

## 4. Risk-Based Gate Selection

| Risk | Examples | Gates |
|---|---|---|
| Low | Docs typo, internal summary | G1 + G2 |
| Medium | Feature code, customer-facing text | G1 + G2 + G3 (1 approver) |
| High | Auth, payments, data deletion, infra, migrations | G1 + G2 + G3 (2 approvers, domain owner) + G4 change control |

Determine risk from the paths touched, tools used, and data classes involved, not from the agent's self-assessment.

## 5. Gate Feedback to the Agent

When an automated gate fails, return the failing check IDs and trimmed output to the agent with the attempt count (see `correction-trigger-mechanisms.md`). Human gate rejections pass reviewer comments verbatim.

## 6. Metrics

- First-pass rate per gate (passed without correction).
- Mean attempts to pass; escalation rate.
- Escaped defects: issues found after a gate that the gate should have caught.
- Gate duration: slow gates push teams to bypass them.

## Pitfalls

- Gates defined only in prompts; the agent can claim success without passing them.
- Advisory checks that silently become ignored; promote important ones to required.
- Allowing the agent to modify gate configuration or tests to make them pass. Protect gate files with permissions or review rules.
- Same gates for every change regardless of risk.

## Checklist

- [ ] Gates defined as code in the repository, outside the agent's write scope.
- [ ] Required vs advisory checks distinguished.
- [ ] Risk-based selection from objective signals.
- [ ] Eval and safety gates for prompt/model/tool changes.
- [ ] Gate metrics reviewed; escaped defects feed new checks.
