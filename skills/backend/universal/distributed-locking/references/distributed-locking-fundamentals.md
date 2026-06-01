# Distributed Locking Fundamentals

## What is Distributed Locking?

A distributed lock is a synchronization mechanism that coordinates access to a shared resource across multiple service instances running on different machines. Unlike in-process mutexes, distributed locks must handle network failures, clock drift, and partial system failures.

## Core Properties

### Safety
A distributed lock must guarantee mutual exclusion — at most one holder can hold the lock at any time.

### Liveness
The lock must eventually be releasable — a crashed holder must not block all future acquisitions.

### Fault Tolerance
The lock service itself must be resilient to failures — losing a lock node should not permanently lose the lock.

## Lock Providers Comparison

| Provider | Consistency | Throughput | Complexity | Fencing | Cost |
|----------|------------|------------|------------|---------|------|
| Redis (single) | Weak | 100K+/s | Low | No | Free |
| Redlock (3+ Redis) | Probabilistic | 10K-100K/s | Medium | Via key | Free |
| PostgreSQL Advisory | Strong | 1K-10K/s | Low | Via version | In DB cost |
| ZooKeeper | Strong | 1K-10K/s | High | Built-in seq ID | Operational cost |
| etcd | Strong | 1K-10K/s | Medium | Built-in | Operational cost |

## How Locks Work

### Redis Lock (SET NX EX)
```bash
# Atomic lock acquisition
SET resource:order-123 1 NX EX 5
# Returns OK → acquired
# Returns nil → already held

# Release using Lua script (atomic check-and-delete)
if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
else
    return 0
end
```

### PostgreSQL Advisory Lock
```sql
-- Session-level lock (manual release required)
SELECT pg_advisory_lock(12345);
-- ... critical section ...
SELECT pg_advisory_unlock(12345);

-- Transaction-level lock (auto-released on commit/rollback)
SELECT pg_advisory_xact_lock(12345);
```

### ZooKeeper Ephemeral Sequential Node
```
/ locks / resource-123 / lock-0000000001  ← created by instance A
/ locks / resource-123 / lock-0000000002  ← created by instance B

Rule: The instance with the smallest sequence number holds the lock.
If the holder crashes, its ephemeral node disappears, and the next instance acquires the lock.
```

## Lease Mechanism

A lease is a time-bound lock. The holder must renew the lease to keep the lock. If the lease expires, the lock is automatically released.

```
Acquire: Lock granted for duration T
Renew:   Extend lease by T (must be done before expiration)
Expire:  Lock automatically released if not renewed
Release: Explicit release (best-effort)
```

## Fencing Tokens

A fencing token is a monotonically increasing integer that prevents stale lock holders from writing to shared storage.

### Why Fencing Tokens Matter
```
Time:

Instance A acquires lock (TTL = 5s)
Instance A starts processing          ← GC pause for 8 seconds
Instance A's lock expires
Instance B acquires lock
Instance B starts processing
Instance B finishes, writes to DB
Instance A resumes                    ← GC pause ends
Instance A writes to DB               ← CORRUPTION! Instance A thinks it still has the lock
```

With fencing tokens:
```
Instance A acquires lock → fencing token = 1
Instance A has GC pause
Lock expires → Instance B acquires lock → fencing token = 2
Instance B writes to DB with token 2 → DB accepts (token 2 > last seen token)
Instance A resumes → writes to DB with token 1 → DB rejects (token 1 <= last seen token)
```

## Implementation Best Practices

### Lock Acquisition with Retry
```typescript
class LockClient {
  async acquireWithRetry(
    key: string,
    ttl: number,
    maxRetries: number = 3,
    retryDelay: number = 100,
  ): Promise<Lock | null> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const lock = await this.tryAcquire(key, ttl);
      if (lock) return lock;
      if (attempt < maxRetries - 1) {
        await this.delay(retryDelay * Math.pow(2, attempt)); // Exponential backoff
      }
    }
    return null;
  }
}
```

### Graceful Degradation
```typescript
async function processWithDegradation(resourceId: string): Promise<void> {
  const lock = await lockService.acquire(`resource:${resourceId}`, 5000);
  
  if (!lock) {
    // Lock not available — degrade gracefully
    logger.warn('Resource busy, queueing for later', { resourceId });
    await queueService.enqueue({ resourceId, priority: 'low' });
    return;
  }
  
  try {
    await processResource(resourceId);
  } finally {
    await lock.release();
  }
}
```

## Testing Distributed Locks

### Unit Tests
```typescript
describe('DistributedLock', () => {
  it('acquires and releases lock', async () => {
    const lock = await lockService.acquire('test-key', 1000);
    expect(lock).not.toBeNull();
    await lock!.release();
  });

  it('prevents concurrent acquisition', async () => {
    const lock1 = await lockService.acquire('test-key', 5000);
    const lock2 = await lockService.acquire('test-key', 5000);
    expect(lock1).not.toBeNull();
    expect(lock2).toBeNull();
    await lock1!.release();
  });

  it('auto-releases on TTL expiry', async () => {
    const lock1 = await lockService.acquire('test-key', 100); // 100ms TTL
    expect(lock1).not.toBeNull();
    await sleep(200);
    const lock2 = await lockService.acquire('test-key', 5000);
    expect(lock2).not.toBeNull();
  });
});
```

### Integration Tests with Test Containers
```typescript
describe('RedisDistributedLock Integration', () => {
  let container: StartedRedisContainer;
  let lockService: RedisDistributedLock;

  beforeAll(async () => {
    container = await new RedisContainer('redis:7')
      .withExposedPorts(6379)
      .start();
    lockService = new RedisDistributedLock(container.getConnectionUri());
  });

  it('works across concurrent instances', async () => {
    const results = await Promise.all([
      runWithLock(lockService, 'key', 1000),
      runWithLock(lockService, 'key', 1000),
      runWithLock(lockService, 'key', 1000),
    ]);
    // Exactly one should succeed
    expect(results.filter(r => r).length).toBe(1);
  });
});
```
