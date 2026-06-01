# Background Jobs Fundamentals

## Core Concepts

### Job vs Task vs Event
| Term | Meaning | Example |
|------|---------|---------|
| Job | Unit of work processed asynchronously | Send welcome email |
| Task | Step within a job (can be part of workflow) | Generate PDF → Upload to S3 → Notify user |
| Event | Notification that something happened | `order.created` (may trigger jobs) |

### Job Queue

```
Producer ──enqueue──> Queue ──dequeue──> Worker ──> Handler
                          │
                          └── DLQ (failed after retries)
```

## Queue Properties

| Property | Meaning | Options |
|----------|---------|---------|
| Delivery | How jobs reach workers | At-least-once, at-most-once, exactly-once |
| Ordering | Job execution order | FIFO, priority, best-effort |
| Persistence | Jobs survive restarts | In-memory, database, disk |
| Delayed | Schedule job for later | Seconds to days |
| Dead letter | Failed jobs destination | Separate queue or storage |

## Queue Backend Comparison

| Feature | Bull (Redis) | RabbitMQ | SQS | Sidekiq (Redis) | Celery (Redis/Rabbit) |
|---------|-------------|----------|-----|-----------------|----------------------|
| Persistence | Redis RDB/AOF | Disk | AWS managed | Redis | Redis/DB |
| Delayed jobs | Built-in | TTL + DLX | Delay queue | Built-in | ETA |
| Priority | Via separate queues | Per-queue | No | Via separate queues | Per-queue |
| Rate limiting | Plugin | Per-consumer | No | Plugin | Worker prefetch |
| Dead letter | Built-in | DLX | DLQ | Built-in | Built-in |
| Job scheduling | Cron plugin | External | Scheduled messages | Sidekiq-Cron | Celery Beat |
| Monitoring | Arena UI | Management UI | CloudWatch | Sidekiq UI | Flower |

## Job Contract

```typescript
interface Job<T = any> {
  id: string;          // Unique job identifier
  type: string;        // Job type for routing
  data: T;             // Job payload
  attempts: number;    // Current retry attempt
  maxAttempts: number; // Maximum retries
  createdAt: Date;
  scheduledAt?: Date;  // Delayed execution
  timeout?: number;    // Job timeout in ms
}
```

## Retry Strategies

| Strategy | Behavior | Use Case |
|----------|----------|----------|
| Fixed | Retry every N seconds | Simple, predictable |
| Exponential | Double delay each attempt | Transient network errors |
| Exponential + Jitter | Exponential + random variation | Distributed systems (avoids thundering herd) |
| Linear with backoff | Increase delay linearly | API rate limits |

```typescript
function getDelay(attempt: number, baseMs: number = 1000): number {
  const exponential = Math.min(baseMs * Math.pow(2, attempt), 30_000);
  const jitter = Math.random() * 1000;
  return Math.floor(exponential + jitter);
}
// attempt 0: ~1000-2000ms
// attempt 1: ~2000-3000ms
// attempt 2: ~4000-5000ms
// attempt 3: ~8000-9000ms
// attempt 4: ~16000-17000ms
// attempt 5+: ~30000-31000ms (capped)
```

## Monitoring

### Essential Metrics
- Queue depth (current jobs waiting)
- Job processing rate (jobs/sec)
- P50/P99 job duration
- Error rate (% of failed jobs)
- Retry rate (% of jobs requiring retry)
- Stalled jobs (processing > 5 min without completion)
- DLQ size (irrecoverable failures)

### Alerts
- Queue depth > threshold → Consumers may be down
- Error rate > 5% → Job handler bug
- DLQ size > 0 → Investigate recurring failures
- Stalled jobs > 10 → Worker crash or deadlock
