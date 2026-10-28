# Observability Fundamentals: Signals, Instrumentation and SLOs

Observability is the ability to answer new questions about a system's behavior from the telemetry it emits, without shipping new code. This reference covers the signal types, correlation, instrumentation with OpenTelemetry, the RED/USE methods, and SLO basics. Deeper material: `otel-guide.md`, `alerting-strategies.md`, `log-aggregation.md`, `custom-metrics.md`.

## Monitoring vs Observability

| Monitoring | Observability |
|------------|---------------|
| Known failure modes, predefined dashboards and alerts | Unknown unknowns, ad hoc exploration |
| "Is it up? Is CPU high?" | "Why are checkout requests from region X slow for users on app version Y?" |
| Mostly aggregated metrics | High-cardinality, correlated metrics, traces, logs |

Both are needed: alerts on symptoms, exploration for diagnosis.

## Signal Types

| Signal | Shape | Strength | Cost driver |
|--------|-------|----------|-------------|
| Metrics | Numeric time series with labels | Cheap aggregation, alerting, long retention | Label cardinality |
| Logs | Timestamped events (structured preferred) | Detail and context | Volume |
| Traces | Tree of spans for one request across services | Latency breakdown, dependencies | Span volume (sampling) |
| Profiles | Continuous CPU/memory/lock profiles | Code-level hotspots | Sampling rate |
| Events | Deploys, config changes, incidents | Change correlation | Low |

## Correlation

The value comes from linking signals:
- Propagate W3C Trace Context (`traceparent` header) across services and queues.
- Put `trace_id` and `span_id` in every log line.
- Attach exemplars (trace IDs) to latency histogram metrics so a spike links to example traces.
- Use consistent resource attributes everywhere: `service.name`, `service.version`, `deployment.environment.name`, `k8s.namespace.name`, `cloud.region`.

## Structured Logging

```json
{"ts":"2026-10-27T10:15:00.123Z","level":"error","service.name":"checkout","trace_id":"4bf92f3577b34da6a3ce929d0e0e4736","span_id":"00f067aa0ba902b7","msg":"payment authorization failed","order_id":"o-981","provider":"stripe","http.status_code":402,"duration_ms":812}
```

- JSON, one event per line, consistent field names (OpenTelemetry semantic conventions where possible).
- Log levels with meaning: error = needs attention, warn = degraded but handled, info = significant business/lifecycle events, debug off in production by default.
- Never log secrets, tokens, full card numbers or unnecessary PII.

## Instrumentation with OpenTelemetry

OpenTelemetry (OTel) is the vendor-neutral standard for APIs, SDKs, semantic conventions and the OTLP protocol. Traces and metrics are stable in major languages; logs are stable in the spec and in several SDKs.

Approaches:
- Auto-instrumentation (Java agent, Python `opentelemetry-instrument`, Node `@opentelemetry/auto-instrumentations-node`, .NET auto-instrumentation, eBPF-based for Go) covers HTTP, gRPC, DB clients and messaging.
- Manual spans and attributes for business operations.

```python
from opentelemetry import trace
tracer = trace.get_tracer("checkout")

def place_order(order):
    with tracer.start_as_current_span("place_order") as span:
        span.set_attribute("order.items", len(order.items))
        span.set_attribute("payment.method", order.payment_method)
        result = charge(order)
        if not result.ok:
            span.set_status(trace.Status(trace.StatusCode.ERROR, result.reason))
        return result
```

Send OTLP to an OpenTelemetry Collector, which batches, enriches, samples and exports to backends.

## RED and USE Methods

| Method | For | Metrics |
|--------|-----|---------|
| RED | Request-driven services | Rate, Errors, Duration (latency distribution) |
| USE | Resources (CPU, disk, pools, queues) | Utilization, Saturation, Errors |
| Four golden signals (Google SRE) | Services | Latency, traffic, errors, saturation |

Use histograms for latency (not averages); report p50/p95/p99.

## Metric Naming and Cardinality

- Follow Prometheus conventions: `http_server_request_duration_seconds` (unit suffix, base units), counters end in `_total`.
- OTel semantic conventions define names like `http.server.request.duration`; exporters translate.
- Labels: bounded sets only (method, route template, status class, region). Never user IDs, request IDs, raw URLs or email addresses as metric labels; put them in traces/logs.

## SLIs, SLOs and Error Budgets

```
SLI: proportion of checkout requests completing successfully in < 800 ms
SLO: 99.5% over a rolling 28 days
Error budget: 0.5% of requests in the window may fail the SLI
```

- Measure SLIs as close to the user as feasible (load balancer, client telemetry).
- Alert on error budget burn rate (fast burn and slow burn windows), not on every blip.
- Use the remaining budget to decide between feature work and reliability work.

## Dashboards

- One service overview per service: RED metrics, saturation, dependencies, recent deploys.
- Top-down: user-facing SLOs first, then services, then infrastructure.
- Annotate deploys and incidents on graphs.

## Common Stack Options

| Layer | Open source | Managed examples |
|-------|-------------|------------------|
| Collection | OpenTelemetry Collector, Fluent Bit, Vector, Prometheus | Cloud agents |
| Metrics | Prometheus, Mimir, Thanos, VictoriaMetrics | Grafana Cloud, Datadog, cloud monitoring |
| Logs | Loki, OpenSearch, ClickHouse-based stores | Elastic Cloud, Datadog, Splunk |
| Traces | Tempo, Jaeger | Honeycomb, Datadog, cloud tracing |
| Visualization | Grafana | Vendor UIs |

## Checklist

- [ ] OTel SDK/auto-instrumentation in every service, exporting OTLP to a Collector
- [ ] Trace context propagated across HTTP, gRPC and messaging
- [ ] Structured JSON logs with trace IDs, no secrets
- [ ] RED metrics with histograms; bounded label cardinality
- [ ] Consistent resource attributes across signals
- [ ] SLOs defined for user journeys with burn-rate alerts
- [ ] Service dashboards with deploy annotations
