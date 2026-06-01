# Background Jobs Advanced

## Chained Workflows

```typescript
// Workflow definition
class OrderProcessingWorkflow {
  async execute(orderId: string): Promise<void> {
    const { validateInventory } = await queue.add('inventory.validate', { orderId });
    const { reserveStock } = await queue.add('stock.reserve', { orderId }, { dependsOn: validateInventory.id });
    const { processPayment } = await queue.add('payment.process', { orderId }, { dependsOn: reserveStock.id });
    const { sendConfirmation } = await queue.add('email.confirmation', { orderId }, { dependsOn: processPayment.id });
  }
}
```

### Saga Pattern (Compensating Transactions)
```typescript
const SAGA_STEPS = [
  { action: 'inventory.reserve', compensate: 'inventory.release' },
  { action: 'payment.charge', compensate: 'payment.refund' },
  { action: 'shipping.schedule', compensate: 'shipping.cancel' },
];

async function executeSaga(orderId: string): Promise<void> {
  const completedSteps: string[] = [];

  try {
    for (const step of SAGA_STEPS) {
      await queue.add(step.action, { orderId }, { timeout: 30000 });
      completedSteps.push(step.action);
    }
  } catch (err) {
    // Compensate in reverse order
    for (const step of [...completedSteps].reverse()) {
      const sagaStep = SAGA_STEPS.find(s => s.action === step);
      if (sagaStep?.compensate) {
        await queue.add(sagaStep.compensate, { orderId, reason: err.message });
      }
    }
    throw err;
  }
}
```

## Job Prioritization

```typescript
// Priority queues via separate queues per priority
const QUEUES = {
  critical: new Bull('critical', { defaultJobOptions: { priority: 1 } }),
  high: new Bull('high', { defaultJobOptions: { priority: 2 } }),
  default: new Bull('default', { defaultJobOptions: { priority: 3 } }),
  low: new Bull('low', { defaultJobOptions: { priority: 4 } }),
};

// Worker processes higher priority first
async function processQueues() {
  const worker = new Worker('*', async (job) => {
    await processJob(job);
  }, {
    // Process from highest priority queue first
    limiter: { max: 10, duration: 1000 },
  });

  // Or: dedicated workers per priority
  QUEUES.critical.process(5, handler);  // 5 concurrent for critical
  QUEUES.default.process(2, handler);   // 2 concurrent for default
  QUEUES.low.process(1, handler);       // 1 concurrent for low
}
```

## Rate-Limited Job Processing

```typescript
// Respect external API rate limits
class RateLimitedWorker {
  private apiCalls = 0;
  private resetTime = Date.now();
  private readonly limit = 100;   // 100 calls per minute
  private readonly windowMs = 60000;

  async process(job: Job<ApiCallPayload>): Promise<void> {
    await this.waitForCapacity();
    this.apiCalls++;
    return this.callExternalApi(job.data);
  }

  private async waitForCapacity(): Promise<void> {
    if (this.apiCalls >= this.limit) {
      const waitMs = this.resetTime - Date.now();
      if (waitMs > 0) {
        await delay(waitMs + 100); // +100ms safety margin
      }
      this.apiCalls = 0;
      this.resetTime = Date.now() + this.windowMs;
    }
  }
}
```

## Graceful Shutdown

```typescript
async function shutdown(worker: Worker): Promise<void> {
  console.log('Shutting down worker...');

  // 1. Stop accepting new jobs
  worker.pause();

  // 2. Wait for running jobs (with timeout)
  const running = await worker.getRunningCount();
  if (running > 0) {
    console.log(`Waiting for ${running} jobs to complete...`);
    await Promise.race([
      worker.close(true),  // Wait for jobs to finish
      delay(30000),        // 30 second timeout
    ]);
  }

  // 3. Force close remaining
  await worker.close(false);

  // 4. Close connections
  await redis.quit();
  console.log('Worker shut down complete');
}

// Handle SIGTERM
process.on('SIGTERM', () => shutdown(worker));
```

## Job Deduplication

```typescript
// Prevent duplicate job enqueues
async function enqueueDedup(queue: Bull.Queue, jobName: string, data: any, ttl: number = 3600): Promise<Job> {
  const dedupKey = `dedup:${jobName}:${JSON.stringify(data)}`;

  const alreadyQueued = await redis.get(dedupKey);
  if (alreadyQueued) {
    return { id: alreadyQueued, existing: true } as any;
  }

  const job = await queue.add(jobName, data, {
    removeOnComplete: true,
    removeOnFail: false,
  });

  await redis.set(dedupKey, job.id!, 'EX', ttl);
  return job;
}
```

## Batch Job Processing

```typescript
// Process jobs in batches for efficiency
class BatchWorker {
  private batch: Job[] = [];
  private batchSize = 100;
  private batchTimeout = 1000; // 1 second
  private timer: NodeJS.Timeout | null = null;

  async handle(job: Job): Promise<void> {
    this.batch.push(job);

    if (this.batch.length >= this.batchSize) {
      await this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.batchTimeout);
    }
  }

  private async flush(): Promise<void> {
    const batch = this.batch.splice(0);
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;

    // Process batch in single DB operation
    await db.transaction(async (trx) => {
      for (const job of batch) {
        await processJobInBatch(job.data, trx);
      }
    });
  }
}
```
