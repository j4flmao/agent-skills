# Relational Database Query Optimization

## Overview

Query optimization is the process of tuning SQL queries and database configuration to minimize response time and resource consumption. This reference covers the complete optimization lifecycle: identifying slow queries, reading execution plans, applying transformations, and measuring improvements.

## Execution Plan Reading

### EXPLAIN Output Anatomy

```sql
EXPLAIN (ANALYZE, BUFFERS, TIMING, COSTS) SELECT ...;
```

Key sections in an execution plan:
- **Node type**: Seq Scan, Index Scan, Index Only Scan, Bitmap Scan, Nested Loop, Hash Join, Merge Join, Sort, Aggregate
- **Startup cost**: estimated work before output begins
- **Total cost**: estimated total work for the node
- **Rows**: estimated rows produced (may differ from actual)
- **Width**: estimated average row width in bytes
- **Actual time**: actual execution time (with ANALYZE)
- **Buffers**: shared hit/read/dirtied/written (with BUFFERS)
- **Loops**: number of times the node executed

### Scan Types

| Scan Type | When Used | Performance |
|---|---|---|
| Seq Scan | Full table scan, no index or high estimate | Slow on large tables |
| Index Scan | B-tree lookup returning few rows, hits heap | Fast for selective queries |
| Index Only Scan | All needed columns in index, no heap visit | Fastest (index-only) |
| Bitmap Heap Scan | Multiple index matches, many heap tuples | Good for moderate selectivity |
| Bitmap Index Scan | Builds bitmap of matching pages | Precursor to Bitmap Heap |
| Tid Scan | Direct tuple ID access (ctid) | Rare, internal use |

### Join Types

| Join Type | Strategy | Best For | Memory |
|---|---|---|---|
| Nested Loop | For each outer row, scan inner. O(n*m) | Small inner, indexed join | Minimal |
| Hash Join | Build hash table on inner, probe with outer. O(n+m) | Medium tables, no index | High (work_mem) |
| Merge Join | Sort both, merge. O(n log n + m log m) | Large tables, pre-sorted | Low |

### Node Cost Interpretation

```
-> Hash Join  (cost=142.35..284.67 rows=1234 width=56)
     Hash Cond: (o.customer_id = c.id)
     -> Seq Scan on orders o  (cost=0.00..82.50 rows=5000 width=32)
     -> Hash  (cost=89.00..89.00 rows=4000 width=24)
           -> Seq Scan on customers c  (cost=0.00..89.00 rows=4000 width=24)
```

Interpretation: Hash Join costs 284.67 total, joining orders (5000 rows, seq scan) with customers (4000 rows, seq scan). The Hash node builds an in-memory hash table from customers. No indexes used -- adding an index on customers.id and orders.customer_id would improve this dramatically.

## Identifying Slow Queries

### Using pg_stat_statements

```sql
-- Top 10 queries by total execution time
SELECT queryid, query,
       total_exec_time / 1000 AS total_seconds,
       calls,
       total_exec_time / calls AS avg_ms,
       rows,
       shared_blks_hit, shared_blks_read,
       temp_blks_written,
       mean_trunc_time
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

-- Queries with most I/O (block reads)
SELECT queryid, query,
       shared_blks_read + local_blks_read AS block_reads,
       calls
FROM pg_stat_statements
ORDER BY block_reads DESC
LIMIT 10;
```

### Using auto_explain

```postgresql
# postgresql.conf
shared_preload_libraries = 'auto_explain'
auto_explain.log_min_duration = '5s'  -- log queries > 5 seconds
auto_explain.log_analyze = on
auto_explain.log_buffers = on
auto_explain.log_nested_statements = on
auto_explain.sample_rate = 0.1  -- 10% sample in production
```

### Identifying Common Problems

1. **Sequential scans on large tables**: missing index or wrong query filter.
2. **Nested loop joins without indexes**: inner table must have index on join column.
3. **Excessive tuple deformation**: wide rows, many columns fetched unnecessarily.
4. **Temp file sorts**: sort operations exceeding work_mem spill to disk.
5. **Row estimates far from actual**: stale statistics, need ANALYZE.
6. **Index not used**: low selectivity, wrong statistics, or query pattern mismatch.

## Query Transformation Techniques

### Index-Friendly WHERE Clauses

```sql
-- BAD: function on indexed column prevents index use
WHERE EXTRACT(YEAR FROM created_at) = 2025

-- GOOD: range condition uses index
WHERE created_at >= '2025-01-01' AND created_at < '2026-01-01'

-- BAD: type mismatch
WHERE user_id = '123'  -- user_id is INTEGER

-- GOOD: proper type
WHERE user_id = 123
```

### Reducing Row Count Early

```sql
-- BAD: filter after JOIN
SELECT c.name, COUNT(o.id) FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
WHERE o.created_at > '2025-01-01'
GROUP BY c.id;

-- GOOD: filter before JOIN
SELECT c.name, o.order_count FROM customers c
LEFT JOIN (
    SELECT customer_id, COUNT(*) AS order_count
    FROM orders WHERE created_at > '2025-01-01'
    GROUP BY customer_id
) o ON c.id = o.customer_id;
```

### Avoiding N+1 in ORM

```python
# BAD: N+1 queries
customers = session.query(Customer).all()
for c in customers:
    orders = session.query(Order).filter_by(customer_id=c.id).all()

# GOOD: eager loading
from sqlalchemy.orm import joinedload
customers = session.query(Customer).options(
    joinedload(Customer.orders)
).all()
```

### CTE Optimization

```sql
-- PG 12+: CTEs are inlined by default (no materialization fence)
-- Use NOT MATERIALIZED to ensure inlining (default)
-- Use MATERIALIZED to force materialization for repeated references

-- Inlined (default for simple CTEs):
WITH filtered AS NOT MATERIALIZED (
    SELECT * FROM orders WHERE status = 'shipped'
)
SELECT customer_id, COUNT(*) FROM filtered
WHERE total > 100
GROUP BY customer_id;

-- Materialized (CTE result calculated once, reused):
WITH top_customers AS MATERIALIZED (
    SELECT customer_id, SUM(total) AS lifetime_value
    FROM orders GROUP BY customer_id
    ORDER BY lifetime_value DESC LIMIT 1000
)
SELECT * FROM top_customers
WHERE lifetime_value > 10000;
```

### Window Function Performance

```sql
-- Prefer ROWS over RANGE frame (less work)
-- ROWS: count physical rows
-- RANGE: count rows with values in range (needs sort)

-- ROWS frame (faster):
SELECT customer_id, order_date, total,
       SUM(total) OVER (
           PARTITION BY customer_id
           ORDER BY order_date
           ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
       ) AS running_total
FROM orders;

-- Filter early with subquery before window:
SELECT * FROM (
    SELECT customer_id, order_date, total,
           ROW_NUMBER() OVER (
               PARTITION BY customer_id
               ORDER BY total DESC
           ) AS rn
    FROM orders
    WHERE created_at > '2025-01-01'
) ranked
WHERE rn <= 3;
```

## Advanced Indexing Strategies

### Composite Index Column Order

```sql
-- Rule: equality conditions first, then range conditions
-- Equality: WHERE col1 = 'abc' AND col2 = 'xyz'
-- Range: WHERE col1 = 'abc' AND col2 > 100

-- GOOD: column order matches most common query pattern
CREATE INDEX ix_orders_customer_status_date
    ON orders (customer_id, status, created_at DESC);

-- This index supports:
-- WHERE customer_id = 'abc' AND status = 'shipped' AND created_at > '2025-01-01'
-- WHERE customer_id = 'abc' AND status = 'shipped'
-- WHERE customer_id = 'abc'
-- WHERE customer_id = 'abc' AND created_at > '2025-01-01'  (partial, status not used)
```

### Covering Indexes

```sql
-- Covering index (INCLUDE columns) enables index-only scans
-- Index columns: used for search/ordering
-- INCLUDE columns: returned by query, not in index tree

CREATE INDEX ix_orders_covering
    ON orders (customer_id, created_at DESC)
    INCLUDE (total, status, order_id);

-- This query uses index-only scan (no heap access):
SELECT order_id, total, status
FROM orders
WHERE customer_id = 'abc'
  AND created_at > '2025-01-01';
```

### Partial Indexes

```sql
-- Partial index: only indexes rows matching WHERE condition
-- Smaller index, faster maintenance, targeted queries

-- Index for pending orders only (most queries filter by status)
CREATE INDEX ix_orders_pending_active
    ON orders (created_at DESC)
    WHERE status IN ('pending', 'confirmed');

-- Index for high-value customers
CREATE INDEX ix_orders_high_value
    ON orders (total DESC)
    WHERE total > 1000;

-- Query must include same WHERE condition to use partial index
EXPLAIN SELECT * FROM orders
WHERE status = 'pending' AND created_at > '2025-01-01';
-- Uses ix_orders_pending_active
```

## Vacuum and Bloat Management

### Autovacuum Tuning

```postgresql
# Global defaults
autovacuum_max_workers = 3
autovacuum_naptime = '1min'
autovacuum_vacuum_threshold = 50
autovacuum_vacuum_scale_factor = 0.2    # 20% of table
autovacuum_analyze_scale_factor = 0.1   # 10% of table

# Per-table overrides for write-heavy tables
ALTER TABLE orders SET (
    autovacuum_vacuum_scale_factor = 0.01,  -- 1% of table
    autovacuum_vacuum_threshold = 1000,      -- minimum dead tuples
    autovacuum_analyze_scale_factor = 0.05,
    autovacuum_vacuum_cost_limit = 2000      -- more aggressive
);
```

### Monitoring Bloat

```sql
-- Table bloat estimation
SELECT schemaname, tablename,
       n_dead_tup,
       n_live_tup,
       round(100.0 * n_dead_tup / NULLIF(n_live_tup, 0), 1) AS dead_pct,
       last_autovacuum,
       last_autoanalyze
FROM pg_stat_user_tables
WHERE n_live_tup > 10000
ORDER BY n_dead_tup DESC;

-- Index bloat estimation (approximate)
SELECT schemaname, tablename, indexname,
       pg_relation_size(indexrelid) / 1024 / 1024 AS index_size_mb,
       idx_scan,
       idx_tup_read,
       idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND indexname NOT LIKE '%pk_%'
ORDER BY pg_relation_size(indexrelid) DESC;
```

## Memory and Configuration

### Key PostgreSQL Memory Settings

```postgresql
# For a dedicated server with 64GB RAM
shared_buffers = '16GB'                  # 25% of RAM
effective_cache_size = '48GB'            # 75% of RAM
work_mem = '64MB'                        # per operation, per session
maintenance_work_mem = '2GB'             # for VACUUM, CREATE INDEX
wal_buffers = '64MB'
wal_level = 'replica'
max_wal_size = '8GB'
min_wal_size = '2GB'

# Planner settings for SSD storage
random_page_cost = 1.1                   # default 4.0 (HDD)
effective_io_concurrency = 200           # SSD can handle high concurrency
```

### Connection Pool Sizing

```
max_connections in postgresql.conf: typically 100-500
PgBouncer default_pool_size: 20-50 per database

Formula for pool size:
  pool_size = (max_expected_concurrent_queries * avg_query_time_seconds) / 60

Example: 500 concurrent users, avg query 200ms
  pool = (500 * 0.2) / 60  = ~2 (but minimum 20 for bursts)

Rule of thumb:
  - 4-8 connections per CPU core
  - Max 50 connections to a single database
  - Reserve 5 connections for admin/utility queries
```

## Parallel Query Configuration

```postgresql
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
parallel_tuple_cost = 0.01
parallel_setup_cost = 1000.0
min_parallel_table_scan_size = '8MB'
min_parallel_index_scan_size = '512MB'

# Per-table control
ALTER TABLE large_table SET (parallel_workers = 4);
```

## Query Optimization Workflow

### Systematic Optimization Process

```
1. Identify slow query
   ├── pg_stat_statements (top by time)
   ├── auto_explain (queries > threshold)
   └── application monitoring (APM traces)

2. Capture EXPLAIN ANALYZE
   ├── Include BUFFERS, TIMING
   └── Run multiple times, use warm cache

3. Identify bottleneck
   ├── Seq scan on large table → index needed
   ├── Nested loop w/o index → missing join index
   ├── Sort with temp file → increase work_mem or index
   ├── Rows estimate off → ANALYZE or extended stats
   └── Bitmap scan → query too broad, change approach

4. Apply fix
   ├── Add/modify index
   ├── Rewrite query
   ├── Add query hint (if absolutely needed)
   └── Adjust configuration

5. Measure improvement
   ├── Collect new EXPLAIN ANALYZE
   ├── Compare before/after timing
   └── Verify in production (if safe)

6. Document
   ├── What was slow, what was changed, what improved
   └── Update query performance baseline
```

### Example Optimization

Slow query (5.2s):
```sql
SELECT c.name, c.email, COUNT(o.id) AS order_count, SUM(o.total) AS total_spent
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
WHERE c.created_at > '2024-01-01'
  AND o.status = 'completed'
GROUP BY c.id;
```

EXPLAIN ANALYZE reveals: Seq Scan on orders (2M rows), Hash Join, sort for GROUP BY.

Fixes:
```sql
-- 1. Add index on orders (customer_id, status)
CREATE INDEX ix_orders_cust_status ON orders (customer_id, status)
    INCLUDE (total);

-- 2. Add index on customers (created_at)
CREATE INDEX ix_customers_created ON customers (created_at);

-- 3. Filter before aggregation
SELECT c.name, c.email, o.order_count, o.total_spent
FROM customers c
LEFT JOIN (
    SELECT customer_id,
           COUNT(*) AS order_count,
           SUM(total) AS total_spent
    FROM orders
    WHERE status = 'completed'
    GROUP BY customer_id
) o ON c.id = o.customer_id
WHERE c.created_at > '2024-01-01';
```

After optimization: 45ms (115x improvement).

## Materialized Views

```sql
-- Create materialized view for expensive aggregations
CREATE MATERIALIZED VIEW mv_customer_metrics AS
SELECT c.id AS customer_id,
       c.name,
       COUNT(o.id) AS lifetime_orders,
       SUM(o.total) AS lifetime_value,
       MAX(o.created_at) AS last_order_date,
       AVG(o.total) AS avg_order_value
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
GROUP BY c.id;

-- Refresh (with CONCURRENTLY for zero downtime)
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_customer_metrics;

-- Index the materialized view
CREATE UNIQUE INDEX idx_mv_customer_id ON mv_customer_metrics (customer_id);

-- Query the materialized view
SELECT * FROM mv_customer_metrics
WHERE lifetime_value > 10000
ORDER BY lifetime_value DESC;
```

## SQL Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| SELECT * | Fetches unnecessary columns, prevents index-only scans | List required columns |
| Implicit type conversion | Prevents index use | Explicit CAST |
| OR conditions | Complex index matching | UNION ALL with separate indexes |
| NOT IN | Subquery evaluated for every row | NOT EXISTS (correlated) |
| IS NOT NULL on indexed column | Most DBs treat NULL separately | Consider partial index |
| Functions in WHERE | Prevents index use (unless expression index) | Expression index or refactor |
| Non-sargable predicates | Hides index-compatible condition | Rewrite as range query |

```sql
-- Anti-pattern: OR prevents composite index use
SELECT * FROM orders
WHERE customer_id = 'abc' OR status = 'pending';

-- Fix: UNION ALL allows each branch to use separate index
SELECT * FROM orders WHERE customer_id = 'abc'
UNION ALL
SELECT * FROM orders WHERE status = 'pending' AND customer_id <> 'abc';

-- Anti-pattern: NOT IN subquery
SELECT * FROM customers
WHERE id NOT IN (SELECT customer_id FROM orders);

-- Fix: NOT EXISTS (performs better with NULL handling)
SELECT * FROM customers c
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);
```

## Statistics and Extended Statistics

```sql
-- Update statistics
ANALYZE orders;

-- Extended statistics for correlated columns
CREATE STATISTICS s_orders_city_status (dependencies)
    ON city, status FROM orders;

CREATE STATISTICS s_orders_revenue_segment (ndistinct)
    ON revenue_tier, customer_segment FROM customers;

-- Check statistics
SELECT * FROM pg_stats WHERE tablename = 'orders' AND attname = 'customer_id';
```

## References

- Database indexing reference
- PostgreSQL advanced internals
- Database migration strategies
- Distributed SQL databases
- CockroachDB and YugabyteDB operational guide
- High availability for relational databases
