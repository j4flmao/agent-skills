# OpenTelemetry SDK Instrumentation

## Overview

OpenTelemetry SDKs provide both automatic and manual instrumentation across all major programming languages. This reference covers setup, configuration, and code examples for Java, Python, Node.js, Go, and .NET.

## General SDK Setup

### Pattern
All OTel SDKs follow the same initialization pattern:
1. Create a resource with service identity
2. Configure span/metric/log processors
3. Configure exporters
4. Initialize the SDK
5. Register instrumentation libraries

## Java

### Auto-Instrumentation (Recommended)
```bash
# Download Java agent
wget https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/latest/download/opentelemetry-javaagent.jar

# Run with agent
java -javaagent:opentelemetry-javaagent.jar \
     -Dotel.service.name=order-service \
     -Dotel.traces.exporter=otlp \
     -Dotel.metrics.exporter=otlp \
     -Dotel.logs.exporter=otlp \
     -Dotel.exporter.otlp.endpoint=http://otel-collector:4317 \
     -Dotel.resource.attributes=deployment.environment=production \
     -jar myapp.jar
```

### Agent Configuration
```bash
# Environment variables (alternative to -D flags)
export OTEL_SERVICE_NAME=order-service
export OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
export OTEL_RESOURCE_ATTRIBUTES=deployment.environment=production
export OTEL_TRACES_SAMPLER=parentbased_traceidratio
export OTEL_TRACES_SAMPLER_ARG=0.1
export OTEL_JAVAAGENT_DEBUG=false
```

### Manual Instrumentation
```java
import io.opentelemetry.api.OpenTelemetry;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.context.Scope;

public class OrderService {
    private static final Tracer tracer = 
        OpenTelemetryGlobal.getTracer("order-service");

    public Order createOrder(OrderRequest request) {
        Span span = tracer.spanBuilder("createOrder")
            .setAttribute("order.amount", request.getAmount())
            .setAttribute("order.currency", request.getCurrency())
            .startSpan();

        try (Scope scope = span.makeCurrent()) {
            // Business logic
            Order order = database.save(request);

            // Create child span
            Span paymentSpan = tracer.spanBuilder("processPayment")
                .setAttribute("payment.method", request.getPaymentMethod())
                .startSpan();
            try {
                paymentGateway.charge(order);
            } finally {
                paymentSpan.end();
            }

            return order;
        } catch (Exception e) {
            span.recordException(e);
            span.setStatus(StatusCode.ERROR, e.getMessage());
            throw e;
        } finally {
            span.end();
        }
    }
}
```

### Spring Boot Integration
```java
@Configuration
public class ObservabilityConfig {
    @Bean
    public OpenTelemetry openTelemetry() {
        return OpenTelemetrySdk.builder()
            .setTracerProvider(
                SdkTracerProvider.builder()
                    .addSpanProcessor(BatchSpanProcessor.builder(
                        OtlpGrpcSpanExporter.builder()
                            .setEndpoint("http://otel-collector:4317")
                            .build()
                    ).build())
                    .setResource(Resource.getDefault()
                        .toBuilder()
                        .put("service.name", "order-service")
                        .build())
                    .build()
            )
            .build();
    }
}
```

## Python

### Auto-Instrumentation
```bash
# Install
pip install opentelemetry-distro
opentelemetry-bootstrap -a install

# Run
opentelemetry-instrument \
    --service_name order-service \
    --traces_exporter otlp \
    --metrics_exporter otlp \
    --exporter_otlp_endpoint http://otel-collector:4317 \
    python app.py
```

### Manual Instrumentation
```python
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.resources import Resource
from opentelemetry.semconv.resource import ResourceAttributes

# Configure SDK
resource = Resource.create({
    ResourceAttributes.SERVICE_NAME: "order-service",
    ResourceAttributes.DEPLOYMENT_ENVIRONMENT: "production",
})

provider = TracerProvider(resource=resource)
processor = BatchSpanProcessor(
    OTLPSpanExporter(endpoint="http://otel-collector:4317")
)
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)

tracer = trace.get_tracer(__name__)

# Manual span creation
def create_order(request):
    with tracer.start_as_current_span("createOrder") as span:
        span.set_attribute("order.amount", request.amount)
        span.set_attribute("order.currency", request.currency)
        
        try:
            order = db.save(request)
            span.set_attribute("order.id", order.id)
            return order
        except Exception as e:
            span.record_exception(e)
            span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            raise
```

### Flask Integration
```python
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from flask import Flask

app = Flask(__name__)
FlaskInstrumentor().instrument_app(app)
```

### Django Integration
```python
# settings.py
INSTALLED_APPS = [
    'opentelemetry.instrumentation.django',
    # ...
]

# Enable middleware
MIDDLEWARE = [
    'opentelemetry.instrumentation.django.middleware.OTelMiddleware',
    # ...
]
```

## Node.js

### Auto-Instrumentation
```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-grpc');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'order-service',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: 'production',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
  }),
  traceExporter: new OTLPTraceExporter({
    url: 'http://otel-collector:4317',
  }),
  metricExporter: new OTLPMetricExporter({
    url: 'http://otel-collector:4317',
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // Disable specific instrumentations
      '@opentelemetry/instrumentation-fs': {
        enabled: false,
      },
    }),
  ],
});

sdk.start();
```

### Manual Instrumentation
```javascript
const { trace, context } = require('@opentelemetry/api');

const tracer = trace.getTracer('order-service');

async function createOrder(request) {
  const span = tracer.startSpan('createOrder', {
    attributes: {
      'order.amount': request.amount,
      'order.currency': request.currency,
    },
  });

  return await context.with(trace.setSpan(context.active(), span), async () => {
    try {
      const order = await database.save(request);
      span.setAttribute('order.id', order.id);

      // Child span via context propagation
      const result = await processPayment(order);

      return order;
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

### Express Integration
```javascript
const express = require('express');
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');

const sdk = new NodeSDK({
  instrumentations: [
    new ExpressInstrumentation(),
  ],
});
```

## Go

### Manual Instrumentation
```go
package main

import (
    "context"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
    "go.opentelemetry.io/otel/trace"
)

func initTracer() (*sdktrace.TracerProvider, error) {
    exporter, err := otlptracegrpc.New(context.Background(),
        otlptracegrpc.WithEndpoint("otel-collector:4317"),
        otlptracegrpc.WithInsecure(),
    )
    if err != nil {
        return nil, err
    }

    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
        sdktrace.WithResource(resource.NewWithAttributes(
            semconv.SchemaURL,
            semconv.ServiceNameKey.String("order-service"),
            attribute.String("deployment.environment", "production"),
        )),
    )
    otel.SetTracerProvider(tp)
    return tp, nil
}

func createOrder(ctx context.Context, request OrderRequest) (*Order, error) {
    tracer := otel.Tracer("order-service")
    ctx, span := tracer.Start(ctx, "createOrder",
        trace.WithAttributes(
            attribute.Float64("order.amount", request.Amount),
            attribute.String("order.currency", request.Currency),
        ),
    )
    defer span.End()

    order, err := database.Save(ctx, request)
    if err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, err.Error())
        return nil, err
    }

    span.SetAttributes(attribute.String("order.id", order.ID))
    return order, nil
}
```

### HTTP Handler Integration
```go
import (
    "go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
)

func main() {
    handler := http.HandlerFunc(handleOrder)
    wrappedHandler := otelhttp.NewHandler(handler, "createOrder")
    http.Handle("/orders", wrappedHandler)
    http.ListenAndServe(":8080", nil)
}
```

## .NET

### Auto-Instrumentation
```bash
# Install OTel .NET auto-instrumentation
dotnet tool install -g OpenTelemetry.AutoInstrumentation

# Set environment variables
export OTEL_DOTNET_AUTO_HOME=$HOME/.dotnet/tools/.store/opentelemetry.autoinstrumentation
export OTEL_SERVICE_NAME=order-service
export OTEL_TRACES_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317

# Run
dotnet run
```

### Manual Instrumentation
```csharp
using OpenTelemetry;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using OpenTelemetry.Metrics;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenTelemetry()
    .WithTracing(tracing => tracing
        .AddSource("order-service")
        .SetResourceBuilder(ResourceBuilder
            .CreateDefault()
            .AddService("order-service")
            .AddAttributes(new Dictionary<string, object>
            {
                ["deployment.environment"] = "production"
            }))
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddEntityFrameworkCoreInstrumentation()
        .AddOtlpExporter(options =>
        {
            options.Endpoint = new Uri("http://otel-collector:4317");
        }))
    .WithMetrics(metrics => metrics
        .AddAspNetCoreInstrumentation()
        .AddRuntimeInstrumentation()
        .AddOtlpExporter(options =>
        {
            options.Endpoint = new Uri("http://otel-collector:4317");
        }));

var app = builder.Build();
```

### Manual Span Creation
```csharp
public class OrderService
{
    private static readonly ActivitySource ActivitySource = new("order-service");

    public async Task<Order> CreateOrder(OrderRequest request)
    {
        using var activity = ActivitySource.StartActivity("CreateOrder", ActivityKind.Server);
        
        activity?.SetTag("order.amount", request.Amount);
        activity?.SetTag("order.currency", request.Currency);

        try
        {
            var order = await _db.SaveOrder(request);
            activity?.SetTag("order.id", order.Id);
            return order;
        }
        catch (Exception ex)
        {
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            activity?.AddException(ex);
            throw;
        }
    }
}
```

## Context Propagation

### Manual Propagation (HTTP)
```javascript
// Client
const propagator = new W3CTraceContextPropagator();
const carrier = {};
propagator.inject(trace.getSpanContext(context.active()), carrier);
await fetch('http://service-b/api', {
  headers: {
    traceparent: carrier.traceparent,
    tracestate: carrier.tracestate,
  },
});

// Server (automatic with auto-instrumentation)
// traceparent header is automatically extracted
```

### Message Queue Propagation
```javascript
// Kafka producer
const propagator = new W3CTraceContextPropagator();
const headers = {};
propagator.inject(context.active(), headers);
await producer.send({
  topic: 'orders',
  messages: [{ value: JSON.stringify(order), headers }],
});

// Kafka consumer
consumer.on('message', (message) => {
  const parentContext = propagator.extract(context.active(), message.headers);
  context.with(parentContext, () => {
    processOrder(message.value);
  });
});
```

## Best Practices

1. **Use auto-instrumentation** for HTTP, gRPC, database, and messaging libraries.
2. **Add manual spans** for business-critical operations not covered by auto-instrumentation.
3. **Set semantic attributes** following the OTel semantic conventions.
4. **Configure resource attributes** at startup — service name, version, environment.
5. **Use batch span processors** for all exporters — never sync export.
6. **Set sampling** via environment variables or SDK configuration.
7. **Propagate context** across all service boundaries (HTTP, gRPC, message queues).
8. **Handle errors** in spans — record exception and set error status.
9. **Set span kind** (Internal, Server, Client, Producer, Consumer) for proper service graph.
10. **Test context propagation** across services before production deployment.
