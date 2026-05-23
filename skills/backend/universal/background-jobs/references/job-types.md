# Job Types and Queue Patterns

## Job Type Comparison

| Type | Delivery Guarantee | Use Case | Example |
|------|-------------------|----------|---------|
| Fire-and-forget | At-most-once | Email notification | `send-order-confirmation` |
| Fire-and-forget | At-least-once | Audit log entry | `log-user-action` |
| Delayed | At-least-once | Scheduled reminder | `send-payment-reminder-24h` |
| Scheduled | At-least-once | Periodic maintenance | `generate-daily-report` |
| Recurring | At-least-once | Health monitoring | `check-external-api-health` |
| Chained | Exactly-once (with dedup) | Multi-step workflow | `process-order → charge-card → send-receipt` |

## Queue Backend Comparison

| Feature | Redis (Bull/BullMQ) | SQS | RabbitMQ | Database (PG/SQL Server) |
|---------|-------------------|-----|----------|--------------------------|
| Throughput | 10,000+/s | Unlimited | 10,000+/s | Limited by DB |
| Persistence | Configurable | Durable | Durable | Durable |
| Delay support | Built-in | Via visibility timeout | Via TTL+DLX | Via scheduled_at |
| Priority | Built-in | Via separate queues | Via per-queue priority | Via ORDER BY |
| DLQ | Built-in | Built-in | Via DLX | Via status column |
| Atomic operations | Lua scripts | Built-in | AMQP tx | Database ACID |
| Job dashboard | Arena (Bull) | SQS console | Management UI | Custom admin |
| Cost | Memory cost | Per-request | Server cost | Existing DB cost |
| Max message size | 512MB (Redis) | 256KB | 2GB (theoretical) | Depends on DB |
| Message retention | Configurable | Up to 14 days | Per-queue config | Indefinite |

## Queue Topology

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

## Job Serialization

```typescript
// BullMQ job definition
import { Queue, Worker, Job } from 'bullmq';

interface SendEmailPayload {
  to: string;
  subject: string;
  body: string;
  templateId: string;
  variables: Record<string, string>;
}

// Enqueue job
const emailQueue = new Queue<SendEmailPayload>('email', {
  connection: { host: 'redis', port: 6379 },
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: { age: 3600 * 24 },
    removeOnFail: { age: 3600 * 24 * 7 },
  },
});

await emailQueue.add('send-email', {
  to: 'user@example.com',
  subject: 'Welcome!',
  body: 'Thanks for joining...',
  templateId: 'welcome-email',
  variables: { name: 'Alice' },
}, {
  priority: 1,
  delay: 0,
  jobId: `send-email:user_123:welcome`, // idempotency key
});
```

```go
// Go with Redis (asynq)
import "github.com/hibiken/asynq"

type EmailPayload struct {
  To      string            `json:"to"`
  Subject string            `json:"subject"`
  Vars    map[string]string `json:"vars"`
}

client := asynq.NewClient(asynq.RedisClientOpt{Addr: "redis:6379"})
task, _ := asynq.NewTask("send:email", payload)
_, err := client.Enqueue(task, asynq.MaxRetry(5), asynq.Queue("email"))
```

## Retry Strategy Configuration

```yaml
retry:
  transient_errors:
    max_attempts: 5
    backoff:
      type: exponential
      base_delay: 1s
      max_delay: 3600s
      jitter: 0.25
    error_types:
      - TimeoutError
      - NetworkError
      - ConnectionError
  dependent_services:
    max_attempts: 10
    backoff:
      type: exponential
      base_delay: 5s
      max_delay: 300s
    error_types:
      - RateLimitError
      - ServiceUnavailableError
  non_recoverable:
    max_attempts: 1
    errors_immediately_to_dlq:
      - ValidationError
      - AuthenticationError
      - NotFoundError
```

## Dead Letter Queue (DLQ) Schema

```typescript
interface DeadLetterMessage {
  originalJob: Job;
  errorHistory: Array<{
    attempt: number;
    timestamp: string;
    error: {
      type: string;
      message: string;
      stack?: string;
    };
  }>;
  movedToDLQAt: string;
  dlqReason: string;
}
```

DLQ alerts must notify the owning team immediately. DLQ messages are manually reviewed: either re-queued (after bug fix) or discarded (if irrecoverable). DLQ should be reviewed at least once per business day.

## Concurrency Configuration

| Job Duration | Prefetch | Workers per Queue | Max Concurrency |
|-------------|----------|-------------------|-----------------|
| <1s | 10 | CPU * 4 | 200 |
| 1-10s | 5 | CPU * 2 | 50 |
| 10-30s | 2 | CPU * 1 | 20 |
| >30s | 1 | CPU * 0.5 | 10 |

## Job Dashboard (Bull Board)

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

## Common Pitfalls

- **Non-idempotent jobs**: If retry causes duplicate charges, duplicate emails, or duplicate records, the job is not idempotent. Always check idempotency key before processing.
- **Infinite retries without backoff**: Retrying immediately infinitely causes thundering herd on the downstream service. Always use exponential backoff with jitter.
- **No DLQ isolation**: Without a dead letter queue, failed jobs stay in the main queue and block new jobs or cause confusion. Always DLQ after max retries.
- **Worker starvation**: One queue with mixed job durations causes short jobs to wait behind long jobs. Separate queues or use priority tiers.
- **Ignoring graceful shutdown**: Abruptly killing workers loses in-flight jobs. Always implement SIGTERM handling with drain and timeout.
