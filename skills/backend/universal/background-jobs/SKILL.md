---
name: backend-background-jobs
description: >
  Use this skill when designing background job processing, task queues, or worker systems. This skill enforces: job idempotency, retry with exponential backoff, queue topology with dead letter, and worker concurrency controls. Applies to any backend stack with Redis/SQS/DB-backed queues. Do NOT use for: event streaming (Kafka), real-time pub/sub, or synchronous request processing.
version: "1.0.0"
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
Design reliable background job processing with queue topology, retry, and monitoring.

## Agent Protocol

### Trigger
Exact user phrases: "background job", "task queue", "worker", "job processing", "cron job", "scheduled task", "async task", "job retry", "queue worker", "Sidekiq", "Celery", "Bull", "delayed job", "job priority", "job scheduling".

### Input Context
Before activating, verify:
- Job types (fire-and-forget, delayed execution, scheduled recurring, synchronous fallback)
- Queue backend (Redis, SQS, database table, RabbitMQ)
- Job duration (seconds, minutes, hours — affects concurrency and timeout)
- Retry requirements (max retries, retry interval, irrecoverable failure definition)

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

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Job defined with idempotency key and full payload schema
- [ ] Retry strategy with exponential backoff and jitter configured
- [ ] Queue topology defined (default, priority, dead letter, scheduling queues)
- [ ] Worker concurrency and graceful shutdown configured
- [ ] Monitoring hooks for success/failure/metrics
- [ ] Scheduled/cron jobs defined with timezone and error notification

### Max Response Length
250 lines of code and configuration.

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

Choose Redis for high-throughput sub-minute jobs with priority. Choose SQS for AWS-native durability without infrastructure management, 256KB message limit. Choose database table for transactional consistency with OLTP store (simplest setup). Choose RabbitMQ for complex routing (topic exchanges, headers). Choose Hangfire for .NET ecosystem with built-in dashboard, SQL-backed persistence.

### Step 3: Queue Topology
| Queue | Purpose | TTL | Retries | Prefetch | Consumer Concurrency |
|-------|---------|-----|---------|----------|---------------------|
| `default` | Standard jobs | 24h | 5 | 5 | CPU * 2 |
| `priority-high` | Time-sensitive | 1h | 10 | 10 | CPU * 4 |
| `priority-low` | Batch processing | 48h | 3 | 1 | CPU * 1 |
| `scheduling` | Cron/delayed | Depends on job | 3 | 1 | CPU * 2 |
| `dead-letter` | Failed after max retries | 7d | 0 (manual replay) | 1 | 1 |

Configure one default queue per service, one DLQ per priority queue. Message size: keep payloads <100KB for performance (smaller is faster). Large payloads should store reference (S3 key, DB row ID) instead of the full data.

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

```csharp
// C# Hangfire job interface
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

// Enqueue
BackgroundJob.Enqueue<SendEmailJob>(j => j.ExecuteAsync("user@co", "Welcome", "welcome-template", vars));

// Schedule
BackgroundJob.Schedule<SendEmailJob>(j => j.ExecuteAsync("user@co", "Reminder", "reminder-template", vars), TimeSpan.FromHours(24));
```

### Step 5: Retry Strategy
Exponential backoff with jitter: `delay = min(baseDelay * 2^retryCount + jitter, maxDelay)`. Base delay: 1 second. Max delay: 6 hours. Jitter: random ±25% of calculated delay. After exhaustion: move to DLQ with original payload, full error history, and stack trace. DLQ triggers PagerDuty/alert notification.

| Error Category | Max Retries | Backoff | Example |
|---------------|-------------|---------|---------|
| Transient | 5 | Exponential 1s→32s | Network timeout, connection pool full |
| Dependent service | 10 | Exponential 5s→2560s | API 503, rate limit 429 |
| Data reconciliation | 25 | Linear 60s | Eventual consistency retry |
| Non-recoverable | 0 (immediate DLQ) | None | ValidationError, AuthenticationError |

```typescript
function calculateDelay(retryCount: number): number {
  const baseDelay = 1000;
  const maxDelay = 21_600_000; // 6 hours
  const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
  const jitter = delay * 0.25 * (Math.random() * 2 - 1);
  return Math.round(Math.max(100, delay + jitter));
}
```

### Step 6: Worker Concurrency
| Job Duration | Prefetch | Workers per Queue | Max Concurrent |
|-------------|----------|-------------------|---------------|
| <1s (email, notification) | 10 | CPU * 4 | 200 |
| 1-10s (API calls, file processing) | 5 | CPU * 2 | 50 |
| 10-30s (report generation) | 2 | CPU * 1 | 20 |
| >30s (video transcoding, data sync) | 1 | CPU * 0.5 | 10 |

Graceful shutdown: intercept SIGTERM → stop accepting new jobs → wait for running jobs with 30s timeout → force kill stale workers. Worker pool saturation alert at >90%.

### Step 7: Idempotency
Same job payload processed twice must produce same result. Store processed idempotency keys in Redis/DynamoDB with TTL matching job visibility timeout (usually 24h). Idempotency key format: `{job-type}:{entity-id}:{action}` (e.g., `send-email:order_123:welcome`). Check before processing; if already processed, return success.

```typescript
async function processJob(job: Job<SendEmailPayload>): Promise<void> {
  const alreadyProcessed = await checkIdempotency(job.idempotencyKey);
  if (alreadyProcessed) { return; }
  await sendEmail(job.payload);
  await markIdempotency(job.idempotencyKey, job.id);
}
```

## Monitoring Configuration

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

## Rules
- Every job is idempotent — same payload processed twice produces same result
- Job TTL set to prevent stale data processing (24h default, 7d DLQ)
- Workers gracefully drain on shutdown with 30s timeout
- Job payload is JSON-serializable, no circular refs
- Queue depth monitored and alerted at threshold
- Scheduled jobs are cron-expressed in UTC with documented timezone
- Non-recoverable errors go directly to DLQ, no retry
- Job dashboard accessible to on-call engineers

## References
- `references/job-types.md` — Job classification, retry strategies, DLQ, concurrency patterns
- `references/queue-setup.md` — Queue infrastructure, cron expressions, worker configuration
- `references/job-monitoring.md` — Dashboard metrics, Prometheus alerts, DLQ management, debugging stuck jobs
- `references/job-patterns.md` — Chained workflows, saga pattern with compensations, batch processing, rate-limited jobs, exactly-once

## Handoff
`backend-event-driven` for job completion events and chained workflows
