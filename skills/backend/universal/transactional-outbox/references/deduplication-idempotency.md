# Deduplication & Idempotency

## Why Deduplication is Required

The transactional outbox pattern guarantees at-least-once delivery. Downstream consumers MUST handle duplicates.

## Consumer-Side Deduplication

### Event ID Tracking

```typescript
class DeduplicationStore {
  constructor(private db: Database) {}

  async isProcessed(eventId: string): Promise<boolean> {
    const result = await this.db.query(
      'SELECT 1 FROM processed_events WHERE event_id = $1',
      [eventId]
    );
    return result.length > 0;
  }

  async markProcessed(eventId: string): Promise<void> {
    await this.db.query(
      'INSERT INTO processed_events (event_id, processed_at) VALUES ($1, NOW()) ON CONFLICT DO NOTHING',
      [eventId]
    );
  }
}

async function handleEvent(event: Event): Promise<void> {
  if (await dedupStore.isProcessed(event.id)) return;
  await processBusinessLogic(event);
  await dedupStore.markProcessed(event.id);
}
```

### Processed Events Table

```sql
CREATE TABLE processed_events (
  event_id UUID PRIMARY KEY,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- TTL: auto-delete after 7 days
CREATE INDEX idx_processed_events_ttl ON processed_events(processed_at);
-- Cleanup job
DELETE FROM processed_events WHERE processed_at < NOW() - INTERVAL '7 days';
```

## Idempotency Key Patterns

### Business Key Deduplication

Instead of eventId, use a business key for deduplication:

```typescript
async function handleOrderPlaced(event: OrderPlacedEvent): Promise<void> {
  // Use orderId as the business key
  const existing = await orderRepo.findByOrderId(event.data.orderId);
  if (existing) return;

  await orderRepo.create(event.data);
}
```

### Exactly-Once Processing

For exactly-once semantics, use the database transaction to atomically check-and-process:

```typescript
async function handlePaymentEvent(event: PaymentEvent): Promise<void> {
  await db.transaction(async (tx) => {
    // Check — within the same transaction
    const processed = await tx.query(
      'SELECT 1 FROM payments WHERE event_id = $1 FOR UPDATE',
      [event.id]
    );
    if (processed.length > 0) return;

    // Process
    await tx.query(
      'INSERT INTO payments (order_id, amount, event_id) VALUES ($1, $2, $3)',
      [event.data.orderId, event.data.amount, event.id]
    );
  });
}
```

## Comparison

| Method | Guarantee | Storage | Latency | Use Case |
|--------|-----------|---------|---------|----------|
| Event ID store | At-most-once | Separate table | Low | General purpose |
| Business key | Idempotent | Business table | Low | Natural key exists |
| DB transaction | Exactly-once | Business table | Medium | Payment, critical ops |
| Idempotency key | Exactly-once | Key-value store | Low | API endpoints |

## Best Practices

- Every consumer starts with deduplication. Add it before any business logic.
- Deduplication state has a TTL matching the maximum expected duplicate delivery window.
- Log duplicate events at debug level — they are normal in at-least-once systems.
- Test duplicate delivery by replaying events in integration tests.
- Monitor deduplication rate to detect excessive re-deliveries.
