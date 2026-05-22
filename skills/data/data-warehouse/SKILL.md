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

## Workflow

### Step 1: Dimensional Modeling
Star schema: one fact table per business process, dimensions around it. Snowflake: normalized dimensions for large hierarchies. Fact types: transaction (additive, one row per event), periodic snapshot (state at interval), cumulative snapshot (process tracking). Grain: most atomic level — transaction ID, line item, event timestamp. Naming: `fact_orders`, `dim_customers`, `dim_products`, `dim_dates`.

### Step 2: Fact Table Design
Columns: foreign keys to dimensions (surrogate keys), additive measures (quantity, amount, count), degenerate dimensions (order number, transaction ID), date/time stamps. Partition key: date (daily or monthly grain). Distribution: hash-distribute on large dimensions for collocated joins. Clustering: sort by date + frequently filtered dimension.

### Step 3: Dimension Table Design
SCD Type 0: fixed (original values). Type 1: overwrite (no history). Type 2: add new row with `valid_from`, `valid_to`, `is_current` (full history). Type 3: add column (limited history). Conformed dimensions: shared across fact tables (date, customer, product). Junk dimension: small flags and indicators. Role-playing: same dimension used differently (order_date vs ship_date).

### Step 4: Partitioning and Clustering
Snowflake: clustering on high-cardinality filter columns (date, customer ID). Automatic clustering for large tables. BigQuery: partition by DATE/TIMESTAMP column, cluster by frequently filtered columns. Redshift: distribution style (KEY on join columns, ALL for small dims), sort key (compound for multi-column, interleaved for equality). Partition retention: drop old partitions after 90-365 days.

### Step 5: Materialized Views
Use for: pre-aggregated metrics, commonly joined tables, complex window functions. Refresh: Snowflake (automatic, interval), BigQuery (manual, periodic), Redshift (refresh after base table load). Limitations: no joins in some platforms, incremental refresh constraints. Design: one MV per dashboard source, refresh during off-peak window.

### Step 6: Cost Optimization
Snowflake: auto-suspend warehouse after 5 min idle, use XS/S warehouses for dev, limit concurrent warehouses. BigQuery: slot reservations for predictable workloads, use flat-rate pricing for steady queries. Redshift: concurrency scaling for burst, RA3 nodes for managed storage. Common: compress data (ZSTD), drop unused tables, query optimization (reduce scanned bytes).

## Rules
- Star schema as default, snowflake for deep hierarchies
- Fact tables at most granular level
- SCD Type 2 for dimensions needing history
- Partition on date column, cluster on filter columns
- Materialized views for dashboard queries only
- No ETL logic in warehouse DDL
- PII columns masked with row-level security or views
- Cost allocation by tag/label per team or use case

## References
- `references/modeling.md` — Star schema, snowflake, fact/dimension tables, slowly changing dimensions
- `references/optimization.md` — Partitioning, clustering, materialized views, query tuning, cost management

## Handoff
`data-etl-pipeline` for loading data into the warehouse schema
`data-bi-tools` for connecting dashboards to the data model
