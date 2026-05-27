# Scheduling and Cron Patterns

## Scheduler Design

### Configurable Scheduler
```typescript
interface JobConfig {
  name: string;
  cronExpression: string;
  handler: string;
  timeout: number;
  retries: number;
  enabled: boolean;
  concurrency: number;
}

class Scheduler {
  private jobs: Map<string, JobInstance> = new Map();
  private timer: NodeJS.Timeout | null = null;

  constructor(private jobStore: JobStore, private workerPool: WorkerPool) {}

  async start(): Promise<void> {
    const jobs = await this.jobStore.getAllActiveJobs();

    for (const job of jobs) {
      this.scheduleJob(job);
    }

    // Check for missed executions every minute
    this.timer = setInterval(() => this.checkMissedExecutions(), 60000);
  }

  async scheduleJob(config: JobConfig): Promise<void> {
    const existing = this.jobs.get(config.name);
    if (existing) {
      existing.cancel();
    }

    const instance = new JobInstance(config, this.workerPool);
    this.jobs.set(config.name, instance);
    instance.start();
  }

  async unscheduleJob(name: string): Promise<void> {
    const job = this.jobs.get(name);
    if (job) {
      job.cancel();
      this.jobs.delete(name);
    }
  }

  async triggerJob(name: string): Promise<void> {
    const job = this.jobs.get(name);
    if (!job) throw new Error(`Job ${name} not found`);
    await job.executeNow();
  }

  private async checkMissedExecutions(): Promise<void> {
    for (const [name, job] of this.jobs) {
      if (job.hasMissedExecution()) {
        console.warn(`Job ${name} missed its scheduled execution`);
        // Depending on policy: skip, execute now, or alert
        if (job.config.retries > 0) {
          await job.executeNow();
        }
      }
    }
  }

  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
    }
    for (const [name, job] of this.jobs) {
      await job.cancel();
    }
  }
}
```

## Cron Expression Parser

### Simple Cron Parser
```typescript
class CronExpression {
  private minute: number[];
  private hour: number[];
  private dayOfMonth: number[];
  private month: number[];
  private dayOfWeek: number[];

  constructor(expression: string) {
    const parts = expression.split(/\s+/);
    if (parts.length !== 5) {
      throw new Error(`Invalid cron expression: ${expression}`);
    }

    this.minute = this.parseField(parts[0], 0, 59);
    this.hour = this.parseField(parts[1], 0, 23);
    this.dayOfMonth = this.parseField(parts[2], 1, 31);
    this.month = this.parseField(parts[3], 1, 12);
    this.dayOfWeek = this.parseField(parts[4], 0, 6);
  }

  private parseField(field: string, min: number, max: number): number[] {
    if (field === '*') {
      return this.range(min, max);
    }

    const values: number[] = [];

    for (const part of field.split(',')) {
      if (part.includes('/')) {
        const [range, step] = part.split('/');
        const [start, end] = range === '*' ? [min, max] : range.split('-').map(Number);
        for (let i = start || min; i <= (end || max); i += parseInt(step)) {
          values.push(i);
        }
      } else if (part.includes('-')) {
        const [start, end] = part.split('-').map(Number);
        values.push(...this.range(start, end));
      } else {
        values.push(parseInt(part));
      }
    }

    return values.filter(v => v >= min && v <= max);
  }

  private range(start: number, end: number): number[] {
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  getNextRunTime(from: Date = new Date()): Date {
    let candidate = new Date(from);

    for (let i = 0; i < 525600; i++) { // Max 1 year ahead
      candidate.setMinutes(candidate.getMinutes() + 1);

      if (this.matches(candidate)) {
        return candidate;
      }
    }

    throw new Error('No future match found within 1 year');
  }

  matches(date: Date): boolean {
    return (
      this.minute.includes(date.getMinutes()) &&
      this.hour.includes(date.getHours()) &&
      this.dayOfMonth.includes(date.getDate()) &&
      this.month.includes(date.getMonth() + 1) &&
      this.dayOfWeek.includes(date.getDay())
    );
  }
}
```

## Job Execution

### Job Instance
```typescript
class JobInstance {
  private timer: NodeJS.Timeout | null = null;
  private executing: boolean = false;

  constructor(
    public config: JobConfig,
    private workerPool: WorkerPool
  ) {}

  start(): void {
    this.scheduleNext();
  }

  private scheduleNext(): void {
    const cron = new CronExpression(this.config.cronExpression);
    const nextRun = cron.getNextRunTime();
    const delay = nextRun.getTime() - Date.now();

    if (delay < 0) return;

    this.timer = setTimeout(() => this.execute(), delay);
    console.log(`Job ${this.config.name} scheduled for ${nextRun.toISOString()}`);
  }

  async execute(): Promise<void> {
    if (this.executing) {
      console.warn(`Job ${this.config.name} already executing, skipping`);
      this.scheduleNext();
      return;
    }

    this.executing = true;

    try {
      await this.workerPool.executeWithTimeout(
        this.config.handler,
        this.config.timeout
      );
    } catch (error) {
      console.error(`Job ${this.config.name} failed:`, error);
      if (this.config.retries > 0) {
        await this.retry();
      }
    } finally {
      this.executing = false;
      this.scheduleNext();
    }
  }

  async executeNow(): Promise<void> {
    if (this.executing) {
      throw new Error(`Job ${this.config.name} is already executing`);
    }
    await this.execute();
  }

  private async retry(): Promise<void> {
    for (let attempt = 1; attempt <= this.config.retries; attempt++) {
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(r => setTimeout(r, delay));

      try {
        await this.workerPool.execute(this.config.handler);
        return;
      } catch (error) {
        console.error(`Retry ${attempt} for job ${this.config.name} failed:`, error);
      }
    }
  }

  cancel(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  hasMissedExecution(): boolean {
    if (this.timer === null) return false;

    const cron = new CronExpression(this.config.cronExpression);
    const lastRun = this.config.lastRunAt || new Date(0);
    const nextExpected = cron.getNextRunTime(lastRun);
    return nextExpected < new Date();
  }
}
```

## Distributed Locking

```typescript
class DistributedJobLock {
  constructor(private redis: Redis) {}

  async acquire(jobName: string, ttlMs: number = 60000): Promise<boolean> {
    const lockKey = `job:lock:${jobName}`;
    const result = await this.redis.set(
      lockKey,
      process.env.HOSTNAME || 'unknown',
      'PX',
      ttlMs,
      'NX'
    );
    return result === 'OK';
  }

  async release(jobName: string): Promise<void> {
    const lockKey = `job:lock:${jobName}`;
    await this.redis.del(lockKey);
  }

  async extend(jobName: string, ttlMs: number): Promise<boolean> {
    const lockKey = `job:lock:${jobName}`;
    const result = await this.redis.pexpire(lockKey, ttlMs);
    return result === 1;
  }
}
```

## Key Points
- Use cron expressions for flexible scheduling patterns
- Implement distributed locking to prevent duplicate job execution
- Handle job timeouts with configurable execution limits
- Support manual job triggering for ad-hoc execution
- Implement retry with backoff for transient failures
- Monitor missed executions and alert on scheduling gaps
- Store job history for auditing and debugging
- Support job concurrency limits to prevent resource exhaustion
- Use worker pools for isolated job execution
- Implement graceful shutdown with in-flight job completion
