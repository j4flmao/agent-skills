# Event Sourcing: Snapshotting Strategies

## 1. The Replay Performance Bottleneck
When an aggregate (e.g., a Bank Account or a Shopping Cart) is loaded into memory to process a new command, the system must fetch all historical events for that aggregate and replay them sequentially to reconstruct the current state.

For an aggregate with 10 events, this takes microseconds. For an aggregate like a "Global Inventory Ledger" with 5,000,000 events, loading it takes seconds or minutes, leading to massive CPU and I/O bottlenecks.

## 2. The Snapshot Pattern (Memento)
A snapshot is a point-in-time, denormalized representation of an aggregate's state. Instead of reading all events from Version 1, the system loads the latest snapshot and only replays the events that occurred *after* the snapshot was taken.

### Formula
`Current State = Snapshot(Version N) + Replay Events(Version N+1 to Current)`

## 3. Snapshotting Heuristics
Snapshots should not be generated synchronously during the command transaction, as this slows down write performance. They should be generated asynchronously.

### Frequency Strategies
1. **Event Count Threshold**: Create a new snapshot every $N$ events (e.g., every 100 events).
2. **Time-Based (Cron)**: Take snapshots of all active aggregates every night at 2:00 AM.
3. **Time-To-Live (Cache)**: Keep the fully hydrated aggregate in memory (e.g., Redis). If it's evicted due to LRU, generate a snapshot before eviction.

## 4. Implementation Example (C# Pseudo-code)
```csharp
public async Task<Aggregate> LoadAggregate(Guid aggregateId)
{
    // 1. Fetch latest snapshot
    var snapshot = await _snapshotStore.GetLatestSnapshotAsync(aggregateId);
    int startVersion = snapshot != null ? snapshot.Version : 0;
    
    // 2. Initialize aggregate (from snapshot if exists, otherwise blank)
    var aggregate = new Aggregate();
    if (snapshot != null) {
        aggregate.RestoreFromSnapshot(snapshot.Data);
    }
    
    // 3. Fetch ONLY the events that occurred after the snapshot
    var events = await _eventStore.GetEventsAsync(aggregateId, startVersion + 1);
    
    // 4. Replay the remaining events
    foreach (var e in events) {
        aggregate.Apply(e);
    }
    
    return aggregate;
}
```
