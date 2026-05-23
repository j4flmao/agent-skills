# Pipeline Monitoring

## dbt Models

### Model Types
- **Staging**: `stg_<source>__<table>.sql` — source-close, minimal transformations (column renaming, type casting, dedup). Views by default.
- **Intermediate**: `int_<domain>__<purpose>.sql` — business logic, joins between staging models. Ephemeral or views.
- **Marts**: `fct_<business_process>.sql` or `dim_<entity>.sql` — aggregated, consumption-ready. Tables or incremental.

### Model Configuration
```sql
-- dim_customers.sql
{{
    config(
        materialized='table',
        unique_key='customer_id',
        schema='marts',
        tags=['customer', 'daily'],
        post_hook="GRANT SELECT ON {{ this }} TO ROLE analyst"
    )
}}
```

### Staging Model Pattern
```sql
with source as (
    select * from {{ source('source_system', 'customers') }}
),
renamed as (
    select
        id as customer_id,
        name as customer_name,
        email,
        created_at,
        updated_at,
        _loaded_at
    from source
)
select * from renamed
```

## Testing

### Generic Tests
```yaml
# schema.yml
version: 2
models:
  - name: dim_customers
    columns:
      - name: customer_id
        tests:
          - unique
          - not_null
      - name: email
        tests:
          - not_null
          - unique
      - name: customer_status
        tests:
          - accepted_values:
              values: ['active', 'inactive', 'churned']
```

### Custom Generic Tests
```sql
-- tests/generic/test_freshness.sql
{% test freshness(model, column_name, max_age_hours=24) %}
    select * from {{ model }}
    where {{ column_name }} < current_timestamp - interval '{{ max_age_hours }} hours'
{% endtest %}
```

### Singular Tests
```sql
-- tests/assert_order_total_matches_line_items.sql
select
    o.order_id,
    o.total as header_total,
    sum(li.amount) as line_items_total
from {{ ref('fct_orders') }} o
join {{ ref('fct_order_line_items') }} li on o.order_id = li.order_id
group by o.order_id, o.total
having abs(o.total - sum(li.amount)) > 0.01
```

### CI Testing
```bash
dbt test --select tag:critical  # block pipeline
dbt test --select severity:error  # block on errors
dbt test --select severity:warn  # informational
```

## Documentation

### Auto-generated
```bash
dbt docs generate
dbt docs serve  # http://localhost:8080
```

### Documentation Blocks
```sql
-- models/marts/fct_orders.sql
{{
    config(
        materialized='incremental',
        unique_key='order_id',
    )
}}

/*
Description: Core orders fact table, one row per order.
Columns:
  - order_id: unique identifier for each order
  - customer_id: FK to dim_customers
  - order_total: total order amount in USD
  - order_status: current status of the order
  - created_at: timestamp when order was placed
*/
select ...
```

## Incremental Strategies

### Merge Strategy
```sql
{{
    config(
        materialized='incremental',
        unique_key=['order_id'],
        incremental_strategy='merge',
        merge_update_columns=['order_status', 'updated_at']
    )
}}
```
Best for: slowly changing dimensions, fact tables with updates.

### Insert + Overwrite
```sql
{{
    config(
        materialized='incremental',
        partition_by={'field': 'order_date', 'data_type': 'date'},
        incremental_strategy='insert_overwrite'
    )
}}
```
Best for: large fact tables, partition-based data sources.

### Timestamp-Based
```sql
{% if is_incremental() %}
    where created_at > (select max(loaded_at) from {{ this }})
{% endif %}
```
Best for: append-only event data.

## Snapshots (SCD Type 2)

```sql
{% snapshot dim_customers_snapshot %}
    {{
        config(
            target_schema='snapshots',
            unique_key='customer_id',
            strategy='timestamp',
            updated_at='updated_at',
            invalidate_hard_deletes=True
        )
    }}
    select * from {{ ref('dim_customers') }}
{% endsnapshot %}
```
Tracking fields: `dbt_valid_from`, `dbt_valid_to`, `dbt_updated_at`. Query current records: `WHERE dbt_valid_to IS NULL`.

## Monitoring and Alerting

### Pipeline Health Metrics
Track these metrics for every production pipeline:
- **DAG success rate**: percentage of scheduled runs that complete without failure (target >99%)
- **Average task duration**: broken down by task type to detect performance regression
- **Queue depth**: number of DAG runs waiting to execute
- **Data freshness lag**: time between data creation at source and availability in mart
- **Row count trends**: sudden drops or spikes in row counts per load
- **DLQ size**: number of unprocessed records in the dead letter queue
- **Validation failure rate**: percentage of runs where data validation checks fail

### Alert Conditions
| Condition | Severity | Channel | Response Time |
|---|---|---|---|
| Task failure (single) | Warning | Slack | 1 hour |
| Consecutive failures >3 | Critical | PagerDuty | 15 minutes |
| SLA miss | Warning | Slack | 30 minutes |
| Data validation failure | Critical | Slack + PagerDuty | 1 hour |
| DLQ write | Info | Slack daily digest | 24 hours |
| Pipeline stall (>30 min) | Warning | Slack | 30 minutes |
| Row count deviation >20% | Warning | Slack | 2 hours |

### Alert Channels
- **Slack**: real-time alerts for warnings and informational messages. Channel: #data-pipeline-alerts.
- **PagerDuty/Opsgenie**: critical alerts requiring immediate action. 15-minute response time SLA.
- **Email**: daily digest of pipeline health, DLQ summary, and validation failure report.
- **Dashboard**: Grafana or Datadog dashboard showing pipeline health metrics.

## SLAs

### SLA Definitions
| Pipeline Type | Processing SLA | Freshness SLA | Uptime SLA |
|---|---|---|---|
| Daily batch | Complete by 6 AM | Data ≤ 24 hours old | 99.5% |
| Hourly batch | Complete within 30 min of schedule | Data ≤ 2 hours old | 99.9% |
| Critical (financial) | Complete by 4 AM | Data ≤ 12 hours old | 99.99% |

### SLA Monitoring
Each DAG specifies an SLA in minutes. If the DAG run exceeds the SLA, `sla_miss_callback` is fired. SLA misses are tracked in a monitoring table and alerted via Slack. Monthly SLA compliance report is generated for each pipeline.

## Pipeline Health Dashboard

### Key Metrics Display
```
Orders Pipeline (Daily)
  ┌─────────────────────────────────────┐
  │ Status: ✅ Healthy                   │
  │ Last run: 2026-05-23 03:47:12 UTC   │
  │ Duration: 12 min 34 sec             │
  │ SLA: ✅ Met (target: 3h, actual: 47m)│
  │ Success rate (30d): 99.7%           │
  │ Row count: 1,284,567 (+2.1% vs avg) │
  │ Quality checks: 12/12 passed        │
  └─────────────────────────────────────┘
```

### Dashboard Components
- **Pipeline list**: all production DAGs with status, last run time, and duration
- **Failure timeline**: chart showing task failures over the last 7 days
- **Data freshness heatmap**: grid showing data freshness by table and time
- **DLQ monitor**: current DLQ size and growth trend
- **Quality gate summary**: pass/fail rate per validation check type
- **Cost tracker**: compute and storage costs per pipeline per month
