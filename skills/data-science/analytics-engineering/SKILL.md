---
name: data-science-analytics-engineering
description: >
  Use this skill when asked about analytics engineering, dbt, data modeling, metrics layer, semantic layer, Cube.js, MetricFlow, dbt metrics, SQL analytics, window functions, CTEs, pivot/unpivot, data modeling for analytics, OBT, dimensional modeling, medallion architecture, bronze/silver/gold, or analytical SQL. This skill enforces: dbt Core (models in SQL/Python, materializations, Jinja/macros, ref/source, tests, docs), metrics layer (dbt Metrics, MetricFlow, Cube.js, semantic layer design, metric definitions, dimensions, filters, time granularity), data modeling for analytics (marts approach, OBT, dimensional modeling, medallion architecture), and SQL for analytics (window functions, CTEs, pivot/unpivot, statistical functions, time series SQL, performance optimization, UDFs). Do NOT use for: general data engineering (use data-engineering skills), statistical analysis (use statistical-analysis skill), or experiment design (use experimentation skill).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [data-science, analytics-engineering, dbt, sql, phase-7]
---

# Analytics Engineering

## Purpose
Design and build production analytics pipelines with dbt Core (models, materializations, Jinja macros, ref/source, tests, documentation), metrics and semantic layers (dbt Metrics, MetricFlow, Cube.js, metric definitions, dimensions, filters, time granularity), data modeling for analytics (marts approach, One Big Table, dimensional modeling, medallion architecture), and analytical SQL (window functions, CTEs, pivoting, statistical functions, time series, performance optimization, UDFs).

## Agent Protocol

### Trigger
Exact user phrases: "analytics engineering", "dbt", "dbt model", "dbt materialization", "Jinja macro", "dbt ref", "dbt source", "dbt test", "dbt doc", "metrics layer", "semantic layer", "MetricFlow", "Cube.js", "dbt metrics", "data modeling", "marts approach", "OBT", "One Big Table", "dimensional modeling", "medallion architecture", "bronze silver gold", "SQL analytics", "window function", "CTE", "pivot", "unpivot", "analytical SQL", "time series SQL", "SQL UDF".

### Input Context
Before activating, verify:
- Transformation tool (dbt Core, dbt Cloud, SQLMesh)
- Data warehouse (Snowflake, BigQuery, Redshift, Databricks, Postgres)
- BI tools (Tableau, Looker, Power BI, Metabase)
- Existing data model layer (raw, staging, intermediate, marts)
- dbt version and packages installed (dbt_utils, dbt_expectations)
- CI/CD setup (GitHub Actions, dbt Cloud CI)
- Testing and documentation practices

### Output Artifact
dbt project configuration, model SQL, macro definitions, metric definitions, data model documentation, and analytical query patterns.

### Response Format
```sql
-- dbt model code
-- Analytical SQL queries
```
```yaml
-- dbt project config, schema.yml, metrics definitions
```
```python
-- Python dbt models
-- MetricFlow config
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] dbt project initialized with folder structure (staging, intermediate, marts)
- [ ] Source definitions and staging models for all raw data
- [ ] Intermediate models for business logic and transformations
- [ ] Mart models for consumption (dimension, fact, aggregate tables)
- [ ] Metrics defined and exposed via semantic layer
- [ ] Tests defined for critical columns (unique, not_null, relationships)
- [ ] Documentation generated with dbt docs
- [ ] Analytical SQL queries for common analytics patterns

### Max Response Length
400 lines of code and configuration.

## Workflow

### Step 1: dbt Project Structure
```
analytics/
├── models/
│   ├── staging/          # Raw → clean, typed, renamed
│   │   ├── stg_orders.sql
│   │   └── sources.yml
│   ├── intermediate/     # Business logic, joins, aggregations
│   │   ├── int_order_items.sql
│   │   └── int_customer_orders.sql
│   └── marts/            # Consumption-ready
│       ├── fct_orders.sql
│       ├── dim_customers.sql
│       └── marketing/
│           └── rpt_daily_revenue.sql
├── tests/                # Singular tests
│   └── assert_positive_revenue.sql
├── macros/               # Jinja macros
│   └── grant_permissions.sql
├── analyses/             # Ad-hoc queries
├── snapshots/            # Type-2 slowly changing dimensions
├── seeds/                # Static CSV data
└── dbt_project.yml
```

### Step 2: Source and Staging
```yaml
# models/staging/sources.yml
version: 2
sources:
  - name: raw_shop
    database: raw_db
    schema: public
    tables:
      - name: orders
        loaded_at_field: created_at
        freshness:
          warn_after: { count: 6, period: hour }
          error_after: { count: 12, period: hour }
      - name: customers
      - name: products
```

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
        total_amount::DECIMAL(10,2) AS total_amount,
        created_at,
        updated_at
    FROM source
    WHERE id IS NOT NULL
)
SELECT * FROM renamed
```

### Step 3: Intermediate Models
```sql
-- models/intermediate/int_customer_orders.sql
WITH customer_orders AS (
    SELECT
        customer_id,
        MIN(order_date) AS first_order_date,
        MAX(order_date) AS most_recent_order_date,
        COUNT(order_id) AS number_of_orders,
        SUM(total_amount) AS lifetime_value
    FROM {{ ref('stg_orders') }}
    WHERE status != 'cancelled'
    GROUP BY 1
)
SELECT * FROM customer_orders
```

### Step 4: Marts — Dimensional Model
```sql
-- models/marts/dim_customers.sql
WITH customers AS (
    SELECT * FROM {{ ref('stg_customers') }}
),
customer_orders AS (
    SELECT * FROM {{ ref('int_customer_orders') }}
)
SELECT
    customers.customer_id,
    customers.first_name,
    customers.last_name,
    customers.email,
    customer_orders.first_order_date,
    customer_orders.most_recent_order_date,
    COALESCE(customer_orders.number_of_orders, 0) AS number_of_orders,
    COALESCE(customer_orders.lifetime_value, 0) AS lifetime_value
FROM customers
LEFT JOIN customer_orders ON customers.customer_id = customer_orders.customer_id
```

### Step 5: Materializations
```yaml
# dbt_project.yml
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
    marts_marketing:
      +materialized: incremental
      +schema: marketing
      +incremental_strategy: merge
```

```sql
-- Incremental model example
{{ config(
    materialized='incremental',
    unique_key='order_date',
    incremental_strategy='merge'
) }}

SELECT
    order_date,
    COUNT(DISTINCT order_id) AS total_orders,
    SUM(total_amount) AS total_revenue,
    COUNT(DISTINCT customer_id) AS active_customers
FROM {{ ref('stg_orders') }}
WHERE status = 'completed'
{% if is_incremental() %}
    AND order_date >= (SELECT MAX(order_date) FROM {{ this }})
{% endif %}
GROUP BY order_date
```

### Step 6: Metrics Layer
```yaml
# models/marts/schema.yml — dbt Metrics
version: 2
metrics:
  - name: total_revenue
    label: Total Revenue
    model: ref('fct_orders')
    description: "Sum of completed order amounts"
    calculation_method: sum
    expression: total_amount
    timestamp: order_date
    time_grains: [day, week, month, quarter, year]
    dimensions:
      - customer_tier
      - product_category
      - region
    filters:
      - field: status
        operator: =
        value: completed

  - name: revenue_per_customer
    label: Revenue Per Customer
    description: "Average revenue per active customer"
    calculation_method: derived
    expression: "{{ metric('total_revenue') }} / {{ metric('active_customers') }}"
    timestamp: order_date
    time_grains: [month, quarter, year]
```

### Step 7: Tests and Documentation
```yaml
# models/marts/schema.yml
models:
  - name: dim_customers
    description: "Customer dimension with aggregated order history"
    columns:
      - name: customer_id
        tests: [unique, not_null]
        description: "Primary key from source system"
      - name: email
        tests:
          - unique
          - not_null
          - accepted_values:
              values: ["@"]
              quote: false
      - name: lifetime_value
        tests:
          - not_null
          - dbt_utils.accepted_range:
              min_value: 0
      - name: first_order_date
        tests:
          - not_null
          - dbt_expectations.expect_column_values_to_be_between:
              min_value: '2020-01-01'
```

## Rules
- Staging models are 1:1 with source tables, only rename and cast
- Intermediate models contain joins and business logic, not exposed to BI
- Mart models are consumption-ready and follow star schema
- Every model has a primary key test (unique + not_null)
- Sources have freshness tests with alert thresholds
- Use ref() not source() after staging; never use source() in marts
- Metrics defined at the semantic layer, not hardcoded in BI tools
- Ephemeral models for intermediate logic only; avoid in marts
- Incremental models need unique_key and incremental_strategy
- Document column descriptions and model relationships

## References
- `references/dbt-core.md` — Models, materializations, Jinja/macros, ref/source, tests, docs
- `references/metrics-layer.md` — dbt Metrics, MetricFlow, Cube.js, semantic layer design, metric definitions
- `references/data-modeling.md` — Marts approach, OBT, dimensional modeling, medallion architecture
- `references/sql-analytics.md` — Window functions, CTEs, pivot/unpivot, statistical SQL, time series, UDFs

## Handoff
`data-science-statistical-analysis` for analytical statistical methods
`data-science-experimentation` for experiment metric pipelines
`data-quality` for data quality testing and monitoring
