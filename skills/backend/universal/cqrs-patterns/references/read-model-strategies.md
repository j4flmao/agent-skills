# Read Model Strategies

## Types of Read Models

| Strategy | Latency | Complexity | Use Case |
|----------|---------|------------|----------|
| Inline projection | Real-time | Low | Simple denormalization in same DB |
| Event-driven projection | Near real-time | Medium | Cross-service read models |
| Materialized view | Configurable refresh | Low | SQL-based aggregation |
| CQRS view table | Eventual | Medium | Separate read-optimized table |
| Search index | Near real-time | High | Full-text search, faceted search |
| Cache-aside | On-demand | Low | Hot query results |

## Inline Projection (Same DB)

```sql
CREATE MATERIALIZED VIEW order_summary AS
SELECT
  o.id,
  o.customer_id,
  c.name AS customer_name,
  COUNT(oi.id) AS item_count,
  SUM(oi.quantity * oi.unit_price) AS total,
  o.status,
  o.created_at
FROM orders o
JOIN customers c ON c.id = o.customer_id
JOIN order_items oi ON oi.order_id = o.id
GROUP BY o.id, o.customer_id, c.name, o.status, o.created_at;

CREATE UNIQUE INDEX ON order_summary(id);
```

## Event-Driven Projection

```typescript
class OrderProjection {
  private readStore: IReadStore;

  async onOrderPlaced(event: OrderPlacedEvent): Promise<void> {
    await this.readStore.insert('order_summaries', {
      id: event.data.orderId,
      customerId: event.data.customerId,
      total: event.data.total,
      itemCount: event.data.items.length,
      status: 'pending',
      createdAt: event.occurredAt
    });
  }

  async onOrderShipped(event: OrderShippedEvent): Promise<void> {
    await this.readStore.update('order_summaries', event.data.orderId, {
      status: 'shipped',
      shippedAt: event.occurredAt
    });
  }
}
```

## Cache Strategies

- **Cache-aside**: Read model reads from cache first, falls back to DB, populates cache on miss.
- **Write-through**: Write model updates cache synchronously on event.
- **Write-behind**: Write model queues cache update, applies asynchronously.

## Read Model Consistency

| Level | Delay | Trade-off |
|-------|-------|-----------|
| Strong | None | Cannot use separate read DB |
| Eventual | Seconds | Simple, scalable |
| Read-your-writes | Session | User sees own writes immediately |
| Monotonic | Variable | Reads never go back in time |

## Rebuild Strategy

All read models must be rebuildable from scratch:
1. Clear the read model table/index.
2. Replay all relevant events in order.
3. Apply each event to rebuild the projection.

This is essential for correcting projection bugs and handling schema changes.
