# Replication Topologies Reference

## Master-Slave (Primary-Replica)

```
Topology:
  +--------+     async/sync      +---------+
  | Master | ------------------> | Slave 1 |
  | (write) |       +-----------> | (read)  |
  +--------+       |             +---------+
                   |             +---------+
                   +-----------> | Slave 2 |
                                 | (read)  |
                                 +---------+

Write path:  client -> Master (commit, replicate)
Read path:   client -> Slave (eventually consistent)

Characteristics:
  - N-1 slaves (typical: 2-5, max 10-20 depending on write volume)
  - All writes go to master (bottleneck for write-heavy workloads)
  - Read scaling: add more slaves for higher read throughput
  - Failover: promote slave to master (manual or auto via orchestrator)

Failure modes:
  Master fails -> Promote slave -> RPO = replication lag (seconds to minutes)
  Slave fails  -> No impact on writes, reads degrade until replacement
```

## Multi-Master

### Active-Passive (Single writer at a time)
```
  +--------+    auto-failover    +--------+
  | Master | <---- heartbeat -> | Standby|
  | (write) |    (semi-sync)     | (ready)|
  +--------+                     +--------+

  Characteristics:
    - Only one master accepts writes at any time
    - Standby applies WAL continuously, ready to promote
    - Automatic failover via etcd/Consul/ZK (Patroni, Orchestrator)
    - RPO: 0 (sync), <1s (semi-sync), seconds (async)
    - RTO: 10-30s (detection + promotion + DNS update)
```

### Active-Active (Concurrent writes)
```
  +--------+    <-- conflict -->   +--------+
  | Region |     replication        | Region |
  | A      | ---------------------> | B      |
  | (write)| <--------------------- | (write)|
  +--------+                         +--------+

  Characteristics:
    - Both regions accept writes concurrently
    - Conflict resolution is critical (LWW, CRDT, custom)
    - Latency: write latency = local commit + async replicate remote
    - RPO: near 0 (async replication), RTO: 0 (no failover needed)

  Conflict scenarios:
    - Two users update same row in different regions at same time
    - LWW: later timestamp wins (loses one update silently)
    - CRDT: data type merges both (requires CRDT data structures)
    - Custom: application-level merge (complex but precise)

  Use cases:
    - Cross-region HA (zero RTO)
    - Geo-distributed users (low latency writes locally)
    - Maintenance (take one region down, other handles traffic)
```

## Synchronous vs Asynchronous

| Feature            | Synchronous                | Asynchronous               |
|-------------------|---------------------------|---------------------------|
| Consistency        | Strong (read your write)   | Eventual                  |
| RPO                | 0 (no data loss)           | > 0 (seconds to minutes)  |
| Write latency      | Higher (RTT to replicas)   | Local commit only         |
| Availability       | Lower (replica failures    | Higher (replica failures  |
|                    |  block writes)            |  don't block writes)      |
| Network overhead   | Must ack all replicas      | Partial ack or none       |
| Use case           | Financial, metadata        | Analytics, cross-region   |

### Semi-Synchronous Compromise
- MySQL: `rpl_semi_sync_master_enabled=1, rpl_semi_sync_master_wait_for_slave_count=1`
- Master: waits for 1 slave to ack, others async
- If no slave acks within timeout (10s), falls back to async
- Balance: stronger than async, faster than full sync

## Conflict Resolution Strategies

```
LWW (Last-Writer-Wins):
  - Each write has timestamp (Lamport clock or wall clock)
  - On conflict: row with highest timestamp wins
  - Pros: simple, always converges
  - Cons: loses the losing write silently
  - Best for: simple counters, status fields, non-critical data

CRDT (Conflict-Free Replicated Data Types):
  - Data type defines merge semantics that always converge
  - G-Counter (grow-only): increment; merge = max
  - PN-Counter: positive + negative counts; merge = add
  - OR-Set (observed-remove): add element, remove specific version
  - LWW-Register: LWW on a single value
  - MV-Register: keep all concurrent values, expose to app
  - Best for: counters, sets, shopping carts, multi-value fields

Custom Merge:
  - Application handles conflict resolution
  - Example: shopping cart merge = union of items
  - Example: document merge = three-way merge (diff3)
  - Best for: complex business logic, domain-specific rules

Manual Resolution:
  - Log conflicts to exception table
  - Send alert for human resolution
  - Best for: low-frequency conflicts, highly sensitive data

GoldenGate conflict resolution:
  USEMAX:     keep row with max value of specified column
  OVERWRITE:  always apply incoming change
  MINMAX:     use min or max of column to resolve
  EXCEPTION:  log to exception table for manual handling
  DISCARD:    silently discard conflicting record
```

## CRDT Implementation Example

```python
# G-Counter (Grow-Only Counter)
class GCounter:
    def __init__(self, node_id, counts=None):
        self.node_id = node_id
        self.counts = counts or {}

    def increment(self, amount=1):
        self.counts[self.node_id] = self.counts.get(self.node_id, 0) + amount

    def value(self):
        return sum(self.counts.values())

    def merge(self, other):
        new_counts = dict(self.counts)
        for node, count in other.counts.items():
            new_counts[node] = max(new_counts.get(node, 0), count)
        return GCounter(self.node_id, new_counts)

# PN-Counter (Positive-Negative Counter)
class PNCounter:
    def __init__(self, node_id):
        self.positive = GCounter(node_id)
        self.negative = GCounter(node_id)

    def increment(self, amount=1):
        self.positive.increment(amount)

    def decrement(self, amount=1):
        self.negative.increment(amount)

    def value(self):
        return self.positive.value() - self.negative.value()

    def merge(self, other):
        merged_p = self.positive.merge(other.positive)
        merged_n = self.negative.merge(other.negative)
        result = PNCounter(self.positive.node_id)
        result.positive = merged_p
        result.negative = merged_n
        return result
```
