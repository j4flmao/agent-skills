# Incident Metrics

## MTTD (Mean Time to Detect)

| Severity | Target | Calculation | Sources |
|----------|--------|-------------|---------|
| SEV1 | < 5min | `detection_time - incident_start_time` | Prometheus AlertManager, synthetic checks, PagerDuty |
| SEV2 | < 15min | Same | Datadog, CloudWatch, user reports |
| SEV3 | < 1 business hour | Same | Support tickets, manual discovery |

## MTTR (Mean Time to Resolve)

| Severity | Target | Components |
|----------|--------|------------|
| SEV1 | < 1hr | Triage + Mitigation + Resolution |
| SEV2 | < 4hrs | Investigation + Fix + Verification |
| SEV3 | Next sprint | Bug fix + Testing + Deployment |

## MTBF (Mean Time Between Failures)

```promql
# Time between SEV1/2 incidents
(time() - last_incident_timestamp) / incident_count
```

Track weekly and monthly to measure reliability improvements.

## Dashboard Queries

```promql
# Monthly MTTD trend
avg by (month) (
  incident_detection_time_seconds{severity="SEV1"}
)

# Monthly MTTR trend
avg by (month) (
  incident_resolution_time_seconds{severity="SEV1"}
)

# Incident count by severity
count by (severity) (incident_events{status="resolved"})
```

## Improvement Targets

| Metric | Current | 3-Month Target | 6-Month Target |
|--------|---------|----------------|----------------|
| SEV1 MTTD | 8min | 5min | 3min |
| SEV1 MTTR | 90min | 60min | 45min |
| SEV2 MTTD | 20min | 15min | 10min |
| SEV2 MTTR | 6hr | 4hr | 3hr |
| MTBF (SEV1) | 14 days | 21 days | 30 days |
| Postmortem completion | 80% | 95% | 100% |

## Tracking Template

| Week | SEV1 Count | SEV1 MTTD | SEV1 MTTR | SEV2 Count | SEV2 MTTR | MTBF | Action Items Closed |
|------|-----------|-----------|-----------|-----------|-----------|------|-------------------|
| W1 | 2 | 6min | 80min | 5 | 5hr | 10d | 3/5 |
| W2 | 1 | 4min | 55min | 3 | 3.5hr | 17d | 4/4 |
| W3 | 0 | — | — | 4 | 4hr | — | 5/6 |

## Action Item Tracking

```yaml
action_items:
- id: INC-2024-001
  description: Add retry logic to payment service on 503
  owner: team-payments
  due: 2024-03-15
  status: in_progress
  incident: INC-2024-001
- id: INC-2024-002
  description: Increase HPA max replicas for checkout service
  owner: team-platform
  due: 2024-03-22
  status: completed
  incident: INC-2024-002
```

## Tool Integration

| Tool | Integration |
|------|------------|
| PagerDuty | Incident API for metadata, timeline, duration |
| OpsGenie | Alert tagging for SEV, closure API for resolution time |
| ServiceNow | CMDB CI mapping, incident correlation |
| Jira | Auto-create postmortem tickets, track action items |
| Datadog | Monitor -> Incident -> Postmortem workflow |
| Splunk | Query incident timeline from logs |
