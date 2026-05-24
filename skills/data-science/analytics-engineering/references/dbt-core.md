# dbt Core Reference

## Project Structure

### Standard Layout
```
my_dbt_project/
├── models/
│   ├── staging/            # 1:1 with source tables, renaming + casting
│   ├── intermediate/       # Business logic, joins, aggregations
│   └── marts/              # Consumption-ready tables (star schema)
│       ├── core/           # Shared dimension + fact tables
│       └── marketing/      # Domain-specific marts
├── tests/                  # Singular tests (SQL returning failing rows)
├── analyses/               # Ad-hoc queries (not materialized)
├── macros/                 # Reusable Jinja code
├── snapshots/              # Type-2 slowly changing dimension logic
├── seeds/                  # CSV files loaded into warehouse
├── data/                   # For dbt-utils seed reference
├── packages.yml            # dbt package dependencies
├── dbt_project.yml         # Project configuration
└── profiles.yml            # Warehouse connection profiles
```

```yaml
# dbt_project.yml
name: analytics
version: "1.0.0"
config-version: 2
profile: snowflake_analytics

model-paths: ["models"]
test-paths: ["tests"]
macro-paths: ["macros"]
analysis-paths: ["analyses"]
snapshot-paths: ["snapshots"]
seed-paths: ["seeds"]

clean-targets:
  - target
  - dbt_packages

models:
  analytics:
    staging:
      +materialized: view
      +schema: staging
    intermediate:
      +materialized: ephemeral
    marts:
      +materialized: table
      +schema: marts
      core:
        +materialized: table
      marketing:
        +materialized: incremental
```

## Models

### SQL Models
```sql
-- models/staging/stg_orders.sql
WITH source AS (
    SELECT * FROM {{ source('raw_shop', 'orders') }}
),
renamed AS (
    SELECT
        id AS order_id,
        customer_id,
        order_date::DATE AS order_date,
        status,
        amount::DECIMAL(10,2) AS amount
    FROM source
    WHERE id IS NOT NULL
)
SELECT * FROM renamed
```

### Python Models (dbt >= 1.3)
```python
# models/marts/ml_features.py
import pandas as pd

def model(dbt, session):
    stg_orders = dbt.ref("stg_orders").to_pandas()
    stg_customers = dbt.ref("stg_customers").to_pandas()

    features = stg_orders.groupby("customer_id").agg(
        total_orders=("order_id", "count"),
        total_spend=("amount", "sum"),
        avg_order_value=("amount", "mean"),
        days_since_last_order=("order_date", "max")
    ).reset_index()

    return features
```

## Materializations

### Table
```sql
{{ config(materialized='table', schema='marts') }}
SELECT ...  -- Rebuilt on every `dbt run`
```

### View
```sql
{{ config(materialized='view') }}
SELECT ...  -- No storage, query source every time
```

### Incremental
```sql
{{ config(
    materialized='incremental',
    unique_key='order_id',
    incremental_strategy='merge'
) }}

SELECT * FROM {{ ref('stg_orders') }}
{% if is_incremental() %}
    WHERE updated_at > (SELECT MAX(updated_at) FROM {{ this }})
{% endif %}
```

Strategies: `merge` (default on Snowflake/BQ/Databricks), `insert_overwrite` (partition swap), `append` (logs, events), `delete+insert` (full refresh of relevant partitions).

### Ephemeral
```sql
{{ config(materialized='ephemeral') }}
WITH ...  -- CTE only, not materialized to warehouse
```
Cannot be referenced by other ephemeral models. Good for intermediate transformations used only once.

### Snapshot (Type-2 SCD)
```sql
{% snapshot customers_snapshot %}
    {{ config(
        target_schema='snapshots',
        unique_key='customer_id',
        strategy='timestamp',
        updated_at='updated_at',
        invalidate_hard_deletes=True
    ) }}
    SELECT * FROM {{ source('raw', 'customers') }}
{% endsnapshot %}
```

## Jinja and Macros

### Built-in Variables
```jinja
{{ this }}                -- Current model relation
{{ ref('model_name') }}   -- Reference to another model
{{ source('source_name', 'table_name') }}  -- Reference to source
{{ config(...) }}         -- Model configuration
{{ is_incremental() }}    -- True during incremental run
{{ execute }}              -- True during dbt run, False during parsing
{{ invocation_id }}        -- Unique run identifier
```

### Custom Macros
```sql
-- macros/grant_permissions.sql
{% macro grant_select(schema_name) %}
    {% for table in run_query("SHOW TABLES IN " ~ schema_name) %}
        GRANT SELECT ON {{ schema_name }}.{{ table.name }} TO ROLE ANALYTICS_READER;
    {% endfor %}
{% endmacro %}

-- macros/audit_columns.sql
{% macro add_audit_columns() %}
    CURRENT_TIMESTAMP AS dbt_loaded_at,
    '{{ invocation_id }}' AS dbt_invocation_id
{% endmacro %}
```

### Control Flow
```jinja
{% if target.name == 'prod' %}
    {{ config(schema='prod_marts') }}
{% else %}
    {{ config(schema='dev_marts') }}
{% endif %}

{% for column in ['revenue', 'orders', 'customers'] %}
    SUM(CASE WHEN metric_type = '{{ column }}' THEN metric_value END) AS {{ column }}{% if not loop.last %},{% endif %}
{% endfor %}
```

## ref and source

### Source Definitions
```yaml
# models/staging/sources.yml
version: 2
sources:
  - name: raw_shop
    database: raw_db
    schema: public
    tables:
      - name: orders
        identifier: tbl_orders
        loaded_at_field: created_at
        freshness:
          warn_after: { count: 6, period: hour }
          error_after: { count: 12, period: hour }
        quoting:
          database: true
          schema: true
          identifier: true
```

### source() vs ref()
```sql
-- source(): read directly from source table (staging models only)
SELECT * FROM {{ source('raw_shop', 'orders') }}

-- ref(): read from another dbt model (everywhere else)
SELECT * FROM {{ ref('stg_orders') }}
```

### Node Selection Syntax
```bash
# Run specific models and their dependencies
dbt run --select stg_orders+
dbt run --select +marts.dim_customers

# Run modified models (state-based, requires manifest comparison)
dbt run --select state:modified+ --state target/

# Run by tag
dbt test --select tag:critical

# Run by model name
dbt run --select dim_customers fct_orders

# Exclude
dbt run --select marts --exclude marts.marketing
```

## Tests

### Generic Tests
```yaml
# models/schema.yml
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
          - unique
          - accepted_values:
              values: ["@"]
              quote: false
      - name: lifetime_value
        tests:
          - dbt_utils.accepted_range:
              min_value: 0
              max_value: 100000
```

### Custom Generic Tests
```sql
-- tests/generic/test_positive_values.sql
{% test positive_values(model, column_name) %}
    SELECT * FROM {{ model }}
    WHERE {{ column_name }} <= 0
{% endtest %}
```

### Singular Tests
```sql
-- tests/assert_positive_revenue.sql
SELECT order_id, SUM(amount) as total
FROM {{ ref('fct_orders') }}
GROUP BY order_id
HAVING total < 0
```

### Test Severity
```yaml
tests:
  +severity: warn  # Default

# Per-test severity override
- name: total_amount
  tests:
    - dbt_utils.accepted_range:
        min_value: 0
        max_value: 100000
        config:
          severity: error
          error_if: ">10"  # Fail if more than 10 rows violate
```

### Test Store Failures
```bash
dbt test --store_failures                          # All tests
dbt test --select tag:critical --store_failures     # Critical only
dbt test --store_failures --limit 100               # With row limit
```

## Documentation

### Documentation Blocks
```jinja
{% docs dim_customers %}
Customer dimension table with aggregated order history.
Each row represents a unique customer.

### Columns
- **customer_id**: Unique identifier from source system
- **lifetime_value**: Total spend across all non-cancelled orders
- **first_order_date**: Date of first completed order
{% enddocs %}
```

### Column Descriptions
```yaml
version: 2
models:
  - name: dim_customers
    description: "{{ doc('dim_customers') }}"
    columns:
      - name: customer_id
        description: "Unique identifier"
        tests: [unique, not_null]
```

### Generate Docs
```bash
dbt docs generate    # Generate catalog + index
dbt docs serve       # Serve docs on localhost:8080
```

## Packages

```yaml
# packages.yml
packages:
  - package: dbt-labs/dbt_utils
    version: 1.1.1
  - package: dbt-labs/codegen
    version: 0.12.1
  - package: calogica/dbt_date
    version: 0.10.1
  - package: dbt-labs/dbt_expectations
    version: 0.10.1
```

### Useful Package Macros
```sql
-- dbt_utils
{{ dbt_utils.surrogate_key(['customer_id', 'order_date']) }}
{{ dbt_utils.date_spine('day', "date '2020-01-01'", "date '2026-12-31'") }}
{{ dbt_utils.pivot('status', dbt_utils.get_column_values(ref('stg_orders'), 'status')) }}

-- dbt_expectations
{{ dbt_expectations.expect_column_values_to_be_between(...) }}

-- dbt_date
{{ dbt_date.get_date_dimension('2020-01-01', '2026-12-31') }}
```

## Hooks and Operations

```yaml
# dbt_project.yml
on-run-start:
  - "CREATE SCHEMA IF NOT EXISTS {{ target.schema }}"
on-run-end:
  - "{{ grant_select(target.schema) }}"
```

```bash
# Run operation macro
dbt run-operation grant_select --args "{schema_name: analytics_marts}"
```

## Common Commands
```bash
dbt debug                          # Verify connection
dbt deps                           # Install packages
dbt run                            # Build all models
dbt run --select staging           # Build specific folder
dbt run --full-refresh             # Rebuild all tables
dbt test                           # Run all tests
dbt test --select tag:critical     # Filter by tag
dbt build                          # Run + test in dependency order
dbt build --select state:modified+ # CI: only changed models and dependents
dbt docs generate                  # Create docs
dbt seed                           # Load CSV files
dbt snapshot                       # Run snapshot models
dbt compile                        # Compile SQL without executing
```
