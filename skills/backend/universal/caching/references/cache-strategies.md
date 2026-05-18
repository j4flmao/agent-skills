# Cache Strategies

## Strategy Overview

### Cache-Aside (Lazy Loading)
```
Read:
  1. Check cache (key lookup)
  2. Cache hit → return data
  3. Cache miss → read from DB
  4. Store in cache with TTL
  5. Return data

Write:
  1. Write to DB
  2. Delete cache entry for that key (or update)

Advantages:
  - Simple to implement
  - Cache only holds requested data
  - Resilient to cache failure (falls back to DB)
Disadvantages:
  - Cache miss penalty (extra DB read)
  - Write-then-read race: stale data possible if delete delayed
  - Cache stampede on popular keys after expiry
```

### Read-Through
```
Read:
  1. Cache library intercepts read
  2. Cache hit → return data
  3. Cache miss → library reads DB, populates cache, returns data

Write:
  1. Write to DB
  2. Delete or update cache behind the scenes

Advantages:
  - Consistent read logic (library handles DB loading)
  - Less application code
Disadvantages:
  - Works best with key-value lookups (complex queries harder)
  - Library dependency
```

### Write-Through
```
Write:
  1. Write to DB
  2. Write to cache (or update in place)

Read:
  - Always hits cache (cache is always up-to-date)

Advantages:
  - Cache is always consistent with DB
  - No cache miss on read
Disadvantages:
  - Higher write latency (two writes)
  - Wasted writes for data that is rarely read
```

### Write-Behind (Write-Back)
```
Write:
  1. Write to cache (immediate acknowledgment)
  2. Async write to DB (deferred, batched)

Read:
  - Always hits cache (source of truth)

Advantages:
  - Very low write latency
  - Write coalescing (batch writes to DB)
  - Reduced DB write load
Disadvantages:
  - Data loss risk on cache failure before DB write
  - Complex consistency model
  - DB and cache can diverge
```

## Strategy Selection Matrix

| Read/Write Ratio | Consistency | Complexity | Recommended |
|-----------------|-------------|------------|-------------|
| Read-heavy | Eventual | Low | Cache-Aside |
| Read-heavy | Strong | Medium | Read-Through + Write-Through |
| Write-heavy | Eventual | Medium | Write-Behind |
| Write-heavy | Strong | High | Write-Through |
| Balanced | Eventual | Low | Cache-Aside |

## Cache Hierarchy (Multi-Level)
```
L1: In-memory (local to app instance)
  - Fastest (~0.1ms)
  - Evicted on restart
  - Max: few GB
  - Best for: hot data, session state

L2: Distributed cache (Redis)
  - Fast (~1-5ms)
  - Shared across instances
  - Max: depends on cluster
  - Best for: shared data, larger dataset

L3: CDN
  - Moderate (~10-50ms)
  - Edge-cached
  - Max: depends on CDN
  - Best for: static assets, API responses (Cache-Control)
```

Read path with multi-level:
```
1. Check L1 (in-memory)
2. Miss → check L2 (Redis)
3. Miss → check L3 (CDN) or origin (DB)
4. Populate L1, L2 on response
```

## Cache-Aside Anti-Patterns
```
❌ Read: check cache → miss → read DB → return (skip writing to cache)
   → Subsequent reads hit DB again. Cache useless.

❌ Write: write cache → write DB (reverse order)
   → Cache write succeeds, DB write fails. Stale cache.

❌ Read: always read from cache, never DB
   → Cache miss → error. No fallback.

❌ TTL: all keys same TTL
   → Thundering herd on mass expiry.
```

## Best Practices
- Always set TTL. Immutable data can have large TTL but never infinite.
- Add jitter (±10%) to TTL to prevent mass expiry.
- Cache null/empty results (with short TTL) to prevent repeated misses.
- Compress large cached values (>1KB).
- Monitor hit ratio: <80% means the wrong data is cached or TTL is too short.
- Never use cache as the source of truth.
