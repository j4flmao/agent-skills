# Service Mesh Observability

## Telemetry Collection

### Metrics Pipeline
Sidecar Envoy → Prometheus (scraping) → Grafana dashboards + AlertManager

| Metric | Source | Meaning |
|--------|--------|---------|
| `istio_request_total` | Envoy | Request count by source, destination, response code |
| `istio_request_duration_milliseconds` | Envoy | Latency p50/p90/p99 per service |
| `istio_request_bytes` | Envoy | Request size distribution |
| `istio_response_bytes` | Envoy | Response size distribution |
| `istio_tcp_sent_bytes_total` | Envoy | TCP throughput |
| `pilot_total_xds_rejects` | Pilot | Config push failures |
| `citadel_server_cert_chain_expiry_seconds` | Citadel | mTLS certificate expiry |

### Distributed Tracing
Sidecar auto-injects trace headers (x-request-id, x-b3-traceid, x-datadog-traceid).

| Backend | Istio Integration |
|---------|------------------|
| Jaeger | Default, trace sampling via Telemetry API |
| Zipkin | Compatible, `meshConfig.defaultConfig.tracing.zipkin.address` |
| Datadog | Trace agent as DaemonSet, `meshConfig.defaultConfig.tracing.datadog.address` |
| Lightstep | OTLP exporter via Telemetry API |

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-default
  namespace: istio-system
spec:
  tracing:
  - randomSamplingPercentage: 1.0
    customTags:
      environment:
        literal:
          value: production
```

### Access Logging

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-default
  namespace: istio-system
spec:
  accessLogging:
  - providers:
    - name: envoy
    match:
      mode: CLIENT_AND_SERVER
    filter:
      expression: response.code >= 400 || request.headers["x-log"] == "1"
```

## WASM Extensions

Custom Envoy filters for metrics, logging, header manipulation.

| Use Case | WASM Extension |
|----------|---------------|
| Request body logging | Custom WASM filter |
| Rate limiting per header | Envoy rate limit filter |
| JWT validation | WASM JWT filter |
| Custom metrics | WASM stats filter |

## Kiali Deep

| Feature | What It Shows |
|---------|--------------|
| Graph | Service topology, traffic rate, error rate, response time |
| Tracing | Jaeger integration — click a node to see traces |
| Metrics | Inbound/outbound request volume, duration, size |
| Istio Config | VirtualService, DestinationRule validation and warnings |
| Workloads | Pod-level health, sidecar status, proxy version |

### Kiali Health

| Health Indicator | Criteria |
|-----------------|----------|
| Healthy | Error rate <5%, no configuration issues |
| Degraded | Error rate 5-20% |
| Unhealthy | Error rate >20% or sidecar missing |

## Grafana Dashboards

| Dashboard | Metrics |
|-----------|---------|
| Istio Control Plane | Pilot/Galley/Citadel resource usage, xDS pushes, validation failures |
| Istio Mesh | Service-level RED metrics (Rate, Errors, Duration) |
| Istio Performance | Sidecar resource usage, Envoy connection pool, WASM memory |
| Istio Service | Per-service metrics with upstream/downstream breakdown |
