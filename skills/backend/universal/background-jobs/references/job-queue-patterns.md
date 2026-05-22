# Job Queue Patterns

## Queue Topology
```
default queue       → processes standard jobs
priority-high       → time-sensitive jobs (immediate processing)
priority-medium     → standard priority
priority-low        → batch/background (process when idle)
scheduling queue    → delayed/cron-triggered jobs
dead-letter queue   → failed jobs after retry exhaustion
```

## Retry Strategy
```
delay = min(1s * 2^retryCount + random(-25%, +25%), 6h)
maxRetries:
  - Transient errors (network, timeout): 5
  - Dependent services (API call): 10
  - Data processing (reconciliation): 25
```

## Dead Letter Queue
- DLQ per priority queue
- Store original payload + error history
- TTL: 7 days
- Alert on any DLQ enqueue
- Manual replay or discard via admin UI

## Concurrency
- Long jobs (>30s): prefetch=1, concurrency=CPU cores
- Short jobs (<1s): prefetch=10, concurrency=CPU cores*4
- Mixed: separate queues per duration class

## Graceful Shutdown
```typescript
process.on('SIGTERM', async () => {
  await worker.stopAcceptingJobs();
  await worker.drain(30_000); // wait 30s max
  process.exit(0);
});
```
