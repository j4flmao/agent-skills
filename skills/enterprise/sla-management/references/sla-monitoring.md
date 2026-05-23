# SLA Monitoring

## Monitoring Architecture

### Data Sources
```
Application: Request logs, error rates, latency from APM (Datadog, Grafana)
Infrastructure: CPU, memory, disk, network from cloud provider
User-facing: Synthetic checks from external monitoring (Pingdom, Checkly)
LLM-specific: Token usage, model latency, guardrail pass rates
```

### Aggregation Pipeline
```
Events → Metrics → SLIs → SLOs → Alerting
  │         │        │       │        │
  ▼         ▼        ▼       ▼        ▼
Logs    Counters    Sliding  Burn    PagerDuty
        & histos   windows  rates   Slack
```

## SLI Measurement

### Availability
```python
def calculate_availability(checks, window="5m"):
    """Calculate availability as % of successful checks."""
    total = count_checks(checks, window)
    successful = count_successful(checks, window)
    return successful / total if total > 0 else 1.0
```

### Latency
```python
def calculate_latency_percentiles(latencies, percentiles=[50, 95, 99]):
    """Calculate latency at various percentiles."""
    sorted_latencies = sorted(latencies)
    n = len(sorted_latencies)
    results = {}
    for p in percentiles:
        idx = int(n * p / 100)
        results[f"P{p}"] = sorted_latencies[idx]
    return results
```

### Error Rate
```python
def calculate_error_rate(requests, window="5m"):
    """Calculate error rate as % of 5xx responses."""
    total = sum(r["count"] for r in requests)
    errors = sum(r["count"] for r in requests if r["status"] >= 500)
    return errors / total if total > 0 else 0
```

## Burn Rate Alerting

### Alert Configuration
```yaml
alerts:
  - name: "high-burn-rate"
    condition: "burn_rate > 2 for 1h"
    severity: "warning"
    channels: ["slack"]
    
  - name: "critical-burn"
    condition: "burn_rate > 4 for 6h"
    severity: "critical"
    channels: ["slack", "pagerduty"]
    
  - name: "emergency-burn"
    condition: "burn_rate > 10 for 30m"
    severity: "page"
    channels: ["pagerduty", "phone"]
```

## Multi-Service SLO

### Composite SLO
```
Overall SLO = Availability × Latency × Error Rate × Freshness
Each component weighted by customer impact.

Example:
  Availability: 99.95% (weight: 0.4)
  Latency P95: <500ms (weight: 0.3)
  Error Rate: <0.05% (weight: 0.2)
  Freshness: <5min (weight: 0.1)
  
  Composite = 0.4 × avail + 0.3 × lat + 0.2 × err + 0.1 × fresh
```

## Dashboard

### SLA Dashboard Panels
```
Row 1: Current status badges per service (OK / WARN / CRIT)
Row 2: Monthly availability trend (line chart, SLO threshold)
Row 3: Latency heatmap (hour × day, color = p95)
Row 4: Error budget remaining (gauge, colored by consumption)
Row 5: Active incidents timeline (Gantt chart)
Row 6: Burn rate (sparkline per service)
```

### Widgets
```python
dashboard_widgets = [
    {"title": "Current Status", "type": "badges", "sources": ["synthetic", "internal"]},
    {"title": "Availability MTD", "type": "timeseries", "metric": "availability"},
    {"title": "Error Budget", "type": "gauge", "metric": "error_budget_pct"},
    {"title": "Latency P95", "type": "timeseries", "metric": "latency_p95"},
    {"title": "Active Incidents", "type": "list", "source": "pagerduty"},
]
```

## Reporting

### Monthly SLA Report
```
Generated: 1st of each month
Audience: Customers, stakeholders, executives
Content:
- SLO achievement per service
- Incidents summary (count, duration, root cause)
- Credits due (if any)
- Improvement plan for next month
```

### Automatic Report Generation
```python
def generate_monthly_report(year, month):
    report = {
        "period": f"{year}-{month:02d}",
        "services": {},
        "incidents": get_incidents(year, month),
        "credits": [],
    }
    for service in SERVICES:
        metrics = get_sli_metrics(service, year, month)
        report["services"][service] = {
            "availability": metrics["availability"],
            "latency_p95": metrics["latency_p95"],
            "error_rate": metrics["error_rate"],
            "slo_met": all([
                metrics["availability"] >= SLO_TARGETS[service]["availability"],
                metrics["latency_p95"] <= SLO_TARGETS[service]["latency"],
                metrics["error_rate"] <= SLO_TARGETS[service]["error_rate"],
            ]),
        }
    return report
```
