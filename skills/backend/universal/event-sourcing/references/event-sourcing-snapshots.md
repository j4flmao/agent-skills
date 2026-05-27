# Event Sourcing Snapshots

## Overview
Implement snapshot strategies for event-sourced aggregates: snapshot frequency, storage, loading optimization, and performance tuning.

## Snapshot Strategy

```typescript
interface SnapshotStrategy {
  shouldTakeSnapshot(currentVersion: number, lastSnapshotVersion: number): boolean;
}

class ThresholdSnapshotStrategy implements SnapshotStrategy {
  constructor(private readonly threshold: number = 100) {}

  shouldTakeSnapshot(currentVersion: number, lastSnapshotVersion: number): boolean {
    return currentVersion - lastSnapshotVersion >= this.threshold;
  }
}

class TimeBasedSnapshotStrategy implements SnapshotStrategy {
  constructor(private readonly intervalMs: number = 3600000) {}

  shouldTakeSnapshot(_currentVersion: number, _lastSnapshotVersion: number): boolean {
    // Time-based: take snapshot every N hours regardless of event count
    return true; // Checked externally with timer
  }
}

class AdaptiveSnapshotStrategy implements SnapshotStrategy {
  private loadHistory: number[] = [];

  constructor(
    private minThreshold: number = 50,
    private maxThreshold: number = 500,
    private targetLoadTimeMs: number = 100
  ) {}

  recordLoadTime(versionCount: number, loadTimeMs: number): void {
    this.loadHistory.push(loadTimeMs / versionCount);
    if (this.loadHistory.length > 100) this.loadHistory.shift();
  }

  shouldTakeSnapshot(currentVersion: number, lastSnapshotVersion: number): boolean {
    const avgLoadTimePerEvent = this.average();
    const estimatedLoadTime = (currentVersion - lastSnapshotVersion) * avgLoadTimePerEvent;
    return estimatedLoadTime > this.targetLoadTimeMs;
  }

  private average(): number {
    if (this.loadHistory.length === 0) return 1; // Default 1ms per event
    return this.loadHistory.reduce((a, b) => a + b, 0) / this.loadHistory.length;
  }
}
```

## Snapshot Storage

```typescript
// Snapshot schema
interface SnapshotRecord {
  aggregateType: string;
  aggregateId: string;
  version: number;
  state: Record<string, unknown>;
  createdAt: Date;
  eventCount: number; // Number of events in this snapshot
}

// PostgreSQL snapshot table
const SNAPSHOT_SCHEMA = `
  CREATE TABLE aggregate_snapshots (
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id UUID NOT NULL,
    version INTEGER NOT NULL,
    state JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_count INTEGER NOT NULL,
    PRIMARY KEY (aggregate_type, aggregate_id, version)
  );

  CREATE INDEX idx_snapshots_latest
    ON aggregate_snapshots(aggregate_type, aggregate_id, version DESC);

  CREATE INDEX idx_snapshots_old
    ON aggregate_snapshots(created_at ASC)
    WHERE version > 0;
`;

class SnapshotRepository {
  async save(snapshot: SnapshotRecord): Promise<void> {
    await db.query(
      `INSERT INTO aggregate_snapshots (aggregate_type, aggregate_id, version, state, event_count)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (aggregate_type, aggregate_id, version) DO UPDATE
       SET state = $4, event_count = $5`,
      [snapshot.aggregateType, snapshot.aggregateId, snapshot.version, snapshot.state, snapshot.eventCount]
    );
  }

  async getLatest(aggregateType: string, aggregateId: string): Promise<SnapshotRecord | null> {
    const result = await db.query(
      `SELECT * FROM aggregate_snapshots
       WHERE aggregate_type = $1 AND aggregate_id = $2
       ORDER BY version DESC
       LIMIT 1`,
      [aggregateType, aggregateId]
    );
    return result.rows[0] ?? null;
  }

  async cleanOldSnapshots(aggregateType: string, aggregateId: string, keepCount: number): Promise<void> {
    await db.query(
      `DELETE FROM aggregate_snapshots
       WHERE aggregate_type = $1 AND aggregate_id = $2
         AND version NOT IN (
           SELECT version FROM aggregate_snapshots
           WHERE aggregate_type = $1 AND aggregate_id = $2
           ORDER BY version DESC
           LIMIT $3
         )`,
      [aggregateType, aggregateId, keepCount]
    );
  }
}
```

## Loading with Snapshots

```typescript
class AggregateLoader {
  constructor(
    private eventStore: EventStore,
    private snapshotRepo: SnapshotRepository,
    private strategy: SnapshotStrategy
  ) {}

  async load<T extends AggregateRoot>(
    aggregateType: string,
    aggregateId: string,
    factory: () => T
  ): Promise<T> {
    const snapshot = await this.snapshotRepo.getLatest(aggregateType, aggregateId);

    let aggregate: T;
    let fromVersion: number;

    if (snapshot) {
      aggregate = factory();
      aggregate.setState(snapshot.state as any);
      fromVersion = snapshot.version;
    } else {
      aggregate = factory();
      fromVersion = 0;
    }

    const events = await this.eventStore.getEventsSince(
      aggregateType,
      aggregateId,
      fromVersion
    );

    const loadStart = Date.now();
    for (const event of events) {
      aggregate.apply(event);
    }
    const loadTime = Date.now() - loadStart;

    this.strategy.recordLoadTime(events.length, loadTime);

    return aggregate;
  }

  async save<T extends AggregateRoot>(
    aggregateType: string,
    aggregateId: string,
    aggregate: T,
    newEvents: DomainEvent[]
  ): Promise<void> {
    // Save events
    await this.eventStore.append(aggregateType, aggregateId, newEvents, aggregate.version);

    // Check if snapshot needed
    const lastSnapshot = await this.snapshotRepo.getLatest(aggregateType, aggregateId);
    const lastSnapshotVersion = lastSnapshot?.version ?? 0;

    if (this.strategy.shouldTakeSnapshot(aggregate.version, lastSnapshotVersion)) {
      await this.snapshotRepo.save({
        aggregateType,
        aggregateId,
        version: aggregate.version,
        state: aggregate.getState(),
        createdAt: new Date(),
        eventCount: aggregate.version - lastSnapshotVersion,
      });
    }
  }
}
```

## Snapshot Garbage Collection

```typescript
class SnapshotGarbageCollector {
  private readonly KEEP_SNAPSHOTS = 3; // Keep last 3 snapshots
  private readonly MAX_SNAPSHOT_AGE_DAYS = 30;
  private readonly CLEANUP_INTERVAL = 86400000; // Daily

  async runCleanup(): Promise<CleanupResult> {
    let oldRemoved = 0;
    let excessRemoved = 0;

    // Remove snapshots beyond retention count
    const aggregates = await this.getAggregatesWithSnapshots();
    for (const { aggregateType, aggregateId } of aggregates) {
      const removed = await this.snapshotRepo.cleanOldSnapshots(
        aggregateType,
        aggregateId,
        this.KEEP_SNAPSHOTS
      );
      excessRemoved += removed;
    }

    // Remove snapshots older than max age (for deleted aggregates)
    const oldSnapshots = await db.query(
      `DELETE FROM aggregate_snapshots
       WHERE created_at < NOW() - $1::INTERVAL
         AND aggregate_id NOT IN (
           SELECT DISTINCT aggregate_id FROM event_store
         )
       RETURNING id`,
      [`${this.MAX_SNAPSHOT_AGE_DAYS} days`]
    );
    oldRemoved += oldSnapshots.rowCount;

    return {
      excessSnapshotsRemoved: excessRemoved,
      oldSnapshotsRemoved: oldRemoved,
      timestamp: new Date(),
    };
  }
}
```

## Performance Benchmarks

```typescript
describe('Snapshot Performance', () => {
  it('loads aggregate with snapshot 10x faster than without', async () => {
    const aggregateId = 'test-agg-1';
    const eventCount = 5000;

    // Seed events
    for (let i = 0; i < eventCount; i++) {
      await eventStore.append('order', aggregateId, [createEvent(i)], i + 1);
    }

    // Load without snapshot
    const startNoSnapshot = Date.now();
    await loader.load('order', aggregateId, () => new OrderAggregate());
    const timeNoSnapshot = Date.now() - startNoSnapshot;

    // Create snapshot
    await snapshotRepo.save({
      aggregateType: 'order',
      aggregateId,
      version: eventCount,
      state: { status: 'active', count: eventCount },
      createdAt: new Date(),
      eventCount,
    });

    // Load with snapshot
    const startWithSnapshot = Date.now();
    await loader.load('order', aggregateId, () => new OrderAggregate());
    const timeWithSnapshot = Date.now() - startWithSnapshot;

    expect(timeWithSnapshot).toBeLessThan(timeNoSnapshot / 10);
  });
});
```

## Key Points
- Choose snapshot strategy: threshold (every N events), time-based (every N hours), or adaptive (based on load time)
- Store snapshots alongside events in database with version tracking
- Load from latest snapshot, then replay remaining events
- Clean up old snapshots (keep last 3, remove after 30 days for deleted aggregates)
- Snapshots should improve load time by 10x+ for aggregates with thousands of events
- Never use snapshots as source of truth — events are always authoritative
