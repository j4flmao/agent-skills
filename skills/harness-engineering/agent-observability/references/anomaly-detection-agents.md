# Anomaly Detection for LLM Agents

Agents fail in ways that do not raise exceptions: loops that burn tokens, sudden shifts in tool usage, quality drops after a model update, prompt-injection-driven behaviour, or a tenant generating abnormal traffic. This reference covers which signals to monitor, detection methods from simple thresholds to statistical baselines, and how to route anomalies into response.

## Anomaly Classes

| Class | Examples | Primary signals |
|-------|----------|-----------------|
| Runaway execution | Repeated identical tool calls, step count explosion | Steps per run, repeated (tool, args) pairs |
| Cost spikes | One tenant or feature consumes many times normal spend | Cost per tenant/feature per window |
| Latency degradation | Provider slowdown, tool backend issues | p95 duration per span name |
| Error bursts | Tool errors, 429/5xx from providers, schema validation failures | Error rate by type |
| Behavioural drift | Tool selection distribution changes, refusal rate shifts, output length changes | Distributions per agent version/model |
| Quality regression | Lower eval scores, more user thumbs-down, more escalations | Online eval scores, feedback rates |
| Security-relevant | Agent attempts unusual tools, accesses data outside tenant, outputs secrets, follows instructions from retrieved content | Policy violations, guardrail triggers, data-access patterns |

## Signals to Emit

Per run (aggregated from traces):
- steps, tool calls by name, distinct tools, max repeats of the same call
- input/output tokens, cost, duration
- final status (success, budget_exceeded, error, escalated)
- guardrail and policy events
- eval/judge score if online evaluation runs

Emit these as metrics with bounded-cardinality labels (agent, version, model, feature, tenant tier); keep per-tenant detail in logs/warehouse to avoid metric cardinality explosion.

## Detection Methods

### 1. Hard Rules (in-run, immediate)

```python
from collections import Counter

class LoopDetector:
    def __init__(self, max_repeats: int = 3, max_steps: int = 25) -> None:
        self.calls: Counter[tuple[str, str]] = Counter()
        self.steps = 0
        self.max_repeats, self.max_steps = max_repeats, max_steps

    def observe(self, tool: str, args_canonical_json: str) -> str | None:
        self.steps += 1
        key = (tool, args_canonical_json)
        self.calls[key] += 1
        if self.calls[key] > self.max_repeats:
            return f"repeated call {tool} x{self.calls[key]}"
        if self.steps > self.max_steps:
            return f"step limit {self.max_steps} exceeded"
        return None
```

On violation: stop the run, return a safe partial result, emit an anomaly event.

### 2. Static Thresholds (fleet-level)

- Error rate > X% over 5 minutes, p95 latency > budget, spend per hour > cap.
- Simple and explainable; tune to avoid alert fatigue.

### 3. Statistical Baselines

- Rolling mean and standard deviation, or median and MAD (more robust to outliers), per series with seasonality (hour of week).
- Robust z-score: `z = 0.6745 * (x - median) / MAD`; alert when `|z|` exceeds a threshold for several consecutive windows.
- EWMA control charts for slowly drifting metrics (output length, refusal rate).

### 4. Distribution Shift

Compare categorical distributions (tool usage, finish reasons, intent classes) between a reference window and the current window:
- Population Stability Index or Jensen-Shannon divergence for categorical shares.
- Chi-square test when counts are sufficient.
- Alert per agent version and after model/prompt deployments.

### 5. Model-Based Detection

Isolation Forest or similar on run-level feature vectors (steps, tokens, tools used, duration) can surface unusual runs for review. Use for triage queues, not paging, since false-positive rates are hard to control.

### 6. Online Evaluation

- Sample production runs and score them with LLM-as-judge rubrics or heuristics (groundedness, task success, policy compliance).
- Track score distributions; alert on sustained drops. Calibrate judges against human labels periodically.

## Change-Aware Monitoring

Most anomalies follow a change. Annotate dashboards and anomaly events with deployments: agent version, prompt version, model version (including provider-side model updates), tool backend releases. Compare canary vs baseline cohorts before full rollout.

## Security Anomalies

- Tool calls not expected for the task type or user role (e.g. `send_email` during a summarization task).
- Retrieved content containing instruction-like text followed by unusual tool use (possible indirect prompt injection).
- Cross-tenant identifiers appearing in arguments or outputs.
- Output matching secret patterns (API key formats) or PII detectors.

Enforce authorization in tools (deny by policy), and use detection as a second layer that pages security when policies trigger repeatedly.

## Routing and Response

| Severity | Example | Response |
|----------|---------|----------|
| In-run | Loop detected | Auto-stop run, user-facing graceful message |
| Page | Error burst, spend spike above hard cap, security policy violations | On-call; kill switch per feature/tenant |
| Ticket | Drift in tool distribution, slow quality decline | Investigate in working hours |
| Review queue | Model-based outliers | Human review sample |

Provide kill switches: disable a tool, force a fallback model, cap a tenant, or disable an agent feature without redeploying.

## Pitfalls

- Alerting on raw per-tenant metrics with high cardinality in Prometheus-style systems.
- No baseline seasonality, so every Monday morning pages.
- Treating judge scores as ground truth without calibration.
- Detection without a response path (no kill switch).

## Checklist

- [ ] In-run loop and budget detection with safe termination
- [ ] Fleet thresholds for errors, latency, spend
- [ ] Baselines with seasonality for drift-prone metrics
- [ ] Distribution-shift checks on tool usage after each change
- [ ] Online evals sampled and tracked
- [ ] Security anomaly rules feeding security on-call
- [ ] Kill switches documented and tested
