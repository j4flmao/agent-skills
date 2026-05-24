---
name: devops-opentelemetry
description: >
  OpenTelemetry observability framework for distributed systems.
  Covers: OTel concepts (traces, metrics, logs, SDK, API, Collector, OTLP),
  Collector pipeline (receiver, processor, exporter, batch, sampling,
  tail sampling, attributes), SDK instrumentation (automatic and manual
  for Java, Python, Node.js, Go, .NET), trace sampling strategies
  (head-based, tail-based, probabilistic, consistent), multi-backend
  export (Jaeger, Zipkin, Prometheus, Datadog, Grafana).
  Do NOT use for: Vendor-specific APM agent configuration without OTel.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, opentelemetry, observability, tracing, metrics, phase-5]
---

# OpenTelemetry

## Purpose
Implement OpenTelemetry for vendor-neutral observability across distributed systems, covering traces, metrics, and logs collection, processing, and export to multiple backends.

## Agent Protocol

### Trigger
Exact user phrases: "OpenTelemetry", "OTel", "OTLP", "tracing", "distributed tracing", "OpenTelemetry Collector", "OTel SDK", "auto-instrumentation", "tail sampling", "OTel exporter", "Jaeger", "Zipkin", "context propagation", "span", "trace".

### Input Context
Before activating, verify:
- Programming language(s) and framework(s) used.
- Existing observability backends (Jaeger, Prometheus, Datadog, etc.).
- Deployment environment (Kubernetes, VMs, serverless).
- Collection, sampling, and export requirements.

### Output Artifact
Writes to OTel Collector YAML configuration, SDK initialization code, and deployment manifests.

### Response Format
Configuration files and code snippets with OTel SDK imports, no extraneous explanation.

### Completion Criteria
This skill is complete when:
- [ ] Collector pipeline configured with receivers, processors, exporters.
- [ ] SDK initialized in application code (auto or manual instrumentation).
- [ ] Sampling strategy configured for appropriate trace volume.
- [ ] Multi-backend export configured for redundancy.
- [ ] Context propagation verified across service boundaries.

### Max Response Length
Direct file write. No response text.

## Quick Start
Deploy OTel Collector → Configure receiver (OTLP) → Add batch processor → Configure exporters → Instrument application with SDK → Set sampling → Verify traces flowing.

## When to Use This Skill
- Implementing vendor-neutral observability across microservices
- Migrating from proprietary APM agents to OTel
- Standardizing trace, metric, and log collection across the organization
- Building a multi-backend observability pipeline (dev + prod backends)
- Enabling context propagation across polyglot services

## Core Workflow

### Step 1: Collector Configuration
```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 1s
    send_batch_size: 1024
  memory_limiter:
    check_interval: 1s
    limit_mib: 512

exporters:
  otlp:
    endpoint: jaeger:4317
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp]
```

### Step 2: Application Instrumentation
```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { Resource } = require('@opentelemetry/resources');

const sdk = new NodeSDK({
  resource: new Resource({
    'service.name': 'my-service',
    'service.version': '1.0.0',
    'deployment.environment': 'production',
  }),
  traceExporter: new OTLPTraceExporter({
    url: 'http://otel-collector:4317',
  }),
});

sdk.start();
```

### Step 3: Verify
```bash
kubectl logs -l app=otel-collector
# Check for exported spans
```

## Rules & Constraints
- Never send PII in span attributes or log records.
- Always configure batch processing to avoid overwhelming backends.
- Set memory limits on Collector to prevent OOM.
- Use tail-based sampling for production (keep all errors + slow traces).
- Configure TLS for OTLP export in production.

## References
- `references/otel-concepts.md` — Signals, SDK, API, Collector, OTLP
- `references/collector-pipeline.md` — Receivers, processors, exporters
- `references/sdk-instrumentation.md` — Auto/manual instrumentation per language
- `references/trace-sampling.md` — Head-based, tail-based, probabilistic
- `references/multi-backend-export.md` — OTLP to multiple backends

## Handoff
After completing this skill:
- Next skill: **devops-apm-observability** — APM platforms receiving OTel data
- Pass context: Collector endpoint, service names, sampling config, backend URLs
