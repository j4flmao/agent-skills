# Observability Pillars: Traces, Metrics, Logs

## The Three Pillars

### 1. Traces
Traces represent the path of a single request as it travels through distributed system components.

**Anatomy of a trace:**
```
Trace (root)
├── Span: HTTP GET /orders/123
│   ├── Span: Auth middleware check
│   ├── Span: DB query get_order (SQL: SELECT * FROM orders WHERE id=123)
│   │   └── Span: DB connection acquire (from pool)
│   └── Span: HTTP POST /payment/process (outgoing)
│       └── Span: Payment gateway response
└── Span: Response serialization
```

**Key trace concepts:**
- Trace ID: unique identifier for the entire request flow (16 or 32 hex bytes).
- Span ID: unique identifier for a single unit of work (8 bytes).
- Parent span ID: links a span to its parent, forming the trace tree.
- Span context: immutable bag of trace ID, span ID, and trace flags.
- Attributes: key-value pairs tagging spans with metadata.

**When to create a span:**
- Every external request (incoming and outgoing).
- Every database/messaging call.
- Every significant internal operation (batch, job, CRON execution).
- Operations with high latency variance.

### 2. Metrics
Metrics are numeric measurements aggregated over time intervals.

**Metric types:**
- Counter: monotonically increasing (requests total, errors total).
- UpDownCounter: can increase and decrease (queue depth, active connections).
- Histogram: distribution of values (latency, payload size).
- Gauge: point-in-time snapshot (memory usage, CPU load).
- ExponentialHistogram: histogram with exponential bucket boundaries.

**Best practices:**
- Every counter must have at least one attribute for grouping.
- Use histograms for latency, not gauges or counters.
- Define Views to rename, aggregate, or filter metrics before export.
- Baseline metrics: request rate, error rate, latency (p50, p95, p99), saturation.

**Exemplars:**
Exemplars link metrics to traces by attaching a trace ID + span ID to a metric data point. This lets you jump from a high-latency p99 measurement to the specific trace that caused it.

### 3. Logs
Logs are discrete event records with a timestamp and structured payload.

**Structured logging:**
```json
{
  "timestamp": "2026-05-23T10:30:00.123Z",
  "severity": "error",
  "message": "Payment gateway timeout",
  "service": "payment-service",
  "traceId": "0af7651916cd43dd",
  "spanId": "b7ad6b7169203331",
  "resource": {
    "orderId": "ord_123",
    "amount": 49.99,
    "gateway": "stripe"
  }
}
```

**Log levels:** TRACE, DEBUG, INFO, WARN, ERROR, FATAL.
Production default: INFO. Never log at DEBUG in production except transient debugging.

**Correlation:**
The most important field in a log is the traceId. Without it, logs are disconnected islands. Every log statement must carry the active trace ID and span ID.

## Signal Correlation

### Traces + Metrics
- Use exemplars to attach trace context to metric data points.
- RED metrics (Rate, Errors, Duration) should map to trace-based measurements.

### Traces + Logs
- Inject traceId and spanId into every log record.
- The logging SDK extension (`@opentelemetry/winston-transport`, `@opentelemetry/pino`) does this automatically.

### Metrics + Logs
- Use metric alerts to trigger log investigations.
- A spike in error rate (metric) means it is time to search ERROR-level logs.

## Unified Pipeline

```
Application
├── OTel SDK ──► OTLP ──► Collector ──► Backends
│   ├── Traces  │                    ├── Jaeger/Tempo/DataDog
│   ├── Metrics │                    ├── Prometheus/Datadog
│   └── Logs    │                    └── Loki/Elasticsearch/Splunk
└── (manual instrumentation)
```

The OTel Collector is the single ingestion point. It can sample, filter, batch, and route signals to multiple backends.

## Anti-Patterns
- **Metrics-only observability:** You know something is slow but have no idea which service or request caused it.
- **Logs-only observability:** You read log files but have no aggregate picture of system health.
- **No correlation IDs:** Your traces, metrics, and logs cannot be connected.
- **Siloed tools:** One tool for traces, another for metrics, another for logs — no unified query interface.
- **Over-instrumentation:** Thousands of useless spans and metrics that are never queried.
