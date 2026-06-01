# Aggregate Reconstruction Deep Dive

## How Aggregate Reconstruction Works

Every time a command is executed on an event-sourced aggregate, the aggregate must be reconstructed from its event stream. This is called **hydration** or **reconstruction**.

```
Command arrives → Load all events for aggregate ID → 
  Create empty aggregate → Apply each event in order → 
  Aggregate now has current state → Execute command → 
  Emit new events → Append to event store
```

## Reconstruction Patterns

### Full Replay (No Snapshot)
```typescript
class AggregateRepository {
  async load<T extends AggregateRoot>(aggregateType: string, aggregateId: string): Promise<T> {
    const events = await this.eventStore.getAggregateEvents(aggregateType, aggregateId);
    if (events.length === 0) throw new NotFoundError(`${aggregateType} ${aggregateId} not found`);

    const aggregate = this.factory.create<T>(aggregateType);
    let version = 0;
    for (const event of events) {
      aggregate.applyEvent(event);
      version = event.metadata.version;
    }
    aggregate.setVersion(version);
    return aggregate;
  }
}
```

### Snapshot-Assisted Reconstruction
```typescript
class SnapshotAggregateRepository {
  async load<T extends AggregateRoot>(
    aggregateType: string,
    aggregateId: string,
    snapshotFrequency: number = 50,
  ): Promise<T> {
    // Try to load from snapshot first
    const snapshot = await this.snapshotRepo.getLatest(aggregateType, aggregateId);

    if (snapshot && (snapshot.version + snapshotFrequency > await this.getLatestVersion(aggregateType, aggregateId))) {
      // Snapshot is recent enough — reconstruct from snapshot + recent events
      return this.loadFromSnapshot<T>(aggregateType, aggregateId, snapshot);
    }

    // Snapshot is stale or doesn't exist — full replay
    return this.loadFullReplay<T>(aggregateType, aggregateId);
  }

  private async loadFromSnapshot<T extends AggregateRoot>(
    aggregateType: string,
    aggregateId: string,
    snapshot: Snapshot,
  ): Promise<T> {
    const aggregate = this.factory.fromSnapshot<T>(aggregateType, snapshot.state);
    aggregate.setVersion(snapshot.version);

    const events = await this.eventStore.getEventsSince(aggregateType, aggregateId, snapshot.version);
    for (const event of events) {
      aggregate.applyEvent(event);
      aggregate.setVersion(event.metadata.version);
    }

    return aggregate;
  }

  private async loadFullReplay<T extends AggregateRoot>(
    aggregateType: string,
    aggregateId: string,
  ): Promise<T> {
    const events = await this.eventStore.getAggregateEvents(aggregateType, aggregateId);
    const aggregate = this.factory.create<T>(aggregateType);
    let version = 0;
    for (const event of events) {
      aggregate.applyEvent(event);
      version = event.metadata.version;
    }
    aggregate.setVersion(version);
    return aggregate;
  }
}
```

## Performance: Full Replay vs Snapshot

| Events | Full Replay | Snapshot (every 50) | Snapshot (every 100) |
|--------|-------------|--------------------|----------------------|
| 10 | ~1ms | ~15ms (snapshot overhead) | ~15ms |
| 50 | ~5ms | ~5ms | ~15ms |
| 100 | ~10ms | ~5ms | ~5ms |
| 1000 | ~100ms | ~10ms | ~10ms |
| 10000 | ~1s | ~50ms | ~25ms |

## Event Ordering During Reconstruction

### Correct Ordering by Version
Events must be applied in strict version order:

```typescript
class EventStore {
  async getAggregateEvents(aggregateType: string, aggregateId: string): Promise<Event[]> {
    const { rows } = await this.db.query(
      `SELECT * FROM event_store
       WHERE aggregate_type = $1 AND aggregate_id = $2
       ORDER BY version ASC`,  // 👈 Critical: ascending version order
      [aggregateType, aggregateId],
    );
    return rows.map(this.rowToEvent);
  }
}
```

### Handling Out-of-Order Event Writes
In distributed systems, events might be written to the event store in non-sequential order. The version constraint prevents this:

```sql
-- The PK (aggregate_type, aggregate_id, version) prevents version gaps or duplicates
INSERT INTO event_store (aggregate_type, aggregate_id, version, ...)
VALUES ('order', 'abc-123', 5, ...)
-- This will fail if version 5 already exists for this aggregate
```

## Event Handler Registration

### Type-Safe Apply Method Pattern
```typescript
abstract class AggregateRoot {
  protected abstract when(event: Event): void;

  applyEvent(event: Event): void {
    this.when(event);
  }
}

class OrderAggregate extends AggregateRoot {
  private state: OrderState;

  protected when(event: Event): void {
    switch (event.eventType) {
      case 'OrderPlaced':
        this.whenOrderPlaced(event as OrderPlacedEvent);
        break;
      case 'PaymentReceived':
        this.whenPaymentReceived(event as PaymentReceivedEvent);
        break;
      case 'OrderShipped':
        this.whenOrderShipped(event as OrderShippedEvent);
        break;
    }
  }

  private whenOrderPlaced(event: OrderPlacedEvent): void {
    this.state = {
      id: event.data.orderId,
      customerId: event.data.customerId,
      status: 'placed',
      items: event.data.items,
      total: event.data.total,
      payments: [],
    };
  }

  private whenPaymentReceived(event: PaymentReceivedEvent): void {
    this.state.payments.push({
      amount: event.data.amount,
      method: event.data.paymentMethod,
    });
    if (this.totalPaid >= this.state.total) {
      this.state.status = 'paid';
    }
  }
}
```

## Event Metadata

### Required Metadata Fields
Every event must carry:
```typescript
interface EventMetadata {
  eventId: string;          // Unique event identifier
  aggregateId: string;      // Aggregate this event belongs to
  aggregateType: string;    // Type of aggregate
  version: number;          // Monotonically increasing version within the aggregate
  timestamp: Date;          // When the event occurred
  correlationId: string;    // Links events that are part of the same operation
  causationId: string;      // Links event to the event/command that caused it
  userId?: string;          // Who performed the action (if applicable)
}
```

### Correlation and Causation
```
Command: PlaceOrder (correlationId: C1)
  └── Event: OrderPlaced (correlationId: C1, causationId: command-id)
       └── Event: PaymentRequested (correlationId: C1, causationId: OrderPlaced-event-id)
            └── Event: PaymentReceived (correlationId: C1, causationId: PaymentRequested-event-id)
```

This chain allows full traceability from command through all resulting events.

## Testing Aggregate Reconstruction

```typescript
describe('OrderAggregate Reconstruction', () => {
  it('reconstructs state from events', () => {
    const events = [
      new OrderPlacedEvent({ orderId: '1', customerId: 'c1', items: [...], total: 100 }),
      new PaymentReceivedEvent({ orderId: '1', amount: 50 }),
      new PaymentReceivedEvent({ orderId: '1', amount: 50 }),
      new OrderShippedEvent({ orderId: '1', tracking: 'TRK123' }),
    ];

    const aggregate = new OrderAggregate();
    events.forEach(e => aggregate.applyEvent(e));

    expect(aggregate.getState().status).toBe('shipped');
    expect(aggregate.getState().totalPaid).toBe(100);
    expect(aggregate.getState().trackingNumber).toBe('TRK123');
  });

  it('handles empty event stream', () => {
    const aggregate = new OrderAggregate();
    expect(aggregate.getState().status).toBe('pending');
  });

  it('throws on command with out-of-date version', async () => {
    // Simulate concurrency conflict
    await expect(
      repository.save(aggregate, expectedVersion: 5) // But current version is 7
    ).rejects.toThrow(ConcurrencyError);
  });
});
```

## Best Practices

1. **Always load from event store before executing commands** — never trust cached state for writes
2. **Keep apply() methods pure** — no side effects, no infrastructure calls
3. **Validate command preconditions in the command handler** before loading aggregate
4. **Version check on every save** — optimistic concurrency prevents lost updates
5. **Use projections for reads** — never load an aggregate just to display data
6. **Snapshot at regular intervals** — every N events or when reconstruction exceeds threshold
7. **Test reconstruction from events** — unit test aggregates by feeding events and verifying state
