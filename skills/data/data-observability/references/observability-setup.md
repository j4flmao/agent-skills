# Data Observability Setup

## Monte Carlo Integration

### Python SDK (automated monitors)

```python
from montecarlo import MonteCarloClient

client = MonteCarloClient(
    api_key=os.environ["MC_API_KEY"],
    workspace_id="your-workspace"
)

# Create freshness monitor
client.create_monitor(
    name="freshness_snowflake_orders",
    monitor_type="freshness",
    table_urn="snowflake://analytics.fct_orders",
    config={
        "schedule_interval_hours": 1,
        "expected_freshness_seconds": 3600,
        "severity": "HIGH"
    }
)

# Create field health monitor (distribution)
client.create_field_monitor(
    name="distribution_total_amount",
    table_urn="snowflake://analytics.fct_orders",
    field_name="total_amount",
    monitor_type="distribution",
    config={
        "statistical_method": "z_score",
        "threshold": 3.0,
        "min_training_hours": 720
    }
)
```

### Slack Alert Integration

```yaml
notifications:
  - channel: "#data-alerts-critical"
    filters:
      severity: [CRITICAL, HIGH]
      tags: [pii, financial, customer-facing]
  - channel: "#data-alerts-info"
    filters:
      severity: [MEDIUM, LOW]
  - channel: "#data-daily-digest"
    schedule: daily 08:00
    content: summary
```

## Sifflet Integration

```yaml
# sifflet-monitors.yaml
monitors:
  - name: order_freshness
    datasource: snowflake_prod
    table: ANALYTICS.FCT_ORDERS
    type: FRESHNESS
    check_field: LAST_LOAD_TS
    expectation: WITHIN(3600)
    severity: HIGH

  - name: order_volume
    datasource: snowflake_prod
    table: ANALYTICS.FCT_ORDERS
    type: VOLUME
    check_field: row_count
    expectation: BETWEEN(50000, 200000)
    lookback: 30d
    severity: HIGH
```

## Bigeye Integration

```yaml
# bigeye-metrics.yaml
metrics:
  - name: fresh_data
    datasource: snowflake
    schema: ANALYTICS
    table: FCT_ORDERS
    metric_type: FRESHNESS
    schedule: HOURLY
    params:
      column: CREATED_AT
      sla_seconds: 3600

  - name: row_count
    datasource: snowflake
    schema: ANALYTICS
    table: FCT_ORDERS
    metric_type: ROW_COUNT
    schedule: HOURLY

slas:
  - name: critical_tables
    targets:
      - metric: fresh_data
        threshold: 99.9
        window: 30d
      - metric: row_count
        lower_bound: 50000
        upper_bound: 200000
```

## Open-Source Stack (Great Expectations + Elementary)

### Elementary Data

```yaml
# elementary/configuration.yaml
schema: elementary
anomaly_detector:
  detection_delay: 1
  sensitivity: normal  # low, normal, high
  backfill_days: 30
sources:
  - name: snowflake_prod
    database: PROD_DB
    schema: ANALYTICS
sinks:
  - name: slack
    type: slack
    webhook: ${SLACK_WEBHOOK_URL}
    channels:
      - name: alerts
        severity: error
      - name: reports
        severity: warn
```

### dbt Freshness Tests

```yaml
# dbt_project.yml
tests:
  +severity: warn  # default
sources:
  analytics:
    fct_orders:
      freshness:
        warn_after: { count: 25, period: hour }
        error_after: { count: 48, period: hour }
      loaded_at_field: created_at
```

## Incident Response Runbook

### SEV1 (Critical Data Outage)

```
1. Alert fires (PagerDuty → on-call engineer)
2. Acknowledge within 5 min
3. Check dashboard: which datasets affected?
4. Check upstream lineage: find root cause
5. Is it infra? → Check K8s, Airflow, DB status
6. Is it data? → Check last successful run, look for schema changes
7. Apply hotfix: rollback code, reprocess data, rerun pipeline
8. Verify data restored
9. Resolve incident within 30 min
10. Schedule postmortem within 48 hours
```

### Common Failure Mode Quick Reference

| Symptom | Likely Cause | Fix |
|---|---|---|
| **No data fresh** | Upstream pipeline failed | Restart pipeline |
| **Zero rows** | Empty source or filter changed | Check source query |
| **Volume spike** | Duplicate data load | Dedup, add idempotency key |
| **Distribution shift** | Source schema changed | Update mappings |
| **Schema mismatch** | New column added | Update contract |
