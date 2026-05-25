# Logging Architecture

## Log Pipeline

```
Application ──stdout──► Log Shipper ──► Buffer ──► Indexer ──► Storage ──► Query
  (JSON lines)        (Vector/Fluentd)  (Kafka)    (Logstash)   (ES/Loki)   (Kibana/Grafana)
```

## Log Schema (ECS Compliant)

```json
{
  "@timestamp": "2026-05-25T10:30:00.123Z",
  "log.level": "INFO",
  "message": "Order created successfully",
  "ecs.version": "8.11.0",
  "service.name": "order-service",
  "service.version": "1.2.3",
  "service.environment": "production",
  "event.action": "order.create",
  "event.outcome": "success",
  "event.duration": 234,
  "event.category": ["process"],
  "event.type": ["start"],
  "trace.id": "abc123def456",
  "span.id": "span-789",
  "transaction.id": "txn-456",
  "http.request.id": "req_4444",
  "http.request.method": "POST",
  "http.response.status_code": 201,
  "url.path": "/api/orders",
  "client.ip": "203.0.113.42",
  "user.id": "user_98765",
  "user.roles": ["customer"],
  "labels": { "team": "checkout", "feature": "new-checkout" },
  "log.sampling.rate": 0.1
}
```

## Structured Logging by Language

### TypeScript (Pino)

```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level(label) { return { 'log.level': label }; },
    bindings() { return {}; },
    log(obj) {
      obj['@timestamp'] = new Date().toISOString();
      obj['service.name'] = process.env.SERVICE_NAME;
      obj['service.environment'] = process.env.NODE_ENV;
      return obj;
    },
  },
  redact: {
    paths: ['password', 'secret', 'token', 'authorization', 'cookie'],
    censor: '[REDACTED]',
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
  timestamp: false,
});
```

### Go (Zerolog)

```go
import "github.com/rs/zerolog/log"

zerolog.TimeFieldFormat = time.RFC3339Nano
zerolog.LevelFieldName = "log.level"
zerolog.MessageFieldName = "message"
zerolog.TimestampFieldName = "@timestamp"

logger := log.With().
  Str("service.name", "order-service").
  Str("service.environment", os.Getenv("ENV")).
  Logger()

logger.Info().
  Str("orderId", "ord_123").
  Float64("amount", 49.99).
  Str("event.action", "order.create").
  Msg("Order created successfully")
```

### .NET (Serilog)

```csharp
using Serilog;
using Serilog.Formatting.Ecs;

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .Enrich.WithProperty("service.name", "order-service")
    .Enrich.WithProperty("service.environment", env)
    .Enrich.WithCorrelationIdHeader("X-Correlation-ID")
    .WriteTo.Console(new EcsTextFormatter())
    .CreateLogger();

Log.Information("Order {OrderId} created with amount {Amount}", orderId, 49.99);
```

### Python (Structlog)

```python
import structlog
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.stdlib.add_log_level,
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

logger.info("order.created", order_id="ord_123", amount=49.99, event_action="order.create")
```

## Context Propagation

```typescript
// Express middleware — propagates correlation ID
function contextMiddleware(req: Request, res: Response, next: NextFunction) {
  const correlationId = req.headers['x-correlation-id'] as string || uuidv4();
  const requestId = uuidv4();
  const traceId = req.headers['x-trace-id'] as string || correlationId;

  const logContext = {
    correlationId,
    requestId,
    traceId,
    'http.request.id': requestId,
    'trace.id': traceId,
  };

  // Attach to request for downstream use
  req.logContext = logContext;

  // Log start of request
  logger.info({ ...logContext, 'event.action': 'request.start', 'http.request.method': req.method, 'url.path': req.path });

  // Log end of request
  const startTime = Date.now();
  res.on('finish', () => {
    logger.info({
      ...logContext,
      'event.action': 'request.complete',
      'http.response.status_code': res.statusCode,
      'event.duration': Date.now() - startTime,
      'event.outcome': res.statusCode < 400 ? 'success' : 'failure',
    });
  });

  next();
}
```

## Log Levels and Sampling

| Level | When to Use | Production Sample Rate | Storage Retention |
|-------|-------------|----------------------|-------------------|
| FATAL | Application cannot continue | 100% | 90 days |
| ERROR | Request cannot be served, external failure | 100% | 90 days |
| WARN | Degraded but served, fallback used | 100% | 30 days |
| INFO | State transitions, business events | 10% (adaptive) | 14 days |
| DEBUG | Development debugging | 0% (header-activated) | 7 days |
| TRACE | Deep diagnostics | 0% (never in prod) | Not stored |

## Adaptive Sampling

```typescript
class AdaptiveSampler {
  private errorRate = 0;
  private sampleRates = { info: 0.1 };

  async recordError(): Promise<void> {
    this.errorRate++;
    setTimeout(() => this.errorRate--, 60000); // Decay after 1 min

    // Increase info sampling when error rate spikes
    if (this.errorRate > 10) {
      this.sampleRates.info = 0.5;
    } else {
      this.sampleRates.info = 0.1;
    }
  }

  shouldSample(level: string): boolean {
    if (['fatal', 'error', 'warn'].includes(level)) return true;
    if (level === 'info') return Math.random() < this.sampleRates.info;
    if (level === 'debug') return process.env.LOG_LEVEL === 'debug';
    return false;
  }
}
```

## Output Configuration

```yaml
output:
  stdout:
    enabled: true
    format: json_lines
    level: info

  # File logging disabled in production (containerized)
  file:
    enabled: false

  # Structured log fields
  include: [timestamp, level, message, service, trace, event, http, error, labels]
  exclude: [sensitive_fields, internal_references]
```

## Error Logging Best Practices

```typescript
// GOOD — structured error fields
logger.error({
  event: 'payment.failed',
  service: { name: 'payment-service' },
  error: { message: err.message, type: err.constructor.name, code: err.code },
  labels: { orderId, paymentMethod: 'card' },
}, 'Payment processing failed');

// BAD — string interpolation with sensitive data
logger.error(`Payment failed for order ${orderId}: ${err.message}`);
```

## Log Aggregation Query Patterns

```yaml
# Common log queries
queries:
  error_rate:
    query: "log.level:ERROR AND service.name:order-service"
    time: "last 15 minutes"
    alert: "> 1% of total requests"

  slow_requests:
    query: "event.duration > 5000 AND event.category:http"
    time: "last 5 minutes"
    alert: "> 10 occurrences"

  specific_error:
    query: "error.code:PAYMENT_DECLINED AND service.name:payment-service"
    time: "last 1 hour"
    alert: "> 50 occurrences"

  correlation:
    query: "trace.id:abc123def456 AND log.level:ERROR"
    time: "last 24 hours"
```
