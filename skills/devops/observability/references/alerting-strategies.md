# Alerting Strategies

Effective alerting detects real problems without overwhelming teams with noise.

## Alert Severity (P0–P3)

| Severity | Response Time | Meaning | Example |
|----------|---------------|---------|---------|
| P0 | < 15 minutes | Service down, data loss, security breach | All instances crashlooping |
| P1 | < 1 hour | Degraded performance, partial outage | p99 latency > 1s |
| P2 | < 1 day | Non-critical feature broken | Search autocomplete down |
| P3 | Next sprint | Cosmetic, minor issues | UI button misaligned |

### Alert Definition

```yaml
groups:
  - name: service-health
    rules:
      - alert: ServiceDown
        expr: up{job="myapp"} == 0
        for: 1m
        labels:
          severity: p0
          team: platform
        annotations:
          summary: "{{ $labels.job }} is down"
          description: "{{ $labels.instance }} has been unreachable for >1m"

      - alert: HighLatency
        expr: |
          histogram_quantile(0.99, rate(http_request_duration_seconds_bucket{job="myapp"}[5m])) > 1
        for: 5m
        labels:
          severity: p1
          team: platform
        annotations:
          summary: "High p99 latency on {{ $labels.job }}"
          description: "p99 latency is {{ $value }}s (threshold: 1s)"

      - alert: ErrorBudgetBurn
        expr: |
          (1 - (
            sum(rate(http_requests_total{job="myapp",status=~"5.."}[30d])) /
            sum(rate(http_requests_total{job="myapp"}[30d]))
          )) < 0.999
        labels:
          severity: p1
          team: platform
        annotations:
          summary: "Error budget almost depleted"
```

## Silencing

### Prometheus Alertmanager Silences

```yaml
# Silence during maintenance
- target:
    matchers:
      - name: severity
        value: "p[012]"
      - name: job
        value: "myapp"
    startsAt: "2026-05-25T02:00:00Z"
    endsAt: "2026-05-25T06:00:00Z"
    createdBy: "devops-bot"
    comment: "Scheduled database migration"
```

### Grafana Silence

```bash
# Create silence via API
curl -X POST "http://grafana:3000/api/alertmanager/grafana/api/v2/silences" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "comment": "Deployment window",
    "createdBy": "ci-bot",
    "endsAt": "2026-05-25T06:00:00Z",
    "matchers": [
      {"name": "alertname", "value": "HighLatency", "isRegex": false},
      {"name": "severity", "value": "p[12]", "isRegex": true}
    ]
  }'
```

## Aggregation

Reduce alert noise by grouping related alerts:

```yaml
# alertmanager.yml
route:
  receiver: team-platform
  group_by: [alertname, cluster, service]
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h

receivers:
  - name: team-platform
    slack_configs:
      - channel: "#alerts"
        title: '{{ .GroupLabels.alertname }} ({{ .GroupLabels.service }})'
        text: '{{ .CommonAnnotations.description }}'
        send_resolved: true
```

## Flapping Detection

Detect alerts that repeatedly fire and resolve:

```yaml
groups:
  - name: flapping
    rules:
      - alert: FlappingDetected
        expr: |
          changes(up{job="myapp"}[30m]) > 5
        labels:
          severity: warning
        annotations:
          summary: "{{ $labels.instance }} is flapping"
```

### Prometheus `alert_relabel_configs`

```yaml
# Drop flapping alerts
alert_relabel_configs:
  - source_labels: [alertname]
    regex: 'FlappingDetected'
    action: drop
```

## Alert Fatigue Reduction

### Multi-Window Multi-Burn-Rate (MWMBR)

```yaml
rules:
  - alert: CriticalErrorBudgetBurn
    expr: |
      (
        rate(http_requests_total{job="myapp",status=~"5.."}[1h])
        /
        rate(http_requests_total{job="myapp"}[1h])
      ) > 0.001  # 0.1% error rate
      and
      (
        rate(http_requests_total{job="myapp",status=~"5.."}[5m])
        /
        rate(http_requests_total{job="myapp"}[5m])
      ) > 0.01  # 1% error rate short window
    for: 2m
    labels:
      severity: p0
    annotations:
      summary: "High error rate on {{ $labels.job }}"
```

## On-Call Integration

### PagerDuty

```yaml
receivers:
  - name: on-call
    pagerduty_configs:
      - routing_key: <pagerduty-key>
        severity: critical
        description: '{{ .GroupLabels.alertname }}'
        details:
          firing: '{{ .Alerts.Firing | len }}'
          resolved: '{{ .Alerts.Resolved | len }}'
```

### Opsgenie

```yaml
receivers:
  - name: on-call
    opsgenie_configs:
      - api_key: <opsgenie-key>
        priority: P1
        responders:
          - type: team
            name: platform-engineering
        tags:
          - production
          - critical
```

### Slack Escalation

```yaml
receivers:
  - name: team-platform
    slack_configs:
      - channel: "#alerts-p0"
        title: '🚨 P0: {{ .GroupLabels.alertname }}'
        text: >-
          {{ range .Alerts }}
            • {{ .Annotations.description }}
          {{ end }}
        actions:
          - type: button
            text: 'Acknowledge'
            url: 'https://ops.example.com/ack/{{ .GroupLabels.alertname }}'
          - type: button
            text: 'Runbook'
            url: 'https://wiki.example.com/runbooks/{{ .GroupLabels.alertname }}'
```

## Alert Testing

```yaml
# Unit test alert rules
rule_files:
  - alerts.yaml

evaluation_interval: 1m

tests:
  - interval: 1m
    input_series:
      - series: up{job="myapp",instance="localhost:8080"}
        values: "1x10 0x5 1x10"

    alert_rule_test:
      - eval_time: 12m
        alertname: ServiceDown
        exp_alerts:
          - exp_labels:
              severity: p0
              team: platform
            exp_annotations:
              summary: "myapp is down"
```

Alert on symptoms (user impact), not causes. Use severity to prioritize response and aggregation to reduce noise.
