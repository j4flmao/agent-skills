# Queue Setup and Scheduled Tasks

## Redis BullMQ Setup

```typescript
// Queue configuration (BullMQ)
import { Queue, Worker, QueueScheduler } from 'bullmq';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: 0,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

// Queue definitions
const queues = {
  default: new Queue('default', { connection, defaultJobOptions: {
    attempts: 5, backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: { age: 86400 }, removeOnFail: { age: 604800 },
  }}),
  high: new Queue('high', { connection, defaultJobOptions: {
    attempts: 10, backoff: { type: 'exponential', delay: 500 },
    removeOnComplete: { age: 3600 }, removeOnFail: { age: 86400 },
  }}),
  low: new Queue('low', { connection, defaultJobOptions: {
    attempts: 3, backoff: { type: 'fixed', delay: 30000 },
    removeOnComplete: { age: 172800 }, removeOnFail: { age: 604800 },
  }}),
};
```

## Amazon SQS Setup

```typescript
// SQS queue setup (AWS SDK v3)
import { SQSClient, CreateQueueCommand, GetQueueAttributesCommand } from '@aws-sdk/client-sqs';

const client = new SQSClient({ region: 'us-east-1' });

async function setupQueues() {
  const queues = ['default', 'priority-high', 'dead-letter'];
  for (const name of queues) {
    const params = {
      QueueName: `myapp-${name}`,
      Attributes: {
        MessageRetentionPeriod: name === 'dead-letter' ? '604800' : '86400',
        VisibilityTimeout: '300',
        ReceiveMessageWaitTimeSeconds: '20',
        RedrivePolicy: name !== 'dead-letter' ? JSON.stringify({
          deadLetterTargetArn: (await getQueueArn(`myapp-dead-letter`)).arn,
          maxReceiveCount: '5',
        }) : undefined,
      },
    };
    await client.send(new CreateQueueCommand(params));
  }
}
```

## Hangfire (C#/.NET) Setup

```csharp
// Hangfire SQL Server configuration
using Hangfire;
using Hangfire.SqlServer;

public class JobConfiguration
{
    public static void Configure(IServiceCollection services, string connectionString)
    {
        services.AddHangfire(config => config
            .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
            .UseSimpleAssemblyNameTypeSerializer()
            .UseRecommendedSerializerSettings()
            .UseSqlServerStorage(connectionString, new SqlServerStorageOptions
            {
                CommandBatchMaxTimeout = TimeSpan.FromMinutes(5),
                SlidingInvisibilityTimeout = TimeSpan.FromMinutes(5),
                QueuePollInterval = TimeSpan.FromSeconds(15),
                UseRecommendedIsolationLevel = true,
                DisableGlobalLocks = true
            }));

        services.AddHangfireServer(options =>
        {
            options.WorkerCount = Environment.ProcessorCount * 2;
            options.Queues = new[] { "default", "high", "low" };
            options.ServerTimeout = TimeSpan.FromMinutes(5);
            options.ShutdownTimeout = TimeSpan.FromSeconds(30);
        });
    }
}

// Enqueue jobs
BackgroundJob.Enqueue<EmailService>(x => x.SendWelcomeEmail(userId));
BackgroundJob.Schedule<ReminderService>(x => x.SendReminder(orderId), TimeSpan.FromHours(24));
RecurringJob.AddOrUpdate<ReportService>("daily-report", x => x.Generate(), "0 2 * * *", TimeZoneInfo.Utc);
```

## Cron Expression Format

```
┌───────── minute (0-59)
│ ┌───────── hour (0-23)
│ │ ┌───────── day of month (1-31)
│ │ │ ┌───────── month (1-12)
│ │ │ │ ┌───────── day of week (0-7, 0/7=Sun)
* * * * *
```

| Expression | Meaning |
|------------|---------|
| `0 * * * *` | Every hour at minute 0 |
| `*/15 * * * *` | Every 15 minutes |
| `0 0 * * *` | Daily at midnight UTC |
| `0 9 * * 1` | Every Monday 9 AM UTC |
| `0 0 1 * *` | First day of month at midnight |
| `0 */2 * * *` | Every 2 hours |
| `30 6 * * 1-5` | 6:30 AM weekdays |
| `0 0 * * 0` | Weekly (Sunday midnight) |
| `0 0 1 1 *` | Yearly (Jan 1 midnight) |
| `0 8,12,17 * * *` | 8 AM, 12 PM, 5 PM daily |

## Scheduled Job Configuration

```yaml
scheduled_jobs:
  - name: generate-daily-report
    queue: default
    cron: "0 2 * * *"  # Every day at 2 AM UTC
    timezone: America/New_York
    job_type: recurring
    timeout: 300s
    max_retries: 3
    description: "Generate and email daily sales report"
    alerts:
      on_failure: true
      on_missed: true  # If job didn't run when expected
  - name: cleanup-expired-sessions
    queue: low
    cron: "0 */4 * * *"  # Every 4 hours
    job_type: recurring
    timeout: 120s
    max_retries: 2
  - name: weekly-data-sync
    queue: default
    cron: "0 3 * * 0"  # Every Sunday 3 AM UTC
    job_type: recurring
    timeout: 3600s
    max_retries: 5
```

## Distributed Lock for Scheduled Jobs

```typescript
// Prevent duplicate execution of the same scheduled job across workers
import { createClient } from 'redis';

const lockClient = createClient({ url: process.env.REDIS_URL });

async function acquireLock(jobName: string, ttlMs = 60000): Promise<boolean> {
  const acquired = await lockClient.set(`lock:${jobName}`, '1', {
    NX: true,
    PX: ttlMs,
  });
  return acquired === 'OK';
}

async function releaseLock(jobName: string): Promise<void> {
  await lockClient.del(`lock:${jobName}`);
}

// Usage in cron job handler
async function handleCronJob(name: string, handler: () => Promise<void>) {
  if (!await acquireLock(name)) {
    console.log(`Job ${name} already running on another worker`);
    return;
  }
  try {
    await handler();
  } finally {
    await releaseLock(name);
  }
}
```

## Worker Configuration by Queue Type

| Queue Type | Concurrency | Timeout | Retry | Prefetch |
|------------|-------------|---------|-------|----------|
| Fire-and-forget | High (CPU*4) | 30s | 5 | 10 |
| Delayed | Medium (CPU*2) | 120s | 10 | 5 |
| Scheduled | Low (CPU*1) | 300s+ | 3 | 1 |
| Recurring | Low (CPU*1) | Varies | 2 | 1 |
| Dead-letter | Manual | N/A | 0 | 1 |

## Graceful Shutdown Implementation

```go
// Go graceful shutdown with asynq
import (
  "context"
  "os"
  "os/signal"
  "syscall"
  "github.com/hibiken/asynq"
)

func main() {
  srv := asynq.NewServer(
    asynq.RedisClientOpt{Addr: "redis:6379"},
    asynq.Config{
      Concurrency: 10,
      Queues: map[string]int{"high": 6, "default": 3, "low": 1},
      StrictPriority: true,
    },
  )

  mux := asynq.NewServeMux()
  mux.HandleFunc("send:email", handleEmailTask)
  mux.HandleFunc("generate:report", handleReportTask)

  ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM, os.Interrupt)
  defer stop()

  if err := srv.Run(mux); err != nil {
    log.Fatalf("could not run server: %v", err)
  }

  <-ctx.Done()
  log.Println("shutting down...")
  srv.Shutdown()
}
```

## Common Pitfalls

- **Clock skew**: Cron schedulers on different machines with different system clocks cause missed or duplicate job executions. Use NTP-synchronized time or a centralized scheduler.
- **Thundering herd at :00**: Many systems schedule at the top of the hour (0 0 * * *). Add random minute offset (random(0,59)) to spread load.
- **Timezone confusion**: Cron always executes against the server's local timezone. Always set servers to UTC and convert to user timezone only in the display layer.
- **Missed schedule detection**: If scheduler crashes, cron jobs won't fire until restart. Implement missed schedule detection (check if last execution was within expected window, alert if not).
- **Blocking job monopolizes worker**: A job that runs for hours blocks the worker thread. Set per-job timeouts and use separate queues for long-running vs short-running jobs.
- **DLQ never reviewed**: Failed jobs accumulate in DLQ with no owner reviewing them. Set up automated alerts and a regular review cadence (daily during business hours).
