# KPI Dashboard

## Dashboard Structure

| Section | Metrics | Refresh | Audience |
|---------|---------|---------|----------|
| Executive | Revenue, NRR, NPS, uptime | Daily | Leadership |
| Engineering | Deploy frequency, MTTR, change fail rate | Per deployment | Engineering |
| Product | Activation, retention, engagement | Daily | Product team |
| Support | Ticket volume, CSAT, FCR | Daily | Support team |
| Infrastructure | CPU, memory, latency, error rate | Real-time | Ops team |

## Engineering KPIs

| KPI | Definition | Target | Leading/Lagging |
|-----|------------|--------|----------------|
| Deploy Frequency | Deployments to production per week | Daily or more | Leading |
| Lead Time for Changes | Time from commit to production | < 1 hour | Leading |
| Change Failure Rate | % of deployments causing failure | < 5% | Lagging |
| Mean Time to Recovery (MTTR) | Time to restore service after incident | < 1 hour | Lagging |
| Availability | Uptime percentage | 99.9%+ | Lagging |
| P95 Latency | 95th percentile response time | < 500ms | Lagging |
| Error Rate | % of failed requests | < 0.1% | Leading |
| Bug Reopen Rate | % of bugs reopened after fix | < 5% | Lagging |

## Product KPIs

| KPI | Definition | Target | Leading/Lagging |
|-----|------------|--------|----------------|
| Daily Active Users (DAU) | Unique users per day | +10% QoQ | Lagging |
| Customer Acquisition Cost (CAC) | Cost to acquire one customer | < $100 | Lagging |
| Lifetime Value (LTV) | Average revenue per customer | > 3× CAC | Lagging |
| Activation Rate | % of signups reaching core action | > 60% | Leading |
| D1/D7/D30 Retention | % returning after day 1/7/30 | D1 > 60%, D7 > 40%, D30 > 30% | Lagging |
| Net Promoter Score (NPS) | Willingness to recommend | > 50 | Lagging |
| Feature Adoption Rate | % of users using new feature within 30 days | > 30% | Leading |
| Monthly Churn Rate | % of customers lost per month | < 3% | Lagging |

## KPI Dashboard Template

```yaml
dashboard:
  name: "Engineering Health"
  refresh: "per deployment"

sections:
  - title: "Velocity"
    metrics:
      - name: "Deploy Frequency"
        value: "8/week"
        target: "≥5/week"
        status: "green"
      - name: "Lead Time"
        value: "45 min"
        target: "<60 min"
        status: "green"
      - name: "PR Merge Time (p50)"
        value: "3.2h"
        target: "<4h"
        status: "green"

  - title: "Quality"
    metrics:
      - name: "Change Failure Rate"
        value: "3.2%"
        target: "<5%"
        status: "green"
      - name: "Test Coverage"
        value: "82%"
        target: "≥80%"
        status: "green"
      - name: "Bug Reopen Rate"
        value: "6%"
        target: "<5%"
        status: "red"

  - title: "Reliability"
    metrics:
      - name: "Availability (30d)"
        value: "99.95%"
        target: "≥99.9%"
        status: "green"
      - name: "P95 Latency"
        value: "320ms"
        target: "<500ms"
        status: "green"
      - name: "MTTR"
        value: "45 min"
        target: "<60 min"
        status: "green"
```

## KPI Health Status

| Status | Definition | Action |
|--------|------------|--------|
| Green | Meeting or exceeding target | Monitor |
| Amber | Within 10-20% of target | Investigate, create improvement plan |
| Red | Below target by >20% | Escalate, prioritize fix |

## KPI Review Cadence

- Daily: automated dashboard with alert thresholds
- Weekly: team standup review of amber/red metrics
- Monthly: detailed review of all KPIs with trend analysis
- Quarterly: KPI target recalibration aligned with OKR setting
- Annual: KPI framework review — retire stale metrics, add new ones

## Dashboard Implementation

### Grafana
```json
{
  "title": "Engineering KPIs",
  "panels": [
    { "type": "stat", "title": "Deploy Frequency",
      "targets": [{ "expr": "count(deploy_total[7d])" }] },
    { "type": "gauge", "title": "Latency P95",
      "thresholds": [200, 500] }
  ]
}
```

### Datadog
```
https://app.datadoghq.com/dashboard/{id} — Engineering Health Dashboard
```

### Build Your Own
Use a KPI tracking spreadsheet or tool (Geckoboard, Klipfolio, or simple SQL + BI tool).
Include: KPI name, current value, target, status, trend arrow, owner, last updated.
