---
name: architecture-database-scaling
description: >
  Use this skill when the user says 'scale the database', 'sharding', 'shard key', 'consistent hashing', 'read replicas', 'partitioning', 'Citus', 'Vitess', 'resharding', 'hot partition'. Walks the scaling ladder from query/index fixes through vertical scaling, caching, read replicas, and partitioning to horizontal sharding, and designs shard keys, routing, and resharding. Do NOT use for: PostgreSQL engine internals (architecture/databases/postgresql-internals), algorithm-level sharding theory drills (system-design/database-sharding), or NoSQL product selection (data/nosql-database).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [architecture, database, sharding, partitioning, replication, consistent-hashing, scaling]
---

# Database Scaling & Sharding

## Purpose
Sharding is the most expensive scaling step: it complicates queries, transactions, schema changes, and operations forever. Exhaust cheaper steps first, then, if write volume or data size truly exceeds one node, pick a shard key that keeps most queries single-shard and plan resharding from day one.

## Agent Protocol

### Trigger
"database scaling", "sharding", "shard key", "consistent hashing", "read replica", "table partitioning", "Citus", "Vitess", "resharding", "hot shard".

### Input Context
- Current size, growth rate, read/write QPS, p99 latency, top queries.
- Bottleneck evidence: CPU, I/O, storage, connections, lock contention.
- Access patterns: which key most queries filter by; cross-entity queries/transactions.
- Consistency needs (read-your-writes, cross-entity transactions).

### Output Artifact
Scaling plan: next step on the ladder with evidence, or shard design (key, strategy, routing, resharding, cross-shard handling).

### Response Format
```
Bottleneck: {resource} evidence: {metric}
Step: {index/query|vertical|cache|replicas|partitioning|sharding}
Shard key: {column} (cardinality, distribution, query coverage {x}%)
Strategy: {hash|range|directory|geo}  Routing: {app lib|proxy (Vitess/Citus)}
Cross-shard: {fan-out|denormalize|saga}  Resharding: {virtual buckets → move}
```

### Completion Criteria
- [ ] Bottleneck proven with metrics before choosing a step.
- [ ] Shard key covers the dominant queries and distributes load evenly.
- [ ] Resharding approach defined (logical buckets, online move).
- [ ] Cross-shard queries and transactions explicitly handled.

## The Scaling Ladder
| Step | Fixes | Cost |
|---|---|---|
| 1. Query + index tuning | Most "DB is slow" cases | Low |
| 2. Connection pooling (PgBouncer, RDS Proxy) | Connection exhaustion | Low |
| 3. Vertical scaling | CPU/RAM/IOPS limits | Money; has a ceiling |
| 4. Caching (cache-aside) | Read-heavy hot keys | Invalidation complexity |
| 5. Read replicas | Read throughput | Replication lag: stale reads |
| 6. Partitioning (single node) | Huge tables, retention (drop old partitions) | Partition key in queries |
| 7. Functional split | Separate DBs per domain/service | Cross-domain joins move to app |
| 8. Horizontal sharding | Write throughput, data beyond one node | High, permanent |

Read replicas: route reads that tolerate lag; for read-your-writes, read from the primary for a short window after a user's write or wait for the replica LSN.

## Sharding Strategies
| Strategy | How | Pros | Cons |
|---|---|---|---|
| Hash | `bucket = hash(key) mod B` → bucket-to-shard map | Even distribution | Range scans hit all shards |
| Range | Key ranges per shard | Range queries efficient | Hotspots on monotonic keys (time, sequential ids) |
| Directory | Lookup table key → shard | Flexible moves, tenant placement | Lookup service is critical path |
| Geo | By region | Data residency, latency | Uneven sizes |

**Never map keys directly with `hash(key) % N_servers`**: changing N remaps almost every key. Use a fixed, large number of logical buckets (e.g. 1024-4096) mapped to physical shards, consistent hashing with virtual nodes, or rendezvous/jump hashing.

## Consistent Hashing with Virtual Nodes

```python
from __future__ import annotations

import bisect
import hashlib


def _h(value: str) -> int:
    return int.from_bytes(hashlib.sha256(value.encode()).digest()[:8], "big")


class HashRing:
    """Adding/removing a node moves only ~1/N of keys. Virtual nodes smooth the distribution."""

    def __init__(self, nodes: list[str], vnodes: int = 200) -> None:
        if not nodes:
            raise ValueError("HashRing needs at least one node")
        self.vnodes = vnodes
        self._ring: list[tuple[int, str]] = []
        for node in nodes:
            self.add(node)

    def add(self, node: str) -> None:
        for i in range(self.vnodes):
            bisect.insort(self._ring, (_h(f"{node}#{i}"), node))

    def remove(self, node: str) -> None:
        self._ring = [(h, n) for h, n in self._ring if n != node]
        if not self._ring:
            raise ValueError(f"removing {node} left the ring empty")

    def node_for(self, key: str) -> str:
        idx = bisect.bisect(self._ring, (_h(key), "")) % len(self._ring)
        return self._ring[idx][1]
```

## Choosing a Shard Key
1. **Query coverage**: the key appears in the WHERE clause of most hot queries (tenant_id, user_id, account_id).
2. **Cardinality and distribution**: many distinct values, no single value dominating (watch "whale" tenants; give them dedicated shards via a directory).
3. **Transaction locality**: entities updated together share the key (co-locate orders with their customer).
4. **Not monotonic** for range strategies (avoid raw timestamps or sequential ids as range keys).

## Cross-Shard Operations
| Need | Approach |
|---|---|
| Query across shards | Scatter-gather with limits/timeouts; better: a separate read model (search index, warehouse) fed by CDC |
| Global uniqueness (email) | Dedicated lookup table/service, or unique constraint in a global table |
| Multi-shard transaction | Avoid by key design; otherwise saga with compensation; 2PC only within systems that support it well |
| Global IDs | UUIDv7, ULID, or Snowflake-style ids (not per-shard sequences) |
| Reference data | Replicate small tables to all shards (Citus reference tables) |

## Tools
| Tool | Model |
|---|---|
| Citus (PostgreSQL extension) | Distributed tables by distribution column, co-location, reference tables |
| Vitess (MySQL) | VSchema with vindexes, online resharding, query routing via vtgate |
| Native partitioning (PostgreSQL) | `PARTITION BY RANGE/LIST/HASH` within one node |
| Distributed SQL (CockroachDB, YugabyteDB, Spanner, TiDB) | Automatic range sharding + distributed transactions; higher per-query latency |

```sql
-- PostgreSQL range partitioning for retention, single node
CREATE TABLE events (
  id         BIGINT GENERATED ALWAYS AS IDENTITY,
  tenant_id  BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  payload    JSONB NOT NULL,
  PRIMARY KEY (id, created_at)          -- PK must include the partition key
) PARTITION BY RANGE (created_at);
CREATE TABLE events_2026_10 PARTITION OF events
  FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');

-- Citus: distribute by tenant and co-locate related tables
SELECT create_distributed_table('orders', 'tenant_id');
SELECT create_distributed_table('order_items', 'tenant_id', colocate_with => 'orders');
```

## Resharding
1. Shard by logical buckets from the start so moves are bucket-granular.
2. Copy bucket data to the new shard (snapshot + CDC catch-up).
3. Verify counts/checksums; briefly block writes for the bucket or use dual-write with idempotency.
4. Flip the routing map; keep the old copy read-only until verified; then delete.

## Anti-Patterns
- Sharding before fixing indexes, queries, and pooling.
- Shard key absent from most queries → every request fans out.
- Modulo-by-server-count routing.
- Per-shard auto-increment ids leaking into global identity.
- Cross-shard joins in the request path.

## Checklist
- [ ] Bottleneck evidence and cheaper steps exhausted.
- [ ] Shard key analysis with query coverage and skew numbers.
- [ ] Logical buckets + routing layer; resharding runbook tested.
- [ ] Global ids, uniqueness, and cross-shard reads designed.
- [ ] Per-shard monitoring (size, QPS, p99, replication lag).
- [ ] Backups and restores per shard and point-in-time consistent where needed.

## References
- Karger et al., "Consistent Hashing and Random Trees" (STOC 1997); Lamping & Veach, "A Fast, Minimal Memory, Consistent Hash Algorithm" (jump hash, 2014).
- Kleppmann, "Designing Data-Intensive Applications", ch. 5-6.
- Citus and Vitess documentation (distribution columns, vindexes, resharding).
