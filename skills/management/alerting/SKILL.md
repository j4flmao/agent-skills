---
name: alerting
description: Alert rule design — severity classification, threshold tuning, notification routing, escalation, on-call integration.
---

# Alert Rules

## Agent Protocol

### Trigger
User request includes: `alert rule`, `alertmanager`, `prometheus alert`, `grafana alert`, `notification`, `pagerduty`, `on-call`, `escalation`, `alert fatigue`, `threshold`.

### Input Context
- Monitoring platform (Prometheus, Grafana, ELK, Datadog, New Relic)
- On-call tool (PagerDuty, Opsgenie, Slack)
- Current alert volume and known pain points
- Service criticality tiers

### Output Artifact
A markdown document containing:
- Alert severity definitions with response SLAs
- Alert rule templates per signal type (latency, errors, saturation, throughput)
- Threshold tuning guidelines (avoid alert fatigue)
- Notification routing rules (severity → channel → escalation)
- Silence/maintenance window policy
- Runbook template for common alerts

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick.

### Completion Criteria
- Severity levels defined with clear escalation paths
- Alert rules cover USE/RED method (Utilization, Saturation, Errors)
- Thresholds tuned with tuning guidelines
- Notification routing defined per severity
- Runbook template included

### Max Response Length
4096 tokens

## Alert Severity

| Severity | Label | Response SLA | Notification | Escalation |
|---|---|---|---|---|
| **P0** | Critical | 5 min acknowledge, 1 hr fix | Phone + Slack + PagerDuty | Engineering manager → CTO |
| **P1** | High | 15 min acknowledge, 4 hr fix | Slack + PagerDuty | Team lead |
| **P2** | Warning | 1 hr acknowledge, 24 hr fix | Slack | None |
| **P3** | Info | Next business day | Dashboard only | None |

## Alert Rule Templates

### RED Method (Rate, Errors, Duration)

```yaml
# High error rate
alert: HighErrorRate
expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
for: 5m
labels:
  severity: P1
annotations:
  summary: "{{ $labels.service }} error rate > 5%"

# Latency spike
alert: HighLatency
expr: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) > 2
for: 5m
labels:
  severity: P1
annotations:
  summary: "{{ $labels.service }} p99 latency > 2s"

# Low throughput (possible outage)
alert: ZeroTraffic
expr: rate(http_requests_total[5m]) == 0
for: 5m
labels:
  severity: P0
annotations:
  summary: "{{ $labels.service }} has zero traffic"
```

### USE Method (Utilization, Saturation, Errors)

```yaml
# CPU saturation
alert: HighCpuUsage
expr: node_cpu_seconds_total{mode="idle"} < 0.1
for: 10m
labels:
  severity: P2

# Disk space
alert: DiskSpaceRunningOut
expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) < 0.1
for: 5m
labels:
  severity: P2

# Memory pressure
alert: HighMemoryUsage
expr: (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) < 0.1
for: 5m
labels:
  severity: P2

# OOM killer
alert: OOMKillDetected
expr: increase(node_vmstat_oom_kill[5m]) > 0
labels:
  severity: P1
```

### Business Alerts

```yaml
# Order failure rate
alert: OrderFailureRate
expr: rate(order_failed_total[30m]) / rate(order_created_total[30m]) > 0.1
for: 10m
labels:
  severity: P1
annotations:
  summary: "Order failure rate > 10% in last 30 minutes"

# Payment processing delay
alert: PaymentProcessingDelay
expr: histogram_quantile(0.95, rate(payment_processing_duration_seconds_bucket[5m])) > 30
for: 5m
labels:
  severity: P1
```

## Threshold Tuning Rules

| Signal | Warning (P2) | Critical (P1) | Outage (P0) |
|---|---|---|---|
| **Error rate** | >1% for 5 min | >5% for 5 min | >20% for 2 min |
| **p99 Latency** | >500ms for 5 min | >2s for 5 min | >10s for 2 min |
| **CPU** | >80% for 10 min | >90% for 10 min | >95% for 5 min |
| **Memory** | >80% for 10 min | >90% for 10 min | >95% for 5 min |
| **Disk** | >80% for 10 min | >90% for 5 min | >95% for 2 min |

## Alert Fatigue Prevention

1. **Every alert must be actionable**: if no action can be taken, it is a dashboard metric, not an alert.
2. **No alert without runbook**: every alert routes to a runbook explaining diagnosis and fix.
3. **No duplicate alerts**: group related alerts; suppress cascade alerts.
4. **Flapping detection**: require minimum `for:` duration before firing.
5. **Seasonal tuning**: review and adjust thresholds monthly.
6. **Blackout periods**: scheduled maintenances silence alerts automatically.
7. **Cardinality limit**: alert labels must have bounded cardinality (<100 values).

## Runbook Template

```markdown
# Runbook: {{alert_name}}

## Severity: {{severity}}

## Symptoms
- What user impact is expected

## Check
1. {{command or URL to check}}
2. {{metric to verify}}

## Possible Causes
1. {{cause 1}} — check {{command}}
2. {{cause 2}} — check {{command}}

## Resolution
1. {{step 1}}
2. {{step 2}}

## Verification
- {{how to confirm fix worked}}

## Escalation
- {{who to contact if unresolved}}
```

## References

### Reference Files
- `references/alert-rules-catalog.md` — Complete alert rules catalog for infrastructure, application, business
- `references/notification-routing.md` — Notification routing rules, escalation matrix, integration configs

### Related Skills
- `devops/monitoring/SKILL.md` — Monitoring stack configuration
- `devops/observability/SKILL.md` — Observability fundamentals
- `management/security/SKILL.md` — Security alerts
- `management/team-rules/SKILL.md` — On-call rotation

## Handoff

Hand off to `devops/monitoring/SKILL.md` for monitoring stack setup. Hand off to `management/team-rules/SKILL.md` for on-call schedule and incident response.
