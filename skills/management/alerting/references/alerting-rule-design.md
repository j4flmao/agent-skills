# Alert Rule Design

## Purpose
Provide comprehensive patterns and guidance for designing effective alert rules. Covers PromQL expression design, threshold calculation, alert grouping, inhibition, aggregation rules, and multi-signal composite alerting strategies.

## Table of Contents
1. [Alert Rule Anatomy](#alert-rule-anatomy)
2. [PromQL Expression Design](#promql-expression-design)
3. [Threshold Calculation Methods](#threshold-calculation-methods)
4. [Alert Grouping and Aggregation](#alert-grouping-and-aggregation)
5. [Inhibition and Silencing](#inhibition-and-silencing)
6. [Composite and Multi-Signal Alerts](#composite-and-multi-signal-alerts)
7. [SLO-Based Alerting](#slo-based-alerting)
8. [Seasonal and Dynamic Thresholds](#seasonal-and-dynamic-thresholds)
9. [Alert Testing and Validation](#alert-testing-and-validation)
10. [Alert Lifecycle Management](#alert-lifecycle-management)
11. [Platform-Specific Patterns](#platform-specific-patterns)

---

## Alert Rule Anatomy

### Prometheus Alert Rule Structure

```yaml
alert: <AlertName>
expr: <PromQL expression>
for: <duration>
labels:
  severity: <P0|P1|P2|P3>
  team: <team-name>
  service: <service-name>
  environment: <production|staging>
annotations:
  summary: "Brief description"
  description: "Detailed description with template variables"
  runbook: "URL to runbook"
  dashboard: "URL to dashboard"
```

### Required Fields

| Field | Always Required | Purpose |
|---|---|---|
| alert | Yes | Unique identifier |
| expr | Yes | Detection logic |
| for | Yes | Duration before firing |
| labels.severity | Yes | Response priority |
| labels.team | Yes | Ownership |
| annotations.summary | Yes | Quick understanding |
| annotations.runbook | Strongly recommended | Resolution path |

### Template Variables

Use Go template syntax to make alerts self-describing:

```yaml
annotations:
  summary: "High error rate on {{ $labels.service }}"
  description: |
    Service {{ $labels.service }} in {{ $labels.environment }}
    has error rate {{ $value | humanizePercentage }} on instance {{ $labels.instance }}
  runbook: "https://runbook.example.com/alerts/{{ $labels.alertname }}"
```

### Label Naming Conventions

```
Standard labels:
  severity: P0, P1, P2, P3
  team: platform-infra, billing, search
  service: service-name
  environment: production, staging, dev
  region: us-east-1, eu-west-2
  datacenter: dc1, dc2

Cardinality warning:
  Avoid high-cardinality labels:
    user_id, request_id, session_id, ip_address, email
  These cause unbounded metric growth and degrade Prometheus performance.

Acceptable cardinality:
    status_code (2xx, 3xx, 4xx, 5xx)
    method (GET, POST, PUT, DELETE)
    endpoint (/api/users, /api/orders)
```

---

## PromQL Expression Design

### Rate vs Increase

```
rate(counter[5m]) - per-second average rate over 5-minute window
  Use for: comparing metrics across different time ranges
  Example: rate(http_requests_total[5m]) > 100

increase(counter[5m]) - total increase over 5-minute window
  Use for: detecting events that happened in a window
  Example: increase(http_requests_total[5m]) > 0
```

### Quantile Calculation

```yaml
# p99 latency alert
alert: HighLatencyP99
expr: |
  histogram_quantile(0.99,
    rate(http_request_duration_seconds_bucket[5m])
  ) > 2
for: 5m
```

### Ratio and Percentage

```yaml
# Error rate as percentage
expr: |
  (
    sum(rate(http_requests_total{status=~"5.."}[5m]))
    /
    sum(rate(http_requests_total[5m]))
  ) > 0.05
```

### Absent Series Detection

```yaml
# Deadman's switch
alert: InstanceDown
expr: up == 0
for: 1m

# Metric pipeline dead
alert: NoMetricsForService
expr: absent(http_requests_total{service="payment"})
for: 5m
```

### Predictions

```yaml
# Predict disk fill
alert: DiskWillFillIn24h
expr: |
  predict_linear(node_filesystem_free_bytes[6h], 86400) < 0
for: 10m
```

### Multiple Conditions (AND)

```yaml
# Both conditions must be true
alert: HighTrafficAndErrors
expr: |
  rate(http_requests_total[5m]) > 1000
  and
  rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
for: 5m
```

---

## Threshold Calculation Methods

### Static Thresholds

Simple fixed values:

```
CPU usage > 90%
Memory > 90%
Latency > 2s
Error rate > 5%
```

**When to use:** Steady-state systems with predictable baselines.
**Risk:** Needs manual adjustment as system evolves.

### Standard Deviation Baseline

Calculate threshold from historical data:

```
threshold = mean + (2.5 * std_dev)
```

**When to use:** Systems with stable but unique baselines.
**Risk:** Requires 2+ weeks of data for baseline calculation.

### Seasonal Baseline

Different thresholds for different times:

```
Peak hours (10:00-12:00, 14:00-16:00): baseline * 1.5
Off-peak (22:00-06:00): baseline * 0.5
Weekend: baseline * 0.7
```

**When to use:** E-commerce, SaaS with clear traffic patterns.
**Risk:** May miss unusual activity during low-traffic periods.

### Burn Rate Based

Derived from SLO error budget:

```
Burn rate = actual_error_rate / SLO_error_rate
Alert when burn rate > 10x for 1 hour (fast burn)
Alert when burn rate > 2x for 6 hours (slow burn)
```

**When to use:** SLO-driven organizations.
**Risk:** Requires well-defined SLOs and mature monitoring.

### Percentile-Based

Alert on outliers:

```
p95 latency > 1s for 5 min -> P2
p99 latency > 2s for 5 min -> P1
p999 latency > 10s for 1 min -> P0
```

**When to use:** Systems where average masks problems.
**Risk:** p99/p999 can be noisy; use smooth windows.

---

## Alert Grouping and Aggregation

### Grouping by Common Cause

```yaml
# Instead of one alert per host:
alert: HostDown  # One alert for all hosts down in same rack
expr: |
  count(up{rack="rack-1"} == 0) > 3
```

### Aggregation Rules

```yaml
# Reduce cardinality by aggregating
alert: ServiceHighErrorRate
expr: |
  (
    sum by (service) (rate(http_requests_total{status=~"5.."}[5m]))
    /
    sum by (service) (rate(http_requests_total[5m]))
  ) > 0.05
```

### Alertmanager Grouping

```yaml
route:
  group_by: ['service', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
```

**Grouping strategy:**
- Group by root cause label (e.g., service, availability zone).
- Group notifications for same incident.
- Use `group_wait` to buffer related alerts.
- Use `repeat_interval` to avoid notification spam.

### Aggregation Granularity

| Level | Group By | Example |
|---|---|---|
| Service | service | Payment service errors |
| Cluster | cluster, region | us-east-1 infrastructure |
| Team | team | Platform team owned services |
| Global | severity | All P0 alerts |

---

## Inhibition and Silencing

### Inhibition Rules

Alertmanager inhibition suppresses lower-severity alerts when a higher-severity alert fires for the same root cause.

```yaml
inhibit_rules:
  - source_match:
      severity: 'P0'
    target_match:
      severity: 'P2|P3'
    equal: ['service', 'environment']

  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning|info'
    equal: ['alertname', 'instance']
```

### When to Inhibit

```
Source Alert              Inhibits
Host Down                 All alerts from that host
Region Down               All alerts in that region
Service Down              All alerts from that service
Database Unreachable      All application alerts depending on DB
Kubernetes Node Down      All pod-related alerts on that node
```

### When NOT to Inhibit

```
- Different services in different tiers (don't inhibit unrelated systems).
- P0 and P1 from different root causes (don't mask parallel incidents).
- Business alerts behind infrastructure alerts (business impact matters independently).
```

### Silence Management

```yaml
# Maintenance window silence
apiVersion: v2
silences:
  - comment: "Scheduled DB migration"
    matchers:
      - name: alertname
        value: "HighCpuUsage|DiskSpaceRunningOut"
        isRegex: true
      - name: environment
        value: "production"
    startsAt: "2025-01-15T02:00:00Z"
    endsAt: "2025-01-15T06:00:00Z"
    createdBy: "jane.doe@company.com"
```

### Silence Policy Rules

- All silences must have an owner and expiration timestamp.
- Maximum silence duration: 4 hours (extendable with manager approval).
- P0 alerts cannot be silenced (except during approved maintenance).
- Silences are audited weekly for abuse or forgotten maintenance windows.
- Automated silences from deployment pipelines post to on-call channel.

---

## Composite and Multi-Signal Alerts

### Two-Signal Confirmation

Require two independent signals before alerting:

```yaml
alert: PotentialDegradation
expr: |
  rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
  and
  histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) > 1
```

**Why:** Reduces false positives. If both errors and latency are up, it is likely real.

### Multi-Condition Severity Escalation

```yaml
# Warning at 2%, Critical at 5%
alert: HighErrorRateWarning
expr: rate(5xx) / rate(total) > 0.02
for: 5m
labels:
  severity: P2

alert: HighErrorRateCritical
expr: rate(5xx) / rate(total) > 0.05
for: 3m
labels:
  severity: P1
```

### Composite Health Check

```yaml
alert: ServiceDegraded
expr: |
  (
    rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.01
    or
    histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) > 0.5
    or
    rate(http_requests_total[5m]) < rate(http_requests_total[5m] offset 1h) * 0.5
  )
```

### Dependency-Aware Alerts

```yaml
# Don't alert on app errors if database is down
alert: AppErrorsIgnoringDB
expr: |
  rate(app_errors_total[5m]) > 0
  unless
  on(service) db_down{service="primary-db"} == 1
```

---

## SLO-Based Alerting

### Burn Rate Structure

```yaml
# Fast burn: consuming error budget fast
alert: SLOFastBurn
expr: |
  (
    1 - (sum(rate(http_requests_total{status!~"5.."}[1h])) / sum(rate(http_requests_total[1h])))
  ) < 0.999  # 99.9% SLO
for: 5m
labels:
  severity: P1

# Slow burn: gradual error budget consumption
alert: SLOSlowBurn
expr: |
  (
    1 - (sum(rate(http_requests_total{status!~"5.."}[6h])) / sum(rate(http_requests_total[6h])))
  ) < 0.999
for: 30m
labels:
  severity: P2
```

### Multi-Window Burn Rate

Use multiple time windows to reduce false positives:

```yaml
alert: SLOViolation
expr: |
  (
    # Short window: high burn rate
    (
      1 - (sum(rate(http_requests_total{status!~"5.."}[1h])) / sum(rate(http_requests_total[1h])))
    ) < 0.99
  )
  and
  (
    # Long window: sustained burn
    (
      1 - (sum(rate(http_requests_total{status!~"5.."}[24h])) / sum(rate(http_requests_total[24h])))
    ) < 0.995
  )
```

### Budget Exhaustion Alerting

```yaml
# Alert when 50% of budget consumed
alert: ErrorBudgetHalfConsumed
expr: |
  (
    sum(rate(http_requests_total{status=~"5.."}[30d]))
    /
    sum(rate(http_requests_total[30d]))
  ) > (0.001 * 0.5)  # 0.1% SLO, 50% consumed
```

**SLO alerting window guidelines:**
| Alert Type | Window | Serves |
|---|---|---|
| Fast burn | 1 hour | Immediate attention |
| Slow burn | 6 hours | Early warning |
| Budget remaining | 30 days | Trend awareness |
| Budget exhausted | 30 days | Process escalation |

---

## Seasonal and Dynamic Thresholds

### Calendar-Based Thresholds

```yaml
# Higher thresholds during known high-traffic periods
alert: HighCPUCritical
expr: |
  node_cpu_seconds_total{mode="idle"} < 0.05
  and
  on(instance) (day_of_week != 6 and day_of_week != 7)  # Weekdays only
```

### Holiday and Event Scheduling

```
Maintain a calendar of expected high-traffic events:
- Black Friday: all thresholds increased 2x
- Product launches: specific service thresholds increased 3x
- Maintenance windows: silence non-critical alerts

Implementation: Label metrics with expected load profile.
Load profile changes trigger threshold adjustment automatically.
```

### Dynamic Threshold with Offset

```yaml
# Compare current value to same time last week
alert: TrafficAnomaly
expr: |
  rate(http_requests_total[5m])
  > rate(http_requests_total[5m] offset 1w) * 3
```

### Machine Learning Baselines

For advanced setups:
```
- Collect 4+ weeks of metric data.
- Train model to predict expected range per time window.
- Flag deviations outside 95% confidence interval.
- Automatically adjust for trends (gradual growth).
- Best for: long-running services with seasonal patterns.
```

---

## Alert Testing and Validation

### PromTool Validation Rules

```yaml
rule_files:
  - prometheus/rules/*.yml

evaluation_interval: 1m

tests:
  - interval: 1m
    input_series:
      - series: 'http_requests_total{service="test", status="200"}'
        values: '100+0x10 200+0x10'
      - series: 'http_requests_total{service="test", status="500"}'
        values: '0+0x10 5+0x10'

    alert_rule_test:
      - eval_time: 5m
        alertname: HighErrorRate
        exp_alerts: []  # Below threshold
      - eval_time: 15m
        alertname: HighErrorRate
        exp_alerts:
          - exp_labels:
              severity: P1
              service: test
            exp_annotations:
              summary: "High error rate on test"
```

### Testing Checklist

```
Before deploying a new alert rule:

1. Expression returns valid results in Prometheus console.
2. `for:` duration is at least 2-3 scrape intervals.
3. Labels have bounded cardinality.
4. Runbook exists and is linked.
5. Severity is appropriate for impact.
6. False positive rate estimated from historical data.
7. Alert does not duplicate existing rules.
8. Notification routing configured for severity.
9. On-call team informed of new alert.
10. Test in staging environment first.
```

### Common Expression Errors

```
Error: Rate of non-counter metric
  Avoid: rate(memory_usage_bytes[5m]) -- memory is a gauge
  Use:   delta(memory_usage_bytes[5m]) for gauge change

Error: Missing aggregation
  Avoid: rate(http_requests_total[5m]) > 100 (returns series per label combo)
  Use:   sum(rate(http_requests_total[5m])) > 100

Error: Comparing rates with different windows
  Avoid: rate(errors[5m]) / rate(total[1m])
  Use:   rate(errors[5m]) / rate(total[5m])

Error: Unbounded cardinality
  Avoid: label with user_id, request_id
  Use:   aggregate before alerting
```

---

## Alert Lifecycle Management

### Lifecycle Stages

```
1. Design  ->  2. Review   ->   3. Test   ->   4. Deploy   ->   5. Monitor   ->   6. Tune

Design:  Define expression, threshold, severity
Review:  Peer review by team, check for duplicates
Test:    Unit test with promtool, staging deployment
Deploy:  Commit to config repo, deploy via GitOps
Monitor: Track alert rate, false positive rate
Tune:    Adjust thresholds based on observed behavior
```

### Monthly Review Process

```
Review for each alert:
  1. Firing count (last 30 days)
  2. False positive rate (actionable vs noise)
  3. Average acknowledge time
  4. Runbook usage (was runbook followed?)
  5. Still relevant? (service may have been decommissioned)

Actions:
  - Remove alerts that never fire (false negative).
  - Tune thresholds for alerts with > 30% false positive rate.
  - Escalate alerts with long acknowledge times.
  - Archive alerts for decommissioned services.
```

### Deprecation

When an alert rule is no longer needed:

```
1. Mark with deprecation comment in YAML.
2. Set `for:` to 1h (reduce firing rate) or comment out.
3. Notify team via Slack.
4. Remove rule after 2 full monitoring cycles.
5. Remove associated runbook (or redirect to replacement).
6. Remove from dashboard references.
```

---

## Platform-Specific Patterns

### Datadog Monitor Patterns

```yaml
# Datadog alert rule template
alert_name: "High error rate on {{service.name}}"
type: "query alert"
query: |
  avg(last_5m):(
    (sum:http_requests.errors{*}.as_rate() / sum:http_requests.total{*}.as_rate())
    * 100
  ) > 5
message: |
  {{#is_alert}}
  Error rate {{value}}% on {{service.name}}
  Runbook: https://runbook.example.com/alerts/high-error-rate
  {{/is_alert}}
```

### Grafana Alert Rule

```yaml
# Grafana managed alert rule
apiVersion: grafana/v1
kind: AlertRule
metadata:
  name: "High p99 Latency"
spec:
  condition: |
    avg() of (histogram_quantile(0.99,
      rate(http_request_duration_seconds_bucket[5m])
    )) > 2
  noDataState: Alerting
  execErrState: Alerting
  for: 5m
  interval: 1m
```

### CloudWatch Alarm

```yaml
# CloudWatch alarm for Lambda errors
Type: AWS::CloudWatch::Alarm
Properties:
  AlarmName: lambda-high-error-rate
  Namespace: AWS/Lambda
  MetricName: Errors
  Statistic: Sum
  Period: 300
  EvaluationPeriods: 2
  Threshold: 5
  ComparisonOperator: GreaterThanThreshold
  AlarmActions:
    - !Ref SNSTopic
```

### New Relic NRQL Alert

```sql
# NRQL alert condition
SELECT percentage(count(*), WHERE error IS true)
FROM Transaction
WHERE appName = 'my-app'
SINCE 5 minutes ago
LIMIT MAX
```

## Handoff
`alerting-oncall-rotation.md` for on-call rotation design.
`../../../management/team-rules/` for team-level incident response procedures.
