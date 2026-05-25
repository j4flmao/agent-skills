# Scheduling Monitoring

## Job Execution Metrics

```yaml
metrics:
  job_run_total:
    type: counter
    labels: [job_name, status]
    description: "Total job executions by status"

  job_run_duration_seconds:
    type: histogram
    labels: [job_name]
    buckets: [1, 5, 10, 30, 60, 120, 300]
    description: "Job execution duration"

  job_run_timestamp:
    type: gauge
    labels: [job_name]
    description: "Unix timestamp of last job run"

  job_consecutive_failures:
    type: gauge
    labels: [job_name]
    description: "Current consecutive failure count"

  job_lag_seconds:
    type: gauge
    labels: [job_name]
    description: "How late the job is running compared to schedule"
```

## Prometheus Instrumentation

```typescript
import { Counter, Histogram, Gauge } from 'prom-client';

const jobRunCounter = new Counter({
  name: 'job_run_total',
  help: 'Total job executions by status',
  labelNames: ['job_name', 'status'] as const,
});

const jobDurationHistogram = new Histogram({
  name: 'job_run_duration_seconds',
  help: 'Job execution duration',
  labelNames: ['job_name'] as const,
  buckets: [1, 5, 10, 30, 60, 120, 300],
});

const jobLastRunGauge = new Gauge({
  name: 'job_run_timestamp',
  help: 'Unix timestamp of last job run',
  labelNames: ['job_name'] as const,
});

// Wrap job execution with metrics
async function monitoredJob(jobName: string, fn: () => Promise<void>): Promise<void> {
  const endTimer = jobDurationHistogram.startTimer({ job_name: jobName });

  try {
    await fn();
    jobRunCounter.inc({ job_name: jobName, status: 'success' });
  } catch (err) {
    jobRunCounter.inc({ job_name: jobName, status: 'failure' });
    throw err;
  } finally {
    endTimer();
    jobLastRunGauge.set({ job_name: jobName }, Date.now() / 1000);
  }
}
```

## Health Check API

```typescript
class SchedulingHealthCheck {
  constructor(private jobStore: JobStore) {}

  async check(): Promise<HealthStatus> {
    const jobs = await this.jobStore.getAllJobs();
    const status: HealthStatus = {
      status: 'healthy',
      totalJobs: jobs.length,
      enabledJobs: jobs.filter(j => j.enabled).length,
      runningJobs: jobs.filter(j => j.lastRunStatus === 'running').length,
      failedJobs: jobs.filter(j => j.lastRunStatus === 'failed').length,
      jobsOverdue: 0,
      details: {},
    };

    for (const job of jobs) {
      const overdue = this.isOverdue(job);
      if (overdue) status.jobsOverdue++;

      status.details[job.name] = {
        lastRun: job.lastRunAt?.toISOString() ?? 'never',
        lastStatus: job.lastRunStatus ?? 'never_run',
        nextRun: job.nextRunAt?.toISOString() ?? 'unscheduled',
        overdue,
        consecutiveFailures: job.consecutiveFailures,
      };
    }

    if (status.failedJobs > 0 || status.jobsOverdue > 0) {
      status.status = 'degraded';
    }

    return status;
  }

  private isOverdue(job: ScheduledJob): boolean {
    if (!job.enabled) return false;
    return job.nextRunAt < new Date(Date.now() - 5 * 60 * 1000); // 5 min grace
  }
}
```

## Alerting Rules

```yaml
alerts:
  - name: JobFailed
    condition: "increase(job_run_total{status='failure'}[5m]) > 0"
    severity: warning
    summary: "Job {{ $labels.job_name }} failed"
    description: "Job {{ $labels.job_name }} has failed in the last 5 minutes"
    runbook: "https://wiki/runbooks/job-failure"

  - name: JobConsecutiveFailures
    condition: "job_consecutive_failures > 3"
    severity: critical
    summary: "Job {{ $labels.job_name }} has {{ $value }} consecutive failures"
    description: "Investigate immediately, manual intervention may be required"
    runbook: "https://wiki/runbooks/job-consecutive-failure"

  - name: JobOverdue
    condition: "job_run_timestamp{job_name='critical-job'} < (time() - 900)"
    severity: critical
    summary: "Job {{ $labels.job_name }} has not run in 15 minutes"

  - name: JobDurationSpike
    condition: "histogram_quantile(0.95, rate(job_run_duration_seconds_bucket[5m])) > 120"
    severity: warning
    summary: "Job {{ $labels.job_name }} p95 duration > 120s"
    description: "Job is taking significantly longer than expected"

  - name: SchedulerDown
    condition: "up{service='scheduler'} == 0"
    severity: critical
    summary: "Scheduler service is down"
    description: "No scheduled jobs will execute until scheduler recovers"
```

## Logging Best Practices

```typescript
// Structured logging for job execution
const logger = pino({ name: 'scheduler' });

async function executeJob(job: ScheduledJob): Promise<void> {
  const startTime = Date.now();
  logger.info({
    job: job.name,
    event: 'job.start',
    scheduledAt: job.nextRunAt?.toISOString(),
  });

  try {
    const result = await job.handler();
    logger.info({
      job: job.name,
      event: 'job.complete',
      duration: Date.now() - startTime,
      result,
    });
  } catch (err) {
    logger.error({
      job: job.name,
      event: 'job.failure',
      duration: Date.now() - startTime,
      error: err.message,
      stack: err.stack,
      consecutiveFailures: job.consecutiveFailures + 1,
    });
    throw err;
  }
}
```

## Dashboard

```yaml
dashboard:
  title: "Job Scheduler Overview"
  panels:
    - title: "Job Status Overview"
      type: stat
      metrics: ["sum(job_run_total)", "sum(job_run_total{status='failure'})"]
    
    - title: "Execution Duration (p95)"
      type: timeseries
      metrics: ["histogram_quantile(0.95, rate(job_run_duration_seconds_bucket[5m]))"]
    
    - title: "Job Success Rate"
      type: timeseries
      metrics: ["rate(job_run_total{status='success'}[5m]) / rate(job_run_total[5m])"]
    
    - title: "Overdue Jobs"
      type: stat
      metrics: ["job_overdue_count"]
    
    - title: "Last Run Timestamps"
      type: table
      metrics: ["job_run_timestamp"]
    
    - title: "Consecutive Failures"
      type: table
      metrics: ["job_consecutive_failures"]
```

## Dead Job Detection

```typescript
// Background check for jobs that stopped running
class DeadJobDetector {
  constructor(
    private jobStore: JobStore,
    private alertService: AlertService,
    private thresholdMinutes: number = 30,
  ) {}

  async checkForDeadJobs(): Promise<void> {
    const jobs = await this.jobStore.getEnabledJobs();

    for (const job of jobs) {
      if (!job.lastRunAt) {
        // Job was enabled but never ran — might be a scheduling issue
        if (job.createdAt < new Date(Date.now() - 3600000)) {
          await this.alertService.send({
            severity: 'warning',
            message: `Job ${job.name} has never executed`,
          });
        }
        continue;
      }

      const expectedInterval = this.parseCronToMs(job.cronExpression);
      const timeSinceLastRun = Date.now() - job.lastRunAt.getTime();

      if (timeSinceLastRun > expectedInterval * 3) {
        await this.alertService.send({
          severity: 'critical',
          message: `Job ${job.name} appears dead. Last run: ${job.lastRunAt.toISOString()}`,
          metadata: {
            jobName: job.name,
            lastRunAt: job.lastRunAt.toISOString(),
            expectedInterval: `${expectedInterval}ms`,
            actualGap: `${timeSinceLastRun}ms`,
          },
        });
      }
    }
  }
}
```

## Maintenance Windows

```typescript
class MaintenanceWindow {
  private windows: Array<{ start: string; end: string; timezone: string }> = [
    { start: 'Sun 02:00', end: 'Sun 04:00', timezone: 'UTC' },  // Weekly
  ];

  isInMaintenance(jobName: string): boolean {
    const now = DateTime.now().toUTC();
    return this.windows.some(w => {
      const start = DateTime.fromFormat(w.start, 'EEE HH:mm', { zone: w.timezone });
      const end = DateTime.fromFormat(w.end, 'EEE HH:mm', { zone: w.timezone });
      return now >= start && now <= end;
    });
  }

  shouldSkipJob(job: ScheduledJob): boolean {
    if (!this.isInMaintenance(job.name)) return false;
    return !job.config.runInMaintenance;
  }
}
```
