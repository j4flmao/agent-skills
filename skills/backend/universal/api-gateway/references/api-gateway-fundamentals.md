# API Gateway Fundamentals

## What is an API Gateway?
An API gateway is a server (or cluster) that sits between clients and backend services, acting as a single entry point for all API traffic. It handles request routing, composition, authentication, rate limiting, caching, and other cross-cutting concerns.

## Core Responsibilities

### Request Routing
The gateway routes incoming requests to the correct backend service based on:
- **Path**: `/api/users/*` → user-service
- **Host**: `api.example.com` → public-api, `admin.example.com` → admin-api
- **Headers**: `X-Version: v2` → user-service-v2
- **Method**: `GET /api/orders` → read replica, `POST /api/orders` → primary
- **Weight**: 90% → v1, 10% → v2 (canary)

### Authentication and Authorization
- Verify JWT signatures, API keys, mTLS certificates at the edge
- Extract user identity, roles, permissions from tokens
- Pass verified identity to upstream services via headers
- Reject unauthenticated requests before they reach services

### Rate Limiting
- Per-client, per-endpoint, per-IP rate limiting
- Token bucket, sliding window, or fixed window algorithms
- Graduated tiers: different limits for free/pro/enterprise
- Rate limit headers on every response

### Request/Response Transformation
- Header injection, removal, or modification
- Body transformation (JSON → XML, field mapping)
- Protocol translation (REST → gRPC, SOAP → REST)
- Response aggregation from multiple services

### Observability
- Structured request logging
- Metrics collection (RED: Rate, Errors, Duration)
- Distributed tracing propagation
- Health checking (active probes + passive detection)

## Gateway Deployment Models

### Edge Gateway
```
Client → CDN → Edge Gateway → Backend Services
```
- Closest to client, TLS termination
- CDN integration for static/semi-static content
- DDoS protection at network edge

### Centralized Gateway
```
Client → Load Balancer → Gateway Cluster → Backend Services
```
- Shared gateway for all services
- Single point to enforce security policies
- Easier to manage but becomes bottleneck

### Per-Domain Gateway
```
Client → Load Balancer → Order Gateway → Order Service
                       → User Gateway → User Service
```
- One gateway per domain/bounded context
- Independent scaling and deployment
- Reduced blast radius

### Sidecar Gateway (Service Mesh)
```
Client → Service A (Sidecar Proxy) → Service B (Sidecar Proxy)
```
- Per-service proxy (Envoy sidecar)
- Traffic management at service level
- mTLS between all services

## Gateway vs Reverse Proxy vs Load Balancer

| Feature | Load Balancer (L4) | Reverse Proxy (L7) | API Gateway |
|---------|-------------------|-------------------|-------------|
| OSI Layer | 4 (TCP/UDP) | 7 (HTTP/HTTPS) | 7 (HTTP/HTTPS) |
| Routing | IP:Port | Host, Path, Header | Host, Path, Header, Query, Method |
| TLS termination | Yes | Yes | Yes |
| Auth | No | Limited | Rich (JWT, OAuth, API key, mTLS) |
| Rate limiting | No | Basic | Advanced per-client tiers |
| Caching | No | Yes | Yes, with invalidation |
| Transformation | No | Limited (headers) | Full (headers, body, protocol) |
| Aggregation | No | No | Yes (parallel, sequential) |
| Circuit breaker | No | Limited | Yes |
| Service discovery | No | Limited | Yes (K8s, Consul, DNS) |
| API analytics | No | No | Yes (usage, error rates, latency) |
| Developer portal | No | No | Optional (Kong, Apigee, Tyk) |

## Gateway Configuration Approaches

### Static Configuration (Declarative)
```yaml
# YAML file loaded at startup. Changes require restart/reload.
routes:
  - path: /api/users
    upstream: http://users:8080
    methods: [GET, POST]
    auth: jwt
```

### Dynamic Configuration (API-driven)
```http
POST /routes
{
  "name": "users-api",
  "paths": ["/api/users"],
  "upstream": {"name": "user-service"}
}
```
- Changes applied at runtime without restart
- Stored in database (PostgreSQL, Redis, etcd)
- Kong DB mode, APISIX Admin API, Spring Cloud Gateway Actuator

### Control Plane / Data Plane
```
Control Plane (config management) → Data Plane (runtime proxy)
```
- Control plane provides config via API or files
- Data plane syncs config periodically
- Envoy xDS, Kong decK, APISIX Admin API

## Gateway Ecosystem Components

### Essential Plugins/Modules
| Category | Plugins |
|----------|---------|
| Authentication | JWT, OAuth2, OIDC, Basic Auth, HMAC, LDAP, SAML |
| Security | CORS, IP Restriction, WAF, Bot Detection, DDoS Protection |
| Traffic Control | Rate Limiting, Request Size Limiter, Concurrency Limiter |
| Transformation | Request/Response Transformer, Body Transformer, gRPC Transcoding |
| Caching | Proxy Cache, Redis Cache |
| Observability | Prometheus, Datadog, OpenTelemetry, Splunk, Elasticsearch |
| Resilience | Circuit Breaker, Retry, Timeout, Health Check |
| Protocol | WebSocket, gRPC, Server-Sent Events |
| Routing | Canary, Blue-Green, A/B Testing, Shadow Traffic |

### Health Check Types
```yaml
active_health_check:
  type: HTTP
  interval: 10s
  timeout: 2s
  unhealthy_threshold: 3
  healthy_threshold: 2
  path: /health

passive_health_check:
  type: HTTP
  unhealthy_threshold: 5  # consecutive failures
  interval: 30s
  timeout: 5s
```

## Gateway Selection Checklist

### Functional Requirements
- [ ] Number of backend services to route
- [ ] Authentication methods needed (JWT, OAuth2, API key, mTLS)
- [ ] Rate limiting granularity (per client, per endpoint, per IP)
- [ ] Request transformation needed (header/body modification)
- [ ] Protocol translation needed (REST → gRPC, SOAP → REST)
- [ ] Response aggregation / API composition required
- [ ] Service discovery integration (K8s, Consul, DNS)

### Non-Functional Requirements
- [ ] Expected throughput (requests per second)
- [ ] Latency budget added by gateway (<5ms per hop)
- [ ] Deployment model (K8s, VMs, serverless, hybrid)
- [ ] High availability requirements (multi-AZ, multi-region)
- [ ] Plugin ecosystem requirements
- [ ] Team expertise with specific gateways
- [ ] Budget (open source vs commercial/managed)
- [ ] Existing infrastructure (cloud provider, CI/CD)

## Common Gateway Configurations

### Minimum Viable Gateway
```nginx
server {
    listen 443 ssl;
    server_name api.example.com;

    ssl_certificate /etc/certs/tls.crt;
    ssl_certificate_key /etc/certs/tls.key;

    location /api/users {
        proxy_pass http://users.internal:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/orders {
        proxy_pass http://orders.internal:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Production Gateway Requirements
- TLS termination with automated certificate renewal (Let's Encrypt / cert-manager)
- JWT validation at edge, not in services
- Rate limiting with Redis backend for distributed state
- Request logging in JSON format (ELK/Loki)
- Prometheus metrics for every route
- Health checks (active + passive) for all upstreams
- Circuit breakers configured per upstream
- Timeouts configured on every route (connect, read, write)
- CORS configuration per route (not global)
- Request size limits enforced
- Graceful shutdown handling

## Gateway Testing Strategies

### Unit Tests
- Test individual plugins/filters
- Test routing rules with mock requests
- Test transformation templates

### Integration Tests
- Deploy gateway + mock upstreams
- Test authentication flows
- Test rate limiting at boundaries
- Test circuit breaker behavior
- Test caching with ETags

### Load Tests
- Measure throughput at gateway
- Verify latency budget (gateway should add <5ms)
- Test rate limiting effectiveness
- Test connection pooling under load
- Measure memory usage at scale

### Chaos Tests
- Kill upstream services → verify circuit breaker opens
- Network partition → verify graceful degradation
- High latency upstream → verify timeout behavior
- Certificate expiry → verify rotation handling
