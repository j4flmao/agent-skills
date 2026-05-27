---
name: backend-caching
description: >
  Use this skill when the user says 'cache', 'Redis', 'Memcached', 'CDN', 'cache-aside', 'read-through', 'write-through', 'write-behind', 'cache invalidation', 'TTL', 'cache stampede', 'thundering herd', 'cache warming', 'LRU', 'LFU', 'cache hit ratio', 'cache strategy', or when designing a caching layer. This skill enforces consistent caching strategies: layer selection, read/write patterns, invalidation, stampede prevention, and monitoring. Applies to any backend stack. Do NOT use for: message queue design, database schema design, or frontend state caching.
version: "1.0.0"
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
Before activating, verify:
- The data being cached is known (DB query result, computed value, API response, static asset).
- The read/write ratio is known.
- The consistency requirement (eventual vs strong) is known.
- The hosting topology (single node, clustered, multi-region) is known.

### Output Artifact
No file output unless the user requests it. Produces caching strategy specs as text.

### Response Format
For each cache:
```
Layer: {application | distributed | CDN}
Store: {Redis | Memcached | CDN | in-memory}
Strategy: {cache-aside | read-through | write-through | write-behind}
Key format: {namespace}:{entity}:{id}
TTL: {duration}
Invalidation: {manual | TTL-based | event-driven}
Stampede protection: {yes/no — method}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Cache strategy is selected with justification.
- [ ] Key naming convention is defined with namespaces.
- [ ] TTL is set for every cache entry (no infinite TTL unless immutable data).
- [ ] Stale data tolerance is documented.
- [ ] Invalidation strategy is defined (TTL and/or event-driven).
- [ ] Cache stampede prevention is in place for high-traffic keys.
- [ ] Monitoring plan (hit ratio, latency, memory) is defined.

### Max Response Length
Per cache layer: 8 lines. Per full design: unlimited.

## Workflow

### Step 1: Choose Cache Layer
```
Application cache (in-memory):   fastest, local to process, lost on restart
Distributed cache (Redis):       shared across nodes, persists, supports complex types
CDN:                             edge-cached static or semi-static content
```

### Step 2: Choose Strategy
```
Cache-aside (lazy loading):
  1. Read: check cache → miss → read DB → write cache → return
  2. Write: write DB → delete cache entry
  3. Best for: general purpose, read-heavy workloads

Read-through:
  1. Cache library loads from DB on miss transparently
  2. Best for: when you want cache and DB to always align

Write-through:
  1. Write DB + write cache atomically (or cache first)
  2. Best for: when read must always get latest

Write-behind (write-back):
  1. Write cache → async write DB
  2. Best for: write-heavy, can tolerate brief inconsistency
  3. Risk: data loss on cache failure
```

### Step 3: Key Naming
```
Namespaced colon-delimited keys:
  users:{id}              → user:abc123
  users:{id}:profile      → user:abc123:profile
  products:{id}:inventory → product:xyz456:inventory
  page:{path}             → page:/docs/getting-started
  rate:limit:{userId}     → rate:limit:abc123
```

### Step 4: TTL Management
```
Rule of thumb:
  Immutable data:         TTL = infinite (only invalidate on event)
  Slowly-changing data:   TTL = hours
  Fast-changing data:     TTL = seconds to minutes
  Session data:           TTL = session duration + grace

TTL randomization: add ±10% jitter to prevent mass expiry stampede
```

### Step 5: Cache Stampede Prevention
```
Option A — Mutex (lock on cache miss):
  lock: {key}:lock (NX, TTL 5s)
  First request gets lock → loads DB → sets cache
  Others wait or serve stale

Option B — Probabilistic early recomputation:
  If TTL remaining < 10% of total, probabilistically refresh

Option C — Background refresh:
  Dedicated worker refreshes hot keys before expiry

Option D — Stale-while-revalidate:
  Serve stale data → async refresh cache → serve fresh next time
```

### Step 6: Invalidation Strategies
```
TTL-based:     simplest, accept staleness until TTL expiry
Event-driven:  publish invalidation event → consumers evict keys
Manual:        admin endpoint / CLI to purge keys by pattern
Batch purge:   for related data changes (e.g., tag:*, prefix:*)

Invalidation order (write-through):
  1. Write DB
  2. Delete/update cache
  3. Done. Never invalidate before write (race condition).
```

## Rules
- Always set a TTL. Never use infinite TTL except for known immutable data.
- Never put large objects (>1MB) in cache. Compress or split.
- Cache keys must include a namespace prefix to avoid collisions.
- Always monitor cache hit ratio. Below 80% means cache is ineffective.
- Never use cache as a primary data store. Caches lose data.
- Always have a fallback when cache is unavailable (degrade gracefully to DB).
- Use connection pooling for Redis/Memcached. One connection per request is wasteful.
- Cache null results (with short TTL) to prevent repeated DB misses on missing data.

## References
  - references/cache-invalidation.md — Cache Invalidation
  - references/cache-monitoring.md — Cache Monitoring
  - references/cache-strategies.md — Cache Strategies
  - references/cache-testing.md — Cache Testing
  - references/cdn-caching.md — CDN Caching
  - references/redis-patterns.md — Redis Patterns
## Handoff
No artifact produced unless requested.
Next skill: backend-rate-limiting — if the cache layer needs protection against traffic spikes.
Carry forward: cache key conventions, strategy, TTL policies, invalidation plan.
