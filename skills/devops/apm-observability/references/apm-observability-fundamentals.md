# APM and Observability Fundamentals

## Overview
APM (Application Performance Monitoring) and observability enable teams to understand system behavior, diagnose issues, and optimize performance. Observability is based on three pillars: metrics, logs, and traces. APM focuses specifically on application-level performance monitoring.

## Core Concepts

### Three Pillars of Observability
Metrics: numeric data points collected over time (CPU, memory, request rate, latency). Metrics are aggregated and stored in time-series databases (Prometheus, Graphite). Best for alerting and dashboards.

Logs: structured or unstructured event records with timestamps. Logs are high-cardinality and expensive to store long-term. Best for debugging specific issues and audit trails.

Traces: end-to-end request tracking across distributed services. Each trace consists of spans (individual operations). Traces enable root cause analysis in microservices architectures.

### Telemetry Signals
RED metrics: Rate (requests per second), Errors (failed requests), Duration (latency distribution). USE metrics: Utilization, Saturation, Errors for infrastructure resources.

### Distributed Tracing
Trace context propagates via headers (W3C Trace Context, Zipkin B3). Each service extracts and forwards context. Spans include operation name, start time, duration, tags, and parent span ID. Traces are sampled to manage storage costs.

## Key Components

### Instrumentation
Automatic: agent-based (Java agent, Python agent, eBPF). No code changes required. Covers common frameworks automatically. Less control over what"s captured.

Manual: SDK-based (OpenTelemetry SDK). Requires code changes. Full control over spans, metrics, and logs. Better for custom business logic monitoring.

### Data Pipeline
Application -> OpenTelemetry Collector -> Backend (Datadog, Grafana, Jaeger, SigNoz) -> Visualization. The collector provides batching, filtering, sampling, and multi-destination export.

### Storage Backends
Prometheus: metrics storage and alerting (pull model). Grafana Mimir/Cortex: horizontally scalable Prometheus. Jaeger/Tempo: distributed tracing storage. Loki/SigNoz: log aggregation with label indexing.

## Basic Setup

### OpenTelemetry Instrumentation (Python)
```python
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.exporter import OTLPSpanExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.instrumentation.flask import FlaskInstrumentor

provider = TracerProvider()
processor = BatchSpanProcessor(OTLPSpanExporter())
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)

app = Flask(__name__)
FlaskInstrumentor().instrument_app(app)
```

### Prometheus Metrics
```yaml
scrape_configs:
  - job_name: "myapp"
    static_configs:
      - targets: ["localhost:8000"]
    metrics_path: "/metrics"
    scrape_interval: 15s
```

## Best Practices
- Start with RED metrics for services, USE metrics for infrastructure.
- Add custom spans for business-critical operations.
- Use structured logging (JSON format) for all services.
- Sample traces at appropriate rates (1-10% for high-traffic services).
- Create SLO-based alerts, not threshold-based alerts.
- Use service graphs to visualize service dependencies.
- Set retention policies: raw metrics 30 days, aggregated 1 year.
- Monitor the monitoring system itself (alert on collector failures).

## Common Tools
- OpenTelemetry: industry standard for telemetry collection.
- Prometheus: metrics collection and alerting.
- Grafana: visualization and dashboarding.
- Datadog: SaaS APM with built-in traces, metrics, and logs.
- New Relic: SaaS APM with AI-powered insights.
- Jaeger: distributed tracing backend.
- ELK Stack (Elasticsearch, Logstash, Kibana): log aggregation.

## References
- apm-observability-advanced.md -- Advanced APM and Observability topics
- opentelemetry-setup.md -- OpenTelemetry Setup
- prometheus-grafana.md -- Prometheus and Grafana
- distributed-tracing.md -- Distributed Tracing
- logging-patterns.md -- Logging Patterns
