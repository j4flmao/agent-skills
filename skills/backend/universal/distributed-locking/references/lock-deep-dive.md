# Distributed Locking — Deep Dive

## Fencing Tokens

Protect against delayed or stalled lock holders:

```sql
-- PostgreSQL: use row version as fencing token
BEGIN;
SELECT version FROM resources WHERE id = 123 FOR UPDATE;
-- version = 5

UPDATE resources SET data = 'new', version = 6
WHERE id = 123 AND version = 5;
-- Affected rows = 1 → lock valid
ROLLBACK;
```

```redis
-- Redis: use INCR as fencing token
INCR resource:order-123:fence
-- Returns 1 (first request)
-- Later: check if token > last processed token before writing
```

| Mechanism | Token Source | Safety Guarantee |
|-----------|-------------|-----------------|
| Database version column | Auto-increment/sequence | Strong |
| ZooKeeper zxid | Transaction ID | Strong |
| etcd revision | Cluster-wide revision | Strong |
| Redis INCR | Atomic counter | Weak (no consensus) |

## Lease Management

| Phase | Action | Duration |
|-------|--------|----------|
| Acquire | Lock with TTL | Initial TTL |
| Extend | Refresh TTL before expiry | TTL/3 intervals |
| Release | Explicit unlock | Immediate |
| Expiry | Auto-release after TTL | Configurable |

```python
# Python — lease with auto-extend
class Lease:
    def __init__(self, redis, key: str, ttl: int):
        self.redis = redis
        self.key = f"lock:{key}"
        self.ttl = ttl
        self._extend_task = None

    async def acquire(self) -> bool:
        ok = await self.redis.setnx(self.key, "locked")
        if ok:
            await self.redis.expire(self.key, self.ttl)
            self._start_extend()
        return ok

    async def _extend(self):
        while True:
            await asyncio.sleep(self.ttl / 3)
            await self.redis.expire(self.key, self.ttl)

    async def release(self):
        if self._extend_task:
            self._extend_task.cancel()
        await self.redis.delete(self.key)
```

## Clock Drift Problem

Redlock requires synchronized clocks across Redis nodes. Clock drift of 1 second between 3 nodes invalidates the safety guarantee.

| Mitigation | Trade-off |
|------------|-----------|
| NTP with tight sync | Infrastructure requirement |
| Small drift factor (0.01) | Lower availability |
| Fencing tokens | Added complexity |
| Use ZooKeeper/etcd instead | Operational cost |

## Redlock Debate (Martin Kleppmann vs Redis)

| Argument | For Redlock | Against Redlock |
|----------|------------|----------------|
| Consensus | 3 of 5 nodes sufficient | Not a consensus protocol |
| GC pause | Fencing token fixes | Fencing requires storage support |
| Clock drift | Small drift acceptable | Drift in real world > expected |
| Recommendation | Good enough for most locks | Use ZooKeeper for critical locks |

## Split-Brain Scenarios

| Scenario | Effect | Mitigation |
|----------|--------|------------|
| Network partition | Both sides think they hold lock | Fencing tokens |
| GC pause | Holder pauses past TTL, lock acquired by another | Fencing + short TTL |
| Clock skew | Lock expires early or late | NTP monitoring, drift factor |
| Redis failover | Lock lost on node fail | Redlock (multi-node) |
| Process hang | Zombie holder | TTL + fencing |

## Comparison

| Feature | Redis/Redlock | ZooKeeper | etcd | PostgreSQL |
|---------|--------------|-----------|------|------------|
| Consistency | Probabilistic | Strong | Strong | Strong |
| Latency | <1ms | 5-10ms | 2-5ms | 1-5ms |
| Throughput | 100K+/s | 10K/s | 10K/s | 5K/s |
| Fencing | Custom | zxid | revision | version |
| Operations | Simple | Complex | Medium | Existing DB |
| Best for | High-throughput, short locks | Critical coordination | K8s-native | Same-DB consistency |
