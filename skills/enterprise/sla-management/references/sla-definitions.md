# SLA Definitions

## Service Level Indicators (SLIs)

| SLI | Definition | Measurement |
|-----|------------|-------------|
| Availability | Uptime / total time | Prometheus blackbox, LB health |
| Latency | Response time percentile | P50, P95, P99 from APM |
| Throughput | Requests per second | API gateway metrics |
| Error Rate | 5xx / total requests | HTTP status monitoring |
| Freshness | Data age at query time | Last updated timestamp |
| Correctness | Accuracy of responses | Eval dataset pass rate |

## Service Level Objectives (SLOs)

### Common SLO Targets
| Tier | Availability | Latency P95 | Error Rate | Freshness |
|------|-------------|-------------|------------|-----------|
| Platinum | 99.99% | <200ms | <0.01% | Real-time |
| Gold | 99.95% | <500ms | <0.05% | <5 min |
| Silver | 99.9% | <1s | <0.1% | <15 min |
| Bronze | 99.5% | <3s | <0.5% | <1 hour |

### SLO Burn Rate
```
Error budget = 1 - SLO (e.g., 99.9% → 0.1% error budget)
Monthly error budget = total requests × (1 - SLO)

Burn rate = actual error rate / (1 - SLO)
  <1: within budget
  =1: burning exactly at budget
  >1: exceeding budget
```

### Alert Thresholds
```
Warning: Burn rate > 2 over 1 hour (5% of budget consumed)
Critical: Burn rate > 4 over 6 hours (20% of budget consumed)
Page: Burn rate > 10 over 30 minutes (emergency)
```

## SLA Components

### Service Commitment
```
Coverage: 24/7 excluding planned maintenance
Planned maintenance: Notified 7 days in advance
Maximum planned downtime: 8 hours per quarter
Credits: 5% per 0.1% below SLO, max 100%
Exclusions: Force majeure, customer actions, third-party
```

### Measurement Window
```
Metrics: 5-minute rolling windows
Reporting: Monthly aggregation
Exclusion: Windows below minimum request threshold (100 req/5min)
Seasonal adjustment: Higher allowances during known peak periods
```

## Operational Level Agreements (OLAs)

### Internal Response Times
| Severity | Response Time | Update Frequency | Escalation |
|----------|--------------|------------------|------------|
| P1 (Critical) | 15 min | Every 30 min | VP after 2hr |
| P2 (High) | 1 hour | Every 4 hours | Director after 8hr |
| P3 (Medium) | 4 hours | Daily | Manager after 24hr |
| P4 (Low) | 24 hours | Weekly | None |

## SLA Documentation

### Contract Template
```yaml
service_name: "AI Assistant API"
tier: "Gold"
slo:
  availability: 99.95%
  latency_p95: 500ms
  error_rate: 0.05%
measurement:
  window: "5 minutes"
  reporting: "monthly"
  min_requests_per_window: 100
exclusions:
  - "Planned maintenance (notified 7 days)"
  - "Customer-caused incidents"
  - "Third-party dependencies beyond our control"
credits:
  - threshold: 0.1% below SLO
    credit: 5%
  - threshold: 1% below SLO
    credit: 20%
  - max_credit: 100%
```

## SLA Monitoring

### Dashboard
```
Current status: [Operational] [Degraded] [Outage]
Month to date:
  Availability: 99.97% (SLO: 99.95%)
  Latency P95: 320ms (SLO: 500ms)
  Error rate: 0.03% (SLO: 0.05%)
  Budget consumed: 40%
Incidents this month: 2 (1 P2, 1 P3)
```

### Reporting
```markdown
## March 2026 SLA Report

### Summary
- Availability: 99.97% (SLO: 99.95%) ✅
- Latency P95: 320ms (SLO: 500ms) ✅
- Error rate: 0.03% (SLO: 0.05%) ✅

### Outages
1. 2026-03-12 14:30-15:00 (30min): DB failover
   - Impact: All tiers degraded
   - Root cause: Primary DB instance failure
   - Action: Added multi-AZ deployment

### Credits
- No credits applicable this month
- Service above SLO on all metrics
```
