---
name: backend-event-sourcing
description: >
  Use this skill when the user says 'event sourcing', 'event store', 'event stream', 'event sourced', 'rehydrate from events', 'event replay', 'projection rebuild', 'event log', 'append-only log', 'event history'. This skill enforces: events as the single source of truth, current state derived from event replay, append-only event store, immutable events, event versioning, projection rebuild from scratch. Applies to any backend stack. Do NOT use for: simple audit logging, message queues, or CQRS without event sourcing.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, universal, event-sourcing, events, architecture]
---

# Backend Event Sourcing

## Purpose
Store state changes as an append-only sequence of events. Current state is derived by replaying events. Every event is immutable, auditable, and replayable.

## Agent Protocol

### Trigger
Exact user phrases: "event sourcing", "event store", "event stream", "event sourced", "rehydrate from events", "event replay", "projection rebuild", "append-only log", "event history", "event store pattern".

### Input Context
- Domain aggregates and their state changes.
- Event store technology (PostgreSQL, EventStoreDB, DynamoDB).
- Projection requirements (read models, search indexes, materialized views).

### Output Artifact
Event sourcing design as text. No file unless requested.

### Response Format
```
Aggregate: {name}
Events: [{EventName, version, key fields}]
Current state: {derived by replay}
Projections: [{name, rebuild from}]
```

### Completion Criteria
- [ ] All state changes are captured as events (not just some).
- [ ] Event store is append-only — no updates or deletes.
- [ ] Aggregate state can be rebuilt by replaying all events.
- [ ] Projections can be rebuilt from scratch by replaying all events.
- [ ] Events are immutable and carry version number.
- [ ] Event schema includes metadata (eventId, aggregateId, version, timestamp).
- [ ] Snapshot strategy defined for aggregates with many events.

### Max Response Length
Per aggregate: 8 lines. Full design: 35 lines.

## Workflow

### Step 1: Identify Event-Sourced Aggregates

Not every entity needs event sourcing. Choose aggregates where:
- The full history of changes matters (audit, compliance, dispute resolution).
- The state derivation logic is complex and benefits from replay.
- Multiple projections of the same data are needed.
- Temporal queries ("what was the state at time X?") are required.

### Step 2: Define Events

```typescript
// Event definitions — past tense, immutable, carry all relevant data
interface OrderPlaced {
  eventType: 'OrderPlaced';
  version: 1;
  data: { orderId: string; customerId: string; items: OrderItem[]; total: number };
  metadata: { eventId: string; aggregateId: string; version: number; timestamp: Date; correlationId: string };
}

interface PaymentReceived {
  eventType: 'PaymentReceived';
  version: 1;
  data: { orderId: string; amount: number; paymentMethod: string; transactionId: string };
  metadata: { ... };
}

interface OrderShipped {
  eventType: 'OrderShipped';
  version: 1;
  data: { orderId: string; trackingNumber: string; carrier: string };
  metadata: { ... };
}
```

### Step 3: Implement Aggregate (Event Replay)

```typescript
class OrderAggregate {
  private state: OrderState = { status: 'pending', items: [], total: 0, payments: [] };

  // Load from history
  static loadFromHistory(events: Event[]): OrderAggregate {
    const aggregate = new OrderAggregate();
    for (const event of events) {
      aggregate.apply(event);
    }
    return aggregate;
  }

  // Command handler — validate and emit events
  placeOrder(command: PlaceOrderCommand): OrderPlacedEvent {
    if (this.state.status !== 'pending') throw new Error('Order already placed');
    return { eventType: 'OrderPlaced', version: 1, data: { ...command }, metadata: this.createMetadata() };
  }

  applyEvent(event: OrderPlacedEvent): void {
    this.state = { status: 'placed', items: event.data.items, total: event.data.total, payments: [] };
  }

  applyEvent(event: PaymentReceivedEvent): void {
    this.state.payments.push({ amount: event.data.amount, method: event.data.paymentMethod });
    if (this.totalPaid() >= this.state.total) {
      this.state.status = 'paid';
    }
  }
}
```

### Step 4: Event Store

```sql
-- PostgreSQL event store
CREATE TABLE event_store (
  id BIGSERIAL,
  aggregate_type VARCHAR(100) NOT NULL,
  aggregate_id UUID NOT NULL,
  version INTEGER NOT NULL,
  event_type VARCHAR(200) NOT NULL,
  event_data JSONB NOT NULL,
  metadata JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (aggregate_type, aggregate_id, version)
);

CREATE INDEX idx_event_store_aggregate ON event_store(aggregate_type, aggregate_id);
CREATE INDEX idx_event_store_type ON event_store(event_type);
```

### Step 5: Projections

```typescript
// Read model projection — subscribes to events, rebuildable from scratch
class OrderListProjection {
  constructor(private readDb: IReadRepository) {}

  async onOrderPlaced(event: OrderPlacedEvent): Promise<void> {
    await this.readDb.insert('order_summaries', {
      id: event.data.orderId,
      customerId: event.data.customerId,
      itemCount: event.data.items.length,
      total: event.data.total,
      status: 'placed',
      createdAt: event.metadata.timestamp
    });
  }

  async onOrderShipped(event: OrderShippedEvent): Promise<void> {
    await this.readDb.update('order_summaries', event.data.orderId, {
      status: 'shipped',
      trackingNumber: event.data.trackingNumber
    });
  }

  // Full rebuild — clear and replay all events
  async rebuild(): Promise<void> {
    await this.readDb.clear('order_summaries');
    const events = await eventStore.getEventsByType('OrderPlaced', 'OrderShipped');
    for (const event of events) {
      if (event.eventType === 'OrderPlaced') await this.onOrderPlaced(event);
      if (event.eventType === 'OrderShipped') await this.onOrderShipped(event);
    }
  }
}
```

### Step 6: Snapshots

For aggregates with thousands of events, take periodic snapshots:

```typescript
async function saveSnapshot(aggregateId: string, aggregate: OrderAggregate, version: number): Promise<void> {
  await snapshotStore.save(aggregateId, aggregate.getState(), version);
}

async function loadWithSnapshot(aggregateId: string): Promise<OrderAggregate> {
  const snapshot = await snapshotStore.getLatest(aggregateId);
  const events = await eventStore.getEventsSince(aggregateId, snapshot?.version ?? 0);
  const aggregate = snapshot
    ? OrderAggregate.fromSnapshot(snapshot.state)
    : new OrderAggregate();
  for (const event of events) {
    aggregate.applyEvent(event);
  }
  return aggregate;
}
```

## Rules
- Events are immutable facts about the past. Never delete or modify an event. Correct errors with compensating events.
- Event schema evolves forward-only. Add optional fields. Never remove or rename fields.
- Projections are fully rebuildable from the event stream. If a projection cannot be rebuilt, the design is wrong.
- Snapshots are optimizations, not sources of truth. The event store is the source of truth.
- Event versioning uses semver for the event schema. Consumers support at least 2 previous versions.
- Every event carries: eventId (unique), aggregateId, version (monotonic), timestamp, correlationId, causationId.
- Aggregate boundaries are consistency boundaries. Everything within one aggregate is strongly consistent.

## References
  - references/aggregate-design.md — Aggregate Design
  - references/event-sourcing-projections.md — Event Sourcing Projections
  - references/event-sourcing-snapshots.md — Event Sourcing Snapshots
  - references/event-sourcing-testing.md — Event Sourcing Testing
  - references/event-store-patterns.md — Event Store Patterns
  - references/event-versioning.md — Event Versioning
## Handoff
No artifact produced.
Next skill: cqrs-patterns — to separate read/write models for event-sourced aggregates.
Carry forward: event definitions, aggregate design, projection rebuild strategy.
