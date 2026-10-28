# Gateway Tracing and Access Logs with OpenTelemetry

The gateway sees every request first, so it is the best place to start traces, assign request IDs, and emit consistent access logs. This file covers trace context propagation, OpenTelemetry setup on common gateways, and access log design. RED metrics, dashboards, and alert rules are in `gateway-observability.md`.

## Goals

1. Every request gets a trace ID and a request ID before it reaches a backend.
2. The gateway span records routing decisions (route, upstream, retries, auth outcome).
3. Access logs and traces can be joined via the trace ID.
4. Sampling keeps cost bounded without losing errors.

## Trace Context Propagation

| Header | Standard | Notes |
|--------|----------|-------|
| `traceparent` | W3C Trace Context | `00-<trace-id 32 hex>-<span-id 16 hex>-<flags>`; default for OpenTelemetry |
| `tracestate` | W3C Trace Context | Vendor-specific data; pass through unchanged |
| `baggage` | W3C Baggage | Key-value context; do not put PII or secrets in it |
| `b3` / `X-B3-*` | Zipkin B3 | Legacy; support only if backends require it |
| `X-Request-ID` | Convention | Human-friendly correlation ID, logged everywhere |

Rules:
- For external clients, decide whether to trust incoming `traceparent`. Public edges often start a new trace (or keep the incoming one only as a span link) to prevent clients from forcing sampling or polluting traces.
- Always forward context to upstreams; a gateway that drops `traceparent` breaks every downstream trace.

## Envoy

```yaml
http_connection_manager:
  generate_request_id: true
  tracing:
    random_sampling: { value: 10 }          # percent for new traces
    provider:
      name: envoy.tracers.opentelemetry
      typed_config:
        "@type": type.googleapis.com/envoy.config.trace.v3.OpenTelemetryConfig
        service_name: edge-gateway
        grpc_service:
          envoy_grpc: { cluster_name: otel_collector }
          timeout: 0.25s
```

The `otel_collector` cluster must be defined with HTTP/2 enabled for OTLP/gRPC.

## NGINX

The official `ngx_otel_module` provides OpenTelemetry tracing:

```nginx
load_module modules/ngx_otel_module.so;

http {
    otel_exporter { endpoint otel-collector:4317; }
    otel_service_name edge-nginx;
    otel_trace on;
    otel_trace_context propagate;      # extract incoming context and inject to upstream

    server {
        location /api/ {
            proxy_pass http://backend;
            proxy_set_header X-Request-ID $request_id;
        }
    }
}
```

## Kong

Enable the `opentelemetry` plugin globally:

```yaml
plugins:
  - name: opentelemetry
    config:
      traces_endpoint: http://otel-collector:4318/v1/traces
      resource_attributes:
        service.name: kong-edge
      header_type: w3c
```

Kong also needs `tracing_instrumentations` (e.g. `all` or a list) and `tracing_sampling_rate` set in `kong.conf` to produce spans for internal phases.

## Kubernetes Gateway API Implementations

Envoy Gateway, Istio, and others expose tracing through their own CRDs (e.g. `EnvoyProxy` telemetry settings, Istio `Telemetry`). Configure the provider once at the gateway class or mesh level instead of per route.

## OpenTelemetry Collector in Front of Backends

```yaml
receivers:
  otlp:
    protocols: { grpc: { endpoint: 0.0.0.0:4317 }, http: { endpoint: 0.0.0.0:4318 } }
processors:
  batch: {}
  tail_sampling:
    decision_wait: 10s
    policies:
      - name: errors
        type: status_code
        status_code: { status_codes: [ERROR] }
      - name: slow
        type: latency
        latency: { threshold_ms: 1000 }
      - name: baseline
        type: probabilistic
        probabilistic: { sampling_percentage: 5 }
exporters:
  otlp:
    endpoint: tempo:4317
    tls: { insecure: true }
service:
  pipelines:
    traces: { receivers: [otlp], processors: [tail_sampling, batch], exporters: [otlp] }
```

Tail sampling keeps all errors and slow requests while sampling healthy traffic. It requires all spans of a trace to reach the same collector instance (use the `loadbalancing` exporter in a two-tier setup).

## Access Log Design

Emit one structured JSON line per request.

| Field | Example | Why |
|-------|---------|-----|
| `ts` | RFC 3339 timestamp | Ordering |
| `trace_id` / `request_id` | `4bf92f...` | Join with traces and app logs |
| `method`, `route`, `path` | `GET`, `orders-api`, `/v1/orders/42` | Route is low-cardinality for aggregation |
| `status`, `upstream_status` | `502`, `-` | Distinguish gateway vs backend errors |
| `duration_ms`, `upstream_duration_ms` | `120`, `95` | Gateway overhead = difference |
| `upstream_addr` | `10.0.3.7:8080` | Find bad instances |
| `bytes_in`, `bytes_out` | | Abuse and cost |
| `client_ip` | trusted value after `X-Forwarded-For` processing | Rate-limit and security analysis |
| `consumer` / `client_id` | `mobile-app` | Per-client SLOs |
| `response_flags` (Envoy) | `UT`, `UH`, `RL` | Root cause of failures |

Envoy JSON log format:

```yaml
access_log:
  - name: envoy.access_loggers.stdout
    typed_config:
      "@type": type.googleapis.com/envoy.extensions.access_loggers.stream.v3.StdoutAccessLog
      log_format:
        json_format:
          ts: "%START_TIME%"
          trace_id: "%REQ(TRACEPARENT)%"
          request_id: "%REQ(X-REQUEST-ID)%"
          method: "%REQ(:METHOD)%"
          path: "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%"
          status: "%RESPONSE_CODE%"
          flags: "%RESPONSE_FLAGS%"
          duration_ms: "%DURATION%"
          upstream_ms: "%RESP(X-ENVOY-UPSTREAM-SERVICE-TIME)%"
          upstream: "%UPSTREAM_HOST%"
```

## Privacy and Cost

- Never log `Authorization`, cookies, API keys, or request bodies by default.
- Strip query strings that may carry tokens, or log only allow-listed parameters.
- Use `route` rather than raw path as a metric label to avoid cardinality explosions.
- Set log retention per data classification.

## Pitfalls

- Sampling decided independently at gateway and services → broken partial traces; respect the parent's sampled flag.
- Gateway generating a new `X-Request-ID` even when a trusted internal caller already sent one.
- Exporter timeouts too high, adding latency when the collector is down; export asynchronously with small timeouts.
- Logging client IP from the socket behind a load balancer (always the LB's IP).

## Checklist

- [ ] W3C `traceparent` propagated to all upstreams
- [ ] Policy for trusting external trace context documented
- [ ] Gateway spans include route, upstream, retry, and auth attributes
- [ ] Tail sampling keeps errors and slow requests
- [ ] JSON access logs with trace ID, route, upstream timing, response flags
- [ ] Sensitive headers and query parameters excluded from logs
