# Log Format Schema

## Elastic Common Schema (ECS) Fields

```json
{
  "@timestamp": "2025-01-15T10:30:00.123Z",
  "log.level": "INFO",
  "log.logger": "checkout.service",
  "message": "Order created successfully",
  "trace.id": "abc123def456",
  "span.id": "span-789",
  "transaction.id": "txn_abc",
  "service.name": "checkout-service",
  "service.version": "1.2.3",
  "service.environment": "production",
  "event.action": "order.create",
  "event.outcome": "success",
  "event.duration": 234,
  "client.user.id": "user_98765",
  "http.request.id": "req_4444",
  "http.request.method": "POST",
  "http.response.status_code": 201,
  "url.path": "/api/orders",
  "labels": {
    "team": "checkout",
    "feature": "new-checkout"
  },
  "error": {
    "type": "ValidationError",
    "message": "Invalid coupon code",
    "code": "INVALID_COUPON",
    "stack_trace": "ValidationError: ..."
  }
}
```

## Required vs Optional Fields

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `@timestamp` | Yes | ISO8601 | Millisecond precision, always UTC |
| `log.level` | Yes | string | ERROR, WARN, INFO, DEBUG |
| `log.logger` | Yes | string | Source class/module name |
| `message` | Yes | string | Human-readable summary |
| `trace.id` | Conditional | string | Present if tracing enabled |
| `service.name` | Yes | string | Application or service name |
| `service.environment` | Yes | string | production, staging, development |
| `event.action` | Yes | string | Business operation name |
| `event.outcome` | Yes | string | success, failure, unknown |
| `http.request.id` | Yes | string | Unique request identifier |
| `error.type` | If error | string | Exception class or error code |
| `user.id` | If available | string | Authenticated user identifier |

## Log Level Definition

| Level | Numeric | When to Use | Example |
|-------|---------|-------------|---------|
| FATAL | 0 | Application cannot continue | Out of memory, DB unreachable, config corruption |
| ERROR | 1 | Request cannot be served normally | DB query failed, external API returned 500, validation rejected |
| WARN | 2 | Degradation but request still served | Circuit breaker opened, fallback cache used, rate limit reached |
| INFO | 3 | State transition | User registered, order placed, payment confirmed, job started/completed |
| DEBUG | 4 | Development detail | SQL queries, function entry/exit, external API request/response |
| TRACE | 5 | Deep diagnosis | Variable values, loop iterations, every HTTP header |

Production logging: FATAL (100%), ERROR (100%), WARN (100%), INFO (sampled), DEBUG (disabled or trace-only).

## Logger Configuration by Language

```typescript
// Pino — Node.js
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
    paths: ['password', 'secret', 'token', 'ssn', 'email', 'creditCard', 'authorization'],
    censor: '[REDACTED]',
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
  timestamp: false, // handled in formatter
});
```

```csharp
// Serilog — .NET
using Serilog;
using Serilog.Formatting.Ecs;

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .Enrich.WithProperty("service.name", "checkout-service")
    .Enrich.WithProperty("service.environment", env)
    .Enrich.WithCorrelationId()
    .Filter.ByExcluding(log => log.Properties.ContainsKey("Noisy") && (bool)log.Properties["Noisy"])
    .WriteTo.Console(new EcsTextFormatter())
    .CreateLogger();

// Usage
Log.Information("Order {OrderId} created with amount {Amount}", orderId, amount);
Log.Error(ex, "Payment processing failed for order {OrderId}", orderId);
```

```go
// Zerolog — Go
import "github.com/rs/zerolog"
import "github.com/rs/zerolog/log"

zerolog.TimeFieldFormat = time.RFC3339Nano
zerolog.LevelFieldName = "log.level"
zerolog.MessageFieldName = "message"
zerolog.TimestampFieldName = "@timestamp"

logger := log.With().
  Str("service.name", "checkout-service").
  Str("service.environment", os.Getenv("ENV")).
  Logger()

logger.Info().
  Str("orderId", orderId).
  Float64("amount", 49.99).
  Msg("Order created successfully")

logger.Error().
  Err(err).
  Str("orderId", orderId).
  Msg("Payment processing failed")
```

## Context Propagation Middleware

```typescript
// Express middleware — correlation ID and context
import { v4 as uuidv4 } from 'uuid';

function loggingMiddleware(req: Request, res: Response, next: NextFunction) {
  const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
  const requestId = uuidv4();
  const startTime = Date.now();

  // Attach context to request for downstream use
  req.logContext = {
    correlationId,
    requestId,
    traceId: req.headers['x-trace-id'] as string,
    userId: req.user?.id,
    service: 'checkout-service',
    environment: process.env.NODE_ENV,
  };

  // Log request start
  logger.info({
    ...req.logContext,
    'event.action': 'request.start',
    'http.request.method': req.method,
    'url.path': req.path,
    'http.request.id': requestId,
  });

  // Log response completion
  res.on('finish', () => {
    logger.info({
      ...req.logContext,
      'event.action': 'request.complete',
      'http.response.status_code': res.statusCode,
      'event.duration': Date.now() - startTime,
    });
  });

  next();
}
```

## PII Redaction Patterns

```typescript
const REDACTION_PATTERNS = [
  { pattern: /\b[\w\.-]+@[\w\.-]+\.\w+\b/g, replacement: (m: string) => `${m[0]}***@${m.split('@')[1]}` },
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '***-**-****' }, // SSN
  { pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g, replacement: '****-****-****-****' }, // Credit card
  { pattern: /\b(\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g, replacement: '***-***-****' },
  { pattern: /\b(?:password|secret|token|api[_-]?key|authorization)\s*[:=]\s*\S+/gi, replacement: '$1: [REDACTED]' },
];

function redactSensitiveData(obj: Record<string, unknown>): Record<string, unknown> {
  const sanitized = JSON.stringify(obj);
  const redacted = REDACTION_PATTERNS.reduce((str, { pattern, replacement }) =>
    str.replace(pattern, replacement), sanitized);
  return JSON.parse(redacted);
}
```

## Log Level Usage Guidelines

```yaml
guidelines:
  ERROR:
    - Unhandled exceptions in request handlers
    - Downstream service returns 5xx after all retries exhausted
    - Database connection failures
    - Authentication/authorization failures
    - Data integrity violations
  WARN:
    - Circuit breaker state change (open → closed, closed → open)
    - Rate limit approaching threshold (80%+)
    - Cache miss for critical data
    - Retry attempt (especially >50% of max retries)
    - Deprecated API endpoint called
  INFO:
    - Request lifecycle (start, complete)
    - Entity state changes (created, updated, deleted)
    - Job processing lifecycle
    - External API calls (successful)
    - Configuration loading
  DEBUG:
    - SQL query parameters and execution time
    - External API request/response bodies
    - Function argument values
    - Loop iteration details
    - Cache keys and hit/miss decisions
```

## Common Pitfalls

- **String interpolation in message**: `log.info("User " + name + " created")` loses structured querying. Always use structured fields: `log.info({user: name}, "User created")`.
- **Multi-line log entries**: Newlines in log messages break JSON line parsers. Strip or escape newlines before logging.
- **Logging sensitive data in plaintext**: Passwords, tokens, and PII in logs is a compliance violation. Always redact at the logger boundary.
- **Inconsistent field naming**: Mixing `camelCase`, `snake_case`, and `PascalCase` across services makes querying harder. Adopt ECS or similar convention across all services.
- **Overly verbose logging in hot paths**: Logging on every database query (SELECT 1) in a high-throughput endpoint generates terabytes of useless data. Sample or disable DEBUG in production.
- **No correlation ID across async boundaries**: Without propagating correlation ID through message queues or event streams, distributed request tracing breaks. Always pass correlation ID in message headers.
