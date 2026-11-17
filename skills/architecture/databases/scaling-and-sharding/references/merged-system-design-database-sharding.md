# Database Sharding — Supplementary Notes

Folded in from the former `system-design/database-sharding` skill. The scaling ladder, shard-key rules, strategies, cross-shard handling and resharding steps live in `../SKILL.md`; this file keeps only the material that is not repeated there.

## Logical Shards Behind a Directory
Hash into a fixed, large number of logical shards (e.g. 1024 or 4096), then map logical shards to physical servers through a directory. Resharding moves whole logical shards instead of rehashing rows.

```python
from __future__ import annotations

import hashlib

LOGICAL_SHARDS = 4096


def logical_shard(tenant_id: str) -> int:
    digest = hashlib.blake2b(tenant_id.encode(), digest_size=8).digest()
    return int.from_bytes(digest, "big") % LOGICAL_SHARDS


def physical_server(tenant_id: str, directory: dict[int, str]) -> str:
    shard = logical_shard(tenant_id)
    try:
        return directory[shard]  # e.g. shards 0-1023 -> "db-a", 1024-2047 -> "db-b"
    except KeyError as exc:
        raise LookupError(f"no server mapped for logical shard {shard} (tenant {tenant_id})") from exc
```

Cache the directory in the application and version it, so a routing flip during resharding is a single atomic change.

## Routing Options
- **In-app routing library**: simplest, but couples every service to the topology.
- **Proxy / middleware**: Vitess (MySQL), ProxySQL, the Citus coordinator (PostgreSQL extension), Apache ShardingSphere.
- **Distributed SQL**: CockroachDB, YugabyteDB, TiDB, Google Spanner, Amazon Aurora DSQL shard and rebalance internally. You trade operational work for per-query latency and cost profiles that you must benchmark with your own workload.

## Anti-Patterns
| Anti-pattern | Problem | Fix |
|--------------|---------|-----|
| Sharding too early | Complexity without need | Exhaust the scaling ladder first |
| Shard key not in most queries | Scatter-gather everywhere | Pick the key from query patterns |
| Physical `hash % servers` | Full reshuffle on growth | Logical shards + directory |
| Auto-increment IDs per shard | Collisions across shards | UUIDv7 / ULID / Snowflake IDs |
| Cross-shard joins in OLTP paths | Latency, partial failures | Co-locate or denormalise |
| No plan for whale tenants | One hot shard | Dedicated shards via directory placement |
