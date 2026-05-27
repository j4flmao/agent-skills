# Rate Limiting Monitoring

Monitoring ensures rate limits are working correctly and provides visibility into traffic patterns.

## Metrics to Track

Every rate-limited endpoint should expose these metrics:

```
rate_limiter_requests_total{key, scope, decision}  — all requests evaluated
rate_limiter_remaining{key, scope}                  — current remaining quota
rate_limiter_denied_total{key, scope, reason}       — denied requests
rate_limiter_latency_seconds{key, scope}            — evaluation latency
rate_limiter_bucket_usage_ratio{key, scope}         — how full the bucket is (0-1)
```

## Prometheus Integration

```typescript
import { Counter, Gauge, Histogram } from 'prom-client';

const rateLimitDecisions = new Counter({
  name: 'rate_limiter_denied_total',
  help: 'Rate limited requests',
  labelNames: ['key', 'scope', 'reason'] as const,
});

const bucketUsage = new Gauge({
  name: 'rate_limiter_bucket_usage_ratio',
  help: 'Current token bucket fill ratio',
  labelNames: ['key', 'scope'] as const,
});

const evalLatency = new Histogram({
  name: 'rate_limiter_eval_seconds',
  help: 'Rate limit evaluation latency',
  buckets: [0.0001, 0.0005, 0.001, 0.005, 0.01],
});
```

## Dashboards

### Rate Limit Overview Dashboard

```
Panel: Requests per second by scope
  - Line chart of rate_limiter_requests_total per scope
  - Split by decision (allowed vs denied)

Panel: Top denied consumers
  - Table of rate_limiter_denied_total by key
  - Show last hour, sorted by count descending

Panel: Bucket fill ratio
  - Heatmap of rate_limiter_bucket_usage_ratio by key
  - Alert when any key stays above 0.9 for >5 minutes

Panel: Evaluation latency p99
  - Line chart of rate_limiter_eval_seconds p99
  - Alert when >10ms
```

## Alerting Rules

```yaml
groups:
  - name: rate_limiting
    rules:
      - alert: HighRateLimitDenial
        expr: rate(rate_limiter_denied_total[5m]) > 100
        for: 2m
        annotations:
          summary: "High rate limit denial rate"

      - alert: SustainedBucketPressure
        expr: rate_limiter_bucket_usage_ratio > 0.9
        for: 5m
        annotations:
          summary: "Sustained high bucket usage"

      - alert: SlowRateLimitEvaluation
        expr: rate_limiter_eval_seconds_p99 > 0.01
        for: 5m
        annotations:
          summary: "Rate limit evaluation is slow"
```

## Logging

Every rate limit decision should be logged:

```typescript
function evaluate(key: string, scope: string, decision: 'allow' | 'deny', remaining: number, latency: number): void {
  logger.info({
    event: 'rate_limit.evaluate',
    key,
    scope,
    decision,
    remaining,
    latencyMs: latency,
    timestamp: new Date().toISOString(),
  });
}
```

## Health Check

Expose rate limiter health:

```typescript
async function rateLimiterHealth(): Promise<HealthStatus> {
  const redisPing = await redis.ping();
  return {
    status: redisPing === 'PONG' ? 'healthy' : 'degraded',
    latencyBuckets: Math.round(rateLimiter.getAvgLatency()),
    activeKeys: rateLimiter.getKeyCount(),
  };
}
```

## Key Points
- Track allowed/denied counts, latency, and bucket usage
- Use Prometheus histograms for latency distributions
- Alert on sustained high bucket pressure (>0.9 for >5m)
- Alert on high denial rates or slow evaluations
- Log every rate limit decision for auditing
- Expose rate limiter health check endpoint
- Monitor Redis connection health for distributed rate limiting
