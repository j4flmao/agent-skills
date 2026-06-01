# API Gateway Advanced Patterns

## Advanced Routing Strategies

### Content-Based Routing
Route based on request body content (not just headers/paths):

```lua
-- Kong plugin: content-based routing
local function route_by_content()
  local body = kong.request.get_body()
  if not body then return end

  if body.type == "premium" and body.amount > 10000 then
    kong.service.set_upstream(kong.config.premium_upstream)
  elseif body.region == "eu" then
    kong.service.set_upstream(kong.config.eu_upstream)
  end
end
```

### Dynamic Upstream Selection
```typescript
// Envoy WASM dynamic routing based on JWT claims
class ClaimsBasedRouter extends HttpContext {
  onHttpRequestHeaders(numHeaders: number): number {
    const token = this.getHttpRequestHeader("authorization")?.replace("Bearer ", "");
    if (!token) return 0;

    const claims = this.decodeJwt(token);
    if (claims.tier === "enterprise") {
      this.setHttpRequestHeader("x-envoy-upstream-cluster", "enterprise-backend");
    } else if (claims.region) {
      this.setHttpRequestHeader("x-envoy-upstream-cluster", `backend-${claims.region}`);
    }

    return 0;
  }

  private decodeJwt(token: string): Record<string, string> {
    const parts = token.split(".");
    if (parts.length !== 3) return {};
    return JSON.parse(atob(parts[1]));
  }
}
```

### Shadow Traffic / Mirroring
Send copy of traffic to a shadow service for testing without affecting production:

```yaml
# Envoy route with shadow/mirror policy
routes:
  - match: { prefix: "/api/orders" }
    route:
      cluster: order-service-prod
      request_mirror_policies:
        - cluster: order-service-shadow
          runtime_fraction:
            default_value:
              numerator: 10
              denominator: HUNDRED  # Mirror 10% of traffic
```

## Advanced Security Patterns

### Mutual TLS (mTLS) Between Services
```envoy
# Envoy upstream TLS with mTLS
clusters:
  - name: payment-service
    transport_socket:
      name: envoy.transport_sockets.tls
      typed_config:
        "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.UpstreamTlsContext
        common_tls_context:
          tls_certificates:
            - certificate_chain: { filename: "/etc/certs/gateway.crt" }
              private_key: { filename: "/etc/certs/gateway.key" }
          validation_context:
            trusted_ca: { filename: "/etc/certs/ca.crt" }
            match_subject_alt_names:
              - prefix: "payment-service"
```

### OAuth2 Token Exchange at Gateway
```yaml
# Kong OAuth2 token exchange
plugins:
  - name: oauth2
    config:
      scopes: ["read", "write", "admin"]
      mandatory_scope: true
      token_expiration: 3600
      enable_authorization_code: true
      enable_client_credentials: true
      enable_password_grant: true
      provision_key: "oauth2_provision_key"
      hide_credentials: true

  - name: oauth2-introspection
    config:
      introspection_url: https://auth.example.com/introspect
      client_id: gateway
      client_secret: ${GATEWAY_CLIENT_SECRET}
      token_type_hint: access_token
      ttl: 300  # Cache introspection result for 5 minutes
```

### IP-Based Access Control with Geo-Blocking
```nginx
# NGINX geo-blocking
geo $allowed_country {
    default 0;
    US 1;
    CA 1;
    GB 1;
    DE 1;
    FR 1;
    AU 1;
}

server {
    if ($allowed_country = 0) {
        return 403;
    }

    location /api/admin {
        allow 10.0.0.0/8;
        allow 172.16.0.0/12;
        allow 192.168.0.0/16;
        deny all;
    }
}
```

## Advanced Rate Limiting Strategies

### Multi-Layer Rate Limiting
```yaml
# Kong multi-layer rate limiting
plugins:
  - name: rate-limiting
    config:
      second: null
      minute: 1000    # Global limit per client
      hour: 50000     # Hourly limit per client
      policy: redis
      fault_tolerant: true
      redis_database: 0
      redis_timeout: 2000

  - name: request-size-limiting
    config:
      allowed_payload_size: 10  # MB

  - name: concurrency-limiting
    config:
      limit: 10       # Max concurrent requests per client
      policy: redis
```

### Adaptive Rate Limiting
```typescript
// Adaptive rate limiter that adjusts based on upstream health
class AdaptiveRateLimiter {
  private maxTokens: number;
  private currentTokens: number;
  private lastRefill: number;
  private upstreamErrorRate: number;

  constructor(
    initialRate: number,
    private minRate: number,
    private maxRate: number,
    private errorWindowSize: number = 60
  ) {
    this.maxTokens = initialRate;
    this.currentTokens = initialRate;
    this.lastRefill = Date.now();
    this.upstreamErrorRate = 0;
  }

  recordUpstreamResult(success: boolean): void {
    // Sliding window error rate calculation
    if (!success) {
      this.upstreamErrorRate = Math.min(1, this.upstreamErrorRate + 0.1);
      // Reduce rate on errors
      this.maxTokens = Math.max(
        this.minRate,
        this.maxTokens * (1 - this.upstreamErrorRate * 0.5)
      );
    } else {
      this.upstreamErrorRate = Math.max(0, this.upstreamErrorRate - 0.05);
      // Gradually recover
      if (this.upstreamErrorRate < 0.1) {
        this.maxTokens = Math.min(
          this.maxRate,
          this.maxTokens * 1.01  // 1% increase per success
        );
      }
    }
  }

  allow(): boolean {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.currentTokens = Math.min(this.maxTokens, this.currentTokens + elapsed);
    this.lastRefill = now;

    if (this.currentTokens >= 1) {
      this.currentTokens--;
      return true;
    }
    return false;
  }
}
```

## Advanced Caching Patterns

### Cache Stampede Prevention with Probabilistic Early Expiration
```typescript
class ProbabilisticEarlyExpiration {
  private readonly TTL: number;
  private readonly β: number;  // Beta value, typically 1-4

  constructor(ttlSeconds: number, beta: number = 4) {
    this.TTL = ttlSeconds * 1000;
    this.β = beta;
  }

  shouldRefresh(itemAge: number): boolean {
    // Probability increases as item approaches TTL
    const remaining = this.TTL - itemAge;
    const prob = Math.exp(-this.β * (remaining / this.TTL));
    return Math.random() < prob;
  }

  async getOrRefresh<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
    const cached = await cache.get(key);
    if (!cached) {
      return fetchFn();
    }

    if (this.shouldRefresh(cached.age)) {
      // Background refresh — serve stale while revalidating
      fetchFn().then(fresh => cache.set(key, fresh, { ttl: this.TTL }));
    }

    return cached.value;
  }
}
```

### Multi-Level Cache Hierarchy
```typescript
class MultiLevelCache {
  constructor(
    private l1: Map<string, { value: unknown; expiry: number }>, // In-memory
    private l2: RedisClient,  // Distributed
    private l3: CDNClient     // Edge cache
  ) {}

  async get<T>(key: string): Promise<T | null> {
    // L1: In-memory (sub-millisecond)
    const l1 = this.l1.get(key);
    if (l1 && l1.expiry > Date.now()) return l1.value as T;

    // L2: Redis (1-5ms)
    const l2 = await this.l2.get(key);
    if (l2) {
      this.l1.set(key, { value: l2, expiry: Date.now() + 1000 }); // 1s L1 TTL
      return l2 as T;
    }

    // L3: CDN (10-50ms)
    const l3 = await this.l3.get(key);
    if (l3) {
      await this.l2.set(key, l3, { EX: 60 }); // 60s L2 TTL
      this.l1.set(key, { value: l3, expiry: Date.now() + 1000 });
      return l3 as T;
    }

    return null;
  }

  async invalidate(key: string): Promise<void> {
    this.l1.delete(key);
    await this.l2.del(key);
    await this.l3.purge(key);
  }
}
```

## Advanced Resilience Patterns

### Circuit Breaker with Half-Open Probing
```typescript
class CircuitBreaker {
  state: 'closed' | 'open' | 'half-open' = 'closed';
  failureCount = 0;
  successCount = 0;
  lastFailureTime = 0;
  nextAttemptTime = 0;

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000,
    private halfOpenMaxSuccess: number = 3
  ) {}

  async call<T>(fn: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() < this.nextAttemptTime) {
        return fallback ? fallback() : Promise.reject(new Error('Circuit breaker open'));
      }
      this.state = 'half-open';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      if (fallback) return fallback();
      throw err;
    }
  }

  private onSuccess(): void {
    if (this.state === 'half-open') {
      this.successCount++;
      if (this.successCount >= this.halfOpenMaxSuccess) {
        this.state = 'closed';
        this.failureCount = 0;
        this.successCount = 0;
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.state === 'half-open' || this.failureCount >= this.threshold) {
      this.state = 'open';
      this.nextAttemptTime = Date.now() + this.timeout;
      this.successCount = 0;
    }
  }
}
```

### Bulkhead Pattern with Thread Pools
```java
// Spring Cloud Gateway bulkhead configuration
@Bean
public RouteLocator customRouteLocator(RouteLocatorBuilder builder) {
    return builder.routes()
        .route("user-service", r -> r
            .path("/api/users/**")
            .filters(f -> f
                .circuitBreaker(config -> config
                    .setName("userServiceCB")
                    .setFallbackUri("forward:/fallback/users"))
                .requestRateLimiter(config -> config
                    .setRateLimiter(redisRateLimiter()))
                .setDedupeResponseHeader("Access-Control-Allow-Origin", "RETAIN_FIRST"))
            .uri("lb://user-service"))
        .build();
}

// Resilience4j bulkhead configuration
@Bean
public BulkheadConfig userServiceBulkhead() {
    return BulkheadConfig.custom()
        .maxConcurrentCalls(20)
        .maxWaitDuration(Duration.ofMillis(500))
        .writableStackTraceEnabled(false)
        .build();
}
```

## Gateway Migration Strategies

### Strangler Fig Migration
1. Route subset of traffic to new gateway alongside old
2. Gradually increase new gateway traffic
3. Monitor error rates, latency, and throughput
4. When confident, route 100% to new gateway
5. Decommission old gateway

### Blue-Green Gateway Deployment
```yaml
# Two gateway clusters, switch DNS/config at cutover
blue:
  version: v1
  active: false  # Standby, receiving no traffic
  config: gateway-v1.yaml

green:
  version: v2
  active: true   # Serving all traffic
  config: gateway-v2.yaml

# Cutover:
# 1. Deploy v2 to green cluster
# 2. Run smoke tests against green
# 3. Switch DNS/config to green
# 4. Monitor for issues
# 5. Keep blue as rollback target for 48h
```

## Observability Deep Dive

### Distributed Tracing with OpenTelemetry
```yaml
# Envoy OpenTelemetry tracing
tracing:
  http:
    name: envoy.tracers.opentelemetry
    typed_config:
      "@type": type.googleapis.com/envoy.config.trace.v3.OpenTelemetryConfig
      grpc_service:
        envoy_grpc:
          cluster_name: opentelemetry_collector
      service_name: api-gateway
      resource_attributes:
        - key: deployment.environment
          value: production

static_resources:
  clusters:
    - name: opentelemetry_collector
      type: STRICT_DNS
      lb_policy: ROUND_ROBIN
      typed_extension_protocol_options:
        envoy.extensions.upstreams.http.v3.HttpProtocolOptions:
          "@type": type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions
          explicit_http_config:
            http2_protocol_options: {}
      load_assignment:
        cluster_name: opentelemetry_collector
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: otel-collector.monitoring.svc.cluster.local
                      port_value: 4317
```

### RED Metrics Dashboard (Grafana + Prometheus)
```
# Prometheus recording rules for gateway metrics
groups:
  - name: gateway_red
    rules:
      - record: gateway:request_rate:1m
        expr: rate(envoy_http_downstream_rq_total{envoy_response_code_class=~"2xx|3xx"}[1m])

      - record: gateway:error_rate:1m
        expr: rate(envoy_http_downstream_rq_total{envoy_response_code_class=~"4xx|5xx"}[1m])

      - record: gateway:latency_p99:1m
        expr: histogram_quantile(0.99, rate(envoy_http_downstream_rq_time_bucket[1m]))

      - record: gateway:upstream_health:1m
        expr: avg(envoy_cluster_healthy_upstream) by (envoy_cluster_name)
```

## Performance Tuning

### Connection Pool Configuration
```yaml
# NGINX connection tuning
worker_processes: auto  # 1 per CPU core
worker_connections: 1024
multi_accept: on
use: epoll  # Linux event loop

# Keep-alive
keepalive_timeout: 65
keepalive_requests: 100

# Buffer sizes
client_body_buffer_size: 128k
client_max_body_size: 10m
large_client_header_buffers: 4 8k

# Proxy buffers
proxy_buffering: on
proxy_buffers: 8 32k
proxy_buffer_size: 4k
proxy_busy_buffers_size: 64k
```

### TLS Performance Optimization
```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
ssl_session_tickets off;
ssl_ecdh_curve prime256v1:secp384r1;
```

## Gateway API Evolution

### API Versioning at Gateway
```yaml
# Kong version routing
services:
  - name: users-v1
    url: http://users-v1:8080
    routes:
      - name: users-v1-route
        paths: ["/v1/users"]

  - name: users-v2
    url: http://users-v2:8080
    routes:
      - name: users-v2-route
        paths: ["/v2/users"]

  - name: users-header-version
    url: http://users:8080
    routes:
      - name: users-header-route
        paths: ["/api/users"]
        headers:
          X-API-Version: v2
```

### Canary Release with Gradual Rollout
```yaml
# APISIX canary release
routes:
  - uri: /api/users/*
    upstream_id: stable-upstream
    weight: 90  # 90% traffic to stable

  - uri: /api/users/*
    upstream_id: canary-upstream
    weight: 10  # 10% traffic to canary
    plugins:
      prometheus:
        prefer_name: true
```

## WebSocket and gRPC Support

### WebSocket Proxy (NGINX)
```nginx
# NGINX WebSocket proxy
map $http_upgrade $connection_upgrade {
    default  upgrade;
    ''       close;
}

server {
    location /ws/ {
        proxy_pass http://websocket-backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_read_timeout 86400s;  # 24h for WebSocket connections
        proxy_send_timeout 86400s;
    }
}
```

### gRPC-Web Transcoding (Envoy)
```yaml
# Envoy gRPC-Web transcoding
typed_config:
  "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
  http_filters:
    - name: envoy.filters.http.grpc_web
    - name: envoy.filters.http.router

clusters:
  - name: grpc-backend
    type: STRICT_DNS
    http2_protocol_options: {}
    load_assignment:
      cluster_name: grpc-backend
      endpoints:
        - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: grpc-service.internal
                    port_value: 50051
```
