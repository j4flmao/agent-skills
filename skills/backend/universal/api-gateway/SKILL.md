---
name: backend-api-gateway
description: >
  Use this skill when the user says 'API gateway', 'Kong', 'NGINX', 'AWS API
  Gateway', 'Azure API Management', 'Google Cloud API Gateway', 'Apigee',
  'Apache APISIX', 'Tyk', 'KrakenD', 'Envoy gateway', 'Spring Cloud Gateway',
  'Traefik', 'HAProxy', 'Zuul', 'Express Gateway', 'gateway pattern', 'BFF',
  'Backend for Frontend', 'gateway aggregation', 'API composition', 'API proxy',
  'reverse proxy', 'edge gateway', 'service mesh gateway', 'gateway routing',
  'gateway auth', 'gateway rate limit', 'gateway caching', 'canary gateway',
  'blue-green gateway', 'API versioning gateway', 'protocol transformation',
  'REST to gRPC', 'graphql gateway', 'federation gateway'.
  Covers: Kong, NGINX/OpenResty, AWS API Gateway, Azure API Management, GCP API
  Gateway/Apigee, Apache APISIX, Tyk, KrakenD, Envoy, Spring Cloud Gateway,
  Traefik, HAProxy. Gateway patterns: routing, aggregation, BFF, offloading,
  security, rate limiting, caching, circuit breaker, canary, blue-green, A/B
  testing, API versioning, protocol transformation, request/response
  transformation, observability, error handling, resilience, deployment models,
  multi-cloud, service mesh integration.
  Do NOT use for: service mesh sidecar proxies (use Istio sidecar), load
  balancer only, application-level auth (use auth-patterns), DNS-level routing.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, api-gateway, universal, phase-6]
---

# API Gateway

## Purpose
Design and configure API gateways for routing, aggregation, authentication, rate limiting, caching, traffic management, protocol translation, and resilience. Every gateway enforces consistent security, observability, and governance policies.

## Agent Protocol

### Trigger
Exact user phrases: "API gateway", "Kong", "NGINX gateway", "AWS API Gateway", "Azure API Management", "Apigee", "APISIX", "Tyk", "KrakenD", "Envoy gateway", "Spring Cloud Gateway", "Traefik", "HAProxy", "gateway pattern", "BFF", "gateway aggregation", "reverse proxy", "API proxy", "gateway auth", "gateway rate limit", "canary gateway", "API versioning gateway", "protocol transformation", "gateway selection".

### Input Context
Before activating, verify:
- Gateway providers under consideration.
- Backend services and their endpoints.
- Authentication method (JWT, OAuth2, API key, mTLS, SAML).
- Traffic volume and throughput requirements.
- Deployment model (Kubernetes, VM, serverless, hybrid).
- Required gateway features (routing, auth, rate limiting, caching, transformation, protocol translation, observability).
- Existing infrastructure (cloud provider, VPC, TLS, DNS).

### Output Artifact
Gateway configuration files (YAML/JSON/nginx.conf/envoy.yaml). No extraneous explanation.

### Response Format
Gateway configuration with no preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output.

### Completion Criteria
- [ ] Gateway provider and deployment model selected with rationale.
- [ ] Route definitions configured for all backend services.
- [ ] Authentication/authorization enforced at gateway.
- [ ] Rate limiting configured with per-client tiers.
- [ ] TLS termination and upstream protocols configured.
- [ ] Logging, metrics, and tracing instrumentation configured.
- [ ] Error handling (timeout, retry, circuit breaker, fallback) configured.
- [ ] CORS, request validation, and security headers configured.

### Max Response Length
Direct config output. No response text.

## Architecture Decision Trees

### Gateway Provider Selection
```
What is the primary deployment platform?
├── Kubernetes / Cloud-native
│   ├── Need service mesh integration?
│   │   ├── Yes → Envoy + Istio
│   │   └── No → Kong or APISIX (K8s ingress controllers)
│   └── Need simple edge routing?
│       └── Traefik (auto-service discovery, Let's Encrypt)
├── AWS-native
│   ├── Lambda backends? → AWS API Gateway
│   ├── ECS/EKS + microservices? → Kong or ALB + API Gateway
│   └── Enterprise API program? → Apigee
├── Azure-native
│   └── Azure API Management
├── Java/Spring Boot
│   └── Spring Cloud Gateway
└── High-throughput edge proxy
    ├── Extreme performance (L4) → HAProxy
    └── Custom logic (L7) → NGINX + Lua
```

### Gateway Architecture Pattern
```
Single gateway for all traffic?
├── Yes → Is the API surface small (<20 endpoints)?
│   ├── Yes → Single gateway, simple, easy to manage
│   └── No → Consider splitting into domain gateways
└── No → Per-client BFF gateways?
    ├── Yes → Separate BFF per client type (web, mobile, partner)
    └── No → Per-domain gateways (orders-api, users-api)
```

## Gateway Type Selection

| Provider | Type | Strengths | Best For |
|---|---|---|---|
| **Kong** | Proxy + Plugin | Rich plugin ecosystem, DB-less mode, K8s ingress | General purpose, enterprise API management |
| **NGINX/OpenResty** | Reverse proxy | Performance, mature, Lua scripting | High-throughput, custom logic, edge proxy |
| **AWS API Gateway** | Managed | Serverless integration, Cognito, WAF, usage plans | AWS-native, Lambda backends |
| **Azure API Management** | Managed | Azure AD, policies, developer portal | Azure ecosystem, enterprise governance |
| **GCP Apigee** | Managed | Analytics, monetization, developer portal | Enterprise API program, GCP-native |
| **Apache APISIX** | Proxy + Plugin | Low latency, hot-reload plugins, K8s ingress | High performance, open-source, multi-cloud |
| **Tyk** | Proxy + Plugin | Multi-cloud, analytics, portal, MDCB | Hybrid/multi-cloud API management |
| **KrakenD** | Proxy | Static config, no plugins, ultra-low latency | Aggregation API, BFF, performance-critical |
| **Envoy** | Proxy (L7) | Service mesh native, xDS, WASM, observability | Service mesh, cloud-native, gRPC, advanced L7 |
| **Spring Cloud Gateway** | Proxy (Reactive) | Java ecosystem, Spring Security, WebFlux | Java/Spring Boot microservices |
| **Traefik** | Reverse proxy | Auto-service discovery, Let's Encrypt, K8s native | Edge router, K8s ingress, simple setup |
| **HAProxy** | Reverse proxy (L4/L7) | Extreme performance, TCP/UDP, health checks | High-throughput TCP/HTTP, load balancing |

## Core Patterns

### Gateway Routing
```
path-based:     /api/users/*  → user-service
                /api/orders/* → order-service
header-based:   X-Version: v2 → order-service-v2
                X-Region: eu  → eu-cluster
host-based:     api.example.com → public-api
                admin.example.com → admin-api
query-based:    /api/search?provider=aws → aws-search-service
method-based:   GET /api/users → read replica
                POST /api/users → primary DB
weight-based:   90% → v1, 10% → v2 (canary)
```

### Gateway Aggregation
```
/client/dashboard →
  parallel: user-service/profile + order-service/recent + payment-service/methods
  merge → single response

Merge strategies:
  parallel:      all upstreams independent, fastest
  sequential:    B depends on A response
  fan-out-first: return partial results as they arrive
  priority:      critical data first, optional appended
```

### Backend for Frontend (BFF)
```
/mobile/* → mobile-bff  → smaller payload, paginated, mobile auth
/web/*    → web-bff     → full payload, session cookie auth
/partner/* → partner-bff → bulk format, API key auth
/public/* → public-bff  → rate-limited, no auth, cached
```

### Gateway Offloading
```
TLS termination       → upstream HTTP only
Authentication        → upstream gets user context headers
Rate limiting         → upstream gets X-RateLimit-* headers
Request validation    → invalid requests rejected before upstream
Response caching      → cache hit returns before upstream
Request transformation → header injection, body transform
Logging / metrics     → structured logs + RED metrics
CORS handling         → preflight + header injection
```

### Protocol Transformation
```
REST → gRPC:   HTTP/1.1 JSON → gRPC protobuf (transcoding)
HTTP → WS:     REST endpoint → WebSocket upstream
SOAP → REST:   SOAP XML → REST JSON
GraphQL:       Single /graphql endpoint → federated services
```

### Security Patterns
```
Authentication:
  JWT validation     → verify signature, expiry, claims at edge
  OAuth2             → authorization code, client credentials, password grant
  API Key            → key lookup, rate limiting per key
  mTLS               → client certificate validation
  SAML/OIDC          → federation with identity provider
  Basic Auth         → legacy support (avoid if possible)

Authorization:
  RBAC at gateway    → route + method access based on role
  Scope-based        → OAuth2 scopes mapped to routes
  IP whitelist/blacklist → network-level access control
  WAF                → OWASP rules, SQL injection, XSS prevention
```

### Resilience Patterns
```
Circuit breaker:    5 failures/30s → open circuit 60s → half-open
Retry:              idempotent GET: 2 retries, backoff 100ms/500ms
Timeout:            connect 5s, read 10s, upstream timeout 30s
Bulkhead:           max 100 concurrent requests per upstream
Rate limiting:      per client/IP/endpoint tiers
Fallback:           stale cache, degraded response, secondary upstream
Health checking:    active (probe every 10s) + passive (track failures)
```

### Deployment Patterns
```
Edge gateway:       closest to client, TLS termination, CDN integration
Sidecar gateway:    per-service gateway (service mesh)
Embedded gateway:   gateway embedded in app process
Centralized:        shared gateway cluster for all services
Multi-cloud:        active-active gateways across cloud providers
Hybrid:             on-prem gateway → cloud upstreams
```

## Implementation Patterns

### Pattern: Custom Auth Plugin (Kong)
```lua
-- Kong custom authentication plugin
local BasePlugin = require "kong.plugins.base_plugin"

local CustomAuthHandler = BasePlugin:extend()

CustomAuthHandler.PRIORITY = 1000
CustomAuthHandler.VERSION = "1.0.0"

function CustomAuthHandler:new()
  CustomAuthHandler.super.new(self, "custom-auth")
end

function CustomAuthHandler:access(conf)
  CustomAuthHandler.super.access(self)

  local api_key = kong.request.get_header("X-API-Key")
  if not api_key then
    return kong.response.exit(401, {
      error = { code = "UNAUTHORIZED", message = "Missing API key" }
    })
  end

  local consumer = kong.client.load_consumer_by_id(api_key)
  if not consumer then
    return kong.response.exit(403, {
      error = { code = "FORBIDDEN", message = "Invalid API key" }
    })
  end

  kong.client.authenticate(consumer, nil)
end

return CustomAuthHandler
```

### Pattern: Dynamic Routing (Envoy WASM)
```typescript
// Envoy WASM filter for dynamic routing
import { RootContext, HttpContext, RootContextHelper, HttpContextHelper } from "@envoy/envoy-wasm";

class DynamicRouterHttpContext extends HttpContext {
  onHttpRequestHeaders(numHeaders: number): number {
    const path = this.getHttpRequestHeader(":path") || "";
    const version = this.getHttpRequestHeader("x-api-version") || "v1";

    if (version === "v2" && path.startsWith("/api/users")) {
      this.addHttpRequestHeader("x-upstream-cluster", "user-service-v2");
    }

    // Region-based routing
    const region = this.getHttpRequestHeader("x-region") || "us-east";
    this.setHttpRequestHeader("x-region-routed", region);

    return 0; // Continue processing
  }
}

// StreamLabs context helpers
class DynamicRouterRootContext extends RootContext {
  createHttpContext(): HttpContext {
    return new DynamicRouterHttpContext();
  }
}
```

### Pattern: Rate Limiting Token Bucket (NGINX + Lua)
```lua
-- NGINX Lua token bucket rate limiter
local token_buckets = {}

local function get_bucket(key, rate, burst)
  local bucket = token_buckets[key]
  if not bucket then
    bucket = { tokens = burst, last = ngx.now() }
    token_buckets[key] = bucket
  end
  return bucket
end

local function check_rate_limit(key, rate, burst)
  local bucket = get_bucket(key, rate, burst)
  local now = ngx.now()
  local elapsed = now - bucket.last
  bucket.tokens = math.min(burst, bucket.tokens + elapsed * rate)
  bucket.last = now

  if bucket.tokens >= 1 then
    bucket.tokens = bucket.tokens - 1
    return true, bucket.tokens
  end

  return false, 0
end

-- Usage in access phase
local api_key = ngx.var.http_x_api_key or ngx.var.remote_addr
local allowed, remaining = check_rate_limit(api_key, 10, 20) -- 10 req/s, burst 20
if not allowed then
  ngx.status = 429
  ngx.header["Retry-After"] = 1
  ngx.header["X-RateLimit-Remaining"] = 0
  ngx.say('{"error":{"code":"RATE_LIMITED","message":"Rate limit exceeded"}}')
  ngx.exit(429)
end

ngx.header["X-RateLimit-Remaining"] = remaining
```

### Pattern: Circuit Breaker (Spring Cloud Gateway)
```java
@Bean
public RouteLocator customRouteLocator(RouteLocatorBuilder builder) {
    return builder.routes()
        .route("user-service", r -> r
            .path("/api/users/**")
            .filters(f -> f
                .circuitBreaker(config -> config
                    .setName("userServiceCB")
                    .setFallbackUri("forward:/fallback/users")
                    .setStatusCode(503))
                .retry(config -> config
                    .setRetries(3)
                    .setStatuses(HttpStatus.SERVICE_UNAVAILABLE)
                    .setBackoff(Duration.ofMillis(100), Duration.ofSeconds(5), 2, true))
                .requestRateLimiter(config -> config
                    .setRateLimiter(redisRateLimiter())
                    .setKeyResolver(userKeyResolver())))
            .uri("lb://user-service"))
        .build();
}
```

### Pattern: Request/Response Transformation (APISIX)
```yaml
routes:
  - uri: /api/orders/*
    upstream:
      nodes:
        "order-service:8080": 1
    plugins:
      body-transformer:
        request:
          template: |
            {
              "order_id": "{{body.id}}",
              "customer": {
                "name": "{{body.customer_name}}",
                "email": "{{body.customer_email}}"
              }
            }
        response:
          template: |
            {
              "id": "{{body.order_id}}",
              "status": "{{body.order_status}}",
              "items": {{body.items | json}}
            }
```

### Pattern: Canary Release (Traefik)
```yaml
http:
  routers:
    user-api-canary:
      rule: "Host(`api.example.com`) && PathPrefix(`/api/users`)"
      service: user-api-canary
      weight: 10  # 10% traffic

    user-api-stable:
      rule: "Host(`api.example.com`) && PathPrefix(`/api/users`)"
      service: user-api-stable
      weight: 90  # 90% traffic

  services:
    user-api-canary:
      loadBalancer:
        servers:
          - url: "http://user-service-v2:8080"
    user-api-stable:
      loadBalancer:
        servers:
          - url: "http://user-service-v1:8080"
```

## Advanced Gateway Patterns

### Pattern: Gateway-Side Caching
```nginx
# NGINX proxy cache configuration
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m
                 max_size=1g inactive=60m use_temp_path=off;

server {
  location /api/ {
    proxy_cache api_cache;
    proxy_cache_key "$scheme$request_method$host$request_uri";
    proxy_cache_valid 200 60s;
    proxy_cache_valid 404 5s;
    proxy_cache_use_stale error timeout updating http_500 http_502 http_503;
    proxy_cache_background_update on;
    proxy_cache_lock on;
    proxy_cache_lock_timeout 5s;

    # Bypass cache for authenticated requests
    proxy_no_cache $http_authorization;
    proxy_cache_bypass $http_authorization;

    proxy_pass http://backend;
  }
}
```

### Pattern: API Composition (KrakenD)
```json
{
  "endpoint": "/v1/checkout/{cartId}",
  "method": "GET",
  "backend": [
    {
      "urlPattern": "/carts/{{.Request.cartId}}",
      "host": ["http://cart-service:8080"],
      "group": "cart"
    },
    {
      "urlPattern": "/pricing/{{.Request.cartId}}",
      "host": ["http://pricing-service:8080"],
      "group": "pricing"
    },
    {
      "urlPattern": "/shipping/options/{{.Request.cartId}}",
      "host": ["http://shipping-service:8080"],
      "group": "shipping"
    }
  ],
  "extraConfig": {
    "mergeStrategy": "parallel"
  },
  "outputEncoding": "json",
  "timeout": "3s"
}
```

### Pattern: Gateway Observability Stack
```yaml
# Envoy access log configuration
admin:
  access_log_path: /dev/stdout
  address:
    socket_address: { address: 0.0.0.0, port_value: 9901 }

static_resources:
  listeners:
    - address: { socket_address: { address: 0.0.0.0, port_value: 8080 } }
      filter_chains:
        - filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                access_log:
                  - name: envoy.access_loggers.file
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.access_loggers.file.v3.FileAccessLog
                      path: /dev/stdout
                      format:
                        json_format:
                          start_time: "%START_TIME%"
                          method: "%REQ(:METHOD)%"
                          path: "%REQ(X-ENVOY-ORIGINAL-PATH?)%"
                          protocol: "%PROTOCOL%"
                          response_code: "%RESPONSE_CODE%"
                          duration: "%DURATION%"
                          bytes_received: "%BYTES_RECEIVED%"
                          bytes_sent: "%BYTES_SENT%"
                          upstream_host: "%UPSTREAM_HOST%"
                          upstream_cluster: "%UPSTREAM_CLUSTER%"
                          request_id: "%REQ(X-REQUEST-ID)%"
                          user_agent: "%REQ(USER-AGENT)%"
                          client_ip: "%DOWNSTREAM_REMOTE_ADDRESS%"
```

## Production Configuration Examples

### Kong (DB-less Mode)
```yaml
_format_version: "3.0"
services:
  - name: users
    url: http://users.internal:8080
    routes:
      - name: users-routes
        hosts: ["api.example.com"]
        paths: ["/api/users"]
        methods: [GET, POST, PUT, DELETE, PATCH]
        strip_path: true
    plugins:
      - name: jwt
        config:
          claims_to_verify: ["exp", "nbf"]
          key_claim_name: kid
          secret_is_base64: false
          run_on_preflight: true
      - name: rate-limiting
        config:
          minute: 100
          policy: redis
          redis_host: redis.internal
          fault_tolerant: true
          hide_client_headers: false
      - name: cors
        config:
          origins: ["https://app.example.com"]
          methods: ["GET", "POST", "PATCH", "DELETE"]
          headers: ["Authorization", "Content-Type", "Idempotency-Key"]
          credentials: true
      - name: request-size-limiting
        config:
          allowed_payload_size: 10  # MB
      - name: prometheus
```

### AWS API Gateway (OpenAPI + SAM)
```yaml
openapi: "3.0.1"
info:
  title: Users API
  version: "1.0"
x-amazon-apigateway:
  binaryMediaTypes: ["multipart/form-data"]
  requestValidator: full
  gatewayResponses:
    DEFAULT_4XX:
      responseTemplates:
        application/json: >
          {"error":{"code":"GATEWAY_ERROR","message":"$context.error.message"}}
    DEFAULT_5XX:
      responseTemplates:
        application/json: >
          {"error":{"code":"INTERNAL_ERROR","message":"Unexpected server error"}}

paths:
  /users:
    get:
      x-amazon-apigateway-integration:
        type: aws_proxy
        httpMethod: POST
        uri: arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:123456:function:listUsers/invocations
        credentials: arn:aws:iam::123456:role/api-gateway-lambda-role
      responses:
        "200":
          description: Users list
      security:
        - CognitoAuthorizer: []

components:
  securitySchemes:
    CognitoAuthorizer:
      type: cognito_user_pools
      providerARNs:
        - arn:aws:cognito-idp:us-east-1:123456:userpool/us-east-1_abc123
```

### Envoy Static Configuration
```yaml
static_resources:
  listeners:
    - address: { socket_address: { address: 0.0.0.0, port_value: 443 } }
      listener_filters:
        - name: envoy.filters.listener.tls_inspector
      filter_chains:
        - filter_chain_match:
            transport_protocol: tls
          transport_socket:
            name: envoy.transport_sockets.tls
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.DownstreamTlsContext
              common_tls_context:
                tls_certificates:
                  - certificate_chain: { filename: "/etc/certs/tls.crt" }
                    private_key: { filename: "/etc/certs/tls.key" }
                validation_context:
                  trusted_ca: { filename: "/etc/certs/ca.crt" }
          filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                codec_type: AUTO
                stat_prefix: ingress_http
                use_remote_address: true
                common_http_protocol_options:
                  idle_timeout: 3600s
                http2_protocol_options:
                  max_concurrent_streams: 100
                stream_idle_timeout: 300s
                request_timeout: 30s
                route_config:
                  name: local_route
                  virtual_hosts:
                    - name: backend
                      domains: ["*"]
                      routes:
                        - match: { prefix: "/api/users" }
                          route:
                            cluster: user_service
                            timeout: 10s
                            retry_policy:
                              retry_on: connect-failure,refused-stream,unavailable,cancelled,retriable-status-codes
                              num_retries: 3
                              retry_host_predicate:
                                - name: envoy.retry_host_predicates.previous_hosts
                              host_selection_retry_max_attempts: 3
                        - match: { prefix: "/api/orders" }
                          route:
                            cluster: order_service
                            timeout: 30s
                            retry_policy:
                              retry_on: connect-failure,refused-stream,unavailable
                              num_retries: 2
                http_filters:
                  - name: envoy.filters.http.jwt_authn
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.jwt_authn.v3.JwtAuthentication
                      providers:
                        my_provider:
                          issuer: https://auth.example.com
                          audiences: ["api.example.com"]
                          from_headers:
                            - name: Authorization
                              value_prefix: "Bearer "
                          local_jwks:
                            filename: "/etc/jwks/jwks.json"
                      rules:
                        - match: { prefix: "/api/" }
                          requires: { provider_name: "my_provider" }
                  - name: envoy.filters.http.router
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

  clusters:
    - name: user_service
      connect_timeout: 5s
      type: STRICT_DNS
      lb_policy: LEAST_REQUEST
      circuit_breakers:
        thresholds:
          - priority: DEFAULT
            max_connections: 100
            max_pending_requests: 50
            max_requests: 200
            max_retries: 5
      outlier_detection:
        consecutive_5xx: 5
        interval: 30s
        base_ejection_time: 30s
        max_ejection_percent: 50
      load_assignment:
        cluster_name: user_service
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address: { socket_address: { address: users.internal, port_value: 8080 } }
              - endpoint:
                  address: { socket_address: { address: users.internal, port_value: 8081 } }

tracing:
  http:
    name: envoy.tracers.opentelemetry
    typed_config:
      "@type": type.googleapis.com/envoy.config.trace.v3.OpenTelemetryConfig
      grpc_service:
        envoy_grpc:
          cluster_name: opentelemetry_collector
```

## Anti-Patterns

### Anti-Pattern 1: Business Logic in Gateway
Problem: Putting business rules in gateway transforms it into a monolith
Fix: Gateway handles cross-cutting concerns only. Business logic stays in services.

### Anti-Pattern 2: Synchronous Chaining
Problem: Gateway calls A → A calls B → B calls C, latency multiplies
Fix: Parallel composition, async event-driven for non-critical paths.

### Anti-Pattern 3: Single Gateway for Everything
Problem: One gateway handles 100+ services, becomes deployment bottleneck
Fix: Domain gateways or BFFs. Split by concern.

### Anti-Pattern 4: No Circuit Breaker
Problem: Single failing service cascades to all routes
Fix: Circuit breaker per upstream. Stale cache fallback.

### Anti-Pattern 5: Over-Validation at Gateway
Problem: Gateway validates business rules, duplicating service logic
Fix: Gateway validates format (syntax). Services validate business rules (semantics).

## Performance Considerations
- TLS termination at gateway: RSA 2048 vs ECDSA P-256 (~3x faster for ECDSA)
- Connection pooling: 50-100 connections per upstream
- Header compression with HPACK (HTTP/2) reduces overhead by 80%
- Response compression: Brotli for JSON, Gzip fallback
- Cache size: 1GB per gateway instance for response caching
- Worker processes: 2x CPU cores for NGINX, 1 per core for Envoy

## Security Considerations
- TLS 1.3 minimum, disable TLS 1.0/1.1 and SSL
- HSTS header: `Strict-Transport-Security: max-age=31536000`
- Rate limit per client at gateway (never reach upstream without throttling)
- Validate Content-Type, Content-Length, request body size at gateway
- CORS: whitelist origins, never use `Access-Control-Allow-Origin: *`
- WAF: OWASP CRS rules at gateway for SQLi/XSS prevention

## Rules
- Authenticate at the edge. Never forward unauthenticated requests to upstream.
- Rate limit per client at gateway before upstream processing.
- TLS terminate at gateway; upstream services use HTTP internally.
- Log every request: method, path, status, latency, client IP.
- Set aggressive timeouts (connect 5s, read 10s). Fail fast.
- Circuit breaker: 5 failures/30s → open 60s → half-open.
- Never expose internal DNS, IPs, or stack traces in errors.
- Cache GET responses at gateway when safe (TTL ≤ 60s dynamic, longer for static).
- Implement canary releases at gateway for zero-downtime deploys.
- Use health checks (active + passive) for all upstreams.
- Validate request body size, content-type, and schema at gateway.
- CORS headers must be configurable per route, not global.
- Enable access logs in JSON format for log aggregation.
- Track RED metrics (Rate, Errors, Duration) for every route.
- No business logic in gateway — cross-cutting concerns only.

## References
  - references/apache-apisix.md — Apache APISIX Gateway Configuration
  - references/aws-api-gateway.md — AWS API Gateway
  - references/azure-api-management.md — Azure API Management
  - references/envoy-gateway.md — Envoy Gateway Configuration
  - references/gateway-comparison.md — API Gateway Comparison
  - references/gateway-observability.md — API Gateway Observability
  - references/gateway-patterns.md — API Gateway Patterns
  - references/gateway-testing.md — API Gateway Testing
  - references/kong-config.md — Kong Gateway Configuration
  - references/nginx-config.md — Nginx / OpenResty Gateway Configuration
  - references/spring-cloud-gateway.md — Spring Cloud Gateway
  - references/api-gateway-fundamentals.md — API Gateway Fundamentals
  - references/api-gateway-advanced.md — API Gateway Advanced Patterns
  - references/api-gateway-deployment.md — API Gateway Deployment Patterns

## Handoff
No artifact produced unless requested.
Next skill: backend-rate-limiting — enforce rate limits per client.
Next skill: backend-api-design — design REST/GraphQL APIs behind gateway.
Carry forward: gateway provider, route definitions, auth method, rate limit tiers.
