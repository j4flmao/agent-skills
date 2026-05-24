# Background Job Monitoring

## Dashboard Metrics

| Panel | Query | Threshold | Severity |
|-------|-------|-----------|----------|
| Queue Depth | `sum(queue_depth{queue="default"})` | > 10000 | Warning |
| DLQ Count | `sum(dlq_count)` | > 0 | Critical |
| Job Success Rate | `avg(job_success_rate{job_type=~".*"})` | < 99% | Warning |
| Stuck Jobs | `count(job_running_duration > (5 * expected_duration))` | > 0 | Warning |
| Worker Pool Saturation | `avg(worker_pool_usage) / avg(worker_pool_max)` | > 90% | Warning |
| Avg Job Duration | `avg(job_duration{job_type="send-email"})` | 2x baseline | Info |

## Prometheus Metrics

```yaml
# Exported metrics by job worker
job_enqueued_total{queue, job_type}
job_started_total{queue, job_type}
job_success_total{queue, job_type}
job_failed_total{queue, job_type, error_category}
job_duration_seconds{queue, job_type, quantile="0.5|0.9|0.99"}
job_queue_depth{queue}
job_dlq_count{queue}
worker_pool_active{pool}
worker_pool_queued{pool}
worker_pool_max{pool}
```

## Alerts

```yaml
alerts:
- name: DLQ-Message-Received
  condition: dlq_count > 0
  severity: PagerDuty
  message: "Job in DLQ: {{ $labels.queue }} — manual intervention required"

- name: Queue-Deep
  condition: queue_depth > 10000
  severity: PagerDuty
  message: "Queue {{ $labels.queue }} depth {{ $value }} — add workers or reduce load"

- name: Job-Success-Rate-Dropped
  condition: job_success_rate < 0.99
  severity: Warning
  message: "Job {{ $labels.job_type }} success rate {{ $value }}%"

- name: Stuck-Job-Detected
  condition: job_running_duration > 300
  severity: Warning
  message: "Job {{ $labels.job_id }} running for {{ $value }}s"
```

## DLQ Management

```typescript
// DLQ replay API
async function replayJob(jobId: string): Promise<void> {
  const job = await dlqStore.get(jobId);
  if (!job) throw new Error(`Job ${jobId} not found in DLQ`);
  await queue.enqueue(job);
  await dlqStore.markReplayed(jobId);
}

// DLQ bulk replay (all, by type, by date)
async function replayAll(type?: string): Promise<number> {
  const jobs = await dlqStore.list({ jobType: type });
  for (const job of jobs) {
    await queue.enqueue(job);
  }
  await dlqStore.markAllReplayed(jobs.map(j => j.id));
  return jobs.length;
}
```

## Debugging Stuck Jobs

```typescript
// Health check endpoint for stuck job detection
async function checkStuckJobs(): Promise<StuckJob[]> {
  const running = await queue.listRunning();
  const stuck = running.filter(job => {
    const elapsed = Date.now() - new Date(job.startedAt).getTime();
    return elapsed > job.timeout * 3;
  });

  for (const job of stuck) {
    logger.error('Stuck job detected', {
      jobId: job.id,
      type: job.type,
      elapsed: Date.now() - new Date(job.startedAt).getTime(),
      workerId: job.workerId,
    });
  }
  return stuck;
}
```

## Job Lifecycle Dashboard

```
Queue: [default: 342] [priority-high: 12] [dead-letter: 3]

Job Type       | 5m Rate | Success | p50 Duration | p99 Duration | Queue Depth
-------------- | ------- | ------- | ------------ | ------------ | -----------
send-email     | 245/min | 99.8%   | 350ms        | 2.1s         | 1,234
generate-report| 3/min   | 98.5%   | 45s          | 120s         | 12
process-payment| 50/min  | 99.9%   | 1.2s         | 5.3s         | 89
sync-external  | 12/min  | 95.0%   | 8.1s         | 30s          | 45

Worker Status: [8/10 active] [2 saturated] [0 idle]
```
