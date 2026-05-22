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
Every log entry is a single JSON object with these fields: `timestamp` (ISO 8601, millisecond precision), `level` (ERROR/WARN/INFO/DEBUG), `logger` (source class/module name), `message` (human-readable summary), `structuredContext` (object containing `traceId`, `spanId`, `userId`, `requestId`, `service`, `version`, `environment`, `correlationId`). Additional fields added per log statement as context.

### Step 2: Log Level Discipline
ERROR: application cannot fulfill a request — failure, exception, outage. WARN: degradation or unexpected state — retry happened, fallback used, rate limit hit. INFO: state change — request started/completed, user created, payment processed. DEBUG: development detail — query parameters, function entry/exit, variable values. Production: only ERROR, WARN, and INFO. DEBUG enabled per-request via header or temporary config.

### Step 3: Log Output Format
JSON lines format (LDJSON/NDJSON): one JSON object per line, no pretty printing, no multi-line logs. Output to stdout only — never write to files in production. Stderr for fatal/crash errors only. Log shipping via sidecar (Fluentd, Logstash, Vector) or cloud agent (CloudWatch agent, Datadog agent). Never use file appenders in production containers.

### Step 4: Context Propagation
Correlation ID: generated at ingress (API gateway, load balancer, or first service), propagated via HTTP headers (`X-Correlation-ID`, `x-request-id`) through all service calls. Async boundaries: manually pass correlation ID through message headers for queues, streams, and event buses. Include `traceId` and `spanId` for distributed tracing integration. Every log entry includes the correlation context.

### Step 5: Sensitive Data Redaction
Pattern-based redaction for: passwords, secrets, tokens, API keys, SSN, email addresses, credit card numbers, phone numbers. Redaction function: matches pattern → replaces with masked value (e.g., `"email": "j***@example.com"`). Reversible format for auditing: store hash of original value alongside masked version. Apply redaction at the logger boundary — never in business logic.

### Step 6: Sampling Strategy
ERROR: always logged (100% sample). WARN: sampled at 100% (always log warnings). INFO: sampled at 10% for high-traffic endpoints (can be adjusted per endpoint or per user for debugging). DEBUG: sampled at 1% or disabled entirely in production. Dynamic sampling: increase sample rate when error rate increases. Rate limiting: max N log entries per second per service instance, oldest dropped first.

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

## References
- `references/logging-schema.md` — JSON schema, field definitions, context propagation
- `references/log-shipping.md` — Stdout capture, sidecar config, aggregation pipeline, sampling

## Handoff
`devops-observability` for metrics collection and distributed tracing setup
