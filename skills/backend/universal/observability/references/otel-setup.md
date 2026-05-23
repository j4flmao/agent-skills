# OpenTelemetry SDK Setup Guide

## Supported Languages
OpenTelemetry provides SDKs for: Java, JavaScript/TypeScript, Python, Go, .NET, Ruby, Rust, C++, Erlang/Elixir, PHP, and Swift. Each follows the same conceptual API but has language-specific conventions.

## Core Components

### 1. SDK Initialization
The SDK wires together three components: span processors, exporters, and instrumentations.

```
SDK
├── TraceProvider
│   ├── SpanProcessor (BatchSpanProcessor for production)
│   │   └── SpanExporter (OTLP, Jaeger, Zipkin, Console)
│   └── Sampler (AlwaysOn, TraceIdRatioBased, ParentBased)
├── MeterProvider
│   ├── MetricReader (PeriodicExportingMetricReader)
│   │   └── MetricExporter (OTLP, Prometheus, Console)
│   └── View (rename, aggregate, filter metrics)
└── LoggerProvider
    ├── LogRecordProcessor (BatchLogRecordProcessor)
    │   └── LogRecordExporter (OTLP, Console, file)
    └── LogRecordLimits (attribute count, value length)
```

### 2. Environment Variables
| Variable | Purpose | Default |
|----------|---------|---------|
| `OTEL_SERVICE_NAME` | Identifies the service in all signals | `unknown_service` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP receiver endpoint | `http://localhost:4317` |
| `OTEL_TRACES_SAMPLER` | Sampling strategy | `parentbased_always_on` |
| `OTEL_TRACES_SAMPLER_ARG` | Sampling ratio (0.0-1.0) | `1.0` |
| `OTEL_BSP_SCHEDULE_DELAY` | Batch span processor delay (ms) | `5000` |
| `OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT` | Max attribute value length | `4096` |
| `OTEL_RESOURCE_ATTRIBUTES` | Extra resource attributes | `""` |

### 3. Auto-Instrumentation
Auto-instrumentation hooks into popular frameworks without code changes:
- HTTP: Express, Koa, Fastify, Spring, Flask, Gin
- Database: PostgreSQL, MySQL, MongoDB, Redis
- Messaging: Kafka, RabbitMQ, SQS, SNS
- gRPC: Client and server interceptors
- R2DBC: Reactive database calls

### 4. Manual Instrumentation
```javascript
const { trace, context, propagation } = require('@opentelemetry/api');

// Create a custom span
const span = trace.getTracer('my-service').startSpan('process-item', {
  attributes: { 'item.id': itemId, 'item.type': type },
});
yield context.with(trace.setSpan(context.active(), span), async () => {
  // Child spans created here are automatically nested
  await processItem(itemId);
});
span.end();
```

### 5. Context Propagation
W3C TraceContext is the default propagator. Headers:
```
traceparent: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01
tracestate:  congo=ucfJifl5R01,rojo=00f067aa0ba902b7
```

### 6. Exporting
OTLP is the recommended export protocol. It supports gRPC (4317) and HTTP (4318). Configure the OTel Collector as the intermediary:

```
Service -> OTLP -> Collector -> Jaeger (traces)
                             -> Prometheus (metrics)
                             -> Loki (logs)
```

### 7. Testing
Use the `InMemorySpanExporter` and `InMemoryMetricExporter` for unit tests:
```javascript
const exporter = new InMemorySpanExporter();
// ... run test code ...
const spans = exporter.getFinishedSpans();
expect(spans[0].name).toBe('process-item');
```

### 8. Common Pitfalls
- Forgetting to call `span.end()` — spans leak memory.
- Not setting `OTEL_SERVICE_NAME` — traces are unidentifiable.
- Mixing propagators — use W3C TraceContext everywhere.
- Sampling decisions must be consistent for the same trace.
- Resource attributes (service.name, deployment.environment) must be set at SDK init, not per-span.

## Resources
- OpenTelemetry Specification: opentelemetry.io/docs/specs/otel
- Semantic Conventions: opentelemetry.io/docs/specs/semconv
