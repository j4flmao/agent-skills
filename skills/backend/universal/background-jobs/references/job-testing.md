# Background Job Testing

## Overview
Test background job processing: unit test job handlers, integration test queue interactions, verify retry and DLQ behavior, and test distributed execution.

## Unit Testing Job Handlers

```typescript
describe('SendEmailJob', () => {
  let job: SendEmailJob;
  let emailService: jest.Mocked<EmailService>;

  beforeEach(() => {
    emailService = { send: jest.fn() };
    job = new SendEmailJob(emailService);
  });

  it('sends email with correct parameters', async () => {
    emailService.send.mockResolvedValue({ id: 'email_123' });

    const result = await job.execute({
      to: 'user@example.com',
      subject: 'Welcome!',
      body: '<p>Hello</p>',
    });

    expect(result.success).toBe(true);
    expect(emailService.send).toHaveBeenCalledWith({
      to: 'user@example.com',
      subject: 'Welcome!',
      html: '<p>Hello</p>',
    });
  });

  it('returns failure result on error', async () => {
    emailService.send.mockRejectedValue(new Error('Email service unavailable'));

    const result = await job.execute({
      to: 'user@example.com',
      subject: 'Welcome!',
      body: '<p>Hello</p>',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Email service unavailable');
    expect(result.retryable).toBe(true); // Should be retried
  });

  it('marks non-recoverable errors as not retryable', async () => {
    emailService.send.mockRejectedValue(new ValidationError('Invalid email'));

    const result = await job.execute({
      to: 'not-an-email',
      subject: 'Welcome!',
      body: '<p>Hello</p>',
    });

    expect(result.success).toBe(false);
    expect(result.retryable).toBe(false); // Validation errors are not retryable
  });
});
```

## Testing Idempotency

```typescript
describe('Job Idempotency', () => {
  it('processes same job payload only once', async () => {
    const jobPayload = { orderId: 'order_123' };
    const jobId = 'job_001';

    // First execution
    const result1 = await jobExecutor.execute('ProcessOrderJob', jobPayload, jobId);
    expect(result1.success).toBe(true);

    // Second execution with same jobId
    const result2 = await jobExecutor.execute('ProcessOrderJob', jobPayload, jobId);
    expect(result2.success).toBe(true);
    expect(result2.skipped).toBe(true); // Already processed

    // Handler should only have been called once
    expect(processOrderHandler).toHaveBeenCalledTimes(1);
  });
});
```

## Integration Testing with Queue

```typescript
describe('Bull Queue Integration', () => {
  let queue: Queue;
  let worker: Worker;

  beforeAll(async () => {
    queue = new Queue('test-jobs', { connection: { host: 'localhost', port: 6379 } });
    worker = new Worker('test-jobs', async (job) => {
      return processJob(job.data);
    }, { connection: { host: 'localhost', port: 6379 } });

    await queue.waitUntilReady();
    await worker.waitUntilReady();
  });

  afterAll(async () => {
    await queue.close();
    await worker.close();
  });

  beforeEach(async () => {
    await queue.obliterate({ force: true });
    jest.clearAllMocks();
  });

  it('processes job and returns result', async () => {
    processJob.mockResolvedValue({ processed: true });

    const job = await queue.add('process-order', { orderId: '123' });
    const result = await job.waitUntilFinished(queueEvents);

    expect(result.processed).toBe(true);
  });

  it('moves failed jobs to DLQ after max retries', async () => {
    processJob.mockRejectedValue(new Error('Processing failed'));

    const job = await queue.add('process-order', { orderId: '123' }, {
      attempts: 3,
      backoff: { type: 'fixed', delay: 100 },
    });

    // Wait for all retries to complete
    await new Promise(r => setTimeout(r, 2000));

    const completedCount = await queue.getCompletedCount();
    const failedCount = await queue.getFailedCount();
    const dlqCount = await dlqQueue.getCompletedCount();

    expect(completedCount).toBe(0);
    expect(failedCount).toBe(0); // Should move to DLQ after max retries
    expect(dlqCount).toBe(1); // In DLQ
  });
});
```

## Testing Concurrency and Worker Pool

```typescript
describe('Worker Pool Concurrency', () => {
  it('processes multiple jobs concurrently up to limit', async () => {
    const concurrency = 5;
    const totalJobs = 20;

    let activeJobs = 0;
    let maxConcurrent = 0;

    const handler = async (job: Job) => {
      activeJobs++;
      maxConcurrent = Math.max(maxConcurrent, activeJobs);
      await new Promise(r => setTimeout(r, 100)); // Simulate work
      activeJobs--;
    };

    const worker = new Worker('test-queue', handler, {
      connection: { host: 'localhost', port: 6379 },
      concurrency,
    });

    const jobs = Array.from({ length: totalJobs }, (_, i) =>
      queue.add('test', { index: i })
    );
    await Promise.all(jobs);

    await new Promise(r => setTimeout(r, 1000));

    expect(maxConcurrent).toBeLessThanOrEqual(concurrency);
    expect(maxConcurrent).toBeGreaterThan(1); // Should have some concurrency

    await worker.close();
  });
});
```

## Testing DLQ Processing

```typescript
describe('Dead Letter Queue', () => {
  it('moves permanently failed jobs to DLQ', async () => {
    handler.mockRejectedValue(new Error('Unrecoverable error'));

    const job = await queue.add('failing-job', { data: 'test' }, {
      attempts: 3,
      backoff: { type: 'fixed', delay: 50 },
      removeOnFail: false,
    });

    await new Promise(r => setTimeout(r, 2000));

    // Check original queue
    const failedJobs = await queue.getFailed();
    expect(failedJobs.length).toBe(0); // Moved to DLQ

    // Check DLQ
    const dlqJobs = await dlqQueue.getCompleted();
    expect(dlqJobs.length).toBe(1);

    // DLQ job should have error info
    const dlqJob = dlqJobs[0];
    expect(dlqJob.data.originalJobId).toBe(job.id);
    expect(dlqJob.data.error).toBe('Unrecoverable error');
    expect(dlqJob.data.retryCount).toBe(3);
    expect(dlqJob.data.finalStatus).toBe('failed');
  });
});
```

## CI Integration

```yaml
# .github/workflows/job-tests.yml
name: Background Job Tests
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis:7
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - name: Unit tests
        run: npm test -- --testPathPattern=job-handlers
      - name: Integration tests
        run: npm test -- --testPathPattern=job-queue
        env:
          REDIS_URL: redis://localhost:6379
```

## Key Points
- Unit test job handlers with mocked dependencies
- Test idempotency: same jobId should be processed only once
- Integration test with real Redis/Bull queue
- Verify concurrency limits are respected by worker pools
- Test DLQ: permanently failed jobs should move to DLQ with full error context
- Run job tests in CI with Redis service container
