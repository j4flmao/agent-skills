# SLO Framework

## SLO Definition Structure

```
SLO = Service Level Objective
SLI = Service Level Indicator (the actual measurement)
Error Budget = 100% - SLO target (allowable downtime)

SLO Anatomy:
  ┌─────────────────────────────────────────┐
  │ SLO: Orders table freshness             │
  │ SLI: % of freshness checks passing      │
  │ Target: 99.9% over 30d window           │
  │ Error Budget: 0.1% = ~43 min/month      │
  │ Burn Rate: how fast budget is consumed  │
  └─────────────────────────────────────────┘
```

## SLO Spec (Prometheus + Sloth)

```yaml
apiVersion: sloth/v1
kind: PrometheusServiceLevel
metadata:
  name: data-platform-slos
  namespace: observability
spec:
  service: data-platform
  labels:
    team: data-infrastructure
    repo: data-observability
  slos:
    - name: freshness-critical
      objective: 99.9
      description: "Critical datasets loaded within expected interval"
      sli:
        events:
          errorQuery: |
            sum(rate(data_freshness_status{status="breach",tier="critical"}[30d]))
          totalQuery: |
            sum(rate(data_freshness_checks{tier="critical"}[30d]))
      alerting:
        pageAlert:
          name: FreshnessCriticalSLOPage
          labels:
            severity: page
            slo: critical-freshness
          annotations:
            title: "Freshness SLO breach (critical datasets)"
        ticketAlert:
          name: FreshnessCriticalBurnRate
          labels:
            severity: ticket
          annotations:
            title: "Freshness SLO burn rate > threshold (critical)"

    - name: volume-stability
      objective: 99.0
      description: "Row count within expected range"
      sli:
        events:
          errorQuery: |
            sum(rate(data_volume_anomaly{severity="high"}[30d]))
          totalQuery: |
            sum(rate(data_volume_checks[30d]))
      alerting:
        ticketAlert:
          name: VolumeStabilityBurnRate
          labels:
            severity: ticket

    - name: schema-compliance
      objective: 100.0
      description: "No unexpected schema changes in critical datasets"
      sli:
        events:
          errorQuery: |
            sum(rate(data_schema_breach{tier="critical"}[30d]))
          totalQuery: |
            sum(rate(data_schema_checks{tier="critical"}[30d]))
```

## Error Budget Policy

```yaml
error_budget_policy:
  calculation:
    window: 30d
    method: "successful_checks / total_checks * 100"
  consumption_tracking:
    - slo_target: 99.9
      budget_per_month: "43m 12s"
      alert_at_50pct: "21m 36s consumed"
      alert_at_80pct: "34m 34s consumed"
      freeze_at_100pct: "Deploy freeze — no releases without council approval"
    - slo_target: 99.0
      budget_per_month: "7h 12m"
      alert_at_50pct: "3h 36m consumed"
      freeze_at_100pct: "Code review required for all pipeline changes"
    - slo_target: 95.0
      budget_per_month: "36h"
      alert_at_80pct: "28h 48m consumed"
      freeze_at_100pct: "Escalation to domain lead"
```

## Multi-Window Burn Rate Alerts

```yaml
# PrometheusRule for burn rate
groups:
  - name: data-slo-burn-rate
    rules:
      - alert: CriticalFreshnessPage
        expr: |
          (1 - rate(data_freshness_status{status="pass",tier="critical"}[1h]))
            / (1 - 0.999) > 14.4
        for: 5m
        labels:
          severity: page
        annotations:
          summary: "Critical freshness burning budget at 14.4x rate (1h window)"

      - alert: CriticalFreshnessTicket
        expr: |
          (1 - rate(data_freshness_status{status="pass",tier="critical"}[6h]))
            / (1 - 0.999) > 6
        for: 15m
        labels:
          severity: ticket
        annotations:
          summary: "Critical freshness burning budget at 6x rate (6h window)"
```

## SLO Reporting (Monthly)

```sql
WITH monthly_slo AS (
  SELECT
    table_name,
    tier,
    COUNT(*) AS total_checks,
    SUM(CASE WHEN status = 'pass' THEN 1 ELSE 0 END) AS passing_checks,
    ROUND(SUM(CASE WHEN status = 'pass' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) AS sli_pct
  FROM data_observability.freshness_checks
  WHERE check_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
    AND check_date < DATE_TRUNC('month', CURRENT_DATE)
  GROUP BY table_name, tier
)
SELECT
  tier,
  COUNT(*) AS tables,
  ROUND(AVG(sli_pct), 2) AS avg_sli,
  COUNT(CASE WHEN sli_pct >= 99.9 THEN 1 END) AS meeting_critical_slo,
  COUNT(CASE WHEN sli_pct < 99.0 THEN 1 END) AS breaching_slo,
  ROUND(SUM(100.0 - sli_pct) / 100, 2) AS total_error_budget_consumed_pct
FROM monthly_slo
GROUP BY tier
ORDER BY tier;
```
