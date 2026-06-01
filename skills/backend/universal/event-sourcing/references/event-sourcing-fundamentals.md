# Event Sourcing Fundamentals

## What is Event Sourcing?

Event sourcing is a pattern where state changes are stored as a sequence of immutable events, rather than as the current state. The current state is derived by replaying all events in order.

```
Traditional:  UPDATE users SET email = 'new@email.com' WHERE id = 1
Event Store:  APPEND UserEmailChanged { userId: 1, old: 'old@email.com', new: 'new@email.com' }
```

## Core Principles

### Append-Only Store
Events are never updated or deleted — only appended. This provides a complete audit trail and enables temporal queries.

### Current State is Derived
The current state of an aggregate is computed by replaying all its events from the beginning:

```
Event 1: UserRegistered { name: "Alice", email: "a@b.com" }
Event 2: UserEmailChanged { newEmail: "alice@example.com" }
Event 3: UserDeactivated { reason: "user request" }

Current state (after replay):
  { name: "Alice", email: "alice@example.com", status: "deactivated" }
```

### Events are Facts
Events represent things that happened in the past. They are immutable. You cannot change the past — you can only record new events that correct previous ones.

## Event Store Schema

### PostgreSQL Event Store
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

CREATE INDEX idx_events_aggregate ON event_store(aggregate_type, aggregate_id, version);
CREATE INDEX idx_events_type ON event_store(event_type);
CREATE INDEX idx_events_created ON event_store(created_at);
```

### Event Store Operations
```typescript
interface IEventStore {
  append(
    aggregateType: string,
    aggregateId: string,
    events: Event[],
    expectedVersion: number,
  ): Promise<void>;

  getAggregateEvents(
    aggregateType: string,
    aggregateId: string,
  ): Promise<Event[]>;

  getEventsByType(
    eventTypes: string[],
    afterVersion?: number,
  ): Promise<Event[]>;

  getEventsSince(
    aggregateType: string,
    aggregateId: string,
    sinceVersion: number,
  ): Promise<Event[]>;
}
```

## Aggregate Pattern

### Aggregate Root
The aggregate root is the entry point for all operations on the aggregate. It:
- Validates commands against business rules
- Emits events when state changes
- Maintains a version counter for concurrency control

```typescript
abstract class AggregateRoot {
  private events: Event[] = [];
  private version = 0;

  protected addEvent(event: Event): void {
    this.events.push(event);
  }

  getUncommittedEvents(): Event[] {
    return [...this.events];
  }

  markEventsAsCommitted(): void {
    this.events = [];
  }

  getVersion(): number {
    return this.version;
  }

  setVersion(version: number): void {
    this.version = version;
  }
}

class UserAggregate extends AggregateRoot {
  private email: string = '';
  private status: string = 'active';

  register(email: string, name: string): void {
    if (this.status !== 'active') throw new Error('Already registered');
    this.addEvent(new UserRegisteredEvent({
      userId: this.id,
      email,
      name,
    }));
  }

  changeEmail(newEmail: string): void {
    if (this.status !== 'active') throw new Error('User deactivated');
    if (newEmail === this.email) return; // No-op
    this.addEvent(new UserEmailChangedEvent({
      userId: this.id,
      oldEmail: this.email,
      newEmail,
    }));
  }

  applyEvent(event: UserRegisteredEvent): void {
    this.email = event.data.email;
    this.status = 'active';
  }

  applyEvent(event: UserEmailChangedEvent): void {
    this.email = event.data.newEmail;
  }
}
```

## Optimistic Concurrency Control

### Version-Based Concurrency
```typescript
class EventStore {
  async append(
    aggregateType: string,
    aggregateId: string,
    events: Event[],
    expectedVersion: number,
  ): Promise<void> {
    try {
      let version = expectedVersion;
      for (const event of events) {
        version++;
        await this.db.query(
          `INSERT INTO event_store (aggregate_type, aggregate_id, version, event_type, event_data, metadata)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [aggregateType, aggregateId, version, event.eventType, event.data, event.metadata],
        );
      }
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new ConcurrencyError(`Version ${expectedVersion} conflict for ${aggregateType}:${aggregateId}`);
      }
      throw error;
    }
  }
}
```

## Projections

### What is a Projection?
A projection is a read model derived from the event stream. It transforms events into a query-optimized format.

```typescript
class UserListProjection {
  async onUserRegistered(event: UserRegisteredEvent): Promise<void> {
    await this.readDb.insert('user_list', {
      id: event.data.userId,
      name: event.data.name,
      email: event.data.email,
      status: 'active',
      registeredAt: event.metadata.timestamp,
    });
  }

  async onUserEmailChanged(event: UserEmailChangedEvent): Promise<void> {
    await this.readDb.update('user_list', event.data.userId, {
      email: event.data.newEmail,
    });
  }

  async onUserDeactivated(event: UserDeactivatedEvent): Promise<void> {
    await this.readDb.update('user_list', event.data.userId, {
      status: 'deactivated',
      deactivatedAt: event.metadata.timestamp,
    });
  }

  // Full rebuild
  async rebuild(): Promise<void> {
    await this.readDb.clear('user_list');
    const events = await this.eventStore.getEventsByType([
      'UserRegistered',
      'UserEmailChanged',
      'UserDeactivated',
    ]);
    for (const event of events) {
      await this.handleEvent(event);
    }
  }
}
```

## Snapshotting

### Why Snapshots?
Replaying thousands of events to reconstruct an aggregate is slow. Snapshots store the aggregate state at a point in time, allowing reconstruction from the snapshot + recent events.

### Snapshot Store
```sql
CREATE TABLE snapshots (
  aggregate_type VARCHAR(100) NOT NULL,
  aggregate_id UUID NOT NULL,
  version INTEGER NOT NULL,
  state JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (aggregate_type, aggregate_id, version)
);
```

### Snapshot Strategy
```typescript
class SnapshotStrategy {
  private readonly snapshotFrequency = 50; // Snapshot every 50 events

  shouldTakeSnapshot(aggregate: AggregateRoot): boolean {
    return aggregate.getVersion() % this.snapshotFrequency === 0;
  }

  async loadWithSnapshot(aggregateType: string, aggregateId: string): Promise<{
    aggregate: AggregateRoot;
    version: number;
  }> {
    const snapshot = await this.snapshotRepo.getLatest(aggregateType, aggregateId);
    const sinceVersion = snapshot?.version ?? 0;
    const events = await this.eventStore.getEventsSince(aggregateType, aggregateId, sinceVersion);

    const aggregate = snapshot
      ? AggregateRoot.fromSnapshot(snapshot.state)
      : this.createEmptyAggregate();

    for (const event of events) {
      aggregate.applyEvent(event);
      aggregate.setVersion(event.metadata.version);
    }

    return { aggregate, version: aggregate.getVersion() };
  }
}
```

## Common Pitfalls

1. **Event sourcing everything**: Not all entities need event sourcing. Use it where history matters.
2. **No snapshot strategy**: Without snapshots, reconstructing aggregates with thousands of events is slow.
3. **Projections not rebuildable**: Every projection must be rebuildable from the event stream.
4. **Inconsistent events**: Events for one aggregate should always be internally consistent.
5. **Events tied to DB schema**: Events model business facts, not database column changes.
6. **No upcasting strategy**: Old event schemas must be converted to current format when read.
7. **Mutable events**: Events are immutable. Correct errors with compensating events.
