# Background Job Scheduling

## Overview
Schedule background jobs with cron expressions, delayed execution, recurring schedules, and distributed scheduling coordination.

## Cron-Based Scheduling

```typescript
import cron from 'node-cron';

// Schedule recurring jobs
class JobScheduler {
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  scheduleRecurring(name: string, cronExpression: string, handler: () => Promise<void>): void {
    const task = cron.schedule(cronExpression, async () => {
      console.log(`[Scheduler] Running job: ${name}`);
      try {
        await handler();
        console.log(`[Scheduler] Job completed: ${name}`);
      } catch (error) {
        console.error(`[Scheduler] Job failed: ${name}`, error);
      }
    });

    this.jobs.set(name, task);
    console.log(`[Scheduler] Scheduled: ${name} (${cronExpression})`);
  }

  stop(name: string): void {
    const task = this.jobs.get(name);
    if (task) {
      task.stop();
      this.jobs.delete(name);
    }
  }

  stopAll(): void {
    for (const [name, task] of this.jobs) {
      task.stop();
      console.log(`[Scheduler] Stopped: ${name}`);
    }
    this.jobs.clear();
  }
}

// Usage
const scheduler = new JobScheduler();

// Every day at 2:00 AM — generate daily report
scheduler.scheduleRecurring('daily-report', '0 2 * * *', async () => {
  await generateDailyReport();
});

// Every hour — sync external data
scheduler.scheduleRecurring('sync-external', '0 * * * *', async () => {
  await syncExternalData();
});

// Every Monday at 9:00 AM — send weekly digest
scheduler.scheduleRecurring('weekly-digest', '0 9 * * 1', async () => {
  await sendWeeklyDigest();
});
```

## Delayed Job Execution

```typescript
class DelayedJobService {
  async scheduleDelayed(jobType: string, payload: Record<string, unknown>, delayMs: number): Promise<string> {
    const jobId = crypto.randomUUID();
    const executeAt = new Date(Date.now() + delayMs);

    await DelayedJob.create({
      jobId,
      jobType,
      payload,
      status: 'scheduled',
      executeAt,
      createdAt: new Date(),
    });

    return jobId;
  }

  async processDueJobs(): Promise<number> {
    const now = new Date();
    const dueJobs = await DelayedJob.find({
      status: 'scheduled',
      executeAt: { $lte: now },
    }).limit(100);

    let processed = 0;
    for (const job of dueJobs) {
      try {
        await this.executeJob(job);
        job.status = 'completed';
        job.completedAt = new Date();
        processed++;
      } catch (error) {
        job.status = 'failed';
        job.error = error.message;
        job.retryCount = (job.retryCount || 0) + 1;

        if (job.retryCount < 3) {
          // Reschedule with backoff
          job.executeAt = new Date(Date.now() + Math.pow(2, job.retryCount) * 1000);
          job.status = 'scheduled';
        }
      }
      await job.save();
    }

    return processed;
  }
}

// Poll for due jobs every second
setInterval(async () => {
  try {
    await delayedJobService.processDueJobs();
  } catch (error) {
    console.error('Failed to process due jobs:', error);
  }
}, 1000);
```

## Distributed Scheduling with Locks

```typescript
class DistributedScheduler {
  constructor(
    private redis: Redis,
    private readonly LOCK_TTL = 60000 // 1 minute
  ) {}

  async scheduleUnique(name: string, cronExpression: string, handler: () => Promise<void>): Promise<void> {
    const lockKey = `scheduler:lock:${name}`;

    // Use distributed lock to ensure only one instance runs the job
    setInterval(async () => {
      const lock = await this.redis.set(lockKey, process.env.HOSTNAME, 'NX', 'PX', this.LOCK_TTL);

      if (lock) {
        // Verify this instance should run the cron expression
        if (cron.validate(cronExpression) && cron.schedule(cronExpression, () => {})) {
          try {
            await handler();
          } finally {
            // Only release if we still own the lock
            const currentValue = await this.redis.get(lockKey);
            if (currentValue === process.env.HOSTNAME) {
              await this.redis.del(lockKey);
            }
          }
        }
      }
    }, 1000);
  }

  async getSchedulerStatus(): Promise<SchedulerStatus[]> {
    const keys = await this.redis.keys('scheduler:lock:*');
    const statuses: SchedulerStatus[] = [];

    for (const key of keys) {
      const owner = await this.redis.get(key);
      const ttl = await this.redis.ttl(key);
      statuses.push({
        name: key.replace('scheduler:lock:', ''),
        owner,
        ttl,
        running: ttl > 0,
      });
    }

    return statuses;
  }
}
```

## Calendar-Based Scheduling

```typescript
class CalendarScheduler {
  async scheduleOnDate(
    jobType: string,
    payload: Record<string, unknown>,
    date: Date
  ): Promise<string> {
    return delayedJobService.scheduleDelayed(
      jobType,
      payload,
      date.getTime() - Date.now()
    );
  }

  async scheduleRecurringWeekly(
    jobType: string,
    payload: Record<string, unknown>,
    dayOfWeek: number, // 0=Sunday, 6=Saturday
    hour: number,
    minute: number
  ): Promise<string> {
    const cronExpression = `${minute} ${hour} * * ${dayOfWeek}`;
    return this.scheduleCron(jobType, payload, cronExpression);
  }

  async scheduleRecurringMonthly(
    jobType: string,
    payload: Record<string, unknown>,
    dayOfMonth: number,
    hour: number,
    minute: number
  ): Promise<string> {
    const cronExpression = `${minute} ${hour} ${dayOfMonth} * *`;
    return this.scheduleCron(jobType, payload, cronExpression);
  }

  private async scheduleCron(
    jobType: string,
    payload: Record<string, unknown>,
    cronExpression: string
  ): Promise<string> {
    const jobId = crypto.randomUUID();

    await RecurringJob.create({
      jobId,
      jobType,
      payload,
      cronExpression,
      active: true,
      lastRunAt: null,
      nextRunAt: this.getNextCronDate(cronExpression),
      createdAt: new Date(),
    });

    return jobId;
  }
}
```

## Job Health Monitoring

```typescript
class JobHealthMonitor {
  async getSchedulerHealth(): Promise<SchedulerHealth> {
    const recentJobs = await JobExecution.find({
      startedAt: { $gte: new Date(Date.now() - 3600000) },
    });

    return {
      totalExecutions: recentJobs.length,
      failedExecutions: recentJobs.filter(j => j.status === 'failed').length,
      avgDuration: recentJobs.reduce((sum, j) => sum + (j.duration || 0), 0) / recentJobs.length,
      jobsByStatus: {
        running: await JobExecution.countDocuments({ status: 'running' }),
        queued: await JobExecution.countDocuments({ status: 'queued' }),
        failed: await JobExecution.countDocuments({ status: 'failed' }),
        completed: await JobExecution.countDocuments({ status: 'completed' }),
      },
      overdueJobs: await JobExecution.countDocuments({
        status: 'running',
        startedAt: { $lt: new Date(Date.now() - 300000) }, // Running >5 min
      }),
      nextScheduledJobs: await RecurringJob.find({ active: true })
        .sort({ nextRunAt: 1 })
        .limit(5)
        .lean(),
    };
  }
}
```

## Key Points
- Use cron expressions for recurring schedules; poll for delayed jobs
- Distributed scheduling requires locks to prevent duplicate execution
- Support calendar-based scheduling: specific dates, weekly, monthly
- Monitor job health: track executions, failures, duration, overdue jobs
- Implement retry with backoff for failed scheduled executions
