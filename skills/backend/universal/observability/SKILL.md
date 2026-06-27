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

## Implementation Patterns

### OpenTelemetry Initialization

```python
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.resources import Resource, SERVICE_NAME, SERVICE_VERSION, DEPLOYMENT_ENVIRONMENT
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

def setup_observability(service_name: str, environment: str, version: str, otlp_endpoint: str):
    resource = Resource.create({
        SERVICE_NAME: service_name,
        SERVICE_VERSION: version,
        DEPLOYMENT_ENVIRONMENT: environment,
    })

    # Tracing
    tracer_provider = TracerProvider(resource=resource)
    span_exporter = OTLPSpanExporter(endpoint=otlp_endpoint)
    span_processor = BatchSpanProcessor(span_exporter)
    tracer_provider.add_span_processor(span_processor)
    trace.set_tracer_provider(tracer_provider)

    # Metrics
    metric_exporter = OTLPMetricExporter(endpoint=otlp_endpoint)
    metric_reader = PeriodicExportingMetricReader(metric_exporter)
    meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
    metrics.set_meter_provider(meter_provider)

    return trace.get_tracer(service_name), metrics.get_meter(service_name)
```

### Structured Logging

```python
import json
import logging
from datetime import datetime

class StructuredLogFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        if hasattr(record, "trace_id"):
            log_entry["trace_id"] = record.trace_id
        if hasattr(record, "span_id"):
            log_entry["span_id"] = record.span_id
        if record.exc_info and record.exc_info[0]:
            log_entry["exception"] = {
                "type": record.exc_info[0].__name__,
                "message": str(record.exc_info[1]),
            }
        return json.dumps(log_entry)
```

## Architecture Decision Trees

### Telemetry Signal Selection

```
What do you need to observe?
├── Request flow across services
│   └── Distributed tracing (spans with parent-child relationships)
│       ├── Trace every request, sample for storage
│       └── Use W3C TraceContext for propagation
│
├── System health and utilization
│   └── Metrics (counters, histograms, gauges)
│       ├── RED metrics: Rate, Errors, Duration
│       ├── USE metrics: Utilization, Saturation, Errors
│       └── Business metrics: users signed up, orders placed
│
├── Detailed event records
│   └── Logs (structured JSON)
│       ├── ERROR/WARN for operational signals
│       ├── INFO for business events
│       └── DEBUG for troubleshooting (on-demand)
│
└── User experience (client-side)
    └── Real User Monitoring (RUM)
        ├── Core Web Vitals (LCP, CLS, INP)
        ├── Page load timing
        └── Error tracking
```

## Anti-Patterns

| Anti-Pattern | Why It Fails | Correct Approach |
|---|---|---|
| Logging everything at INFO | Noise buries real issues | Structured levels: ERROR operational, WARN degradations, INFO business events |
| No sampling strategy | Storage costs explode, slow queries | Head-based sampling: 10% for normal, 100% for errors |
| Spans without attributes | Can't filter or group traces | Add semantic attributes: http.method, http.status_code, db.system |
| No service name set | Can't identify source of telemetry | Always set service.name resource attribute |
| Synchronous telemetry export | Blocking the application | Use batch span processor, async metrics export |

## Performance Optimization

- **Tail-based sampling**: Use tail-based sampling to keep all traces with errors. Drop 90%+ of healthy traces. Saves 90% storage while keeping critical signal.
- **Dynamic sampling rate**: Increase sampling rate during deployments and incidents. Decrease during steady state. Configure via feature flag or operator.
- **OpenTelemetry Collector as buffer**: Deploy OTel Collector as a gateway between SDKs and backend. Provides buffering, retries, and load shedding. Prevents backpressure on applications.
## Implementation Patterns

### Observer Pattern for Event Handling
`
interface EventObserver<T> {
  onEvent(event: T): Promise<void>;
}

class EventBus<T> {
  private observers: Set<EventObserver<T>> = new Set();
  subscribe(observer: EventObserver<T>): void {
    this.observers.add(observer);
  }
  unsubscribe(observer: EventObserver<T>): void {
    this.observers.delete(observer);
  }
  async emit(event: T): Promise<void> {
    const results = Array.from(this.observers).map(o => o.onEvent(event));
    await Promise.allSettled(results);
  }
}
`

### Configuration-Driven Approach
`
config:
  defaults:
    timeout: 30s
    retryCount: 3
  overrides:
    production:
      timeout: 60s
      retryCount: 5
    development:
      timeout: 300s
      retryCount: 1
`

## Production Considerations

### Deployment Checklist
- [ ] Configuration validated against schema before startup
- [ ] Health check endpoints registered and monitored
- [ ] Graceful shutdown with draining period (30s timeout)
- [ ] Resource limits configured (CPU, memory, file descriptors)
- [ ] Log level set appropriate for environment
- [ ] Metrics endpoint secured and exposed
- [ ] Rate limiting configured per-tier
- [ ] TLS certificates valid and auto-renewing
- [ ] Database migrations run as separate deployment step
- [ ] Feature flags ready for gradual rollout

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% over 5min | Critical | Page on-call |
| p99 latency | > 2s over 5min | Warning | Investigate |
| Throughput drop | > 50% over 1min | Critical | Check upstream |
| Queue depth | > 1000 over 1min | Warning | Scale consumers |
| Disk usage | > 85% | Warning | Clean or expand |
| Memory usage | > 90% heap | Critical | Restart or scale |

## Anti-Patterns

| Anti-Pattern | Symptom | Root Cause | Solution |
|-------------|---------|------------|----------|
| Premature optimization | Complex code for no measured benefit | Guessing instead of profiling | Measure first, optimize based on data |
| Copy-paste reuse | Duplicate code across codebase | Lack of abstraction | Extract shared logic into libraries |
| Gold-plating | Features with no current requirement | Over-engineering | YAGNI — build what's needed now |
| Magical thinking | Assumptions without validation | Skipping error handling | Handle all failure modes explicitly |

## Performance Optimization

### Caching Strategy
Cache hierarchy: L1 (in-memory local) → L2 (distributed Redis/Memcached) → L3 (CDN/Edge).
Cache invalidation: TTL-based (simple, stale), event-based (complex, fresh), write-through (consistent, higher write latency), write-behind (fast writes, eventual consistency).

### Resource Pooling
- Database connections: Pool of reusable connections (HikariCP, pgBouncer)
- HTTP connections: Keep-alive + connection pooling for external calls
- Thread pool: Bounded thread pools for async task execution

### Profiling Methodology
1. Establish baseline with production traffic profile
2. Profile CPU with sampling profiler (pprof, perf, async-profiler)
3. Profile memory with heap dumps and allocation tracking
4. Profile I/O with strace/perf trace for syscall analysis
5. Profile latency with distributed tracing (OpenTelemetry)
6. Identify bottleneck, formulate hypothesis, implement fix
7. Re-profile to verify improvement, repeat

## Security Considerations

### Threat Modeling (STRIDE)
- Spoofing: Identity validation, authentication
- Tampering: Integrity checks, digital signatures
- Repudiation: Audit logs, non-repudiation
- Information disclosure: Encryption, access control
- Denial of service: Rate limiting, resource quotas
- Elevation of privilege: Principle of least privilege

### Supply Chain Security
- Dependency scanning: Snyk, Dependabot, Trivy
- SBOM generation: CycloneDX or SPDX format
- Signed commits: GPG or SSH commit signing
- Artifact verification: Checksum validation, signature verification

### Secrets Management
- Secrets never in code — always in secrets manager (Vault, AWS Secrets Manager)
- Rotation policy: Rotate database credentials every 90 days
- Access audit: Log every secrets access, alert on anomalies
- Encryption at rest and in transit for all secrets
- Principle of least privilege: each service gets only its own secrets

## Rules
- Default-deny security posture — allow only explicitly required access.
- All inputs validated, all outputs encoded, all errors handled.
- Defend in depth — multiple layers of security controls.
- Fail securely — errors default to safe behavior.
- Log security-relevant events for audit and investigation.
- Keep dependencies updated — automate vulnerability scanning.
- Design for observability from day one, not as an afterthought.
- Document all architectural decisions with rationale.
- Review code for security, performance, and correctness before merging.