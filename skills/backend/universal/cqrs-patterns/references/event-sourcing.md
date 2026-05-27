# Event Sourcing

## Purpose

Event sourcing persists the state of an aggregate as a sequence of events, rather than storing its current state in a row. Every change to the application state is captured as an immutable event in the event store. The current state is reconstructed by replaying events. Combined with CQRS, event sourcing powers audit trails, temporal queries, and complex event-driven workflows.

## Event Store Patterns

### Storage Models

#### Append-Only Event Log

Events are stored as an immutable, append-only sequence. Each event has an aggregate ID, a version number, a timestamp, a type, and serialized payload data.

```sql
CREATE TABLE events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type  VARCHAR(100) NOT NULL,
  aggregate_id    UUID NOT NULL,
  version         INTEGER NOT NULL,
  event_type      VARCHAR(200) NOT NULL,
  event_data      JSONB NOT NULL,
  metadata        JSONB NOT NULL DEFAULT '{}',
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Prevent duplicate events per aggregate version
  UNIQUE (aggregate_type, aggregate_id, version)
);

CREATE INDEX idx_events_aggregate ON events(aggregate_type, aggregate_id, version);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_occurred ON events(occurred_at);
```

#### Partitioned Event Store

For high-volume systems, partition events by aggregate type or time range.

```sql
-- Partition by aggregate type for targeted replay
CREATE TABLE events_order PARTITION OF events
  FOR VALUES IN ('order');

CREATE TABLE events_user PARTITION OF events
  FOR VALUES IN ('user');

-- Or partition by time for retention management
CREATE TABLE events_2026_q1 PARTITION OF events
  FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
```

### Loading Events

```typescript
interface EventStore {
  save(aggregateType: string, aggregateId: string, events: DomainEvent[], expectedVersion: number): Promise<void>
  load(aggregateType: string, aggregateId: string): Promise<DomainEvent[]>
  loadFromVersion(aggregateType: string, aggregateId: string, fromVersion: number): Promise<DomainEvent[]>
}

class PostgresEventStore implements EventStore {
  constructor(private pool: Pool) {}

  async save(aggregateType: string, aggregateId: string, events: DomainEvent[], expectedVersion: number): Promise<void> {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      // Optimistic concurrency check
      const { rows } = await client.query(
        `SELECT COALESCE(MAX(version), 0) as current_version
         FROM events WHERE aggregate_type = $1 AND aggregate_id = $2`,
        [aggregateType, aggregateId]
      )
      if (parseInt(rows[0].current_version) !== expectedVersion) {
        throw new ConcurrencyError(`Version mismatch: expected ${expectedVersion}, got ${rows[0].current_version}`)
      }
      // Insert events
      for (let i = 0; i < events.length; i++) {
        await client.query(
          `INSERT INTO events (aggregate_type, aggregate_id, version, event_type, event_data, metadata)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [aggregateType, aggregateId, expectedVersion + i + 1,
           events[i].constructor.name, JSON.stringify(events[i].data),
           JSON.stringify(events[i].metadata)]
        )
      }
      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  }

  async load(aggregateType: string, aggregateId: string): Promise<DomainEvent[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM events
       WHERE aggregate_type = $1 AND aggregate_id = $2
       ORDER BY version ASC`,
      [aggregateType, aggregateId]
    )
    return rows.map(row => deserializeEvent(row))
  }
}
```

### Optimistic Concurrency

Events use a version field to detect concurrent writes. If two commands try to write events for the same aggregate at the same version, one fails with a concurrency exception.

```typescript
class ConcurrencyError extends Error {
  constructor(public aggregateId: string, public expectedVersion: number, public actualVersion: number) {
    super(`Concurrency conflict on aggregate ${aggregateId}`)
  }
}

// Retry with fresh state
async function executeWithRetry(command: Command, maxRetries = 3): Promise<Result> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const aggregate = await repository.load(command.aggregateId)
      const events = aggregate.handle(command)
      await eventStore.save('order', command.aggregateId, events, aggregate.version)
      return Result.success()
    } catch (err) {
      if (err instanceof ConcurrencyError && attempt < maxRetries - 1) {
        continue // reload and retry
      }
      throw err
    }
  }
}
```

## Aggregate Reconstruction

### Replaying Events

An aggregate is reconstructed by loading all its events and applying them in order.

```typescript
abstract class EventSourcedAggregate {
  protected version: number = 0
  protected changes: DomainEvent[] = []

  abstract applyEvent(event: DomainEvent): void

  loadFromHistory(events: DomainEvent[]): void {
    for (const event of events) {
      this.applyEvent(event)
      this.version++
    }
  }

  recordEvent(event: DomainEvent): void {
    this.applyEvent(event)
    this.version++
    this.changes.push(event)
  }

  getUncommittedChanges(): DomainEvent[] {
    return this.changes
  }
}

class OrderAggregate extends EventSourcedAggregate {
  private state: OrderState = { status: 'pending', items: [], total: 0 }

  applyEvent(event: DomainEvent): void {
    switch (event.constructor) {
      case OrderPlaced:
        const placed = event as OrderPlaced
        this.state = { ...this.state, status: 'placed', items: placed.data.items, total: placed.data.total }
        break
      case PaymentConfirmed:
        this.state = { ...this.state, status: 'confirmed', paymentId: (event as PaymentConfirmed).data.transactionId }
        break
      case OrderShipped:
        this.state = { ...this.state, status: 'shipped', trackingNumber: (event as OrderShipped).data.trackingNumber }
        break
      case OrderDelivered:
        this.state = { ...this.state, status: 'delivered', deliveredAt: (event as OrderDelivered).data.timestamp }
        break
      case OrderCancelled:
        this.state = { ...this.state, status: 'cancelled', cancelledAt: (event as OrderCancelled).data.timestamp }
        break
    }
  }

  placeOrder(items: OrderItem[], customerId: string): void {
    if (this.state.status !== 'pending') throw new Error('Order already placed')
    if (items.length === 0) throw new Error('Order must have items')
    this.recordEvent(new OrderPlaced({
      orderId: this.state.id, customerId, items,
      total: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }))
  }

  confirmPayment(transactionId: string): void {
    if (this.state.status !== 'placed') throw new Error('Order must be placed before payment')
    this.recordEvent(new PaymentConfirmed({ orderId: this.state.id, transactionId }))
  }
}
```

### Repository for Event-Sourced Aggregates

```typescript
class EventSourcedOrderRepository {
  constructor(private eventStore: EventStore) {}

  async findById(orderId: OrderId): Promise<OrderAggregate | null> {
    const events = await this.eventStore.load('order', orderId.toString())
    if (events.length === 0) return null
    const aggregate = new OrderAggregate(orderId)
    aggregate.loadFromHistory(events)
    return aggregate
  }

  async save(aggregate: OrderAggregate): Promise<void> {
    const events = aggregate.getUncommittedChanges()
    if (events.length === 0) return
    await this.eventStore.save('order', aggregate.id.toString(), events, aggregate.version - events.length)
  }
}
```

## Snapshotting

### Why Snapshot

Replaying hundreds of thousands of events to reconstruct an aggregate becomes slow. Snapshots store the aggregate state at a specific version so replay starts from the snapshot, not the beginning.

### Snapshot Store

```sql
CREATE TABLE snapshots (
  aggregate_type  VARCHAR(100) NOT NULL,
  aggregate_id    UUID NOT NULL,
  version         INTEGER NOT NULL,
  state           JSONB NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (aggregate_type, aggregate_id, version)
);
```

### Snapshot Strategy

```typescript
interface SnapshotStrategy {
  shouldTakeSnapshot(aggregate: EventSourcedAggregate): boolean
}

class EveryNEventsStrategy implements SnapshotStrategy {
  constructor(private threshold: number = 100) {}

  shouldTakeSnapshot(aggregate: EventSourcedAggregate): boolean {
    return aggregate.version % this.threshold === 0
  }
}

class SnapshotRepository {
  constructor(
    private eventStore: EventStore,
    private snapshotStore: SnapshotStore,
    private strategy: SnapshotStrategy
  ) {}

  async findById(aggregateType: string, aggregateId: string, factory: () => EventSourcedAggregate): Promise<EventSourcedAggregate> {
    // Load latest snapshot
    const snapshot = await this.snapshotStore.findLatest(aggregateType, aggregateId)
    const aggregate = factory()

    if (snapshot) {
      // Restore from snapshot and replay events after snapshot version
      aggregate.loadFromSnapshot(snapshot.state, snapshot.version)
      const events = await this.eventStore.loadFromVersion(aggregateType, aggregateId, snapshot.version + 1)
      aggregate.loadFromHistory(events)
    } else {
      // No snapshot — replay all events
      const events = await this.eventStore.load(aggregateType, aggregateId)
      aggregate.loadFromHistory(events)
    }
    return aggregate
  }

  async save(aggregate: EventSourcedAggregate): Promise<void> {
    await this.eventStore.save(aggregate)
    if (this.strategy.shouldTakeSnapshot(aggregate)) {
      await this.snapshotStore.save(aggregate)
    }
  }
}
```

## Event Versioning

### Schema Evolution

Events change over time. Fields are added, renamed, or restructured. Handle version differences between old stored events and new code.

### Version Field in Events

```typescript
interface OrderPlacedEventV1 {
  eventVersion: 1
  data: {
    orderId: string
    customerId: string
    items: Array<{ productId: string; quantity: number; price: number }>
    total: number
  }
}

interface OrderPlacedEventV2 {
  eventVersion: 2
  data: {
    orderId: string
    customerId: string
    items: Array<{ productId: string; sku: string; quantity: number; price: number }>
    total: number
    currency: string // added in v2
    discount?: number // added in v2
  }
}
```

### Backward Compatibility Rules

- Never remove a field from an event
- New fields must be optional (nullable or default value)
- Renaming a field: add the new field name, keep the old name, deprecate the old name
- Changing a field type: add a new field with a different name, migrate consumers

## Event Upcasting

### What is Upcasting

Upcasting transforms old event versions to the current version during deserialization. This keeps the domain code working with a single event version.

```typescript
interface Upcaster {
  canUpcast(eventType: string, version: number): boolean
  upcast(event: StoredEvent): DomainEvent
}

class OrderPlacedUpcaster implements Upcaster {
  canUpcast(eventType: string, version: number): boolean {
    return eventType === 'OrderPlaced' && version < 2
  }

  upcast(event: StoredEvent): DomainEvent {
    const data = { ...event.eventData }
    if (event.eventVersion < 2) {
      // Add new optional fields with defaults
      data.currency = 'USD'
      data.discount = null
      // Add empty sku field to items
      data.items = data.items.map((item: any) => ({
        ...item,
        sku: item.sku ?? `SKU-${item.productId}`,
      }))
    }
    return new OrderPlaced({ ...data, eventVersion: 2 })
  }
}
```

### Upcaster Registry

```typescript
class UpcasterRegistry {
  private upcasters: Upcaster[] = []

  register(upcaster: Upcaster): void {
    this.upcasters.push(upcaster)
  }

  upcast(event: StoredEvent): DomainEvent {
    let current = event
    while (true) {
      const upcaster = this.upcasters.find(u => u.canUpcast(current.eventType, current.eventVersion))
      if (!upcaster) break
      current = upcaster.upcast(current)
    }
    return deserializeEvent(current)
  }
}

// Usage in event store
class UpcastingEventStore {
  constructor(
    private inner: EventStore,
    private upcasters: UpcasterRegistry
  ) {}

  async load(aggregateType: string, aggregateId: string): Promise<DomainEvent[]> {
    const rawEvents = await this.inner.load(aggregateType, aggregateId)
    return rawEvents.map(e => this.upcasters.upcast(e))
  }
}
```

## Saga / Choreography with CQRS

### Choreography with Events

Each service reacts to events from other services. No central coordinator.

```typescript
// Order Service emits OrderPlaced
class PlaceOrderHandler implements ICommandHandler<PlaceOrderCommand> {
  async handle(command: PlaceOrderCommand): Promise<Result> {
    const order = new OrderAggregate(command.orderId)
    order.placeOrder(command.items, command.customerId)
    await this.orderRepo.save(order)
    // Event is published, Payment Service will pick it up
    return Result.success({ orderId: command.orderId })
  }
}

// Payment Service reacts to OrderPlaced
class OnOrderPlacedHandler implements IEventHandler<OrderPlaced> {
  async handle(event: OrderPlaced): Promise<void> {
    const command = new ProcessPaymentCommand(event.data.orderId, event.data.total)
    const result = await this.commandBus.dispatch(command)
    if (!result.isSuccess()) {
      // Emit PaymentFailed — triggers Order cancellation
      await this.eventBus.publish(new PaymentFailed(event.data.orderId, result.getError()))
    }
  }
}
```

### Orchestration Saga with Command Bus

```typescript
class OrderSagaOrchestrator {
  constructor(private commandBus: CommandBus) {}

  async execute(orderId: string): Promise<Result> {
    const sagaId = uuid()
    const saga = Saga.create(sagaId, {
      steps: [
        { name: 'reserve-inventory', command: new ReserveInventoryCommand(orderId) },
        { name: 'process-payment', command: new ProcessPaymentCommand(orderId) },
        { name: 'confirm-order', command: new ConfirmOrderCommand(orderId) },
      ],
      compensations: {
        'reserve-inventory': new ReleaseInventoryCommand(orderId),
        'process-payment': new RefundPaymentCommand(orderId),
      },
    })

    for (const step of saga.steps) {
      const result = await this.commandBus.dispatch(step.command)
      if (!result.isSuccess()) {
        // Execute compensating actions in reverse order
        for (const compensation of saga.getCompensationsFor(step)) {
          await this.commandBus.dispatch(compensation)
        }
        return Result.failure(result.getError())
      }
    }
    return Result.success()
  }
}
```

### Saga State Persistence

```typescript
// Saga state machine persisted in a saga store
interface SagaState {
  sagaId: string
  sagaType: string
  status: 'running' | 'completed' | 'failed'
  currentStep: number
  stepResults: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

async function handleSagaCallback(event: DomainEvent): Promise<void> {
  const saga = await sagaStore.load(event.metadata.sagaId)
  if (!saga || saga.status !== 'running') return

  saga.stepResults[saga.currentStep] = event.data
  saga.currentStep++

  if (saga.currentStep >= saga.steps.length) {
    saga.status = 'completed'
    await sagaStore.save(saga)
    return
  }

  // Execute next step
  const nextStep = saga.steps[saga.currentStep]
  const result = await commandBus.dispatch(nextStep.command)
  if (!result.isSuccess()) {
    saga.status = 'failed'
    await sagaStore.save(saga)
    // Execute compensations
    await compensate(saga)
  }
}
```

## Event Versioning Strategy Comparison

| Strategy | Pros | Cons | Best For |
|----------|------|------|----------|
| No versioning | Simple | Breaking changes impossible | Prototypes, short-lived data |
| Version per event | Flexible, schema evolves | Upcaster code needed | Production systems |
| Compatibility checks | Catch breakage early | Schema registry overhead | Multi-team systems |
| Bi-temporal events | Maximum auditability | Complex querying | Regulated industries |

## Testing Event Sourcing

```typescript
describe('OrderAggregate', () => {
  it('places order with valid items', () => {
    const order = new OrderAggregate('order-1')
    order.placeOrder([{ productId: 'p1', quantity: 2, price: 10 }], 'customer-1')

    const changes = order.getUncommittedChanges()
    expect(changes).toHaveLength(1)
    expect(changes[0]).toBeInstanceOf(OrderPlaced)
    expect((changes[0] as OrderPlaced).data.total).toBe(20)
  })

  it('rejects empty order', () => {
    const order = new OrderAggregate('order-1')
    expect(() => order.placeOrder([], 'customer-1')).toThrow('Order must have items')
    expect(order.getUncommittedChanges()).toHaveLength(0)
  })

  it('reconstructs state from events', () => {
    const events = [
      new OrderPlaced({ orderId: 'o1', customerId: 'c1', items: [], total: 100 }),
      new PaymentConfirmed({ orderId: 'o1', transactionId: 'tx-1' }),
      new OrderShipped({ orderId: 'o1', trackingNumber: '1Z999' }),
    ]
    const order = new OrderAggregate('o1')
    order.loadFromHistory(events)
    expect(order.state.status).toBe('shipped')
  })
})
```

## Key Points

- Events are immutable facts — never modified or deleted after storage.
- Aggregate reconstruction replays all events from the event store or from the latest snapshot.
- Optimistic concurrency with version fields prevents conflicting writes.
- Snapshot every N events to speed up aggregate reconstruction.
- Event versioning uses a version field per event class; old events are upcast to the current schema.
- Upcasters transform old event versions to new ones during deserialization.
- Sagas coordinate multi-step processes across aggregates and services using events or commands.
- Event sourcing without snapshots becomes slow beyond ~1000 events per aggregate.
- The event store is the single source of truth — projections are derived, disposable read models.
