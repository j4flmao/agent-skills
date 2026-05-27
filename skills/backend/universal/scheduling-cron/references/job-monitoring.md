# Job Monitoring and Management

## Job History

### Execution Logging
```typescript
interface JobExecution {
  id: string;
  jobName: string;
  status: 'RUNNING' | 'SUCCESS' | 'FAILED' | 'TIMEOUT';
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  error?: string;
  triggeredBy: 'SCHEDULE' | 'MANUAL' | 'RETRY';
  hostname: string;
}

class JobHistoryStore {
  async record(execution: JobExecution): Promise<void> {
    await this.db.query(
      `INSERT INTO job_executions (id, job_name, status, started_at, completed_at, duration, error, triggered_by, hostname)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        execution.id,
        execution.jobName,
        execution.status,
        execution.startedAt,
        execution.completedAt,
        execution.duration,
        execution.error,
        execution.triggeredBy,
        execution.hostname,
      ]
    );
  }

  async getRecentExecutions(jobName: string, limit: number = 20): Promise<JobExecution[]> {
    const result = await this.db.query(
      `SELECT * FROM job_executions
       WHERE job_name = $1
       ORDER BY started_at DESC
       LIMIT $2`,
      [jobName, limit]
    );
    return result.rows;
  }

  async getFailedJobs(since: Date): Promise<JobExecution[]> {
    const result = await this.db.query(
      `SELECT * FROM job_executions
       WHERE status IN ('FAILED', 'TIMEOUT')
       AND started_at >= $1
       ORDER BY started_at DESC`,
      [since]
    );
    return result.rows;
  }
}
```

## Health Monitoring

```typescript
class SchedulerHealthMonitor {
  async checkJobHealth(jobName: string): Promise<HealthStatus> {
    const lastExecution = await this.historyStore.getRecentExecutions(jobName, 1);
    const config = await this.jobStore.getJobConfig(jobName);

    if (lastExecution.length === 0) {
      return { status: 'WARNING', message: 'Job has never been executed' };
    }

    const latest = lastExecution[0];
    const cron = new CronExpression(config.cronExpression);
    const expectedNextRun = cron.getNextRunTime(latest.startedAt);
    const now = new Date();

    if (latest.status === 'FAILED') {
      return { status: 'CRITICAL', message: `Last execution failed: ${latest.error}` };
    }

    if (expectedNextRun < now) {
      return { status: 'WARNING', message: `Job missed scheduled run at ${expectedNextRun.toISOString()}` };
    }

    return { status: 'HEALTHY', message: `Next run: ${expectedNextRun.toISOString()}` };
  }

  async checkAllJobs(): Promise<Record<string, HealthStatus>> {
    const jobs = await this.jobStore.getAllJobs();
    const results: Record<string, HealthStatus> = {};

    for (const job of jobs) {
      results[job.name] = await this.checkJobHealth(job.name);
    }

    return results;
  }
}
```

## Key Points
- Log all job executions with status, duration, and error details
- Track execution history for auditing and debugging
- Monitor job health with automated checks between scheduled runs
- Alert on failed jobs, missed executions, and timeouts
- Provide a dashboard for job status visibility
- Support manual job triggering and cancellation
- Implement job SLA monitoring with alerting thresholds
- Track job metrics: success rate, average duration, concurrency
- Integrate with incident management for critical job failures
- Retain job history for compliance and post-mortem analysis
