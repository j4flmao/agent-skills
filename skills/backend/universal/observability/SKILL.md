---
name: backend-observability
description: >
  Use this skill when the user says 'observability', 'telemetry', 'OpenTelemetry', 'tracing', 'metrics', 'logging', 'distributed tracing', 'monitoring', 'instrumentation', 'trace', 'span', 'otel', 'signal'. This skill sets up unified observability using OpenTelemetry with traces, metrics, and logs working together as one telemetry pipeline. Applies to any backend stack. Do NOT use for: frontend observability, infrastructure monitoring, or APM vendor setup.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, universal, observability, telemetry, opentelemetry]
---

# Backend Observability

## Purpose
Unify traces, metrics, and logs into a single OpenTelemetry pipeline so every request is measurable end-to-end with correlation across all three signals. Observability means you can understand the internal state of a system by examining its outputs — without having to ship new code.

## Agent Protocol

### Trigger
Exact user phrases: "observability", "telemetry", "OpenTelemetry", "tracing", "metrics", "logging", "distributed tracing", "monitoring", "instrumentation", "otel setup", "trace", "span".

### Input Context
- Language/framework of the service.
- Existing monitoring infrastructure (APM vendor, self-hosted collector, none).
- Deployment environment (Kubernetes, VMs, serverless).

### Output Artifact
OTel configuration for the service. No file unless requested.

### Response Format
```
Signal: {traces|metrics|logs}
Exporter: {OTLP|Jaeger|Prometheus|Console}
Sampling: {rate|head-based|tail-based}
```

### Completion Criteria
- [ ] All three signals (traces, metrics, logs) configured.
- [ ] Trace context propagates across service boundaries.
- [ ] At least one custom metric or span attribute defined.
- [ ] Exporter configured and endpoint reachable.
- [ ] No PII or secrets in span attributes or log records.

### Max Response Length
4 lines per signal. Unlimited for full configuration.

## Architecture Decision Tree

### Which Signals to Collect?

```
What questions do you need to answer?
  ├── "Why is this request slow?"
  │   └── Distributed tracing (traces) — spans show where time is spent
  ├── "Is the system healthy right now?"
  │   └── RED metrics (Rate, Errors, Duration) — dashboards and alerts
  ├── "What happened during the incident?"
  │   └── Structured logs — drill down into specific requests
  └── "How do these relate?"
      └── All three, correlated by trace ID — the observability triad
```

### Sampling Decision

```
Can you afford to capture every request?
  ├── Yes (< 1000 req/s per service) → Head-based probabilistic sampling
  │   ├── Sample rate: 10-100% depending on volume
  │   └── Consistent: same trace ID always sampled or not
  └── No (> 1000 req/s per service) → Tail-based sampling
      ├── Keep all ERROR and SLOW traces
      ├── Sample healthy traces at 1-5%
      └── Requires OTel Collector with tail sampling processor
```

### OTel Pipeline Architecture

```
Application SDK → OTLP exporter → OpenTelemetry Collector → Backend(s)
                                        │
                              ┌─────────┼─────────┐
                              │         │         │
                          Jaeger   Prometheus    Loki
                         (traces)   (metrics)   (logs)
```

### Collector Deployment

```
Single service:
  ├── Direct export to backend (simple, no ops)
  │   ├── PRO: No additional infrastructure
  │   └── CON: Backpressure on application, vendor lock-in
  └── Sidecar collector (per-pod, K8s)
      ├── PRO: Backpressure isolation, batching, retry
      └── CON: Slightly more resource usage

Multi-service:
  └── Central collector (gateway)
      ├── PRO: Centralized config, tail-based sampling, batch export
      └── CON: Single point of failure (run 2+ for HA)
```

## Workflow

### Step 1: Install OTel SDK
```bash
npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
pip install opentelemetry-distro opentelemetry-exporter-otlp
go get go.opentelemetry.io/otel go.opentelemetry.io/otel/exporters/otlp/otlptrace
```

### Step 2: Configure the SDK
```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-grpc');
const { OTLPLogExporter } = require('@opentelemetry/exporter-logs-otlp-grpc');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');

const sdk = new NodeSDK({
  serviceName: 'payment-service',
  traceExporter: new OTLPTraceExporter({ url: 'http://otel-collector:4317' }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({ url: 'http://otel-collector:4317' }),
    exportIntervalMillis: 60000,
  }),
  logRecordProcessor: new BatchLogRecordProcessor(
    new OTLPLogExporter({ url: 'http://otel-collectator:4317' })
  ),
  instrumentations: [getNodeAutoInstrumentations()],
  sampler: new ParentBasedSampler({
    root: new TraceIdRatioBasedSampler(0.1), // 10% sampling
  }),
});
sdk.start();
```

### Step 3: Add Manual Instrumentation
```javascript
const tracer = trace.getTracer('payment-service');

async function processPayment(orderId, amount) {
  const span = tracer.startSpan('process-payment', {
    attributes: { 'payment.order_id': orderId, 'payment.amount': amount },
  });
  return await context.with(trace.setSpan(context.active(), span), async () => {
    try {
      const result = await paymentGateway.charge(orderId, amount);
      span.setAttribute('payment.status', result.status);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

### Step 4: Metrics
```javascript
const meter = metrics.getMeter('payment-service');
const paymentCounter = meter.createCounter('payments.total', {
  description: 'Total payments processed',
});
const paymentDuration = meter.createHistogram('payments.duration', {
  description: 'Payment processing duration',
  unit: 'ms',
});

// Record metrics
paymentCounter.add(1, { status: 'success', method: 'credit_card' });
paymentDuration.record(durationMs, { status: 'success' });
```

### Step 5: Correlate Logs
```javascript
const spanContext = trace.getSpan(context.active())?.spanContext();
logger.info({
  'trace.id': spanContext?.traceId,
  'span.id': spanContext?.spanId,
  'event.action': 'payment.processed',
  'event.duration': durationMs,
}, 'Payment processed successfully');
```

### Step 6: Export and Visualize
Send OTLP to an OpenTelemetry Collector. The collector routes to your backend:
```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
      http:
processors:
  batch:
  tail_sampling:
    policies:
      - name: keep-errors
        type: status_code
        config: { status_code: ERROR }
      - name: keep-slow
        type: latency
        config: { threshold_ms: 1000 }
exporters:
  otlp/jaeger: { endpoint: jaeger:4317 }
  prometheus: { endpoint: "0.0.0.0:8889" }
  otlp/loki: { endpoint: loki:3100 }
service:
  pipelines:
    traces: [otlp, tail_sampling, batch, otlp/jaeger]
    metrics: [otlp, batch, prometheus]
    logs: [otlp, batch, otlp/loki]
```

## Implementation Patterns

### Auto-Instrumentation (Zero Code)
```python
# Python: OTel auto-instrumentation via CLI
# opentelemetry-instrument \
#   --service_name payment-service \
#   --traces_exporter otlp \
#   --metrics_exporter otlp \
#   uvicorn main:app
```

```go
// Go: OTel HTTP middleware
import (
    "go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
)
handler := otelhttp.NewHandler(mux, "payment-service")
http.ListenAndServe(":8080", handler)
```

### Custom Span Attributes Pattern
```typescript
// Semantic conventions for consistent attribute naming
span.setAttribute('db.system', 'postgresql');
span.setAttribute('db.statement', 'SELECT * FROM orders WHERE id = $1');
span.setAttribute('db.operation', 'SELECT');
span.setAttribute('net.peer.name', 'postgres-prod.c1abc2.us-east-1.rds.amazonaws.com');
```

### RED Metrics Pattern
```typescript
// Rate, Errors, Duration for every endpoint
class REDMetrics {
  private rate: Counter;
  private errors: Counter;
  private duration: Histogram;

  constructor(meter: Meter, endpointName: string) {
    this.rate = meter.createCounter(`${endpointName}.requests`);
    this.errors = meter.createCounter(`${endpointName}.errors`);
    this.duration = meter.createHistogram(`${endpointName}.duration`, { unit: 'ms' });
  }

  record(status: number, durationMs: number): void {
    this.rate.add(1);
    if (status >= 500) this.errors.add(1);
    this.duration.record(durationMs);
  }
}
```

## Production Considerations

### Sampling Strategy Comparison
| Strategy | Description | Best For | Trade-off |
|----------|-------------|----------|-----------|
| Head-based (probabilistic) | Sample decision at request start | Low-medium volume | May miss rare errors |
| Head-based (rate-limited) | Max N traces per second | High volume | Uneven sampling |
| Tail-based | Sample after request completes | High volume, need errors | Higher memory, collector needed |
| Dynamic | Vary rate by endpoint | Mixed workloads | Complex configuration |

### Sampling Rate Guidelines
| Service Volume | Sample Rate | Rationale |
|----------------|-------------|-----------|
| < 100 req/s | 100% | Full visibility |
| 100-1000 req/s | 10-50% | Balance cost vs visibility |
| 1000-10000 req/s | 1-10% | Statistical significance |
| > 10000 req/s | 1% + tail-based | Capture errors, sample rest |

### Cost Management
| Signal | Storage Cost Driver | Optimization |
|--------|-------------------|--------------|
| Traces | Span count, attribute cardinality | Sample, limit attributes |
| Metrics | Time series cardinality | Keep labels < 10 per metric |
| Logs | Volume, retention | Sample INFO, keep ERROR 100% |

## Security

### Sensitive Data Protection
- Never include PII, passwords, tokens, or secrets in span attributes
- Use span attribute value redaction in the collector:
```yaml
processors:
  attributes:
    actions:
      - key: http.request.header.authorization
        action: delete
      - key: db.statement
        action: hash
```

### Authentication and Authorization
- mTLS between SDK and Collector for production
- API keys/tokens for SaaS backends
- Restrict access to observability backends (Jaeger, Grafana)
- Audit log of who accessed tracing data

## Anti-Patterns

1. **Observability as an afterthought**: Adding instrumentation after a production incident is too late. Instrument from day one.
2. **No context propagation**: Traces that don't span service boundaries are local debug logs, not distributed traces. Always propagate `traceparent` header.
3. **Over-instrumentation**: Every function call does not need a span. Focus on service boundaries, database calls, and external API calls.
4. **High-cardinality metric labels**: `user_id` as a metric label creates millions of time series. Use logging for per-user data, metrics for aggregates.
5. **Not sampling**: Capturing 100% of traces at scale generates enormous data volume and cost. Always sample in production.
6. **Custom instrumentation frameworks**: Use OpenTelemetry. Custom tracing libraries don't interoperate and waste engineering time.
7. **Ignoring the collector**: Direct export from SDK to backend couples your application to the backend. The collector provides buffer, retry, and transformation.

## Performance

### Overhead Budget
| Signal | CPU Overhead | Memory Overhead | Latency Impact |
|--------|-------------|-----------------|----------------|
| Traces (auto-instr) | 1-3% | 10-50MB | <1μs per span |
| Metrics | <1% | 5-10MB | <1μs |
| Logs | <1% | 5-20MB | <1μs |

### Collector Sizing
```yaml
# Per 1000 spans/second
collector:
  cpu: 2 cores
  memory: 4GB
  batch_timeout: 5s
  batch_size: 512
```

## Rules
- Always set `service.name` — it is the primary identifier for all signals.
- Never sample traces differently for the same service — use a consistent head-based sampling decision.
- Always propagate trace context via W3C TraceContext headers (`traceparent`, `tracestate`).
- Never log sensitive data in span attributes or log records.
- Use semantic conventions for span names and attribute keys (`http.method`, `http.url`, `db.system`).
- Metrics should have at least one attribute for dimensionality.
- Set a minimum of 1 in 1000 sampling rate in production, or use tail-based sampling for high-volume services.
- Use the OpenTelemetry Collector as a gateway — never export directly from SDK to SaaS in production.
- Monitor observability pipeline health: export success rate, exporter queue size, processing latency.

## References
  - references/business-metrics.md — Business Metrics Reference
  - references/cost-of-observability.md — Cost of Observability Reference
  - references/distributed-tracing.md — Distributed Tracing Reference
  - references/observability-alerting.md — Observability Alerting
  - references/observability-cost-optimization.md — Observability Cost Optimization
  - references/observability-pillars.md — Observability Pillars: Traces, Metrics, Logs
  - references/observability-setup.md — Backend Observability
  - references/otel-setup.md — OpenTelemetry SDK Setup Guide
## Handoff
No artifact produced unless requested.
Next skill: resilience-patterns — add circuit breakers and retries to the instrumented service.
Carry forward: service name, OTel exporter endpoint, sampling decision.
