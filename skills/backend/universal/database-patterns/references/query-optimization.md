# Database Query Optimization Guide

## Index Strategy
- Index columns used in WHERE, JOIN, ORDER BY, GROUP BY
- Composite indexes: order by cardinality (high cardinality first)
- Covering indexes for frequent queries (include all selected columns)
- Avoid over-indexing — each index slows writes
- Monitor unused indexes with `pg_stat_user_indexes`

```sql
-- Good composite index
CREATE INDEX idx_orders_user_created ON orders (user_id, created_at DESC)

-- Covering index
CREATE INDEX idx_orders_status_covering ON orders (status) INCLUDE (total, currency)
```

## N+1 Query Prevention
```typescript
// BAD — N+1: 1 query for users + N queries for orders
const users = await db.user.findMany()
for (const user of users) {
  user.orders = await db.order.findMany({ where: { userId: user.id } })
}

// GOOD — 2 queries total
const users = await db.user.findMany({ include: { orders: true } })
```

## Pagination Patterns
```typescript
// Offset pagination (simple, but slow on large offsets)
SELECT * FROM orders ORDER BY id LIMIT 20 OFFSET 40

// Cursor-based pagination (stable, fast)
SELECT * FROM orders WHERE created_at < $1 ORDER BY created_at DESC LIMIT 20
```

## EXPLAIN PLAN Analysis

| Term | Meaning | Red Flag |
|------|---------|----------|
| Seq Scan | Full table scan | Missing index |
| Index Scan | Index lookup | OK |
| Index Only Scan | All data in index | Best |
| Nested Loop | Row-by-row join | May be slow on large sets |
| Hash Join | Hash-based join | OK for large sets |
| Sort | Sort operation | May need index |
