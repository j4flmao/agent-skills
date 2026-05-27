# Database Indexing Reference

## Index Types

### B-Tree Index (Default)

```sql
-- Default index type, good for equality and range queries
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- Multi-column (composite) index for combined queries
CREATE INDEX idx_orders_customer_status ON orders(customer_id, status);

-- Partial index for frequently filtered subset
CREATE INDEX idx_orders_active ON orders(created_at) WHERE status != 'cancelled';
```

### Unique Index

```sql
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE UNIQUE INDEX idx_orders_reference ON orders(reference_code) WHERE reference_code IS NOT NULL;
```

### Hash Index

```sql
-- Only equality lookups, smaller than B-tree
CREATE INDEX idx_sessions_token ON sessions USING hash(token);
```

### GIN Index (Full Text Search)

```sql
-- Full-text search on JSONB or text arrays
CREATE INDEX idx_products_tags ON products USING gin(tags);
CREATE INDEX idx_products_search ON products USING gin(to_tsvector('english', name || ' ' || description));
```

### BRIN Index

```sql
-- For very large tables with naturally ordered data
CREATE INDEX idx_orders_created_brin ON orders USING brin(created_at) WITH (pages_per_range = 32);
```

## Indexing Strategy

```sql
-- Single column indexes
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_customer ON orders(customer_id);

-- Composite index for common query patterns
CREATE INDEX idx_orders_customer_status_created 
  ON orders(customer_id, status, created_at DESC);

-- Index with included columns (covering index)
CREATE INDEX idx_orders_covering 
  ON orders(customer_id) 
  INCLUDE (status, total, created_at);
```

## Query Analysis

```sql
-- Check query plan
EXPLAIN ANALYZE
SELECT * FROM orders 
WHERE customer_id = 'cust-123' 
  AND status = 'pending'
ORDER BY created_at DESC 
LIMIT 20;

-- Identify missing indexes
SELECT * FROM pg_stat_user_tables 
WHERE seq_scan > 1000 
  AND seq_scan > idx_scan;
```

## Index Maintenance

```sql
-- Rebuild indexes (PostgreSQL)
REINDEX INDEX idx_orders_created_at;
REINDEX TABLE orders;

-- Concurrent rebuild without locking
REINDEX INDEX CONCURRENTLY idx_orders_customer_id;

-- Analyze for query planner
ANALYZE orders;

-- Remove unused indexes
DROP INDEX IF EXISTS idx_orders_old_field;
```

## Performance Considerations

```sql
-- Avoid function calls on indexed columns
-- BAD: prevents index usage
SELECT * FROM orders WHERE DATE(created_at) = '2024-01-01';

-- GOOD: uses index
SELECT * FROM orders 
WHERE created_at >= '2024-01-01' 
  AND created_at < '2024-01-02';

-- Partial indexes for common filters
CREATE INDEX idx_orders_unpaid ON orders(created_at) WHERE status IN ('pending', 'overdue');
```

## Key Points

- B-Tree indexes for equality and range queries
- Composite indexes match combined WHERE clause patterns
- Partial indexes save space for subset queries
- Covering indexes with INCLUDE avoid table lookups
- GIN indexes enable full-text search and JSON queries
- BRIN indexes suit large, append-only tables
- EXPLAIN ANALYZE verifies index usage
- REINDEX CONCURRENTLY rebuilds without blocking writes
- Avoid wrapping indexed columns in functions
- Remove unused indexes to reduce write overhead
