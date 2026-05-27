# Microservices Observability

## Overview
Implement observability in microservices: distributed tracing, structured logging, metrics aggregation, health checks, and centralized dashboards.

## Distributed Tracing

```typescript
import { trace, Span, SpanStatusCode, context } from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';

class TracingMiddleware {
  private readonly propagator = new W3CTraceContextPropagator();

  // Incoming request — extract parent context
  async handleIncomingRequest(req: Request, next: () => Promise<Response>): Promise<Response> {
    const extractedContext = this.propagator.extract(
      OpenTelemetry.context.active(),
      req.headers,
      (carrier, key) => carrier[key] ? [carrier[key] as string] : []
    );

    return context.with(extractedContext, async () => {
      const tracer = trace.getTracer('microservice');
      const span = tracer.startSpan(`${req.method} ${req.path}`, {
        attributes: {
          'http.method': req.method,
          'http.url': req.url,
          'service.name': process.env.SERVICE_NAME,
        },
      });

      try {
        const response = await next();
        span.setStatus({ code: SpanStatusCode.OK });
        span.setAttribute('http.status_code', response.status);
        return response;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: (error as Error).message,
        });
        span.recordException(error as Error);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  // Outgoing call — inject context into downstream request
  async callDownstreamService(url: string, body: unknown): Promise<Response> {
    const tracer = trace.getTracer('microservice');
    const span = tracer.startSpan(`HTTP ${url}`, {
      attributes: {
        'http.method': 'POST',
        'http.url': url,
      },
    });

    const headers: Record<string, string> = {};
    this.propagator.inject(
      trace.setSpan(context.active(), span),
      headers,
      (carrier, key, value) => { carrier[key] = value; }
    );

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(body),
      });
      span.setAttribute('http.status_code', response.status);
      return response;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  }
}
```

## Structured Logging

```typescript
interface StructuredLogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  service: string;
  traceId?: string;
  spanId?: string;
  message: string;
  error?: {
    type: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, unknown>;
}

class StructuredLogger {
  constructor(private readonly serviceName: string) {}

  info(message: string, metadata?: Record<string, unknown>): void {
    this.log('info', message, metadata);
  }

  error(message: string, error?: Error, metadata?: Record<string, unknown>): void {
    this.log('error', message, {
      ...metadata,
      error: error ? {
        type: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      } : undefined,
    });
  }

  private log(level: string, message: string, metadata?: Record<string, unknown>): void {
    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level: level as any,
      service: this.serviceName,
      traceId: trace.getSpan(context.active())?.spanContext().traceId,
      spanId: trace.getSpan(context.active())?.spanContext().spanId,
      message,
      ...metadata,
    };

    console.log(JSON.stringify(entry));

    // Forward to centralized logging
    this.forwardToCentralized(entry);
  }

  private async forwardToCentralized(entry: StructuredLogEntry): Promise<void> {
    // Send to OpenSearch, CloudWatch, or Loki
    if (process.env.LOG_ENDPOINT) {
      await fetch(process.env.LOG_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify(entry),
        headers: { 'Content-Type': 'application/json' },
      }).catch(() => {}); // Fire and forget
    }
  }
}
```

## Metrics Aggregation

```typescript
import { Counter, Histogram, Gauge } from 'prom-client';

class MetricsRegistry {
  // RE(D) metrics: Rate, Errors, Duration
  private readonly requestCount = new Counter({
    name: 'service_requests_total',
    help: 'Total service requests',
    labelNames: ['service', 'method', 'path', 'status'],
  });

  private readonly requestDuration = new Histogram({
    name: 'service_request_duration_ms',
    help: 'Request duration in milliseconds',
    labelNames: ['service', 'method', 'path'],
    buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
  });

  private readonly errorCount = new Counter({
    name: 'service_errors_total',
    help: 'Total service errors',
    labelNames: ['service', 'error_type'],
  });

  private readonly activeConnections = new Gauge({
    name: 'service_active_connections',
    help: 'Current active connections',
    labelNames: ['service'],
  });

  // External service call metrics
  private readonly externalCallDuration = new Histogram({
    name: 'service_external_call_duration_ms',
    help: 'External service call duration',
    labelNames: ['target_service', 'method'],
    buckets: [10, 25, 50, 100, 250, 500, 1000, 2500],
  });

  recordRequest(method: string, path: string, status: number, durationMs: number): void {
    const labels = { service: process.env.SERVICE_NAME!, method, path, status: String(status) };
    this.requestCount.inc(labels);
    this.requestDuration.observe(labels, durationMs);
  }

  recordError(errorType: string): void {
    this.errorCount.inc({ service: process.env.SERVICE_NAME!, errorType });
  }
}
```

## Health Checks

```typescript
class HealthCheckRegistry {
  private checks: Map<string, () => Promise<HealthCheckResult>> = new Map();

  register(name: string, check: () => Promise<HealthCheckResult>): void {
    this.checks.set(name, check);
  }

  async checkLiveness(): Promise<HealthStatus> {
    // Liveness: is the process alive?
    return { status: 'ok', timestamp: new Date() };
  }

  async checkReadiness(): Promise<HealthStatus> {
    // Readiness: can the process serve traffic?
    const results: HealthCheckResult[] = [];

    for (const [name, check] of this.checks) {
      try {
        const result = await check();
        results.push({ name, ...result });
      } catch (error) {
        results.push({ name, status: 'error', error: (error as Error).message });
      }
    }

    const allHealthy = results.every(r => r.status === 'ok');
    return {
      status: allHealthy ? 'ok' : 'degraded',
      checks: results,
      timestamp: new Date(),
    };
  }

  registerDefaultChecks(): void {
    this.register('database', async () => {
      await db.query('SELECT 1');
      return { status: 'ok' };
    });

    this.register('message-bus', async () => {
      const producer = kafka.producer();
      await producer.connect();
      await producer.disconnect();
      return { status: 'ok' };
    });

    this.register('cache', async () => {
      await redis.ping();
      return { status: 'ok' };
    });
  }
}
```

## Service Mesh Integration

```typescript
// Istio telemetry configuration
const TELEMETRY_CONFIG = {
  // Istio automatically captures:
  // - HTTP metrics: request count, duration, size
  // - TCP metrics: connection count, bytes sent/received
  // - gRPC metrics: request count, duration
  // Distributed tracing with Zipkin/Jaeger via Envoy

  samplingRate: 0.1,  // 10% sampling for performance
};

// Envoy access logs
const ENVOY_LOG_FORMAT = {
  format: JSON.stringify({
    start_time: '%START_TIME%',
    method: '%REQ(:METHOD)%',
    path: '%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%',
    protocol: '%PROTOCOL%',
    response_code: '%RESPONSE_CODE%',
    duration: '%DURATION%',
    upstream_service: '%UPSTREAM_CLUSTER%',
    trace_id: '%REQ(X-REQUEST-ID)%',
    bytes_sent: '%RESPONSE_FLAGS%',
  }),
};
```

## Key Points
- Propagate trace context (W3C TraceContext) across all service boundaries
- Use structured JSON logging with traceId, spanId, service name
- Track RE(D) metrics: request rate, error rate, request duration
- Implement liveness (process alive) and readiness (can serve traffic) probes
- Register health checks for database, message bus, cache dependencies
- Use service mesh (Istio/Linkerd) for transparent telemetry
- Sample distributed traces at 10% for performance
- Aggregate metrics with Prometheus, visualize with Grafana
- Forward structured logs to centralized storage (OpenSearch, Loki, CloudWatch)
