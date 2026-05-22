# Transformation

## dbt Models

### Model Types
- Staging: `stg_<source>__<table>.sql` — source-close, minimal transformations (column renaming, type casting, dedup). Views by default.
- Intermediate: `int_<domain>__<purpose>.sql` — business logic, joins between staging models. Ephemeral or views.
- Marts: `fct_<business_process>.sql` or `dim_<entity>.sql` — aggregated, consumption-ready. Tables or incremental.

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
Tracking: `dbt_valid_from`, `dbt_valid_to`, `dbt_updated_at`. Query current records: `where dbt_valid_to is null`.
