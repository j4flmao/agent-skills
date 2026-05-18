# Cache Invalidation

## Invalidation Strategies

### TTL-Based (Time-to-Live)
```
Simplest. Set TTL on cache write. Cache auto-evicts after TTL.

Pros: no coordination, no events, no complexity
Cons: data is stale until TTL expires

Use when: stale data is acceptable, data changes slowly, no strong consistency needed
TTL: trade-off between freshness (short TTL) and hit ratio (long TTL)
```

### Event-Driven Invalidation
```
On data change:
  1. Perform DB write
  2. Publish invalidation event (via message queue or Redis pub/sub)
  3. All cache instances listen and evict matching keys

Pros: near-immediate invalidation, coordinated across all instances
Cons: requires message broker; eventual consistency

Use when: strong freshness needed, data changes are infrequent but important
```

### Write-Through Invalidation
```
On data change:
  1. Write to DB
  2. Update or delete cache key

Pros: cache is always consistent with DB
Cons: higher write latency; race: another read may write stale data between steps

Solution for race:
  1. Write to DB
  2. Delete cache (don't update — delete forces fresh read)
  Thread A: reads old value → Thread B: writes DB + deletes cache → Thread B: reads DB fresh
```

### Manual Invalidation
```
Admin endpoint or CLI:
  DELETE /cache/purge?pattern=users:*
  redis-cli KEYS "users:*" | xargs redis-cli DEL

Pros: full control, simple to understand
Cons: manual, error-prone, missed invalidation = stale data

Emergency use: purge everything during incidents
```

### Invalidation by Pattern
```
Keys follow naming conventions like namespace:entity:id.

Invalidate a namespace:
  Pattern: products:*
  Redis: KEYS products:* → DEL each key (use SCAN in production, not KEYS)

Batch invalidation:
  When a category changes, invalidate all products under that category:
  products:cat_electronics:*
```

## Common Pitfalls

### ❌ Read-Then-Write Race
```
Thread A: read from DB (value = "old")
Thread B: write to DB (value = "new")
Thread B: delete cache
Thread A: write to cache (value = "old")  ← STALE!

Solution: Delete cache BEFORE writing DB, or use compare-and-delete.
Better: Write DB → Delete cache (lock key during DB write).
```

### ❌ Thundering Herd on Expiry
```
Key expires. 100 concurrent requests all miss cache → all hit DB → DB overload.

Solution:
  - Mutex: first request to miss gets lock, others wait.
  - Probabilistic early recomputation: refresh before TTL expiry (e.g., at 90% TTL).
  - Stale-while-revalidate: serve stale + refresh async.
  - TTL jitter: randomize TTL within ±10% to spread expiry.
```

### ❌ Cascading Invalidations
```
User changes address → invalidate:
  - user:{id}
  - order:{id}:shipping
  - invoice:{id}

This is normal. But avoid:
  - One change invalidating thousands of keys at once.
  - Recursive invalidations (A clears B, B clears A).

Solution: batch deletes with SCAN, or use event-driven with rate limiting.
```

## Invalidation Decision Matrix

| Strategy | Freshness | Complexity | Traffic Overhead | Best For |
|----------|-----------|------------|-----------------|----------|
| TTL-only | Low | None | None | Stale-ok data |
| Event-driven | High | Medium | Low | Critical updates |
| Write-through | High | Low | Medium | Consistent reads |
| Manual | Manual | Low | None | Admin operations |
| Pattern-based | Medium | Low | High (on purge) | Namespace changes |

## Cache Invalidation via Message Queue
```python
# Producer (on data change)
def update_user(user_id, data):
    db.users.update(user_id, data)
    message_queue.publish("cache:invalidate", {
        "keys": [f"user:{user_id}", f"user:{user_id}:profile"]
    })

# Consumer (on each cache instance)
def handle_invalidation(message):
    for key in message["keys"]:
        redis.delete(key)
```

## HTTP Cache Invalidation (CDN)
```
Purge by URL: DELETE /cache/www.example.com/users/abc123
Purge by tag: DELETE /cache?tags=user_abc123
Purge by pattern: varies by CDN provider

Common:
  - Cloudflare: PURGE /url
  - Fastly: PURGE /url (with Surrogate-Key)
  - CloudFront: create invalidation by path pattern
```
