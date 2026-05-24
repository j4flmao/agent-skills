# Data Modeling for Analytics Reference

## Marts Approach

### Principles
```
1. Staging (raw → cleaned): 1:1 with source, rename + cast only
2. Intermediate (cleaned → business logic): joins, aggregations, business rules
3. Marts (business logic → consumption): star schemas, wide tables, aggregates

Benefits:
  - Separation of concerns (each layer has clear responsibility)
  - Reusability (intermediate models shared across marts)
  - Testing granularity (test at each level)
  - Performance (compute once in marts, query many times)
```

### Model Categories

```yaml
Dimensions:
  - Conformed: shared across marts (dim_customers, dim_products, dim_dates)
  - Slowly Changing: type-1 (overwrite), type-2 (new row), type-3 (limited history)
  - Degenerate: attributes in fact table that aren't true dims (order_number)

Fact Tables:
  - Transactional: one row per event (orders, clicks)
  - Periodic Snapshot: regular interval snapshots (daily inventory)
  - Accumulating Snapshot: tracks pipeline through fixed stages (order fulfillment)
  - Factless: events without measures (attendance, page views)

Aggregates:
  - Daily/summary tables for performance
  - Pre-computed business KPIs
```

### dbt Implementation
```sql
-- models/marts/core/dim_customers.sql
{{ config(materialized='table', schema='marts') }}

WITH customers AS (
    SELECT * FROM {{ ref('stg_customers') }}
),
customer_orders AS (
    SELECT * FROM {{ ref('int_customer_orders') }}
),
customer_payments AS (
    SELECT * FROM {{ ref('int_customer_payments') }}
)
SELECT
    customers.customer_id,
    customers.first_name,
    customers.last_name,
    customers.email,
    customer_orders.first_order_date,
    customer_orders.most_recent_order_date,
    COALESCE(customer_orders.number_of_orders, 0) AS number_of_orders,
    customer_payments.total_amount AS lifetime_value,
    CASE
        WHEN customer_payments.total_amount > 10000 THEN 'platinum'
        WHEN customer_payments.total_amount > 5000 THEN 'gold'
        WHEN customer_payments.total_amount > 1000 THEN 'silver'
        ELSE 'bronze'
    END AS customer_tier
FROM customers
LEFT JOIN customer_orders USING (customer_id)
LEFT JOIN customer_payments USING (customer_id)
```

## One Big Table (OBT)

### Approach
Single wide table with all dimensions and facts. Denormalized to the event grain.

```sql
-- models/marts/core/obt_orders.sql
{{ config(materialized='table', schema='marts') }}

SELECT
    orders.order_id,
    orders.order_date,
    orders.status,
    orders.total_amount,
    customers.customer_id,
    customers.first_name || ' ' || customers.last_name AS customer_name,
    customers.email AS customer_email,
    customers.customer_tier,
    products.product_id,
    products.product_name,
    products.category AS product_category,
    products.subcategory AS product_subcategory,
    products.price AS unit_price,
    line_items.quantity,
    line_items.unit_price * line_items.quantity AS line_total,
    stores.store_id,
    stores.store_name,
    stores.region,
    stores.country,
    employees.employee_id AS sales_rep_id,
    employees.employee_name AS sales_rep_name,
    dates.day_of_week,
    dates.month_name,
    dates.quarter,
    dates.year
FROM {{ ref('stg_orders') }} AS orders
LEFT JOIN {{ ref('stg_customers') }} AS customers USING (customer_id)
LEFT JOIN {{ ref('stg_line_items') }} AS line_items USING (order_id)
LEFT JOIN {{ ref('stg_products') }} AS products USING (product_id)
LEFT JOIN {{ ref('stg_stores') }} AS stores USING (store_id)
LEFT JOIN {{ ref('stg_employees') }} AS employees ON orders.sales_rep_id = employees.employee_id
LEFT JOIN {{ ref('dim_dates') }} AS dates ON orders.order_date = dates.date
```

### Pros and Cons
```
Pros:
  - No joins needed for queries (fast simple queries)
  - Easy for BI tools and business users
  - Single source of truth for the event stream
  - Predictable performance (one table to query)

Cons:
  - Wide tables (100+ columns) are hard to manage
  - Schema changes are expensive
  - Storage redundancy (dimension data duplicated)
  - Query against unused columns is wasteful
  - Difficult to manage permissions at column level

When to use:
  - Small to medium data volumes
  - Simple dimensional models (3-5 dimensions)
  - BI tools that prefer denormalized data
  - Rapid prototyping

When to avoid:
  - Large data volumes (100B+ rows)
  - Complex dimensional models (10+ dimensions)
  - Frequent schema changes
  - Column-level security requirements
```

## Dimensional Modeling for Analytics

### Star Schema
```
fact_orders
├── order_id (PK)
├── customer_id (FK → dim_customers)
├── product_id (FK → dim_products)
├── store_id (FK → dim_stores)
├── order_date (FK → dim_dates)
├── quantity
├── unit_price
├── total_amount
├── status
└── created_at

dim_customers: customer_id, name, email, tier, ...
dim_products:  product_id, name, category, subcategory, ...
dim_stores:    store_id, name, region, country, ...
dim_dates:     date_id, year, quarter, month, day, day_of_week, ...
```

### Slowly Changing Dimensions (SCD)

Type 1: Overwrite (no history)
```sql
MERGE INTO dim_customers USING stg_customers
ON dim_customers.customer_id = stg_customers.customer_id
WHEN MATCHED THEN UPDATE SET
    email = stg_customers.email,
    updated_at = CURRENT_TIMESTAMP
WHEN NOT MATCHED THEN INSERT (customer_id, email, created_at)
    VALUES (stg_customers.customer_id, stg_customers.email, CURRENT_TIMESTAMP)
```

Type 2: Add new row (full history)
```sql
-- dbt snapshot handles this automatically
{% snapshot dim_customers_snapshot %}
    {{ config(
        target_schema='snapshots',
        unique_key='customer_id',
        strategy='check',
        check_cols=['email', 'tier', 'address'],
        invalidate_hard_deletes=True
    ) }}
    SELECT * FROM {{ ref('stg_customers') }}
{% endsnapshot %}
```

Type 3: Add new column (limited history)
```sql
ALTER TABLE dim_customers ADD COLUMN previous_tier VARCHAR;
UPDATE dim_customers
SET previous_tier = tier,
    tier = new_tier
WHERE customer_id = target_id;
```

### Date Dimension
```sql
-- models/marts/core/dim_dates.sql
{{ dbt_date.get_date_dimension('2020-01-01', '2030-12-31') }}

-- Alternative: manual CTE
WITH date_spine AS (
    SELECT DATEADD('day', seq4(), '2020-01-01') AS date
    FROM TABLE(generator(rowcount => 3650))
)
SELECT
    date,
    EXTRACT(YEAR FROM date) AS year,
    EXTRACT(QUARTER FROM date) AS quarter,
    EXTRACT(MONTH FROM date) AS month,
    EXTRACT(WEEK FROM date) AS week,
    DAYOFWEEK(date) AS day_of_week,
    DAYOFYEAR(date) AS day_of_year,
    MONTHNAME(date) AS month_name,
    DATE_TRUNC('week', date) AS week_start_date,
    LAST_DAY(date, 'month') AS month_end_date,
    IFF(DAYOFWEEK(date) IN (0, 6), True, False) AS is_weekend
FROM date_spine
```

## Medallion Architecture (Bronze/Silver/Gold)

### Layer Definitions

```
Bronze (Raw ingestion):
  Purpose: immutable record of source data
  Format: preserves original (JSON, Avro, Parquet, CSV)
  Schema: schema-on-read, minimal validation
  Write: append-only, no modifications
  Retention: 30-90 days raw, 1+ year summarized

Silver (Cleaned and validated):
  Purpose: clean, deduplicated, conformed data
  Format: Delta/Iceberg/Hudi (Parquet)
  Schema: enforced, validated, nullable constrained
  Write: upserts, CDC applied, deduplicated by business key
  Retention: 1-3 years

Gold (Consumption-ready):
  Purpose: business-level aggregates, star schemas, KPIs
  Format: Delta/Iceberg (Parquet)
  Schema: business-facing names, denormalized
  Write: scheduled refresh or materialized view
  Retention: indefinite or per policy
```

### Implementation with dbt
```yaml
# Bronze model: raw ingestion (append only)
models:
  bronze:
    +materialized: incremental
    +incremental_strategy: append
    +schema: bronze
```

```sql
-- models/bronze/bronze_orders.sql
{{ config(materialized='incremental', incremental_strategy='append') }}

SELECT
    $1:order_id::STRING AS order_id,
    $1:customer_id::STRING AS customer_id,
    $1:amount::FLOAT AS amount,
    $1:status::STRING AS status,
    $1:order_date::DATE AS order_date,
    METADATA$FILENAME AS source_file,
    METADATA$FILE_LAST_MODIFIED AS source_modified_at,
    CURRENT_TIMESTAMP AS ingested_at
FROM {{ source('external_stage', 'orders_json') }}

{% if is_incremental() %}
    WHERE METADATA$FILE_LAST_MODIFIED > (SELECT MAX(source_modified_at) FROM {{ this }})
{% endif %}
```

```yaml
# Silver model: cleaned and deduplicated
models:
  silver:
    +materialized: incremental
    +incremental_strategy: merge
    +schema: silver
```

```sql
-- models/silver/silver_orders.sql
{{ config(materialized='incremental', unique_key='order_id') }}

WITH ranked AS (
    SELECT *,
        ROW_NUMBER() OVER (
            PARTITION BY order_id
            ORDER BY source_modified_at DESC
        ) AS rn
    FROM {{ ref('bronze_orders') }}
    WHERE order_id IS NOT NULL AND amount >= 0
)
SELECT
    order_id, customer_id, amount, status, order_date,
    CURRENT_TIMESTAMP AS processed_at
FROM ranked
WHERE rn = 1

{% if is_incremental() %}
    WHERE order_date >= (SELECT MAX(order_date) FROM {{ this }}) - INTERVAL '3 days'
{% endif %}
```

```sql
-- models/gold/gold_daily_revenue.sql
{{ config(materialized='table', schema='gold') }}

SELECT
    order_date,
    COUNT(DISTINCT order_id) AS total_orders,
    COUNT(DISTINCT customer_id) AS active_customers,
    SUM(amount) AS total_revenue,
    SUM(amount) / NULLIF(COUNT(DISTINCT order_id), 0) AS avg_order_value,
    SUM(amount) / NULLIF(COUNT(DISTINCT customer_id), 0) AS revenue_per_customer
FROM {{ ref('silver_orders') }}
WHERE status = 'completed'
GROUP BY order_date
```

### Data Flow
```
Source → Bronze (append) → Silver (dedup, validate) → Gold (aggregate, denormalize)
Quality gates at each transition:
  Bronze → Silver: schema compliance, null checks, dedup
  Silver → Gold: aggregate totals match SLA trends
  Gold → BI: metric definition verification, row count thresholds
```

### When to Use Medallion
```
Best for:
  - Lakehouse architectures (Databricks, Iceberg, Delta)
  - Large-scale data (petabytes)
  - Multiple data sources with different formats
  - Strong data governance requirements
  - Both batch and streaming pipelines

Alternative approaches:
  - Star schema only: simpler, less infrastructure
  - OBT only: fast queries, but harder maintenance
  - Data Vault: highly normalized, audit-focused
```
