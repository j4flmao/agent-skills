# OpenTelemetry Setup per Stack

## Node.js / TypeScript

### Installation
```bash
npm install @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/instrumentation-http @opentelemetry/instrumentation-express @opentelemetry/exporter-otlp-proto-grpc
```

### Initialization
```typescript
import { NodeSDK } from '@opentelemetry/sdk-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-proto-grpc'
import { getNodeAutoInstrumentations } from '@opentelemetry/instrumentation-http'

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({ url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT }),
  instrumentations: [getNodeAutoInstrumentations()],
})
sdk.start()

process.on('SIGTERM', () => sdk.shutdown())
```

### Manual Tracing
```typescript
import { trace, SpanStatusCode } from '@opentelemetry/api'
const tracer = trace.getTracer('order-service')

async function placeOrder(command: PlaceOrderCommand) {
  return tracer.startActiveSpan('placeOrder', async (span) => {
    span.setAttribute('orderId', command.orderId)
    try {
      const result = await processPayment(command)
      span.setStatus({ code: SpanStatusCode.OK })
      return result
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message })
      span.recordException(error as Error)
      throw error
    } finally {
      span.end()
    }
  })
}
```

## Go

### Installation
```bash
go get go.opentelemetry.io/otel go.opentelemetry.io/otel/sdk go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
```

### Initialization
```go
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/sdk/trace"
)

func initTracer() (*trace.TracerProvider, error) {
    exporter, err := otlptracegrpc.New(ctx, otlptracegrpc.WithInsecure())
    if err != nil { return nil, err }
    tp := trace.NewTracerProvider(trace.WithBatcher(exporter))
    otel.SetTracerProvider(tp)
    return tp, nil
}
```

### Manual Tracing
```go
tracer := otel.Tracer("order-service")
ctx, span := tracer.Start(ctx, "placeOrder")
span.SetAttributes(attribute.String("orderId", command.OrderID))
defer span.End()
// ... business logic
```

## Python

### Installation
```bash
pip install opentelemetry-api opentelemetry-sdk opentelemetry-instrumentation-flask opentelemetry-exporter-otlp-proto-grpc
```

### Initialization
```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

provider = TracerProvider()
processor = BatchSpanProcessor(OTLPSpanExporter())
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)
```

### Manual Tracing
```python
tracer = trace.get_tracer(__name__)
with tracer.start_as_current_span("placeOrder") as span:
    span.set_attribute("orderId", command.order_id)
    result = process_payment(command)
```

## Rust

### Cargo.toml
```toml
[dependencies]
opentelemetry = { version = "0.27", features = ["trace"] }
opentelemetry-otlp = { version = "0.27", features = ["grpc-tonic"] }
opentelemetry-semantic-conventions = "0.27"
```

### Initialization
```rust
use opentelemetry::global;
use opentelemetry_otlp::WithExportConfig;

fn init_tracer() {
    let exporter = opentelemetry_otlp::new_exporter()
        .tonic()
        .with_endpoint(std::env::var("OTEL_EXPORTER_OTLP_ENDPOINT").unwrap())
        .build_span_exporter()
        .unwrap();
    let provider = opentelemetry_sdk::trace::TracerProvider::builder()
        .with_batch_exporter(exporter)
        .build();
    global::set_tracer_provider(provider);
}
```

## Trace Propagation

### HTTP Headers (W3C TraceContext)
```
traceparent: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01
tracestate: vendor1=value1,vendor2=value2
```

### Context Propagation
```typescript
// Service A — outgoing HTTP call
import { propagation } from '@opentelemetry/api'
const headers = {}
propagation.inject(activeContext, headers)
await fetch('http://service-b/api', { headers })
```

```typescript
// Service B — extract incoming context
import { propagation } from '@opentelemetry/api'
const extractedContext = propagation.extract(ROOT_CONTEXT, incomingHeaders)
```

## Sampling Strategy

| Traffic | Strategy | Sampling Rate |
|---------|----------|---------------|
| Low (< 100 req/s) | Always sample | 100% |
| Medium (100-1000 req/s) | Head-based consistent | 10% |
| High (> 1000 req/s) | Rate-limited | 1% or 1 req/s |

```typescript
import { ParentBasedSampler, TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-node'

const sampler = new ParentBasedSampler({
  root: new TraceIdRatioBasedSampler(0.1),  // 10% for root spans
})
```
