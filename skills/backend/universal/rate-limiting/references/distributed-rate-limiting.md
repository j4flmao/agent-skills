# Distributed Rate Limiting

## Challenge
```
Single node: in-memory counter. Simple, fast.
Multi node: counters must be shared. Adds latency and complexity.

Problems:
  1. In-memory counters are per-instance → user can exceed limit by hitting multiple nodes.
  2. Redis adds 1-5ms per check → overhead on every request.
  3. Clock skew between nodes → inaccurate window boundaries.
```

## Solution: Centralized Store (Redis)

### Architecture
```
All nodes share a single Redis (or Redis cluster).

Request path:
  Node A → Redis (atomic check-and-increment)
  Node B → Redis (same check)
```

### Redis is the right choice:
- Atomic operations (INCR, Lua scripts) → race-condition-free.
- Sub-millisecond latency with dedicated Redis.
- TTL-based auto-cleanup.
- Lua scripting for complex algorithms.

## Redis-Based Token Bucket (Lua)

```lua
-- KEYS[1]: rate limit key (e.g., "ratelimit:user:abc123:api")
-- ARGV[1]: current timestamp
-- ARGV[2]: refill rate (tokens per second)
-- ARGV[3]: bucket capacity (max burst)
-- ARGV[4]: cost (usually 1)

local key = KEYS[1]
local now = tonumber(ARGV[1])
local rate = tonumber(ARGV[2])
local capacity = tonumber(ARGV[3])
local cost = tonumber(ARGV[4])

local info = redis.call('HMGET', key, 'tokens', 'last_refill')
local tokens = tonumber(info[1]) or capacity
local last_refill = tonumber(info[2]) or now

local elapsed = math.max(0, now - last_refill)
tokens = math.min(capacity, tokens + elapsed * rate)

if tokens >= cost then
    tokens = tokens - cost
    redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
    redis.call('EXPIRE', key, math.ceil(capacity / rate * 2))
    return {1, tokens, capacity}
else
    local wait_time = math.ceil((cost - tokens) / rate * 1000)
    return {0, tokens, wait_time}
end
```

## Redis-Based Sliding Window (Sorted Set)

```lua
-- KEYS[1]: rate limit key
-- ARGV[1]: window size in seconds
-- ARGV[2]: max requests
-- ARGV[3]: current timestamp

local key = KEYS[1]
local window = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

-- Remove expired entries
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)

-- Count current entries
local count = redis.call('ZCARD', key)

if count < limit then
    redis.call('ZADD', key, now, now)
    redis.call('EXPIRE', key, window + 1)
    return {1, limit - count - 1}
else
    return {0, 0}
end
```

## Consistency vs Performance Trade-off

### Strong Consistency (Recommended)
```
Every request goes to Redis for check + increment.
  + Accurate across all nodes.
  - +1-5ms per request.
  - Redis becomes a single point of failure (mitigate with replica).

Use when: accuracy matters, moderate traffic.
```

### Eventually Consistent (Local counters + sync)
```
Each node maintains an in-memory counter.
  Node accepts requests until local counter reaches (limit / num_nodes).
  Syncs with Redis periodically to reconcile.

  + No Redis on every request → very fast.
  + Redis load is low.
  - User may exceed limit during sync delay.
  - Uneven load distribution can cause early throttling on hot nodes.

Use when: very high throughput, slight over-limit is acceptable (at-most-once).
```

### Batch Sync
```
Each node batches increments and sends to Redis every 100ms or every N requests.

  + Reduces Redis calls from per-request to per-batch.
  - Slight over-limit possible between syncs.
  - More complex implementation.

Use when: high throughput, slight inaccuracy is acceptable.
```

## Clock Skew Handling
```
Problem: servers with different clocks cause window misalignment.

Solutions:
  1. Use Redis time (TIME command) instead of local clock.
  2. Use NTP with tight synchronization.
  3. Allow ±1s tolerance in window calculations.
```

## Failover Strategy
```
Redis primary down:
  Option A: Fail open (allow all) — risk of backend overload.
  Option B: Fail closed (deny all) — risk of legitimate requests rejected.
  Option C: Local fallback — switch to approximate in-memory rate limiting.

Recommendation: Option C (local fallback).
  Each node has a conservative local limit as backup.
  When Redis is available: use accurate distributed limits.
  When Redis is down: fall back to:
    local_limit = global_limit / num_nodes * 0.8 (conservative)
```

## Distributed Rate Limit with API Gateway
```
API Gateway (e.g., Kong, Envoy, NGINX):
  - Handles rate limiting at the edge.
  - Enforces: per-IP, per-API-key, per-route.
  - Uses shared Redis cluster.

Internal services:
  - Rely on gateway for external-facing limits.
  - Implement additional per-user limits if needed for internal fairness.

This reduces the number of distributed rate limiters needed in application code.
```
