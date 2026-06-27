---
name: backend-scheduling-cron
description: >
  Use this skill when the user says 'cron', 'schedule', 'scheduled task', 'cron job', 'job scheduling', 'distributed cron', 'cron expression', 'timezone', 'scheduler', 'background job', 'periodic task', 'interval', 'cron trigger'. This skill implements distributed cron and job scheduling with timezone-aware triggers and leader election. Applies to any backend stack. Do NOT use for: message queue consumers, event-driven processing, or workflow orchestration.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, universal, scheduling, cron, jobs, distributed-cron]
---

# Backend Scheduling and Cron

## Purpose
Implement distributed cron jobs and scheduled tasks with timezone awareness, leader election, and failure recovery so periodic work runs exactly-once across the cluster. Without distributed coordination, cron jobs on multiple instances cause duplicate execution, data corruption, and resource waste.

## Agent Protocol

### Trigger
Exact user phrases: "cron", "schedule", "scheduled task", "cron job", "job scheduling", "distributed cron", "cron expression", "timezone", "scheduler", "background job", "periodic task", "cron trigger".

### Input Context
- Job definitions and their schedule (cron expressions).
- Distributed environment (Kubernetes, multi-instance).
- Existing infrastructure (Redis, PostgreSQL, ZooKeeper).

### Output Artifact
Cron job configuration or scheduler code. No file unless requested.

### Response Format
```
Job: {name}
Schedule: {cron expression}
Timezone: {IANA timezone}
Provider: {built-in|distributed-scheduler|external}
```

### Completion Criteria
- [ ] Cron expression validated.
- [ ] Exactly-once execution guaranteed in multi-instance deployment.
- [ ] Timezone handling correct — DST transitions mapped.
- [ ] Error handling and retry configured.
- [ ] Monitoring and alerting for missed executions.

### Max Response Length
3 lines per job. 15 lines for full setup.

## Architecture Decision Tree

### Which Scheduling Approach?

```
How many instances run the scheduler?
  ├── Single instance → Use built-in cron (OS-level or in-process)
  │   └── Risk: Single point of failure, no failover
  └── Multiple instances → Distributed scheduling required
      ├── Is the job is critical and must always run?
      │   ├── Yes → Use leader election + distributed lock
      │   └── No → Use low-priority scheduler with best-effort
      └── Do you need complex workflows or dependencies?
          ├── Yes → Use dedicated scheduler (Temporal, Airflow, Quartz)
          └── No → Simple distributed cron is sufficient
```

### Distributed Lock Strategy

```
What infrastructure is available?
  ├── Redis → SET NX with TTL for lock, Lua for atomic operations
  │   ├── PRO: Fast, built-in TTL, simple
  │   └── CON: Lock expiration on Redis failover
  ├── PostgreSQL → Advisory locks or row-level locks
  │   ├── PRO: Same DB as data, no extra infra
  │   └── CON: Lock contention impacts DB performance
  ├── ZooKeeper/etcd → Ephemeral znodes for leader election
  │   ├── PRO: Strong consistency, automatic lease renewal
  │   └── CON: Operational complexity, extra infra
  └── Kubernetes → CronJob resource (native)
      ├── PRO: No code needed, self-healing
      └── CON: No intra-job coordination, at-most-once
```

### Cron Expression Complexity

```
What schedule do you need?
  ├── Simple interval (every N minutes/hours) → Use "every" syntax
  │   └── @every 5m, @hourly, @daily
  ├── Fixed time (daily at 2am) → Standard cron expression
  │   └── 0 2 * * *
  ├── Complex schedule (weekdays at 8am and 5pm) → Multi-expression
  │   └── 0 8 * * 1-5 / 0 17 * * 1-5
  └── Calendar-aware (last day of month, first weekday) → Use cron extensions
      └── 0 8 L * * (Last day of month)
```

## Workflow

### Step 1: Define Job
```javascript
const jobs = [
  {
    name: 'invoice-dunning',
    schedule: '0 8 * * 1-5',   // Weekdays at 8:00
    timezone: 'America/New_York',
    handler: async () => { await sendInvoiceReminders(); },
    timeout: '5m',
    retry: { maxAttempts: 3, backoff: 'exponential' },
  },
  {
    name: 'db-cleanup',
    schedule: '@daily',
    timezone: 'UTC',
    handler: async () => { await cleanupOldRecords(); },
    timeout: '30m',
    retry: { maxAttempts: 1 },
  },
];
```

### Step 2: Ensure Exactly-Once Execution (Distributed)
```typescript
// Option A: Distributed lock (Redis)
class DistributedCron {
  constructor(private redis: Redis, private lockTTL: number = 60000) {}

  async execute(job: Job): Promise<void> {
    const lockKey = `cron:lock:${job.name}`;
    const lockToken = crypto.randomUUID();
    const acquired = await this.redis.set(lockKey, lockToken, {
      NX: true,
      PX: this.lockTTL,
    });
    if (!acquired) {
      logger.info(`Job ${job.name} already running on another instance`);
      return;
    }
    try {
      const startTime = Date.now();
      logger.info(`Job ${job.name} started`);
      await job.handler();
      logger.info(`Job ${job.name} completed in ${Date.now() - startTime}ms`);
    } catch (error) {
      logger.error(`Job ${job.name} failed`, { error });
      throw error;
    } finally {
      // Only release if we still hold the lock
      const lua = `if redis.call("get",KEYS[1]) == ARGV[1] then return redis.call("del",KEYS[1]) else return 0 end`;
      await this.redis.eval(lua, 1, lockKey, lockToken);
    }
  }
}

// Option B: PostgreSQL advisory lock
async function executeWithPgLock(job: Job): Promise<void> {
  const lockId = hashString(`cron:${job.name}`);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const client = await pool.connect();
  try {
    // Session-level advisory lock — auto-released on disconnect
    await client.query('SELECT pg_advisory_lock($1)', [lockId]);
    logger.info(`Job ${job.name} started`);
    await job.handler();
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [lockId]);
    client.release();
  }
}

// Option C: Kubernetes CronJob
// apiVersion: batch/v1
// kind: CronJob
// spec:
//   schedule: "0 8 * * 1-5"
//   jobTemplate:
//     spec:
//       template:
//         spec:
//           containers:
//           - name: invoice-dunning
//             image: myapp:latest
//             command: ["node", "dist/jobs/invoice-dunning.js"]
//           restartPolicy: OnFailure
```

### Step 3: Handle Timezones and DST
```typescript
import { DateTime } from 'luxon';

function isDue(job: Job, lastRun: Date | null): boolean {
  const now = DateTime.now().setZone(job.timezone);
  const cronParts = job.schedule.split(' ');
  const [minute, hour, dayOfMonth, month, dayOfWeek] = cronParts;

  // Check if current time matches cron expression
  if (minute !== '*' && parseInt(minute) !== now.minute) return false;
  if (hour !== '*' && parseInt(hour) !== now.hour) return false;
  if (dayOfMonth !== '*' && parseInt(dayOfMonth) !== now.day) return false;
  if (month !== '*' && parseInt(month) !== now.month) return false;
  if (dayOfWeek !== '*') {
    const dow = now.weekday === 7 ? 0 : now.weekday;
    if (!dayOfWeek.split(',').map(Number).includes(dow)) return false;
  }

  // DST safety: check if we already ran during this minute
  if (lastRun) {
    const lastRunInTz = DateTime.fromJSDate(lastRun).setZone(job.timezone);
    if (lastRunInTz.toMillis() >= now.toMillis() - 60000) return false;
  }
  return true;
}

// DST transition handling
// Spring forward: 2am becomes 3am — job at 2:30am is skipped
// Fall back: 1am happens twice — job at 1:30am runs once
function handleDSTTransition(job: Job): boolean {
  const now = DateTime.now().setZone(job.timezone);
  // Detect if this is a DST repeat hour (fall back)
  if (now.hour === now.hour && now.offset !== now.offset) {
    // Only run once during the repeated hour
    return false;
  }
  return true;
}
```

### Step 4: Retry Failed Jobs
```typescript
class JobRunner {
  async executeWithRetry(job: Job): Promise<void> {
    for (let attempt = 1; attempt <= (job.retry?.maxAttempts ?? 1); attempt++) {
      try {
        const result = await withTimeout(job.handler(), job.timeout ?? '5m');
        logger.info({ job: job.name, attempt }, 'Job completed');
        return;
      } catch (error) {
        logger.error({ job: job.name, attempt, error }, 'Job attempt failed');
        if (attempt < (job.retry?.maxAttempts ?? 1)) {
          const delay = Math.pow(2, attempt) * 5000; // 10s, 20s, 40s, ...
          await sleep(delay);
        }
      }
    }
    await this.alertOncall({ job: job.name, error: `Failed after ${job.retry?.maxAttempts} attempts` });
  }
}
```

### Step 5: Monitor Jobs
```typescript
// Expose metrics for every job
interface JobMetrics {
  duration: number;        // Execution time in ms
  success: boolean;        // Did it complete successfully?
  lastRun: number;         // Timestamp of last execution
  nextRun: number;         // Timestamp of next scheduled execution
  missCount: number;       // How many times was it missed?
}

// Alert rules
// - No completion in expected window + 5min → PAGER
// - Failure rate > 10% over 24h → TICKET
// - Job duration > 2x average → WARN
// - Missed executions > 0 → WARN
```

## Implementation Patterns

### Dynamic Job Registration
```typescript
class JobRegistry {
  private jobs = new Map<string, Job>();
  private scheduler: DistributedScheduler;

  register(job: Job): void {
    this.jobs.set(job.name, job);
    logger.info(`Registered job: ${job.name} [${job.schedule}]`);
  }

  registerFromModule(modulePath: string): void {
    const module = require(modulePath);
    if (module.jobs) {
      module.jobs.forEach((job: Job) => this.register(job));
    }
  }

  async start(): Promise<void> {
    for (const job of this.jobs.values()) {
      await this.scheduler.schedule(job);
    }
  }
}
```

### Cron Expression Reference
```
┌───────────── minute (0-59)
│ ┌───────────── hour (0-23)
│ │ ┌───────────── day of month (1-31)
│ │ │ ┌───────────── month (1-12)
│ │ │ │ ┌───────────── day of week (0-6, 0=Sun)
│ │ │ │ │
* * * * *

Common expressions:
  */5 * * * *    → Every 5 minutes
  0 * * * *      → Every hour at :00
  0 8 * * *      → Daily at 8:00 AM
  0 8 * * 1-5    → Weekdays at 8:00 AM
  0 0 1 * *      → 1st of every month
  0 */2 * * *    → Every 2 hours
  30 6 * * 0     → Sundays at 6:30 AM
  0 0 * * 0       → Every Sunday at midnight
  @reboot        → On startup (once)
  @yearly        → 0 0 1 1 *
  @daily         → 0 0 * * *
  @hourly        → 0 * * * *
```

## Production Considerations

### Scheduler Platform Comparison
| Platform | Approach | HA | Exactness | Best For |
|----------|----------|----|-----------|----------|
| Linux cron | OS-level | Single node | Minute | Simple, single-node |
| Kubernetes CronJob | K8s-native | Multi-node | At-least-once | K8s workloads |
| Quartz (Java) | DB-backed | Multi-node | Exactly-once | Java ecosystem |
| Temporal | Workflow engine | Multi-node | Exactly-once | Complex workflows |
| Airflow | DAG scheduler | Multi-node | At-least-once | Data pipelines |
| Bull (Node.js) | Redis-backed | Multi-node | At-least-once | Node.js apps |

### Failure Modes
| Failure | Effect | Mitigation |
|---------|--------|------------|
| Lock holder crashes | Job not executed | Lock TTL triggers failover |
| Clock skew | Early/late execution | NTP + tolerance window |
| DST transition | Double run or skip | Idempotent job design |
| Node overload | Delayed execution | Priority queues |
| DB contention | Lock wait timeout | Reduce lock scope |

### Graceful Degradation
- If lock acquisition fails: log, skip execution, alert if consecutive misses > threshold
- If job handler throws: retry according to policy, then alert
- If scheduler process restarts: check last execution time, catch up missed runs
- If all nodes restart simultaneously: verify at most one runs the missed job

## Anti-Patterns

1. **Non-idempotent jobs**: If a job runs twice due to a failure, it must produce the same result. Always design jobs to be idempotent.
2. **No timeout**: A job that hangs forever blocks the scheduler. Always set execution timeout.
3. **Server-local timezone**: Relying on the server timezone for scheduling causes DST bugs. Always specify timezone explicitly.
4. **Single-instance cron**: Running cron on a single instance creates a SPOF. Use distributed locking.
5. **Missing monitoring**: A job that silently fails is worse than no job at all. Monitor every execution.
6. **Tight coupling**: Embedding business logic directly in a cron handler makes testing hard. Cron should call service methods.
7. **Overlapping executions**: If a long-running job overlaps with its next schedule, both run concurrently. Prevent with lock timeout > max expected duration.

## Performance

### Execution Overhead
| Component | Latency | Notes |
|-----------|---------|-------|
| Cron expression parsing | <1ms | Cached after first parse |
| Lock acquisition (Redis) | ~1-5ms | Network round-trip |
| Lock acquisition (PostgreSQL) | ~1ms | In-DB advisory lock |
| Job handler | Varies | Business logic |
| Metric recording | <1ms | In-process counter |

### Scheduler Throughput
- Single scheduler process: 1000+ jobs per second (schedule evaluation)
- Distributed lock overhead: ~5ms per job execution
- PostgreSQL advisory lock: ~2ms per lock/unlock cycle

## Rules
- Always specify timezone explicitly — never rely on server timezone.
- Use distributed locking to prevent duplicate execution — no cron runs twice.
- Never assume the cron host is the only instance.
- Log every job execution start, end, and failure with duration.
- Set a deadline/execution timeout for every job.
- Missed executions should alert, not silently fail.
- Jobs must be idempotent — they can be retried at any time.
- Monitor job duration, success rate, and last-execution timestamp.
- Always specify explicit timezone for every job definition.

## References
  - references/cron-expression-guide.md — Cron Expression Guide
  - references/distributed-cron.md — Distributed Cron
  - references/job-monitoring.md — Job Monitoring and Management
  - references/scheduler-implementation.md — Scheduling and Cron Patterns
  - references/scheduling-architecture.md — Scheduling Architecture
  - references/scheduling-monitoring.md — Scheduling Monitoring
  - references/scheduling-patterns.md — Scheduling Patterns
  - references/scheduling-security.md — Scheduling Security
## Handoff
No artifact produced unless requested.
Next skill: multi-tenancy — segregate data for different tenants using the scheduled jobs.
Carry forward: job definitions, cron expressions, lock provider.
## Implementation Patterns

### Observer Pattern for Event Handling
`
interface EventObserver<T> {
  onEvent(event: T): Promise<void>;
}

class EventBus<T> {
  private observers: Set<EventObserver<T>> = new Set();
  subscribe(observer: EventObserver<T>): void {
    this.observers.add(observer);
  }
  unsubscribe(observer: EventObserver<T>): void {
    this.observers.delete(observer);
  }
  async emit(event: T): Promise<void> {
    const results = Array.from(this.observers).map(o => o.onEvent(event));
    await Promise.allSettled(results);
  }
}
`

### Configuration-Driven Approach
`
config:
  defaults:
    timeout: 30s
    retryCount: 3
  overrides:
    production:
      timeout: 60s
      retryCount: 5
    development:
      timeout: 300s
      retryCount: 1
`

## Production Considerations

### Deployment Checklist
- [ ] Configuration validated against schema before startup
- [ ] Health check endpoints registered and monitored
- [ ] Graceful shutdown with draining period (30s timeout)
- [ ] Resource limits configured (CPU, memory, file descriptors)
- [ ] Log level set appropriate for environment
- [ ] Metrics endpoint secured and exposed
- [ ] Rate limiting configured per-tier
- [ ] TLS certificates valid and auto-renewing
- [ ] Database migrations run as separate deployment step
- [ ] Feature flags ready for gradual rollout

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% over 5min | Critical | Page on-call |
| p99 latency | > 2s over 5min | Warning | Investigate |
| Throughput drop | > 50% over 1min | Critical | Check upstream |
| Queue depth | > 1000 over 1min | Warning | Scale consumers |
| Disk usage | > 85% | Warning | Clean or expand |
| Memory usage | > 90% heap | Critical | Restart or scale |

## Anti-Patterns

| Anti-Pattern | Symptom | Root Cause | Solution |
|-------------|---------|------------|----------|
| Premature optimization | Complex code for no measured benefit | Guessing instead of profiling | Measure first, optimize based on data |
| Copy-paste reuse | Duplicate code across codebase | Lack of abstraction | Extract shared logic into libraries |
| Gold-plating | Features with no current requirement | Over-engineering | YAGNI — build what's needed now |
| Magical thinking | Assumptions without validation | Skipping error handling | Handle all failure modes explicitly |

## Performance Optimization

### Caching Strategy
Cache hierarchy: L1 (in-memory local) → L2 (distributed Redis/Memcached) → L3 (CDN/Edge).
Cache invalidation: TTL-based (simple, stale), event-based (complex, fresh), write-through (consistent, higher write latency), write-behind (fast writes, eventual consistency).

### Resource Pooling
- Database connections: Pool of reusable connections (HikariCP, pgBouncer)
- HTTP connections: Keep-alive + connection pooling for external calls
- Thread pool: Bounded thread pools for async task execution

### Profiling Methodology
1. Establish baseline with production traffic profile
2. Profile CPU with sampling profiler (pprof, perf, async-profiler)
3. Profile memory with heap dumps and allocation tracking
4. Profile I/O with strace/perf trace for syscall analysis
5. Profile latency with distributed tracing (OpenTelemetry)
6. Identify bottleneck, formulate hypothesis, implement fix
7. Re-profile to verify improvement, repeat

## Security Considerations

### Threat Modeling (STRIDE)
- Spoofing: Identity validation, authentication
- Tampering: Integrity checks, digital signatures
- Repudiation: Audit logs, non-repudiation
- Information disclosure: Encryption, access control
- Denial of service: Rate limiting, resource quotas
- Elevation of privilege: Principle of least privilege

### Supply Chain Security
- Dependency scanning: Snyk, Dependabot, Trivy
- SBOM generation: CycloneDX or SPDX format
- Signed commits: GPG or SSH commit signing
- Artifact verification: Checksum validation, signature verification

### Secrets Management
- Secrets never in code — always in secrets manager (Vault, AWS Secrets Manager)
- Rotation policy: Rotate database credentials every 90 days
- Access audit: Log every secrets access, alert on anomalies
- Encryption at rest and in transit for all secrets
- Principle of least privilege: each service gets only its own secrets

## Rules
- Default-deny security posture — allow only explicitly required access.
- All inputs validated, all outputs encoded, all errors handled.
- Defend in depth — multiple layers of security controls.
- Fail securely — errors default to safe behavior.
- Log security-relevant events for audit and investigation.
- Keep dependencies updated — automate vulnerability scanning.
- Design for observability from day one, not as an afterthought.
- Document all architectural decisions with rationale.
- Review code for security, performance, and correctness before merging.