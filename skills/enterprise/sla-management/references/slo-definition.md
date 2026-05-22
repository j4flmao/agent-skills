# SLO Definition Guide

## SLI Categories

### Latency SLIs
- p50 latency: median response time
- p95 latency: 95th percentile (typical max)
- p99 latency: 99th percentile (worst case)

### Availability SLIs
- Request-based: successful / total × 100
- Time-based: uptime seconds / total seconds × 100

### Quality SLIs
- Error rate: 5xx responses / total responses
- Freshness: age of data presented to user
- Correctness: valid responses / total responses

### Throughput SLIs
- Requests per second
- Concurrent connections
- Data transfer rate

## SLO Target Setting

### Good Target Ranges
| Service Type | Latency p99 | Error Rate | Availability |
|--------------|-------------|------------|--------------|
| Critical API | <50ms | <0.01% | 99.99% |
| Standard API | <200ms | <0.1% | 99.9% |
| Batch/Async | <5s | <0.5% | 99.5% |
| Internal Tool | <1s | <1% | 99.0% |

### Setting Realistic Targets
- Measure baseline for 30 days before setting SLO
- SLO should be tighter than historical p99
- Leave 20% margin below SLA commitment
- Example: SLA=99.9%, set SLO=99.95%

## SLI Measurement

### Request-Based
```python
# Prometheus-style counter
sli_latency = histogram_quantile(0.99,
    rate(http_request_duration_seconds_bucket[5m]))

sli_error_rate = (
    rate(http_requests_total{status=~"5.."}[5m]) /
    rate(http_requests_total[5m])
)

sli_availability = (
    1 - (
        rate(http_requests_total{status=~"5.."}[30d]) /
        rate(http_requests_total[30d])
    )
) * 100
```

### Time-Based
```yaml
# Uptime checker configuration
uptime_check:
  interval: 30s
  locations: ["us-east-1", "eu-west-1", "ap-southeast-1"]
  timeout: 5s
  retries: 2
  SLO_window: 30_days
```

## SLO Documentation Template

```yaml
service: "payment-api"
sli:
  latency_p99:
    target: 100ms
    measurement: prometheus_histogram
    window: 7d
  error_rate:
    target: 0.05%
    measurement: prometheus_counter
    window: 30d
  availability:
    target: 99.95%
    measurement: request_based
    window: 30d
error_budget:
  window: 30d
  consumption: 45%
  policy: feature_freeze_at_100%
```
