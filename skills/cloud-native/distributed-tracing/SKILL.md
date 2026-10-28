---
name: cloud-native-distributed-tracing
description: >
  Use this skill when the user says 'implement distributed tracing', 'trace context', 'traceparent', 'baggage', 'tail sampling', 'head sampling', 'trace kafka messages', 'jaeger tracing', 'trace correlation', 'span links'. Designs end-to-end distributed tracing with OpenTelemetry: W3C context propagation across HTTP, gRPC and messaging, sampling strategy, and collector topology. Do NOT use for: OpenTelemetry SDK setup basics (opentelemetry-tracing), full OTel platform rollout (devops-opentelemetry), metrics/alerting (prometheus-grafana).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [cloud-native, tracing, opentelemetry, w3c-trace-context, sampling, observability]
---

# Distributed Tracing Architecture

## Purpose
Make every request traceable across services, queues, and async jobs without unbounded cost. The hard parts are context propagation across non-HTTP boundaries and choosing a sampling design that keeps errors and slow traces while discarding routine ones.

## Agent Protocol

### Trigger
"distributed tracing", "trace context", "traceparent", "baggage", "tail sampling", "head sampling", "trace kafka", "jaeger", "trace correlation", "span links".

### Input Context
- Languages/frameworks, messaging systems (Kafka, SQS, RabbitMQ), service mesh presence.
- Trace volume (spans/s) and backend (Jaeger, Tempo, vendor APM).
- What must be kept (errors, latency outliers, specific tenants).

### Output Artifact
Propagation plan, sampling policy, Collector config. No file unless requested.

### Response Format
```
Propagators: {tracecontext,baggage[,b3]}
Sampling: head={ratio} | tail={policies}
Collector topology: {agent -> load-balancing exporter -> tail-sampling gateway -> backend}
Async boundaries: {how context crosses each queue}
```

### Completion Criteria
- [ ] Every boundary (HTTP, gRPC, each queue) propagates context.
- [ ] Sampling keeps 100% of errors if tail sampling is used.
- [ ] Logs carry `trace_id`/`span_id` for correlation.

## W3C Trace Context
`traceparent: 00-<trace-id 32 hex>-<parent-id 16 hex>-<trace-flags 2 hex>`
- `00` = version; trace-flags bit `01` = sampled.
- `tracestate` carries vendor-specific key/values; must be forwarded unchanged when not understood.
- **Baggage** (`baggage` header, W3C Baggage) carries application key/values (e.g. `tenant.id`) to all downstream services. It is not added to spans automatically, is visible to every hop (no secrets/PII), and adds bytes to every request.

## Propagation Across Async Boundaries
HTTP and gRPC instrumentation inject/extract automatically. Messaging needs explicit care:

```python
from opentelemetry import trace, propagate
from opentelemetry.trace import SpanKind, Link

tracer = trace.get_tracer("orders")

def publish(producer, order):
    with tracer.start_as_current_span("orders publish", kind=SpanKind.PRODUCER):
        carrier: dict[str, str] = {}
        propagate.inject(carrier)                      # writes traceparent/tracestate/baggage
        headers = [(k, v.encode()) for k, v in carrier.items()]
        producer.produce("orders", value=order.to_json(), headers=headers)

def consume(msg):
    carrier = {k: v.decode() for k, v in (msg.headers() or [])}
    ctx = propagate.extract(carrier)
    # Option A: continue the trace (one consumer per message)
    with tracer.start_as_current_span("orders process", context=ctx, kind=SpanKind.CONSUMER):
        handle(msg)

def consume_batch(msgs):
    # Option B: batch — one span with links to each producer context
    links = [Link(trace.get_current_span(propagate.extract(
        {k: v.decode() for k, v in (m.headers() or [])})).get_span_context()) for m in msgs]
    with tracer.start_as_current_span("orders process batch", links=links, kind=SpanKind.CONSUMER):
        for m in msgs:
            handle(m)
```
Use **span links** whenever one span relates to many parents (batches, fan-in) — parent/child only models one.

## Sampling Strategy

| Strategy | Where decided | Pros | Cons |
|---|---|---|---|
| Head, `ParentBased(TraceIdRatioBased(r))` | Root service SDK | Cheap, consistent across services | Misses rare errors at low ratio |
| Tail sampling | Collector after trace completes | Keep all errors/slow traces | Needs all spans of a trace on the same collector; memory for `decision_wait` |
| Combined | Light head sampling (or none) + tail | Balanced | More moving parts |

Tail-sampling topology: agents/sidecars → **load-balancing exporter** (routing key `traceID`) → tail-sampling collector tier → backend. Without trace-ID-aware load balancing, spans of one trace land on different collectors and decisions are wrong.

```yaml
# gateway collector (contrib distribution)
receivers:
  otlp:
    protocols:
      grpc: { endpoint: 0.0.0.0:4317 }
processors:
  memory_limiter: { check_interval: 1s, limit_percentage: 80, spike_limit_percentage: 20 }
  tail_sampling:
    decision_wait: 10s
    num_traces: 100000
    policies:
      - name: errors
        type: status_code
        status_code: { status_codes: [ERROR] }
      - name: slow
        type: latency
        latency: { threshold_ms: 1000 }
      - name: baseline
        type: probabilistic
        probabilistic: { sampling_percentage: 5 }
  batch: {}
exporters:
  otlp/tempo:
    endpoint: tempo-distributor:4317
    tls: { insecure: true }   # use real TLS outside the cluster
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, tail_sampling, batch]
      exporters: [otlp/tempo]
```
Policies are OR-ed: a trace is kept if any policy says sample.

## Instrumentation Choice
- **Auto-instrumentation** (Java agent, .NET/Python/Node auto-instrumentation, OTel Operator injection, eBPF-based tools such as Grafana Beyla / OBI) gives HTTP/DB/RPC spans with zero code.
- **Manual spans** for business operations (`checkout.apply_discount`) and attributes you will query on.
- Follow semantic conventions (`http.request.method`, `http.response.status_code`, `db.system`, `messaging.system`) so backends render correctly.

## Anti-Patterns
- Different propagators per service (B3 vs W3C) without a composite propagator → broken traces.
- High-cardinality span names (`GET /users/12345`) → use route templates (`GET /users/{id}`).
- Tail sampling without load-balancing exporter.
- Putting PII in baggage or span attributes.
- Creating a span per loop iteration in hot paths.

## Checklist
- [ ] `OTEL_PROPAGATORS=tracecontext,baggage` (plus `b3multi` only where legacy services need it).
- [ ] Messaging producers inject and consumers extract; batches use links.
- [ ] Sampling policy documented with expected kept-span rate.
- [ ] Logs include trace/span IDs; exemplars link metrics to traces.
- [ ] Collector has `memory_limiter` first in the pipeline.

## References
- `references/otel-architecture.md`
- `references/sampling-strategies.md`
- `references/trace-context-propagation.md`
