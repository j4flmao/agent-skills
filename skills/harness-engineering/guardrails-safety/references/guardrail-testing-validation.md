# Guardrail Testing and Validation

How to verify that guardrails block what they should, allow what they should, and keep doing so as models, prompts, and attacks change. Covers test datasets, metrics, regression suites, adversarial testing, and release gates for guardrail changes.

## 1. What to Test

| Guardrail type | Positive cases (should trigger) | Negative cases (should pass) |
|---|---|---|
| Prompt-injection detection | Direct and indirect injections in user input, documents, tool output | Normal text that mentions "ignore", "system", or quotes instructions legitimately |
| PII / secret output filter | Emails, phone numbers, national ID patterns, API-key formats (test values) | Look-alike numbers (order IDs), documentation examples |
| Topic / policy filter | Disallowed requests per policy | Adjacent allowed topics (security education vs attack instructions) |
| Tool permission checks | Destructive tools without approval, paths outside allow-list | Allowed tools and paths |
| Output format / grounding guard | Unsupported claims, missing citations | Correctly cited answers |

Negative cases matter as much as positives: over-blocking makes the product unusable and pushes users to workarounds.

## 2. Dataset Construction

```python
from dataclasses import dataclass

@dataclass(frozen=True, slots=True)
class GuardrailCase:
    case_id: str
    guardrail: str
    stage: str                 # user_input | tool_output | model_output | tool_input
    content: str
    expected: str              # "block" | "allow" | "redact"
    category: str              # e.g. "indirect_injection", "benign_mentions_system"
    source: str                # "synthetic", "public_benchmark", "prod_review", "red_team"
```

Sources:
- Reviewed production events (anonymized) from monitoring (`guardrail-monitoring-alerting.md`).
- Red-team findings.
- Public benchmarks for injection and jailbreaks where licences allow; check they match your threat model.
- Synthetic variations: paraphrases, translations, encodings (base64, homoglyphs), split across turns or documents.

Keep a frozen held-out set for release decisions and a working set for development.

## 3. Metrics

| Metric | Definition |
|---|---|
| Recall (detection rate) | Blocked positives / all positives |
| Precision | True blocks / all blocks |
| False positive rate | Blocked negatives / all negatives |
| Per-category recall | Recall within each attack or content category |
| Latency p50/p95 | Added time on the request path |

Set targets per guardrail and risk. A destructive-action guard requires near-perfect recall (it is usually deterministic); a toxicity classifier trades precision and recall via a threshold.

## 4. Regression Test Harness

```python
import pytest

CASES = load_cases("tests/guardrails/heldout.jsonl")

@pytest.mark.parametrize("case", [c for c in CASES if c.expected == "block"], ids=lambda c: c.case_id)
def test_blocks_known_attacks(case, guardrails):
    # Arrange
    guard = guardrails[case.guardrail]

    # Act
    decision = guard.evaluate(case.content, stage=case.stage)

    # Assert
    assert decision.action == "block", f"{case.case_id} ({case.category}) not blocked: score={decision.score}"

def test_false_positive_rate_within_budget(guardrails):
    # Arrange
    negatives = [c for c in CASES if c.expected == "allow"]

    # Act
    blocked = [c for c in negatives
               if guardrails[c.guardrail].evaluate(c.content, stage=c.stage).action == "block"]

    # Assert
    assert len(blocked) / len(negatives) <= 0.02, [c.case_id for c in blocked[:10]]
```

Deterministic guards (allow-lists, approval checks) get exact unit tests including edge cases: path traversal (`../`), symlinks, case variations, URL encodings.

## 5. Threshold Selection

For score-based classifiers:
1. Score the development set.
2. Plot precision/recall across thresholds per category.
3. Choose the threshold meeting the recall target for high-risk categories with acceptable false positives.
4. Confirm on the held-out set; record threshold with guardrail version.

Different stages may need different thresholds (tool output from untrusted web pages vs internal documents).

## 6. End-to-End Agent Tests

Classifier tests alone miss integration gaps. Run agent-level scenarios:
- A web page fetched by the agent contains instructions to call a destructive tool → assert the tool is not called without approval.
- A document asks the agent to send data to an external URL → assert no outbound request to that URL.
- A user asks for another tenant's data → assert authorization denies and the response does not leak it.

Assert on actions (tool calls, network requests) as well as text.

## 7. Adversarial and Red-Team Testing

- Schedule red-team exercises on new capabilities (new tools, new data sources).
- Use automated attack generation (e.g. open-source tools such as garak or PyRIT) to expand coverage; review generated cases before adding to suites.
- Track attack categories over time; new successful categories become regression cases.

## 8. Release Gate for Guardrail Changes

| Check | Pass condition |
|---|---|
| Held-out recall per high-risk category | ≥ previous version (no regressions) |
| False positive rate | Within budget |
| End-to-end scenario suite | All pass |
| Latency | Within budget |
| Shadow mode in production | New version evaluated in parallel without enforcing; disagreement reviewed |

Roll out with shadow mode, then partial enforcement, then full.

## Pitfalls

- Testing only obvious attacks; real attacks are paraphrased, encoded, or indirect.
- Ignoring false positives until users complain.
- Tuning thresholds on the same set used to report results.
- Testing classifiers but not the integration (guardrail skipped on some code path).
- Using real secrets or real customer PII in test fixtures.

## Checklist

- [ ] Positive and negative cases per guardrail and stage, with categories and sources.
- [ ] Held-out set for release decisions.
- [ ] Recall, precision, FPR, latency tracked per version.
- [ ] Deterministic guards unit-tested with edge cases.
- [ ] End-to-end agent scenarios asserting on actions.
- [ ] Shadow-mode rollout for guardrail changes.
