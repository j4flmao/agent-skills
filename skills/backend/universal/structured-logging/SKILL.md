---
name: backend-structured-logging
description: >
  Use this skill when implementing logging frameworks, log formats, or distributed tracing correlation. This skill enforces: JSON lines format, strict log schema with correlation IDs, PII redaction, log level discipline, and stdout-only output. Applies to any backend stack with Winston/Pino/Serilog/Log4j/logrus/zerolog. Do NOT use for: metrics collection, audit trail systems, or application performance monitoring.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, logging, phase-6, universal]
---

# Backend Structured Logging

## Purpose
Design structured JSON logging with consistent schema, context propagation, and sampling.

## Agent Protocol

### Trigger
Exact user phrases: "structured logging", "JSON logging", "log format", "logging best practice", "log levels", "distributed tracing", "log correlation", "structured log", "logging library", "log aggregation", "log output", "log schema", "correlation ID".

### Input Context
Before activating, verify:
- Logging framework (Winston/Pino/Serilog/Log4j/logrus/zerolog)
- Log aggregation system (Elasticsearch/Loki/CloudWatch/Datadog)
- Compliance requirements (audit log retention, PII handling, access logs)

### Output Artifact
Logging schema and configuration as formatted text.

### Response Format
```yaml
# Log schema (JSON fields)
# Log levels and sampling rules
```
```typescript
// Logger configuration
// Context propagation middleware
// PII redaction config
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Log schema defined with all required fields (timestamp, level, message, context)
- [ ] Log levels configured with production rules (ERROR/WARN/INFO, sampled DEBUG)
- [ ] Log output configured as JSON lines to stdout
- [ ] Context propagation implemented (correlation ID through all async boundaries)
- [ ] Sensitive data redaction with pattern-based masking
- [ ] Sampling strategy defined per log level

### Max Response Length
200 lines of configuration and code.

## Workflow

### Step 1: Log Schema Definition
Every log entry is a single JSON object with required fields: `@timestamp` (ISO 8601, millisecond precision, UTC), `log.level` (ERROR/WARN/INFO/DEBUG), `log.logger` (source class/module), `message` (human-readable summary), `trace.id`, `span.id`, `service.name`, `service.environment`, `event.action`, `http.request.id`. Follow Elastic Common Schema (ECS) for consistency across services.

```json
{
  "@timestamp": "2025-01-15T10:30:00.123Z",
  "log.level": "INFO",
  "log.logger": "checkout.service",
  "message": "Order created successfully",
  "trace.id": "abc123def456",
  "span.id": "span-789",
  "service.name": "checkout-service",
  "service.version": "1.2.3",
  "service.environment": "production",
  "event.action": "order.create",
  "event.outcome": "success",
  "event.duration": 234,
  "http.request.id": "req_4444",
  "http.request.method": "POST",
  "http.response.status_code": 201,
  "url.path": "/api/orders",
  "client.user.id": "user_98765",
  "labels": { "team": "checkout", "feature": "new-checkout" }
}
```

### Step 2: Log Level Discipline
| Level | Numeric | When to Use | Sample in Prod | Example |
|-------|---------|-------------|----------------|---------|
| FATAL | 0 | Application cannot continue | 100% | OOM, DB unreachable |
| ERROR | 1 | Request cannot be served | 100% | External API 500, validation fails |
| WARN | 2 | Degradation but served | 100% | Circuit breaker opened, fallback used |
| INFO | 3 | State transition | 10% | User created, order placed |
| DEBUG | 4 | Development detail | 0-1% | SQL queries, function params |
| TRACE | 5 | Deep diagnosis | 0% | Variable values, loop iterations |

Production: only FATAL (100%), ERROR (100%), WARN (100%), INFO (sampled), DEBUG (disabled or header-activated). Per-request DEBUG: enabled via `X-Debug-Log: true` header for debugging specific requests.

### Step 3: Logger Configuration by Language

```typescript
// Pino — Node.js (fastest JSON logger)
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level(label) { return { 'log.level': label }; },
    bindings() { return {}; },
    log(obj) {
      obj['@timestamp'] = new Date().toISOString();
      obj['service.name'] = process.env.SERVICE_NAME || 'unknown';
      obj['service.environment'] = process.env.NODE_ENV || 'development';
      return obj;
    },
  },
  redact: {
    paths: ['password', 'secret', 'token', 'ssn', 'email', 'creditCard', 'authorization'],
    censor: '[REDACTED]',
  },
  serializers: { err: pino.stdSerializers.err, req: pino.stdSerializers.req, res: pino.stdSerializers.res },
  timestamp: false,
});
```

```csharp
// Serilog — .NET with ECS format
using Serilog;
using Serilog.Formatting.Ecs;

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .Enrich.WithProperty("service.name", "checkout-service")
    .Enrich.WithProperty("service.environment", env)
    .Enrich.WithCorrelationIdHeader("X-Correlation-ID")
    .WriteTo.Console(new EcsTextFormatter())
    .CreateLogger();

Log.Information("Order {OrderId} created with amount {Amount}", orderId, 49.99);
```

```go
// Zerolog — Go
import "github.com/rs/zerolog/log"

zerolog.TimeFieldFormat = time.RFC3339Nano
zerolog.LevelFieldName = "log.level"
zerolog.MessageFieldName = "message"
zerolog.TimestampFieldName = "@timestamp"

logger := log.With().
  Str("service.name", "checkout-service").
  Str("service.environment", os.Getenv("ENV")).
  Logger()

logger.Info().Str("orderId", orderId).Float64("amount", 49.99).Msg("Order created")
logger.Error().Err(err).Str("orderId", orderId).Msg("Payment failed")
```

### Step 4: Context Propagation
Correlation ID: generated at ingress (API gateway or first service), propagated via HTTP headers (`X-Correlation-ID`, `x-request-id`) through all service calls. Async boundaries: manually pass correlation ID through message headers for queues, streams, and event buses. Every log entry includes the correlation context.

```typescript
// Express middleware
function loggingMiddleware(req: Request, res: Response, next: NextFunction) {
  const correlationId = req.headers['x-correlation-id'] as string || uuidv4();
  const requestId = uuidv4();
  req.logContext = { correlationId, requestId, traceId: req.headers['x-trace-id'] as string };
  logger.info({ ...req.logContext, 'event.action': 'request.start', 'http.request.method': req.method, 'url.path': req.path });
  res.on('finish', () => {
    logger.info({ ...req.logContext, 'event.action': 'request.complete', 'http.response.status_code': res.statusCode, 'event.duration': Date.now() - startTime });
  });
  next();
}
```

### Step 5: PII Redaction
Pattern-based redaction at the logger boundary (never in business logic). Redact: passwords, secrets, tokens, API keys, SSN, email addresses, credit card numbers, phone numbers. Masked format: `j***@example.com`, `****-****-****-1234`. Store reversible hash for audit purposes.

```typescript
const REDACTION_PATTERNS = [
  { pattern: /\b[\w.-]+@[\w.-]+\.\w+\b/g, replacement: (m: string) => `${m[0]}***@${m.split('@')[1]}` },
  { pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g, replacement: '****-****-****-****' },
  { pattern: /\b(?:password|secret|token|api[_-]?key|authorization)\s*[:=]\s*\S+/gi, replacement: '$1: [REDACTED]' },
];
```

### Step 6: Sampling and Rate Limiting
| Level | Strategy | Rate |
|-------|----------|------|
| ERROR | Always log | 100% |
| WARN | Always log | 100% |
| INFO | Per-endpoint rate | 10% default, 0% for /health, 100% for /api/orders |
| DEBUG | Dynamic | 1% or header-activated |

Adaptive sampling: increase INFO sample rate from 10% to 50% when error rate spikes, decrease when stable. Rate limiting: max 5000 entries/second per service instance, drop oldest exceeding limit.

### Step 7: Log Output and Shipping
JSON lines format (LDJSON/NDJSON): one JSON object per line, no pretty printing. Output to stdout only — never write to files in production. Stderr for fatal/crash errors. Log shipping via sidecar (Vector, Fluentd, Logstash) or cloud agent (CloudWatch agent, Datadog agent). Never use file appenders in containers.

## Configuration Reference

```yaml
logging:
  level: info
  format: json
  output: stdout
  ecs_compatible: true
  sampling:
    error: { rate: 1.0 }
    warn: { rate: 1.0 }
    info: { rate: 0.1, endpoints: { /health: 0.0, default: 0.1 } }
    debug: { rate: 0.01 }
  rate_limit:
    max_per_second: 5000
    strategy: drop_oldest
  redaction:
    enabled: true
    patterns: [password, secret, token, ssn, email, creditCard, authorization]
    censor: "[REDACTED]"
  retention:
    error: 90d
    warn: 30d
    info: 14d
    debug: 7d
```

## Rules
- Logs are JSON lines — one JSON object per line
- No multi-line logs
- No string interpolation in the message field — use structured fields
- PII is redacted before logging
- Correlation ID flows through every log entry in a request
- Production log level is INFO or WARN
- Never log in hot paths (>1000/s without sampling)
- Logs go to stdout — not files
- Log shipping is infrastructure concern, not application concern
- Follow ECS (Elastic Common Schema) for field naming

## References
  - references/log-aggregation.md — Log Aggregation and Analysis
  - references/log-correlation-tracing.md — Log Correlation and Tracing
  - references/log-format.md — Log Format Schema
  - references/log-sampling-strategies.md — Log Sampling Strategies
  - references/log-shipping.md — Log Shipping
  - references/logging-aggregation.md — Logging Aggregation
  - references/logging-architecture.md — Logging Architecture
  - references/structured-logging-implementation.md — Structured Logging Patterns
## Handoff
`devops-observability` for metrics collection and distributed tracing setup
