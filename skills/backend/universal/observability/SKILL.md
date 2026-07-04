---
name: Backend Universal Observability
description: >
  Comprehensive skill for designing, implementing, and maintaining 
  production-grade observability pipelines across backend systems.
  Includes OpenTelemetry, Prometheus, Grafana, and Distributed Tracing.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags:
  - backend
  - observability
  - opentelemetry
  - prometheus
  - grafana
  - tracing
---

# Backend Universal Observability

## Purpose
This skill provides comprehensive capabilities for building, integrating, and troubleshooting full-stack observability pipelines in backend architectures. It ensures that applications produce reliable, low-overhead telemetry (metrics, logs, traces) uniformly, leveraging industry standards like OpenTelemetry, Prometheus, and the ELK stack. The primary objective is to empower autonomous agents to configure SLO/SLI tracking, manage distributed tracing, and set up resilient dashboarding and alerting mechanisms.

## Core Principles
1. **Instrument Everything**: Uniformly instrument all boundaries (HTTP, gRPC, DB, queues) to ensure no blind spots in the distributed system.
2. **Context Propagation**: Maintain trace context across all service boundaries, using W3C Trace Context standards to correlate distributed requests.
3. **Decoupled Telemetry**: Offload telemetry processing to independent collector agents (e.g., OTel Collector) to minimize application overhead and prevent blocking operations.
4. **Actionable Alerts**: Define alerts strictly based on user-facing Service Level Objectives (SLOs) rather than raw resource metrics to minimize alert fatigue.
5. **Data Ephemerality**: Treat telemetry data as transient; aggregate and summarize early, dropping high-cardinality data that isn't required for debugging.

## Agent Protocol

### Triggers
- "Instrument this new microservice with OpenTelemetry."
- "Create a Prometheus alert for high latency in the payment gateway."
- "Configure distributed tracing for the gRPC services."

### Input Context Required
- Target language/framework (e.g., Python/FastAPI, Node.js/Express).
- Existing infrastructure components (Jaeger, Prometheus, ELK).
- Specific SLOs or business metrics to track.

### Output Artifact
- Configured telemetry initialization files (e.g., `tracing.py`, `metrics.ts`).
- Infrastructure configuration definitions (e.g., `otel-collector.yaml`).
- Dashboards and alert rules.

### Response Formats
```json
{
  "status": "success",
  "operation": "configure_tracing",
  "files_modified": [
    "src/observability/tracer.py",
    "deploy/otel-collector-config.yaml"
  ],
  "telemetry_endpoints": {
    "traces": "localhost:4317",
    "metrics": "localhost:4318"
  },
  "warnings": []
}
```

## Decision Matrix
```text
Is there an existing observability stack?
 +-- Yes
 |    +-- Is it OpenTelemetry compatible?
 |    |    +-- Yes: Instrument using OTel SDKs and route to existing collector.
 |    |    +-- No: Propose a sidecar OTel collector to translate telemetry (e.g., OTLP to Jaeger/Zipkin).
 +-- No
      +-- Need metrics only?
      |    +-- Implement Prometheus client libraries and expose /metrics endpoint.
      +-- Need traces and metrics?
           +-- Implement full OpenTelemetry SDK and deploy an OTel Collector for routing.
```

## Detailed Architectural Overview

### Architecture Diagram
```text
+-------------------+       +-------------------+       +-------------------+
|   Microservice A  |       |   Microservice B  |       |   Microservice C  |
|  (Python/FastAPI) |       |  (Node.js/gRPC)   |       |  (Go/HTTP)        |
|  +-------------+  |       |  +-------------+  |       |  +-------------+  |
|  | OTel SDK    |--|-------|->| OTel SDK    |--|-------|->| OTel SDK    |  |
|  +-------------+  |       |  +-------------+  |       |  +-------------+  |
+---------+---------+       +---------+---------+       +---------+---------+
          |                           |                           |
          v                           v                           v
+---------------------------------------------------------------------------+
|                          OpenTelemetry Collector                          |
|  +----------------+       +-------------------+       +----------------+  |
|  |   Receivers    | ----> |    Processors     | ----> |   Exporters    |  |
|  | (OTLP, Jaeger) |       | (Batch, Filter)   |       | (Prometheus,   |  |
|  +----------------+       +-------------------+       |  Jaeger, ELK)  |  |
+---------+---------------------------+---------------------------+---------+
          |                           |                           |
          v                           v                           v
+-------------------+       +-------------------+       +-------------------+
|    Prometheus     |       |      Jaeger       |       |   Elasticsearch   |
|     (Metrics)     |       |     (Traces)      |       |      (Logs)       |
+-------------------+       +-------------------+       +-------------------+
```

### Lifecycle Diagram
```text
[Request In] -> [Start Span (Middleware)] -> [Extract Context] -> [Process Logic] 
-> [Add Attributes/Events] -> [End Span] -> [Batch Processor] -> [Export to OTel Collector]
```

## Workflow Steps

### Phase 1: Assessment and Discovery
1. Identify the primary stack and runtime environments.
2. Locate existing observability configurations.
3. Determine required integration points (databases, external APIs).
4. Outline the target SLOs.

### Phase 2: Core Instrumentation
1. Install base telemetry SDKs (e.g., `opentelemetry-api`, `opentelemetry-sdk`).
2. Configure automatic instrumentation for standard libraries.
3. Implement custom manual instrumentation for business-critical logic.
4. Establish context propagation headers.

### Phase 3: Infrastructure Setup
1. Define the OTel Collector configuration (`receivers`, `processors`, `exporters`).
2. Deploy the collector as a sidecar or daemonset.
3. Configure authentication and TLS for telemetry pipelines.
4. Set resource limits to prevent collector interference.

### Phase 4: Metrics and Alerting
1. Expose the `/metrics` endpoint or push to a gateway.
2. Define Prometheus `ServiceMonitor` or scrape configs.
3. Create PromQL alert rules for SLO breaches.
4. Integrate with PagerDuty or Slack for notifications.

### Phase 5: Dashboarding
1. Design Grafana dashboards linking metrics and traces.
2. Add drill-down variables (namespace, pod, service).
3. Establish baseline visualizations for standard SLIs (RED metrics).
4. Provision dashboards via code (e.g., Grafana provisioning).

### Phase 6: Validation and Tuning
1. Generate synthetic load to verify telemetry flows.
2. Monitor telemetry latency and drop rates in the collector.
3. Adjust batch processor sizes and timeouts.
4. Filter out PII and sensitive data before export.

## Extended Troubleshooting Guide

| Symptom | Primary Cause | Mitigation Action |
|---------|---------------|-------------------|
| Missing traces in Jaeger | Context propagation failure | Ensure W3C trace headers are passed in inter-service HTTP clients. |
| High memory usage in app | Batch processor buffer too large | Reduce `max_queue_size` and `schedule_delay_millis` in OTel processor. |
| Prometheus targets down | Incorrect scrape configuration | Verify `/metrics` port and path in `ServiceMonitor`. |
| Broken traces (orphaned spans) | Missing parent context on thread boundary | Manually inject context into async threads or background jobs. |
| OTel Collector dropping data | Rate limiting / Backpressure | Increase collector replica count or enable memory limiter processor. |
| Alert fatigue | Thresholds set too low | Refine alerts based on error budget burn rates rather than static thresholds. |

## Complete Execution Scenario
```text
User: "Add tracing to the Node.js user service."
  |
  +-> Agent reads target repository `user-service/`
  |
  +-> Agent identifies Express.js usage
  |
  +-> Agent installs `@opentelemetry/auto-instrumentations-node`
  |
  +-> Agent creates `tracing.ts` with NodeTracerProvider
  |
  +-> Agent updates entrypoint to require `tracing.ts`
  |
  +-> Agent modifies Dockerfile to pass `OTEL_EXPORTER_OTLP_ENDPOINT`
  |
  +-> Agent writes tests to verify trace generation
  |
  +-> Task Complete
```

## Rules and Guidelines
1. Do not log sensitive data (PII, credentials) in span attributes or structured logs.
2. Always use asynchronous or batch exporters; synchronous exporters will degrade performance.
3. Keep custom metric cardinalities low. Avoid using unbounded values like User IDs as metric labels.
4. Prefer auto-instrumentation for standard frameworks to reduce boilerplate and maintenance overhead.
5. Standardize naming conventions for spans and attributes across all services (e.g., semantic conventions).

## Reference Guides
- [Architecture Patterns](references/architecture-patterns.md)
- [State Management](references/state-management.md)
- [Performance Optimization](references/performance-optimization.md)
- [Security Best Practices](references/security-best-practices.md)
- [Testing Strategies](references/testing-strategies.md)
- [Deployment Pipelines](references/deployment-pipelines.md)
- [Error Handling](references/error-handling.md)
- [Code Organization](references/code-organization.md)

## Handoff
- For deployment configurations related to observability infrastructure, refer to the [Kubernetes Manifests](../infrastructure/kubernetes/SKILL.md) skill.
- For integrating observability into CI/CD, refer to the [CI/CD Pipelines](../devops/cicd/SKILL.md) skill.

<!-- COMPRESSION_FOOTER: {"format":"markdown","density":"high","schema":"skill-2.0"} -->