# Continuous Improvement Loops for Agents

In-run feedback fixes one output; continuous improvement fixes the system so the same failure stops happening. This reference covers the outer loop: collecting production signals, turning failures into eval cases, changing prompts/tools/models, and verifying improvements before release.

## 1. The Outer Loop

```
Production runs ──► traces, outcomes, user feedback
        │
        ▼
Failure mining ──► clustered failure modes (error taxonomy labels)
        │
        ▼
Eval dataset ◄── new cases from real failures (anonymized)
        │
        ▼
Change candidates: prompt, tool schema, retrieval, guardrail, model, harness logic
        │
        ▼
Offline eval vs baseline ──► canary ──► full rollout
        │                                  │
        └──────────── monitoring ◄─────────┘
```

## 2. Signals to Collect

| Signal | Source | Use |
|---|---|---|
| Run outcome and error class | Harness | Failure frequency by class |
| Full trace (model calls, tool calls, timings, tokens) | Tracing (OpenTelemetry GenAI conventions, LangSmith, Langfuse, Phoenix, etc.) | Root-cause analysis |
| Explicit feedback | Thumbs, ratings, edits, rejections | Quality signal |
| Implicit feedback | User re-asks, abandons, edits output heavily, escalates to human | Weak quality signal |
| Verification/gate results | Validators, tests, judges | Automated quality signal |
| Cost and latency | Harness metrics | Efficiency targets |

Store traces with prompt, model, and toolset versions so changes can be attributed.

## 3. Failure Mining

```sql
SELECT error_class, subclass, prompt_version, count(*) AS runs,
       avg(CASE WHEN user_feedback = 'negative' THEN 1.0 ELSE 0.0 END) AS neg_rate
FROM agent_runs
WHERE started_at >= now() - interval '7 days'
GROUP BY 1, 2, 3
ORDER BY runs DESC
LIMIT 20;
```

Then read traces for the top clusters. Prioritize by frequency × impact (cost of failure, user harm, revenue). Look for root causes in this order: missing information (context/retrieval), unclear instructions, poor tool design (ambiguous names/descriptions, complex arguments), model capability limits.

## 4. From Failures to Eval Cases

```python
from dataclasses import dataclass

@dataclass(frozen=True, slots=True)
class EvalCase:
    case_id: str
    input: dict
    expected: dict            # reference answer, required facts, or assertion spec
    tags: tuple[str, ...]     # error class, feature, risk level
    source_run_id: str        # provenance (anonymized production run)
    critical: bool = False
```

- Add each fixed failure as a regression case; mark severe ones `critical` so any regression blocks release.
- Prefer programmatic assertions (exact fields, tests, tool-call sequences) over free-form reference answers.
- Remove or anonymize personal data before adding production inputs to datasets.
- Keep a held-out set that is not used while iterating on prompts, to detect overfitting.

## 5. Making Changes

| Failure cause | Typical change |
|---|---|
| Missing facts | Retrieval improvements, new tool for the data |
| Misused tool | Clearer tool name/description, simpler args, examples in description, validation messages that teach |
| Format errors | Structured outputs, schema tightening |
| Instruction conflicts | Simplify system prompt; move rules into harness checks |
| Long-task drift | Planning step, checkpoint summaries, sub-task decomposition |
| Capability limits | Different model for that step, or human step |

Change one thing at a time where possible so eval deltas are attributable.

## 6. Verification Before Rollout

- Offline: run the full eval suite multiple times; compare mean and variance against baseline; zero critical failures.
- Cost/latency check against budgets.
- Canary: small traffic share, compare online SLIs and feedback rates to control for a fixed period.
- Rollback ready: previous version pinned and switchable.

## 7. Cadence and Ownership

| Activity | Cadence | Owner |
|---|---|---|
| Failure review of top clusters | Weekly | Agent team |
| Eval dataset curation | Continuous, reviewed weekly | Agent team + domain experts |
| Model/provider re-evaluation | On new releases or quarterly | Platform |
| Guardrail and safety review | Monthly and after incidents | Security/safety owner |
| Postmortem for severe failures | Per incident | Incident owner |

## 8. Guarding Against Feedback Pitfalls

- Feedback bias: unhappy users rate more often; weight explicit feedback with implicit and automated signals.
- Goodhart effects: optimizing judge scores can diverge from user value; periodically recalibrate judges against human labels.
- Data leakage: eval cases copied into prompts as examples make scores meaningless.

## Pitfalls

- Fixing individual complaints by adding prompt clauses until the prompt is contradictory.
- No versioning of prompts/tools, so improvements and regressions cannot be attributed.
- Eval suites that never grow from production failures.
- Rolling out changes without a canary.

## Checklist

- [ ] Traces with version metadata for every run.
- [ ] Weekly failure mining by error class with prioritization.
- [ ] Every fixed failure becomes a regression eval case.
- [ ] Changes verified offline (repeated runs) and by canary before rollout.
- [ ] Owners and cadences defined for the improvement loop.
