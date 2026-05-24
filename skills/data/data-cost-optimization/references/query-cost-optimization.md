# Query Cost Optimization Reference

## Query Profiling

Understanding query cost starts with profiling. Every major data platform provides query-level cost visibility.

### Snowflake Query Profiling

```sql
-- Find most expensive queries by credits
SELECT
    query_id,
    query_text,
    warehouse_name,
    warehouse_size,
    credits_used_cloud_services,
    execution_time / 1000 AS execution_seconds,
    partitions_scanned,
    bytes_scanned,
    bytes_spilled_to_storage,
    compilation_time / 1000 AS compilation_seconds
FROM snowflake.account_usage.query_history
WHERE start_time >= DATEADD('day', -7, CURRENT_TIMESTAMP())
ORDER BY credits_used_cloud_services DESC
LIMIT 50;

-- By user
SELECT
    user_name,
    COUNT(*) AS query_count,
    SUM(credits_used_cloud_services) AS total_credits,
    SUM(bytes_scanned) / 1e12 AS total_tb_scanned,
    ROUND(SUM(credits_used_cloud_services) * 2.0, 2) AS estimated_cost
FROM snowflake.account_usage.query_history
WHERE start_time >= DATEADD('day', -30, CURRENT_TIMESTAMP())
GROUP BY user_name
ORDER BY total_credits DESC;

-- By warehouse
SELECT
    warehouse_name,
    AVG(credits_used_cloud_services) AS avg_credits_per_query,
    COUNT(*) AS query_count,
    SUM(credits_used_cloud_services) AS total_credits
FROM snowflake.account_usage.query_history
WHERE start_time >= DATEADD('day', -30, CURRENT_TIMESTAMP())
GROUP BY warehouse_name
ORDER BY total_credits DESC;
```

### BigQuery Query Profiling

```sql
-- Slot usage by query
SELECT
    job_id,
    query,
    user_email,
    total_slot_ms,
    total_bytes_billed,
    total_bytes_processed,
    TIMESTAMP_DIFF(end_time, start_time, MILLISECOND) AS execution_ms,
    error_result
FROM `region-US`.INFORMATION_SCHEMA.JOBS_BY_PROJECT
WHERE creation_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
ORDER BY total_slot_ms DESC
LIMIT 50;

-- Cost per query (BigQuery charges $5 per TB processed)
SELECT
    query,
    total_bytes_processed / 1e12 AS terabytes_processed,
    ROUND(total_bytes_processed / 1e12 * 5, 2) AS estimated_cost_usd,
    user_email
FROM `region-US`.INFORMATION_SCHEMA.JOBS_BY_PROJECT
WHERE creation_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
ORDER BY total_bytes_processed DESC
LIMIT 20;
```

## Materialized Views

Materialized views pre-compute and store query results for repeated use.

### When to Use Materialized Views

```sql
-- Expensive aggregation run daily by multiple teams
CREATE MATERIALIZED VIEW mv_daily_sales
AS
SELECT
    DATE_TRUNC('day', order_date) AS day,
    product_id,
    customer_tier,
    COUNT(*) AS order_count,
    SUM(amount) AS total_revenue,
    COUNT(DISTINCT customer_id) AS unique_customers
FROM orders
GROUP BY day, product_id, customer_tier;

-- Query against MV (much cheaper than scanning raw orders)
SELECT day, SUM(total_revenue) AS daily_revenue
FROM mv_daily_sales
WHERE day >= CURRENT_DATE - 30
GROUP BY day
ORDER BY day;
```

### Materialized View Considerations

| Factor | Recommendation |
|--------|---------------|
| Refresh frequency | Match query frequency (hourly, daily) |
| Granularity | Slightly finer than typical queries |
| Cost savings | 10-100x cheaper than source scans |
| Storage cost | Additional but minimal vs compute savings |
| Staleness | Acceptable for most analytical use cases |

### Snowflake Materialized Views

```sql
CREATE MATERIALIZED VIEW mv_monthly_agg
AS
SELECT
    DATE_TRUNC('month', order_date) AS month,
    customer_segment,
    COUNT(*) AS order_count,
    SUM(amount) AS revenue
FROM orders
GROUP BY month, customer_segment;

-- MV auto-refreshes when base data changes
-- You cannot write to MV directly; it's a service
-- MV uses its own credits for refresh

-- Check MV refresh credits
SELECT *
FROM snowflake.account_usage.materialized_view_refresh_history
WHERE materialized_view_name = 'MV_MONTHLY_AGG';
```

## Clustering and Sorting Keys

Clustering organizes data within partitions to minimize data scanned.

### Snowflake Clustering

```sql
-- Before clustering: full table scan
SELECT customer_id, SUM(amount)
FROM orders
WHERE order_date >= '2026-01-01'
  AND customer_id = 'CUST-001';

-- After clustering on frequently filtered columns
ALTER TABLE orders CLUSTER BY (order_date, customer_id);

-- Check clustering status
SELECT *
FROM TABLE(information_schema.clustering_information('orders'))
WHERE predicate_columns = 'ORDER_DATE, CUSTOMER_ID';

-- Clustering cost (credits consumed by auto-clustering)
SELECT *
FROM snowflake.account_usage.automatic_clustering_history
WHERE table_name = 'ORDERS';
```

### BigQuery Clustering

```sql
-- BigQuery clustering (partition-first, then cluster)
CREATE TABLE orders
PARTITION BY DATE(order_date)
CLUSTER BY customer_id, order_status
AS SELECT * FROM raw_orders;

-- Partition filter required for cost control
-- Queries without partition filter scan all partitions
SELECT *
FROM orders
WHERE order_date >= '2026-01-01'             -- Partition pruning
  AND customer_id IN ('CUST-001', 'CUST-002') -- Cluster pruning
LIMIT 100;
```

## Partitioning Strategies

### Partition Scheme Comparison

| Strategy | When | Pros | Cons |
|----------|------|------|------|
| Date partition | Time-range queries, data lifecycle | Easy pruning, partition management | 365+ partitions per year |
| Integer partition | Customer ID ranges | Even distribution | Not time-range queryable |
| List partition | Region, category | Simple, intuitive | Skew risk |
| Composite | Date + category | Best pruning | More partitions |

### Partition Pattern

```sql
-- Snowflake: partition by date
CREATE OR REPLACE TABLE orders (
    order_id STRING,
    customer_id STRING,
    order_date DATE,
    amount DECIMAL(10,2),
    status STRING
)
CLUSTER BY (order_date)
-- Snowflake auto-clustering handles the rest

-- BigQuery: require partition filter
CREATE TABLE orders
PARTITION BY DATE(order_date)
CLUSTER BY customer_id
OPTIONS(require_partition_filter=true)
AS SELECT * FROM raw_orders;
```

## Compression Trade-offs

### Compression Codec Comparison

```yaml
compression:
  snappy:
    ratio: 2x
    speed: fastest
    cpu: low
    use_case: "General purpose, balance of speed and size"

  zstd:
    ratio: 3-5x
    speed: fast
    cpu: moderate
    use_case: "Best trade-off for most workloads"

  gzip:
    ratio: 4-5x
    speed: slow
    cpu: high
    use_case: "Archival, cold data"

  lz4:
    ratio: 1.5-2x
    speed: fastest
    cpu: lowest
    use_case: "Write-heavy, speed-critical"
```

### Storage Cost vs Query Cost

```
Compression Ratio = Storage Savings vs CPU Cost

Higher compression:
  + Less storage cost
  + Less I/O (faster scans)
  - More CPU for decompression
  - Slower writes

Lower compression:
  + Faster writes
  + Less CPU for decompression
  - More storage cost
  - More I/O (slower scans)

Rule: Use ZSTD for analytical workloads (best balance)
      Use LZ4 for streaming/write-heavy
      Use GZIP for archival cold data
```

### Choosing Compression in Practice

```sql
-- Snowflake: compression is automatic
-- You don't choose a codec; Snowflake optimizes internally

-- BigQuery: compression is automatic

-- Parquet files (self-managed)
CREATE TABLE orders
USING PARQUET
OPTIONS (
    compression = 'zstd',
    compression_level = 22  -- Max compression
)
AS SELECT * FROM raw_orders;

-- ORC files
CREATE TABLE orders_optimized
STORED AS ORC
TBLPROPERTIES (
    'orc.compress' = 'ZLIB',
    'orc.compress.size' = '262144'
)
AS SELECT * FROM raw_orders;
```

## Rules
- Profile queries weekly to identify the top 10 most expensive
- Use materialized views for aggregations run more than once daily
- Cluster on columns used in WHERE filters and JOIN keys
- Partition on date columns for time-range pruning
- Force partition filter in BigQuery to prevent full scans
- ZSTD compression for best balance of storage and compute cost
- Replace SELECT * with explicit column lists
- Use approximate functions (APPROX_COUNT_DISTINCT) for large unique counts
- Set auto-suspend to 60 seconds for idle warehouses
- Review and optimize queries before deploying to production
