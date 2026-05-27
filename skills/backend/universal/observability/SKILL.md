---
name: backend-observability
description: >
  Use this skill when the user says 'observability', 'telemetry', 'OpenTelemetry', 'tracing', 'metrics', 'logging', 'distributed tracing', 'monitoring', 'instrumentation', 'trace', 'span', 'otel', 'signal'. This skill sets up unified observability using OpenTelemetry with traces, metrics, and logs working together as one telemetry pipeline. Applies to any backend stack. Do NOT use for: frontend observability, infrastructure monitoring, or APM vendor setup.
version: "1.0.0"
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
Unify traces, metrics, and logs into a single OpenTelemetry pipeline so every request is measurable end-to-end with correlation across all three signals.

## Agent Protocol

### Trigger
Exact user phrases: "observability", "telemetry", "OpenTelemetry", "tracing", "metrics", "logging", "distributed tracing", "monitoring", "instrumentation", "otel setup", "trace", "span".

### Input Context
- Language/framework of the service.
- Existing monitoring infrastructure (APM vendor, self-hosted collector, none).
- Deployment environment (Kubernetes, VMs, serverless).

### Output Artifact
A markdown or code snippet with the OTel configuration for the service. No file unless requested.

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

## Workflow

### Step 1: Install OTel SDK
```
npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
```
For other languages, use the language-specific OTel SDK from opentelemetry.io.

### Step 2: Configure the SDK
```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-grpc');
const { OTLPLogExporter } = require('@opentelemetry/exporter-logs-otlp-grpc');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter(),
  metricReader: new PeriodicExportingMetricReader({ exporter: new OTLPMetricExporter() }),
  logRecordProcessor: new BatchLogRecordProcessor(new OTLPLogExporter()),
  instrumentations: [getNodeAutoInstrumentations()],
});
sdk.start();
```

### Step 3: Add Manual Instrumentation
```javascript
const tracer = trace.getTracer('payment-service');
const span = tracer.startSpan('process-payment', { attributes: { paymentMethod: 'card', amount: 49.99 } });
// ... business logic
span.end();
```

### Step 4: Metrics
```javascript
const meter = metrics.getMeter('payment-service');
const paymentCounter = meter.createCounter('payments.total', { description: 'Total payments processed' });
paymentCounter.add(1, { status: 'success' });
```

### Step 5: Correlate Logs
```javascript
const spanContext = trace.getSpan(context.active())?.spanContext();
logger.info({ traceId: spanContext?.traceId, spanId: spanContext?.spanId }, 'Payment processed');
```

### Step 6: Export and Visualize
Send OTLP to an OpenTelemetry Collector. The collector routes to your backend (Jaeger, Prometheus, Loki, Datadog, etc.).

## Rules
- Always set `service.name` — it is the primary identifier for all signals.
- Never sample traces differently for the same service — use a consistent head-based sampling decision.
- Always propagate trace context via W3C TraceContext headers (`traceparent`, `tracestate`).
- Never log sensitive data in span attributes or log records.
- Use semantic conventions for span names and attribute keys (`http.method`, `http.url`, `db.system`).
- Metrics should have at least one attribute for dimensionality.
- Set a minimum of 1 in 1000 sampling rate in production, or use tail-based sampling for high-volume services.

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
