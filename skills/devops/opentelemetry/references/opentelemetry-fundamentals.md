# OpenTelemetry Fundamentals: Getting Started with Zero-Code Instrumentation and Standard Configuration

The quickest correct path to telemetry with OpenTelemetry: resource identity, the standard `OTEL_*` environment variables, zero-code (auto) instrumentation per language, OTLP endpoints, and verifying data end to end. Concepts are in `otel-concepts.md`, manual SDK work in `sdk-instrumentation.md`, Collector pipelines in `collector-pipeline.md`.

## Minimum Viable Setup

```
app (SDK / auto-instrumentation) --OTLP--> Collector (agent or gateway) --> backend(s)
```

Send to a Collector rather than directly to a vendor: it centralizes batching, retries, sampling, redaction and routing.

## Resource Identity

Every signal carries resource attributes describing the producer. Set at least:

| Attribute | Example | Why |
|---|---|---|
| `service.name` | `checkout` | Primary grouping key in every backend |
| `service.version` | `2.14.1` | Correlate regressions with releases |
| `deployment.environment.name` | `prod` | Separate environments (older convention: `deployment.environment`) |
| `service.namespace` | `shop` | Group related services |
| `service.instance.id` | pod UID / hostname | Distinguish replicas |

Kubernetes attributes (`k8s.pod.name`, `k8s.namespace.name`, ...) are best added by the Collector's `k8sattributes` processor or resource detectors.

## Standard Environment Variables

```bash
export OTEL_SERVICE_NAME=checkout
export OTEL_RESOURCE_ATTRIBUTES="service.version=2.14.1,deployment.environment.name=prod,service.namespace=shop"
export OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
export OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf      # or grpc (port 4317)
export OTEL_TRACES_EXPORTER=otlp
export OTEL_METRICS_EXPORTER=otlp
export OTEL_LOGS_EXPORTER=otlp
export OTEL_TRACES_SAMPLER=parentbased_traceidratio
export OTEL_TRACES_SAMPLER_ARG=0.2
export OTEL_PROPAGATORS=tracecontext,baggage
```

| Variable | Notes |
|---|---|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Base URL; for `http/protobuf` the SDK appends `/v1/traces`, `/v1/metrics`, `/v1/logs` |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` | Per-signal override; used as-is (no path appended) |
| `OTEL_EXPORTER_OTLP_HEADERS` | e.g. auth headers; load from secrets, never commit |
| `OTEL_SDK_DISABLED` | `true` disables the SDK (useful in tests) |
| `OTEL_METRIC_EXPORT_INTERVAL` | Milliseconds between metric exports (default 60000) |

Default ports: 4317 (OTLP/gRPC), 4318 (OTLP/HTTP). Language defaults for protocol differ; set it explicitly.

## Zero-Code Instrumentation per Language

| Language | How |
|---|---|
| Java | `java -javaagent:opentelemetry-javaagent.jar -jar app.jar` |
| Python | `pip`/`uv add opentelemetry-distro opentelemetry-exporter-otlp`, `opentelemetry-bootstrap -a install`, run with `opentelemetry-instrument python app.py` |
| Node.js | `npm i @opentelemetry/api @opentelemetry/auto-instrumentations-node`, run with `node --require @opentelemetry/auto-instrumentations-node/register app.js` |
| .NET | OpenTelemetry .NET automatic instrumentation (profiler-based) or NuGet instrumentation packages |
| Go | No agent for compiled binaries in the same way; use instrumentation libraries (e.g. `otelhttp`, `otelgrpc`) or eBPF-based auto-instrumentation (OpenTelemetry Go auto-instrumentation / OBI) |
| PHP, Ruby | Extension/gem based auto-instrumentation |

Kubernetes: the OpenTelemetry Operator injects auto-instrumentation via an `Instrumentation` resource and pod annotations:

```yaml
apiVersion: opentelemetry.io/v1alpha1
kind: Instrumentation
metadata: {name: default, namespace: shop}
spec:
  exporter:
    endpoint: http://otel-collector.observability:4318
  propagators: [tracecontext, baggage]
  sampler:
    type: parentbased_traceidratio
    argument: "0.2"
---
# on the Deployment pod template
metadata:
  annotations:
    instrumentation.opentelemetry.io/inject-java: "true"   # or -python, -nodejs, -dotnet, -go
```

## Minimal Collector for Development

```yaml
receivers:
  otlp:
    protocols:
      grpc: {endpoint: 0.0.0.0:4317}
      http: {endpoint: 0.0.0.0:4318}
processors:
  memory_limiter: {check_interval: 1s, limit_percentage: 80, spike_limit_percentage: 25}
  batch: {}
exporters:
  debug: {verbosity: detailed}
service:
  pipelines:
    traces:  {receivers: [otlp], processors: [memory_limiter, batch], exporters: [debug]}
    metrics: {receivers: [otlp], processors: [memory_limiter, batch], exporters: [debug]}
    logs:    {receivers: [otlp], processors: [memory_limiter, batch], exporters: [debug]}
```

The `debug` exporter replaced the removed `logging` exporter. Bind receivers to `0.0.0.0` only where the network is trusted; recent Collector versions default to `localhost`.

## Verifying End to End

1. Generate traffic; check Collector output (`debug` exporter) or its own metrics (`otelcol_receiver_accepted_spans`, `otelcol_exporter_sent_spans`).
2. Confirm `service.name` is not `unknown_service:...` (means it was not set).
3. Check context propagation: a request crossing two services shows one trace with parent/child spans.
4. Confirm logs carry `trace_id`/`span_id` (log bridges/appenders for your logging library).

## Common Mistakes

| Mistake | Effect |
|---|---|
| No `service.name` | `unknown_service` in backends |
| gRPC exporter pointed at 4318 (or HTTP at 4317) | Export failures |
| Per-signal endpoint without `/v1/<signal>` path | 404 from collector |
| Sampling configured differently per service without parent-based sampler | Broken traces |
| High-cardinality attributes on metrics (user IDs, URLs with IDs) | Cost and backend overload |

## Checklist
- [ ] `service.name`, version and environment set for every service
- [ ] Protocol and endpoint configured explicitly; exporter headers from secrets
- [ ] Zero-code instrumentation enabled (agent, distro, or Operator injection)
- [ ] Collector with `memory_limiter` and `batch` in every pipeline
- [ ] End-to-end trace across two services verified; logs correlated
