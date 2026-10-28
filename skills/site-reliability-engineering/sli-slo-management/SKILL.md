---
name: sre-sli-slo-management
description: >
  Use this skill when the user says 'define slo', 'sli', 'error budget', 'burn rate alert', 'multiwindow multi-burn-rate', 'slo math', 'availability target', 'latency slo', 'error budget policy', 'sloth', 'pyrra', 'openslo'. Defines SLIs as good/valid event ratios, sets SLO targets and windows, computes error budgets, and writes multiwindow multi-burn-rate Prometheus alerts plus an error budget policy. Do NOT use for: broad SRE program design (devops-sre-practices), contractual SLAs and penalties (sla-management), incident handling (sre-incident-response).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [sre, slo, sli, error-budget, burn-rate, prometheus, alerting]
---

# SLI / SLO Management

## Purpose
Express reliability as a ratio of good events to valid events, set a target users would actually notice, and alert on how fast the error budget is being consumed rather than on raw thresholds. This yields few, actionable pages and a shared rule for when reliability work outranks features.

## Agent Protocol

### Trigger
"define SLO", "SLI", "error budget", "burn rate alert", "multiwindow", "SLO math", "availability target", "latency SLO", "error budget policy", "Sloth", "Pyrra", "OpenSLO".

### Input Context
- User journeys and the request/event types behind them.
- Available metrics (request counters, latency histograms, synthetic probes).
- Current performance (last 4 weeks) and business tolerance.

### Output Artifact
SLI definitions, SLO table, recording/alerting rules, error budget policy. No file unless requested.

### Response Format
```
Journey: {name}
SLI: good = {...}; valid = {...}; source = {metric}
SLO: {target}% over {28d|30d} rolling
Error budget: {minutes or bad-event fraction}
Alerts: page {1h/5m @14.4x, 6h/30m @6x}; ticket {3d/6h @1x}
Policy: {action at 50%/100% budget consumed}
```

### Completion Criteria
- [ ] SLI measured as close to the user as practical (load balancer or client, not only the pod).
- [ ] Target based on observed performance and user need, not "five nines" by default.
- [ ] Alerts use multiwindow multi-burn-rate; no static-threshold pages for the same signal.

## SLI Definitions
`SLI = good events / valid events` (exclude invalid events such as 4xx caused by clients, health checks).
| Type | Good event | Typical source |
|---|---|---|
| Availability | Request served without 5xx (or without timeout) | LB / ingress / mesh metrics |
| Latency | Request served faster than threshold (e.g. < 300 ms) | Histogram bucket `le="0.3"` |
| Freshness | Data age < N minutes when read | Pipeline timestamp gauge |
| Correctness | Output matches expectation | Probers / reconciliation jobs |
| Throughput/coverage | Records processed / records received | Pipeline counters |

Latency SLIs must align with histogram bucket boundaries; pick bucket edges that match your thresholds.

## Error Budget Math
- Error budget = `1 − SLO`. For 99.9% over 30 days: 0.1% of requests may fail, ≈ 43.2 minutes of total downtime equivalent (30 × 24 × 60 × 0.001).
- 99.9% over 28 days ≈ 40.3 minutes; 99.95% over 30 days ≈ 21.6 minutes; 99.99% ≈ 4.3 minutes.
- **Burn rate** = observed error rate / budgeted error rate. Burn rate 1 exhausts the budget exactly at the end of the window; burn rate 14.4 on a 30-day window consumes 2% of the budget in 1 hour (14.4 × 1h / 720h = 2%).

## Multiwindow Multi-Burn-Rate Alerts (30-day SLO)
| Severity | Long window | Short window | Burn rate | Budget consumed when it fires |
|---|---|---|---|---|
| Page | 1h | 5m | 14.4 | 2% |
| Page | 6h | 30m | 6 | 5% |
| Ticket | 3d | 6h | 1 | 10% |
The short window makes the alert reset quickly once the problem stops.

```yaml
groups:
  - name: checkout-slo-recording
    rules:
      - record: slo:sli_error:ratio_rate5m
        expr: |
          sum(rate(http_requests_total{job="checkout",code=~"5.."}[5m]))
          /
          sum(rate(http_requests_total{job="checkout"}[5m]))
      - record: slo:sli_error:ratio_rate30m
        expr: |
          sum(rate(http_requests_total{job="checkout",code=~"5.."}[30m]))
          / sum(rate(http_requests_total{job="checkout"}[30m]))
      - record: slo:sli_error:ratio_rate1h
        expr: |
          sum(rate(http_requests_total{job="checkout",code=~"5.."}[1h]))
          / sum(rate(http_requests_total{job="checkout"}[1h]))
      - record: slo:sli_error:ratio_rate6h
        expr: |
          sum(rate(http_requests_total{job="checkout",code=~"5.."}[6h]))
          / sum(rate(http_requests_total{job="checkout"}[6h]))
  - name: checkout-slo-alerts
    rules:
      - alert: CheckoutErrorBudgetFastBurn
        expr: |
          (slo:sli_error:ratio_rate1h > (14.4 * 0.001) and slo:sli_error:ratio_rate5m > (14.4 * 0.001))
          or
          (slo:sli_error:ratio_rate6h > (6 * 0.001) and slo:sli_error:ratio_rate30m > (6 * 0.001))
        labels:
          severity: page
        annotations:
          summary: "Checkout is burning its 99.9% error budget too fast"
          runbook_url: https://runbooks.example.com/checkout/error-budget
```
`0.001` = budget for a 99.9% SLO. Generate these rules with Sloth or Pyrra instead of hand-writing them for many services; OpenSLO is a vendor-neutral YAML spec for SLO definitions.

Low-traffic services: a handful of failures can trigger fast-burn alerts. Use synthetic traffic, longer windows, or minimum-request-count guards (`and sum(rate(...[1h])) > N`).

## Choosing Targets
1. Measure the last 4 weeks; the SLO should be at or slightly below what you achieve today if users are happy.
2. Each extra nine costs roughly an order of magnitude more effort; dependencies cap you (a service cannot be more available than its hard dependencies multiplied together, unless it degrades gracefully).
3. Set separate SLOs per journey (checkout vs search), not one per microservice nobody sees.
4. Review quarterly.

## Error Budget Policy (example)
| Budget consumed (rolling window) | Action |
|---|---|
| < 50% | Normal feature velocity |
| 50–100% | Reliability items prioritized in the next sprint; risky launches need SRE review |
| > 100% | Feature freeze for the service except reliability/security fixes until back within SLO; postmortem for the largest contributors |
The policy is agreed by product and engineering leadership in advance; automation (deploy gates) only enforces what humans agreed.

## Anti-Patterns
- SLO = 100% (no budget, no room to deploy).
- SLIs from CPU/memory — not user-visible.
- Averages for latency SLIs; use threshold ratios from histograms.
- Paging on every SLO breach of a 5-minute window.
- Dozens of SLOs per service that nobody reviews.

## Checklist
- [ ] SLIs written as good/valid with exact PromQL.
- [ ] Window (28d or 30d rolling) and target documented with rationale.
- [ ] Burn-rate alerts with runbooks; ticket-level slow-burn alert.
- [ ] Dashboard: SLI, remaining budget, burn rate.
- [ ] Error budget policy signed off.

## References
- `../references/slo_definitions.md`
- `../references/promql_rules.md`
- `../references/sla_calculations.md`
