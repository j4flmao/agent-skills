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

### dbt Packages and Macros

#### Essential Packages

```yaml
packages:
  - package: dbt-labs/dbt_utils
    version: ">=1.1.0"
    macros:
      - dbt_utils.star()              # Select all columns except excluded
      - dbt_utils.surrogate_key()     # Generate unique row keys
      - dbt_utils.date_spine()        # Generate date dimension
      - dbt_utils.pivot()             # Pivot rows to columns
      - dbt_utils.unpivot()           # Unpivot columns to rows
      - dbt_utils.group_by()          # Generate group by columns
      - dbt_utils.union_relations()   # Union tables with same schema
      - dbt_utils.recency_test()      # Freshness test in SQL
  
  - package: calogica/dbt_expectations
    version: ">=0.10.0"
    tests:
      - expect_table_row_count_to_be_between
      - expect_column_values_to_be_between
      - expect_column_distinct_count_to_be_between
      - expect_column_median_to_be_between
  
  - package: dbt-labs/codegen
    version: ">=0.12.0"
    macros:
      - generate_source_yaml()        # Auto-generate source definitions
      - generate_base_model()         # Generate staging model SQL
      - generate_model_yaml()         # Generate model YAML from compiled SQL
```

#### Custom Macro Patterns

```jinja
{# Incremental merge macro with delete+insert #}
{% macro incremental_merge_with_delete(source_table, target_table, unique_key, delete_condition) %}
    {% if is_incremental() %}
        DELETE FROM {{ target_table }}
        WHERE {{ unique_key }} IN (
            SELECT {{ unique_key }}
            FROM {{ source_table }}
            WHERE {{ delete_condition }}
        );
    {% endif %}
    
    INSERT INTO {{ target_table }}
    SELECT * FROM {{ source_table }}
    {% if is_incremental() %}
        WHERE {{ unique_key }} NOT IN (
            SELECT {{ unique_key }} FROM {{ target_table }}
        )
    {% endif %}
{% endmacro %}

{# Cross-database date truncation macro #}
{% macro date_trunc(unit, date_col) %}
    {% if target.type == 'snowflake' %}
        DATE_TRUNC('{{ unit }}', {{ date_col }})
    {% elif target.type == 'bigquery' %}
        DATE_TRUNC({{ date_col }}, {{ unit }})
    {% elif target.type == 'redshift' %}
        DATE_TRUNC('{{ unit }}', {{ date_col }})
    {% elif target.type == 'postgres' %}
        DATE_TRUNC('{{ unit }}', {{ date_col }})
    {% endif %}
{% endmacro %}
```

### dbt CI/CD Integration

#### GitHub Actions Pipeline

```yaml
# .github/workflows/dbt_ci.yml
name: dbt CI/CD
on: [pull_request]
jobs:
  dbt_ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.11" }
      - name: Install dbt
        run: pip install dbt-{{ target.type }}
      - name: dbt deps
        run: dbt deps --profiles-dir .
      - name: dbt debug
        run: dbt debug --profiles-dir .
      - name: dbt build --select state:modified+
        run: dbt build --select state:modified+ --profiles-dir .
      - name: dbt docs generate
        run: dbt docs generate --profiles-dir .
      - name: Upload docs
        uses: actions/upload-artifact@v4
        with: { name: docs, path: target/ }
```

### Materialization Decision Tree

```
Data size and update pattern?
├── Small (< 1M rows), rarely changes → View or Ephemeral
├── Medium (1M-100M), daily updates → Table (full refresh)
├── Large (100M+), append-only → Incremental (insert-only)
├── Large (100M+), updates/upserts → Incremental (merge)
├── Very large (1B+), time-series → Incremental (insert+partition)
└── Need sub-second query performance
    ├── Pre-aggregated results → Materialized view
    └── Aggregated metrics → Incremental + summary table
```

### dbt Python Models

```python
# models/marts/python/customer_segments.py
import pandas as pd
from sklearn.cluster import KMeans

def model(dbt, session):
    # Reference dbt model
    customer_features_df = dbt.ref("int_customer_features").to_pandas()
    
    # Apply clustering logic
    features = customer_features_df[["recency", "frequency", "monetary"]]
    kmeans = KMeans(n_clusters=5, random_state=42)
    customer_features_df["segment"] = kmeans.fit_predict(features)
    
    return customer_features_df
```

### Decision Trees (continued)

#### Test Strategy
```
What are we validating?
├── Data integrity
│   ├── Primary key uniqueness → unique + not_null test
│   └── Foreign key validity → relationships test
├── Data quality
│   ├── Column values → accepted_values, range check
│   ├── Distribution → dbt_expectations distribution tests
│   └── Freshness → source freshness threshold
├── Business logic
│   ├── Row count consistency → dbt_utils.equal_rowcount
│   ├── Cardinality rules → cardinality_equality test
│   └── Cross-model consistency → custom assertions
└── Performance
    ├── Query runtime → dbt query-comment + monitor
    └── Model complexity → model governance check
```

#### Incremental Strategy
```
Source data characteristics?
├── Append-only (logs, events)
│   └── incremental_strategy: append
├── Updates on unique key (CDC, transactional)
│   └── incremental_strategy: merge
├── Deletes + inserts (daily snapshots)
│   └── incremental_strategy: delete+insert
├── Micro-batch (time-windowed)
│   └── incremental_strategy: insert_overwrite
└── Need point-in-time accuracy
    └── Use snapshot strategy (scd_type: 2)
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
- Use dbt_utils and dbt_expectations for standardized testing
- Implement CI/CD for dbt — build only modified models on PRs
- Prefer incremental over table refresh for large datasets
- Version control dbt packages.yml — pin versions
- Use Python dbt models for ML logic that can't be expressed in SQL
- Generate documentation on every deployment

## References
  - references/data-modeling.md — Data Modeling for Analytics Reference
  - references/data-quality-testing.md — Data Quality Testing
  - references/data-warehouse-architecture.md — Data Warehouse Architecture
  - references/dbt-core.md — dbt Core Reference
  - references/metrics-layer.md — Metrics Layer Reference
  - references/sql-analytics.md — SQL for Analytics Reference
## Architecture Decision Trees

```
Analytics Engineering Stack
├── Transformation tool?
│   ├── dbt (SQL-first) → dbt Core / dbt Cloud
│   ├── Python-heavy → SQLMesh / Dataform
│   └── Multi-language → Dagster + dbt
├── Warehouse target?
│   ├── Snowflake → dbt-snowflake adapter (native features)
│   ├── BigQuery → dbt-bigquery (partitioning, clustering)
│   └── DuckDB → dbt-duckdb (local development)
├── Data modeling approach?
│   ├── Kimball → Star schema (facts + dimensions)
│   └── Data Vault → Hubs, links, satellites
└── CI/CD for data?
    ├── Yes → dbt CI with GitHub Actions + slim CI
    └── No → Manual dbt run (not recommended)
```

**Decision criteria**: Evaluate team SQL vs Python skills, warehouse platform, modeling maturity, and CI requirements.

## Implementation Patterns

### dbt Generic Test Pattern
```sql
-- analytics_engineering/tests/generic/assert_valid_email.sql
{% test assert_valid_email(model, column_name) %}
SELECT {{ column_name }}
FROM {{ model }}
WHERE {{ column_name }} IS NOT NULL
  AND {{ column_name }} !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
{% endtest %}
```

### Incremental Model with dbt
```sql
-- analytics_engineering/models/marts/dim_customer.sql
{{
    config(
        materialized='incremental',
        unique_key='customer_key',
        on_schema_change='append_new_columns',
        incremental_strategy='merge',
    )
}}

SELECT
    customer_id,
    customer_name,
    email,
    first_order_date,
    lifetime_value,
    updated_at
FROM {{ ref('stg_customers') }}

{% if is_incremental() %}
    WHERE updated_at > (SELECT max(updated_at) FROM {{ this }})
{% endif %}
```

## Production Considerations

- **CI/CD pipeline**: Run `dbt build --select state:modified+` on PR for slim CI; fail on test failures.
- **Documentation**: Generate dbt docs site; host on S3/Cloudflare Pages; refresh on every merge.
- **Lineage**: Enable dbt docs with +model+ lineage graph for impact analysis.
- **Source freshness**: Configure dbt source freshness tests; alert on stale sources.
- **Environment promotion**: Promote models from dev → staging → prod via dbt environment targets.
- **Package management**: Pin dbt packages in `packages.yml`; use semantic versioning.

## Anti-Patterns

| Anti-Pattern | Consequence | Solution |
|---|---|---|
| dbt models without tests | Undetected quality issues | Test every model with generic + singular tests |
| No source freshness checks | Stale data propagated | Configure source freshness for all sources |
| Manual dbt run in production | Inconsistent state, no audit | CI/CD for all production runs |
| Single monolithic dbt project | Long run times, tight coupling | Split into domain-specific sub-projects |
| Ignoring dbt performance | Full refresh on every run | Use incremental models for large tables |

## Performance Optimization

- **Incremental models**: Use incremental materialization for large tables; set `unique_key` for merge strategy.
- **Slim CI**: Use `dbt build --select state:modified+` to build only changed models + downstream.
- **Model refs**: Always use `{{ ref() }}` instead of raw table references for proper dependency resolution.
- **CTE naming**: Prefix CTEs with descriptive names for readability and query plan analysis.
- **Partitioning**: Align clustering keys (dbt `cluster_by`) with common query filter columns.

## Security Considerations

- **Credential management**: Store warehouse credentials in dbt profiles via environment variables; never commit.
- **RBAC**: Use dbt Cloud RBAC for project-level access; service tokens for CI/CD.
- **Data masking**: Implement Snowflake dynamic masking policies for PII in production models.
- **Schema isolation**: Separate dev/staging/prod schemas; restrict prod write access to CI/CD service account.
- **Audit**: Log all dbt runs with artifacts; store in cloud storage for compliance review.

## Handoff
`data-science-statistical-analysis` for analytical statistical methods
`data-science-experimentation` for experiment metric pipelines
`data-quality` for data quality testing and monitoring
