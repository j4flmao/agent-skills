---
name: backend-rate-limiting
description: >
  Use this skill when the user says 'rate limit', 'rate limiting', 'token bucket', 'leaky bucket', 'sliding window', 'fixed window', 'distributed rate limiting', 'backpressure', 'throttle', '429', 'too many requests', 'API quota', 'concurrency limit', 'circuit breaker', or when designing traffic control. This skill enforces consistent rate limiting patterns: algorithm selection, distributed coordination, backpressure mechanisms, and error responses. Applies to any backend stack. Do NOT use for: caching strategies, load testing, authentication, or database connection pooling.
version: "2.0.0"
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

## Decision Tree

### Which Algorithm?

```
What is your traffic pattern?
  ├── Steady, predictable, downstream cannot handle bursts
  │   └── Leaky bucket — smooths output to constant rate
  ├── Bursty (users click, API call bursts OK)
  │   └── Token bucket — allow bursts up to capacity
  ├── Simple per-user quota for dashboard display
  │   └── Fixed window — easy to understand, cheap
  ├── Production API, fair distribution needed
  │   └── Sliding window log — accurate, no boundary spikes
  └── High performance, need sub-millisecond decisions
      └── GCRA (Generic Cell Rate Algorithm) — best accuracy/performance trade-off
```

### Where to Rate Limit?

```
Where in the request path?
  ├── At the edge (API gateway / reverse proxy / CDN)
  │   └── First line of defense: global + IP-based limits
  ├── At the application middleware
  │   └── Per-user / per-API-key limits after auth
  ├── At the service boundary (service A → service B)
  │   └── Client-side adaptive throttling + server-side limits
  └── At the resource level (DB connections, queue writes)
      └── Concurrency limits with semaphore pattern
```

### What Scope?

```
Who or what to limit?
  ├── Unauthenticated requests → limit by IP
  ├── Authenticated requests → limit by user ID (from token)
  ├── Third-party API consumers → limit by API key
  ├── Internal services → limit by service name or JWT claims
  └── Global protection → cluster-wide limit (all users combined)
```

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

TypeScript in-memory implementation:
```typescript
class TokenBucket {
  private state = new Map<string, { tokens: number; lastRefill: number }>();

  constructor(
    private capacity: number,
    private refillRate: number,  // tokens per second
    private refillWindow: number = 1,  // seconds
  ) {}

  allow(key: string): boolean {
    const now = Date.now() / 1000;
    let entry = this.state.get(key);
    if (!entry) {
      entry = { tokens: this.capacity, lastRefill: now };
      this.state.set(key, entry);
    }
    const elapsed = now - entry.lastRefill;
    entry.tokens = Math.min(this.capacity, entry.tokens + elapsed * this.refillRate);
    entry.lastRefill = now;
    if (entry.tokens >= 1) {
      entry.tokens -= 1;
      return true;
    }
    return false;
  }
}
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

```typescript
// Adaptive throttling — client-side
class AdaptiveThrottler {
  private requestDelay = 0;
  private minDelay = 0;
  private maxDelay = 5000;  // 5 second max delay

  async call<T>(fn: () => Promise<T>): Promise<T> {
    await this.delay(this.requestDelay);
    try {
      const result = await fn();
      this.requestDelay = Math.max(this.minDelay, this.requestDelay - 10);
      return result;
    } catch (err) {
      if (isRateLimited(err)) {
        this.requestDelay = Math.min(this.maxDelay, this.requestDelay + 100);
        throw err;
      }
      throw err;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Step 7: Rate Limit Key Design

```
Pattern: {scope}:{identifier}:{resource}:{granularity}

Examples:
  ip:192.168.1.1:api:*           — All endpoints, by source IP
  user:user_123:api:/orders      — /orders endpoint, by user
  apikey:key_prod_abc:api:*      — All endpoints, by API key
  global:cluster-1:api:*         — Global cluster-wide limit
  service:payment:process        — Process call, by service name

Rule: Include resource granularity to avoid one slow endpoint
  consuming budget for all others.
```

## Production Considerations

| Concern | Practice |
|---------|----------|
| Redis availability | Rate limiting can tolerate stale data. If Redis is down, fall back to in-memory with reduced limits |
| Clock skew | Use Redis TIME command, not client timestamps |
| Cold start | Allow first request through (tokens = capacity initially) |
| Lambda/serverless | Rate limit at API Gateway, not in application code |
| Cascading failures | Client-side backpressure + server-side limits together prevent domino effect |
| Cost of Redis per request | ~1-5ms. Batch multiple keys in one Lua script call |

## Performance

| Algorithm | Ops/sec (single node) | Ops/sec (Redis) | Memory per key |
|-----------|----------------------|-----------------|---------------|
| Token bucket (in-memory) | 5,000,000+ | 100,000 | 32 bytes |
| Sliding window log (sorted set) | N/A | 20,000 | ~100 bytes per request |
| Fixed window (Redis counter) | N/A | 200,000 | 8 bytes |
| GCRA (in-memory) | 5,000,000+ | N/A | 16 bytes |

## Security

| Attack | Mitigation |
|--------|-----------|
| IP spoofing | Rate limit by X-Forwarded-For + connecting IP |
| API key theft | Rate limit per key + anomaly detection (usage pattern change) |
| Distributed DDoS (many IPs, low each) | Global limit + behavioral analysis |
| Cache-busting (unique URLs) | Rate limit by normalized path (strip query params) |
| Batch registration | Rate limit by IP for unauthenticated endpoints, by user after login |

## Anti-Patterns

| Anti-Pattern | Why It's Bad | Fix |
|-------------|-------------|-----|
| Fixed window at boundary | 2x traffic spikes at window edges | Use sliding window or token bucket |
| Only per-user, no global limit | DDoS from many users bypasses limits | Always add cluster-wide global limit |
| Rate limiting after expensive work | Wasted resources on rejected requests | Check limit before processing |
| No Retry-After header | Clients retry immediately, making it worse | Always include Retry-After |
| Symmetric rate limits (same up/down) | Downloads consume more bandwidth | Separate limits for uploads and downloads |
| Hardcoding limits in application code | Changing limits requires redeploy | Externalize to config/DB |

## Rules
- Always return Retry-After header with 429 responses. Never omit it.
- Rate limit at the edge (API gateway / reverse proxy) first, application second.
- Use Redis for all distributed rate limiting. Never rely on in-memory across multiple nodes.
- Always apply global limits in addition to per-user limits.
- Log rate-limited requests separately for monitoring.
- Rate limit key must include the scope (e.g., user:{id}:endpoint:{path}).
- Set burst capacity to at least 2x the steady-state rate for token bucket.
- Never use fixed window for production APIs — always use sliding window or token bucket.
- Always allow at least 1 request through during cold start (no key yet).
- Rate limiting decisions must be fast (<5ms) — never make external API calls in the decision path.
- Prefer Lua scripts in Redis for atomic rate limit operations.

## References
  - references/algorithms.md — Rate Limiting Algorithms
  - references/backpressure.md — Backpressure
  - references/distributed-rate-limiting.md — Distributed Rate Limiting
  - references/implementation-patterns.md — Rate Limiting Implementation Patterns
  - references/rate-limiting-api-gateway.md — API Gateway Rate Limiting
  - references/rate-limiting-implementations.md — Rate Limiting Implementation Patterns
  - references/rate-limiting-monitoring.md — Rate Limiting Monitoring
  - references/rate-limiting-queuing.md — Request Queuing and Prioritization
## Handoff
No artifact produced unless requested.
Next skill: backend-load-testing — to verify rate limits under traffic.
Carry forward: rate limit tiers, algorithm choice, key conventions, error response format.
