---
name: opentelemetry-tracing
description: >
  Use this skill when the user says 'add opentelemetry tracing', 'otel sdk setup', 'instrument my service', 'otlp exporter', 'otel collector basic config', 'spans and attributes', 'trace id in logs', 'otel environment variables', 'auto-instrumentation'. Instruments a service with OpenTelemetry tracing: SDK/auto-instrumentation setup, resource attributes, manual spans, OTLP export to a Collector, and log correlation. Do NOT use for: sampling strategy and async propagation design (cloud-native-distributed-tracing), org-wide OTel platform rollout (devops-opentelemetry), metrics dashboards/alerts (prometheus-grafana).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [devops, observability, opentelemetry, tracing, otlp, instrumentation]
---

# OpenTelemetry Tracing Setup

## Purpose
Get useful traces from a service quickly: auto-instrument frameworks and clients, add a few manual spans around business operations, export via OTLP to an OpenTelemetry Collector, and stamp trace IDs into logs. Vendor choice stays in the Collector, not in application code.

## Agent Protocol

### Trigger
"add opentelemetry", "otel sdk", "instrument my service", "OTLP exporter", "collector config", "spans and attributes", "trace id in logs", "OTEL_ env vars", "auto-instrumentation".

### Input Context
- Language/framework, runtime (container, Kubernetes, serverless).
- Backend (Jaeger, Tempo, vendor APM) and whether a Collector exists.

### Output Artifact
SDK bootstrap code / env vars, Collector config. No file unless requested.

### Response Format
```
Instrumentation: {auto (agent/operator)|SDK + instrumentation libs}
Resource: service.name={..}, service.version={..}, deployment.environment.name={..}
Export: OTLP {grpc:4317|http:4318} -> {collector}
Manual spans: {operation names}
Log correlation: {how trace_id/span_id reach logs}
```

### Completion Criteria
- [ ] `service.name` set; spans visible end-to-end in the backend.
- [ ] Export goes to a Collector (not straight to a vendor) in production.
- [ ] Errors recorded on spans with status ERROR.

## Concepts
- **Trace** = tree of **spans** sharing a 16-byte trace ID; each span has an 8-byte span ID, parent, name, kind (SERVER, CLIENT, PRODUCER, CONSUMER, INTERNAL), start/end, attributes, events, status.
- **Context propagation** via W3C `traceparent` headers is handled by instrumentation libraries.
- **Resource** attributes describe the emitting entity (`service.name`, `k8s.pod.name`).
- **Collector** pipeline: receivers → processors → exporters.

## Configuration via Environment Variables (all SDKs)
```bash
OTEL_SERVICE_NAME=checkout
OTEL_RESOURCE_ATTRIBUTES=service.version=1.12.0,deployment.environment.name=prod
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.2
OTEL_PROPAGATORS=tracecontext,baggage
```

## Auto-Instrumentation
| Language | Zero-code option |
|---|---|
| Java | `-javaagent:opentelemetry-javaagent.jar` |
| Python | `pip install opentelemetry-distro opentelemetry-exporter-otlp` → `opentelemetry-bootstrap -a install` → `opentelemetry-instrument python app.py` |
| Node.js | `node --require @opentelemetry/auto-instrumentations-node/register app.js` |
| .NET | OpenTelemetry .NET automatic instrumentation |
| Kubernetes | OpenTelemetry Operator `Instrumentation` CR + pod annotation `instrumentation.opentelemetry.io/inject-java: "true"` (or `-python`, `-nodejs`, `-dotnet`) |

## Manual SDK Setup (Python)
```python
from opentelemetry import trace
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.trace import Status, StatusCode

provider = TracerProvider(resource=Resource.create({"service.name": "checkout"}))
provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))  # endpoint from env
trace.set_tracer_provider(provider)

tracer = trace.get_tracer("checkout.pricing")

def apply_discount(cart, code):
    with tracer.start_as_current_span("checkout.apply_discount") as span:
        span.set_attribute("discount.code_present", bool(code))
        span.set_attribute("cart.items", len(cart.items))
        try:
            return pricing_engine.apply(cart, code)
        except Exception as exc:
            span.record_exception(exc)
            span.set_status(Status(StatusCode.ERROR, str(exc)))
            raise
```
Call `provider.shutdown()` on process exit (and `force_flush()` at the end of serverless invocations) so batched spans are not lost.

## Collector (minimal)
```yaml
receivers:
  otlp:
    protocols:
      grpc: { endpoint: 0.0.0.0:4317 }
      http: { endpoint: 0.0.0.0:4318 }
processors:
  memory_limiter: { check_interval: 1s, limit_percentage: 80, spike_limit_percentage: 20 }
  k8sattributes: {}            # adds k8s.pod.name, namespace, deployment (needs RBAC)
  batch: {}
exporters:
  otlp:
    endpoint: tempo-distributor.observability:4317
    tls: { insecure: true }    # in-cluster only; use TLS across networks
  debug: { verbosity: basic }
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, k8sattributes, batch]
      exporters: [otlp]
```
`k8sattributes` is in the contrib/k8s distributions; the `logging` exporter was replaced by `debug`.

## Log Correlation
- Java agent, .NET, and Python logging instrumentation can inject `trace_id`/`span_id` into log records (Python: `OTEL_PYTHON_LOG_CORRELATION=true`).
- Emit logs as JSON with those fields; Grafana/Tempo/Loki or APM backends link logs ↔ traces.

## Span Hygiene
- Names: low-cardinality (`GET /orders/{id}`, `checkout.apply_discount`), never IDs in names.
- Attributes: follow semantic conventions (`http.request.method`, `http.route`, `db.system.name`, `messaging.system`); no PII/secrets.
- Don't create spans in tight loops; use events or a single span with counts.

## Anti-Patterns
- `SimpleSpanProcessor` in production (exports synchronously per span).
- Hard-coding vendor exporters/keys in app code.
- Missing `service.name` → everything shows as `unknown_service`.
- Instrumenting everything manually when auto-instrumentation covers the framework.

## Checklist
- [ ] Auto-instrumentation enabled; manual spans for key business steps.
- [ ] Resource attributes + env var config.
- [ ] OTLP to Collector with `memory_limiter` + `batch`.
- [ ] Logs carry trace/span IDs.
- [ ] Sampling configured (see distributed-tracing skill for tail sampling).

## References
- Related skills: `skills/cloud-native/distributed-tracing/SKILL.md`, `skills/devops/opentelemetry/SKILL.md`, `skills/devops/observability/SKILL.md`.
