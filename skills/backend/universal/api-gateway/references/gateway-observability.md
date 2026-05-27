# API Gateway Observability

## Overview
Monitor API gateway performance with RED metrics (Rate, Errors, Duration), structured request logging, distributed tracing propagation, and health checking.

## RED Metrics Collection

```yaml
# Prometheus metrics exposed by Kong
metrics:
  - name: kong_http_requests_total
    help: Total HTTP requests
    labels: [service, route, method, status_code]
  - name: kong_http_request_duration_ms
    help: Request latency in milliseconds
    labels: [service, route]
    buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000]
  - name: kong_http_requests_errors_total
    help: Total error responses
    labels: [service, route, error_code]
  - name: kong_upstream_target_health
    help: Upstream target health status
    labels: [upstream, target]
```

## Structured Request Logging

```json
{
  "timestamp": "2026-05-15T10:30:00.123Z",
  "level": "info",
  "request_id": "req_abc123",
  "trace_id": "trace_xyz789",
  "method": "POST",
  "path": "/v2/orders",
  "query_string": "",
  "status": 201,
  "request_size": 1024,
  "response_size": 512,
  "latency_ms": 42,
  "upstream_latency_ms": 35,
  "client_ip": "203.0.113.42",
  "user_agent": "axios/1.6.0",
  "upstream_service": "order-service",
  "upstream_host": "10.0.1.5:8080",
  "rate_limit_remaining": 85,
  "auth_method": "jwt",
  "user_id": "usr_789"
}
```

## Distributed Trace Propagation

```typescript
// Envoy OpenTelemetry tracing configuration
static_resources:
  listeners:
    - address:
        socket_address: { address: 0.0.0.0, port_value: 8443 }
      filter_chains:
        - filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                tracing:
                  provider:
                    name: envoy.tracers.opentelemetry
                    typed_config:
                      "@type": type.googleapis.com/envoy.config.trace.v3.OpenTelemetryConfig
                      collector_cluster: otel-collector
                      service_name: api-gateway
                http_filters:
                  - name: envoy.filters.http.router
```

## Upstream Health Monitoring

```yaml
# Kong health check configuration
upstreams:
  - name: order-service
    healthchecks:
      active:
        type: http
        http_path: /health
        healthy:
          interval: 30
          successes: 3
          http_statuses: [200, 301, 302]
        unhealthy:
          interval: 5
          http_failures: 3
          http_statuses: [429, 503, 504]
        timeout: 5
      passive:
        type: http
        healthy:
          http_statuses: [200, 201, 301, 302]
          successes: 5
        unhealthy:
          http_failures: 3
          http_statuses: [429, 500, 503]
```

## Alerting Rules

```yaml
groups:
  - name: gateway
    rules:
      - alert: HighErrorRate
        expr: rate(kong_http_requests_errors_total[5m]) / rate(kong_http_requests_total[5m]) > 0.05
        for: 5m
        labels: { severity: critical }
        annotations:
          summary: "API Gateway error rate above 5%"

      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(kong_http_request_duration_ms_bucket[5m])) > 1000
        for: 5m
        labels: { severity: warning }
        annotations:
          summary: "P95 latency above 1000ms"

      - alert: UpstreamDown
        expr: kong_upstream_target_health{health="unhealthy"} > 0
        for: 1m
        labels: { severity: critical }
        annotations:
          summary: "Upstream target {{ $labels.target }} is unhealthy"

      - alert: RateLimitExceeded
        expr: rate(kong_http_response_headers_x_ratelimit_remaining_hour[5m]) < 10
        for: 2m
        labels: { severity: warning }
        annotations:
          summary: "Rate limit capacity running low on {{ $labels.route }}"
```

## Dashboard Metrics

```typescript
// Grafana dashboard JSON model (simplified)
const dashboard = {
  title: 'API Gateway Overview',
  panels: [
    { title: 'Requests per Second', type: 'graph', targets: [{ expr: 'rate(kong_http_requests_total[1m])' }] },
    { title: 'P95 Latency by Route', type: 'graph', targets: [{ expr: 'histogram_quantile(0.95, rate(kong_http_request_duration_ms_bucket[5m]))' }] },
    { title: 'Error Rate by Status', type: 'graph', targets: [{ expr: 'rate(kong_http_requests_errors_total[5m])' }] },
    { title: 'Upstream Health', type: 'stat', targets: [{ expr: 'kong_upstream_target_health{health="healthy"}' }] },
    { title: 'Rate Limit Usage', type: 'gauge', targets: [{ expr: 'sum(kong_http_requests_total) by (route)' }] },
    { title: 'Top Slow Endpoints', type: 'table', targets: [{ expr: 'topk(10, avg(kong_http_request_duration_ms) by (route))' }] },
  ],
};
```

## Key Points
- Track RED metrics (Rate, Errors, Duration) for every route and upstream
- Structure request logs with request_id, trace_id, latency breakdown
- Propagate distributed tracing context from gateway through all upstream services
- Configure active + passive health checks for all upstream targets
- Alert on error rate >5%, P95 latency >1s, unhealthy upstreams
