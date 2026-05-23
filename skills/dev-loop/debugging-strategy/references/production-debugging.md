# Production Debugging

## Principles

Production debugging is fundamentally different from local debugging. You cannot attach a breakpoint, you cannot restart freely, and you must not worsen the outage. The goal is to gather enough evidence to reproduce and fix locally.

### The Production Debugging Hierarchy

```
1. Observability (always-on)
2. Post-mortem analysis (core dumps, logs)
3. Feature flags / dark launch
4. Read-only diagnostics
5. Live debugging (last resort)
```

## Structured Logging

### JSON Log Format

```typescript
// Production log entry schema
{
  "timestamp": "2026-05-14T10:30:00.123Z",
  "level": "ERROR",
  "message": "Payment processing failed",
  "correlation_id": "req_abc123",
  "service": "payment-service",
  "version": "1.2.3",
  "environment": "production",
  "duration_ms": 4523,
  "error": {
    "type": "StripeTimeoutError",
    "message": "Request timed out after 4.5s",
    "stack": "StripeTimeoutError: ...",
    "retryable": true
  },
  "context": {
    "payment_id": "pi_xyz789",
    "amount_cents": 2999,
    "currency": "USD",
    "attempt": 2
  }
}
```

### Correlation IDs

```typescript
// Middleware to generate and propagate correlation ID
app.use((req, res, next) => {
  req.correlationId = req.headers['x-correlation-id']
    || req.headers['x-request-id']
    || crypto.randomUUID()
  res.setHeader('x-correlation-id', req.correlationId)
  next()
})

// Pass to all downstream calls
async function processPayment(paymentId: string, correlationId: string) {
  const response = await fetch('https://stripe.com/api', {
    headers: { 'X-Correlation-Id': correlationId }
  })
}
```

### Logging Levels

| Level | When to Use | Example |
|-------|-------------|---------|
| ERROR | Service cannot fulfil request | Database connection failed, payment declined |
| WARN | Something unexpected but handled | Retry succeeded, rate limit approaching |
| INFO | Major lifecycle events | Deployment, config reload, migration |
| DEBUG | Detailed diagnostic info | Request parameters, state transitions |
| TRACE | Function-level execution flow | Loop iterations, recursion depth |

## Metrics-Driven Debugging

### RED Method

```
Rate   → Requests per second
Errors → Failed requests per second
Duration → Latency distribution (p50, p95, p99)
```

### USE Method

```
Utilization → % time resource busy (CPU 85%, memory 70%)
Saturation → queue depth or wait time
Errors → count of error events
```

### Key Metrics by Resource

| Resource | Utilization | Saturation | Errors |
|----------|-------------|------------|--------|
| CPU | CPU % | Load average, run queue | — |
| Memory | Used / total | OOM score, swap usage | OOM kills |
| Disk | I/O utilization | I/O wait, queue depth | I/O errors |
| Network | Bandwidth % | Drop rate, backlog | Interface errors |
| Database | Connection % | Query queue, lock waits | Deadlocks, timeouts |
| Connection Pool | Used / max | Wait queue size | Timeout errors |

## Health Check Endpoints

```typescript
// /health — liveness (is process alive?)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// /ready — readiness (can process requests?)
app.get('/ready', async (req, res) => {
  const checks = await Promise.allSettled([
    db.ping(),
    redis.ping(),
    queue.health(),
  ])
  const allHealthy = checks.every(c => c.status === 'fulfilled')
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ready' : 'not_ready',
    checks: checks.map((c, i) => ({
      name: ['database', 'cache', 'queue'][i],
      healthy: c.status === 'fulfilled',
    })),
  })
})

// /debug/vars — exposed internal state (admin-only)
app.get('/debug/vars', authenticateAdmin, (req, res) => {
  res.json({
    goroutines: process.memoryUsage(),
    uptime: process.uptime(),
    activeRequests: requestCounter,
    lastError: lastErrorTimestamp,
  })
})
```

## Distributed Tracing

### OpenTelemetry Setup

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({ url: 'http://jaeger:4318/v1/traces' }),
  instrumentations: [getNodeAutoInstrumentations()],
})
sdk.start()
```

### Manual Instrumentation

```typescript
import { trace } from '@opentelemetry/api'

const tracer = trace.getTracer('payment-service')

async function processPayment(payment: Payment) {
  return tracer.startActiveSpan('processPayment', async (span) => {
    span.setAttribute('payment.id', payment.id)
    span.setAttribute('payment.amount', payment.amount)
    try {
      const result = await chargeStripe(payment)
      span.setStatus({ code: SpanStatusCode.OK })
      return result
    } catch (err) {
      span.recordException(err)
      span.setStatus({ code: SpanStatusCode.ERROR, message: err.message })
      throw err
    } finally {
      span.end()
    }
  })
}
```

## Diagnostic Commands

### Kubernetes

```bash
# Pod logs with filtering
kubectl logs -l app=my-service --tail=1000 | jq 'select(.level == "ERROR")'

# Previous crashed pod logs
kubectl logs my-pod --previous

# Ephemeral debug container
kubectl debug my-pod -it --image=nicolaka/netshoot

# Port forward to service
kubectl port-forward service/my-service 8080:80

# Exec into pod
kubectl exec -it my-pod -- /bin/bash

# Resource usage
kubectl top pod my-pod
```

### Docker

```bash
# Container logs
docker logs --tail 500 <container-id>

# Resource usage
docker stats <container-id>

# Inspect running process
docker exec <container-id> ps aux

# Copy files from container
docker cp <container-id>:/var/log/app.log ./app.log
```

### Linux

```bash
# Real-time process monitoring
top -p <pid>
htop

# Open file descriptors
lsof -p <pid>
lsof -i :3000  # Who is listening on port 3000?

# System calls (strace)
strace -p <pid> -e trace=network,file

# Memory map
pmap -x <pid>

# Disk I/O
iotop -p <pid>

# Network connections
ss -tunap | grep <pid>
```

## Production Debug Safeguards

```typescript
// Feature-flagged debug endpoints
const debugEnabled = await featureFlags.isEnabled('debug-endpoints')

if (debugEnabled && req.user.isAdmin) {
  // Only enable during active incidents, with auth
  app.get('/debug/heap', adminMiddleware, async (req, res) => {
    const heap = process.memoryUsage()
    res.json(heap)
  })
}

// Circuit breaker for debug tools
const debugCalls = new Map<string, number>()
app.use('/debug/*', (req, res, next) => {
  const count = debugCalls.get(req.ip) || 0
  if (count > 10) {
    return res.status(429).json({ error: 'rate_limited' })
  }
  debugCalls.set(req.ip, count + 1)
  setTimeout(() => debugCalls.set(req.ip, count - 1), 60000)
  next()
})
```

## Production Debugging Runbook

### Initial Response (0-5 minutes)

1. **Acknowledge** the alert or report
2. **Assess severity** — is this P0/P1/P2?
3. **Contain** — rollback, feature flag off, traffic drain
4. **Collect** — logs, metrics, traces from the failure window

### Investigation (5-30 minutes)

1. Check dashboards for error rates, latency, saturation
2. Find correlation IDs for failing requests
3. Trace from first symptom backward
4. Check recent deployments, config changes, dependency updates
5. Compare metrics before and after the incident start time

### Resolution (30-120 minutes)

1. Formulate hypothesis based on evidence
2. Test in staging or with production shadow traffic
3. Apply fix with feature flag for quick rollback
4. Verify metrics returning to baseline
5. Document timeline, root cause, and next steps

### Post-Incident

1. Write incident report (5 whys)
2. Add monitoring alert for the detected condition
3. Add automated regression test
4. Improve deployment/observability as needed
