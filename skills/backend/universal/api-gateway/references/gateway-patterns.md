# API Gateway Patterns

## 1. Routing Patterns

### Path-Based Routing
```
Request URI          → Upstream Service
/api/users/*         → user-service:8080
/api/orders/*        → order-service:8080
/api/payments/*      → payment-service:8080
/api/v2/*            → order-service-v2:8080
/health              → health-service:8080
```

### Header-Based Routing
```
X-Version: v2        → route to canary upstream
X-Region: eu         → route to EU cluster
X-Beta: true         → route to feature-flag service
Cookie: experiment=A → route to A variant
Accept: version=2    → route to v2 API
```

### Host-Based Routing
```
api.example.com      → public-api
admin.example.com    → admin-api
internal.example.com → internal-api (restricted network)
eu-api.example.com   → eu-cluster (geo-routing)
```

### Method-Based Routing
```
GET  /api/orders     → read replica / cache
POST /api/orders     → primary (write) service
DELETE /api/orders   → authorization check → primary service
```

### Weight-Based Routing
```
90% traffic → v1 (stable)
10% traffic → v2 (canary)

Split criteria:
  - Random: simple percentage split
  - Hash: consistent hash (user_id, session_id) → sticky session
  - Header: explicit opt-in via X-Canary header
```

### Query-Based Routing
```
/api/search?provider=aws       → aws-search-service
/api/search?provider=gcp       → gcp-search-service
/api/search?provider=internal  → internal-search-service
```

### Geo-Routing
```
Client IP → geo lookup → nearest region cluster
  EU clients  → eu-west-1 cluster
  US clients  → us-east-1 cluster
  APAC clients → ap-southeast-1 cluster
Fallback: if region cluster unhealthy → route to next closest
```

## 2. Aggregation Patterns

### Parallel Aggregation
```
GET /api/dashboard → fan-out in parallel:
  user-service/profile       (200ms)
  order-service/recent       (300ms)
  payment-service/methods    (150ms)
  notification-service/count (100ms)
Total: ~300ms (max of all, not sum)

Gateway merges:
{
  "user": { ... },
  "orders": [...],
  "paymentMethods": [...],
  "notificationCount": 5
}
```

### Sequential Aggregation
```
POST /api/checkout:
  1. order-service/create     → get orderId
  2. payment-service/charge   → use orderId
  3. inventory-service/reserve → use orderId
  4. notification-service/send → on success

Total: sum of all (sequential chain)
```

### Fan-Out First
```
GET /api/search → fan-out to all search providers:
  Return partial results as each responds
  First response: 500ms
  Full response: 2000ms

Gateway sends chunked response:
  {"results": [...], "provider": "elasticsearch", "complete": false}
  {"results": [...], "provider": "algolia", "complete": true}
```

### Priority Merge
```
GET /api/user-dashboard:
  Critical (must have):
    user-service/profile
    auth-service/permissions
  Optional (best effort, 500ms timeout):
    recommendation-service/suggestions
    analytics-service/insights

If optional times out → response without optional data + warning header
```

## 3. Backend for Frontend (BFF) Patterns

### Client-Type BFF
```
/mobile/*  → mobile-bff
  - Smaller payloads (field selection)
  - Pagination (cursor-based, not offset)
  - Token refresh auth
  - Image resizing (thumbnails)
  - Offline-first response shape

/web/*     → web-bff
  - Full payload (eager loading)
  - Session cookie auth
  - SEO metadata
  - SSR-compatible responses

/partner/* → partner-bff
  - Bulk format (CSV, NDJSON)
  - API key auth (long-lived)
  - Webhook-style responses
  - Rate limited lower

/public/*  → public-bff
  - No auth (public data)
  - Heavy caching (CDN + gateway)
  - Throttled (anonymous rate limits)
  - READ-only operations
```

### Entity-Specific BFF
```
/user-bff     → user-service domain
  /user-bff/profile
  /user-bff/settings
  /user-bff/preferences

/order-bff    → order-service domain
  /order-bff/cart
  /order-bff/history
  /order-bff/tracking
```

### BFF Granularity Guide
```
Too fine:   1 BFF per page → N BFFs, maintenance nightmare
Too coarse: 1 BFF for all → tight coupling, massive deploys
Right:      1 BFF per client type (mobile, web, partner, public API)
```

## 4. Gateway Offloading Patterns

| Concern | Gateway Handles | Upstream Benefit |
|---|---|---|
| **TLS termination** | Certificate mgmt, HTTPS | Plain HTTP, no cert mgmt |
| **Authentication** | JWT verify, OAuth2 exchange | User context via headers |
| **Authorization** | RBAC, scope check | Trusted user context only |
| **Rate limiting** | Per-client counters | Clean traffic |
| **Request validation** | Schema, size, method | Trusts all requests |
| **CORS** | Preflight, headers | No CORS middleware |
| **Response caching** | GET cache, ETags | Reduced load |
| **Logging** | JSON structured logging | No logging infra |
| **Metrics** | RED metrics | No metrics code |
| **Request transform** | Header injection, body | Business logic only |
| **Response transform** | Field filtering, envelope | Consistent format |
| **Error formatting** | Standard error JSON | Returns errors consistently |
| **Compression** | gzip, brotli | Raw response |
| **GraphQL** | Query parse, validation, batching | Simple REST APIs |

## 5. Security Patterns

### Authentication Methods
```
JWT:
  - Gateway verifies: signature, expiry (exp), not before (nbf), issuer (iss)
  - Passes: X-User-ID, X-User-Roles, X-User-Email headers upstream
  - Rotation: JWKS endpoint for key rotation

OAuth2:
  - Gateway handles: authorization code flow, token exchange, refresh
  - Validates: access token, scopes, client_id
  - Rate limits: per client_id (consumer)

API Key:
  - Gateway looks up: key → consumer → rate limit tier
  - Supports: header (X-API-Key), query param (apikey), cookie
  - Rotation: key expiration, revoke on leak

mTLS:
  - Gateway validates: client certificate chain, SAN, expiration
  - Extracts: CN → X-Client-CN header
  - Requires: trusted CA bundle

SAML/OIDC:
  - Gateway acts as: SP (Service Provider)
  - Redirects to: IdP for login
  - Passes: SAML assertion / ID token as header
```

### Authorization Patterns
```
RBAC at Gateway:
  Route: /api/admin/users DELETE requires role: admin
  Route: /api/orders GET requires role: user or admin
  Route: /api/public GET no auth

Scope-Based:
  OAuth2 scope: read:orders → GET /api/orders
  OAuth2 scope: write:orders → POST/PUT/DELETE /api/orders
  OAuth2 scope: admin → all routes

Network ACL:
  /api/admin/*  allow 10.0.0.0/8, 172.16.0.0/12
  /api/internal/* allow VPN IPs only
  /api/public/* allow all

Rate Limit Tiers:
  free tier:      10 req/min
  pro tier:       1000 req/min
  enterprise:     10000 req/min
  internal:       50000 req/min
```

### WAF Rules
```
SQL Injection:   Block requests with SQL patterns in query/body
XSS:             Block script tags, event handlers in params
Path traversal:  Block ../, ~, // in URL path
Command injection: Block shell metacharacters
L7 DDoS:         Rate limit per IP, per user-agent, per session
```

## 6. Rate Limiting Strategies

### Tiers
| Tier | Rate | Burst | Scope | Response |
|---|---|---|---|---|
| Free | 10 req/min | 20 | API key | 429 + Retry-After: 5 |
| Pro | 1000 req/min | 2000 | API key | X-RateLimit-* headers |
| Enterprise | 10000 req/min | 20000 | API key | X-RateLimit-* headers |
| Global | 50000 req/min | 100000 | Cluster-wide | 429 if exceeded |

### Distributed Rate Limiting
```
Single node:  in-memory counters, fastest, no coordination
Multi node:   Redis (atomic Lua script)
              - INCR + EXPIRE for fixed window
              - Sorted set for sliding window
              - +1-5ms latency per request

Strategies:
  Token bucket:  tokens refilled at rate, burst = bucket size
  Sliding window: request log per window, O(log N) per request
  Fixed window:  counter per window, boundary spike issue
  GCRA:          Generic cell rate algorithm, fair and efficient
```

## 7. Caching Strategies

### Response Caching
```
Cacheable:
  GET / HEAD requests
    - 200 OK, 301, 404
    - Content-Type: application/json, text/plain
    - TTL: 30-60s for dynamic, 5-60min for static

Not cacheable:
  POST / PUT / DELETE / PATCH
  Requests with Authorization header
  Requests with Cookie header
  Responses with Cache-Control: no-cache, no-store

Cache key: method + host + URI + query params:
  "$request_method$host$request_uri$query_string"
```

### Cache Invalidation
```
1. TTL expiry: automatic after cache_ttl seconds
2. Admin purge: POST /cache/purge { path: "/api/users" }
3. Pattern purge: DELETE /cache?pattern=/api/users/*
4. Header-based: upstream returns Cache-Control: no-cache
5. ETag/If-None-Match: conditional requests
```

### Stale Cache (Serving Stale)
```
Serving stale while revalidating:
  - Cache hit (stale) → return stale data + Age header
  - Background fetch upstream → update cache
  - Upstream fails → keep serving stale (grace period)

Use cases:
  - Upstream timeout → serve stale
  - Upstream 5xx → serve stale
  - Upstream unreachable → serve stale (circuit breaker)
```

## 8. Circuit Breaker Pattern

### State Machine
```
Closed (normal):
  - All requests pass through
  - Track failures: count, rate, latency
  - Threshold: N failures in M seconds → open

Open (failing):
  - All requests rejected immediately (503)
  - Duration: open for X seconds → half-open

Half-Open (probing):
  - Limited requests allowed (e.g., 3)
  - If all succeed → closed
  - If any fails → open again
```

### Configuration
```json
{
  "circuitBreaker": {
    "upstream": "order-service",
    "failureThreshold": 5,
    "failureWindowMs": 30000,
    "openDurationMs": 60000,
    "halfOpenMaxRequests": 3,
    "successThreshold": 3,
    "trackedFailures": ["5xx", "timeout", "connection_refused"]
  }
}
```

### Fallback Strategies
```
Circuit open → try one of:
  1. Serve stale cache (with warning header)
  2. Return degraded response: { "error": "service unavailable", "degraded": true }
  3. Route to secondary (DR region, read-only replica)
  4. Return 503 with Retry-After: 60
```

## 9. Canary / Blue-Green / A/B Testing

### Canary Release
```
v1 (stable): 90%
v2 (canary): 10%

Promotion criteria (all must pass):
  - Error rate v2 <= v1 * 1.1
  - Latency p99 v2 <= v1 * 1.2
  - No P0/P1 alerts from v2
  - Minimum observation: 30min

Progression: 5% → 10% → 25% → 50% → 100%
Rollback: any metric threshold exceeded → immediate 100% to v1
```

### Blue-Green Deployment
```
blue:  current production (v1)
green: new version (v2)

Switch: update gateway upstream from blue → green
Rollback: switch back green → blue (instant)
```

### A/B Testing
```
Variant A: control (50%)
Variant B: test (50%)
  - Different UI behavior
  - Different algorithm
  - Different response format

Sticky session: hash based on user_id or session_id
Metrics: compare conversion, engagement, error rate
Duration: 1-4 weeks → analyze → promote or discard
```

## 10. API Versioning Strategies

| Strategy | Example | Pros | Cons |
|---|---|---|---|
| **URI path** | `/api/v1/users`, `/api/v2/users` | Simple, explicit, cacheable | URL pollution, code duplication |
| **Header** | `Accept: application/vnd.api.v2+json` | Clean URLs, semantic | Client complexity, cache invalidation |
| **Query param** | `/api/users?version=2` | Easy to test, simple | Cache poisoning, not RESTful |
| **Hostname** | `v2.api.example.com` | Complete isolation | DNS/cert mgmt, duplicated infra |
| **Content negotiation** | `Content-Type: application/vnd.api+json;version=2` | RESTful, clean | Tooling support limited |

### Sunset Flow
```
1. Deploy v2 alongside v1
2. Add Sunset header to v1:
   Sunset: Sat, 01 Nov 2026 00:00:00 GMT
   Deprecation: true
   Link: </api/v2/users>; rel="successor-version"
3. Monitor v1 traffic (track deprecated usage)
4. Notify clients (email, dashboard, API response warning)
5. Sunset date → v1 returns 410 Gone
6. Remove v1 routes from gateway
```

## 11. Protocol Transformation

### REST → gRPC Transcoding
```
Client sends:  POST /api/users { "name": "John", "email": "john@x.com" }
Gateway converts to gRPC:
  protobuf: CreateUserRequest { name: "John", email: "john@x.com" }
  service:  user.UserService/CreateUser
Gateway converts response back to JSON

Supported by: Envoy (gRPC-JSON transcoder), Kong (grpc-gateway), NGINX (grpc_pass)
```

### HTTP → WebSocket Upgrade
```
Client sends: GET /ws/chat with Upgrade: websocket
Gateway:
  1. Authenticates via Authorization header
  2. Upgrades connection to WebSocket
  3. Proxies to ws://chat.internal:8080

Configuration: proxy_set_header Upgrade $http_upgrade;
               proxy_set_header Connection "upgrade";
               proxy_read_timeout 3600s;
```

### GraphQL Federation
```
Client sends: POST /graphql { query: "..." }
Gateway:
  1. Parses GraphQL query
  2. Routes sub-queries to appropriate services:
     - user service → user fields
     - order service → order fields
     - payment service → payment fields
  3. Merges responses into single GraphQL response

Supported by: Apollo Federation, Envoy (gRPC), Kong (graphql plugin), APISIX (graphql plugin)
```

## 12. Observability Patterns

### RED Metrics
```
Rate:     http_requests_total{route, method, status}
Errors:   http_requests_total{status=~"5.."}
Duration: http_request_duration_seconds_bucket{route, method}

Gateway metrics:
  gateway_requests_total{route, method, status}
  gateway_request_duration_seconds{route}
  gateway_upstream_healthy{upstream}
  gateway_cache_hit_total{route}
  gateway_rate_limit_exceeded_total{consumer}
```

### Structured Logging
```json
{
  "time": "2026-05-21T10:00:00Z",
  "method": "GET",
  "path": "/api/users",
  "status": 200,
  "latency_ms": 45,
  "upstream_latency_ms": 40,
  "client_ip": "203.0.113.5",
  "user_agent": "Mozilla/5.0...",
  "request_id": "req-abc123",
  "user_id": "user-456",
  "upstream": "user-service:8080",
  "cache_hit": true,
  "rate_limited": false
}
```

### Distributed Tracing
```
Gateway creates trace context (x-request-id, traceparent):
  - Passes trace context to all upstreams
  - Creates span for each upstream call
  - Records: DNS lookup, connect, TLS handshake, request, response

W3C Trace Context:
  traceparent: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01
  tracestate: kong=12345
```

## 13. Error Handling Patterns

### Standard Error Response
```json
// 400 Bad Request
{ "error": { "code": "VALIDATION_ERROR", "message": "Invalid request body", "details": [{ "field": "email", "reason": "invalid format" }] } }

// 401 Unauthorized
{ "error": { "code": "UNAUTHORIZED", "message": "Missing or invalid authorization" } }

// 403 Forbidden
{ "error": { "code": "FORBIDDEN", "message": "Insufficient permissions" } }

// 429 Rate Limited
{ "error": { "code": "RATE_LIMITED", "message": "Rate limit exceeded", "retryAfter": 5 } }

// 502 Bad Gateway
{ "error": { "code": "UPSTREAM_ERROR", "message": "Upstream service unavailable" } }

// 503 Service Unavailable
{ "error": { "code": "CIRCUIT_OPEN", "message": "Service temporarily unavailable", "retryAfter": 60 } }
```

### Error Scenarios
```
Timeout:
  Gateway returns 504 Gateway Timeout
  Log: upstream timeout {upstream} after {timeout}s

Upstream 5xx:
  Gateway returns 502 Bad Gateway
  Circuit breaker counts failure

Upstream unreachable:
  Gateway returns 502 Bad Gateway
  Circuit breaker opens immediately

Rate limited:
  Gateway returns 429 Too Many Requests
  Headers: Retry-After, X-RateLimit-*

Validation failed:
  Gateway returns 400 Bad Request
  Details: which field, what rule violated
```

### Retry Strategy
```
Idempotent methods (GET, PUT, DELETE, HEAD, OPTIONS):
  Max retries: 2
  Backoff: 100ms, 500ms
  Total timeout: 10s

Non-idempotent methods (POST, PATCH):
  No automatic retry
  Return error to client

On retryable failure (connection error, timeout):
  Retry on different upstream instance
  Max retries: 2
  Circuit breaker: no retry if circuit open
```

## 14. Security Headers

```
Strict-Transport-Security: max-age=63072000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 0
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'
Permissions-Policy: geolocation=(), microphone=(), camera=()
Cache-Control: no-store (for auth responses)
```
