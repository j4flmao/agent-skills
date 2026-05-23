# Distributed Lock Strategies

## Strategy Comparison

| Strategy | Safety | Liveness | Throughput | Complexity |
|----------|--------|----------|------------|------------|
| Single-node Redis | Moderate | High | Very High | Low |
| Redlock | Strong | Moderate | High | Medium |
| ZooKeeper sequential | Strong | High | Moderate | High |
| etcd leases | Strong | High | Moderate | Medium |
| PostgreSQL advisory | Strong | High | Moderate | Low |
| Database row lock | Moderate | Moderate | Low | Low |

## Redlock Algorithm (Redis)

### How It Works
1. Client gets current timestamp (T1).
2. Client acquires lock in N/2+1 independent Redis nodes (sequential, short timeout).
3. If majority acquired within TTL, lock is held.
4. If not, release all acquired locks and retry with backoff.

### Implementation
```javascript
const redlock = new Redlock(
  [redis1, redis2, redis3, redis4, redis5], // odd number
  { retryCount: 3, retryDelay: 200, retryJitter: 100 }
);

async function withLock(name, ttl, fn) {
  let lock;
  try {
    lock = await redlock.acquire([`lock:${name}`], ttl);
    return await fn();
  } finally {
    if (lock) await lock.release().catch(() => {});
  }
}
```

### Redlock Gotchas
- Requires at least 3 Redis nodes (odd count, minimum 3).
- All nodes must be independent (not replicas of each other).
- TTL must be generous enough to cover the critical section.
- Clock drift can break safety — ensure clock sync (NTP).
- If the critical section runs longer than TTL, the lock expires and another client acquires it.

## ZooKeeper Sequential Lock

### How It Works
1. Create an ephemeral sequential node (`_lock_` prefix).
2. List all lock nodes under the parent.
3. If your node has the lowest sequence number, you hold the lock.
4. Otherwise, watch the next-lowest node and wait for it to disappear.

```java
InterProcessMutex lock = new InterProcessMutex(client, "/locks/resource-1");
lock.acquire(10, TimeUnit.SECONDS);
try { /* critical section */ }
finally { lock.release(); }
```

### Benefits
- Strong consistency (ZAB protocol).
- No clock dependency — safety is guaranteed.
- Ephemeral nodes auto-cleanup on session expiry.

## etcd Lease-Based Lock

```go
// Uses etcd concurrency package
import "go.etcd.io/etcd/client/v3/concurrency"

session, _ := concurrency.NewSession(client)
lock := concurrency.NewMutex(session, "/locks/resource-1")
lock.Lock(context.TODO())
// critical section
lock.Unlock()
```

## PostgreSQL Advisory Lock

### Session-Level (Manual Release)
```sql
SELECT pg_advisory_lock(hashtext('resource-order-123'));
-- critical section
SELECT pg_advisory_unlock(hashtext('resource-order-123'));
```

### Transaction-Level (Auto-Release)
```sql
SELECT pg_advisory_xact_lock(hashtext('resource-order-123'));
-- critical section (lock released on COMMIT/ROLLBACK)
```

### Class IDs
Use class ID for namespace isolation:
```sql
SELECT pg_advisory_lock(1, hashtext('order-123')); -- class 1 = order locks
SELECT pg_advisory_lock(2, hashtext('payment-456')); -- class 2 = payment locks
```

## Fencing Tokens
A fencing token is a monotonically increasing number that proves a client held the lock at a specific point in time.

### Implementation
```sql
UPDATE resources
SET version = version + 1
WHERE id = $1 AND version = $2
RETURNING version; -- version is the fencing token
```

The write operation includes the fencing token:
```sql
UPDATE orders SET status = 'processed', fencing_token = $1
WHERE id = $2 AND fencing_token < $1;
```

This prevents stale lock holders from overwriting newer data.

## Lock Timeout / Lease
Every lock must have a TTL. Choose based on the critical section:

| Operation | TTL |
|-----------|-----|
| In-memory computation | 1-5 seconds |
| Single DB update | 5-10 seconds |
| Multi-step workflow | 10-30 seconds |
| File processing | 30-60 seconds |
| External API call | 10-20 seconds |

Set TTL to 2x the expected maximum execution time to handle GC pauses and slow disks.

## Monitoring
Essential metrics for lock health:
- `lock.acquisition.time` — time to acquire lock.
- `lock.hold.time` — time holding lock.
- `lock.contention.rate` — how often clients wait.
- `lock.timeout.rate` — how often clients give up.
- `lock.fencing.token` — current fencing token (gauge).
