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

## Implementation Patterns

### Token Bucket Rate Limiter

```python
import time
import redis
from typing import Optional

class TokenBucketRateLimiter:
    def __init__(self, redis_client: redis.Redis, key_prefix: str = "rate_limit"):
        self.redis = redis_client
        self.key_prefix = key_prefix

    def check(self, key: str, max_burst: int, refill_rate: float, tokens: int = 1) -> bool:
        cache_key = f"{self.key_prefix}:{key}"
        now = time.time()

        allowed = self._check_lua(cache_key, max_burst, refill_rate, now, tokens)
        return allowed

    def _check_lua(self, key: str, max_burst: int, refill_rate: float, now: float, tokens: int) -> bool:
        lua_script = """
        local key = KEYS[1]
        local max_burst = tonumber(ARGV[1])
        local refill_rate = tonumber(ARGV[2])
        local now = tonumber(ARGV[3])
        local tokens_needed = tonumber(ARGV[4])

        local bucket = redis.call("HMGET", key, "tokens", "last_refill")
        local tokens = tonumber(bucket[1] or max_burst)
        local last_refill = tonumber(bucket[2] or now)

        local elapsed = math.max(0, now - last_refill)
        local refill = math.min(max_burst, tokens + elapsed * refill_rate)

        if refill >= tokens_needed then
            local new_tokens = refill - tokens_needed
            redis.call("HMSET", key, "tokens", new_tokens, "last_refill", now)
            redis.call("EXPIRE", key, 60)
            return 1
        else
            redis.call("HMSET", key, "tokens", refill, "last_refill", now)
            redis.call("EXPIRE", key, 60)
            return 0
        end
        """
        return bool(self.redis.eval(lua_script, 1, key, max_burst, refill_rate, now, tokens))
```

## Architecture Decision Trees

### Algorithm Selection

```
What's the traffic pattern?
├── Steady, predictable traffic
│   └── Token Bucket
│       ├── Smooths traffic, allows bursts
│       └── Good for APIs with occasional spikes
│
├── Strict per-second limits
│   └── Sliding Window Log
│       ├── Prevent abuse (login, signup)
│       └── Most accurate, most memory
│
├── Simple, low-traffic
│   └── Fixed Window
│       └── Simple but allows burst at window boundary
│
└── Need both rate and concurrency limits
    └── Token Bucket + Semaphore
```

## Anti-Patterns

| Anti-Pattern | Why It Fails | Correct Approach |
|---|---|---|
| In-memory rate limiting for multi-node | Each node has different state | Use Redis for distributed rate limiting |
| No Retry-After header | Clients can't implement backoff | Always include Retry-After with 429 |
| Same limit for all endpoints | Heavy endpoints crash under normal load | Per-endpoint limits based on cost |
| No burst allowance | Perfectly valid traffic gets rejected | Allow 2-5x burst over sustained rate |
| Global limit only | Single user can exhaust all capacity | Per-user + per-endpoint + global limits |

## Performance Optimization

- **Redis pipelining for batch checks**: Pipeline rate limit checks for requests that hit multiple rate limits. Reduces round-trips from N to 1. Each check is a fast O(1) Lua script.
- **Local cache for low-rate limits**: Cache rate limit state in local memory for limits with low refill rates (>1s). Write-through to Redis for global consistency. Invalidate on refill event.
## Implementation Patterns

### Observer Pattern for Event Handling
`
interface EventObserver<T> {
  onEvent(event: T): Promise<void>;
}

class EventBus<T> {
  private observers: Set<EventObserver<T>> = new Set();
  subscribe(observer: EventObserver<T>): void {
    this.observers.add(observer);
  }
  unsubscribe(observer: EventObserver<T>): void {
    this.observers.delete(observer);
  }
  async emit(event: T): Promise<void> {
    const results = Array.from(this.observers).map(o => o.onEvent(event));
    await Promise.allSettled(results);
  }
}
`

### Configuration-Driven Approach
`
config:
  defaults:
    timeout: 30s
    retryCount: 3
  overrides:
    production:
      timeout: 60s
      retryCount: 5
    development:
      timeout: 300s
      retryCount: 1
`

## Production Considerations

### Deployment Checklist
- [ ] Configuration validated against schema before startup
- [ ] Health check endpoints registered and monitored
- [ ] Graceful shutdown with draining period (30s timeout)
- [ ] Resource limits configured (CPU, memory, file descriptors)
- [ ] Log level set appropriate for environment
- [ ] Metrics endpoint secured and exposed
- [ ] Rate limiting configured per-tier
- [ ] TLS certificates valid and auto-renewing
- [ ] Database migrations run as separate deployment step
- [ ] Feature flags ready for gradual rollout

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% over 5min | Critical | Page on-call |
| p99 latency | > 2s over 5min | Warning | Investigate |
| Throughput drop | > 50% over 1min | Critical | Check upstream |
| Queue depth | > 1000 over 1min | Warning | Scale consumers |
| Disk usage | > 85% | Warning | Clean or expand |
| Memory usage | > 90% heap | Critical | Restart or scale |

## Anti-Patterns

| Anti-Pattern | Symptom | Root Cause | Solution |
|-------------|---------|------------|----------|
| Premature optimization | Complex code for no measured benefit | Guessing instead of profiling | Measure first, optimize based on data |
| Copy-paste reuse | Duplicate code across codebase | Lack of abstraction | Extract shared logic into libraries |
| Gold-plating | Features with no current requirement | Over-engineering | YAGNI — build what's needed now |
| Magical thinking | Assumptions without validation | Skipping error handling | Handle all failure modes explicitly |

## Performance Optimization

### Caching Strategy
Cache hierarchy: L1 (in-memory local) → L2 (distributed Redis/Memcached) → L3 (CDN/Edge).
Cache invalidation: TTL-based (simple, stale), event-based (complex, fresh), write-through (consistent, higher write latency), write-behind (fast writes, eventual consistency).

### Resource Pooling
- Database connections: Pool of reusable connections (HikariCP, pgBouncer)
- HTTP connections: Keep-alive + connection pooling for external calls
- Thread pool: Bounded thread pools for async task execution

### Profiling Methodology
1. Establish baseline with production traffic profile
2. Profile CPU with sampling profiler (pprof, perf, async-profiler)
3. Profile memory with heap dumps and allocation tracking
4. Profile I/O with strace/perf trace for syscall analysis
5. Profile latency with distributed tracing (OpenTelemetry)
6. Identify bottleneck, formulate hypothesis, implement fix
7. Re-profile to verify improvement, repeat

## Security Considerations

### Threat Modeling (STRIDE)
- Spoofing: Identity validation, authentication
- Tampering: Integrity checks, digital signatures
- Repudiation: Audit logs, non-repudiation
- Information disclosure: Encryption, access control
- Denial of service: Rate limiting, resource quotas
- Elevation of privilege: Principle of least privilege

### Supply Chain Security
- Dependency scanning: Snyk, Dependabot, Trivy
- SBOM generation: CycloneDX or SPDX format
- Signed commits: GPG or SSH commit signing
- Artifact verification: Checksum validation, signature verification

### Secrets Management
- Secrets never in code — always in secrets manager (Vault, AWS Secrets Manager)
- Rotation policy: Rotate database credentials every 90 days
- Access audit: Log every secrets access, alert on anomalies
- Encryption at rest and in transit for all secrets
- Principle of least privilege: each service gets only its own secrets

## Rules
- Default-deny security posture — allow only explicitly required access.
- All inputs validated, all outputs encoded, all errors handled.
- Defend in depth — multiple layers of security controls.
- Fail securely — errors default to safe behavior.
- Log security-relevant events for audit and investigation.
- Keep dependencies updated — automate vulnerability scanning.
- Design for observability from day one, not as an afterthought.
- Document all architectural decisions with rationale.
- Review code for security, performance, and correctness before merging.