# Distributed Tracing & Observability

## 1. Skill Context
**Focus**: OpenTelemetry (OTel), Span propagation, W3C Trace Context, Sampling strategies, and microservice observability.
**Triggers**: implement distributed tracing, opentelemetry setup, jaeger tracing, trace context, trace correlation

## 2. Advanced Strategy and Execution
The agent must provide architectural guidance on implementing distributed tracing without incurring massive performance or cost overhead.

### Instrumentation & Context Propagation
- **W3C Trace Context**: Explain the mechanics of `traceparent` (`version-trace_id-parent_id-trace_flags`) and `tracestate` headers across HTTP/gRPC boundaries.
- **Baggage**: Distinguish between trace context (used for linking spans) and baggage (used for passing key-value pairs like `tenant_id` down the entire call stack).
- **Auto-Instrumentation vs Manual**: When to rely on eBPF/bytecode-injection (Java Agent, eBPF probes) vs manual span creation for business logic granularity.

### Sampling Strategies
- **Head-Based Sampling**: The decision to sample a trace is made at the root service. Good for performance but might miss downstream errors if not sampled.
- **Tail-Based Sampling**: All spans are collected in a collector (e.g., OTel Collector), and the decision to keep the trace is made after the trace completes. Critical for ensuring 100% of errors or slow requests are captured while dropping successful, fast requests.

## 3. Output Format
- Provide OpenTelemetry Collector configuration snippets (`otelcol.yaml`).
- Explain the code-level injection of tracing headers for asynchronous messaging (e.g., Kafka record headers).
- Diagram the trace flow across 3+ microservices using Mermaid `sequenceDiagram`.
