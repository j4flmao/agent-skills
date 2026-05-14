# Notification Routing Reference

## By Severity

| Severity | Channel | On-Call | Escalation |
|---|---|---|---|
| **P0** | Phone + Slack @here + PagerDuty | Primary + Secondary | Engineering manager (15 min) |
| **P1** | Slack @channel + PagerDuty | Primary | Team lead (1 hr) |
| **P2** | Slack thread | — | — |
| **P3** | Dashboard | — | — |

## Prometheus Alertmanager Config

```yaml
route:
  receiver: default
  routes:
    - match:
        severity: P0
      receiver: pagerduty-critical
      repeat_interval: 5m
    - match:
        severity: P1
      receiver: slack-warning
      repeat_interval: 30m
    - match:
        severity: P2
      receiver: slack-info
      repeat_interval: 6h

receivers:
  - name: pagerduty-critical
    pagerduty_configs:
      - routing_key: "${PD_ROUTING_KEY}"
        severity: critical
  - name: slack-warning
    slack_configs:
      - channel: '#alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ .CommonAnnotations.summary }}'
```
