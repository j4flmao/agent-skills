# APM Instrumentation Patterns

## Overview

APM instrumentation wraps application code to capture traces, metrics, and logs. This reference covers OpenTelemetry to APM backends, agent configuration, sampling strategies, and span tagging patterns.

## OpenTelemetry to APM Backends

### Architecture
```
                    ┌────────────────┐
                    │ Application    │
                    │                │
                    │ OTel SDK      │
                    │ → Spans        │
                    │ → Metrics      │
                    │ → Logs         │
                    └───────┬────────┘
                            │ OTLP
                    ┌───────▼────────┐
                    │ OTel Collector │
                    │                │
                    │ Batch, sample, │
                    │ filter, enrich │
                    └───────┬────────┘
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                  │
   ┌──────▼──────┐  ┌──────▼──────┐  ┌───────▼─────┐
   │   Datadog   │  │  New Relic  │  │   Grafana   │
   │   (via DD   │  │  (via OTLP) │  │   (Tempo)   │
   │   exporter) │  │             │  │             │
   └─────────────┘  └─────────────┘  └─────────────┘
```

### OpenTelemetry Collector Config
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
  attributes:
    actions:
    - key: environment
      value: production
      action: upsert
    - key: data_center
      value: us-east-1
      action: upsert

exporters:
  # Send to Datadog
  datadog:
    api:
      key: ${DD_API_KEY}
      site: datadoghq.com

  # Send to New Relic
  otlp/newrelic:
    endpoint: https://otlp.nr-data.net:4318
    headers:
      api-key: ${NEW_RELIC_API_KEY}

  # Send to Grafana Tempo
  otlp/grafana:
    endpoint: tempo-prod-10-prod-us-central-0.grafana.net:443
    headers:
      authorization: Basic ${GRAFANA_AUTH}
    tls:
      insecure: false

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch, attributes]
      exporters: [datadog, otlp/newrelic, otlp/grafana]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [datadog]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [datadog]
```

## Agent Configuration

### Datadog Agent (OTel Collector Export)
```yaml
# datadog OTel exporter
exporters:
  datadog:
    api:
      key: ${DD_API_KEY}
      site: datadoghq.com
    traces:
      endpoint: https://trace.agent.datadoghq.com
    metrics:
      endpoint: https://api.datadoghq.com
    host_metadata:
      enabled: false
```

### New Relic Native Agent
```yaml
# New Relic agent configuration (newrelic.yml)
common: &default_settings
  app_name: My Application
  license_key: ${NEW_RELIC_LICENSE_KEY}
  log_level: info
  distributed_tracing:
    enabled: true
  transaction_tracer:
    enabled: true
    transaction_threshold: apdex_f
    record_sql: obfuscated
  error_collector:
    enabled: true
    ignore_status_codes: [404, 429]
  custom_insights_events:
    enabled: true
```

### Grafana Agent (Flow Mode)
```river
// Grafana Agent Flow mode for traces
otelcol.receiver.otlp "default" {
  grpc {
    endpoint = "0.0.0.0:4317"
  }
  http {
    endpoint = "0.0.0.0:4318"
  }
  output {
    traces = [otelcol.processor.batch.default.input]
  }
}

otelcol.processor.batch "default" {
  timeout = "1s"
  send_batch_size = 1024
  output {
    traces = [otelcol.processor.attributes.default.input]
  }
}

otelcol.processor.attributes "default" {
  action {
    key = "env"
    value = "production"
    action = "upsert"
  }
  output {
    traces = [otelcol.exporter.otlp.default.input]
  }
}

otelcol.exporter.otlp "default" {
  client {
    url = "https://tempo-prod-10-prod-us-central-0.grafana.net:443"
    auth {
      basic {
        username = env("GRAFANA_INSTANCE_ID")
        password = env("GRAFANA_API_TOKEN")
      }
    }
  }
}
```

## Sampling Strategies

### Head-Based Sampling
```yaml
processors:
  probabilistic_sampler:
    hash_seed: 42
    sampling_percentage: 10.0
```

### Tail-Based Sampling
```yaml
processors:
  tail_sampling:
    decision_wait: 30s
    num_traces: 10000
    expected_new_traces_per_sec: 100
    policies:
    - name: error-policy
      type: status_code
      status_code:
        status_codes:
        - ERROR
        - UNSET
    - name: latency-policy
      type: latency
      latency:
        threshold_ms: 1000
    - name: priority-policy
      type: and
      and_sub_policy:
      - name: slow-errors
        type: and
        and_sub_policy:
        - name: error
          type: status_code
          status_code:
            status_codes: [ERROR]
        - name: slow
          type: latency
          latency:
            threshold_ms: 500
```

### Rate Limiting
```yaml
processors:
  rate_limiting:
    rate: 100  # Spans per second
```

## Span Tagging

### Semantic Conventions
```javascript
// OpenTelemetry semantic conventions
const { SemanticAttributes } = require('@opentelemetry/semantic-conventions');

span.setAttribute(SemanticAttributes.HTTP_METHOD, 'GET');
span.setAttribute(SemanticAttributes.HTTP_URL, '/api/orders');
span.setAttribute(SemanticAttributes.HTTP_STATUS_CODE, 200);
span.setAttribute(SemanticAttributes.DB_SYSTEM, 'postgresql');
span.setAttribute(SemanticAttributes.DB_STATEMENT, 'SELECT * FROM orders');
```

### Custom Business Tags
```javascript
// Business context
span.setAttribute('order.id', orderId);
span.setAttribute('order.amount', 99.99);
span.setAttribute('customer.tier', 'premium');
span.setAttribute('payment.processor', 'stripe');
span.setAttribute('user.id', userId);
span.setAttribute('feature_flag.new_checkout', true);
```

### Resource Attributes
```javascript
// Resource attributes (set at tracer initialization)
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: 'api-gateway',
  [SemanticResourceAttributes.SERVICE_VERSION]: '1.2.3',
  [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: 'production',
  'cloud.region': 'us-east-1',
  'k8s.pod.name': os.hostname(),
});
```

## Multi-Language Instrumentation

### Java (Automatic)
```bash
# Auto-instrumentation with OpenTelemetry Java agent
java -javaagent:opentelemetry-javaagent.jar \
     -Dotel.service.name=order-service \
     -Dotel.traces.exporter=otlp \
     -Dotel.metrics.exporter=otlp \
     -Dotel.exporter.otlp.endpoint=http://otel-collector:4317 \
     -Dotel.resource.attributes=deployment.environment=production \
     -jar app.jar
```

### Python
```python
# Auto-instrumentation
from opentelemetry.instrumentation.auto_instrumentation import AutoInstrumentation

# OR use environment variable:
# OTEL_PYTHON_AUTO_INSTRUMENTATION_ENABLED=true

# Manual instrumentation
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

tracer = trace.get_tracer(__name__)

with tracer.start_as_current_span("process_order") as span:
    span.set_attribute("order.id", order_id)
    result = process_order(order_id)
    span.set_attribute("order.status", result.status)
```

### Node.js
```javascript
const opentelemetry = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { Resource } = require('@opentelemetry/resources');

const sdk = new opentelemetry.NodeSDK({
  resource: new Resource({ 'service.name': 'api-gateway' }),
  traceExporter: new OTLPTraceExporter({
    url: 'http://otel-collector:4317',
  }),
});

sdk.start();
```

### Go
```go
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
)

func initTracer() {
    exporter, _ := otlptracegrpc.New(ctx,
        otlptracegrpc.WithEndpoint("otel-collector:4317"),
        otlptracegrpc.WithInsecure(),
    )

    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
        sdktrace.WithResource(resource.NewWithAttributes(
            semconv.SchemaURL,
            semconv.ServiceNameKey.String("order-service"),
        )),
    )
    otel.SetTracerProvider(tp)
}
```

### .NET
```csharp
using OpenTelemetry.Trace;
using OpenTelemetry.Resources;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenTelemetry()
    .WithTracing(tracing => tracing
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddEntityFrameworkCoreInstrumentation()
        .AddOtlpExporter(options => 
            options.Endpoint = new Uri("http://otel-collector:4317"))
        .SetResourceBuilder(ResourceBuilder
            .CreateDefault()
            .AddService("order-service")));
```

## Best Practices

1. **Use OpenTelemetry SDK** for vendor-neutral instrumentation — avoid vendor-specific agents.
2. **Set sampling rates** per service — 100% for critical services, 1-10% for high-throughput.
3. **Use tail-based sampling** in OTel Collector to keep all error + slow traces.
4. **Tag everything** with service name, environment, version, host.
5. **Add business context** — order IDs, customer tiers, feature flags.
6. **Configure context propagation** across HTTP, messaging, and async boundaries.
7. **Avoid PII in span attributes** — never log emails, SSNs, credit cards.
8. **Use batch processors** for efficient export — never send single spans.
9. **Set memory limits** on OTel Collector to prevent OOM.
10. **Monitor collector health** — dropped spans indicate problems.
