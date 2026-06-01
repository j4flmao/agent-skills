---
name: backend-caching
description: >
  Use this skill when the user says 'cache', 'Redis', 'Memcached', 'CDN', 'cache-aside', 'read-through', 'write-through', 'write-behind', 'cache invalidation', 'TTL', 'cache stampede', 'thundering herd', 'cache warming', 'LRU', 'LFU', 'cache hit ratio', 'cache strategy', or when designing a caching layer. This skill enforces consistent caching strategies: layer selection, read/write patterns, invalidation, stampede prevention, and monitoring. Applies to any backend stack. Do NOT use for: message queue design, database schema design, or frontend state caching.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, caching, phase-2, universal]
---

# Backend Caching

## Purpose
Design consistent, production-grade caching layers. Every cache must follow the same conventions for strategy selection, data flow, invalidation, stampede prevention, TTL management, and monitoring.

## Agent Protocol

### Trigger
Exact user phrases: "cache", "Redis", "Memcached", "CDN", "cache-aside", "read-through", "write-through", "write-behind", "cache invalidation", "TTL", "cache stampede", "thundering herd", "cache warming", "LRU", "LFU", "cache hit ratio", "cache strategy", "design a caching layer", "add caching".

### Input Context
- The data being cached (DB query result, computed value, API response, static asset).
- The read/write ratio.
- The consistency requirement (eventual vs strong).
- The hosting topology (single node, clustered, multi-region).

### Output Artifact
Caching strategy specs as text. No file unless requested.

### Response Format
```
Layer: {application | distributed | CDN}
Store: {Redis | Memcached | CDN | in-memory}
Strategy: {cache-aside | read-through | write-through | write-behind}
Key format: {namespace}:{entity}:{id}
TTL: {duration}
Invalidation: {manual | TTL-based | event-driven}
Stampede protection: {yes/no — method}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions.

### Completion Criteria
- [ ] Cache strategy selected with justification
- [ ] Key naming convention defined with namespaces
- [ ] TTL set for every cache entry (no infinite TTL unless immutable data)
- [ ] Stale data tolerance documented
- [ ] Invalidation strategy defined (TTL and/or event-driven)
- [ ] Cache stampede prevention in place for high-traffic keys
- [ ] Monitoring plan (hit ratio, latency, memory) defined

## Architecture Decision Trees

### Cache Layer Selection
```
What is the primary goal?
├── Reduce latency for hot data (<1ms reads)
│   ├── Single-node app? → In-memory cache (LRU map, async cache)
│   └── Multi-node app? → Distributed cache (Redis cluster)
├── Reduce database load
│   ├── Read-heavy workload (>80% reads)?
│   │   ├── Yes → Cache-aside with distributed cache
│   │   └── No → Write-behind or read-through
│   └── Expensive queries (>100ms)?
│       ├── Yes → Cache result with medium TTL
│       └── No → Simple cache-aside is sufficient
├── Serve static/semi-static content globally
│   ├── Global audience? → CDN (CloudFront, Cloudflare, Fastly)
│   └── Regional audience? → CDN or reverse proxy cache
└── Handle API response caching
    ├── Public data? → CDN + gateway caching
    └── User-specific data? → Private cache (Cache-Control: private)
```

### Consistency Model Decision Tree
```
Can the application tolerate stale data?
├── Yes → Is stale-while-revalidate acceptable?
│   ├── Yes → Cache-aside with background refresh
│   └── No → Cache-aside with short TTL (seconds)
├── No, eventual consistency is fine
│   └── Read-through or write-behind
└── No, strong consistency required
    ├── Is read volume much higher than write?
    │   ├── Yes → Write-through cache (write DB + cache atomically)
    │   └── No → Write-through with cache invalidation after DB write
    └── Is cache acting as source of truth?
        └── Never use cache as primary store
```

### Cache Stampede Prevention
```
Is there a single hot key that gets many concurrent requests?
├── Yes → Does the key expire and cause thundering herd?
│   ├── Yes → Which prevention method?
│   │   ├── Mutex locking (NX key) → First request loads, others wait
│   │   ├── Probabilistic early expiration → Refresh before expiry
│   │   ├── Stale-while-revalidate → Serve stale, refresh async
│   │   └── Background refresh → Dedicated worker refreshes hot keys
│   └── No → Regular cache-aside is sufficient
└── No → Standard TTL-based caching is fine
```

### Invalidation Strategy Selection
```
Can the system tolerate stale data for up to TTL duration?
├── Yes → TTL-based invalidation (simplest)
├── No → Are cache and DB in the same transaction boundary?
│   ├── Yes → Write-through (DB + cache in transaction)
│   └── No → Event-driven invalidation (publish eviction event)
└── Mixed → TTL for most data, event-driven for critical data
```

## Workflow

### Step 1: Choose Cache Layer

| Layer | Latency | Durability | Shared | Best For |
|-------|---------|------------|--------|----------|
| In-memory (local) | ~0.1ms | Lost on restart | Per-instance | Hot data, session, computed values |
| Distributed (Redis) | ~1-5ms | Configurable | All instances | Shared data, counters, rate limits |
| CDN | ~10-50ms | Durable at edge | Global | Static assets, public API responses |
| Database query cache | ~0.5ms | DB-backed | All instances | Frequent identical queries |

### Step 2: Choose Strategy

**Cache-aside (lazy loading)** — default for most applications:
```
Read:
  1. Check cache (key lookup)
  2. Cache hit → return data
  3. Cache miss → read from DB
  4. Store in cache with TTL
  5. Return data

Write:
  1. Write to DB
  2. Delete cache entry for that key
```

```typescript
class CacheAside<T> {
  constructor(
    private cache: CacheStore,
    private db: Database,
    private ttl: number
  ) {}

  async get(key: string, fetchFn: () => Promise<T>): Promise<T> {
    const cached = await this.cache.get(key);
    if (cached) return JSON.parse(cached) as T;

    const data = await fetchFn();
    await this.cache.set(key, JSON.stringify(data), { ttl: this.ttl });
    return data;
  }

  async invalidate(key: string): Promise<void> {
    await this.cache.del(key);
  }
}
```

**Read-through** — cache library handles DB loading transparently:
- Cache library intercepts reads, loads from DB on miss
- Recommended: Write DB first, then delete cache (cache will be populated on next read)
- Best for: key-value lookups with consistent access patterns

**Write-through** — write DB and cache atomically:
```
Write:
  1. Write to DB
  2. Write to cache (or update in place)
```
- Best for: strong consistency requirements
- Risk: higher write latency

**Write-behind (write-back)** — write cache first, async write DB:
```
Write:
  1. Write to cache (immediate acknowledgment)
  2. Async write to DB (deferred, batched)
```
- Best for: write-heavy workloads, can tolerate data loss
- Risk: data loss on cache failure

### Step 3: Key Naming Convention

```
Namespace:Entity:ID[:Subfield]

Examples:
  user:abc123                    → User object
  user:abc123:profile            → User profile sub-object
  product:xyz456:inventory       → Product inventory
  page:/docs/getting-started     → Rendered page
  rate:limit:user:abc123         → Rate limit counter
  session:abc123                 → Session data
  lock:payment:order_456         → Distributed lock
```

Key design rules:
- Always include a namespace prefix to avoid collisions
- Use colon-delimited hierarchy for logical grouping
- Include version in key when schema changes: `user:v2:abc123`
- Max key length: Redis recommends < 1KB
- Use consistent key generation function

```typescript
function cacheKey(namespace: string, entity: string, id: string, subfield?: string): string {
  const parts = [namespace, entity, id];
  if (subfield) parts.push(subfield);
  return parts.join(':');
}
```

### Step 4: TTL Management

| Data Type | TTL | Rationale |
|-----------|-----|-----------|
| Immutable reference data | 24h+ or infinite | Never changes, invalidate on event |
| Slowly-changing (product catalog) | 1-6 hours | Typically updated via admin |
| User profile (non-critical) | 5-15 minutes | Short tolerance for staleness |
| Session data | Session duration + grace | Must survive user activity gap |
| Rate limit counters | Window duration | Auto-cleaned by TTL |
| API responses | 30-300 seconds | Depends on API freshness requirements |
| Search results | 1-5 minutes | Fast-changing but cacheable |
| Computed/aggregated data | 1-60 minutes | Expensive to compute, low change frequency |

TTL randomization: add ±10% jitter to prevent mass expiry stampede:
```typescript
function ttlWithJitter(baseTtl: number, jitterPercent = 10): number {
  const jitter = baseTtl * (jitterPercent / 100) * (Math.random() * 2 - 1);
  return Math.round(baseTtl + jitter);
}
```

### Step 5: Cache Stampede Prevention

**Option A — Mutex locking**:
```typescript
async function getWithMutex<T>(key: string, fetchFn: () => Promise<T>, ttl: number): Promise<T> {
  const cached = await cache.get(key);
  if (cached) return JSON.parse(cached);

  // Acquire distributed lock
  const lockKey = `lock:${key}`;
  const acquired = await cache.setnx(lockKey, '1', { ttl: 5000 }); // 5s lock
  if (acquired) {
    try {
      const data = await fetchFn();
      await cache.set(key, JSON.stringify(data), { ttl });
      return data;
    } finally {
      await cache.del(lockKey);
    }
  }

  // Wait for first request to complete, then read
  await sleep(50);
  return getWithMutex(key, fetchFn, ttl);
}
```

**Option B — Probabilistic early expiration (XFetch)**:
```typescript
function shouldRecompute(ttl: number, age: number, beta = 4): boolean {
  const remaining = ttl - age;
  const probability = Math.exp(-beta * (remaining / ttl));
  return Math.random() < probability;
}

// Usage in cache read
async function getWithEarlyExpiry<T>(key: string, fetchFn: () => Promise<T>, ttl: number): Promise<T> {
  const entry = await cache.getWithAge(key);
  if (!entry) return fetchFn();

  if (shouldRecompute(ttl, entry.age)) {
    // Background refresh — don't block the response
    fetchFn().then(fresh => cache.set(key, JSON.stringify(fresh), { ttl }));
  }

  return JSON.parse(entry.value);
}
```

**Option C — Stale-while-revalidate**:
```typescript
async function getStaleWhileRevalidate<T>(key: string, fetchFn: () => Promise<T>, ttl: number, swrTtl: number): Promise<T> {
  const entry = await cache.getWithMetadata(key);
  if (!entry) {
    const fresh = await fetchFn();
    await cache.set(key, JSON.stringify(fresh), { ttl: ttl + swrTtl });
    return fresh;
  }

  const age = Date.now() - entry.createdAt;
  if (age < ttl) return JSON.parse(entry.value); // Fresh enough

  if (age < ttl + swrTtl) {
    // Stale but within swr window — serve stale, refresh async
    fetchFn().then(fresh => cache.set(key, JSON.stringify(fresh), { ttl: ttl + swrTtl }));
    return JSON.parse(entry.value);
  }

  // Too stale — fetch fresh synchronously
  const fresh = await fetchFn();
  await cache.set(key, JSON.stringify(fresh), { ttl: ttl + swrTtl });
  return fresh;
}
```

**Option D — Background refresh**:
```typescript
class BackgroundRefresher {
  private timers = new Map<string, NodeJS.Timeout>();

  scheduleRefresh(key: string, ttl: number, fetchFn: () => Promise<void>): void {
    // Refresh at 80% of TTL
    const refreshMs = ttl * 0.8 * 1000;
    const timer = setInterval(() => {
      fetchFn().catch(err => console.error(`Cache refresh failed for ${key}:`, err));
    }, refreshMs);
    this.timers.set(key, timer);
  }

  stopRefresh(key: string): void {
    const timer = this.timers.get(key);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(key);
    }
  }
}
```

### Step 6: Invalidation Strategies

| Strategy | Mechanism | Latency | Complexity | Best For |
|----------|-----------|---------|------------|----------|
| TTL-based | Automatic expiry | TTL duration | None | Any cacheable data |
| Event-driven | Pub/sub invalidation event | Near-real-time | Moderate | Data with known change events |
| Write-through | Update cache on write | Write-time | Low | Strong consistency |
| Manual | Admin API/CLI purge | On-demand | Low | Schema migrations, data fixes |
| Batch purge | Pattern-based deletion | Seconds | Moderate | Related data changes |

Invalidation order (critical for correctness):
```
1. Write to database
2. Delete cache entry
3. Done — Never invalidate before write (race condition: cache invalidated, then write fails, subsequent read gets stale)
```

Event-driven invalidation pattern:
```typescript
interface CacheInvalidationEvent {
  key: string;
  pattern?: string;       // Pattern for batch invalidation: "user:abc123:*"
  reason: string;
  timestamp: number;
}

// Publisher (on data change)
class CacheInvalidator {
  constructor(private pubSub: PubSub) {}

  async invalidateKey(key: string): Promise<void> {
    await this.pubSub.publish('cache:invalidate', { key, timestamp: Date.now(), reason: 'data_updated' });
  }

  async invalidatePattern(pattern: string): Promise<void> {
    await this.pubSub.publish('cache:invalidate', { pattern, timestamp: Date.now(), reason: 'batch_update' });
  }
}

// Subscriber (cache layer)
async function onInvalidationEvent(event: CacheInvalidationEvent): Promise<void> {
  if (event.key) {
    await cache.del(event.key);
  } else if (event.pattern) {
    const keys = await cache.keys(event.pattern);
    if (keys.length > 0) await cache.del(...keys);
  }
}
```

## Production Considerations

### Cache Sizing
| Data Size | Users | Cache Size | Redis Memory |
|-----------|-------|------------|-------------|
| 1KB/entry | 1M | 1GB | 2GB (with overhead) |
| 10KB/entry | 100K | 1GB | 2.5GB |
| 100KB/entry | 10K | 1GB | 3GB |
| Session (512B) | 1M | 512MB | 1GB |

Rule of thumb: provision 2-3x the expected data size for Redis overhead.

### Connection Pooling
```typescript
// Redis connection pool
import { Redis } from 'ioredis';

const cluster = new Redis.Cluster([
  { host: 'redis-0.internal', port: 6379 },
  { host: 'redis-1.internal', port: 6379 },
  { host: 'redis-2.internal', port: 6379 },
], {
  maxRedirections: 16,
  enableReadyCheck: true,
  retryDelayOnFailover: 100,
  retryDelayOnClusterDown: 100,
  clusterRetryStrategy: (times) => Math.min(times * 100, 3000),
  redisOptions: {
    enableAutoPipelining: true,
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 50, 2000),
    lazyConnect: true,
  },
});
```

### Serialization
- Use fast serialization: MessagePack, Protocol Buffers for high-throughput
- Compress values > 1KB (Snappy, LZ4, or Gzip)
- Consider using RedisJSON module for partial key updates
- Avoid storing large objects (>1MB) in cache — store reference instead

```typescript
// Compressed caching
async function getCompressed<T>(key: string, fetchFn: () => Promise<T>, ttl: number): Promise<T> {
  const raw = await cache.get(key);
  if (raw) {
    const decompressed = await decompress(raw);
    return JSON.parse(decompressed);
  }

  const data = await fetchFn();
  const serialized = JSON.stringify(data);
  const compressed = await compress(serialized);
  await cache.set(key, compressed, { ttl });
  return data;
}

async function compress(data: string): Promise<Buffer> {
  const input = Buffer.from(data, 'utf-8');
  const output = await brotliCompress(input);
  return output;
}

async function decompress(data: Buffer): Promise<string> {
  const output = await brotliDecompress(data);
  return output.toString('utf-8');
}
```

## Anti-Patterns

### Anti-Pattern 1: Cache as Primary Data Store
Problem: Redis/Memcached evicts data under memory pressure. Restart clears all.
Fix: Always have DB fallback. Cache is a performance layer, not a storage layer.

### Anti-Pattern 2: Infinite TTL
Problem: Stale data served forever. Schema changes break cached data.
Fix: Always set TTL. Maximum 24h for mutable data.

### Anti-Pattern 3: Write Cache Before DB
Problem: Cache write succeeds, DB write fails. Cache has phantom data.
Fix: Always write DB first, then invalidate or update cache.

### Anti-Pattern 4: Same TTL for All Keys
Problem: Thundering herd on mass expiry. All keys expire at once.
Fix: Add ±10% jitter to TTL values.

### Anti-Pattern 5: Caching Everything
Problem: Low hit ratio on rarely accessed data wastes memory.
Fix: Cache only frequently accessed data. Monitor hit ratio (<80% means wrong data cached).

### Anti-Pattern 6: No Cache Null Results
Problem: Repeated DB misses on non-existent keys cause unnecessary load.
Fix: Cache null results with short TTL (30-60s).

### Anti-Pattern 7: Cache in Request Path Only
Problem: Cache is populated only on read, leaving it empty for first user.
Fix: Pre-warm cache after deployment, or use write-through for predictable data.

### Anti-Pattern 8: Over-Caching Complex Queries
Problem: Caching entire complex query results with long TTL. Data changes invalidate everything.
Fix: Cache individual entities, compose at read time. Or use short TTL for query results.

## Security Considerations

### Redis Security
- Require authentication (requirepass)
- Disable CONFIG command (rename-command CONFIG "")
- Run Redis as non-root user
- Bind to internal network only (not 0.0.0.0)
- Use TLS for Redis connections in production
- Enable Redis ACLs for multi-tenant setups

### Cache Poisoning
- Validate and sanitize data before caching
- Never cache raw user input as keys
- Use key hashing for user-provided identifiers
- Sign cached values for integrity verification

### Data Leakage
- Never cache PII/PHI without encryption
- Use encrypted Redis (TLS + at-rest encryption)
- Clear cache on data deletion (GDPR right to erasure)
- Set maxmemory-policy to allkeys-lru for automatic eviction

## Comparative Analysis

### Cache Strategies

| Aspect | Cache-Aside | Read-Through | Write-Through | Write-Behind |
|--------|-------------|--------------|---------------|--------------|
| Read consistency | Eventual | Eventually consistent | Strong | Eventual |
| Write latency | Low | Low | Higher (2 writes) | Very low |
| Read latency | Cache miss = DB hit | Always consistent | Always cache hit | Always cache hit |
| Complexity | Low | Moderate | Moderate | High |
| Data loss risk | None (DB source) | None (DB source) | None (both) | High (cache failure) |
| DB write load | Normal | Normal | Normal | Reduced (batching) |
| Best for | General purpose | Key-value lookups | Strong consistency | Write-heavy workloads |

### Redis vs Memcached vs CDN

| Aspect | Redis | Memcached | CDN |
|--------|-------|-----------|-----|
| Data types | Rich (string, list, set, sorted set, hash, stream, JSON) | Simple (string only) | Bytes |
| Persistence | Configurable (RDB/AOF) | None | Durable |
| Clustering | Native clustering | Client-side sharding | Global |
| Lua scripting | Yes | No | No |
| Pub/Sub | Yes | No | No |
| Max value size | 512MB | 1MB | Varies (typically 10MB-2GB) |
| Use case | General purpose, caching, rate limits, queues, sessions | Simple key-value caching | Static assets, API responses at edge |

## Performance Considerations

### Redis Performance
- Single-threaded: one command at a time. Pipeline commands for throughput.
- Benchmark: ~100K ops/sec for GET/SET on single node
- Use pipelining for batch operations (reduces RTT)
- Enable pipelining in ioredis: `redis.pipeline().set('a', '1').get('a').exec()`
- Use SCAN instead of KEYS for production (KEYS blocks)
- Monitor slowlog: `SLOWLOG GET 10`

### Memory Optimization
- Use hash data structure for objects: `HMSET user:123 name "John" age 30`
- Enable compression for values > 1KB
- Set appropriate maxmemory and eviction policy
- Use memory-optimized data types (ziplist, intset)
- Monitor memory fragmentation: `INFO MEMORY`
- Redis 7.4+ has better memory efficiency with new serialization

### Monitoring Key Metrics
| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Hit ratio | <90% | <80% | Review caching strategy |
| Evictions | >0 | >100/sec | Increase memory or optimize |
| Memory usage | >80% | >90% | Scale up or optimize |
| Connected clients | >5000 | >10000 | Increase connection pool |
| Latency p99 | >5ms | >10ms | Check slow commands |

## Rules
- Always set a TTL. Never use infinite TTL except for known immutable data with manual invalidation.
- Never put large objects (>1MB) in cache. Compress or split.
- Cache keys must include a namespace prefix to avoid collisions.
- Always monitor cache hit ratio. Below 80% means cache is ineffective.
- Never use cache as a primary data store. Caches lose data.
- Always have a fallback when cache is unavailable (degrade gracefully to DB).
- Use connection pooling for Redis/Memcached. One connection per request is wasteful.
- Cache null results (with short TTL) to prevent repeated DB misses on missing data.
- Write to DB first, then invalidate/update cache. Never the reverse.
- Add ±10% jitter to TTL values to prevent thundering herd.
- Implement stampede protection for hot keys on high-traffic endpoints.
- Monitor evictions: if keys are evicted before TTL, cache is too small.

## References
  - references/cache-invalidation.md — Cache Invalidation
  - references/cache-monitoring.md — Cache Monitoring
  - references/cache-strategies.md — Cache Strategies
  - references/cache-testing.md — Cache Testing
  - references/cdn-caching.md — CDN Caching
  - references/redis-patterns.md — Redis Patterns
  - references/caching-fundamentals.md — Caching Fundamentals
  - references/caching-advanced.md — Caching Advanced Patterns
  - references/caching-stampede-prevention.md — Cache Stampede Prevention

## Handoff
No artifact produced unless requested.
Next skill: backend-rate-limiting — if the cache layer needs protection against traffic spikes.
Carry forward: cache key conventions, strategy, TTL policies, invalidation plan.
