# Event Sourcing Advanced Patterns

## Upcasting (Event Migration)

### What is Upcasting?
When an event schema changes, old events stored with the old schema must be converted to the new schema when read. This is called upcasting.

```typescript
// Old event schema (v1)
interface OrderPlacedV1 {
  orderId: string;
  customerId: string;
  total: number;
}

// New event schema (v2)
interface OrderPlacedV2 {
  orderId: string;
  customerId: string;
  items: OrderItem[];
  total: number;
  currency: string;
}

// Upcaster: converts V1 to V2
class OrderPlacedUpcaster implements IUpcaster {
  fromVersion = 1;
  toVersion = 2;
  eventType = 'OrderPlaced';

  upcast(event: Event): Event {
    const data = event.data as OrderPlacedV1;
    return {
      ...event,
      version: 2,
      data: {
        orderId: data.orderId,
        customerId: data.customerId,
        items: [], // V1 didn't track items individually
        total: data.total,
        currency: 'USD', // Default for V1 events
      },
    };
  }
}

class UpcasterEngine {
  private upcasters = new Map<string, IUpcaster[]>();

  register(upcaster: IUpcaster): void {
    const key = `${upcaster.eventType}:${upcaster.fromVersion}`;
    this.upcasters.set(key, [...(this.upcasters.get(key) ?? []), upcaster]);
  }

  upcastEvent(event: Event): Event {
    let current = event;
    while (true) {
      const key = `${current.eventType}:${current.version}`;
      const upcasters = this.upcasters.get(key);
      if (!upcasters) break;
      for (const upcaster of upcasters) {
        current = upcaster.upcast(current);
      }
    }
    return current;
  }
}
```

## Temporal Queries

### Querying State at a Point in Time
```typescript
class TemporalQueryService {
  async getStateAt(aggregateType: string, aggregateId: string, timestamp: Date): Promise<object> {
    const allEvents = await this.eventStore.getAggregateEvents(aggregateType, aggregateId);
    const eventsBeforeTime = allEvents.filter(e => e.metadata.timestamp <= timestamp);

    const aggregate = AggregateRoot.createEmpty(aggregateType);
    for (const event of eventsBeforeTime) {
      aggregate.applyEvent(event);
    }
    return aggregate.getState();
  }
}
```

## Projection Patterns

### Category Projection
Process multiple event types into a single read model:

```typescript
class FullOrderProjection {
  async handle(event: Event): Promise<void> {
    switch (event.eventType) {
      case 'OrderPlaced':
        return this.onOrderPlaced(event as OrderPlacedEvent);
      case 'PaymentReceived':
        return this.onPaymentReceived(event as PaymentReceivedEvent);
      case 'OrderShipped':
        return this.onOrderShipped(event as OrderShippedEvent);
      case 'OrderCancelled':
        return this.onOrderCancelled(event as OrderCancelledEvent);
    }
  }

  async onOrderPlaced(event: OrderPlacedEvent): Promise<void> {
    await this.readDb.insert('full_orders', {
      id: event.data.orderId,
      customerId: event.data.customerId,
      items: event.data.items,
      total: event.data.total,
      status: 'placed',
      paymentStatus: 'unpaid',
      createdAt: event.metadata.timestamp,
    });
  }

  async onPaymentReceived(event: PaymentReceivedEvent): Promise<void> {
    await this.readDb.update('full_orders', event.data.orderId, {
      paymentStatus: 'paid',
      paidAt: event.metadata.timestamp,
    });
  }
}
```

### Multi-Stream Projection
Join events from multiple aggregates:

```typescript
class CustomerOrderHistoryProjection {
  async onOrderPlaced(event: OrderPlacedEvent): Promise<void> {
    const customer = await this.readDb.get('customer_summaries', event.data.customerId);
    await this.readDb.insert('customer_orders', {
      id: event.data.orderId,
      customerId: event.data.customerId,
      customerName: customer?.name ?? 'Unknown',
      total: event.data.total,
      status: 'placed',
      createdAt: event.metadata.timestamp,
    });
  }
}
```

## Concurrency and Consistency

### Idempotent Event Processing
```typescript
class EventProjector {
  async handleEvent(event: Event): Promise<void> {
    const processed = await this.processedEvents.exists(event.metadata.eventId);
    if (processed) return;

    await this.handle(event);
    await this.processedEvents.mark(event.metadata.eventId);

    // Update projection position
    await this.checkpointStore.save(
      event.constructor.name,
      event.metadata.version,
    );
  }

  async rebuildFromCheckpoint(eventType: string): Promise<void> {
    const checkpoint = await this.checkpointStore.get(eventType);
    const events = await this.eventStore.getEventsByType([eventType], checkpoint?.version ?? 0);
    for (const event of events) {
      await this.handle(event);
    }
  }
}
```

## CQRS Integration with Event Sourcing

### Command Handler (Write Side)
```typescript
class PlaceOrderHandler {
  constructor(
    private eventStore: IEventStore,
    private eventBus: IEventBus,
  ) {}

  async handle(command: PlaceOrderCommand): Promise<Result> {
    const events = await this.eventStore.getAggregateEvents('order', command.orderId);
    const aggregate = OrderAggregate.loadFromHistory(events);

    const newEvent = aggregate.placeOrder(command);

    try {
      await this.eventStore.append('order', command.orderId, [newEvent], aggregate.getVersion());
    } catch (error) {
      if (error instanceof ConcurrencyError) {
        return Result.failure('Concurrency conflict — retry');
      }
      throw error;
    }

    await this.eventBus.publish(newEvent);
    return Result.success({ orderId: command.orderId });
  }
}
```

### Query Handler (Read Side)
```typescript
class GetOrderQueryHandler {
  constructor(private orderReadRepo: IOrderReadRepository) {}

  async handle(query: GetOrderQuery): Promise<OrderDTO | null> {
    return this.orderReadRepo.findById(query.orderId);
  }
}
```

## Event Store Optimization

### Batch Appending
```typescript
class BatchEventStore {
  private buffer: Event[] = [];
  private flushInterval = 10; // milliseconds

  async append(event: Event): Promise<void> {
    this.buffer.push(event);
    if (this.buffer.length >= 100) {
      await this.flush();
    }
  }

  private async flush(): Promise<void> {
    const batch = this.buffer.splice(0);
    if (batch.length === 0) return;

    // Bulk insert
    await this.db.query(
      `INSERT INTO event_store (aggregate_type, aggregate_id, version, event_type, event_data, metadata)
       SELECT * FROM UNNEST($1::text[], $2::uuid[], $3::int[], $4::text[], $5::jsonb[], $6::jsonb[])`,
      [
        batch.map(e => e.metadata.aggregateType),
        batch.map(e => e.metadata.aggregateId),
        batch.map(e => e.metadata.version),
        batch.map(e => e.eventType),
        batch.map(e => e.data),
        batch.map(e => e.metadata),
      ],
    );
  }
}
```

## Anti-Patterns

1. **Events as CRUD deltas**: Don't create `UserFieldUpdated` events that mirror DB columns. Create meaningful business events like `UserEmailChanged`, `UserDeactivated`.

2. **Infinite aggregate growth**: Without snapshots, aggregates accumulate events indefinitely, making reconstruction slower over time.

3. **Synchronous projections**: Building projections synchronously in the command path adds latency and couples read model to write performance.

4. **Not planning for schema evolution**: Event schemas will change. Plan for upcasting from day one.

5. **Event store as message queue**: The event store is for persistence, not for message delivery. Use a separate message broker for event distribution.

6. **Single global stream**: All events in one stream create contention. Partition by aggregate type.

## Performance Considerations

| Operation | Latency | Optimization |
|---|---|---|
| Append single event | ~1ms | Batch appends |
| Load aggregate (10 events) | ~5ms | Load in single query |
| Load aggregate (1000 events) | ~100ms | Use snapshots |
| Rebuild projection | ~1μs/event | Parallel processing |
| Snapshot save | ~5ms | Async, batch |
| Temporal query | Full replay | Snapshot at query time |
