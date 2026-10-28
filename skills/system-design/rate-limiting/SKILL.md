---
name: system-design-rate-limiting
description: >
  Use this skill when the user says 'rate limiting algorithm', 'token bucket', 'leaky bucket', 'sliding window', 'fixed window', 'GCRA', 'distributed rate limiter', 'Redis rate limit', '429 Too Many Requests', 'Retry-After', 'throttling design', 'quota'. Designs rate limiters at the system level: algorithm choice and trade-offs, where to enforce (edge, gateway, service), keys and limits per tenant, distributed counters in Redis with atomic Lua, client signalling, and failure behaviour. Do NOT use for: framework middleware configuration in a specific backend (use backend/universal/rate-limiting), WAF/DDoS products (use security skills), queue back-pressure inside consumers (use backend/universal/message-queue).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [system-design, rate-limiting, token-bucket, redis, api]
---

# Rate Limiting (System Design)

## Purpose
Rate limiting protects services from overload and abuse and enforces fair use between clients. The design choices are the algorithm (burst behaviour and accuracy), the key (who is limited), the enforcement point, and how a distributed limiter stays correct and fast. This skill makes those choices explicit and provides a correct Redis implementation.

## Agent Protocol

### Trigger
"rate limiting algorithm", "token bucket", "leaky bucket", "sliding window", "fixed window", "GCRA", "distributed rate limiter", "Redis rate limit", "429", "Retry-After", "quota".

### Input Context
- What is protected (API, login, expensive endpoint, downstream dependency) and why (abuse, fairness, cost)
- Identity available (API key, user, tenant, IP), traffic volume, number of gateway/service instances
- Tolerance for over/under-limiting and behaviour when the limiter store is down

### Output Artifact
Algorithm and placement decision, limit table, implementation (Lua/Redis or gateway config), client contract. No file unless requested.

### Response Format
```
Key: {tenant | user | API key | IP | route}
Limit: {rate, burst, window}
Algorithm: {token bucket | sliding window counter | GCRA | ...}
Enforcement: {edge | gateway | service | local + global}
Store: {in-memory | Redis | gateway-native}
Response: 429 + Retry-After (+ RateLimit headers)
Failure mode: {fail-open | fail-closed} because {reason}
```

## 1. Algorithms
| Algorithm | Behaviour | Memory/key | Accuracy | Use |
|-----------|-----------|-----------|----------|-----|
| Fixed window counter | count per calendar window | 1 counter | allows up to 2× limit across a window boundary | simple quotas (per day) |
| Sliding window log | timestamps of each request | O(requests) | exact | low-volume, strict limits (login attempts) |
| Sliding window counter | weighted mix of current + previous window counts | 2 counters | approximation, smooth | general API limits |
| Token bucket | tokens refill at rate r up to capacity b; request takes a token | 2 values | exact for rate+burst | APIs that allow bursts (most common) |
| Leaky bucket (queue) | requests queued and drained at constant rate | queue | smooths output | traffic shaping to a fragile downstream |
| GCRA | token bucket expressed as a "theoretical arrival time" | 1 timestamp | exact | efficient Redis implementations (e.g. redis-cell, throttled) |

Token bucket parameters: sustained rate r (tokens/s) and burst b (bucket capacity). A client idle long enough can send b requests at once, then r per second.

Sliding window counter estimate: `count = curr + prev × (1 − elapsed_in_curr / window)`.

## 2. Where to Enforce
| Layer | Good for | Notes |
|-------|----------|-------|
| CDN / edge (Cloudflare, CloudFront + WAF) | IP-based abuse, DDoS-ish floods | coarse keys; no business identity |
| API gateway (Kong, Envoy, NGINX, AWS API Gateway) | per API key/tenant quotas | central policy; Envoy global rate limit service + local limits |
| Service | business-aware limits (per account action), expensive operations | closest to cost; needs shared state across replicas |
| Client SDK | cooperative pacing | never the only line of defence |

Combine a **local** limiter per instance (cheap, absorbs spikes) with a **global** limiter for tenant quotas.

## 3. Keys and Limits
- Prefer authenticated identities (API key, tenant, user) over IP — NAT and mobile carriers put many users behind one IP, and attackers rotate IPs.
- Layer limits: per-tenant plan quota, per-user fairness inside the tenant, per-endpoint limits for expensive routes, global safety limit for the service.
- Make limits configuration, not code; publish them in API docs.

## 4. Distributed Token Bucket in Redis
Run check-and-update atomically on the server (a Lua script) and use the Redis clock so app-server clock skew does not matter.
```lua
-- KEYS[1] = bucket key, ARGV[1] = capacity, ARGV[2] = refill rate (tokens/sec), ARGV[3] = cost
local capacity = tonumber(ARGV[1])
local rate     = tonumber(ARGV[2])
local cost     = tonumber(ARGV[3])

local t   = redis.call('TIME')                         -- {seconds, microseconds}
local now = tonumber(t[1]) + tonumber(t[2]) / 1e6

local state  = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
local tokens = tonumber(state[1]) or capacity
local ts     = tonumber(state[2]) or now

tokens = math.min(capacity, tokens + math.max(0, now - ts) * rate)

local allowed = 0
local retry_after = 0
if tokens >= cost then
  tokens = tokens - cost
  allowed = 1
else
  retry_after = (cost - tokens) / rate                 -- seconds until enough tokens
end

redis.call('HSET', KEYS[1], 'tokens', tokens, 'ts', now)
redis.call('EXPIRE', KEYS[1], math.ceil(capacity / rate) + 1)   -- idle buckets disappear when full
return { allowed, tostring(tokens), tostring(retry_after) }    -- floats as strings (Lua→Redis truncates numbers)
```
- Load once with `SCRIPT LOAD` and call `EVALSHA` (or use Redis Functions on Redis 7+).
- Redis Cluster: one key per bucket, so the script is single-slot; use hash tags (`{tenant42}:rl`) if a script must touch several keys.
- Latency budget: one round trip per request; for very high QPS, batch tokens locally (lease N tokens from Redis at a time) at the cost of some accuracy.

## 5. Client Contract
- Reject with **HTTP 429 Too Many Requests** and `Retry-After` (seconds or HTTP date).
- Optionally expose remaining quota; the IETF `RateLimit` / `RateLimit-Policy` header fields are still an Internet-Draft, while many APIs use the de-facto `X-RateLimit-Limit/Remaining/Reset` headers — document whichever you emit.
- Clients retry with exponential back-off and jitter, honour `Retry-After`, and never retry in tight loops.

## 6. Failure Behaviour
- If the limiter store is unavailable: **fail open** for general API traffic (availability first, rely on local limits and autoscaling), **fail closed** for security-sensitive limits (login, OTP, password reset) where brute force is the threat.
- Monitor rejected-request rate per key and per limit; alert on sudden spikes (attack or misconfigured client) and on limiter latency.

## 7. Anti-Patterns
| Anti-pattern | Problem | Fix |
|--------------|---------|-----|
| GET-then-SET from the app | race: concurrent requests overshoot | atomic Lua / single command |
| Client-supplied timestamps | skew and abuse | Redis `TIME` or server clock |
| Fixed window only | 2× bursts at boundaries | sliding window or token bucket |
| IP-only limits on authenticated APIs | punishes shared NATs, easy to evade | identity-based keys |
| 503/500 instead of 429 | clients cannot distinguish overload policy | 429 + Retry-After |
| No per-endpoint limits on expensive routes | one route exhausts capacity | weighted cost or separate limits |

## 8. Checklist
- [ ] Limits defined per key type and endpoint, with burst values
- [ ] Algorithm chosen for burst/accuracy needs
- [ ] Atomic, server-clock implementation; keys expire
- [ ] 429 + Retry-After; client back-off documented
- [ ] Fail-open/closed decided per limit; metrics and alerts in place
