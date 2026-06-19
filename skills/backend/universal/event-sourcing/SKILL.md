---
name: backend-event-sourcing
description: >
  Use this skill when the user says 'event sourcing', 'event store', 'event stream', 'event sourced', 'rehydrate from events', 'event replay', 'projection rebuild', 'event log', 'append-only log', 'event history'. This skill enforces: events as the single source of truth, current state derived from event replay, append-only event store, immutable events, event versioning, projection rebuild from scratch. Applies to any backend stack. Do NOT use for: simple audit logging, message queues, or CQRS without event sourcing.
version: "2.0.0"
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

## Architecture Decision Tree

### Should I Use Event Sourcing?

```
Does the full history of changes matter?
  ├── Yes → Audit, compliance, dispute resolution → Event Sourcing candidate
  └── No → Is state derivation logic complex?
            ├── Yes → Event Sourcing simplifies temporal queries
            └── No → Are multiple projections of the same data needed?
                      ├── Yes → Event Sourcing enables flexible projections
                      └── No → Simple CRUD is sufficient — skip Event Sourcing
```

### Event Store Selection

```
What infrastructure is already available?
  ├── PostgreSQL → Great event store (JSONB for event data, reliable, transactional)
  ├── EventStoreDB → Purpose-built for event sourcing (projections built-in)
  ├── DynamoDB → Serverless, single-table design for event streams
  └── Kafka → Durable log, but limited query capabilities for aggregate reconstruction
```

### Snapshot Strategy

```
How many events per aggregate?
  ├── < 100 → No snapshots needed
  ├── 100-1000 → Snapshot every 50 events
  ├── 1000-10000 → Snapshot every 100 events
  └── > 10000 → Snapshot every 500 events, consider splitting aggregate
```

## Workflow

### Step 1: Identify Event-Sourced Aggregates
Choose aggregates where:
- The full history of changes matters (audit, compliance, dispute resolution).
- The state derivation logic is complex and benefits from replay.
- Multiple projections of the same data are needed.
- Temporal queries ("what was the state at time X?") are required.

### Step 2: Define Events
```typescript
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
}

interface OrderShipped {
  eventType: 'OrderShipped';
  version: 1;
  data: { orderId: string; trackingNumber: string; carrier: string };
}
```

### Step 3: Implement Aggregate (Event Replay)
```typescript
class OrderAggregate {
  private state: OrderState = { status: 'pending', items: [], total: 0, payments: [] };

  static loadFromHistory(events: Event[]): OrderAggregate {
    const aggregate = new OrderAggregate();
    for (const event of events) {
      aggregate.apply(event);
    }
    return aggregate;
  }

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

```python
class OrderAggregate:
    def __init__(self):
        self.state = OrderState(status="pending", items=[], total=0, payments=[])

    @classmethod
    def load_from_history(cls, events: list[Event]) -> "OrderAggregate":
        aggregate = cls()
        for event in events:
            aggregate.apply(event)
        return aggregate

    def place_order(self, command: PlaceOrderCommand) -> OrderPlacedEvent:
        if self.state.status != "pending":
            raise BusinessRuleError("Order already placed")
        return OrderPlacedEvent(data={...})

    def apply(self, event: Event) -> None:
        if event.event_type == "OrderPlaced":
            self.state = OrderState(status="placed", items=event.data["items"], ...)
```

### Step 4: Event Store
```sql
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
CREATE INDEX idx_event_store_created ON event_store(created_at);
```

### Step 5: Projections
```typescript
class OrderListProjection {
  constructor(private readDb: IReadRepository) {}

  async onOrderPlaced(event: OrderPlacedEvent): Promise<void> {
    await this.readDb.insert('order_summaries', {
      id: event.data.orderId,
      customerId: event.data.customerId,
      itemCount: event.data.items.length,
      total: event.data.total,
      status: 'placed',
      createdAt: event.metadata.timestamp,
    });
  }

  async onOrderShipped(event: OrderShippedEvent): Promise<void> {
    await this.readDb.update('order_summaries', event.data.orderId, {
      status: 'shipped',
      trackingNumber: event.data.trackingNumber,
    });
  }

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

### Step 7: Temporal Queries

```typescript
async function getOrderStateAtTime(orderId: string, timestamp: Date): Promise<OrderState> {
  const events = await eventStore.getAggregateEventsUntil('order', orderId, timestamp);
  const aggregate = OrderAggregate.loadFromHistory(events);
  return aggregate.getState();
}
```

## Aggregate Reconstruction

### Loading Aggregate
```typescript
class OrderRepository {
  async findById(id: OrderId): Promise<OrderAggregate> {
    const events = await this.eventStore.getAggregateEvents('order', id);
    if (events.length === 0) throw new NotFoundError(`Order ${id} not found`);
    return OrderAggregate.loadFromHistory(events);
  }

  async save(aggregate: OrderAggregate): Promise<void> {
    const newEvents = aggregate.getUncommittedEvents();
    const expectedVersion = aggregate.getVersion() - newEvents.length;
    await this.eventStore.append('order', aggregate.id, newEvents, expectedVersion);
    aggregate.markEventsAsCommitted();
  }
}
```

### Concurrency Control
```typescript
class EventStore {
  async append(aggregateType: string, aggregateId: string, events: Event[], expectedVersion: number): Promise<void> {
    const result = await this.db.query(
      `INSERT INTO event_store (aggregate_type, aggregate_id, version, event_type, event_data, metadata)
       SELECT $1, $2, $3 + generate_series, $4, $5, $6
       FROM (SELECT generate_series(1, $7) AS generate_series) AS gs`,
      [aggregateType, aggregateId, expectedVersion, ...]
    );
    // If another transaction inserted with the same version, the PK constraint will fail
    // This gives us optimistic concurrency control
  }
}
```

## Event Versioning

### Schema Evolution
```typescript
type Event = OrderPlacedV1 | OrderPlacedV2 | PaymentReceivedV1;

interface OrderPlacedV1 {
  eventType: 'OrderPlaced';
  version: 1;
  data: { orderId: string; customerId: string; total: number };
}

interface OrderPlacedV2 {
  eventType: 'OrderPlaced';
  version: 2;
  data: { orderId: string; customerId: string; items: OrderItem[]; total: number; currency: string };
}

// Upcaster: converts V1 to V2 on read
function upcastOrderPlaced(event: OrderPlacedV1): OrderPlacedV2 {
  return {
    eventType: 'OrderPlaced',
    version: 2,
    data: {
      ...event.data,
      items: [], // V1 didn't have items
      currency: 'USD', // default
    },
  };
}
```

## Production Considerations

### Snapshot Strategy
| Snapshot Frequency | Aggregate Size | Load Time | Storage Overhead |
|---|---|---|---|
| Every 10 events | Small | Fast | High |
| Every 50 events | Medium | Medium | Medium |
| Every 100 events | Large | Slow | Low |

### Performance
- Event store writes: ~1ms per event (PostgreSQL)
- Aggregate reconstruction: ~1μs per event (in-memory)
- Projection rebuild: proportional to event count
- Snapshot load: single read + recent events

### Compensating Events
```typescript
// Never delete or modify events — use compensating events instead
interface OrderCancelled {
  eventType: 'OrderCancelled';
  version: 1;
  data: { orderId: string; reason: string };
}
```

## Anti-Patterns
1. **Event sourcing for everything**: Not all entities need event sourcing. Use it only where history matters.
2. **Mutable events**: Events are immutable facts. Never delete or modify. Correct with compensating events.
3. **No snapshot strategy**: Aggregates with 1000+ events become slow to rebuild.
4. **Business logic in projections**: Projections should be dumb data transformations. Business rules belong in aggregates.
5. **Not rebuilding projections**: Every projection must be rebuildable from scratch. If it can't, the design is wrong.
6. **Events as DTOs**: Events carry business meaning. Don't generate events that mirror DB column changes.
7. **No upcasting strategy**: Old event schemas accumulate and break new code. Always upcast on read.
8. **Too many event types**: If every field change is a different event type, you have event explosion. Group related changes.

## Rules
- Events are immutable facts about the past. Never delete or modify an event. Correct errors with compensating events.
- Event schema evolves forward-only. Add optional fields. Never remove or rename fields.
- Projections are fully rebuildable from the event stream. If a projection cannot be rebuilt, the design is wrong.
- Snapshots are optimizations, not sources of truth. The event store is the source of truth.
- Event versioning uses semver for the event schema. Consumers support at least 2 previous versions.
- Every event carries: eventId (unique), aggregateId, version (monotonic), timestamp, correlationId, causationId.
- Aggregate boundaries are consistency boundaries. Everything within one aggregate is strongly consistent.
- Upcast events on read, not on write. Old events stay in their original format.
- Test projection rebuild from scratch during CI — it must always work.

## References
  - references/aggregate-design.md — Aggregate Design
  - references/aggregate-reconstruction.md — Aggregate Reconstruction Deep Dive
  - references/event-sourcing-fundamentals.md — Event Sourcing Fundamentals
  - references/event-sourcing-advanced.md — Event Sourcing Advanced Patterns
  - references/event-sourcing-projections.md — Event Sourcing Projections
  - references/event-sourcing-snapshots.md — Event Sourcing Snapshots
  - references/event-sourcing-testing.md — Event Sourcing Testing
  - references/event-store-patterns.md — Event Store Patterns
  - references/event-versioning.md — Event Versioning
## Handoff
No artifact produced.
Next skill: cqrs-patterns — to separate read/write models for event-sourced aggregates.
Carry forward: event definitions, aggregate design, projection rebuild strategy.

## Implementation Patterns

### Event Store Client

```python
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime
import json
import uuid

@dataclass
class DomainEvent:
    event_id: str
    aggregate_id: str
    event_type: str
    data: Dict
    version: int
    timestamp: str
    correlation_id: str
    causation_id: str

class EventStore:
    def __init__(self):
        self.events: List[DomainEvent] = []
        self.snapshots: Dict[str, Dict] = {}

    def append(self, aggregate_id: str, events: List[Dict], expected_version: int) -> bool:
        current = self._get_current_version(aggregate_id)
        if current != expected_version:
            raise ConcurrencyError(f"Expected version {expected_version}, got {current}")

        for event_data in events:
            event = DomainEvent(
                event_id=str(uuid.uuid4()),
                aggregate_id=aggregate_id,
                event_type=event_data["type"],
                data=event_data["data"],
                version=current + 1,
                timestamp=datetime.utcnow().isoformat() + "Z",
                correlation_id=event_data.get("correlation_id", ""),
                causation_id=event_data.get("causation_id", ""),
            )
            self.events.append(event)
            current += 1
        return True

    def get_events(self, aggregate_id: str, from_version: int = 0) -> List[DomainEvent]:
        return [e for e in self.events if e.aggregate_id == aggregate_id and e.version > from_version]

    def get_all_events(self, event_types: Optional[List[str]] = None) -> List[DomainEvent]:
        if not event_types:
            return self.events
        return [e for e in self.events if e.event_type in event_types]

    def save_snapshot(self, aggregate_id: str, state: Dict, version: int):
        self.snapshots[aggregate_id] = {"state": state, "version": version, "timestamp": datetime.utcnow().isoformat()}

    def get_snapshot(self, aggregate_id: str) -> Optional[Dict]:
        return self.snapshots.get(aggregate_id)

    def _get_current_version(self, aggregate_id: str) -> int:
        events = self.get_events(aggregate_id)
        return max((e.version for e in events), default=0)

    def rebuild_aggregate(self, aggregate_id: str, apply_fn) -> Any:
        snapshot = self.get_snapshot(aggregate_id)
        if snapshot:
            state = snapshot["state"]
            from_version = snapshot["version"]
        else:
            state = {}
            from_version = 0

        events = self.get_events(aggregate_id, from_version)
        for event in events:
            state = apply_fn(state, event)
        return state


class ConcurrencyError(Exception):
    pass


class ProjectionRebuilder:
    def __init__(self, event_store: EventStore):
        self.event_store = event_store

    def rebuild(self, projection_name: str, event_types: List[str], apply_fn) -> Any:
        state = {}
        events = self.event_store.get_all_events(event_types)
        for event in sorted(events, key=lambda e: e.timestamp):
            state = apply_fn(state, event)
        return state
```

## Architecture Decision Trees

### Snapshot Strategy

```
When to take snapshots?
├── After N events (N=100 for most, N=1000 for simple)
├── When aggregate rebuild time exceeds 100ms
├── On schedule (every hour for high-traffic aggregates)
└── After specific business events (e.g., order completed, account closed)
```

## Anti-Patterns

| Anti-Pattern | Why It Fails | Correct Approach |
|---|---|---|
| Events as DTOs reflecting DB columns | No business meaning | Events capture business intent (OrderPlaced, not StatusSetToPlaced) |
| Deleting events for data privacy | Breaks event stream integrity | Anonymize PII in events, don't delete |
| No upcasting strategy | Old events break new code | Upcast on read, keep old events unchanged |
| Projections with business logic | Duplicating aggregate rules | Projections are data transformations, aggregates have business logic |
| Too many event types | Event explosion, hard to reason about | Group related changes, use event metadata for details |

## Performance Optimization

- **Snapshot-based aggregate rebuild**: Use snapshots to avoid replaying all events from origin. Rebuild from last snapshot + events since snapshot. Reduces rebuild time by 100x for old aggregates.
- **Parallel projection rebuild**: Rebuild independent projections in parallel. Each projection processes all events but maintains separate state. Use thread pools for I/O-bound projections.
- **Batch event writing**: Buffer events in memory and flush in batches. Use transactional batch writes for atomic multi-event appends. Reduces write amplification for high-throughput aggregates.
