# Distributed Tracing Reference

## Trace Context Propagation

Distributed tracing correlates a single request across multiple services by propagating trace context.

### W3C Trace Context (Traceparent)

```yaml
traceparent_header:
  format: "00-{trace_id}-{span_id}-{trace_flags}"
  trace_id: "4bf92f3577b34da6a3ce929d0e0e4736"  # 16 bytes, hex
  span_id: "00f067aa0ba902b7"                     # 8 bytes, hex
  trace_flags: "01"                                # 01 = sampled, 00 = not sampled
  version: "00"                                    # Version 00

tracestate_header:
  format: "vendor1=value1,vendor2=value2"
  example: "dd=4bf92f3577b34da6a3ce929d0e0e4736,confluent=abc123"
```

### Propagation Across Protocols

```javascript
// HTTP propagation (automatic with OTel instrumentation)
// Incoming: extracts traceparent from headers
// Outgoing: injects traceparent into request headers

// Manual propagation for message queues
import { propagation } from '@opentelemetry/api';

// Inject into Kafka message headers
const message = { key: 'order-123', value: JSON.stringify(orderData) };
propagation.inject(activeContext, message, {
  set: (msg, key, value) => { msg.headers = msg.headers || {}; msg.headers[key] = value; }
});

// Extract from Kafka message
const extractedContext = propagation.extract(context.active(), msg, {
  get: (msg, key) => msg.headers?.[key],
  keys: (msg) => Object.keys(msg.headers || {})
});
```

## Sampling Decisions

### Head-Based Sampling (Decision at Root)
```yaml
sampling:
  type: head_based
  strategy: consistent_probability
  rate: 0.001  # 1 in 1000 requests sampled
  sampler: "AlwaysOn for health checks, ParentBased(ratio) for traffic"
```

```javascript
import { TraceIdRatioBasedSampler, ParentBasedSampler } from '@opentelemetry/sdk-trace-base';

// Parent-based: respects parent sampling decision, falls back to ratio
const sampler = new ParentBasedSampler({
  root: new TraceIdRatioBasedSampler(0.001), // 0.1% of root spans
  remoteParentSampled: true,                 // Always sample if parent was sampled
});

const sdk = new NodeSDK({
  sampler,
  traceExporter: new OTLPTraceExporter(),
});
```

### Tail-Based Sampling (Decision at Collection)

```yaml
tail_sampling:
  advantages:
    - Complete traces (no missing spans)
    - Error-focused sampling (keep all error traces)
    - Adaptive to traffic patterns
  policies:
    - name: errors
      type: status_code
      status: ERROR
      sample_rate: 1.0  # Keep ALL errors
    - name: high_latency
      type: latency
      threshold_ms: 1000
      sample_rate: 0.5  # Keep 50% of slow traces
    - name: probabilistic
      type: probabilistic
      sample_rate: 0.001  # 0.1% of remaining
```

### Sampling Headers
```
// Propagate sampling decision so downstream services respect it
// tracestate: otel=00;r=1:sampled
// Or use W3C traceparent flags:
// traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
//                                                          ^^
//                                                       01=sampled
```

## Span Attributes

### Semantic Conventions

```javascript
// HTTP spans
span.setAttributes({
  'http.method': 'POST',
  'http.url': 'https://api.example.com/orders',
  'http.status_code': 201,
  'http.route': '/orders',
  'http.request_content_length': 1024,
});

// Database spans
span.setAttributes({
  'db.system': 'postgresql',
  'db.name': 'orders_db',
  'db.statement': 'SELECT * FROM orders WHERE id = $1',
  'db.operation': 'SELECT',
  'db.sql.table': 'orders',
});

// Messaging spans
span.setAttributes({
  'messaging.system': 'kafka',
  'messaging.destination': 'order-events',
  'messaging.operation': 'process',
  'messaging.kafka.partition': '3',
  'messaging.kafka.message_offset': '456',
});

// Custom business attributes
span.setAttributes({
  'order.id': 'ORD-12345',
  'order.amount': 49.99,
  'order.currency': 'USD',
  'order.payment_method': 'credit_card',
  'customer.tier': 'premium',
});
```

### Cardinality Warning
Span attribute values should have bounded cardinality. Never put unbounded values like user IDs, session tokens, or timestamps as span attributes — they explode the index.

```javascript
// GOOD: bounded cardinality attributes
span.setAttribute('http.status_code', 200);  // ~50 possible values
span.setAttribute('payment.method', 'card'); // 5-10 values
span.setAttribute('customer.tier', 'gold');  // 3-5 values

// BAD: unbounded cardinality
span.setAttribute('user.id', 'user-abc-123');        // Millions
span.setAttribute('session.token', 'tok_abc...');    // Unlimited
span.setAttribute('request.timestamp', Date.now());  // Always unique
```

## Trace Analytics

### Identifying Hotspots
```
Query: Find spans with average duration > 500ms in the last hour

SELECT
  span.name,
  AVG(duration_ms) as avg_duration,
  P50(duration_ms) as p50,
  P95(duration_ms) as p95,
  P99(duration_ms) as p99,
  COUNT(*) as total_spans
FROM spans
WHERE time > NOW() - 1h AND duration_ms > 500
GROUP BY span.name
ORDER BY avg_duration DESC
```

### Error Trace Analysis
```
Query: Find traces with errors grouped by service

SELECT
  resource.service.name as service,
  span.name,
  span.status.code,
  COUNT(DISTINCT trace_id) as error_traces
FROM spans
WHERE time > NOW() - 24h AND span.status.code = 2  // ERROR
GROUP BY service, span.name, span.status.code
ORDER BY error_traces DESC
```

### Trace to Log Correlation

```javascript
// Include trace context in structured logs
const traceId = span.spanContext().traceId;
const spanId = span.spanContext().spanId;

logger.info({
  message: 'Payment processed successfully',
  orderId: 'ORD-12345',
  amount: 49.99,
  traceId,    // Used to link log → trace
  spanId,     // Used to link log → span
});

// In the observability backend:
// Click on log → jump to trace waterfall
// Click on trace span → jump to related logs
```

## Distributed Tracing Best Practices

- **Always propagate**: Ensure every service/library propagates trace context
- **Name spans meaningfully**: Use `{action} {resource}` pattern: `CreateOrder`, `ProcessPayment`
- **Add error details**: Record exception type, message, and stack trace on error spans
- **Set span status**: `span.setStatus({ code: SpanStatusCode.ERROR })` on failures
- **Track async boundaries**: Ensure context propagates through async callbacks, promises, and queues
- **Avoid span leaks**: End spans in `finally` blocks to prevent orphan spans on errors
