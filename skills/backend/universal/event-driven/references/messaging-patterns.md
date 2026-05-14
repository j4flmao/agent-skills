# Messaging & Event-Driven Patterns

## Event Types

| Type | Description | Example |
|------|-------------|---------|
| **Command** | Do something (expects result) | `PlaceOrder` |
| **Event** | Something happened (fire-and-forget) | `OrderPlaced` |
| **Query** | Request data (expects result) | `GetOrderStatus` |

## Event Schema

```json
{
  "id": "evt_abc123",
  "type": "OrderPlaced",
  "source": "order-service",
  "specversion": "1.0",
  "time": "2026-05-14T10:30:00Z",
  "subject": "order-789",
  "datacontenttype": "application/json",
  "data": {
    "orderId": "order-789",
    "userId": "user-456",
    "total": 2999,
    "currency": "USD"
  }
}
```

## Consumer Idempotency
```typescript
async function handleOrderPlaced(event: CloudEvent<OrderPlacedData>) {
  const existing = await db.processedEvents.findUnique({ where: { eventId: event.id } })
  if (existing) return // already processed
  await db.$transaction([
    db.processedEvents.create({ data: { eventId: event.id } }),
    db.inventory.update({ where: { productId: event.data.productId }, data: { quantity: { decrement: 1 } } }),
  ])
}
```

## Retry & Dead Letter
- Retry 3 times with exponential backoff (1s, 4s, 16s)
- After max retries, move to dead-letter queue
- Monitor DLQ and alert on non-empty state

## Outbox Pattern
```typescript
// Write event to outbox table in same DB transaction as business operation
await db.$transaction([
  db.order.create({ data: orderData }),
  db.outbox.create({ data: { type: 'OrderPlaced', payload: orderEvent } }),
])
// Separate process reads outbox and publishes to message broker
```
