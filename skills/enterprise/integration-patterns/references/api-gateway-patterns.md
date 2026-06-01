# API Gateway Patterns

## Overview
API gateways provide a unified entry point for backend services, handling cross-cutting concerns like authentication, rate limiting, routing, and protocol translation. This reference covers gateway patterns, deployment models, and operational considerations.

## Gateway Deployment Models

### Single Gateway
One gateway for all clients. Simple but becomes a bottleneck and single point of failure. Best for small systems with uniform client requirements.

### Backend for Frontend (BFF)
Dedicated gateway per client type (web, mobile, IoT, third-party). Each BFF optimized for its client's needs: mobile BFF returns smaller payloads, web BFF returns HTML-friendly data. Prevents over/under-fetching.

### Gateway per Domain
Gateway per bounded context or domain (orders gateway, payments gateway, catalog gateway). Each domain team owns their gateway. Consistent with microservice ownership model. Reduces blast radius of gateway changes.

### Sidecar Gateway
Gateway deployed as a sidecar alongside each service instance (service mesh pattern). No central gateway — request routing handled at mesh layer. Bypass for external-facing APIs.

## Gateway Responsibilities

### Request Routing
Route requests to appropriate backend based on path, headers, or query parameters. Support pattern-based routing (/api/users/* -> user-service). Canary routing by header or user cohort for testing.

### Authentication and Authorization
Validate tokens at the gateway before forwarding. Centralizes auth logic. Gateways support: JWT validation (RS256/ES256), OAuth2 introspection, API key verification, mTLS termination.

### Rate Limiting
Per-client rate limits prevent abuse and protect backends. Strategies: token bucket (burst allowance), sliding window (smooth limiting), concurrency limit (protect connection pools). Return 429 Too Many Requests with Retry-After header.

### Request Aggregation
Combine multiple backend responses into a single response. Example: product detail page needs product info, inventory, pricing, reviews — gateway aggregates all four. Reduces client-side requests and latency.

### Protocol Translation
Translate between different protocols: REST <-> gRPC, HTTP <-> AMQP, XML <-> JSON. Enable clients and backends to speak their native protocol while the gateway handles translation.

### Response Caching
Cache responses for idempotent GET requests. Reduce backend load and improve latency. Invalid cache on data mutation. Set Cache-Control headers. Gateway-level cache is in addition to client-side and CDN caching.

## Configuration Patterns

### Route Configuration (YAML)
```yaml
routes:
  - id: users-api
    uri: http://user-service:8080
    predicates:
      - Path=/api/users/**
    filters:
      - StripPrefix=2
      - RateLimit=100,10s
      - CircuitBreaker=user-service,5s,10

  - id: orders-api
    uri: http://order-service:8080
    predicates:
      - Path=/api/orders/**
    filters:
      - StripPrefix=2
      - JwtValidation=RS256,.well-known/jwks.json
      - Retry=3,100ms

  - id: product-aggregation
    uri: http://product-service:8080
    predicates:
      - Path=/api/products/**
    filters:
      - StripPrefix=2
      - Cache=300,product-cache
      - Aggregate=reviews-service,inventory-service
```

### Dynamic Routing with Service Discovery
Gateways register with service discovery (Consul, Eureka, Kubernetes). Routes resolve dynamically. No restart needed for new service instances. Health checks remove unhealthy instances from routing.

## Error Handling at the Gateway

### Standard Error Response
```json
{
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "Service temporarily unavailable",
    "details": {
      "service": "user-service",
      "retry_after_seconds": 30
    }
  }
}
```

### Circuit Breaker at Gateway
Mediate between client and backend. Open circuit when backend failure rate exceeds threshold. Return cached response or error during open circuit. Half-open after cooldown. Prevent cascading failures.

### Timeout Management
Set per-route timeouts: connect timeout (1s), read timeout (5s), total request timeout (10s). Return 504 Gateway Timeout with helpful error message. Timeout values should be shorter than client-side timeouts to enable meaningful error handling.

## Security Considerations

### Gateway as Security Boundary
The gateway is the first line of defense. Apply all security controls here: TLS termination, request validation (size, content-type), SQL injection/XSS filtering, DDoS protection (rate limiting + WAF), IP allow/deny lists.

### Internal vs External Gateways
External gateway (DMZ): public-facing, terminates TLS, handles auth, enforces rate limits. Internal gateway: service-to-service, mTLS, validates internal auth tokens, enforces service-level rate limits. Never expose internal gateway to the internet.

## Operations

### Gateway Monitoring
Monitor: request rate, latency p50/p95/p99, error rate by route, circuit breaker state, rate limit hit count, cache hit ratio. Alert on: latency > threshold for 5min, error rate > 1%, circuit breaker open > 1min.

### Blue-Green Gateway Deployments
Deploy two gateway instances (blue and green). Route test traffic to green while blue serves production. Switch traffic after validation. Instant rollback by switching back. Requires load balancer in front of gateway.

### Gateway Scaling
Gateways are stateless — scale horizontally behind load balancer. Each gateway instance handles any request. No session affinity needed (auth at gateway level, not session-based). Scale based on request rate and CPU utilization.

## Key Points
- API gateway handles cross-cutting concerns: auth, rate limiting, routing, caching, protocol translation
- BFF pattern gives each client type an optimized gateway
- Gateways are stateless and scale horizontally
- Circuit breakers at the gateway prevent cascading failures
- External and internal gateways have different security postures
- Blue-green deployments enable safe gateway updates with rollback
- Gateway monitoring covers request rate, latency, error rate, and circuit breaker state
- Rate limiting protects backends — always configure per-route limits