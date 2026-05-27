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
  Do NOT use this for: service mesh sidecar proxies (use Istio sidecar), load
  balancer only, application-level auth (use auth-patterns), DNS-level routing.
version: "1.0.0"
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

## Concrete Examples

### Kong (Declarative, DB-less)
```yaml
_format_version: "3.0"
services:
  - name: users
    url: http://users.internal:8080
    routes:
      - name: users-routes
        paths: ["/api/users"]
        methods: [GET, POST, PUT, DELETE]
        plugins:
          - name: jwt
          - name: rate-limiting
            config: { minute: 100, policy: redis }
          - name: cors
```

### NGINX (Reverse Proxy)
```nginx
location /api/users {
    auth_request /_auth;
    proxy_pass http://user-api;
    limit_req zone=apikey burst=20 nodelay;
}
```

### AWS API Gateway (SAM)
```yaml
CreateUserFunction:
  Type: AWS::Serverless::Function
  Properties:
    Events:
      CreateUser:
        Type: Api
        Properties:
          Path: /users
          Method: POST
          Auth: { Authorizer: CognitoAuthorizer }
```

### Envoy (xDS/Static)
```yaml
static_resources:
  listeners:
    - address: { socket_address: { address: 0.0.0.0, port_value: 8080 } }
      filter_chains:
        - filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                codec_type: AUTO
                stat_prefix: ingress_http
                route_config:
                  name: local_route
                  virtual_hosts:
                    - name: backend
                      domains: ["*"]
                      routes:
                        - match: { prefix: "/api/users" }
                          route: { cluster: user_service }
                http_filters:
                  - name: envoy.filters.http.router
clusters:
  - name: user_service
    connect_timeout: 5s
    type: STRICT_DNS
    lb_policy: ROUND_ROBIN
    load_assignment:
      cluster_name: user_service
      endpoints:
        - lb_endpoints:
            - endpoint:
                address: { socket_address: { address: users.internal, port_value: 8080 } }
```

### Spring Cloud Gateway (Java)
```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: user-service
          uri: http://users.internal:8080
          predicates:
            - Path=/api/users/**
          filters:
            - name: RequestRateLimiter
              args:
                redis-rate-limiter.replenishRate: 100
                redis-rate-limiter.burstCapacity: 200
            - StripPrefix=1
```

### Apache APISIX
```yaml
routes:
  - uri: /api/users/*
    upstream:
      nodes:
        "users.internal:8080": 1
    plugins:
      jwt-auth:
        header: Authorization
      limit-count:
        count: 100
        time_window: 60
        key: consumer_name
      cors: ~
```

### Traefik (Docker/K8s)
```yaml
http:
  routers:
    api-router:
      rule: "Host(`api.example.com`) && PathPrefix(`/api/users`)"
      service: user-service
      middlewares:
        - auth@file
        - ratelimit@file
  services:
    user-service:
      loadBalancer:
        servers:
          - url: "http://users.internal:8080"
```

### HAProxy
```haproxy
frontend api
    bind *:443 ssl crt /etc/ssl/certs/api.pem
    default_backend users

backend users
    balance roundrobin
    server user1 users.internal:8080 check fall 3 rise 2
    server user2 users.internal:8081 check fall 3 rise 2
    http-request set-header X-Forwarded-Proto https
```

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
## Handoff
No artifact produced unless requested.
Next skill: backend-rate-limiting — enforce rate limits per client.
Next skill: backend-api-design — design REST/GraphQL APIs behind gateway.
Carry forward: gateway provider, route definitions, auth method, rate limit tiers.
