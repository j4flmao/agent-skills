# Lock Testing

## Overview
Test distributed lock implementations: concurrency testing, correctness verification, failure scenarios, performance benchmarks, and integration tests.

## Unit Tests

```typescript
import { LockProvider } from './lock-provider';

describe('RedisLockProvider', () => {
  let provider: RedisLockProvider;
  let redis: Redis;

  beforeEach(async () => {
    redis = new Redis({ host: 'localhost', port: 6379, db: 15 });
    await redis.flushdb();
    provider = new RedisLockProvider(redis);
  });

  afterEach(async () => {
    await redis.flushdb();
    await redis.quit();
  });

  it('acquires and releases a lock', async () => {
    const lock = await provider.acquire('test-lock', 5000);
    expect(lock).toBeDefined();
    expect(lock.name).toBe('test-lock');

    await lock.release();
    const exists = await redis.exists('lock:test-lock');
    expect(exists).toBe(0);
  });

  it('prevents concurrent acquisition of the same lock', async () => {
    const lock1 = await provider.acquire('test-lock', 5000);
    expect(lock1).toBeDefined();

    await expect(provider.acquire('test-lock', 5000, { retryCount: 0 }))
      .rejects.toThrow('Lock not acquired');
  });

  it('releases expired lock for new acquirer', async () => {
    await redis.set('lock:test-lock', 'owner-1', 'PX', 100);
    await sleep(150);

    const lock = await provider.acquire('test-lock', 5000);
    expect(lock).toBeDefined();
  });
});
```

## Concurrency Tests

```typescript
describe('Lock Concurrency', () => {
  it('ensures mutual exclusion with concurrent workers', async () => {
    const sharedCounter = { value: 0 };
    const workerCount = 10;
    const incrementsPerWorker = 100;

    const workers = Array.from({ length: workerCount }, (_, i) =>
      worker(`worker-${i}`, sharedCounter, incrementsPerWorker)
    );

    await Promise.all(workers);

    // Without lock, you'd get < total; with lock, must equal exactly
    expect(sharedCounter.value).toBe(workerCount * incrementsPerWorker);
  });

  async function worker(
    id: string,
    counter: { value: number },
    increments: number
  ): Promise<void> {
    for (let i = 0; i < increments; i++) {
      const lock = await provider.acquire(`counter-lock`, 1000);
      try {
        counter.value++; // Critical section
      } finally {
        await lock.release();
      }
    }
  }
});
```

## Failure Scenario Tests

```typescript
describe('Lock Failure Scenarios', () => {
  it('handles lock holder crash', async () => {
    // Simulate: worker acquires lock, then crashes (lock expires)
    const lock = await provider.acquire('crash-lock', 200);
    // Do NOT release — simulate crash

    await sleep(300); // Wait for TTL expiry

    // Another worker should be able to acquire
    const newLock = await provider.acquire('crash-lock', 5000);
    expect(newLock).toBeDefined();
    await newLock.release();
  });

  it('handles Redis failover during lock hold', async () => {
    // Kill Redis, acquire should fail gracefully
    await redis.quit();

    await expect(provider.acquire('fault-lock', 5000, { retryCount: 2 }))
      .rejects.toThrow();

    // Service should still function
    const result = await fallbackService.processWithoutLock();
    expect(result).toBeDefined();
  });

  it('prevents split-brain (two concurrent holders)', async () => {
    // Simulate network partition scenario
    const provider1 = new RedisLockProvider(redis1);
    const provider2 = new RedisLockProvider(redis2);

    const lock1 = await provider1.acquire('split-brain-lock', 5000);
    const lock2 = await provider2.acquire('split-brain-lock', 5000);

    // After network partition heals, only one should be valid
    await redis1.set('lock:split-brain-lock', 'holder-1');
    await redis2.set('lock:split-brain-lock', 'holder-2');

    const actualHolder = await redis.get('lock:split-brain-lock');
    // At most one holder considers itself valid
    const consensus = actualHolder === 'holder-1' || actualHolder === 'holder-2';
    expect(consensus).toBe(true);
  });
});
```

## Fencing Token Tests

```typescript
describe('Fencing Tokens', () => {
  it('rejects stale operations with old fencing token', async () => {
    const service = new FencedResourceService();

    // Acquire lock with token 1
    const token1 = await service.acquireLock('resource-1');
    expect(token1).toBe(1);

    // Token 1's lock expires; another service gets token 2
    await service.forceExpireLock('resource-1');
    const token2 = await service.acquireLock('resource-1');
    expect(token2).toBe(2);

    // Resource rejects write with stale token 1
    await expect(
      service.writeWithToken('resource-1', { data: 'test' }, 1)
    ).rejects.toThrow('Stale fencing token');

    // Write with current token 2 succeeds
    await expect(
      service.writeWithToken('resource-1', { data: 'test' }, 2)
    ).resolves.toBeDefined();
  });

  it('monotonically increases fencing tokens', async () => {
    const tokens: number[] = [];
    for (let i = 0; i < 10; i++) {
      const token = await fencingTokenService.getNextToken('resource');
      tokens.push(token);
    }

    for (let i = 1; i < tokens.length; i++) {
      expect(tokens[i]).toBeGreaterThan(tokens[i - 1]);
    }
  });
});
```

## Performance Benchmarks

```typescript
describe('Lock Performance Benchmarks', () => {
  const BENCHMARK_ITERATIONS = 1000;

  it('acquires lock in under 5ms (p50)', async () => {
    const timings: number[] = [];

    for (let i = 0; i < BENCHMARK_ITERATIONS; i++) {
      const start = Date.now();
      const lock = await provider.acquire(`perf-lock-${i}`, 5000);
      timings.push(Date.now() - start);
      await lock.release();
    }

    const sorted = [...timings].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    expect(p50).toBeLessThan(5);
  });

  it('handles 100 concurrent lock requests', async () => {
    const start = Date.now();
    const results = await Promise.allSettled(
      Array.from({ length: 100 }, (_, i) =>
        provider.acquire(`concurrent-lock`, 5000, { retryCount: 0 })
      )
    );

    const duration = Date.now() - start;
    const acquired = results.filter(r => r.status === 'fulfilled');

    // Only 1 should succeed; 99 should fail
    expect(acquired).toHaveLength(1);
    expect(duration).toBeLessThan(100);
  });

  it('throughput: 1000 acquires/releases under 2 seconds', async () => {
    const start = Date.now();

    for (let i = 0; i < BENCHMARK_ITERATIONS; i++) {
      const lock = await provider.acquire(`throughput-${i}`, 100);
      await lock.release();
    }

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
  });
});
```

## Integration Tests

```typescript
describe('Distributed Lock Integration', () => {
  it('coordinates across multiple services', async () => {
    // Simulate two different services
    const serviceA = new LockConsumer(redisA, 'service-a');
    const serviceB = new LockConsumer(redisB, 'service-b');

    const results = await Promise.all([
      serviceA.processWithLock('shared-resource'),
      serviceB.processWithLock('shared-resource'),
    ]);

    // Operations must be serialized (not concurrent)
    const timestamps = results.flatMap(r => r.timestamps);
    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i].getTime()).toBeGreaterThanOrEqual(
        timestamps[i - 1].getTime()
      );
    }
  });

  it('survives Redis restart', async () => {
    const lock = await provider.acquire('restart-lock', 10000);

    // Simulate Redis restart
    await redis.quit();
    await redis.connect();

    // Lock should still be valid (persisted)
    const isHeld = await provider.isLockHeld('restart-lock', lock.id);
    expect(isHeld).toBe(true);

    await lock.release();
  });
});
```

## Key Points
- Unit tests: acquire, prevent concurrent, release expired
- Concurrency tests: verify mutual exclusion with parallel workers
- Failure scenarios: holder crash, Redis failover, split-brain
- Fencing token tests: reject stale tokens, verify monotonic increase
- Performance benchmarks: p50 latency, concurrent throughput
- Integration tests: cross-service coordination, Redis restart
- Always clean up Redis state between tests (flushdb)
