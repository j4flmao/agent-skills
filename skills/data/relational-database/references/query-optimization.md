# Query Optimization

## EXPLAIN ANALYZE

```sql
EXPLAIN (ANALYZE, BUFFERS, TIMING, COSTS)
SELECT o.*, c.name FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.created_at >= '2025-01-01'
ORDER BY o.total DESC LIMIT 100;

-- Look for: Seq Scan (missing index), Nested Loop no inner index,
-- Sort with temp file, Shared Read (disk I/O), estimate vs actual mismatch
```

### Plan Node Types
| Node | What It Means | Fix |
|------|---------------|-----|
| Seq Scan | Full table scan | Add index, partition prune |
| Index Only Scan | All data in index | Add INCLUDE columns |
| Bitmap Heap Scan | Multiple index matches | Increase work_mem |
| Nested Loop | Row-by-row join | Index inner join column |
| Hash Join | Hash table join | Increase work_mem |
| Sort | Explicit sort | Index on sort columns |

### Find Slow Queries
```sql
SELECT queryid, round(total_exec_time::numeric, 2) AS total_ms,
       calls, round(mean_exec_time::numeric, 2) AS avg_ms,
       rows / calls AS avg_rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC LIMIT 20;
```

## Join Optimization

```sql
-- Bad: filter after join
SELECT * FROM orders o JOIN customers c ON o.customer_id = c.id
WHERE o.status = 'pending' AND c.tier = 'premium';

-- Good: pre-filter in CTE
WITH premium AS NOT MATERIALIZED (
    SELECT * FROM customers WHERE tier = 'premium'
)
SELECT o.*, c.name FROM orders o
JOIN premium c ON o.customer_id = c.id
WHERE o.status = 'pending';
```

## CTE Optimization

```sql
-- Force inline (PG 12+)
WITH filtered AS NOT MATERIALIZED (
    SELECT * FROM orders WHERE status = 'pending'
)
SELECT customer_id, COUNT(*) FROM filtered GROUP BY customer_id;

-- Force materialize (for side-effect CTEs)
WITH filtered AS MATERIALIZED (...) ...
```

## Window Functions

```sql
-- ROWS frame faster than RANGE/GROUPS
SELECT customer_id, total,
       SUM(total) OVER (PARTITION BY customer_id ORDER BY order_date
           ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_total
FROM orders;

-- Filter before window
SELECT * FROM (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY total DESC) AS rn
    FROM orders WHERE created_at >= '2025-01-01'
) sub WHERE rn <= 3;
```

## Statistics Tuning

```sql
ALTER TABLE orders ALTER COLUMN status SET STATISTICS 1000;

CREATE STATISTICS orders_customer_status (dependencies)
    ON customer_id, status FROM orders;

ANALYZE orders;
```

## Planner Hints (pg_hint_plan)

```sql
/*+ HashJoin(o c) IndexScan(o ix_orders_customer) Leading((c o)) */
SELECT o.*, c.name FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.created_at >= '2025-01-01';
```

## Migration Best Practices

### Zero-Downtime
```sql
-- Step 1: Add nullable column
ALTER TABLE orders ADD COLUMN discount DECIMAL(5,2);

-- Step 2: Backfill in batches
DO $$ DECLARE affected INT; BEGIN LOOP
    UPDATE orders SET discount = 0 WHERE discount IS NULL
    AND ctid IN (SELECT ctid FROM orders WHERE discount IS NULL LIMIT 1000);
    GET DIAGNOSTICS affected = ROW_COUNT;
    EXIT WHEN affected = 0; COMMIT; PERFORM pg_sleep(0.1);
END LOOP; END $$;

-- Step 3: Add NOT NULL
ALTER TABLE orders ALTER COLUMN discount SET NOT NULL;

-- Rollback
ALTER TABLE orders ALTER COLUMN discount DROP NOT NULL;
ALTER TABLE orders DROP COLUMN discount;
```

## References
- EXPLAIN docs: https://www.postgresql.org/docs/current/using-explain.html
- pg_stat_statements module documentation
