---
name: backend-background-jobs
description: >
  Use this skill when designing background job processing, task queues, or worker systems. This skill enforces: job idempotency, retry with exponential backoff, queue topology with dead letter, and worker concurrency controls. Applies to any backend stack with Redis/SQS/DB-backed queues. Do NOT use for: event streaming (Kafka), real-time pub/sub, or synchronous request processing.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, jobs, phase-6, universal]
---

# Backend Background Jobs

## Purpose
Design reliable background job processing with queue topology, retry, concurrency, and monitoring. Every job must be idempotent, retryable, observable, and gracefully handled on failure.

## Agent Protocol

### Trigger
Exact user phrases: "background job", "task queue", "worker", "job processing", "cron job", "scheduled task", "async task", "job retry", "queue worker", "Sidekiq", "Celery", "Bull", "delayed job", "job priority", "job scheduling".

### Input Context
- Job types (fire-and-forget, delayed, scheduled, chained).
- Queue backend (Redis, SQS, database table, RabbitMQ).
- Job duration (affects concurrency and timeout).
- Retry requirements (max retries, retry interval, irrecoverable failure definition).

### Output Artifact
Job and worker design as formatted text.

### Response Format
```typescript
// Job contract (interface/type)
// Worker implementation outline
```
```yaml
# Queue topology config
# Retry policy
# Concurrency rules
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output.

### Completion Criteria
- [ ] Job defined with idempotency key and full payload schema
- [ ] Retry strategy with exponential backoff and jitter configured
- [ ] Queue topology defined (default, priority, dead letter, scheduling queues)
- [ ] Worker concurrency and graceful shutdown configured
- [ ] Monitoring hooks for success/failure/metrics
- [ ] Scheduled/cron jobs defined with timezone and error notification

## Architecture Decision Trees

### Queue Backend Selection
```
What infrastructure do you already have?
├── Redis already in stack?
│   ├── Jobs < 100KB, sub-minute duration?
│   │   ├── Yes → Bull/BullMQ (built-in priority, delay, DLQ)
│   │   └── No → Consider RabbitMQ for complex routing
│   └── Need persistence and high throughput?
│       └── Bull with Redis Cluster or SQS
├── AWS-native?
│   ├── Jobs fit in 256KB? → SQS (fully managed, unlimited throughput)
│   ├── Need FIFO ordering? → SQS FIFO (exactly-once, 300 TPS)
│   └── Need long-running jobs? → SQS + Step Functions
├── Need transactional consistency with DB?
│   └── Database-backed queue (simplest setup, no infra)
└── Need complex routing (topic exchanges, headers)?
    └── RabbitMQ
```

### Job Type Decision Tree
```
Does the job need a response or callback?
├── Yes → Is it a multi-step workflow?
│   ├── Yes → Chained jobs with compensation/rollback
│   └── No → Fire-and-forget with monitoring
└── No → Should it run at a specific time?
    ├── Yes → Delayed job (scheduled execution)
    └── No → Should it run on a fixed schedule?
        ├── Yes → Scheduled (cron) job
        └── No → Fire-and-forget job
```

### Retry Strategy Decision Tree
```
What happens when the job fails?
├── Is the error transient (timeout, network, 503)?
│   ├── Yes → Retry with exponential backoff (5-10 attempts)
│   └── No → Is the error a dependent service failure?
│       ├── Yes → Retry with longer backoff (10-25 attempts)
│       └── No → Non-recoverable → DLQ immediately
├── Does the job have side effects?
│   ├── Yes → Ensure idempotency before retrying
│   └── No → Safe to retry as-is
└── Is the job part of a chain?
    └── Rollback/compensate on failure, retry individual steps
```

## Workflow

### Step 1: Job Classification

| Type | Delivery Guarantee | Max Delay | Persistence | Use Case |
|------|-------------------|-----------|-------------|----------|
| Fire-and-forget | At-most-once | None | Optional | Email notification, audit log |
| Delayed | At-least-once | Arbitrary | Required | Payment reminder in 24h |
| Scheduled (cron) | At-least-once | N/A | Required | Daily report generation |
| Recurring (interval) | At-least-once | N/A | Required | Health check every 5 min |
| Chained workflow | Exactly-once | Varies | Required | Order → payment → shipping |

Fire-and-forget: no callback, best-effort delivery, highest throughput. Delayed: execute after N seconds/minutes using Redis sorted sets or SQS delay queues. Scheduled: cron expression, timezone-aware, prevents overlapping execution. Recurring: fixed interval, always runs regardless of previous success/failure. Chained: next job enqueued after previous completes, with compensation/rollback on failure.

### Step 2: Queue Backend Selection

| Feature | Redis (Bull/BullMQ) | SQS | RabbitMQ | Database (PG) | Hangfire (.NET) |
|---------|-------------------|-----|----------|---------------|-----------------|
| Throughput | 10,000+/s | Unlimited | 10,000+/s | Limited by DB | 1,000+/s |
| Persistence | Configurable | Durable (multi-AZ) | Durable | Durable (ACID) | Durable (ACID) |
| Delay support | Built-in | Via visibility timeout | Via TTL+DLX | Via scheduled_at col | Built-in |
| Priority | Built-in | Via separate queues | Per-queue | Via ORDER BY | Via queues |
| DLQ | Built-in | Built-in | Via DLX | status='failed' | Built-in |
| Job dashboard | Bull Board | AWS Console | Management UI | Custom admin | Hangfire Dashboard |
| Max message size | 512MB | 256KB | 2GB | Unbounded | Unbounded |
| Message retention | Configurable | 14 days max | Per-queue | Indefinite | Indefinite |
| Operational overhead | Redis cluster | Fully managed | Cluster management | Existing DB | Existing DB + SQL |

### Step 3: Queue Topology

```
                            ┌─────────────┐
                            │   Enqueue   │
                            │   Service   │
                            └──────┬──────┘
                                   │
                     ┌─────────────┼─────────────┐
                     ▼             ▼             ▼
               ┌──────────┐ ┌──────────┐ ┌──────────┐
               │  high    │ │ default  │ │   low    │
               │ priority │ │          │ │ priority │
               └─────┬────┘ └─────┬────┘ └─────┬────┘
                     │            │            │
                     ▼            ▼            ▼
               ┌──────────┐ ┌──────────┐ ┌──────────┐
               │ DLQ-high │ │DLQ-default│ │ DLQ-low │
               └──────────┘ └──────────┘ └──────────┘
                     │            │            │
                     └────────────┼────────────┘
                                  ▼
                           ┌──────────────┐
                           │   Alert on   │
                           │  any DLQ msg │
                           └──────────────┘
```

| Queue | Purpose | TTL | Retries | Prefetch | Consumer Concurrency |
|-------|---------|-----|---------|----------|---------------------|
| `default` | Standard jobs | 24h | 5 | 5 | CPU * 2 |
| `priority-high` | Time-sensitive | 1h | 10 | 10 | CPU * 4 |
| `priority-low` | Batch processing | 48h | 3 | 1 | CPU * 1 |
| `scheduling` | Cron/delayed | Depends on job | 3 | 1 | CPU * 2 |
| `dead-letter` | Failed after max retries | 7d | 0 (manual replay) | 1 | 1 |

### Step 4: Job Contract Definition

```typescript
interface Job<T = unknown> {
  id: string;                         // UUIDv7, sortable by time
  type: string;                       // Discriminator: "send-email" | "generate-report"
  payload: T;                         // Type-safe, JSON-serializable payload
  retryCount: number;                 // Current attempt (0-based)
  maxRetries: number;                 // Max attempts before DLQ
  priority: 'high' | 'medium' | 'low';
  scheduledAt?: string;               // ISO 8601 for delayed execution
  idempotencyKey: string;             // Deduplication: "{job-type}:{entity-id}:{action}"
  tags: string[];                     // Filtering and monitoring
  timeout: number;                    // Per-job timeout in ms
  createdAt: string;                  // ISO 8601
}

// Example: Email sending job
interface SendEmailPayload {
  to: string;
  subject: string;
  templateId: string;
  variables: Record<string, string>;
  tenantId: string;
}
```

**BullMQ job definition:**
```typescript
import { Queue, Worker, Job } from 'bullmq';

const emailQueue = new Queue<SendEmailPayload>('email', {
  connection: { host: 'redis', port: 6379 },
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: { age: 3600 * 24 },
    removeOnFail: { age: 3600 * 24 * 7 },
  },
});

// Enqueue
await emailQueue.add('send-email', payload, {
  priority: 1,
  delay: 0,
  jobId: `send-email:user_123:welcome`, // idempotency key
});
```

**Python Celery:**
```python
from celery import Celery

app = Celery('tasks', broker='redis://localhost:6379')

@app.task(
    bind=True,
    max_retries=5,
    default_retry_delay=60,
    acks_late=True,
    reject_on_worker_lost=True,
    queue='default'
)
def send_email(self, to: str, subject: str, template_id: str, variables: dict):
    try:
        email_service.send(to, subject, template_id, variables)
    except RateLimitError as exc:
        raise self.retry(exc=exc, countdown=300)
    except NetworkError as exc:
        raise self.retry(exc=exc, countdown=60)
```

**Go with asynq:**
```go
import "github.com/hibiken/asynq"

type EmailPayload struct {
  To      string            `json:"to"`
  Subject string            `json:"subject"`
  TemplateID string         `json:"template_id"`
  Vars    map[string]string `json:"vars"`
}

client := asynq.NewClient(asynq.RedisClientOpt{Addr: "redis:6379"})
payload, _ := json.Marshal(EmailPayload{To: "user@co", Subject: "Welcome"})
task := asynq.NewTask("send:email", payload, asynq.MaxRetry(5), asynq.Queue("email"))
_, err := client.Enqueue(task)
```

**C# Hangfire:**
```csharp
public class SendEmailJob
{
    private readonly IEmailService _emailService;
    public SendEmailJob(IEmailService emailService) => _emailService = emailService;

    [JobDisplayName("Send email to {0}")]
    [AutomaticRetry(Attempts = 5, OnAttemptsExceeded = AttemptsExceededAction.Fail)]
    [Queue("default")]
    public async Task ExecuteAsync(string to, string subject, string templateId, Dictionary<string, string> variables)
    {
        await _emailService.SendAsync(to, subject, templateId, variables);
    }
}

BackgroundJob.Enqueue<SendEmailJob>(j => j.ExecuteAsync("user@co", "Welcome", "welcome-template", vars));
BackgroundJob.Schedule<SendEmailJob>(j => j.ExecuteAsync(...), TimeSpan.FromHours(24));
```

### Step 5: Retry Strategy

Exponential backoff with jitter: `delay = min(baseDelay * 2^retryCount + jitter, maxDelay)`.

```typescript
function calculateDelay(retryCount: number, baseDelay = 1000, maxDelay = 21_600_000): number {
  const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
  const jitter = delay * 0.25 * (Math.random() * 2 - 1);
  return Math.round(Math.max(100, delay + jitter));
}
```

| Error Category | Max Retries | Backoff | Example |
|---------------|-------------|---------|---------|
| Transient | 5 | Exponential 1s→32s | Network timeout, connection pool full |
| Dependent service | 10 | Exponential 5s→2560s | API 503, rate limit 429 |
| Data reconciliation | 25 | Linear 60s | Eventual consistency retry |
| Non-recoverable | 0 (immediate DLQ) | None | ValidationError, AuthenticationError |

DLQ schema:
```typescript
interface DeadLetterMessage {
  originalJob: Job;
  errorHistory: Array<{
    attempt: number;
    timestamp: string;
    error: { type: string; message: string; stack?: string };
  }>;
  movedToDLQAt: string;
  dlqReason: string;
}
```

### Step 6: Worker Concurrency

| Job Duration | Prefetch | Workers per Queue | Max Concurrent |
|-------------|----------|-------------------|---------------|
| <1s (email, notification) | 10 | CPU * 4 | 200 |
| 1-10s (API calls, file processing) | 5 | CPU * 2 | 50 |
| 10-30s (report generation) | 2 | CPU * 1 | 20 |
| >30s (video transcoding, data sync) | 1 | CPU * 0.5 | 10 |

Graceful shutdown:
```typescript
async function gracefulShutdown(worker: Worker): Promise<void> {
  console.log('Shutting down worker...');
  await worker.close(); // Stop accepting new jobs
  const timeout = setTimeout(() => {
    console.error('Force killing running jobs');
    process.exit(1);
  }, 30000); // 30s timeout

  // Wait for running jobs to complete
  await worker.waitUntilReady();
  clearTimeout(timeout);
  console.log('Worker shutdown complete');
}

process.on('SIGTERM', () => gracefulShutdown(worker));
process.on('SIGINT', () => gracefulShutdown(worker));
```

### Step 7: Idempotency

Same job payload processed twice must produce same result.

```typescript
async function processJob(job: Job<SendEmailPayload>): Promise<void> {
  const alreadyProcessed = await checkIdempotency(job.idempotencyKey);
  if (alreadyProcessed) { return; }
  await sendEmail(job.payload);
  await markIdempotency(job.idempotencyKey, job.id, 86400); // 24h TTL
}

async function checkIdempotency(key: string): Promise<boolean> {
  return redis.exists(`idempotency:${key}`);
}

async function markIdempotency(key: string, jobId: string, ttl: number): Promise<void> {
  await redis.set(`idempotency:${key}`, jobId, 'EX', ttl);
}
```

Idempotency key format: `{job-type}:{entity-id}:{action}` (e.g., `send-email:order_123:welcome`).

### Step 8: Job Scheduling (Cron)

```typescript
// BullMQ scheduler
import { QueueScheduler } from 'bullmq';

const scheduler = new QueueScheduler('report-generation', {
  connection: { host: 'redis', port: 6379 },
});

// Recurring job every day at 2 AM UTC
await reportQueue.add('daily-report', { type: 'sales' }, {
  repeat: { pattern: '0 2 * * *', tz: 'UTC' },
  jobId: 'daily-sales-report', // Unique ID prevents duplicates
});
```

Cron best practices:
- Always specify timezone (prefer UTC)
- Prevent overlapping execution (lock or skip if previous still running)
| Expression | Meaning |
|---|---|
| `0 2 * * *` | Daily at 2 AM |
| `*/15 * * * *` | Every 15 minutes |
| `0 0 * * 0` | Weekly on Sunday midnight |
| `0 0 1 * *` | Monthly on 1st |
| `0 9-18 * * 1-5` | Every hour 9-6 weekdays |

### Step 9: Chained Workflows

```typescript
// BullMQ flow producer
const flow = new FlowProducer({ connection: { host: 'redis', port: 6379 } });

await flow.add({
  name: 'process-order',
  queueName: 'orders',
  data: { orderId: '123' },
  children: [
    {
      name: 'charge-payment',
      queueName: 'payments',
      data: { orderId: '123', amount: 49.99 },
      children: [
        {
          name: 'send-receipt',
          queueName: 'notifications',
          data: { orderId: '123', email: 'user@co' },
        },
        {
          name: 'update-inventory',
          queueName: 'inventory',
          data: { orderId: '123', items: [...] },
        },
      ],
    },
  ],
});
```

For compensation on failure:
```typescript
async function processOrder(job: Job): Promise<void> {
  try {
    await chargePayment(job.data.orderId);
    await updateInventory(job.data.orderId);
    await sendReceipt(job.data.orderId);
  } catch (error) {
    // Compensating actions
    await refundPayment(job.data.orderId);
    await restoreInventory(job.data.orderId);
    throw error; // Still move to DLQ for investigation
  }
}
```

## Production Considerations

### Job Monitoring Configuration
```yaml
monitoring:
  metrics:
    - job_success_rate: "p99 > 99%"
    - queue_depth: "alert if > 10000"
    - dlq_count: "alert if > 0"
    - avg_job_duration: "track per job type"
    - worker_pool_saturation: "alert if > 90%"
    - stuck_jobs: "running > 5x expected duration"
  alerts:
    dlq_receives_message: "PagerDuty notification"
    queue_depth_threshold: "Slack notification"
    job_success_rate_below_99: "PagerDuty notification"
```

### Prometheus Metrics
```typescript
import { Counter, Histogram, Gauge } from 'prom-client';

const jobsProcessed = new Counter({
  name: 'jobs_processed_total',
  help: 'Total jobs processed',
  labelNames: ['queue', 'job_type', 'status'],
});

const jobDuration = new Histogram({
  name: 'job_duration_seconds',
  help: 'Job processing duration',
  labelNames: ['queue', 'job_type'],
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 300],
});

const queueDepth = new Gauge({
  name: 'queue_depth',
  help: 'Current queue depth',
  labelNames: ['queue'],
});

const workerUtilization = new Gauge({
  name: 'worker_utilization',
  help: 'Worker pool utilization (0-1)',
  labelNames: ['queue'],
});
```

### Job Dashboard
```typescript
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

const serverAdapter = new ExpressAdapter();
createBullBoard({
  queues: [
    new BullMQAdapter(emailQueue),
    new BullMQAdapter(reportQueue),
    new BullMQAdapter(notificationQueue),
  ],
  serverAdapter,
});
app.use('/admin/queues', serverAdapter.getRouter());
```

### Database-Backed Queue (Simple Setup)
```sql
CREATE TABLE job_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  priority INT DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 5,
  last_error TEXT,
  locked_at TIMESTAMPTZ,
  locked_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_job_queue_status ON job_queue(status, scheduled_at, priority);
```

## Anti-Patterns

### Anti-Pattern 1: Non-Idempotent Jobs
Problem: Retry causes duplicate charges, emails, or records.
Fix: Always check idempotency key before processing. Use deduplication at queue level.

### Anti-Pattern 2: Infinite Retries Without Backoff
Problem: Retrying immediately infinitely causes thundering herd on downstream service.
Fix: Exponential backoff with jitter. Max retries limit.

### Anti-Pattern 3: No Dead Letter Queue
Problem: Failed jobs stay in main queue, block new jobs, cause confusion.
Fix: After max retries, move to DLQ. Alert on DLQ message received.

### Anti-Pattern 4: Worker Starvation
Problem: One queue with mixed job durations causes short jobs to wait behind long jobs.
Fix: Separate queues by duration or use priority tiers.

### Anti-Pattern 5: Ignoring Graceful Shutdown
Problem: Abruptly killing workers loses in-flight jobs.
Fix: SIGTERM handling with drain and 30s timeout.

### Anti-Pattern 6: Blocking the Event Loop
Problem: CPU-intensive job blocks the event loop, starving other jobs in Node.js.
Fix: Use worker_threads or separate worker process for CPU-heavy work.

### Anti-Pattern 7: Jobs Without Timeouts
Problem: Stuck job holds a worker indefinitely.
Fix: Set per-job timeout. Kill and retry after timeout.

### Anti-Pattern 8: Synchronous Fallback in Critical Path
Problem: Blocking on a background job from the request handler.
Fix: Return 202 Accepted immediately. Use webhook or polling for result.

## Security Considerations

### Job Payload Security
- Never include secrets, tokens, or PII in job payloads — store references (IDs)
- Encrypt sensitive payload fields with application-level encryption
- Validate payload schema before processing
- Sign job payloads for integrity verification

### Access Control
- Queue admin UI requires authentication
- Separate queue management permissions from job processing
- Audit log all enqueue/dequeue/replay operations
- Rate limit enqueue operations per source

### Network Security
- Redis/RabbitMQ listeners on internal network only
- TLS connections between workers and queue broker
- mTLS for cross-service job submissions

## Comparative Analysis

### Queue Backend Comparison
| Aspect | Redis | SQS | RabbitMQ | Database |
|--------|-------|-----|----------|----------|
| Setup complexity | Moderate | Low | High | Lowest |
| Operational cost | Memory cost | Per-request | Server cost | Existing DB |
| Throughput | 10K+/s | Unlimited | 10K+/s | DB-bound |
| Max message size | 512MB | 256KB | 2GB | Unbounded |
| Message retention | Configurable | 14 days max | Configurable | Indefinite |
| FIFO support | Single-threaded | FIFO queue | Single consumer | ORDER BY |
| Delayed delivery | Built-in | Visibility timeout | TTL+DLX | scheduled_at |
| Job dashboard | Bull Board | AWS Console | Management UI | Custom admin |

### At-Least-Once vs At-Most-Once vs Exactly-Once
| Delivery | Guarantee | Complexity | Use Case |
|----------|-----------|------------|----------|
| At-most-once | Message never delivered twice | Low | Non-critical stats, analytics |
| At-least-once | Message always delivered, possibly duplicated | Medium | Most business operations (with idempotency) |
| Exactly-once | Single delivery guaranteed | High | Financial transactions, inventory |

## Performance Considerations

### Job Size Optimization
- Keep payloads <100KB for best performance
- Store large payloads as references (S3 key, DB row ID)
- Use binary serialization for large numeric datasets
- Compress large payloads before enqueuing

### Throughput Optimization
- Increase prefetch for short-running jobs
- Separate queues by job duration to prevent head-of-line blocking
- Use batch enqueue for high-volume jobs
- Scale workers horizontally (queue is the bottleneck, not workers)

### Redis-Specific Tuning
- Use Redis Cluster for high-throughput scenarios
- Enable lazy Redis connection in worker processes
- Monitor Redis memory and eviction rates
- Pipeline enqueue operations for batch jobs

## Rules
- Every job is idempotent — same payload processed twice produces same result
- Job TTL set to prevent stale data processing (24h default, 7d DLQ)
- Workers gracefully drain on shutdown with 30s timeout
- Job payload is JSON-serializable, no circular refs
- Queue depth monitored and alerted at threshold
- Scheduled jobs are cron-expressed in UTC with documented timezone
- Non-recoverable errors go directly to DLQ, no retry
- Job dashboard accessible to on-call engineers
- Set per-job timeout to prevent stuck workers
- Separate queues by job duration to prevent starvation
- Never include secrets in job payloads
- Always alert when DLQ receives a message

## References
  - references/job-monitoring.md — Background Job Monitoring
  - references/job-patterns.md — Background Job Patterns
  - references/job-scheduling.md — Background Job Scheduling
  - references/job-testing.md — Background Job Testing
  - references/job-types.md — Job Types and Queue Patterns
  - references/queue-setup.md — Queue Setup and Scheduled Tasks
  - references/background-jobs-fundamentals.md — Background Jobs Fundamentals
  - references/background-jobs-advanced.md — Background Jobs Advanced Patterns
  - references/background-jobs-chaining.md — Job Chaining and Workflow Patterns

## Handoff
`backend-event-driven` for job completion events and chained workflows
