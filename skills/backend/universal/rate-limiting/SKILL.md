---
name: rate-limiting
description: >
  Use this skill when the user says 'rate limit', 'rate limiting', 'throttle requests', 'token bucket', 'leaky bucket', 'sliding window', '429 too many requests', 'API quota', 'per-user limit', 'distributed rate limiter', 'Retry-After'. Chooses a rate-limiting algorithm, key and enforcement point, and implements it (in-process or Redis-backed) with correct 429 responses and headers. Do NOT use for: overload protection inside a service such as bulkheads and circuit breakers (backend-resilience-patterns), gateway product configuration in depth (devops api-gateway skills), DDoS mitigation at the network edge.
version: "2.1.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, rate-limiting, throttling, token-bucket, redis, api]
---

# Rate Limiting

## Purpose
Protect services and enforce fair use by bounding how many requests (or how much cost) a client can consume per unit of time. Correct rate limiting needs the right algorithm, the right key (who is limited), the right enforcement point, and responses that let well-behaved clients back off.

## Agent Protocol

### Trigger
Exact user phrases: "rate limit", "rate limiting", "throttle requests", "token bucket", "leaky bucket", "sliding window", "429 too many requests", "API quota", "per-user limit", "distributed rate limiter", "Retry-After".

### Input Context
- What is being protected (whole API, expensive endpoint, login, outbound calls to a third party).
- Identity available at enforcement time (API key, user ID, tenant, IP).
- Number of instances and shared stores (Redis), gateway in front (Envoy, NGINX, Kong, cloud gateway).
- Desired limits and burst tolerance.

### Output Artifact
Limit policy table plus middleware/gateway code or config. No files unless requested.

### Response Format
```
Scope: {endpoint/group}   Key: {api_key | user_id | tenant | ip}
Algorithm: {token bucket | sliding window counter | fixed window | GCRA}
Limit: {N} per {window}, burst {B}
Store: {in-memory | Redis (Lua, atomic) | gateway}
On limit: 429 + Retry-After {s} + RateLimit headers
Fail mode if store down: {open | closed}
```

## Algorithms

| Algorithm | Behaviour | Memory/key | Bursts | Notes |
|---|---|---|---|---|
| Fixed window counter | `INCR` per window, reset at boundary | 1 counter | Up to 2x limit across a boundary | Simplest; fine for coarse quotas (per day) |
| Sliding window log | Store each request timestamp | O(limit) | Exact | Precise but memory-heavy |
| Sliding window counter | Weighted current + previous window counts | 2 counters | Approximate, smooth | Good default for "N per minute" APIs |
| Token bucket | Tokens refill at rate r up to capacity b; request spends tokens | 2 values | Allows bursts up to b | Best when bursts are acceptable; supports variable cost |
| Leaky bucket (queue) | Requests drain at fixed rate | Queue | Smooths output | NGINX `limit_req` is leaky-bucket based |
| GCRA | Token-bucket-equivalent using one timestamp (theoretical arrival time) | 1 value | Configurable | Used by redis-cell and several gateways |

Decision rules:
- Public API with per-key plans: token bucket or sliding window counter, keyed by API key.
- Login / OTP / password reset: strict fixed or sliding window keyed by account **and** by IP, plus exponential lockout.
- Calling a third-party API with a published quota: client-side token bucket that waits (not rejects) before sending.
- Expensive endpoints: cost-based token bucket (e.g. a report costs 10 tokens).

## Choosing the Key
- Prefer authenticated identity (API key, user, tenant). IP limits punish NAT/corporate users and are easily rotated by attackers; use them for unauthenticated endpoints only.
- Behind proxies, derive client IP from a trusted `X-Forwarded-For` hop configured on the proxy; never trust the header from arbitrary clients.
- Layer limits: global (protect the service) + per tenant (fairness) + per endpoint (expensive operations).

## Distributed Token Bucket (Redis + Lua)

Atomic check-and-update in one script avoids the race in "GET then SET". Using Redis `TIME` avoids clock skew between app instances.

```lua
-- token_bucket.lua  KEYS[1]=bucket key  ARGV: capacity, refill_per_sec, cost
local capacity = tonumber(ARGV[1])
local rate     = tonumber(ARGV[2])
local cost     = tonumber(ARGV[3])
local t   = redis.call('TIME')
local now = tonumber(t[1]) * 1000 + math.floor(tonumber(t[2]) / 1000)

local b      = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
local tokens = tonumber(b[1]) or capacity
local ts     = tonumber(b[2]) or now
tokens = math.min(capacity, tokens + (now - ts) / 1000 * rate)

local allowed, retry_ms = 0, 0
if tokens >= cost then
  tokens = tokens - cost
  allowed = 1
else
  retry_ms = math.ceil((cost - tokens) / rate * 1000)
end
redis.call('HSET', KEYS[1], 'tokens', tokens, 'ts', now)
redis.call('PEXPIRE', KEYS[1], math.ceil(capacity / rate * 1000) + 1000)
-- return floats as strings: Redis converts Lua numbers to integers
return { allowed, tostring(tokens), retry_ms }
```

Express middleware using ioredis:

```ts
import type { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { readFileSync } from 'node:fs';

const redis = new Redis(process.env.REDIS_URL!);
redis.defineCommand('tokenBucket', {
  numberOfKeys: 1,
  lua: readFileSync(new URL('./token_bucket.lua', import.meta.url), 'utf8'),
});

declare module 'ioredis' {
  interface RedisCommander<Context> {
    tokenBucket(key: string, capacity: number, rate: number, cost: number): Result<[number, string, number], Context>;
  }
}

export function rateLimit(opts: { capacity: number; perSecond: number; cost?: number }) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const id = (req as Request & { apiKeyId?: string }).apiKeyId ?? req.ip;
    const key = `rl:${req.baseUrl}${req.route?.path ?? req.path}:${id}`;
    try {
      const [allowed, remaining, retryMs] = await redis.tokenBucket(
        key, opts.capacity, opts.perSecond, opts.cost ?? 1,
      );
      res.setHeader('RateLimit-Policy', `${opts.capacity};w=${Math.ceil(opts.capacity / opts.perSecond)}`);
      res.setHeader('RateLimit', `limit=${opts.capacity}, remaining=${Math.floor(Number(remaining))}`);
      if (allowed === 1) return next();
      res.setHeader('Retry-After', Math.ceil(retryMs / 1000).toString());
      return res.status(429).json({ error: 'rate_limited', retry_after_ms: retryMs });
    } catch (err) {
      // Fail open: a Redis outage should not take the API down. Alert on this path.
      req.log?.error({ err, key }, 'rate limiter unavailable, allowing request');
      return next();
    }
  };
}
```

Header note: `429 Too Many Requests` is defined in RFC 6585 and `Retry-After` in RFC 9110. The `RateLimit` / `RateLimit-Policy` fields come from the IETF httpapi working-group draft and are not yet an RFC; many APIs still emit the older `X-RateLimit-Limit/Remaining/Reset`. Pick one convention and document it.

## Ready-Made Implementations

| Stack | Library / feature |
|---|---|
| Go | `golang.org/x/time/rate` (token bucket, in-process) |
| Node.js | `rate-limiter-flexible` (Redis/memory, many algorithms), `express-rate-limit`, `@fastify/rate-limit` |
| Java | Bucket4j (token bucket, Redis/Hazelcast backends), Resilience4j `RateLimiter` |
| .NET 7+ | `Microsoft.AspNetCore.RateLimiting` middleware (fixed, sliding, token bucket, concurrency limiters) |
| Python | `limits` (used by SlowAPI / Flask-Limiter) |
| Gateways | NGINX `limit_req`, Envoy local and global (external rate-limit service) filters, Kong rate-limiting plugin, cloud API gateways usage plans |

In-process limiters multiply the effective limit by the instance count; use them for per-instance protection, and a shared store or gateway for per-client quotas.

## Enforcement Points

| Layer | Pros | Cons |
|---|---|---|
| Edge / gateway | Rejects early, cheap, central | Coarse identity (may lack user/tenant) |
| App middleware | Full identity, per-endpoint cost | Request already consumed some resources |
| Inside domain logic | Business quotas (e.g. 5 exports/day) | Must be transactional with the action |
| Client side (outbound) | Respects partner quotas | Needs a shared limiter across workers |

## Failure Mode
- **Fail open** when the limiter store is down for general APIs (availability first), with alerting.
- **Fail closed** for security limits (login brute force, SMS sending cost) where abuse is worse than denial.
- Add a timeout (tens of ms) on the limiter call so a slow Redis does not add latency to every request.

## Client Behaviour
Document limits, return `Retry-After`, and require clients to back off with exponential backoff and jitter. Retrying immediately on 429 amplifies load.

## Anti-Patterns

| Anti-pattern | Fix |
|---|---|
| `GET` count, compare, `SET` in app code | Atomic `INCR`+`EXPIRE` in a pipeline/Lua, or a Lua bucket |
| Per-instance in-memory limits for paid quotas | Shared store or gateway |
| Rate limiting by IP behind a load balancer that hides client IPs | Configure trusted proxy and real-IP extraction |
| 503 or 400 for rate limiting | 429 with `Retry-After` |
| Same limit for cheap and expensive endpoints | Cost-based tokens or per-endpoint policies |
| Rate limiting as the only overload protection | Also use concurrency limits, timeouts, load shedding |

## Checklist
- [ ] Policies documented: scope, key, algorithm, limit, burst.
- [ ] Atomic implementation in a shared store for multi-instance quotas.
- [ ] 429 + `Retry-After` + rate-limit headers returned.
- [ ] Explicit fail-open/closed decision per policy, with limiter timeout.
- [ ] Metrics: allowed/denied per policy and key class; alerts on limiter errors.
- [ ] Login and other abuse-prone endpoints have stricter, multi-key limits.

## References
- [Algorithms](references/algorithms.md)
- [Distributed rate limiting](references/distributed-rate-limiting.md)
- [Implementation patterns](references/implementation-patterns.md)
- [Implementations by language](references/rate-limiting-implementations.md)
- [API gateway rate limiting](references/rate-limiting-api-gateway.md)
- [Queuing and prioritization](references/rate-limiting-queuing.md)
- [Backpressure](references/backpressure.md)
- [Monitoring](references/rate-limiting-monitoring.md)
