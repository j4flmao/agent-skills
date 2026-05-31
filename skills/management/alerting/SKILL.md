---
name: alerting
description: >
  Use this skill when the user asks about alert rules, Alertmanager, Prometheus
  alerts, Grafana alerts, notification routing, PagerDuty, on-call, escalation,
  alert fatigue, or threshold tuning.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsuf: true
tags: [management, alerting, phase-8]
---

# Alert Rules

## Purpose
Design alert rules following the RED/USE method with severity classification,
threshold tuning, notification routing, and escalation paths. Ensure every alert
is actionable, documented with a runbook, and tuned to balance detection speed
against fatigue.

## Framework and Methodology

### Alerting Philosophy
Four principles guide alert rule design:

1. **Actionability** -- if no action can be taken, it belongs on a dashboard, not as an alert.
2. **Signal over noise** -- every firing alert represents a real issue requiring human intervention.
3. **Tiered response** -- severity dictates speed of response, not importance of the metric.
4. **Continuous tuning** -- thresholds degrade over time as systems evolve; review monthly.

### RED Method (Applications)
Rate, Errors, Duration -- the three golden signals for application monitoring.

```
Rate: How much traffic is flowing through the system?
  Query: rate(http_requests_total[5m])
  Alert: sudden drop (possible outage) or unexpected surge (traffic anomaly)

Errors: What fraction of requests are failing?
  Query: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])
  Alert: > 1% warning, > 5% critical

Duration: How long do requests take?
  Query: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))
  Alert: p99 > 500ms warning, > 2s critical
```

### USE Method (Infrastructure)
Utilization, Saturation, Errors -- resource-focused monitoring.

```
Utilization: What percentage of capacity is being used?
  CPU: node_cpu_seconds_total{mode="idle"} < 0.1
  Memory: node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes < 0.1
  Disk: node_filesystem_avail_bytes / node_filesystem_size_bytes < 0.1

Saturation: How much extra work is queued?
  CPU run queue length > 4 * core count
  Disk I/O queue depth > disk I/O capacity
  Network interface drops > 0

Errors: How many errors are occurring?
  OOM kills: increase(node_vmstat_oom_kill[5m]) > 0
  Disk errors: increase(node_disk_io_time_seconds_total[5m]) > 0
  Network errors: increase(node_network_transmit_errors_total[5m]) > 0
```

### Business Metrics
Domain-specific alerts on revenue-impacting signals.

```
- Order failure rate > 10%
- Payment processing delay > 30s p95
- User signup completion rate < 90%
- API integration partner error rate > 5%
- Cart abandonment rate spike > 20% above baseline
```

## Agent Protocol

### Trigger
User request includes: `alert rule`, `alertmanager`, `prometheus alert`,
`grafana alert`, `notification`, `pagerduty`, `on-call`, `escalation`,
`alert fatigue`, `threshold`.

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
- Notification routing rules (severity to channel to escalation)
- Silence/maintenance window policy
- Runbook template for common alerts

### Response Format
Produce the artifact directly. No preamble. No postamble. No explanations.
No filler/hedging/transitions. Compress output.

### Completion Criteria
- Severity levels defined with clear escalation paths
- Alert rules cover USE/RED method (Utilization, Saturation, Errors)
- Thresholds tuned with tuning guidelines
- Notification routing defined per severity
- Runbook template included

### Max Response Length
4096 tokens

## Workflow

### Step 1: Define Severity Levels
Map severity (P0-P3) to response SLA, notification channels, and escalation paths.

```
P0: Critical -- 5 min acknowledge, 1 hr fix -- Phone + Slack + PagerDuty
     Escalation: EM -> CTO -- Example: total service outage, data loss
P1: High -- 15 min acknowledge, 4 hr fix -- Slack + PagerDuty
     Escalation: Team lead -- Example: high error rate, degraded performance
P2: Warning -- 1 hr acknowledge, 24 hr fix -- Slack
     Escalation: None -- Example: disk usage rising, latency increasing
P3: Info -- Next business day -- Dashboard only
     Escalation: None -- Example: certificate expiring in 30 days
```

### Step 2: Create RED Method Alerts
Define rate, error, and duration alerts for application services.

```
HighErrorRate: rate(5xx) / rate(total) > 0.05 for 5m -> P1
HighLatency: p99 latency > 2s for 5m -> P1
ZeroTraffic: rate(requests) == 0 for 5m -> P0
HighTrafficSurge: rate(requests) > 3x baseline for 10m -> P2
```

### Step 3: Create USE Method Alerts
Define utilization, saturation, and error alerts for infrastructure resources.

```
HighCpuUsage: idle < 10% for 10m -> P2
DiskSpaceRunningOut: avail < 10% for 5m -> P2
HighMemoryUsage: avail < 10% for 5m -> P2
OOMKillDetected: oom_kill > 0 -> P1
DiskIOLatency: avg_queue_latency > 100ms for 10m -> P2
NetworkPacketLoss: tx_errors > 5% for 5m -> P2
```

### Step 4: Add Business Alerts
Create domain-specific alerts for order failures, payment delays, and other business metrics.

```
OrderFailureRate: failure rate > 10% for 10m -> P1
PaymentProcessingDelay: p95 > 30s for 5m -> P1
SignupCompletionDrop: completion rate < 90% for 15m -> P2
```

### Step 5: Tune Thresholds
Apply threshold tuning rules to balance detection speed against alert fatigue.

```
- Start with conservative thresholds (higher tolerance).
- Review monthly: are alerts firing? Are they actionable?
- Adjust based on: false positive rate, detection latency, business impact.
- Use seasonal baselines: peak vs off-peak thresholds.
- Implement dynamic thresholds for predictable traffic patterns.
```

### Step 6: Configure Notification Routing
Map severity to notification channels with escalation matrix.

```
P0 -> Phone + Slack + PagerDuty -> EM after 5 min no ack -> CTO after 15 min
P1 -> Slack + PagerDuty -> Team lead after 15 min no ack
P2 -> Slack channel -> Escalate after 1 hr if no response
P3 -> Dashboard + email digest -> No escalation
```

### Step 7: Create Runbooks
Every alert must have a documented runbook with diagnosis and resolution steps.

```
Runbook template per alert:
  1. Symptom description
  2. Possible causes (ordered by likelihood)
  3. Diagnostic steps (commands to run, metrics to check)
  4. Resolution steps
  5. Verification procedure
  6. Escalation path
```

### Step 8: Implement Maintenance Windows
Define policy for silencing alerts during planned operations.

```
- Pre-approved maintenance window: silence P2/P3 alerts automatically.
- Post notification in on-call channel before starting.
- Maximum window: 4 hours (extend only with manager approval).
- Auto-expire: alerts resume when window ends.
- Exception: P0 alerts never silenced during maintenance.
```

### Step 9: Monitor and Improve
Track alert health metrics and implement improvements.

```
- Alert volume per severity per service (target: < 5 P0/month per service).
- Time-to-acknowledge per severity (target: < 5 min P0).
- False positive rate (target: < 20%).
- MTTA (mean time to acknowledge) per team.
- MTTR (mean time to resolve) per alert type.
```

## Common Pitfalls

1. **Alert fatigue from oversensitive thresholds**: Start conservative and tighten gradually.
2. **Cascading alerts without grouping**: One root cause fires 20 related alerts. Use alert grouping and inhibition rules.
3. **Missing runbooks**: Teams waste time diagnosing without documented procedures.
4. **P0 alerts for non-urgent issues**: Devalues severity system. Reserve P0 for actual critical failures.
5. **Noisy infrastructure alerts**: CPU spikes that self-resolve after minutes add noise. Use longer `for:` durations.
6. **Thresholds never reviewed**: Six-month-old thresholds are irrelevant for growing systems.
7. **Missing `for:` duration**: Single data point flaps cause false alerts.
8. **Ignoring cardinality**: Labels with unbounded values (user_id, request_id) break Prometheus.
9. **Alerting on symptoms, not causes**: Alert on high latency, not on high CPU that causes high latency.
10. **No alert on silence**: A silent alert system may mean monitoring is broken. Set up Deadman's switch.

## Best Practices

- Every alert must have a runbook linked in its annotation.
- Use `for:` duration equal to at least 2-3 scrape intervals.
- Group related alerts into a single notification to reduce noise.
- Define severity by impact, not by metric type.
- Label every alert with team, service, environment, and severity.
- Test alerts in staging before deploying to production.
- Implement Deadman's switch: alert if no data received for expected interval.
- Review alert rules during monthly SRE retrospectives.
- Track and trend alert volume by service.
- Rotate on-call frequently to reduce burnout.

## Compared With

| Approach | Strengths | Weaknesses |
|---|---|---|
| RED method (this skill) | Covers user-facing signals, simple | Misses infrastructure saturation |
| USE method (this skill) | Covers resource health | Needs RED for full picture |
| Four golden signals | Complete coverage (RED + USE) | More alerts to manage |
| Single metric alerts | Simple to implement | Misses composite conditions |
| Anomaly detection | Catches unknown unknowns | High false positive rate, complex setup |
| SLO-based alerting | Business-aligned | Requires SLO definition effort |
| Log-based alerting | Deep context | High volume, slow |
| Tracing-based alerting | Precise root cause | High overhead, sampling tradeoff |

## Templates and Tools

### Alert Rule Template (Prometheus)
```yaml
# Template for creating new alert rules
alert: {{ALERT_NAME}}
expr: {{PROMQL_EXPRESSION}}
for: {{DURATION}}
labels:
  severity: {{P0|P1|P2|P3}}
  team: {{TEAM_NAME}}
  service: {{SERVICE_NAME}}
annotations:
  summary: "{{BRIEF_DESCRIPTION}}"
  description: "{{DETAILED_DESCRIPTION}}"
  runbook: "https://runbooks.team.com/{{ALERT_NAME}}"
```

### Alertmanager Configuration Template
```yaml
route:
  receiver: "default"
  routes:
    - match:
        severity: "P0"
      receiver: "pagerduty-critical"
      repeat_interval: 5m
    - match:
        severity: "P1"
      receiver: "pagerduty-high"
      repeat_interval: 30m
    - match:
        severity: "P2"
      receiver: "slack-warnings"
      repeat_interval: 4h

receivers:
  - name: "pagerduty-critical"
    pagerduty_configs:
      - routing_key: "{{PAGERDUTY_KEY}}"
        severity: "critical"
  - name: "slack-warnings"
    slack_configs:
      - channel: "#alerts"
        title: "{{ .GroupLabels.alertname }}"
```

### Runbook Template
```markdown
# Runbook: {{alert_name}}

## Severity
{{P0|P1|P2|P3}}

## Symptoms
- User impact description
- Observable behavior

## Check
1. {{command or URL}}
2. {{metric to verify}}
3. {{log source to check}}

## Possible Causes (ordered by likelihood)
1. {{cause 1}} -- check {{command}}
2. {{cause 2}} -- check {{command}}

## Resolution
1. {{step 1}}
2. {{step 2}}

## Verification
- {{how to confirm fix worked}}

## Escalation
- {{who to contact if unresolved}}
```

## Rules
- Every alert must be actionable -- if no action can be taken, it is a dashboard metric, not an alert.
- No alert without a runbook -- every alert routes to a document explaining diagnosis and fix.
- No duplicate alerts -- group related alerts and suppress cascade alerts.
- Require minimum `for:` duration before firing to prevent flapping.
- Review and adjust thresholds monthly as part of seasonal tuning.
- Scheduled maintenance periods must automatically silence alerts.
- Alert labels must have bounded cardinality (<100 values per label).
- P0 alerts go to phone + Slack + PagerDuty with immediate escalation.
- Severity is defined by user impact, not by metric type.
- Every alert must have a team label for ownership.
- Alerts must be tested in staging before production deployment.
- Deadman's switch alert for metric pipelines that stop producing data.
- No alert without a clearly documented owner.
- Acknowledge alert within SLA before investigating root cause.
- Escalate if first responder does not acknowledge within SLA window.
- Monthly alert review as part of incident management improvement.
- Auto-resolve alerts when condition clears (unless configured otherwise).
- Distinguish between warning (potential issue) and critical (active problem).
- Alert routing must consider time of day and day of week.
- On-call shift handover includes alert status review.

## References
  - references/alert-rules-catalog.md -- Alert Rules Catalog
  - references/alert-rules-templates.md -- Alert Rules Templates
  - references/alerting-advanced.md -- Alerting Advanced Topics
  - references/alerting-fundamentals.md -- Alerting Fundamentals
  - references/escalation-policies.md -- Escalation Policies
  - references/notification-routing.md -- Notification Routing Reference
  - references/alerting-rule-design.md -- Alert Rule Design Patterns
  - references/alerting-oncall-rotation.md -- On-Call Rotation Design

## Handoff
Hand off to `devops/monitoring/SKILL.md` for monitoring stack setup.
Hand off to `management/team-rules/SKILL.md` for on-call schedule and incident response.
