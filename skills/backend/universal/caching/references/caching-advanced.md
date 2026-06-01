# Caching Advanced

## Multi-Level Cache

Combined L1 (in-memory) + L2 (Redis) for optimal latency:

```typescript
class MultiLevelCache {
  constructor(
    private local: Map<string, { value: any; expires: number }>,
    private redis: Redis,
  ) {}

  async get<T>(key: string): Promise<T | null> {
    // Level 1: In-memory (sub-millisecond)
    const localHit = this.local.get(key);
    if (localHit && localHit.expires > Date.now()) {
      return localHit.value as T;
    }

    // Level 2: Redis (millisecond)
    const redisValue = await this.redis.get(key);
    if (redisValue) {
      const parsed = JSON.parse(redisValue);
      // Populate L1 with short TTL
      this.local.set(key, { value: parsed, expires: Date.now() + 1000 });
      return parsed as T;
    }

    return null;
  }

  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    this.local.set(key, { value, expires: Date.now() + 1000 }); // L1 short TTL
  }

  async invalidate(key: string): Promise<void> {
    await this.redis.del(key);
    this.local.delete(key);
  }
}
```

## Cache Warmer

Pre-populate cache before traffic arrives:

```typescript
class CacheWarmer {
  async warmPopularProducts(): Promise<void> {
    const popular = await db.query(
      `SELECT id FROM products ORDER BY view_count DESC LIMIT 1000`
    );

    const batchSize = 50;
    for (let i = 0; i < popular.length; i += batchSize) {
      const batch = popular.slice(i, i + batchSize);
      await Promise.all(batch.map(p =>
        cache.set(`product:${p.id}:details`, loadProduct(p.id), 3600)
      ));
    }

    logger.info(`Warmed ${popular.length} products`);
  }

  async warmOnDeploy(): Promise<void> {
    await Promise.all([
      this.warmPopularProducts(),
      this.warmStaticPages(),
      this.warmConfigCache(),
    ]);
  }
}

// On deployment
process.on('deploy', () => cacheWarmer.warmOnDeploy());
```

## Cache Stampede Prevention

Cache stampede = many concurrent requests all miss and hit DB:

```typescript
// Mutex-based stampede prevention
async function getWithMutex<T>(key: string, fetch: () => Promise<T>, ttl: number): Promise<T> {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  // Try to acquire lock
  const lockKey = `lock:${key}`;
  const acquired = await redis.set(lockKey, '1', 'NX', 'EX', 5);

  if (acquired) {
    try {
      const value = await fetch();
      await redis.set(key, JSON.stringify(value), 'EX', ttl);
      return value;
    } finally {
      await redis.del(lockKey);
    }
  }

  // Wait for the other request to populate cache
  await new Promise(resolve => setTimeout(resolve, 50));
  return getWithMutex(key, fetch, ttl); // Retry
}
```

## Probabilistic Early Expiration (XFetch)

```typescript
// XFetch algorithm: refresh before expiry based on probability
function shouldRefresh(ttl: number, elapsed: number): boolean {
  const beta = 1.0; // Tuning parameter (higher = more aggressive refresh)
  const ratio = elapsed / ttl;
  const probability = Math.random();
  return ratio > 0.5 && probability < (ratio - 0.5) / (1 - 0.5) * beta;
}

async function getWithXFetch<T>(key: string, fetch: () => Promise<T>, ttl: number): Promise<T> {
  const entry = await redis.get(key);

  if (entry) {
    const { value, createdAt } = JSON.parse(entry);
    const elapsed = (Date.now() - createdAt) / 1000;

    if (shouldRefresh(ttl, elapsed)) {
      // Async refresh — return stale but trigger background update
      fetch().then(newValue => {
        redis.set(key, JSON.stringify({ value: newValue, createdAt: Date.now() }), 'EX', ttl);
      }).catch(() => {}); // Swallow refresh errors
    }

    return value;
  }

  const value = await fetch();
  await redis.set(key, JSON.stringify({ value, createdAt: Date.now() }), 'EX', ttl);
  return value;
}
```

## Redis Cluster Topology

```typescript
// Redis Cluster with read replicas
const redis = new Redis.Cluster([
  { host: 'redis-cluster-0', port: 6379 },
  { host: 'redis-cluster-1', port: 6379 },
  { host: 'redis-cluster-2', port: 6379 },
], {
  scaleReads: 'slave', // Read from replicas
  redisOptions: {
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
  },
});
```

## Monitoring

| Metric | Source | Alert |
|--------|--------|-------|
| Cache hit ratio | Redis INFO | < 80% |
| Eviction rate | Redis INFO | > 0 (means cache too small) |
| Memory usage | Redis INFO | > 80% maxmemory |
| Latency P99 | Client metrics | > 5ms |
| Connection count | Redis CLIENT LIST | > maxclients * 0.8 |
| Keyspace misses | Redis INFO | Sudden increase (stampede?) |
