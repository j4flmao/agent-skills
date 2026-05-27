# Log Correlation and Tracing

Correlating logs across services is essential for debugging distributed systems.

## OpenTelemetry Integration

```typescript
import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import { Logger } from 'pino';

class OpenTelemetryLogger {
  private baseLogger: Logger;

  constructor(baseLogger: Logger) {
    this.baseLogger = baseLogger;
  }

  private getTraceContext(): Record<string, string> {
    const span = trace.getSpan(context.active());
    if (!span) return {};

    const spanContext = span.spanContext();
    return {
      'trace.id': spanContext.traceId,
      'span.id': spanContext.spanId,
      'trace.flags': spanContext.traceFlags.toString(),
    };
  }

  info(msg: string, data?: Record<string, unknown>): void {
    this.baseLogger.info({ ...this.getTraceContext(), ...data }, msg);
  }

  error(msg: string, data?: Record<string, unknown>): void {
    this.baseLogger.error({ ...this.getTraceContext(), ...data }, msg);
  }
}
```

## Trace Context Propagation

Propagate trace context across HTTP calls:

```typescript
import { propagation, context as otelContext } from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';

const propagator = new W3CTraceContextPropagator();

// Outgoing HTTP request — inject context into headers
function injectTraceContext(headers: Record<string, string>): Record<string, string> {
  const carrier: Record<string, string> = {};
  propagator.inject(otelContext.active(), carrier, {
    set: (carrier, key, value) => { carrier[key] = value; },
  });
  return { ...headers, ...carrier };
}

// Incoming HTTP request — extract context from headers
function extractTraceContext(headers: Record<string, string>): void {
  const ctx = propagator.extract(otelContext.active(), headers, {
    get: (carrier, key) => carrier[key],
    keys: (carrier) => Object.keys(carrier),
  });
  otelContext.with(ctx, () => {}); // set as active context
}
```

## Correlation ID Flow

Generate and propagate a single correlation ID across all services:

```typescript
import { v4 as uuidv4 } from 'uuid';

class CorrelationMiddleware {
  handle(req: Request, res: Response, next: NextFunction): void {
    const correlationId = req.headers['x-correlation-id'] as string ?? uuidv4();
    req.correlationId = correlationId;
    res.setHeader('x-correlation-id', correlationId);

    // Store in async context for the request
    asyncLocalStorage.run({ correlationId }, () => {
      next();
    });
  }
}

// Access correlation ID anywhere in the request chain
function getCorrelationId(): string {
  return asyncLocalStorage.getStore()?.correlationId ?? 'unknown';
}
```

## Async Context for Message Queues

Propagate context through async boundaries:

```typescript
import { AsyncLocalStorage } from 'async_hooks';

const messageContext = new AsyncLocalStorage<{ correlationId: string; traceId: string }>();

// Producer: set context before publishing
async function publishWithContext(topic: string, message: unknown): Promise<void> {
  const ctx = messageContext.getStore();
  await kafkaProducer.send({
    topic,
    messages: [{
      value: JSON.stringify(message),
      headers: {
        'correlation-id': ctx?.correlationId,
        'trace-id': ctx?.traceId,
      },
    }],
  });
}

// Consumer: restore context on receipt
async function consumeWithContext(eachMessage: (msg: KafkaMessage) => Promise<void>) {
  await kafkaConsumer.run({
    eachMessage: async ({ message }) => {
      const headers = message.headers;
      await messageContext.run({
        correlationId: headers['correlation-id']?.toString() ?? uuidv4(),
        traceId: headers['trace-id']?.toString() ?? uuidv4(),
      }, () => eachMessage(message));
    },
  });
}
```

## Log Correlation Schema

```json
{
  "@timestamp": "2026-05-27T10:30:00.123Z",
  "log.level": "ERROR",
  "message": "Payment processing failed",
  "trace.id": "0af7651916cd43dd8448eb211c80319c",
  "span.id": "b7ad6b7169203331",
  "trace.flags": "01",
  "service.name": "payment-service",
  "service.instance.id": "payment-abc123",
  "correlation.id": "corr-987654",
  "transaction.id": "txn-555222",
  "error.id": "err-abc-def"
}
```

## Log View Query Patterns

```yaml
# Find all logs for a specific request
query: "correlation.id:corr-987654"

# Find all logs across services for a trace
query: "trace.id:0af7651916cd43dd8448eb211c80319c"

# Find all errors in a specific trace
query: "trace.id:0af7651916cd43dd8448eb211c80319c AND log.level:ERROR"

# Waterfall view: sort by timestamp to see request flow
query: "trace.id:0af7651916cd43dd8448eb211c80319c"
sort: "@timestamp:asc"
```

## Key Points
- Integrate OpenTelemetry for automatic trace ID injection into logs
- Propagate trace context via W3C Trace Context headers across HTTP calls
- Use a single correlation ID for the entire request flow
- Use AsyncLocalStorage to track context across async boundaries
- Propagate context through message queue headers
- Include trace.id, span.id, and correlation.id in every log entry
- Query by trace ID to see the full request flow across all services
