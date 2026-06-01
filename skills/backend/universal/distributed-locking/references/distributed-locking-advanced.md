# Distributed Locking Advanced

## Redlock Algorithm Details

### How Redlock Works
1. Client gets current time (T1)
2. Client acquires lock on N Redis nodes sequentially (N = 5, typically)
3. Client subtracts T1 from current time to get elapsed time
4. Lock is acquired if majority (N/2 + 1) responded within the TTL
5. If lock acquired, effective TTL = TTL - elapsed_time
6. If lock not acquired, release all acquired locks

### Redlock Correctness Conditions
- N must be an odd number (typically 5)
- Lock TTL must account for clock drift between nodes
- Majority threshold = floor(N/2) + 1
- Client aborts if elapsed time > TTL

### Redlock Implementation
```typescript
class Redlock {
  private driftFactor = 0.01; // 1% clock drift allowance
  private retryCount = 3;
  private retryDelay = 200;

  constructor(private servers: RedisClient[]) {}

  async acquire(resource: string, ttl: number): Promise<Lock | null> {
    const startTime = Date.now();
    const value = crypto.randomUUID();
    let acquired = 0;

    // Try to acquire on all nodes
    for (const server of this.servers) {
      try {
        const result = await server.set(resource, value, 'NX', 'PX', ttl);
        if (result === 'OK') acquired++;
      } catch {
        // Node failure — continue with remaining nodes
      }
    }

    const elapsed = Date.now() - startTime;
    const effectiveTtl = ttl - elapsed - (ttl * this.driftFactor);

    // Need majority AND enough remaining TTL
    if (acquired >= this.quorum() && effectiveTtl > 0) {
      return new Lock(resource, value, effectiveTtl, this);
    }

    // Failed — release all acquired locks
    await this.releaseAll(resource, value);
    return null;
  }

  private quorum(): number {
    return Math.floor(this.servers.length / 2) + 1;
  }

  async release(resource: string, value: string): Promise<void> {
    // Lua script: atomic check-and-delete
    const script = `
      if redis.call("GET", KEYS[1]) == ARGV[1] then
        return redis.call("DEL", KEYS[1])
      else
        return 0
      end
    `;
    for (const server of this.servers) {
      try {
        await server.eval(script, 1, resource, value);
      } catch {
        // Best effort release
      }
    }
  }
}
```

### Redlock Limitations
- Relies on synchronized clocks (NTP required)
- Probabilistic safety, not absolute
- Performance degrades with more nodes
- Network partitions can violate safety
- Martin Kleppmann's critique: Redlock is not safe under all partition scenarios

## Deadlock Prevention

### Lock Ordering
Establish a global order for all locks and always acquire in that order:

```typescript
const LOCK_ORDER = ['resource:order', 'resource:payment', 'resource:inventory'];

async function acquireMultiple(keys: string[], ttl: number): Promise<Lock[]> {
  // Sort keys to enforce ordering
  const sorted = keys.sort((a, b) => LOCK_ORDER.indexOf(a) - LOCK_ORDER.indexOf(b));
  
  const acquired: Lock[] = [];
  for (const key of sorted) {
    const lock = await lockService.acquire(key, ttl / keys.length);
    if (!lock) {
      // Release all previously acquired
      await Promise.all(acquired.map(l => l.release()));
      return [];
    }
    acquired.push(lock);
  }
  return acquired;
}
```

### Timeout-Based Deadlock Detection
```typescript
class LockWithTimeout {
  private timeoutHandle: NodeJS.Timeout | null = null;

  async acquire(key: string, ttl: number): Promise<Lock | null> {
    const lock = await lockService.acquire(key, ttl);
    if (!lock) return null;

    // Set safety timeout — if critical section takes too long, force release
    this.timeoutHandle = setTimeout(async () => {
      logger.error('Lock held past safety limit', { key, ttl });
      await lock.release();
    }, ttl * 2);

    return lock;
  }

  async release(lock: Lock): Promise<void> {
    if (this.timeoutHandle) clearTimeout(this.timeoutHandle);
    await lock.release();
  }
}
```

## Leader Election

### Using Locks for Leader Election
```typescript
class LeaderElector {
  private isLeader = false;
  private lease: Lease | null = null;

  async tryBecomeLeader(): Promise<boolean> {
    this.lease = await this.etcd.lease(10); // 10-second lease
    try {
      await this.etcd.put('cluster/leader').value(process.env.HOSTNAME).lease(this.lease);
      this.isLeader = true;
      this.startLeaseRenewal();
      logger.info('Became leader', { hostname: process.env.HOSTNAME });
      return true;
    } catch {
      this.isLeader = false;
      return false;
    }
  }

  private startLeaseRenewal(): void {
    setInterval(async () => {
      try {
        await this.lease?.renew();
      } catch {
        this.isLeader = false;
        logger.warn('Lost leadership');
      }
    }, 3000); // Renew every 3s (lease = 10s)
  }
}
```

## Semaphore (Multiple Permits)

### Counting Semaphore with Redis
```typescript
class RedisSemaphore {
  constructor(private redis: RedisClient, private maxPermits: number) {}

  async acquire(name: string, permits: number = 1, timeout: number = 5000): Promise<boolean> {
    const result = await this.redis.eval(`
      local current = redis.call("GET", KEYS[1]) or 0
      if current + ARGV[1] <= ARGV[2] then
        redis.call("INCRBY", KEYS[1], ARGV[1])
        redis.call("EXPIRE", KEYS[1], ARGV[3])
        return 1
      end
      return 0
    `, 1, `semaphore:${name}`, permits, this.maxPermits, Math.ceil(timeout / 1000));

    return result === 1;
  }

  async release(name: string, permits: number = 1): Promise<void> {
    await this.redis.decrby(`semaphore:${name}`, permits);
  }
}
```

## Performance Optimization

### Lock-Free Read Path
For read-heavy workloads, acquire locks only for writes. Reads can proceed without locking:

```typescript
class OptimisticReadService {
  // Reads don't need a lock — just read the current state
  async read(id: string): Promise<Entity> {
    return this.repository.findById(id);
  }

  // Writes acquire a lock
  async update(id: string, data: Partial<Entity>): Promise<void> {
    const lock = await this.lockService.acquire(`entity:${id}`, 5000);
    try {
      await this.repository.update(id, data);
    } finally {
      await lock.release();
    }
  }
}
```

### Batching Locks
Acquire and release locks in batch for multiple resources:

```typescript
async function batchProcess(orderIds: string[]): Promise<void> {
  // Acquire all locks atomically
  const locks = await lockService.acquireBatch(
    orderIds.map(id => `order:${id}`),
    10000, // Overall TTL
  );
  if (!locks) {
    logger.warn('Could not acquire all locks, retrying later');
    return;
  }
  try {
    await processOrders(orderIds);
  } finally {
    await lockService.releaseBatch(locks);
  }
}
```
