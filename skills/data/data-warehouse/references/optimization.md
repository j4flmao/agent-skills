# Warehouse Optimization

## Partitioning

### Snowflake
Automatic clustering: enable for tables >1TB. Manual clustering: `ALTER TABLE fact_orders CLUSTER BY (order_date)`. Micro-partition pruning: natural partitioning via data ingestion order. Best for: date-range filtered queries, large fact tables.

### BigQuery
Partition by: `DATE`/`TIMESTAMP` column, ingestion time (`_PARTITIONTIME`), or integer range. Limit: 4000 partitions per table. Syntax: `PARTITION BY DATE(order_date)` for daily partitions. Best for: time-based queries, data lifecycle management.

### Redshift
Distribution style: KEY (hash on join column to colocate), EVEN (round-robin), ALL (full copy on all nodes). Sort key: COMPOUND for multi-column sort order (date, category), INTERLEAVED for equality filters on multiple columns.

### Partition Retention
```sql
-- BigQuery: decorator for partition-level operations
DELETE FROM `project.dataset.fact_orders`
WHERE _PARTITIONTIME < TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 365 DAY);

-- Snowflake: drop partition via DML
DELETE FROM fact_orders WHERE order_date < '2025-01-01';
```

## Clustering

### Snowflake Clustering
Automated: Snowflake manages clustering for large tables. Manual: specify cluster keys for tables where automatic is insufficient. Recluster: `ALTER TABLE fact_orders RECLUSTER;` Cost: credits consumed for clustering, benefit is query performance.

### BigQuery Clustering
Column order: most filtered column first. Up to 4 columns. Clustering order: high-cardinality first (customer_id), then lower (region, status). Autonomous reclustering: no manual intervention. Works with partitioned tables.

### Clustering Key Selection
Choose columns used in: WHERE filters, JOIN conditions, GROUP BY, ORDER BY. High cardinality columns (date, customer ID, order ID). Clustering order: equality filters first, range filters second.

## Materialized Views

### Snowflake
```sql
CREATE MATERIALIZED VIEW mv_daily_sales AS
SELECT
    order_date,
    product_id,
    SUM(quantity) AS total_quantity,
    SUM(total_amount) AS total_revenue,
    COUNT(DISTINCT customer_id) AS unique_customers
FROM fact_orders
GROUP BY order_date, product_id;
```
Refresh: automatic, near real-time. Limitations: no joins, no subqueries, limited SQL functions.

### BigQuery
```sql
CREATE MATERIALIZED VIEW project.dataset.mv_daily_sales AS
SELECT
    order_date,
    product_id,
    SUM(quantity) AS total_quantity,
    SUM(total_amount) AS total_revenue
FROM project.dataset.fact_orders
GROUP BY order_date, product_id;
```
Refresh: periodic (window: 5-30 minutes). Limitations: no UNION, no self-joins, limited DML.

### Materialized View Best Practices
One MV per dashboard or reporting query. Refresh during off-peak hours. Test against base table for consistency. Monitor storage costs (MVs consume storage).

## Query Tuning

### Identify Expensive Queries
- Snowflake: `QUERY_HISTORY` view, `WAREHOUSE_METERING_HISTORY`
- BigQuery: `INFORMATION_SCHEMA.JOBS`, `INFORMATION_SCHEMA.JOBS_TIMELINE`
- Redshift: `STL_QUERY`, `SVL_QUERY_REPORT`, `WLM_QUEUE_STATE_V2`

### Optimization Techniques
- Filter early: push WHERE clauses to subqueries
- Avoid SELECT *: specify needed columns
- Use approximate functions: APPROX_COUNT_DISTINCT, HyperLogLog
- Reduce JOIN complexity: pre-aggregate, use dimension keys
- Use LIMIT with ORDER BY (reduces sort costs)
- Avoid cross-joins and CARTESIAN JOIN

### Common Anti-Patterns
- Joining on non-distribution keys (Redshift data redistribution)
- Selecting too many partitions (BigQuery full table scan)
- Non-selective filtering on non-clustered columns
- Self-joins instead of window functions
- `SELECT *` in production queries

## Cost Management

### Snowflake
- Auto-suspend: `ALTER WAREHOUSE SET AUTO_SUSPEND = 300` (5 min)
- Auto-resume: resumes on query execution
- Warehouse sizing: XS for dev, S-M for prod, L+ for large jobs
- Resource monitors: `CREATE RESOURCE MONITOR monthly_limit WITH CREDIT_QUOTA = 1000`

### BigQuery
- Flat-rate: slot reservations for predictable costs
- On-demand: pay per byte scanned (optimize with clustered tables)
- BI Engine: cache for dashboard queries, reduce slot usage
- Max bytes billed per query: prevent runaway costs

### Redshift
- RA3 nodes: managed storage, compute separated from storage
- Concurrency scaling: handles burst traffic, charges per second
- Spectrum: query S3 data directly for cold data

### Universal
- Drop unused tables and views
- Compress tables (ZSTD default)
- Partition retention: drop old partitions
- Materialized view refresh efficiency
- Query cost tagging by team/project
