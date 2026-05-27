---
name: backend-scheduling-cron
description: >
  Use this skill when the user says 'cron', 'schedule', 'scheduled task', 'cron job', 'job scheduling', 'distributed cron', 'cron expression', 'timezone', 'scheduler', 'background job', 'periodic task', 'interval', 'cron trigger'. This skill implements distributed cron and job scheduling with timezone-aware triggers and leader election. Applies to any backend stack. Do NOT use for: message queue consumers, event-driven processing, or workflow orchestration.
version: "1.0.0"
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
Implement distributed cron jobs and scheduled tasks with timezone awareness, leader election, and failure recovery so periodic work runs exactly-once across the cluster.

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
Provider: {built-in|distributed- scheduler|external}
```

### Completion Criteria
- [ ] Cron expression validated.
- [ ] Exactly-once execution guaranteed in multi-instance deployment.
- [ ] Timezone handling correct — DST transitions mapped.
- [ ] Error handling and retry configured.
- [ ] Monitoring and alerting for missed executions.

### Max Response Length
3 lines per job. 15 lines for full setup.

## Workflow

### Step 1: Define Job
```javascript
const job = {
  name: 'invoice-dunning',
  schedule: '0 8 * * 1-5',   // Weekdays at 8:00
  timezone: 'America/New_York',
  handler: async () => { await sendInvoiceReminders(); },
};
```

### Step 2: Ensure Exactly-Once Execution (Distributed)
Use distributed locking or leader election:
```javascript
// Option A: Distributed lock (Redis)
const lock = await redlock.acquire(['cron:invoice-dunning'], 60000);
try { await job.handler(); } finally { await lock.release(); }

// Option B: Database lease (PostgreSQL)
SELECT pg_advisory_xact_lock(hashtext('cron:invoice-dunning'));
```

### Step 3: Handle Timezones and DST
```javascript
const { DateTime } = require('luxon');
const now = DateTime.now().setZone('America/New_York');
// Cron library with timezone support: cron-parser + moment-timezone
```

### Step 4: Retry Failed Jobs
```javascript
async function executeWithRetry(job, maxAttempts = 3) {
  for (let i = 0; i < maxAttempts; i++) {
    try { return await job.handler(); } catch (err) {
      logger.error({ job: job.name, attempt: i }, 'Job failed');
      if (i < maxAttempts - 1) await delay(5000 * Math.pow(2, i));
    }
  }
  await alertOncall({ job: job.name, error: 'Max retries exceeded' });
}
```

### Step 5: Monitor Jobs
Expose metrics: `job.duration`, `job.success`, `job.failure`, `job.last-run-timestamp`. Alert on: no run in expected window.

## Rules
- Always specify timezone explicitly — never rely on server timezone.
- Use distributed locking to prevent duplicate execution — no cron runs twice.
- Never assume the cron host is the only instance.
- Log every job execution start, end, and failure with duration.
- Set a deadline/execution timeout for every job.
- Missed executions should alert, not silently fail.
- Jobs must be idempotent — they can be retried at any time.

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
