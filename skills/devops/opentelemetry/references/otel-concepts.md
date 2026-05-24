# OpenTelemetry Concepts

## Overview

OpenTelemetry (OTel) is a vendor-neutral observability framework for collecting traces, metrics, and logs from applications. It consists of specifications, SDKs, APIs, and a collector that together form a complete observability pipeline.

## Three Signals

### Traces
```
Traces track the path of a request through a distributed system.

Trace = Tree of spans
  └── Span = Named, timed operation with metadata
       ├── Parent span (e.g., HTTP request)
       ├── Child span (e.g., database query)
       └── Child span (e.g., external API call)
```

### Metrics
```
Metrics are numerical measurements collected over time.

Types:
- Counter: Cumulative count (e.g., total requests)
- UpDownCounter: Can increase or decrease (e.g., active connections)
- Histogram: Distribution of values (e.g., request latency)
- Gauge: Point-in-time value (e.g., memory usage)
```

### Logs
```
Logs are timestamped text records with structured attributes.

OTel treats logs as:
- Log records with body, severity, timestamp, attributes
- Associated with trace context (trace_id, span_id)
- Correlated with traces and metrics
```

## SDK Architecture

```
                    ┌──────────────────────┐
                    │   Application Code   │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │   OpenTelemetry API  │
                    │                      │
                    │  TracerProvider     │
                    │  MeterProvider      │
                    │  LoggerProvider     │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │   OpenTelemetry SDK  │
                    │                      │
                    │  SpanProcessor       │
                    │  MetricReader        │
                    │  LogRecordProcessor  │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │       Exporter       │
                    │                      │
                    │  OTLP | Jaeger |     │
                    │  Prometheus | etc.   │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │   OTel Collector    │
                    └─────────────────────┘
```

### TracerProvider
```javascript
const { trace } = require('@opentelemetry/api');

// Get a tracer
const tracer = trace.getTracer('my-service', '1.0.0');

// Create spans
const span = tracer.startSpan('processOrder');
span.setAttribute('order.id', '12345');
// ... do work ...
span.end();
```

### MeterProvider
```javascript
const { metrics } = require('@opentelemetry/api');

// Get a meter
const meter = metrics.getMeter('my-service', '1.0.0');

// Create instruments
const requestCounter = meter.createCounter('http.requests', {
  description: 'Total HTTP requests',
});

// Record metrics
requestCounter.add(1, { method: 'GET', path: '/api/orders' });
```

### LoggerProvider
```javascript
const { logs } = require('@opentelemetry/api-logs');

// Get a logger
const logger = logs.getLogger('my-service', '1.0.0');

// Emit log records
logger.emit({
  severityNumber: SeverityNumber.ERROR,
  severityText: 'ERROR',
  body: 'Failed to process order',
  attributes: { 'order.id': '12345' },
});
```

## API vs SDK

| API | SDK |
|-----|-----|
| Interfaces and types | Implementations |
| `@opentelemetry/api` | `@opentelemetry/sdk-node` |
| No-op by default | Active collection |
| Stable specification | Evolving implementations |
| Same across languages | Language-specific |

## OpenTelemetry Protocol (OTLP)

OTLP is the native protocol for OTel data transmission.

### OTLP gRPC
```yaml
# OTLP over gRPC (port 4317)
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        max_recv_msg_size_mib: 4
        max_concurrent_streams: 100
```

### OTLP HTTP
```yaml
# OTLP over HTTP/JSON (port 4318)
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318
        cors:
          allowed_origins:
          - http://localhost:3000
          allowed_headers:
          - content-type
```

### OTLP Export
```yaml
exporters:
  otlp:
    endpoint: my-collector:4317
    tls:
      insecure: false
      cert_file: /certs/client.crt
      key_file: /certs/client.key
    headers:
      api-key: ${API_KEY}
    compression: gzip
    timeout: 10s
```

## Context Propagation

### W3C Trace Context
```
traceparent: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01
  └── version └── trace-id (16 bytes) └── span-id (8 bytes) └── trace-flags

tracestate: vendor=value1,anotherVendor=value2
```

### Propagation Across Protocols
```javascript
// HTTP headers
const headers = {
  'traceparent': '00-...',
  'tracestate': '...',
};

// gRPC metadata
metadata.add('traceparent', '00-...');

// Message queue (Kafka headers)
message.headers.append('traceparent', '00-...');
```

## Instrumentation Libraries

### Auto-Instrumentation
```javascript
// Node.js: automatically patch popular libraries
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

const sdk = new NodeSDK({
  instrumentations: [getNodeAutoInstrumentations()],
});
```

### Supported Libraries
```
HTTP: http, https, express, koa, fastify
gRPC: @grpc/grpc-js
Database: pg, mysql2, redis, mongo
Queue: amqplib, kafkajs
Cloud: AWS SDK, GCP client
Framework: nestjs, hapi, restify
```

## Sampling

### Head-Based Sampling
```yaml
# Decision made at the start of a trace
processors:
  probabilistic_sampler:
    sampling_percentage: 10.0
```

### Tail-Based Sampling
```yaml
# Decision made after trace is complete
processors:
  tail_sampling:
    decision_wait: 30s
    policies:
    - name: error-policy
      type: status_code
      status_code:
        status_codes: [ERROR]
```

## Semantic Conventions

Standard attribute names for consistent data across services.

```javascript
// HTTP
span.setAttribute('http.method', 'GET');
span.setAttribute('http.url', '/api/users');
span.setAttribute('http.status_code', 200);

// Database
span.setAttribute('db.system', 'postgresql');
span.setAttribute('db.statement', 'SELECT * FROM users');

// Messaging
span.setAttribute('messaging.system', 'kafka');
span.setAttribute('messaging.destination', 'orders');

// Cloud
span.setAttribute('cloud.provider', 'aws');
span.setAttribute('cloud.region', 'us-east-1');

// Kubernetes
span.setAttribute('k8s.pod.name', 'my-pod-abc');
span.setAttribute('k8s.namespace', 'production');
```

## Best Practices

1. **Use the SDK + API separation** — code against the API, configure the SDK at startup.
2. **Always export via OTLP** — OTLP is the native protocol and most performant.
3. **Set resource attributes** on every service (`service.name`, `service.version`, `deployment.environment`).
4. **Follow semantic conventions** for consistent attribute naming across services.
5. **Propagate context** across all service boundaries (HTTP, gRPC, message queues).
6. **Use auto-instrumentation** first, add manual spans for business logic.
7. **Configure batch processing** — never export individual spans.
8. **Set memory limits** on the SDK and Collector to prevent resource exhaustion.
9. **Test with development backend** before configuring production export.
10. **Monitor OTel itself** — track exported spans, dropped data, and exporter errors.
