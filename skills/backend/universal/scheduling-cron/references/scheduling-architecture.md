# Scheduling Architecture

## Scheduling Patterns

| Pattern | Description | Use Case | Example |
|---------|-------------|----------|---------|
| Fixed Rate | Run every N milliseconds | Regular polling | Health check every 30s |
| Cron Schedule | Run at specific times | Time-based jobs | Invoice dunning at 8 AM weekdays |
| Delayed Execution | Run once after N delay | Future processing | Send reminder 24h after registration |
| Calendar Schedule | Run on specific dates | Date-based events | Birthday emails, subscription renewals |
| Interval Schedule | Run every N time units | Repetitive tasks | Data sync every 15 minutes |
| Dynamic Schedule | Schedule calculated at runtime | Event-based scheduling | Schedule follow-up based on SLA |

## Distributed Scheduling Architecture

```
                     ┌─────────────────────────┐
                     │    Scheduler Service     │
                     │  (leader-elected)        │
                     └────────┬────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
     ┌────────▼────┐  ┌──────▼──────┐  ┌─────▼────────┐
     │  Instance 1 │  │  Instance 2 │  │  Instance 3  │
     │  (leader)   │  │  (follower) │  │  (follower)  │
     └────────┬────┘  └──────┬──────┘  └──────┬────────┘
              │              │                │
     ┌────────▼────┐  ┌──────▼──────┐  ┌──────▼────────┐
     │   Executes  │  │   Idle      │  │   Idle        │
     │   Job A     │  │             │  │               │
     │   Job B     │  │             │  │               │
     └─────────────┘  └─────────────┘  └────────────────┘
```

## Leader Election Patterns

### PostgreSQL Advisory Lock

```typescript
class PostgresLeaderElection {
  constructor(private pool: Pool, private lockId: number) {}

  async tryAcquireLeadership(): Promise<boolean> {
    const result = await this.pool.query(
      'SELECT pg_try_advisory_lock($1) AS acquired',
      [this.lockId],
    );
    return result.rows[0].acquired;
  }

  async releaseLeadership(): Promise<void> {
    await this.pool.query(
      'SELECT pg_advisory_unlock($1)',
      [this.lockId],
    );
  }

  async runWhenLeader(job: () => Promise<void>, intervalMs: number): Promise<void> {
    const run = async () => {
      if (await this.tryAcquireLeadership()) {
        try {
          await job();
        } finally {
          await this.releaseLeadership();
        }
      }
    };

    // Run immediately, then on interval
    await run();
    setInterval(run, intervalMs);
  }
}
```

### Redis Redlock

```typescript
class RedisLeaderElection {
  constructor(
    private redlock: Redlock,
    private lockKey: string,
    private lockDurationMs: number = 30000,
  ) {}

  async executeAsLeader(job: () => Promise<void>): Promise<void> {
    const lock = await this.redlock.acquire(
      [this.lockKey],
      this.lockDurationMs,
    );

    try {
      // Periodically extend lock while job runs
      const extendInterval = setInterval(async () => {
        try {
          await lock.extend(this.lockDurationMs);
        } catch {
          clearInterval(extendInterval);
        }
      }, this.lockDurationMs / 2);

      await job();
      clearInterval(extendInterval);
    } finally {
      await lock.release().catch(() => {});
    }
  }
}
```

## Job Store Schema

```sql
CREATE TABLE scheduled_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(200) NOT NULL UNIQUE,
  job_type        VARCHAR(100) NOT NULL,
  cron_expression VARCHAR(50) NOT NULL,
  timezone        VARCHAR(50) NOT NULL DEFAULT 'UTC',
  enabled         BOOLEAN NOT NULL DEFAULT true,
  handler         VARCHAR(200) NOT NULL,   -- Handler class/function name
  config          JSONB NOT NULL DEFAULT '{}',
  max_retries     INTEGER NOT NULL DEFAULT 3,
  timeout_seconds INTEGER NOT NULL DEFAULT 300,

  -- Execution tracking
  last_run_at     TIMESTAMPTZ,
  last_run_status VARCHAR(20),   -- success, failed, running
  last_error      TEXT,
  next_run_at     TIMESTAMPTZ NOT NULL,
  run_count       INTEGER NOT NULL DEFAULT 0,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_jobs_next_run ON scheduled_jobs(next_run_at)
  WHERE enabled = true;
CREATE INDEX idx_jobs_status ON scheduled_jobs(last_run_status);
```

## Job Execution Lifecycle

```yaml
states:
  - SCHEDULED: "Waiting for next run time"
  - RUNNING: "Currently executing on leader instance"
  - COMPLETED: "Executed successfully"
  - FAILED: "Execution failed, retry pending"
  - RETRYING: "Retry attempt in progress"
  - DEAD: "Max retries exceeded, manual intervention needed"
  - SKIPPED: "Skipped due to concurrency policy"

transitions:
  SCHEDULED → RUNNING: "Cron trigger fires, leader acquires lock"
  RUNNING → COMPLETED: "Job handler returns successfully"
  RUNNING → FAILED: "Job handler throws error"
  FAILED → RETRYING: "Retry delay elapsed"
  RETRYING → COMPLETED: "Retry succeeds"
  RETRYING → DEAD: "Max retries exhausted"
  FAILED → SCHEDULED: "Next scheduled occurrence"
  DEAD → SCHEDULED: "Manual re-enable"
```

## Job Distribution Strategies

| Strategy | Description | Best For | Trade-off |
|----------|-------------|----------|-----------|
| Single leader | One instance runs all jobs | Simple, low volume | Single point of failure |
| Sharded by job type | Each instance claims specific jobs | Medium volume, many job types | Complex rebalancing on failure |
| Dynamic assignment | Instances compete for individual job runs | High volume, many instances | Overhead of leader election per job |
| Consistent hashing | Jobs assigned by hash to instances | Large scale, predictable assignment | Reassignment on topology change |

## Dynamic Assignment with Redis

```typescript
class DynamicJobAssigner {
  constructor(private redis: Redis) {}

  async tryAssignJob(jobId: string, instanceId: string, ttlMs: number): Promise<boolean> {
    // SET NX — only one instance can claim this job
    const assigned = await this.redis.set(
      `job:assign:${jobId}`,
      instanceId,
      'NX',
      'PX',
      ttlMs,
    );
    return assigned !== null;
  }

  async releaseJob(jobId: string, instanceId: string): Promise<void> {
    // Lua script — atomic check-and-delete
    const script = `
      if redis.call('GET', KEYS[1]) == ARGV[1] then
        return redis.call('DEL', KEYS[1])
      end
      return 0
    `;
    await this.redis.eval(script, 1, `job:assign:${jobId}`, instanceId);
  }

  async heartbeat(jobId: string, instanceId: string, ttlMs: number): Promise<void> {
    await this.redis.psetex(`job:assign:${jobId}`, ttlMs, instanceId);
  }
}
```

## Scheduling Backend Comparison

| Backend | Precision | Durability | Scalability | Complexity |
|---------|-----------|------------|-------------|------------|
| In-memory (setInterval) | Milliseconds | None (lose on restart) | Single node | Low |
| PostgreSQL (pg_timetable) | Seconds | High (transactional) | Horizontal read | Medium |
| Redis (Redisson) | Milliseconds | Medium (persistence config) | Horizontal | Medium |
| SQS/Scheduler | Minutes | High (AWS managed) | Infinite | Low (managed) |
| Quartz (Java) | Seconds | High (JDBC store) | Clustered | High |
| hangfire (.NET) | Seconds | High (SQL Server) | Clustered | Medium |
| Sidekiq/Cron (Ruby) | Seconds | High (Redis) | Horizontal | Medium |
