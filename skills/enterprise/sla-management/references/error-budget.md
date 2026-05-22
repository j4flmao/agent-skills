# Error Budget Management

## Error Budget Calculation

### Formula
```
Error Budget = (1 - SLO) × Total Time Window

Example:
SLO = 99.9% (three nines)
Window = 30 days (2,592,000 seconds)
Error Budget = 0.001 × 2,592,000 = 2,592 seconds = 43 minutes 12 seconds
```

### By SLO Level
| SLO | Per Day | Per 30 Days | Per Quarter |
|-----|---------|-------------|-------------|
| 99.99% | 8.6s | 4.3m | 13m |
| 99.95% | 43s | 21.6m | 1h 5m |
| 99.9% | 1m 26s | 43m | 2h 10m |
| 99.5% | 7m 12s | 3h 36m | 10h 48m |
| 99.0% | 14m 24s | 7h 12m | 21h 36m |

## Burn Rate Concepts

### Burn Rate Definition
- Rate at which error budget is consumed
- Measured in budget consumed per hour
- Normal = 1 (consumes evenly over window)
- Fast = >5 (likely to exhaust budget)
- Slow = 1-2 (needs attention)

### Burn Rate Alert Thresholds

| Burn Rate | Time to Exhaust | Alert Type | Response |
|-----------|----------------|------------|----------|
| >10 | <3 days | PagerDuty immediate | Rollback or feature freeze |
| 5-10 | 3-6 days | PagerDuty high | Escalate to on-call |
| 2-5 | 6-15 days | Daily digest | Engineering review |
| 1-2 | 15-30 days | Weekly report | Monitor, no action |
| <1 | >30 days | No alert | Health nominal |

## Budget Consumption Policy

### State Machine
```
Green (< 50% consumed)
  → Continue normal operations
  → All deploys allowed

Yellow (50-80% consumed)
  → Only bug fixes and reliability work
  → Risk-aware deploys

Orange (80-100% consumed)
  → Feature freeze
  → Only reliability changes
  → War room if fast burn

Red (100% consumed)
  → Full feature freeze
  → Mandatory reliability sprint
  → SLO review required
```

## Implementation

### Prometheus Recording Rules
```yaml
groups:
  - name: error_budget
    rules:
      - record: slo:error_budget_consumed:ratio
        expr: |
          1 - (
            rate(http_requests_total{status!~"5.."}[30d])
            /
            rate(http_requests_total[30d])
          )
      - record: slo:error_budget_burn_rate
        expr: |
          slo:error_budget_consumed:ratio * 30 * 24
```

### Alert Rules
```yaml
groups:
  - name: burn_rate_alerts
    rules:
      - alert: FastBurnRate
        expr: slo:error_budget_burn_rate > 10
        for: 5m
        labels:
          severity: critical
      - alert: SlowBurnRate
        expr: slo:error_budget_burn_rate > 2
        for: 1h
        labels:
          severity: warning
```

## Quarterly SLO Review

### Review Agenda
1. Attained SLO vs target for each service
2. Error budget consumption trend
3. Feature freeze events and impact
4. Infrastructure changes needed
5. SLO target adjustment proposals
6. Customer SLA impact assessment
