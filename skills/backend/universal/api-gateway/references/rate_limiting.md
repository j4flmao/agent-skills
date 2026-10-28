# Rate Limiting at the API Gateway

Algorithms, scopes, and concrete gateway configurations for rate limiting and quotas, plus how to communicate limits to clients.

## Purposes

| Purpose | Limit type |
|---------|-----------|
| Protect backends from overload | Global/concurrency limits per upstream |
| Fairness between tenants/clients | Per consumer, per API key, per tenant |
| Abuse prevention (credential stuffing, scraping) | Per IP / per account on sensitive routes |
| Commercial quotas | Per plan, per day/month, usually in a billing-aware system |

Rate limiting is not a substitute for capacity planning or backend load shedding; both are needed.

## Algorithms

| Algorithm | Behaviour | Trade-offs |
|-----------|-----------|-----------|
| Fixed window | Count per calendar window | Simple; allows 2x burst at window boundaries |
| Sliding window log | Store timestamps of each request | Exact; memory grows with rate |
| Sliding window counter | Weighted current + previous window | Good approximation, O(1) memory |
| Token bucket | Tokens refill at rate r up to capacity b | Allows bursts up to b, smooth average r |
| Leaky bucket / GCRA | Requests drain at fixed rate; GCRA tracks a theoretical arrival time | Smooth output, O(1) state (one timestamp) |
| Concurrency limit | Max in-flight requests | Protects slow backends regardless of rate |

Token bucket per key in Redis (atomic Lua script):

```lua
-- KEYS[1]=bucket key; ARGV: rate per sec, capacity, now (ms), cost
local rate, cap, now, cost = tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3]), tonumber(ARGV[4])
local b = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
local tokens = tonumber(b[1]) or cap
local ts = tonumber(b[2]) or now
tokens = math.min(cap, tokens + (now - ts) / 1000 * rate)
local allowed = tokens >= cost
if allowed then tokens = tokens - cost end
redis.call('HSET', KEYS[1], 'tokens', tokens, 'ts', now)
redis.call('PEXPIRE', KEYS[1], math.ceil(cap / rate * 1000) + 1000)
return { allowed and 1 or 0, tokens }
```

Pass `now` from the gateway or use `redis.call('TIME')` consistently so clock skew between gateway nodes does not distort refill.

## Local vs Global

| Mode | How | When |
|------|-----|------|
| Local (per gateway node) | In-memory counters | Overload protection; limit = global / node count (approximate) |
| Global (shared store) | Redis or a rate-limit service | Per-customer quotas that must be accurate across nodes |
| Hybrid | Local limit plus coarse global limit | High traffic where a Redis call per request is too costly |

Decide failure behaviour when the shared store is down: fail open (availability) for most APIs, fail closed for abuse-sensitive endpoints such as login.

## Choosing the Key

- Authenticated APIs: consumer ID, API key, or tenant from the validated token — not IP.
- Anonymous endpoints: client IP derived from trusted `X-Forwarded-For` hops only (configure trusted proxies), optionally combined with device fingerprint or account identifier for login.
- Expensive operations: weight requests by cost (e.g. GraphQL complexity, export endpoints cost 10 units).

## NGINX

```nginx
limit_req_zone $binary_remote_addr zone=per_ip:10m rate=10r/s;
limit_req_zone $http_x_api_key   zone=per_key:20m rate=100r/s;
limit_conn_zone $binary_remote_addr zone=conn_ip:10m;

server {
    limit_req_status 429;
    limit_conn_status 429;

    location /v1/ {
        limit_req zone=per_key burst=200 nodelay;
        limit_conn conn_ip 50;
        proxy_pass http://api;
    }
    location = /v1/login {
        limit_req zone=per_ip burst=5;
        proxy_pass http://auth;
    }
}
```

NGINX limits are per instance (shared memory across workers on one host), so a cluster of N nodes allows roughly N times the configured rate. Validate API keys before using them as a limit key; otherwise attackers rotate random keys.

## Envoy

Local limit (token bucket per Envoy instance):

```yaml
http_filters:
  - name: envoy.filters.http.local_ratelimit
    typed_config:
      "@type": type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
      stat_prefix: http_local_rate_limiter
      token_bucket: { max_tokens: 200, tokens_per_fill: 100, fill_interval: 1s }
      filter_enabled: { default_value: { numerator: 100, denominator: HUNDRED } }
      filter_enforced: { default_value: { numerator: 100, denominator: HUNDRED } }
      response_headers_to_add:
        - header: { key: x-local-rate-limit, value: "true" }
```

Global limits use `envoy.filters.http.ratelimit` calling an external rate-limit service (e.g. `envoyproxy/ratelimit` backed by Redis) with descriptors built from route `rate_limits` actions (headers, remote address, generic keys). Envoy Gateway exposes both via its `BackendTrafficPolicy` CRD.

## Kong

```yaml
plugins:
  - name: rate-limiting
    consumer: mobile-app
    config:
      second: 50
      hour: 50000
      policy: redis          # local | cluster | redis
      limit_by: consumer
      fault_tolerant: true   # fail open if Redis is unavailable
```

Configure the Redis connection under the plugin's `redis` settings for your Kong version. Kong Enterprise's `rate-limiting-advanced` adds sliding windows and namespaces.

## Communicating Limits

- Respond `429 Too Many Requests` with `Retry-After` (seconds or HTTP date).
- Expose remaining quota in headers. Many gateways emit `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`; the IETF httpapi working group is standardising `RateLimit` and `RateLimit-Policy` fields.
- Return a problem body naming the limit (`"rate_limited"`, which policy) without leaking internal topology.
- Document limits per plan; clients should back off with jitter on 429 and 503.

## Testing

- Unit test the algorithm at boundaries (exactly at limit, burst refill, window rollover).
- Load test with multiple gateway nodes to confirm global accuracy and Redis latency.
- Verify fail-open/fail-closed by stopping the shared store in staging.

## Pitfalls

- Limiting by IP behind a load balancer without trusted proxy config (everyone shares one IP).
- Limiting on unvalidated client-supplied keys.
- Fixed windows causing synchronized retry spikes at window reset.
- Separate limits at CDN, gateway, and service that conflict and confuse clients.

## Checklist

- [ ] Key chosen per route class (consumer, tenant, IP for anonymous)
- [ ] Algorithm and burst size documented
- [ ] Local vs global mode and failure behaviour decided
- [ ] 429 with `Retry-After` and quota headers
- [ ] Stricter limits on authentication and expensive endpoints
- [ ] Limits load-tested across multiple gateway nodes
