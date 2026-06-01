---
name: backend-distributed-locking
description: >
  Use this skill when the user says 'distributed lock', 'Redis lock', 'Redlock', 'ZooKeeper lock', 'advisory lock', 'PostgreSQL lock', 'pg_advisory_lock', 'lease', 'distributed mutex', 'lock timeouts', 'fencing token'. This skill implements distributed locking using Redis Redlock, ZooKeeper, PostgreSQL advisory locks, or lease-based mechanisms. Applies to any backend stack. Do NOT use for: single-process mutexes, database transaction serialization, or optimistic concurrency.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, universal, distributed-locking, concurrency, coordination]
---

# Backend Distributed Locking

## Purpose
Coordinate access to shared resources across multiple service instances using distributed locks with guaranteed safety properties.

## Agent Protocol

### Trigger
Exact user phrases: "distributed lock", "Redis lock", "Redlock", "ZooKeeper lock", "advisory lock", "PostgreSQL lock", "pg_advisory_lock", "lease", "distributed mutex", "fencing token", "lock timeout".

### Input Context
- Resource being protected.
- Available infrastructure (Redis, PostgreSQL, ZooKeeper, etcd).
- Number of competing instances.
- Duration of the critical section.

### Output Artifact
Lock configuration or implementation code. No file unless requested.

### Response Format
```
Provider: {Redis|PostgreSQL|ZooKeeper|etcd}
Strategy: {Redlock|Advisory|Ephemeral|Lease}
TTL: {duration}
Safety: {fencing?}
```

### Completion Criteria
- [ ] Lock acquisition and release implemented correctly.
- [ ] Lock timeout (TTL) configured.
- [ ] Fencing token mechanism in place for critical resources.
- [ ] Deadlock prevention: no nested locks.
- [ ] Graceful degradation: lock acquisition failure does not crash the service.

### Max Response Length
4 lines per lock configuration. 20 lines for implementation.

## Architecture Decision Tree

### Which Lock Provider?

```
What infrastructure is already available?
  ├── Redis → High throughput, short locks, needs Redlock for failover
  ├── PostgreSQL → Same DB as data, simple setup, lock contention impacts DB
  ├── ZooKeeper/etcd → Strong consistency, leader election, operational complexity
  └── In-memory → Single instance only, NOT distributed
```

### Which Lock Strategy?

```
Is the critical section short (< 1 second)?
  ├── Yes → Redis simple lock or PostgreSQL advisory lock
  └── No → Is the critical section a resource write?
            ├── Yes → Lease-based lock with fencing token
            └── No → Redlock (Redis with multi-node failover)

Is strong consistency required?
  ├── Yes → ZooKeeper/etcd (sequential consistency, fencing built-in)
  └── No → Is failover safety required?
            ├── Yes → Redlock (Redis, 3+ nodes)
            └── No → Single Redis lock or PG advisory lock
```

### Do I Need a Fencing Token?

```
Does the lock protect a write to shared storage?
  ├── Yes → Does shared storage have its own concurrency control (optimistic locking)?
  │         ├── Yes → Fencing token optional but recommended
  │         └── No → Fencing token REQUIRED — without it, stale lock holders can corrupt data
  └── No → No fencing token needed
```

## Workflow

### Step 1: Choose Lock Provider
| Provider | Best For | Trade-off |
|----------|----------|-----------|
| Redis | High throughput, short locks | Needs failover (Redlock) |
| PostgreSQL | Same DB as data | Lock contention impacts DB |
| ZooKeeper/etcd | Strong consistency | Operational complexity |
| In-memory | Single instance only | Not distributed |

### Step 2: Implement Lock (Redlock)
```javascript
const { Lock } = require('redlock');
const redlock = new Redlock([redis1, redis2, redis3], { driftFactor: 0.01 });

async function processResource() {
  const lock = await redlock.acquire(['resource:order-123'], 5000);
  try {
    await updateOrderStatus('order-123', 'processing');
  } finally {
    await lock.release();
  }
}
```

```python
from redlock import Redlock
import aioredis

redis = aioredis.from_url("redis://localhost")
lock = redis.lock("resource:order-123", timeout=5000)

async with lock:
    await update_order_status("order-123", "processing")
```

```go
// Go — Redis lock with go-redis
import "github.com/go-redsync/redsync/v4"
import "github.com/go-redsync/redsync/v4/redis/goredis/v9"

func processOrder(ctx context.Context, orderId string) error {
    mutex := rs.NewMutex("resource:order-" + orderId, redsync.WithExpiry(5*time.Second))
    if err := mutex.Lock(); err != nil {
        return fmt.Errorf("failed to acquire lock: %w", err)
    }
    defer func() {
        if ok, err := mutex.Unlock(); !ok || err != nil {
            log.Printf("failed to release lock: %v", err)
        }
    }()
    return updateOrderStatus(ctx, orderId, "processing")
}
```

### Step 3: Implement Fencing Token
Fencing tokens ensure that even if a lock is held after its timeout, stale holders cannot write.

```typescript
class FencedResource {
  private currentFencingToken = 0;

  async executeWithFencing(resourceId: string, operation: () => Promise<void>): Promise<void> {
    const fencingToken = await this.lockService.acquire(resourceId);
    try {
      // Pass fencing token to the resource
      await this.db.query(
        'UPDATE resources SET data = $1, fencing_token = $2 WHERE id = $3 AND fencing_token < $2',
        [newData, fencingToken, resourceId]
      );
      // If ROWS_AFFECTED = 0, someone else has the lock — abort
    } finally {
      await this.lockService.release(resourceId);
    }
  }
}
```

```sql
-- PostgreSQL advisory lock with fencing
SELECT pg_advisory_xact_lock(12345);
UPDATE resources
SET status = 'locked', version = version + 1
WHERE id = 12345 AND version = :expectedVersion;
-- version serves as the fencing token
```

### Step 4: Handle Lock Failure
```javascript
async function withLock(name, ttl, fn) {
  const lock = await redlock.acquire([name], ttl).catch(() => null);
  if (!lock) throw new Error('Lock acquisition failed — resource busy');
  try { return await fn(lock); }
  finally { await lock.release().catch(() => {}); }
}
```

```go
// Go — lock acquisition with timeout
func withLock(ctx context.Context, key string, ttl time.Duration, fn func() error) error {
    mutex := rs.NewMutex(key, redsync.WithExpiry(ttl))
    ctx, cancel := context.WithTimeout(ctx, time.Second)
    defer cancel()

    if err := mutex.LockContext(ctx); err != nil {
        return ErrResourceBusy
    }
    defer mutex.Unlock()

    return fn()
}
```

### Step 5: Monitor Locks
```typescript
interface LockMetrics {
  acquisitionTime: number;   // ms to acquire
  holdTime: number;          // ms held
  contentionCount: number;   // how many times acquisition was retried
  timeoutRate: number;       // how often locks expire before release
}

// Export metrics via your monitoring system
metrics.histogram('lock.acquisition_time', acquisitionTime);
metrics.histogram('lock.hold_time', holdTime);
metrics.counter('lock.contention', contentionCount);
metrics.counter('lock.timeout', timeoutRate);
```

## Implementation Patterns

### PostgreSQL Advisory Lock
```typescript
class PostgresDistributedLock {
  constructor(private pool: Pool) {}

  async acquire(lockId: number, timeoutMs: number = 5000): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      // Try to acquire the lock with a timeout
      const result = await client.query(
        'SELECT pg_try_advisory_lock($1) AS acquired',
        [lockId]
      );
      if (!result.rows[0].acquired) {
        client.release();
        return false;
      }
      // Store the client reference for release
      (this as any).client = client;
      return true;
    } catch (error) {
      client.release();
      throw error;
    }
  }

  async release(): Promise<void> {
    const client = (this as any).client;
    if (client) {
      await client.query('SELECT pg_advisory_unlock($1)', [this.lockId]);
      client.release();
      (this as any).client = null;
    }
  }
}
```

PostgreSQL advisory locks are session-level: must hold the same connection for lock and release. Transaction-level: `pg_advisory_xact_lock` auto-releases on transaction end. Use bigint lock IDs: hash your resource name to a bigint for consistent lock IDs.

### Lease-Based Lock (etcd)
```typescript
class EtcdLeaseLock {
  constructor(private etcd: Etcd3) {}

  async acquire(key: string, ttl: number): Promise<Lease | null> {
    const lease = this.etcd.lease(ttl / 1000);
    try {
      await lease.put(key).value(process.env.HOSTNAME);
      // If success, we hold the lease; if key exists, grant fails
      lease.on('lost', () => {
        logger.warn('Lease lost', { key });
      });
      return lease;
    } catch (error) {
      lease.revoke();
      return null;
    }
  }
}
```

### Simple Redis Lock (Single Node)
```typescript
class RedisLock {
  constructor(private redis: Redis) {}

  async acquire(key: string, ttlMs: number): Promise<boolean> {
    // SET NX — only set if key doesn't exist
    const result = await this.redis.set(key, process.env.HOSTNAME, 'PX', ttlMs, 'NX');
    return result === 'OK';
  }

  async release(key: string): Promise<void> {
    // Lua script ensures we only delete if we own the lock
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    await this.redis.eval(script, 1, key, process.env.HOSTNAME);
  }
}
```

### Semaphore Pattern (Multiple Permits)
```typescript
class RedisSemaphore {
  async acquire(key: string, permits: number, maxPermits: number, ttlMs: number): Promise<boolean> {
    const script = `
      local current = redis.call("GET", KEYS[1])
      if current and tonumber(current) + tonumber(ARGV[1]) > tonumber(ARGV[2]) then
        return 0
      end
      return redis.call("INCRBY", KEYS[1], ARGV[1])
    `;
    const result = await this.redis.eval(script, 1, key, permits, maxPermits);
    if (result) {
      await this.redis.pexpire(key, ttlMs);
    }
    return !!result;
  }

  async release(key: string, permits: number): Promise<void> {
    await this.redis.decrby(key, permits);
  }
}
```

## Production Considerations

### Lock TTL Selection
| Critical Section Duration | Recommended TTL | Safety Margin |
|---|---|---|
| < 10ms | 100ms | 10x |
| < 100ms | 500ms | 5x |
| < 1s | 3000ms | 3x |
| < 5s | 15000ms | 3x |
| > 5s | Not recommended | — |

### Clock Drift Handling
Redlock assumes synchronized clocks. In practice:
- NTP keeps most systems within < 10ms drift
- Redlock's drift factor (0.01 by default) accounts for this
- For extremely sensitive systems, use ZooKeeper/etcd (no clock dependency)
- Monitor clock skew in production: alert if > 100ms difference between nodes

### Lock Cleanup on Crash
- Redis locks auto-expire via TTL
- ZooKeeper ephemeral nodes auto-delete on session loss
- PostgreSQL advisory locks auto-release on connection close
- Always set TTL — never rely on cleanup logic in finally blocks alone

## Anti-Patterns

1. **No TTL on locks**: Indefinite locks cause system-wide freezes on holder failure.
2. **Nested locks**: Acquiring lock A while holding lock B creates deadlock risk.
3. **Not releasing in `finally`**: Exception before release = lock held forever.
4. **Long critical sections**: Keep lock duration minimal — locks are not transactions.
5. **Ignoring fencing tokens**: Without fencing, a delayed lock holder can corrupt data after the lock expires.
6. **Single-node Redis for production locks**: A single Redis node failure causes false-positive lock loss.
7. **Network calls inside lock**: Holding a lock during an external API call blocks other instances.
8. **Lock as a substitute for idempotency**: Locks prevent concurrent execution, not duplicate execution.
9. **Locking before checking**: Always check if you need the lock before acquiring it (shortest possible hold).
10. **Same lock for read and write**: Use read-write locks when reads don't need exclusive access.

## Rules
- Always set a TTL (lease duration) on every lock. Never use indefinite locks.
- Release locks in `finally` blocks — never in the happy path only.
- Use fencing tokens for any lock protecting a write to shared storage.
- Keep critical sections as short as possible — locks are not transactions.
- Never acquire one lock while holding another (potential deadlock).
- Log every lock acquisition and release with duration.
- If a lock cannot be acquired, degrade gracefully — do not block indefinitely.
- Monitor lock contention, acquisition time, hold time, and timeout rate.
- For read-heavy resources, use read-write locks (shared read, exclusive write).
- Always handle the case where lock acquisition fails — the system must continue.
- Test lock scenarios: timeout, contention, crash during hold, network partition.

## References
  - references/distributed-locking-fundamentals.md — Distributed Locking Fundamentals
  - references/distributed-locking-advanced.md — Distributed Locking Advanced
  - references/fencing-tokens-deep.md — Fencing Token Deep Dive
  - references/lock-contention-analysis.md — Lock Contention Analysis
  - references/lock-deep-dive.md — Distributed Locking Deep Dive
  - references/lock-implementations.md — Distributed Lock Implementations
  - references/lock-providers.md — Lock Provider Implementation Notes
  - references/lock-strategies.md — Distributed Lock Strategies
  - references/lock-testing.md — Lock Testing
## Handoff
No artifact produced unless requested.
Next skill: webhooks — deliver events from the service to external subscribers.
Carry forward: lock provider, TTL configuration, fencing requirement.
