# Guardrail Monitoring and Alerting

Guardrails (input filters, output filters, policy engines, tool permission checks) only protect a system if someone can see when they fire, when they fail, and when they stop working. This reference covers the telemetry to emit, the metrics and alerts that matter, and how to review guardrail events without leaking the sensitive content they caught.

## 1. Events to Emit

Every guardrail evaluation emits a structured event:

```json
{
  "ts": "2026-10-27T09:14:03Z",
  "run_id": "run_7f3a",
  "guardrail": "prompt_injection_classifier",
  "guardrail_version": "2026.10.1",
  "stage": "tool_output",
  "decision": "block",
  "score": 0.94,
  "threshold": 0.85,
  "category": "indirect_injection",
  "latency_ms": 38,
  "content_hash": "sha256:9c1e...",
  "content_ref": "s3://guardrail-evidence/run_7f3a/step4.json",
  "tenant": "acme",
  "error": null
}
```

- `decision`: `allow`, `block`, `redact`, `flag`, `escalate`, or `error`.
- `stage`: `user_input`, `retrieved_context`, `tool_input`, `tool_output`, `model_output`.
- Store raw content only in a restricted evidence store referenced by `content_ref`; logs and metrics carry hashes and categories.

## 2. Metrics

| Metric | Type | Why |
|---|---|---|
| `guardrail_evaluations_total{guardrail,stage,decision}` | Counter | Volume and block/flag rates |
| `guardrail_latency_seconds{guardrail}` | Histogram | Guardrails on the hot path add latency |
| `guardrail_errors_total{guardrail,reason}` | Counter | Failing guardrails may fail open |
| `guardrail_score{guardrail}` | Histogram | Score drift indicates model or traffic change |
| `guardrail_overrides_total{guardrail}` | Counter | Human overrides of blocks (false positives) |
| `guardrail_bypass_detected_total` | Counter | Unsafe content found downstream that the guardrail allowed |

```python
from prometheus_client import Counter, Histogram

EVALS = Counter("guardrail_evaluations_total", "Guardrail evaluations",
                ["guardrail", "stage", "decision"])
LATENCY = Histogram("guardrail_latency_seconds", "Guardrail latency", ["guardrail"],
                    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2))
ERRORS = Counter("guardrail_errors_total", "Guardrail errors", ["guardrail", "reason"])
```

Keep label cardinality low: no user IDs, run IDs, or content in labels.

## 3. Alerts

| Alert | Condition (tune to baseline) | Likely cause |
|---|---|---|
| Guardrail erroring | Error ratio above a few percent for 5–10 min | Classifier service down, timeouts; check fail-open/closed behaviour |
| Block-rate spike | Block rate several times the 7-day baseline | Attack campaign, or a broken/over-sensitive guardrail release |
| Block-rate collapse | Block rate near zero where it is normally steady | Guardrail bypassed by a code path, misconfiguration, or silent failure |
| Latency regression | p95 above budget | Capacity or model change |
| Override rate rising | Overrides above baseline | False positives hurting users |
| High-severity event | Any `escalate` in categories like data exfiltration attempt or self-harm | Immediate review per policy |

A sudden drop to zero is as important as a spike; it often means the guardrail is no longer in the path.

## 4. Fail-Open vs Fail-Closed

| Guardrail | On error |
|---|---|
| Tool permission / destructive-action approval | Fail closed (deny) |
| Data-exfiltration and PII output filter | Fail closed or degrade to stricter rule-based filter |
| Toxicity filter on low-risk internal tool | May fail open with flag, if documented |

Emit `decision="error"` and the chosen fallback decision so dashboards show both.

## 5. Dashboards

- Overview: evaluations, block/flag rates per guardrail and stage, error and latency panels.
- Attack view: injection/jailbreak categories over time, top targeted tools, tenants with spikes.
- Quality view: overrides, appeals, false-positive samples from review.
- Release annotations for guardrail versions, prompts, and models.

## 6. Review Workflow

1. Sample blocked and flagged events daily (stratified by guardrail and category), plus all escalations.
2. Reviewers with need-to-know access open evidence via `content_ref`; access is logged.
3. Label each sample: true positive, false positive, unclear. Feed labels into the guardrail test set (`guardrail-testing-validation.md`).
4. Compute precision from reviewed blocks; estimate recall with periodic red-team or seeded test traffic.

## 7. Seeded Canary Traffic

Send known-bad synthetic inputs (injection strings, test PII patterns) through production paths on a schedule and assert they are blocked. Tag them so they are excluded from user metrics. This detects silent bypasses faster than waiting for real attacks.

## 8. Retention and Privacy

- Evidence store encrypted, access-restricted, retention-limited (for example 30–90 days, per policy and regulation).
- Logs contain hashes and categories, not content.
- Redact secrets/PII before storing evidence where the content itself is not needed.

## Pitfalls

- Logging full prompts with PII into general log pipelines.
- Alerting on spikes only, missing silent bypasses.
- High-cardinality labels overloading the metrics backend.
- Treating guardrail errors as allows without recording it.

## Checklist

- [ ] Structured event per evaluation with version, stage, decision, score.
- [ ] Metrics for rate, latency, errors, overrides; low-cardinality labels.
- [ ] Alerts for errors, spikes, collapses, latency, high-severity events.
- [ ] Documented fail-open/closed behaviour per guardrail.
- [ ] Sampled human review feeding test sets; seeded canaries in production.
- [ ] Evidence store with restricted access and retention limits.
