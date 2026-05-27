# Event Sourcing Testing

## Overview
Test event-sourced systems: aggregate command tests, event replay tests, projection rebuild tests, concurrent access tests, and performance benchmarks.

## Aggregate Command Tests

```typescript
describe('OrderAggregate', () => {
  it('emits OrderPlaced event when placing an order', () => {
    const aggregate = new OrderAggregate();
    const command = new PlaceOrderCommand('order-1', 'customer-1', [
      { productId: 'p1', quantity: 2, price: 10 },
    ]);

    const events = aggregate.handle(command);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      eventType: 'OrderPlaced',
      data: {
        orderId: 'order-1',
        customerId: 'customer-1',
      },
    });
  });

  it('rejects duplicate order placement', () => {
    const aggregate = new OrderAggregate();
    const event = createOrderPlacedEvent('order-1');
    aggregate.apply(event);

    expect(() => aggregate.handle(new PlaceOrderCommand('order-1', 'c1', [])))
      .toThrow('Order already placed');
  });
});

describe('Aggregate replay consistency', () => {
  it('produces identical state when events are replayed', () => {
    const original = new OrderAggregate();
    const events: DomainEvent[] = [
      createOrderPlacedEvent('order-1'),
      createPaymentReceivedEvent('order-1', 100),
      createOrderShippedEvent('order-1', 'TRACK-123'),
    ];

    for (const event of events) {
      original.apply(event);
    }

    // Replay from scratch
    const replay = new OrderAggregate();
    for (const event of events) {
      replay.apply(event);
    }

    expect(replay.getState()).toEqual(original.getState());
  });
});
```

## Event Store Tests

```typescript
describe('EventStore', () => {
  let store: PostgresEventStore;

  beforeEach(async () => {
    store = new PostgresEventStore(db);
    await db.query('TRUNCATE event_store CASCADE');
  });

  it('appends events with monotonically increasing versions', async () => {
    const events = [
      createEvent('order-1', 'OrderPlaced', 1),
      createEvent('order-1', 'PaymentReceived', 2),
    ];

    await store.append('order', 'order-1', events, 0);

    const stored = await store.getEvents('order', 'order-1');
    expect(stored).toHaveLength(2);
    expect(stored[0].version).toBe(1);
    expect(stored[1].version).toBe(2);
  });

  it('rejects version conflict (optimistic concurrency)', async () => {
    const events1 = [createEvent('order-1', 'OrderPlaced', 1)];
    const events2 = [createEvent('order-1', 'OrderPlaced', 1)]; // Same version

    await store.append('order', 'order-1', events1, 0);

    await expect(
      store.append('order', 'order-1', events2, 0)
    ).rejects.toThrow('Version conflict');
  });

  it('loads events since a given version', async () => {
    for (let i = 1; i <= 5; i++) {
      await store.append('order', 'order-1', [createEvent('order-1', 'Event', i)], i - 1);
    }

    const events = await store.getEventsSince('order', 'order-1', 3);
    expect(events).toHaveLength(2);
    expect(events[0].version).toBe(4);
    expect(events[1].version).toBe(5);
  });
});
```

## Projection Tests

```typescript
describe('OrderListProjection', () => {
  let projection: OrderListProjection;
  let readDb: TestReadRepository;

  beforeEach(() => {
    readDb = new TestReadRepository();
    projection = new OrderListProjection(readDb);
  });

  it('updates projection on OrderPlaced', async () => {
    const event = createOrderPlacedEvent('order-1');

    await projection.on(event);

    const summary = await readDb.findById('order_summaries', 'order-1');
    expect(summary).toMatchObject({
      id: 'order-1',
      status: 'placed',
    });
  });

  it('rebuilds projection from scratch', async () => {
    // Seed some initial state
    readDb.insert('order_summaries', { id: 'stale', status: 'old' });

    // Rebuild
    await projection.rebuild();

    const all = await readDb.findAll('order_summaries');
    expect(all).toHaveLength(0); // Should be cleared and rebuilt
  });
});
```

## Concurrent Access Tests

```typescript
describe('Concurrent Access', () => {
  it('prevents concurrent modification of same aggregate', async () => {
    const aggregateId = 'concurrent-order';
    const store = new PostgresEventStore(db);

    // Two concurrent attempts to modify the same aggregate
    const results = await Promise.allSettled([
      appendConcurrentEvent(store, aggregateId, 0), // Starting from version 0
      appendConcurrentEvent(store, aggregateId, 0), // Both think they're at version 0
    ]);

    const succeeded = results.filter(r => r.status === 'fulfilled');
    const failed = results.filter(r => r.status === 'rejected');

    // Only one should succeed (optimistic concurrency)
    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);
  });

  it('serializes commands on the same aggregate', async () => {
    const aggregateId = 'serial-order';
    const store = new PostgresEventStore(db);

    // Sequential commands should all succeed
    for (let i = 0; i < 10; i++) {
      await expect(
        store.append('order', aggregateId, [createEvent(aggregateId, `Event-${i}`, i + 1)], i)
      ).resolves.not.toThrow();
    }

    const events = await store.getEvents('order', aggregateId);
    expect(events).toHaveLength(10);
  });
});
```

## Performance Benchmarks

```typescript
describe('Event Store Performance', () => {
  it('appends 1000 events in under 500ms', async () => {
    const aggregateId = 'perf-agg';
    const store = new PostgresEventStore(db);
    const events = Array.from({ length: 1000 }, (_, i) =>
      createEvent(aggregateId, `Event-${i}`, i + 1)
    );

    const start = Date.now();
    // Batch append
    for (let i = 0; i < events.length; i += 100) {
      const batch = events.slice(i, i + 100);
      await store.append('order', aggregateId, batch, i);
    }
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(500);
  });

  it('loads aggregate with 10000 events in under 1 second (with snapshot)', async () => {
    const aggregateId = 'perf-load';
    const store = new PostgresEventStore(db);

    // Seed events
    for (let i = 0; i < 10000; i++) {
      await store.append('order', aggregateId, [createEvent(aggregateId, `Event-${i}`, i + 1)], i);
    }

    // With snapshot
    await snapshotRepo.save({
      aggregateType: 'order',
      aggregateId,
      version: 10000,
      state: {},
      createdAt: new Date(),
      eventCount: 10000,
    });

    const start = Date.now();
    const events = await store.getEventsSince('order', aggregateId, 9500);
    const duration = Date.now() - start;

    expect(events).toHaveLength(500);
    expect(duration).toBeLessThan(1000);
  });
});
```

## Key Points
- Test aggregate commands: event emission, invariant enforcement, rejection
- Verify event replay produces identical state (idempotent apply)
- Test event store append, version conflict rejection, and range queries
- Test projection rebuild from scratch clears and replays all events
- Test optimistic concurrency: only one concurrent writer succeeds
- Benchmark append throughput and load time with snapshots
