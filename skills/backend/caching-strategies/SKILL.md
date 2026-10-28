---
name: backend-caching-strategies
description: >
  Use this skill when the user says 'cache-aside', 'write-through', 'write-behind', 'read-through', 'cache invalidation', 'redis cache pattern', 'cache stampede', 'thundering herd', 'TTL jitter', 'stale cache'. Picks and implements a Redis-backed caching pattern (cache-aside, read-through, write-through, write-behind) with correct invalidation, stampede protection and failure handling. Do NOT use for: HTTP/CDN/browser caching (frontend-browser-caching), cache infrastructure sizing and eviction policy tuning (backend-caching), distributed locks as a primary goal (backend-distributed-locking).
version: "1.1.0"
author: "j4flmao"
license: "MIT"
tags: [backend, caching, redis, cache-aside, invalidation, stampede]
---

# Caching Strategies with Redis

## Purpose
Choose the right application-level caching pattern for a data access path and implement it so that the cache never becomes a source of wrong answers or outages. Covers read/write patterns, invalidation, stampede protection, and behaviour when Redis is unavailable.

## Agent Protocol

### Trigger
Exact user phrases: "cache-aside", "write-through", "write-behind", "read-through", "cache invalidation", "redis cache pattern", "cache stampede", "thundering herd", "TTL jitter", "stale cache".

### Input Context
- Read/write ratio and acceptable staleness for the data.
- Source of truth (PostgreSQL, MySQL, remote API) and who writes to it.
- Language/client library (go-redis v9, ioredis/node-redis, redis-py, Lettuce).
- Single Redis, Sentinel, or Cluster.

### Output Artifact
Pattern choice with rationale plus code for read path, write path and invalidation. No files unless requested.

### Response Format
```
Data: {entity / query}
Pattern: {cache-aside | read-through | write-through | write-behind}
Key: {key template}   TTL: {base} + jitter {range}
Invalidation: {delete-on-write | versioned key | event-driven}
Stampede guard: {singleflight | lock | early refresh | none}
Redis down: {fall through to DB | serve stale | fail}
```

## Pattern Selection

| Pattern | Read path | Write path | Consistency | Use when |
|---|---|---|---|---|
| Cache-aside | App reads cache, on miss loads DB and populates | App writes DB, then deletes key | Eventual; short stale window | Default for most read-heavy data |
| Read-through | Cache layer/library loads on miss | Same as cache-aside | Same as cache-aside | You want loading logic centralised in a cache wrapper |
| Write-through | Cache always populated | App writes DB and cache in the same request | Stronger, but two writes can diverge on partial failure | Data read immediately after write, small hot set |
| Write-behind | Cache is primary | Write to cache, flush to DB asynchronously | Risk of data loss if cache dies before flush | Counters, metrics, write-coalescing where loss is tolerable |
| Refresh-ahead | Background refresh before expiry | n/a | Fresh for hot keys | Predictable hot keys with expensive loads |

Decision rules:
- Default to **cache-aside with delete-on-write**. Delete instead of update: updating the cache after a DB write races with concurrent readers repopulating an older value.
- Use write-behind only when you can tolerate losing the unflushed window, or when Redis persistence (AOF) plus an idempotent flusher is in place.
- Never cache data whose staleness causes money or security errors (balances, permissions) without explicit invalidation on every write path.

## Cache-Aside in Go (go-redis v9)

```go
package cache

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"math/rand/v2"
	"time"

	"github.com/redis/go-redis/v9"
	"golang.org/x/sync/singleflight"
)

type User struct {
	ID    string `json:"id"`
	Email string `json:"email"`
}

type UserStore interface {
	GetUser(ctx context.Context, id string) (User, error)
	UpdateUser(ctx context.Context, u User) error
}

type UserCache struct {
	rdb   *redis.Client
	db    UserStore
	group singleflight.Group
	ttl   time.Duration
}

func NewUserCache(rdb *redis.Client, db UserStore) *UserCache {
	return &UserCache{rdb: rdb, db: db, ttl: 10 * time.Minute}
}

func userKey(id string) string { return "user:v1:" + id }

// jitter spreads expirations so keys written together do not expire together.
func (c *UserCache) jitteredTTL() time.Duration {
	return c.ttl + time.Duration(rand.Int64N(int64(c.ttl/10)))
}

func (c *UserCache) Get(ctx context.Context, id string) (User, error) {
	raw, err := c.rdb.Get(ctx, userKey(id)).Bytes()
	switch {
	case err == nil:
		var u User
		if jsonErr := json.Unmarshal(raw, &u); jsonErr == nil {
			return u, nil
		}
		slog.Warn("corrupt cache entry, reloading", "key", userKey(id))
	case errors.Is(err, redis.Nil):
		// miss: fall through to loader
	default:
		// Redis unavailable: degrade to the database instead of failing the request.
		slog.Warn("redis get failed, falling back to db", "key", userKey(id), "err", err)
	}

	// singleflight collapses concurrent misses for the same key into one DB query.
	v, err, _ := c.group.Do(id, func() (any, error) {
		u, err := c.db.GetUser(ctx, id)
		if err != nil {
			return User{}, fmt.Errorf("load user %s: %w", id, err)
		}
		if b, err := json.Marshal(u); err == nil {
			if err := c.rdb.Set(ctx, userKey(id), b, c.jitteredTTL()).Err(); err != nil {
				slog.Warn("redis set failed", "key", userKey(id), "err", err)
			}
		}
		return u, nil
	})
	if err != nil {
		return User{}, err
	}
	return v.(User), nil
}

// Update writes the source of truth first, then invalidates.
func (c *UserCache) Update(ctx context.Context, u User) error {
	if err := c.db.UpdateUser(ctx, u); err != nil {
		return fmt.Errorf("update user %s: %w", u.ID, err)
	}
	if err := c.rdb.Del(ctx, userKey(u.ID)).Err(); err != nil {
		// The entry will self-heal at TTL; log so stale windows are visible.
		slog.Error("cache invalidation failed", "key", userKey(u.ID), "err", err)
	}
	return nil
}
```

Notes:
- `singleflight` only deduplicates within one process. Across many instances, combine it with a short Redis lock (`SET key val NX PX 5000`) or probabilistic early refresh.
- Include a schema version in the key (`user:v1:`) so a deploy that changes the serialized shape does not read old entries.

## Invalidation Strategies

| Strategy | How | Trade-off |
|---|---|---|
| TTL only | Entry expires | Simple; staleness up to TTL |
| Delete on write | `DEL` after DB commit | Small race: a reader that loaded before the commit can repopulate old data |
| Delayed double delete | `DEL`, then `DEL` again after ~1s | Narrows the race; extra write |
| Versioned keys | Store a version counter, embed in key | No deletes needed; old keys expire by TTL |
| Event-driven (CDC/outbox) | Consumer deletes keys on change events | Catches writes from every service; needs a pipeline |

When several services write the same table, delete-on-write in one service is not enough. Use CDC (e.g. Debezium) or the transactional outbox to drive invalidation.

## Stampede Protection

1. **Request coalescing** (singleflight) per instance.
2. **Mutex on miss**: `SET lock:{key} {token} NX PX 5000`; winners load, losers wait briefly and re-read, release with a compare-and-delete Lua script.
3. **Probabilistic early expiration**: refresh when `now - delta * beta * ln(rand()) >= expiry` (XFetch), so one request refreshes before expiry.
4. **TTL jitter**: always add 0-10% random jitter to TTLs set in bulk.
5. **Negative caching**: cache "not found" for a short TTL to stop repeated misses for absent IDs.

## Write-Behind Sketch

```python
# Accumulate increments in Redis, flush periodically. Loss window = flush interval.
import redis

r = redis.Redis()

def record_view(article_id: int) -> None:
    r.hincrby("views:pending", str(article_id), 1)

def flush(conn) -> None:
    # Atomically take the pending hash so increments during flush are not lost.
    # Resume a batch left by a crashed flush before taking a new one.
    if not r.exists("views:flushing"):
        if not r.exists("views:pending"):
            return
        r.rename("views:pending", "views:flushing")
    pending = r.hgetall("views:flushing")
    with conn.cursor() as cur:
        for article_id, count in pending.items():
            cur.execute(
                "UPDATE articles SET views = views + %s WHERE id = %s",
                (int(count), int(article_id)),
            )
    conn.commit()
    r.delete("views:flushing")
```

If the flusher crashes between commit and delete, the next run re-applies the batch and double-counts; store a flush batch ID in the DB if exactness matters.

## Anti-Patterns

| Anti-pattern | Problem | Fix |
|---|---|---|
| Set cache before DB commit | Cache holds data that may roll back | Commit first, then delete |
| Update cache on write instead of delete | Concurrent writers leave older value last | Delete and let the next read load |
| No TTL | Stale forever after a missed invalidation | Every key gets a TTL |
| Caching whole unbounded lists | Huge values, slow serialization | Cache pages or IDs plus per-item entries |
| `KEYS pattern` for invalidation | Blocks Redis (O(N) over keyspace) | Track keys in a set, or use `SCAN`, or versioned keys |
| Treat Redis errors as misses that also fail the request | Cache outage becomes full outage | Fall back to DB with a circuit breaker on Redis |

## Checklist
- [ ] Pattern chosen with explicit staleness budget.
- [ ] Every key has a TTL with jitter and a versioned prefix.
- [ ] Writes commit to the source of truth before invalidating.
- [ ] All write paths (including other services, admin tools, migrations) invalidate.
- [ ] Stampede guard for hot or expensive keys.
- [ ] Redis failure degrades to the database; hit/miss/error rates are metered.

## References
- Related skills: `skills/backend/universal/caching/SKILL.md` (cache infrastructure, eviction, multi-tier), `skills/backend/universal/distributed-locking/SKILL.md` (lock semantics), `skills/backend/universal/transactional-outbox/SKILL.md` (event-driven invalidation).
