# Background Job Patterns

## Chained Workflows

```typescript
// Chain: order → payment → shipping → notification
async function handleOrderCreated(order: Order) {
  // Step 1: Process payment
  const paymentJob = await enqueue('process-payment', {
    orderId: order.id,
    amount: order.total,
  });

  // Step 2: On payment success → prepare shipping
  await enqueue('prepare-shipping', {
    orderId: order.id,
    dependsOn: paymentJob.id,
  });

  // Step 3: On shipping ready → send notification
  await enqueue('send-notification', {
    orderId: order.id,
    type: 'shipping-confirmed',
    dependsOn: paymentJob.id, // or shippingJob.id
  });
}
```

## Saga Pattern with Compensations

```typescript
interface SagaStep {
  name: string;
  execute: () => Promise<void>;
  compensate: () => Promise<void>;
}

class Saga {
  private steps: SagaStep[] = [];
  private completed: string[] = [];

  addStep(step: SagaStep): Saga {
    this.steps.push(step);
    return this;
  }

  async execute(): Promise<void> {
    for (const step of this.steps) {
      try {
        await step.execute();
        this.completed.push(step.name);
      } catch (err) {
        logger.error(`Saga failed at step: ${step.name}`, err);
        await this.rollback();
        throw err;
      }
    }
  }

  private async rollback(): Promise<void> {
    // Compensate in reverse order
    for (const name of this.completed.reverse()) {
      const step = this.steps.find(s => s.name === name);
      if (step) await step.compensate().catch(e =>
        logger.error(`Compensation failed for ${name}`, e)
      );
    }
  }
}
```

## Batch Processing

```typescript
// Process items in batches with rate limiting
interface BatchConfig {
  batchSize: number;
  concurrency: number;
  rateLimit: number; // items per second
}

async function processBatch<T>(
  items: T[],
  processor: (item: T) => Promise<void>,
  config: BatchConfig
): Promise<BatchResult> {
  const results: BatchResult = { success: 0, failed: 0, errors: [] };

  for (let i = 0; i < items.length; i += config.batchSize) {
    const batch = items.slice(i, i + config.batchSize);
    const limiter = new RateLimiter(config.rateLimit);

    const promises = batch.map(item =>
      limiter.schedule(() =>
        processor(item)
          .then(() => results.success++)
          .catch(err => {
            results.failed++;
            results.errors.push({ item, error: err.message });
          })
      )
    );

    await Promise.all(promises);
  }
  return results;
}
```

## Rate-Limited Jobs

```typescript
// Queue with per-tenant rate limiting
interface RateLimitedJob extends Job {
  tenantId: string;
  rateLimit: number; // concurrent jobs per tenant
}

class RateLimitedWorker {
  private active: Map<string, number> = new Map();

  async process(job: RateLimitedJob): Promise<void> {
    const current = this.active.get(job.tenantId) || 0;
    if (current >= job.rateLimit) {
      await this.reEnqueue(job, 5000); // retry in 5s
      return;
    }

    this.active.set(job.tenantId, current + 1);
    try {
      await this.execute(job);
    } finally {
      this.active.set(job.tenantId, this.active.get(job.tenantId)! - 1);
    }
  }
}
```

## Scheduled Jobs

```typescript
// Cron-like job scheduling
interface ScheduledJob {
  name: string;
  schedule: string;     // cron expression
  timezone: string;
  jobType: string;
  payload: Record<string, unknown>;
  preventOverlap: boolean;
}

const scheduledJobs: ScheduledJob[] = [
  {
    name: 'daily-report',
    schedule: '0 6 * * *',  // Every day 6 AM UTC
    timezone: 'UTC',
    jobType: 'generate-report',
    payload: { type: 'daily' },
    preventOverlap: true,
  },
  {
    name: 'sync-external',
    schedule: '*/15 * * * *',  // Every 15 minutes
    timezone: 'UTC',
    jobType: 'sync-external',
    payload: {},
    preventOverlap: false,
  },
];
```

## Exactly-Once Processing

```typescript
async function processExactlyOnce(
  job: Job,
  processor: () => Promise<void>
): Promise<void> {
  // 1. Check idempotency store
  const processed = await idempotencyStore.exists(job.idempotencyKey);
  if (processed) return;

  // 2. Acquire distributed lock
  const lock = await lockService.acquire(`job:${job.idempotencyKey}`, 30000);

  try {
    // 3. Double-check after lock
    const alreadyProcessed = await idempotencyStore.exists(job.idempotencyKey);
    if (alreadyProcessed) return;

    // 4. Process with transactional write
    await transaction(async (tx) => {
      await processor();
      await idempotencyStore.mark(job.idempotencyKey, tx);
    });
  } finally {
    await lock.release();
  }
}
```

## Best Practices

- Chained jobs: use `dependsOn` or workflow engine (Temporal, Cadence, AWS Step Functions)
- Sagas: always test compensation paths (they often break silently)
- Batch processing: process in bounded batches with rate limiting
- Scheduled jobs: document timezone, prevent overlap for critical jobs
- Exactly-once: requires idempotency key + distributed lock + transactional store
