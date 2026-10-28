---
name: system-design-database-sharding
description: >
  Use this skill when the user says 'sharding', 'shard key', 'partition key', 'horizontal partitioning', 'resharding', 'hot shard', 'cross-shard query', 'Vitess', 'Citus', 'database scaling', 'read replicas vs sharding', 'tenant per shard'. Decides when and how to shard a database: scaling steps before sharding, shard-key selection, range/hash/directory strategies, routing, cross-shard queries and transactions, resharding without downtime, and managed options (Vitess, Citus, distributed SQL). Do NOT use for: hashing algorithm internals (use core-algorithms-system-design), single-node schema design (use data/relational-database), consensus/replication protocol theory (use distributed-consensus).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [system-design, sharding, databases, scaling, partitioning]
---

# Database Sharding

## Purpose
Sharding splits one logical dataset across independent database servers so writes and storage scale horizontally. It is also one of the most expensive architectural decisions to undo: queries, transactions, schema changes and operations all get harder. This skill decides whether sharding is needed, chooses the shard key and strategy, and plans routing and resharding.

## Agent Protocol

### Trigger
"sharding", "shard key", "partition key", "horizontal partitioning", "resharding", "hot shard", "cross-shard query", "Vitess", "Citus", "database scaling", "tenant per shard".

### Input Context
- Current database, size and growth, read/write QPS, largest tables
- Dominant query patterns (by tenant? by user? time ranges? global search?)
- Consistency needs for multi-entity operations; team's operational capacity

### Output Artifact
Scaling recommendation, shard-key analysis, routing design, resharding plan. No file unless requested.

### Response Format
```
Need to shard? {yes/no + evidence}
Shard key: {column(s)} — cardinality, distribution, query alignment
Strategy: {hash | range | directory | geo/tenant}
Routing: {app library | proxy (Vitess/ProxySQL) | distributed DB}
Cross-shard: {queries, transactions, global indexes handling}
Resharding: {plan and cut-over}
```

## 1. Before Sharding
Exhaust cheaper options first, in roughly this order:
1. Query and index tuning, connection pooling (PgBouncer), removing N+1 patterns.
2. Vertical scaling (bigger instance, faster storage) — modern single nodes handle very large workloads.
3. Read replicas for read-heavy traffic (accept replication lag for those reads).
4. Caching hot reads.
5. Native table partitioning (PostgreSQL declarative partitioning) for big time-series tables — same server, easier pruning and retention.
6. Splitting by service/domain (separate databases per bounded context).
Shard when a single primary cannot sustain write throughput or storage, or when isolation per tenant/region is a requirement.

## 2. Choosing the Shard Key
A good key:
- **Matches the dominant access pattern**: most queries include it, so they hit one shard (e.g. `tenant_id` in B2B SaaS, `user_id` in consumer apps).
- **High cardinality and even distribution**: avoids hot shards. Low-cardinality keys (country, status) do not scale.
- **Stable**: changing a row's key means moving it between shards.
- **Co-locates related data**: child tables carry the same key (orders, order_items keyed by `tenant_id`) so joins and transactions stay local.

Watch for: whale tenants (one tenant larger than a shard — give it dedicated shards), monotonically increasing keys with range sharding (all inserts hit the last shard), celebrity/hot keys.

## 3. Strategies
| Strategy | How | Pros | Cons |
|----------|-----|------|------|
| Hash | `shard = H(key) mod S` over many logical shards, or consistent hashing | even distribution | range scans hit all shards |
| Range | key ranges per shard (split when large) | efficient range queries, easy splits | hotspots with sequential keys |
| Directory / lookup | mapping table key → shard | flexible placement, move tenants individually | lookup service is critical path; cache it |
| Geo / tenant | by region or customer | data residency, isolation | uneven sizes |

Practical pattern: hash into a fixed, large number of **logical shards** (e.g. 1024 or 4096), then map logical shards to physical servers via a directory. Resharding moves whole logical shards instead of rehashing rows.
```python
import hashlib

LOGICAL_SHARDS = 4096

def logical_shard(tenant_id: str) -> int:
    digest = hashlib.blake2b(tenant_id.encode(), digest_size=8).digest()
    return int.from_bytes(digest, "big") % LOGICAL_SHARDS

def physical_server(tenant_id: str, directory: dict[int, str]) -> str:
    shard = logical_shard(tenant_id)
    try:
        return directory[shard]               # e.g. {0..1023: "db-a", 1024..2047: "db-b", ...}
    except KeyError as exc:
        raise LookupError(f"no server mapped for logical shard {shard} (tenant {tenant_id})") from exc
```

## 4. Routing
- In-app routing library (simple, couples app to topology).
- Proxy/middleware: Vitess (MySQL; used at YouTube, Slack, GitHub), ProxySQL, Citus coordinator (PostgreSQL extension), Apache ShardingSphere.
- Distributed SQL databases handle sharding and rebalancing internally: CockroachDB, YugabyteDB, TiDB, Google Spanner, Amazon Aurora DSQL — trade operational simplicity for latency and cost characteristics you must test.

## 5. Cross-Shard Concerns
- **Queries** without the shard key fan out to every shard (scatter-gather) — slow and fragile. Serve them from a separate read model (search index, analytics warehouse fed by CDC).
- **Global uniqueness**: IDs must be unique across shards — use UUIDv7/ULID/Snowflake-style IDs rather than per-shard auto-increment.
- **Global secondary indexes** (e.g. find user by email when sharded by user_id): maintain a lookup table sharded by the secondary key, updated transactionally where possible or via outbox/CDC.
- **Transactions** across shards: avoid by design (co-location); otherwise sagas with compensation, or a database that supports distributed transactions. Two-phase commit across independent databases is fragile under failures.
- **Schema changes** must roll out to every shard; use online schema change tools (gh-ost, pt-online-schema-change, Vitess Online DDL) and backward-compatible migrations.

## 6. Resharding Without Downtime
1. Provision target shards; start copying the logical shards to move (snapshot + change stream/CDC).
2. Keep replicating until lag is near zero; verify checksums/row counts.
3. Briefly block writes for the moved logical shards (or use the proxy's cut-over), switch the directory entry, resume.
4. Keep the old copy read-only until verified, then drop it.
Vitess `MoveTables`/`Reshard` workflows and Citus shard rebalancer automate this pattern.

## 7. Operations
- Per-shard monitoring (size, QPS, p99, replication lag) to spot hot shards.
- Backups and point-in-time recovery per shard, with a consistent cross-shard restore plan if business logic spans shards.
- Capacity rule: split before a shard reaches ~60–70% of its storage/throughput ceiling; moves take time.

## 8. Anti-Patterns
| Anti-pattern | Problem | Fix |
|--------------|---------|-----|
| Sharding too early | complexity without need | exhaust section 1 first |
| Shard key not in most queries | scatter-gather everywhere | pick the key from query patterns |
| Physical `hash % servers` | full reshuffle on growth | logical shards + directory |
| Auto-increment IDs per shard | collisions | UUIDv7 / Snowflake IDs |
| Cross-shard joins in OLTP paths | latency, partial failures | co-locate or denormalise |
| No plan for whale tenants | one hot shard | dedicated shards, directory placement |

## 9. Checklist
- [ ] Evidence that vertical scaling/replicas/partitioning are insufficient
- [ ] Shard key validated against top queries and distribution data
- [ ] Logical-shard indirection for future moves
- [ ] Global IDs and secondary lookups designed
- [ ] Cross-shard queries routed to a separate read model
- [ ] Resharding runbook tested in staging
