# Monitoring Alerting and On-Call

## Alert Design Principles
Alert on symptoms not causes: user-facing impact over internal metrics. High signal-to-noise: every alert requires human action. Avoid alert fatigue: only alert when immediate action needed. Runbook requirement: every alert has associated runbook. Pager load: < 2 alerts per on-call shift per day.

## Alert Severity Levels
P0 (Critical): service down, data loss, security breach. Immediate page, 5-minute SLA. P1 (High): degraded performance, partial outage. Page, 15-minute SLA. P2 (Medium): non-critical feature broken. Business hours follow-up, 1-hour SLA. P3 (Low): cosmetic issue, enhancement. Next business day. P4 (Info): informational. No action required.

## Prometheus Alerting Rules
Record rules for derived metrics before alerting. Using aggregation: sum(rate(http_requests_total[5m])) by (service). Alert on error budget burn rate: 2% in 1h, 5% in 6h. Multi-window multi-burn-rate alerts for accuracy. Alert labels: severity, team, service, runbook URL.

## Alert Routing and Escalation
Route by: severity, team, time of day, service ownership. Primary on-call: receives all pages. Secondary on-call: backup if primary does not acknowledge. Escalation: secondary → engineering manager → director. Out-of-hours routing: stricter conditions for paging.

## Notification Channels
PagerDuty/OpsGenie: on-call scheduling, escalation, push notification. Slack: low-severity alerts and informational messages. Email: daily/weekly reports. Webhook: automated incident creation (Jira, ServiceNow). SMS/phone: last resort for critical alerts.

## Silence and Maintenance
Planned maintenance: silence alerts for expected events. Silence conditions: matchers for labels, duration, creator. Embedded silences in deploy tooling for deployment windows. Regular review of active silences. Automatically expire silences (no indefinite).

## References
- monitoring-fundamentals.md -- Fundamentals
- prometheus-setup.md -- Prometheus
- grafana-dashboards.md -- Grafana
- loki-setup.md -- Loki
- elk-setup.md -- ELK Stack
