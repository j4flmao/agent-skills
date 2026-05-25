# SLO / SLI / SLA Definitions

## SLI Types

| SLI Category | Examples | Measurement |
|-------------|----------|-------------|
| Availability | Request success rate | successful / total requests |
| Latency | Response time percentiles | P50, P95, P99 in ms |
| Throughput | Requests per second | Count over time window |
| Durability | Data persistence rate | Records intact / total |
| Freshness | Data staleness | Age of newest data point |
| Correctness | Accuracy rate | Correct / total responses |

### Latency SLI Implementation
```python
class LatencySLI:
    def __init__(self, buckets=[50, 100, 200, 500, 1000, 5000]):
        self.buckets = {b: 0 for b in buckets}
        self.total = 0

    def record(self, latency_ms: float):
        self.total += 1
        for bucket in sorted(self.buckets.keys()):
            if latency_ms <= bucket:
                self.buckets[bucket] += 1
                break

    def percentile(self, p: float) -> float:
        target = int(self.total * p / 100)
        cumulative = 0
        for bucket in sorted(self.buckets.keys()):
            cumulative += self.buckets[bucket]
            if cumulative >= target:
                return bucket
        return max(self.buckets.keys())
```

## SLO Targets

| Tier | Availability | Latency (P95) | Latency (P99) | Error Budget |
|------|-------------|---------------|---------------|--------------|
| Critical | 99.99% | < 100ms | < 500ms | 0.01% (52.6 min/yr) |
| High | 99.95% | < 200ms | < 1s | 0.05% (4.38 hr/yr) |
| Standard | 99.9% | < 500ms | < 2s | 0.1% (8.76 hr/yr) |
| Best effort | 99% | < 1s | < 5s | 1% (3.65 day/yr) |

## Error Budgets

| Budget Remaining | Deploy Risk | Actions |
|-----------------|-------------|---------|
| > 50% | Low | Normal deploys, feature work |
| 25-50% | Medium | Code review required, canary deploys |
| 10-25% | High | Freeze feature deploys, reliability work |
| < 10% | Critical | Emergency: all hands on reliability |

## Burn Rate Alerts

| Alert | Burn Rate | Duration | Response |
|-------|-----------|----------|----------|
| Page | 2x budget consumed | 1 hour | Immediate incident response |
| Ticket | 1x budget consumed | 6 hours | Investigate within business hours |
| Watch | 0.5x budget consumed | 3 days | Monitor, create ticket |

```python
class BurnRateAlert:
    def __init__(self, slo=0.999, window_hours=1):
        self.slo = slo
        self.window = window_hours
        self.error_budget = 1 - slo

    def check_burn_rate(self, error_rate: float, elapsed_hours: float):
        expected_burn = self.error_budget * (elapsed_hours / (30 * 24))
        actual_burn = error_rate * elapsed_hours
        burn_rate = actual_burn / expected_burn if expected_burn > 0 else 0

        if burn_rate >= 2:
            return "page"
        elif burn_rate >= 1:
            return "ticket"
        elif burn_rate >= 0.5:
            return "watch"
        return "ok"
```

## SLO Reporting

| Report | Audience | Frequency | Content |
|--------|----------|-----------|---------|
| Weekly SLO | Engineering team | Weekly | Current vs target, error budget |
| Monthly review | Management | Monthly | Trends, incidents, improvements |
| Quarterly business | Leadership | Quarterly | Reliability investments, ROI |
| Post-incident | Incident team | Per incident | SLO impact, improvement plan |

## Multi-Service SLO Composition

```python
class CompositeSLO:
    def __init__(self, services):
        self.services = services  # {name: slo_target}

    def overall_availability(self):
        # Product of all service availabilities
        product = 1.0
        for name, target in self.services.items():
            product *= target
        return product

    def error_budget_consumption(self, service_name, error_rate, window_hours):
        service = self.services[service_name]
        budget = 1 - service
        consumed = error_rate * window_hours / (budget * 720)  # per 30-day window
        return min(consumed, 1.0) * 100

# Example: 3 services with 99.9% each
# Composite = 0.999 ^ 3 = 99.7% overall
```

## SLO Validation Rules
- SLO must be measured over a rolling window (30 days minimum)
- Error budget is consumed proportionally, not in discrete events
- Burn rate alerts trigger at 2x, 1x, and 0.5x consumption rates
- SLOs must be reviewed quarterly and adjusted with business stakeholders
- New services get a 90-day SLO grace period during ramp-up
- SLO breaches require a postmortem regardless of error budget remaining
