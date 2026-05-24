# Federation Query Optimization Reference

## Pushdown Optimization

Pushdown optimization delegates query processing to the source systems, reducing data movement.

### Pushdown Types

```yaml
pushdown_types:
  filter_pushdown:
    description: "Push WHERE clauses to source"
    example: "WHERE order_date >= '2026-01-01' → sent to source DB"
    benefit: "Reduces rows scanned"

  projection_pushdown:
    description: "Push SELECT columns to source"
    example: "SELECT order_id, amount → only read these columns"
    benefit: "Reduces columns transferred"

  aggregation_pushdown:
    description: "Push GROUP BY and aggregates to source"
    example: "GROUP BY customer_id → aggregated at source"
    benefit: "Reduces row count early"

  join_pushdown:
    description: "Push JOIN to source when both tables are in same source"
    example: "Two tables from same PostgreSQL → join runs in PG"
    benefit: "Avoids data transfer between engines"

  limit_pushdown:
    description: "Push LIMIT to source"
    example: "LIMIT 100 → only 100 rows returned"
    benefit: "Minimizes data transfer"

  sort_pushdown:
    description: "Push ORDER BY to source"
    example: "ORDER BY order_date → sorted at source"
    benefit: "Reduces merge sort at coordinator"
```

### Connector Pushdown Configuration

```properties
# Trino: PostgreSQL connector with full pushdown
connector.name=postgresql
connection-url=jdbc:postgresql://pg-prod:5432/analytics
connection-user=${PG_USER}
connection-password=${PG_PASSWORD}

# Pushdown configuration
pushdown_filter_enabled=true
pushdown_aggregation_enabled=true
pushdown_join_enabled=true
pushdown_limit_enabled=true
pushdown_topn_enabled=true

# PostgreSQL-specific pushdown
postgresql.pushdown.filter.enabled=true
postgresql.pushdown.aggregation.enabled=true
postgresql.pushdown.join.enabled=true
postgresql.pushdown.table.optimization.enabled=true
```

### Pushdown Verification

```sql
-- Verify pushdown is working: check EXPLAIN ANALYZE output
EXPLAIN ANALYZE
SELECT
    customer_id,
    COUNT(*) AS order_count,
    SUM(amount) AS total_revenue
FROM postgresql.analytics.orders
WHERE order_date >= DATE '2026-01-01'
GROUP BY customer_id
ORDER BY total_revenue DESC
LIMIT 10;

-- Look for "RemoteSource" or "connector" in query plan
-- If pushdown is working: WHERE, GROUP BY, ORDER BY, LIMIT should show as delegated
```

## Statistics-Based Optimization

Statistics help the query optimizer choose efficient execution plans.

### Statistics Collection

```sql
-- Trino: collect table statistics
ANALYZE postgresql.analytics.orders;
ANALYZE hive.analytics.customers;
ANALYZE iceberg.analytics.events;

-- Show table statistics
SHOW STATS FOR postgresql.analytics.orders;

-- Per-column statistics
SHOW STATS FOR (
    SELECT order_id, customer_id, amount, status
    FROM postgresql.analytics.orders
);
```

### Statistics Configuration

```properties
# Trino statistics config
statistics.sql-parser.enabled=true
statistics.cache.enabled=true
statistics.cache.size=10000
statistics.cache.ttl=30m

# Connector-specific statistics
hive.statistics-enabled=true
hive.collect-column-statistics-on-write=true

# Iceberg statistics (automatic with Iceberg)
iceberg.statistics-enabled=true
```

### Cost-Based Join Selection

```sql
-- Without statistics: Trino may choose suboptimal join order
-- With statistics: optimizer picks smallest table as build side

-- Example query that benefits from statistics
SELECT
    c.customer_name,
    c.customer_segment,
    o.order_id,
    o.amount
FROM postgresql.analytics.customers c
JOIN hive.analytics.orders o ON c.customer_id = o.customer_id
WHERE o.order_date >= DATE '2026-01-01';

-- With statistics, if customers has 10K rows and daily orders has 500K rows:
-- customers is broadcast (build side), orders is partitioned (probe side)
```

## Caching Federation Queries

### Result Caching

```properties
# Trino result caching
cache.enabled=true
cache.ttl=5m
cache.max-size=10000
cache.data-tier=memory

# Starburst Caching (enterprise feature)
starburst.cache.enabled=true
starburst.cache.base-directory=/mnt/ssd/cache
starburst.cache.max-ttl=2h
starburst.cache.max-sizes=500GB
```

### Materialized Views in Federation

```sql
-- Trino materialized views (Starburst)
CREATE MATERIALIZED VIEW analytics.daily_orders
AS
SELECT
    order_date,
    customer_segment,
    COUNT(*) AS order_count,
    SUM(amount) AS total_revenue
FROM postgresql.analytics.orders o
JOIN hive.analytics.customers c ON o.customer_id = c.customer_id
GROUP BY order_date, customer_segment;

-- Refresh
REFRESH MATERIALIZED VIEW analytics.daily_orders;

-- Query against MV (much faster)
SELECT * FROM analytics.daily_orders
WHERE order_date >= CURRENT_DATE - 7;
```

## Query Rewriting

### Automatic Query Rewrites

```yaml
optimization_rules:
  predicate_pushdown:
    description: "Move filters closer to data sources"
    example: "WHERE amount > 100 → pushed to source connector"

  projection_pruning:
    description: "Remove unused columns from query plans"
    example: "SELECT * → only read needed columns"

  common_sub_expression:
    description: "Cache and reuse identical sub-expressions"
    example: "COUNT(DISTINCT user_id) appears twice → computed once"

  decorrelation:
    description: "Convert correlated subqueries to JOINs"
    example: "WHERE EXISTS (SELECT ...) → LEFT SEMI JOIN"

  union_merge:
    description: "Merge compatible UNION queries"
    example: "UNION ALL with same schema → single scan"
```

### Manual Query Rewriting

```sql
-- Before: correlated subquery (inefficient)
SELECT customer_id, customer_name
FROM hive.analytics.customers c
WHERE EXISTS (
    SELECT 1 FROM postgresql.analytics.orders o
    WHERE o.customer_id = c.customer_id
      AND o.amount > 1000
);

-- After: semi-join (more efficient)
SELECT c.customer_id, c.customer_name
FROM hive.analytics.customers c
SEMI JOIN postgresql.analytics.orders o
    ON c.customer_id = o.customer_id
    AND o.amount > 1000;

-- Before: SELECT * (transfers unnecessary data)
SELECT * FROM postgresql.analytics.orders
WHERE order_date >= '2026-01-01';

-- After: explicit column list
SELECT order_id, customer_id, amount, order_date
FROM postgresql.analytics.orders
WHERE order_date >= '2026-01-01';
```

## Join Strategies

### Cross-Source Join Optimization

```sql
-- Broadcast join: small table sent to all workers
-- Use when one table is much smaller
SELECT /*+ broadcast(c) */
    c.customer_name,
    o.order_id,
    o.amount
FROM postgresql.analytics.customers c
JOIN hive.analytics.orders o ON c.customer_id = o.customer_id;

-- Partitioned join: both tables partitioned by join key
-- Use when both tables are large
SELECT /*+ partitioned(o) */
    c.customer_name,
    o.order_id,
    o.amount
FROM postgresql.analytics.customers c
JOIN hive.analytics.orders o ON c.customer_id = o.customer_id;

-- Dynamic filtering: use filter from one side to prune other side
-- Enable in Trino:
SET SESSION enable_dynamic_filtering = true;

SELECT
    c.customer_name,
    o.order_id
FROM postgresql.analytics.customers c
JOIN hive.analytics.orders o ON c.customer_id = o.customer_id
WHERE c.region = 'EMEA';
-- Dynamic filter: orders.customer_id IN (SELECT customer_id FROM customers WHERE region = 'EMEA')
```

### Join Configuration

```properties
# Trino join configuration
join-distribution-type=AUTOMATIC
enable-dynamic-filtering=true
dynamic-filtering-max-size=1MB
dynamic-filtering-max-per-driver-row-count=100
dynamic-filtering-max-per-driver-size=10KB
```

## Rules
- Enable filter pushdown on all connectors
- Collect statistics regularly for cost-based optimization
- Use result caching for repetitive queries (5-minute TTL for frequently accessed data)
- Prefer broadcast join for small dimensions, partitioned join for large fact tables
- Enable dynamic filtering to reduce scanned data in multi-table queries
- Materialized views for frequent cross-source aggregations
- Rewrite correlated subqueries as semi-joins
- Always use explicit column lists, never SELECT * in federated queries
- Monitor pushdown effectiveness — if pushdown is not happening, check connector config
- Set appropriate join distribution strategy based on table sizes
