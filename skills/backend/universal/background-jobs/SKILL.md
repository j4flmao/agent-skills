---
name: backend-background-jobs
description: >
  Use this skill when designing background job processing, task queues, or worker systems. This skill enforces: job idempotency, retry with exponential backoff, queue topology with dead letter, and worker concurrency controls. Applies to any backend stack with Redis/SQS/DB-backed queues. Do NOT use for: event streaming (Kafka), real-time pub/sub, or synchronous request processing.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, jobs, phase-6, universal]
---

# Backend Background Jobs

## Purpose
Design reliable background job processing with queue topology, retry, and monitoring.

## Agent Protocol

### Trigger
Exact user phrases: "background job", "task queue", "worker", "job processing", "cron job", "scheduled task", "async task", "job retry", "queue worker", "Sidekiq", "Celery", "Bull", "delayed job", "job priority", "job scheduling".

### Input Context
Before activating, verify:
- Job types (fire-and-forget, delayed execution, scheduled recurring, synchronous fallback)
- Queue backend (Redis, SQS, database table, RabbitMQ)
- Job duration (seconds, minutes, hours — affects concurrency and timeout)
- Retry requirements (max retries, retry interval, irrecoverable failure definition)

### Output Artifact
Job and worker design as formatted text.

### Response Format
```typescript
// Job contract (interface/type)
// Worker implementation outline
```
```yaml
# Queue topology config
# Retry policy
# Concurrency rules
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Job defined with idempotency key and full payload schema
- [ ] Retry strategy with exponential backoff and jitter configured
- [ ] Queue topology defined (default, priority, dead letter, scheduling queues)
- [ ] Worker concurrency and graceful shutdown configured
- [ ] Monitoring hooks for success/failure/metrics
- [ ] Scheduled/cron jobs defined with timezone and error notification

### Max Response Length
250 lines of code and configuration.

## Workflow

### Step 1: Job Classification
Classify each job into one of: fire-and-forget (no callback, best-effort delivery), delayed (execute after N seconds/minutes), scheduled (cron expression, recurring), or recurring (fixed interval like every 5 minutes). Choose queue backend: Redis for high-throughput sub-minute jobs, SQS for AWS-native durability, database table for transactional consistency with the OLTP store.

### Step 2: Queue Topology
Define queues: `default` for standard jobs, `priority-{high|medium|low}` for priority tiers, `scheduling` for delayed/scheduled jobs, `dead-letter` for exhausted retries. Configure queue cardinality: one default queue per service, one DLQ per default queue. Set TTL on messages: 24 hours for default, 7 days for DLQ.

### Step 3: Job Contract
Every job includes: `id` (UUIDv7), `type` (string discriminator), `payload` (JSON object), `retryCount` (current attempt, starts at 0), `maxRetries` (max attempts before DLQ), `priority` (high/medium/low), `scheduledAt` (ISO 8601 for delayed execution), `idempotencyKey` (unique key for deduplication). Payload is validated against schema on enqueue.

### Step 4: Retry and Error Handling
Exponential backoff: `delay = min(baseDelay * 2^retryCount + jitter, maxDelay)`. Base delay: 1 second. Max delay: 6 hours. Jitter: random ±25%. Max retries: 5 for transient errors, up to 25 for network-dependent jobs. After exhaustion: move to DLQ with original payload, error history, and stack trace. DLQ alerts trigger on message receipt.

### Step 5: Worker Configuration
Concurrency: N workers per queue where N = queue throughput / average job duration. Prefetch count: 1 for long jobs, 5-10 for short jobs. Graceful shutdown: intercept SIGTERM, stop accepting new jobs, wait for running jobs with timeout (30s), kill stale workers. Use connection pooling for queue backend.

### Step 6: Monitoring
Track: job success rate, failure rate by error type, queue depth, DLQ depth, average job duration, worker pool utilization, stuck jobs (running > 5x expected duration). Alerts: queue depth > 10000, DLQ receives message, job success rate < 99%, worker pool saturation > 90%.

## Rules
- Every job is idempotent — same payload processed twice produces same result
- Job TTL set to prevent stale data processing (24h default, 7d DLQ)
- Workers gracefully drain on shutdown with 30s timeout
- Job payload is JSON-serializable, no circular refs
- Queue depth monitored and alerted at threshold
- Scheduled jobs are cron-expressed in UTC with documented timezone

## References
- `references/job-queue-patterns.md` — Queue topology, retry strategies, DLQ, concurrency patterns
- `references/scheduled-tasks.md` — Cron expressions, interval scheduling, calendar-based schedules

## Handoff
`backend-event-driven` for job completion events and chained workflows
