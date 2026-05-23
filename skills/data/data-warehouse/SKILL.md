---
name: data-data-warehouse
description: >
  Use this skill when asked about data warehouse, Snowflake, BigQuery, Redshift, star schema, snowflake schema, OLAP, dimensional modeling, fact tables, dimension tables, or data warehouse optimization. This skill enforces: dimensional modeling with star schema, platform-specific partitioning and clustering, materialized views for query performance, and cost optimization strategies. Do NOT use for: ETL pipeline design, real-time streaming, or BI dashboard configuration.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [data, analytics, phase-10]
---

# Data Data Warehouse

## Purpose
Design data warehouse schemas with dimensional modeling, platform-specific optimization, materialized views, and cost controls.

## Agent Protocol

### Trigger
Exact user phrases: "data warehouse", "Snowflake", "BigQuery", "Redshift", "star schema", "snowflake schema", "OLAP", "dimensional modeling", "fact table", "dimension table", "data warehouse design", "warehouse schema", "partition", "cluster", "materialized view", "warehouse optimization", "slowly changing dimension".

### Input Context
Before activating, verify:
- Warehouse platform (Snowflake, BigQuery, Redshift, DuckDB)
- Data size and growth rate (TB scale, daily increment)
- Query patterns (dashboard, ad-hoc, ML feature extraction)
- Business domains (sales, marketing, finance, product)
- Compliance requirements (data retention, PII masking)

### Output Artifact
Data warehouse design with schema, partition strategy, optimization plan as SQL and YAML.

### Response Format
```sql
-- Fact table DDL
-- Dimension table DDL
-- Materialized view DDL
```
```yaml
# Partition/cluster config
# Cost optimization rules
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Dimensional model with fact and dimension tables designed
- [ ] Slowly changing dimension strategy selected (SCD Type 2 default)
- [ ] Partitioning and clustering configured per table
- [ ] Materialized views defined for common query patterns
- [ ] Cost optimization rules configured
- [ ] Data retention and lifecycle policies set

### Max Response Length
300 lines of SQL and configuration.

## Warehouse Platforms

### Snowflake
Snowflake is a fully-managed cloud data warehouse with separated compute and storage. Key features: auto-scaling warehouses (XS to 6XL), automatic clustering, zero-copy cloning, time travel (up to 90 days), data sharing, and Snowpark for Python/Java/Scala processing. Snowflake uses a columnar storage format with automatic micro-partitioning. Compute is billed per second while active; storage is billed per TB per month. Best for: organizations that want minimal operational overhead, need data sharing capabilities, or require multi-cloud support.

### BigQuery
BigQuery is Google Cloud's serverless data warehouse. Key features: automatic partitioning and clustering, unlimited storage with no management, BI Engine for cached dashboard queries, BigQuery ML for in-database ML, and slot-based pricing. BigQuery separates compute (slots) from storage. Queries scan data on demand — there is no compute cluster to manage. Pricing is per byte scanned (on-demand) or per slot (flat-rate). Best for: GCP-native organizations, teams that want zero infrastructure management, and ad-hoc analytics at petabyte scale.

### Redshift
Redshift is AWS's cloud data warehouse. Key features: RA3 nodes with managed storage, concurrency scaling for burst traffic, Spectrum for querying S3 data, AQUA for accelerated queries, and materialized views. Redshift uses a traditional clustered architecture with leader and compute nodes. Distribution styles (KEY, EVEN, ALL) and sort keys require manual optimization. Best for: AWS-native organizations, high-concurrency workloads, and teams with SQL expertise who want granular control over performance.

### Databricks SQL
Databricks SQL provides a lakehouse architecture combining data lake and warehouse capabilities. Key features: Delta Lake for ACID transactions on data lakes, Photon engine for accelerated SQL, serverless SQL warehouses, and Unity Catalog for governance. Databricks SQL queries data directly from cloud storage (S3, ADLS, GCS) in Delta Lake format. Best for: organizations with existing Databricks investments, ML and analytics convergence, and open-format data lake requirements.

## Dimensional Modeling

### Star Schema
One fact table per business process at the center with dimension tables arranged around it. Dimensions are denormalized (wide tables with all attributes). Fast queries with few joins. Intuitive for business users. Well-supported by BI tools. The default modeling choice for most data warehouses.

### Snowflake Schema
Dimension tables are normalized into sub-dimensions. Reduces data redundancy and storage costs. More joins required — slower for queries. Better for deeply hierarchical dimensions (product category → subcategory → brand) and regulatory requirements for normalized models. Use when dimensions have many attributes with natural hierarchies.

### Fact Types
Transaction facts: one row per event (order, click, transaction). Fully additive. Periodic snapshot facts: one row per period (daily account balance, monthly inventory). Semi-additive — additive across dimensions but not time. Cumulative snapshot facts: one row per process lifecycle (order-to-delivery pipeline). Used for pipeline analysis and cycle time measurement.

### Slowly Changing Dimensions
SCD Type 0 (retain original): never change — used for immutable audit data. SCD Type 1 (overwrite): replace old value — no history, used for corrections. SCD Type 2 (add new row): full history with valid_from, valid_to, is_current — the default for most dimensions. SCD Type 3 (add new column): limited history via previous value column.

## Table Design

### Fact Table Design
Columns: foreign keys to dimensions (surrogate integer keys for performance), additive measures (quantity, amount, count), degenerate dimensions (order number, transaction ID), date/time stamps. Partition by date. Distribute by hash on large dimensions for collocated joins.

### Dimension Table Design
Columns: surrogate key (auto-increment integer), natural key (source system ID), attributes (descriptive columns), type 2 tracking columns (valid_from, valid_to, is_current), metadata (created_at, updated_at). Conformed dimensions are shared across fact tables.

## Materialized Views
Pre-computed query results stored as tables. Use for: pre-aggregated metrics (daily sales by product), commonly joined tables, complex window functions. Refresh strategies: automatic (Snowflake), periodic (BigQuery, manual or scheduled), after load (Redshift). One MV per dashboard query source. Refresh during off-peak hours.

## Query Optimization
Filter early — push WHERE clauses to subqueries. Avoid SELECT * — specify needed columns. Use approximate functions (APPROX_COUNT_DISTINCT, HyperLogLog) when exact counts aren't required. Reduce JOIN complexity by pre-aggregating or using dimension keys directly.

## Warehouse Platform Selection Guide

### Decision Factors
| Factor | Snowflake | BigQuery | Redshift | Databricks SQL |
|---|---|---|---|---|
| Cloud | AWS, Azure, GCP | GCP only | AWS only | AWS, Azure, GCP |
| Management effort | Low | None (serverless) | Medium | Low (serverless option) |
| Scaling model | Multi-cluster warehouses | Automatic slots | Concurrency scaling | Auto-scaling warehouses |
| Query performance | Good (auto-clustering) | Excellent (columnar) | Excellent (sort keys) | Very good (Photon) |
| Concurrency | Multi-cluster | Automatic | Concurrency scaling | Auto-scaling |
| Data sharing | Yes (native) | Yes (authorized views) | Yes (Spectrum) | Yes (Delta Sharing) |
| ML integration | Snowpark (Python/Java/Scala) | BigQuery ML (SQL) | SageMaker integration | Native (MLflow, notebooks) |
| Cost predictability | Credit quotas | Flat-rate slots | Node reservations | DBU caps |
| Open formats | Proprietary | Proprietary | Proprietary | Delta Lake (open) |

### When to Choose Each Platform
**Snowflake**: Multi-cloud strategy, cross-org data sharing, minimal operational overhead, zero-copy cloning for dev/test.

**BigQuery**: GCP-native, zero infrastructure management, petabyte-scale ad-hoc analytics, serverless scaling.

**Redshift**: AWS-native, high-concurrency BI workloads, granular performance tuning control, concurrency scaling.

**Databricks SQL**: Existing Databricks investment, open-format data lake, analytics + ML convergence, Delta Lake ACID guarantees.

## Cost Optimization Patterns by Platform

### Snowflake Cost Controls
```sql
ALTER WAREHOUSE dev_wh SET AUTO_SUSPEND = 60;
CREATE RESOURCE MONITOR dev_monthly WITH CREDIT_QUOTA = 100
  FREQUENCY = MONTHLY TRIGGERS ON 100 PERCENT DO SUSPEND;
ALTER WAREHOUSE prod_wh SET SCALING_POLICY = 'ECONOMY';
```

### BigQuery Cost Controls
```sql
SET @@dataset.max_bytes_billed = 1099511627776;
CREATE MATERIALIZED VIEW mv_daily_sales AS
SELECT order_date, SUM(amount) FROM fact_orders GROUP BY order_date;
```

### Redshift Cost Controls
```sql
CREATE EXTERNAL TABLE spectrum_old_orders (...)
LOCATION 's3://data-lake/orders/archive/';
```

### Universal Cost Optimization
- Drop unused tables and views monthly
- Compress all tables with ZSTD (default)
- Implement partition retention: drop partitions older than 365 days

## Common Dimensional Modeling Patterns

### Sales Fact Table
```sql
CREATE TABLE fact_sales (
    sale_id BIGINT PRIMARY KEY,
    customer_sk INT REFERENCES dim_customer(customer_sk),
    product_sk INT REFERENCES dim_product(product_sk),
    date_sk INT REFERENCES dim_date(date_sk),
    store_sk INT REFERENCES dim_store(store_sk),
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    cost_amount DECIMAL(12,2) NOT NULL,
    profit_amount DECIMAL(12,2) GENERATED ALWAYS AS (total_amount - cost_amount) STORED
);
```

### Inventory Snapshot Fact Table
```sql
CREATE TABLE fact_inventory_snapshot (
    snapshot_date DATE NOT NULL,
    product_sk INT REFERENCES dim_product(product_sk),
    warehouse_sk INT REFERENCES dim_warehouse(warehouse_sk),
    quantity_on_hand INT NOT NULL,
    quantity_reserved INT NOT NULL,
    quantity_available INT GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
    unit_cost DECIMAL(10,2),
    PRIMARY KEY (snapshot_date, product_sk, warehouse_sk)
);
```

### Order Pipeline Cumulative Snapshot
```sql
CREATE TABLE fact_order_pipeline (
    order_sk BIGINT PRIMARY KEY,
    order_date_sk INT REFERENCES dim_date(date_sk),
    ship_date_sk INT,
    delivery_date_sk INT,
    order_status VARCHAR(20),
    is_shipped BOOLEAN DEFAULT FALSE,
    is_delivered BOOLEAN DEFAULT FALSE,
    days_to_ship INT,  -- ship_date - order_date
    days_to_deliver INT, -- delivery_date - order_date
    order_amount DECIMAL(12,2)
);
```

## Slowly Changing Dimension Implementation

### SCD Type 2 Table (Full History)
```sql
CREATE TABLE dim_customer (
    customer_sk INT IDENTITY(1,1) PRIMARY KEY,
    customer_id INT NOT NULL,  -- natural key from source
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20),
    address_line1 VARCHAR(200),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    segment VARCHAR(50),
    valid_from TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    valid_to TIMESTAMP,
    is_current BOOLEAN DEFAULT TRUE,
    dbt_updated_at TIMESTAMP,
    dbt_valid_from TIMESTAMP,
    dbt_valid_to TIMESTAMP
);
-- Index: natural key + is_current for fast current-record lookup
CREATE INDEX idx_dim_customer_nk ON dim_customer(customer_id, is_current);
```

### SCD Type 2 Merge Logic (dbt Snapshot)
```sql
{% snapshot dim_customer_snapshot %}
    {{
        config(
            target_schema='snapshots',
            unique_key='customer_id',
            strategy='timestamp',
            updated_at='updated_at',
            invalidate_hard_deletes=True
        )
    }}
    SELECT
        customer_id,
        first_name,
        last_name,
        email,
        city,
        state,
        segment,
        updated_at
    FROM {{ source('source_system', 'customers') }}
{% endsnapshot %}
```

## Data Retention and Lifecycle

### Retention Schedule by Table Type
| Table Type | Raw Retention | Aggregated Retention | Notes |
|---|---|---|---|
| Fact (transaction) | 90 days | 7 years | Partition by month, drop raw after 90 days |
| Fact (snapshot) | 365 days | 5 years | Partition by month |
| Dimension | N/A | Indefinite (SCD Type 2) | Keep full history |
| Staging/raw | 30 days | N/A | Cleanup daily |
| Materialized view | N/A | 90 days | Rebuild on demand after 90 days |
| Temp/task tables | 7 days | N/A | Cleanup hourly |

### Lifecycle Management Script (Snowflake)
```sql
-- Drop old partitions
DELETE FROM fact_orders WHERE order_date < DATEADD(year, -7, CURRENT_DATE);

-- Clone a table before dropping for safety
CREATE TABLE fact_orders_archive_before_2020 CLONE fact_orders;

-- Remove old data
DELETE FROM fact_orders WHERE order_date < '2020-01-01';

-- Shrink table storage
ALTER TABLE fact_orders RECLUSTER;
```

## Specialized Analytics Engines

### ClickHouse
ClickHouse is a column-oriented OLAP database for real-time analytics. Uses columnar storage with vectorized query execution (SIMD), achieving 100-1000x faster queries than row-oriented databases on analytical workloads. Key features: MergeTree table engine family (ReplacingMergeTree for dedup, SummingMergeTree for pre-aggregation, CollapsingMergeTree for mutable state), incremental materialized views, distributed query across shards, and SQL with array/higher-order functions. Excels at: real-time dashboards, time-series analytics, log analytics, sub-second queries on billions of rows. Deploy alongside a primary warehouse for high-performance serving of pre-aggregated or real-time data.

```sql
CREATE TABLE events (
  event_date Date, event_type String,
  value UInt64, payload String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_type, event_date);

CREATE MATERIALIZED VIEW daily_metrics
ENGINE = SummingMergeTree()
ORDER BY (event_type, event_date) AS
SELECT event_type, event_date, sum(value)
FROM events GROUP BY event_type, event_date;
```

### TimescaleDB
TimescaleDB is a time-series database built as a PostgreSQL extension. Hypertables auto-partition by time/space — each chunk is a standard PG table. Native compression (gorilla for floats, delta-delta for ints, dictionary for strings) reduces storage 90%+. Continuous aggregates auto-refresh materialized views for sub-second queries over years of data. Full PostgreSQL compatibility. Use for operational analytics (IoT, monitoring, financial tick data) needing PG compatibility.

```sql
SELECT create_hypertable('sensor_data', 'time', chunk_time_interval => INTERVAL '1 day');
ALTER TABLE sensor_data SET (timescaledb.compress, timescaledb.compress_segmentby = 'device_id');
SELECT add_continuous_aggregate_policy('hourly_avg', start_offset => INTERVAL '3 days', end_offset => INTERVAL '1 hour', schedule_interval => INTERVAL '1 hour');
```

### Apache Druid
Druid is a real-time analytical database for high-concurrency OLAP on streaming/batch data. Uses segment-centric architecture: data into time-bound segments, bitmap indexes for fast filtering, columnar format. Ingests from Kafka (real-time) and batch files. Key features: time-aligned segment granularity, ingestion-time rollup for pre-aggregation, sketch-based algorithms (HyperLogLog, Theta sketches) for fast distinct counts, sub-second latency at petabyte scale. Use for real-time analytics dashboards, user-facing embedded analytics, and ad-hoc OLAP on streaming event data.

## Rules
- Star schema as default, snowflake for deep hierarchies
- Fact tables at most granular level
- SCD Type 2 for dimensions needing history
- Partition on date column, cluster on filter columns
- Materialized views for dashboard queries only
- No ETL logic in warehouse DDL
- PII columns masked with row-level security or views
- Cost allocation by tag/label per team or use case
- Implement partition retention for all fact tables
- Document grain explicitly in every fact table definition

## References
- `references/warehouse-platforms.md` — Snowflake, BigQuery, Redshift, Databricks SQL, platform-specific features, auto-scaling, sizing, slots
- `references/modeling-optimization.md` — Star schema, snowflake, fact/dimension tables, SCD, partitioning, clustering, materialized views, query optimization, cost management
- `references/clickhouse-analytics.md` — ClickHouse MergeTree engines, vectorized execution, materialized views, distributed queries, performance tuning
- `references/timescaledb-druid.md` — TimescaleDB hypertables, compression, continuous aggregates; Druid segments, rollup, real-time ingestion

## Handoff
`data-etl-pipeline` for loading data into the warehouse schema
`data-bi-tools` for connecting dashboards to the data model
