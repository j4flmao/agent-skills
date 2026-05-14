---
name: observability
description: >
  Use this skill when the user says 'observability', 'logging', 'metrics',
  'tracing', 'OpenTelemetry', 'Grafana', 'Prometheus', 'structured logs',
  'distributed tracing', 'monitoring', or when setting up observability for a
  service. Covers: three pillars (logs, metrics, traces), structured JSON logging,
  OpenTelemetry SDK setup per stack, SLO/SLI/SLA definitions, and alert design
  (alert on symptoms, not causes). Works with any language/stack.
  Do NOT use this for: infrastructure monitoring, database performance, or
  frontend analytics.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, observability, phase-5]
---

# Observability

## Purpose
Set up structured logging, metrics, and distributed tracing to understand system behavior in production.

## Agent Protocol

### Trigger
Exact user phrases: "observability", "logging", "metrics", "tracing", "OpenTelemetry", "Grafana", "Prometheus", "structured logs", "distributed tracing", "monitoring".

### Input Context
Before activating, verify:
- The stack is known (for OpenTelemetry SDK selection).
- The existing observability tooling is understood (Prometheus, Grafana, etc.).
- The traffic volume is known (for trace sampling strategy).

### Output Artifact
No file output. This skill produces an observability plan.

### Response Format
Observability plan: logging format, metrics list, trace sampling strategy, SLOs, alert rules.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick. No explanation of why observability is important.

### Completion Criteria
This skill is complete when:
- [ ] Structured JSON logging format is defined with required fields.
- [ ] Key metrics are listed (counters, gauges, histograms).
- [ ] Trace sampling strategy is specified.
- [ ] SLOs are defined with SLIs.
- [ ] Alert rules follow symptom-based (not cause-based) design.

### Max Response Length
40 lines.

## Quick Start
Three pillars: logs (what happened), metrics (how often/how much), traces (where it happened). Use JSON structured logging. OpenTelemetry for traces. Alert on symptoms (user impact), not causes.

## When to Use This Skill
- Setting up logging for a new service
- Implementing distributed tracing
- Defining SLOs and alerts
- Debugging production issues
- Reviewing observability gaps

## Core Workflow

### Step 1: Structured Logging
```json
// ✅ GOOD — structured JSON
{
  "level": "error",
  "message": "Payment processing failed",
  "service": "order-service",
  "traceId": "abc123",
  "userId": "user-456",
  "orderId": "order-789",
  "error": {
    "type": "PaymentTimeoutError",
    "message": "Payment gateway timeout after 30s",
    "stack": "..."
  },
  "duration_ms": 30042,
  "timestamp": "2026-05-14T10:30:00Z"
}

// ❌ BAD — unstructured text
// "Error processing order: something went wrong"
```

**Required fields**: `level`, `message`, `service`, `timestamp`, `traceId`
**Context fields**: `userId`, `orderId`, `requestId`, `duration_ms`

### Step 2: Metrics
| Type | Examples | Collection |
|------|----------|------------|
| **Counters** | Request count, error count, user signups | Prometheus Counter |
| **Gauges** | Active connections, queue depth, memory usage | Prometheus Gauge |
| **Histograms** | Request latency p50/p95/p99, payload size | Prometheus Histogram |

Key metrics for every service:
- `http_requests_total{method, path, status}` — request rate
- `http_request_duration_seconds{method, path}` — latency histogram
- `errors_total{type}` — error rate by type
- `service_up` — liveness (1 = healthy)

### Step 3: Distributed Tracing with OpenTelemetry
```typescript
// Node.js / TypeScript
import { trace } from '@opentelemetry/api'
const tracer = trace.getTracer('order-service')

async function placeOrder(command: PlaceOrderCommand) {
  return tracer.startActiveSpan('placeOrder', async (span) => {
    span.setAttribute('orderId', command.orderId)
    try {
      const result = await processPayment(command)
      span.setStatus({ code: SpanStatusCode.OK })
      return result
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message })
      span.recordException(error)
      throw error
    } finally {
      span.end()
    }
  })
}
```

### Step 4: SLO / SLI / SLA Definitions
| Term | Definition | Example |
|------|------------|---------|
| **SLI** | What you measure | Request latency p95 |
| **SLO** | Your target | < 200ms p95 over 30 days |
| **SLA** | Commitment to users | < 500ms p95, 99.9% uptime |

**SLO examples**:
- **Latency**: 95% of requests complete in < 200ms (rolling 30d window)
- **Availability**: 99.95% uptime (excluding planned maintenance)
- **Error rate**: < 0.1% of requests return 5xx

### Step 5: Alert Design
```
⚠️ ALERT ON SYMPTOMS (USER IMPACT), NOT CAUSES

❌ Bad alert: "CPU > 80%"
   — CPU spike doesn't always mean user impact
   — Causes alert fatigue

✅ Good alert: "p95 latency > 500ms for 5 minutes"
   — Users are experiencing slowness
   — Actionable: investigate immediately

✅ Good alert: "Error rate > 1% for 5 minutes"
   — Users are getting errors
   — Actionable: rollback or hotfix
```

**Alert severity**:
| Severity | Response Time | Examples |
|----------|---------------|----------|
| P0 | < 15 min | Service down, data loss, security breach |
| P1 | < 1 hour | Degraded performance, partial outage |
| P2 | < 1 day | Non-critical feature broken |
| P3 | Next sprint | Cosmetic, minor issues |

## Rules & Constraints
- All logs are structured JSON — no plain text or printf-style logging
- Every log line includes `traceId` for correlation
- Alert on symptoms (user impact), not causes — or you'll drown in alerts
- Metrics are cheap, traces are expensive — sample traces at 1-10% for high-traffic services
- Never log sensitive data (passwords, tokens, PII) — even in error messages
- SLOs are aspirational targets — don't set them so tight they cause alert fatigue

## Output Format
Observability plan: logging format, metrics list, trace sampling strategy, SLOs, alert rules.

## References
- `references/otel-guide.md` — OpenTelemetry setup per stack

## Handoff
After completing this skill:
- Next skill: **performance-profiler** — using observability data to find bottlenecks
- Pass context: logging format, metrics configuration, trace sampling rate
