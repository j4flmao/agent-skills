# Error Budget Management for Agent Services

Error budgets turn reliability targets (SLOs) into a decision tool: how much failure is acceptable before reliability work takes priority over new features. For agents, "failure" includes wrong or unusable outputs, not only HTTP errors. This reference defines agent SLIs, budget math, burn-rate alerts, and policies.

## 1. Agent SLIs

| SLI | Good event | Measured from |
|---|---|---|
| Availability | Request returns a non-error response | Gateway/harness logs |
| Task success | Run ends in `done` with validated output | Run records |
| Latency | Run completes within threshold (e.g. p95 target) | Run timing |
| Output validity | Output passes schema/verification checks | Validators |
| Quality (sampled) | Output rated acceptable by eval rubric or human review | Online evals |
| Safe completion | No guardrail violation reached the user | Guardrail logs |

Define each as `good events / valid events` over a window. Exclude events caused by invalid user input from the denominator, but track them separately.

## 2. Budget Math

```
SLO target       = 99.0% task success over 28 days
Error budget     = 1 - 0.99 = 1% of valid runs
Runs in window   = 2,000,000  → budget = 20,000 failed runs
Budget consumed  = failed runs so far / budget
```

Burn rate = observed error rate / (1 - SLO). A burn rate of 1 consumes exactly the budget over the window; 14.4 over one hour consumes about 2% of a 30-day budget in that hour (the multiwindow alerting example from the Google SRE Workbook).

## 3. Multiwindow, Multi-Burn-Rate Alerts

| Severity | Long window | Short window | Burn rate | Budget consumed (30-day SLO) |
|---|---|---|---|---|
| Page | 1 h | 5 min | 14.4 | 2% |
| Page | 6 h | 30 min | 6 | 5% |
| Ticket | 3 d | 6 h | 1 | 10% |

Alert only when both windows exceed the rate: the long window shows significance, the short window shows it is still happening.

Prometheus example (task-success SLO 99%):

```yaml
groups:
  - name: agent-slo
    rules:
      - record: agent:task_error_ratio:rate1h
        expr: sum(rate(agent_runs_total{outcome!="success"}[1h])) / sum(rate(agent_runs_total[1h]))
      - record: agent:task_error_ratio:rate5m
        expr: sum(rate(agent_runs_total{outcome!="success"}[5m])) / sum(rate(agent_runs_total[5m]))
      - alert: AgentTaskErrorBudgetFastBurn
        expr: agent:task_error_ratio:rate1h > (14.4 * 0.01) and agent:task_error_ratio:rate5m > (14.4 * 0.01)
        labels: { severity: page }
        annotations:
          summary: "Agent task error budget burning fast (1h and 5m windows)"
```

Use `outcome` labels from the error taxonomy (`transient_infra`, `model_output`, `tool_execution`) so responders see what is burning the budget.

## 4. Error Budget Policy

| Budget state | Policy |
|---|---|
| > 50% remaining | Normal releases, prompt/model experiments allowed |
| 25–50% | Releases require eval pass on regression set; experiments limited |
| < 25% | Only reliability fixes and low-risk changes; canary all prompt/model changes |
| Exhausted | Feature freeze for the service until budget recovers or postmortem actions land |

Agree the policy in writing with product owners before it is needed.

## 5. Agent-Specific Budget Consumers

| Consumer | Typical mitigation |
|---|---|
| Provider outages / rate limits | Fallback models, capacity reservations, retry budgets |
| Prompt or model changes | Offline evals + canary + automated rollback |
| Tool/API regressions | Contract tests on tools, circuit breakers |
| Output format drift | Structured outputs, validators with repair |
| Context overflow on long tasks | Compaction, task chunking |

Attribute budget consumption to these buckets each review period.

## 6. Quality SLIs Need Sampling

Quality cannot be measured on every run cheaply. Sample (e.g. a fixed percentage plus all degraded runs), score with rubric-based evaluators or reviewers, and compute the SLI with confidence intervals. Treat quality SLOs as tickets rather than pages unless an automated evaluator is reliable.

## 7. Change Management Tied to Budget

- Canary new prompts/models to a small traffic share; compare SLIs against control.
- Automatic rollback when canary burn rate exceeds the threshold.
- Record each change (prompt version, model, toolset) as an annotation on SLO dashboards.

## Pitfalls

- SLO on availability only: the service is "up" while returning wrong answers.
- 100% targets: no budget for change, so the SLO is ignored.
- Alerting on raw error counts instead of burn rate: noisy at peak traffic, silent at low traffic.
- No agreed policy: budget exhaustion changes nothing.

## Checklist

- [ ] SLIs defined for availability, task success, latency, validity, and sampled quality.
- [ ] SLO targets and windows agreed with product owners.
- [ ] Multiwindow burn-rate alerts with taxonomy labels.
- [ ] Written error budget policy with release gates.
- [ ] Prompt/model changes canaried and annotated on dashboards.
