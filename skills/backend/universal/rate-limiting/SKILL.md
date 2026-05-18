---
name: backend-rate-limiting
description: >
  Use this skill when the user says 'rate limit', 'rate limiting', 'token bucket', 'leaky bucket', 'sliding window', 'fixed window', 'distributed rate limiting', 'backpressure', 'throttle', '429', 'too many requests', 'API quota', 'concurrency limit', 'circuit breaker', or when designing traffic control. This skill enforces consistent rate limiting patterns: algorithm selection, distributed coordination, backpressure mechanisms, and error responses. Applies to any backend stack. Do NOT use for: caching strategies, load testing, authentication, or database connection pooling.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, rate-limiting, phase-2, universal]
---

# Backend Rate Limiting

## Purpose
Design consistent, production-grade rate limiting and backpressure systems. Every rate limit must follow the same conventions for algorithm selection, key design, limit tiers, distributed coordination, error responses, and monitoring.

## Agent Protocol

### Trigger
Exact user phrases: "rate limit", "rate limiting", "token bucket", "leaky bucket", "sliding window", "fixed window", "distributed rate limiting", "backpressure", "throttle", "429", "too many requests", "API quota", "concurrency limit", "circuit breaker", "design rate limiting".

### Input Context
Before activating, verify:
- The resource being rate-limited (API endpoint, user, IP, service) is known.
- The rate limit granularity (per user, per IP, per API key, global) is known.
- The distributed vs single-node deployment is known.
- The traffic pattern (steady vs bursty) is known.

### Output Artifact
No file output unless the user requests it. Produces rate limiting specs as text.

### Response Format
For each rate limit:
```
Resource: {what is being limited}
Algorithm: {token-bucket | leaky-bucket | sliding-window | fixed-window}
Scope: {per-user | per-IP | per-API-key | global}
Limit: {max requests} per {time window}
Burst: {max burst size} (if applicable)
Storage: {in-memory | Redis | external}
Error response: 429 + {retry-after header}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Algorithm is selected with justification.
- [ ] Limit tiers are defined for all scopes (user, IP, global).
- [ ] Distributed coordination is implemented (if multi-node).
- [ ] Error responses follow the standard format with Retry-After header.
- [ ] Backpressure mechanism is defined for inter-service calls.
- [ ] Monitoring (rate-limited requests, remaining quota, latency impact) is defined.

### Max Response Length
Per rate limit rule: 7 lines.

## Workflow

### Step 1: Choose Algorithm
```
Token bucket:
  - Tokens added at fixed rate (e.g., 10 tokens/s), max bucket size = burst
  - Allows bursts up to bucket size
  - Best for: APIs that need to allow short bursts

Leaky bucket:
  - Requests processed at fixed rate, excess queued/discarded
  - Smooths traffic, no bursting
  - Best for: downstream systems that cannot handle bursts

Fixed window:
  - Count requests per window (e.g., 1000 req/hour), reset at boundary
  - Simple but allows spikes at window boundaries
  - Best for: simple quotas, UI dashboards

Sliding window:
  - Count requests over rolling time window (precision: ~1s)
  - More accurate than fixed window, no boundary spike
  - Best for: production APIs, fair rate limiting
```

### Step 2: Define Limit Tiers
```
Tier         Requests     Window      Burst     Scope
free         10           1 min       20        per API key
pro          1000         1 min       2000      per API key
enterprise   10000        1 min       20000     per API key
global       50000        1 min       100000    cluster-wide
```

### Step 3: Implement Token Bucket (Recommended Default)
```
State per key:
  tokens: current count
  last_refill: timestamp

On request:
  elapsed = now - last_refill
  tokens = min(capacity, tokens + elapsed * refill_rate)
  if tokens >= 1:
    tokens -= 1
    allow
  else:
    deny (429)

Refill rate = limit / window_seconds
Burst = capacity (max tokens)
```

Redis implementation:
```
local key = KEYS[1]
local now = tonumber(ARGV[1])
local rate = tonumber(ARGV[2])      -- refill per second
local capacity = tonumber(ARGV[3])  -- max burst

local info = redis.call('HMGET', key, 'tokens', 'last_refill')
local tokens = tonumber(info[1]) or capacity
local last_refill = tonumber(info[2]) or now

local elapsed = math.max(0, now - last_refill)
tokens = math.min(capacity, tokens + elapsed * rate)

if tokens >= 1 then
  tokens = tokens - 1
  redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
  redis.call('EXPIRE', key, math.ceil(capacity / rate) * 2)
  return 1  -- allow
else
  return 0  -- deny
end
```

### Step 4: Error Response Format
```
HTTP/1.1 429 Too Many Requests
Retry-After: 5
Content-Type: application/json

{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded. Retry after 5 seconds.",
    "retryAfter": 5,
    "quota": {
      "limit": 100,
      "remaining": 0,
      "reset": 1716000000
    }
  }
}
```

Headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 1716000000
Retry-After: 5
```

### Step 5: Distributed Rate Limiting
```
Single node:  in-memory counters, fastest, no coordination
Multi node:   Redis (atomic Lua script or sorted sets)
              — Consistent hash key → same Redis node
              — Trade-off: +1-5ms latency per request

Highly accurate across nodes:
  Sliding window log (sorted set per key):
    ZREMRANGEBYSCORE key 0 now-window
    ZCARD key → count
    ZADD key now now
    EXPIRE key window

  Trade-off: memory grows with request volume per window
```

### Step 6: Backpressure
```
Scenario:  Service A calls Service B. B is overloaded.

Client-side backpressure:
  1. Detect 429 or increased latency from B
  2. Reduce request rate (adaptive throttling)
  3. Queue excess requests or fail fast
  4. Circuit breaker: after N failures, stop calling B for X seconds

Server-side backpressure:
  1. Reject excess requests with 429
  2. Shed load gracefully (drop low-priority requests first)
  3. Propagate backpressure to upstream callers via 429 or connection backlog limits
```

## Rules
- Always return Retry-After header with 429 responses. Never omit it.
- Rate limit at the edge (API gateway / reverse proxy) first, application second.
- Use Redis for all distributed rate limiting. Never rely on in-memory across multiple nodes.
- Always apply global limits in addition to per-user limits.
- Log rate-limited requests separately for monitoring.
- Rate limit key must include the scope (e.g., user:{id}:endpoint:{path}).
- Set burst capacity to at least 2x the steady-state rate for token bucket.
- Never use fixed window for production APIs — always use sliding window or token bucket.

## References
- `references/algorithms.md` — Rate limiting algorithms deep-dive
- `references/implementation-patterns.md` — Implementation patterns
- `references/distributed-rate-limiting.md` — Distributed coordination
- `references/backpressure.md` — Backpressure and circuit breakers

## Handoff
No artifact produced unless requested.
Next skill: backend-load-testing — to verify rate limits under traffic.
Carry forward: rate limit tiers, algorithm choice, key conventions, error response format.
