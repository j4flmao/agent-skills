# Monitor Configuration Examples

## Monte Carlo Monitor Config

```yaml
# monte-carlo-monitors.yaml
monte_carlo:
  api_key: ${MC_API_KEY}
  account_id: acme-data-prod

monitors:
  - name: fct_orders_freshness
    type: freshness
    table: analytics.fct_orders
    schedule:
      type: CRON
      expression: "*/5 * * * *"
    rules:
      - field: last_loaded_at
        expectation: with_in_minutes
        value: 60
        severity: HIGH
    actions:
      - type: PAGERDUTY
        routing_key: ${PD_ROUTING_KEY_FRESHNESS}

  - name: fct_orders_volume
    type: field_health
    table: analytics.fct_orders
    schedule:
      type: TRAILING
      interval_minutes: 60
    rules:
      - field: row_count
        expectation: within_trailing_30d_avg
        threshold: 3.0
        severity: MEDIUM
      - field: row_count
        expectation: within_range
        min: 10000
        max: 500000
        severity: HIGH
    actions:
      - type: SLACK
        webhook_url: ${SLACK_WEBHOOK_DATA_ALERTS}
        channel: "#data-alerts"

  - name: revenue_columns_distribution
    type: distribution
    table: analytics.fct_orders
    schedule:
      type: DAILY
      at: "06:00 UTC"
    rules:
      - column: total_amount
        metric: AVG
        expectation: within_trailing_30d_avg
        threshold: 2.5
        sensitivity: MEDIUM
      - column: total_amount
        metric: NULL_RATE
        expectation: less_than
        value: 0.05
        severity: HIGH
      - column: order_id
        metric: DISTINCT_COUNT
        expectation: within_trailing_30d_avg
        threshold: 3.0
        severity: HIGH
    actions:
      - type: EMAIL
        to: ["data-eng@org.com"]

  - name: schema_change
    type: schema_change
    table: analytics.fct_orders
    schedule:
      type: ON_CHANGE
    rules:
      - change: COLUMN_DROPPED
        severity: CRITICAL
        block_downstream: true
      - change: COLUMN_ADDED
        severity: LOW
      - change: TYPE_CHANGE
        severity: HIGH
```

## Bigeye Code-First Configuration

```python
# bigeye_config.py
from bigeye_sdk import MonitorConfig, Metric, Threshold, DatawarehouseClient

client = DatawarehouseClient(api_key="be_${BE_API_KEY}", workspace="acme-prod")

# Freshness monitor
client.create_monitor(MonitorConfig(
    name="fct_orders_freshness",
    metric=Metric.FRESHNESS_MINUTES,
    table="analytics.fct_orders",
    threshold=Threshold(
        type="static",
        max_value=60,  # minutes
    ),
    severity="HIGH",
    schedule="EVERY_5_MINUTES",
))

# Volume monitor with seasonal baseline
client.create_monitor(MonitorConfig(
    name="fct_orders_volume_seasonal",
    metric=Metric.ROW_COUNT,
    table="analytics.fct_orders",
    threshold=Threshold(
        type="seasonal",
        period_days=7,
        sensitivity=2.5,
        min_historical_weeks=4,
    ),
    severity="MEDIUM",
    schedule="EVERY_HOUR",
))

# Multi-column distribution monitors
for column in ["total_amount", "quantity", "discount"]:
    client.create_monitor(MonitorConfig(
        name=f"null_rate_{column}",
        metric=Metric.NULL_RATE,
        table="analytics.fct_orders",
        column=column,
        threshold=Threshold(
            type="static",
            max_value=0.05,
        ),
        severity="LOW",
        schedule="DAILY",
    ))

# Schema tracking
client.create_monitor(MonitorConfig(
    name="fct_orders_schema_critical",
    metric=Metric.SCHEMA_CHANGE,
    table="analytics.fct_orders",
    threshold=Threshold(
        type="static",
        block_on=["COLUMN_DROPPED", "TYPE_CHANGE"],
    ),
    severity="CRITICAL",
))
```

## Sifflet Monitor Config (YAML)

```yaml
# sifflet-monitors.yaml
sifflet:
  url: https://app.siffletdata.com
  api_key: ${SIFFLET_API_KEY}

datasets:
  - name: analytics.fct_orders
    tier: critical
    monitors:
      - name: freshness
        type: FRESHNESS
        schedule: EVERY_15_MINUTES
        max_age_minutes: 60

      - name: row_count_stability
        type: VOLUME
        schedule: EVERY_HOUR
        lookback_days: 30
        method: ZSCORE
        threshold: 3.0

      - name: column_metrics
        type: COLUMN_PROFILE
        schedule: DAILY
        columns:
          - name: total_amount
            metrics: [AVG, STDDEV, NULL_COUNT, PERCENTILE_50, PERCENTILE_95]
          - name: order_id
            metrics: [DISTINCT_COUNT, NULL_COUNT]
          - name: status
            metrics: [DISTINCT_VALUES, FREQUENCY_TOP_10]

      - name: anomaly_detection
        type: AUTO_ANOMALY
        schedule: EVERY_6_HOURS
        sensitivity: MEDIUM
        dimensions: ["status", "payment_method"]

    alerting:
      critical:
        - channel: PAGERDUTY
          routing_key: ${PD_ROUTING_KEY}
      high:
        - channel: SLACK
          webhook: ${SLACK_WEBHOOK}
          channel: "#data-alerts"
      medium:
        - channel: SLACK
          channel: "#data-observability"
```

## Monitor Coverage Matrix

| Dataset | Freshness | Volume | Distribution | Schema | Tier |
|---|---|---|---|---|---|
| fct_orders | EVERY_5MIN | HOURLY | DAILY | ON_CHANGE | Critical |
| dim_customers | HOURLY | DAILY | DAILY | ON_CHANGE | Critical |
| dim_products | HOURLY | DAILY | WEEKLY | ON_CHANGE | High |
| stg_orders | EVERY_5MIN | HOURLY | NONE | NONE | High |
| marketing_attribution | DAILY | DAILY | WEEKLY | WEEKLY | Medium |
| experiment_results | NONE | DAILY | WEEKLY | NONE | Low |

Tuning: review all monitors weekly for first month after setup, monthly thereafter. Adjust thresholds when false positive rate exceeds 5%.
