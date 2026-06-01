# Caching Fundamentals

## Why Cache

- Reduce latency: Cache hit <1ms vs DB query 5-50ms
- Reduce load: 80% cache hit rate = 5x backend capacity
- Reduce cost: Fewer DB read replicas needed

## Cache Layers

| Layer | Location | Latency | Capacity | Best For |
|-------|----------|---------|----------|----------|
| L1: In-memory | App process | <0.1ms | GB | Hot data, per-instance |
| L2: Distributed | Redis/Memcached | <1ms | GB-TB | Shared data, multi-instance |
| L3: CDN | Edge nodes | <10ms | TB+ | Static assets, public APIs |
| L4: Browser | Client | 0ms | MB | Static assets, API responses |

## Cache Patterns

### Cache-Aside (Most Common)
```
Request → Check cache → Miss → Query DB → Store in cache → Return
              ↓ Hit → Return
```
Best for: Read-heavy, write-rare workloads.

### Read-Through
```
Request → Cache (loads from DB on miss) → Return
```
Best for: When cache library supports it (no app logic needed).

### Write-Through
```
Write → Cache → DB → Confirm
```
Best for: Write-heavy where read-after-write consistency matters.

### Write-Behind (Write-Back)
```
Write → Cache (immediate) → Async → DB (eventual)
```
Best for: High-write throughput where some data loss is acceptable.

## Eviction Policies

| Policy | Behavior | Use Case |
|--------|----------|----------|
| LRU | Evict least recently used | General purpose (default) |
| LFU | Evict least frequently used | Hot-spot heavy workloads |
| FIFO | Evict oldest first | Simple, predictable |
| TTL | Evict after time | Time-sensitive data |
| Random | Evict random entry | Testing, edge cases |

## Cache Invalidation

| Strategy | Mechanism | Complexity | Staleness |
|----------|-----------|------------|-----------|
| TTL | Time-based expiry | Low | Bounded |
| Write-invalidate | Update → delete cache key | Medium | Zero |
| Write-update | Update → update cache | Medium | Zero |
| Pub/sub | Event notifies cache to invalidate | High | Near-zero |
| Version key | Increment version on update | Medium | Zero |

## Common Cache Keys

```
user:{id}:profile        → User profile data
product:{id}:details     → Product details
session:{id}             → Session data
page:{path}:{locale}     → Rendered page
api:{path}:{query_hash}  → API response
rate_limit:{ip}:{route}  → Rate limit counters
```

## Cache Granularity

| Granularity | Example | Hit Rate | Complexity |
|-------------|---------|----------|------------|
| Coarse (page) | Full page response | High | Low |
| Medium (resource) | Product details | Medium | Medium |
| Fine (field) | Product price | Low | High |

Rule: Start coarse, move finer as needed. A coarse cache with high hit rate is better than a fine cache with perfect freshness.
