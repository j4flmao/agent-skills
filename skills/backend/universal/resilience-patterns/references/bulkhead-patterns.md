# Bulkhead Patterns

## Thread Pool Isolation

Isolate thread pools per dependency group:

```java
// Java — Resilience4j bulkhead per downstream
ThreadPoolBulkheadConfig config = ThreadPoolBulkheadConfig.custom()
    .maxThreadPoolSize(4)
    .coreThreadPoolSize(2)
    .queueCapacity(20)
    .keepAliveDuration(Duration.ofMinutes(1))
    .build();

ThreadPoolBulkhead httpBulkhead = ThreadPoolBulkhead.of("http-api", config);
ThreadPoolBulkhead dbBulkhead = ThreadPoolBulkhead.of("database", config);
```

| Dependency Group | Max Threads | Queue | Reason |
|-----------------|-------------|-------|--------|
| Internal APIs | 10 | 100 | Fast, trusted |
| External APIs | 4 | 20 | Slow, unreliable |
| Database | 8 | 40 | Connection pool bound |
| Message Queue | 6 | 30 | Throughput sensitive |
| File I/O | 2 | 10 | I/O bound, slow |

## Semaphore Bulkhead

Lighter than thread pool — no context switch, but no queue:

```javascript
// Node.js — simple semaphore bulkhead
class SemaphoreBulkhead {
  constructor(maxConcurrent) {
    this.maxConcurrent = maxConcurrent;
    this.active = 0;
    this.queue = [];
  }

  async run(fn) {
    if (this.active >= this.maxConcurrent) {
      throw new Error('Bulkhead full — try again later');
    }
    this.active++;
    try { return await fn(); }
    finally { this.active--; this.drain(); }
  }
}

const dbBulkhead = new SemaphoreBulkhead(10);
const httpBulkhead = new SemaphoreBulkhead(5);
```

## Async Bulkhead (Queue)

```typescript
interface AsyncBulkheadConfig {
  maxActive: number;       // Max concurrent executions
  maxQueue: number;         // Max queued waiters
  queueTimeout: number;     // How long a task can wait in queue
}

async function withBulkhead<T>(
  config: AsyncBulkheadConfig,
  fn: () => Promise<T>
): Promise<T> {
  if (activeCount >= config.maxActive) {
    if (queueSize >= config.maxQueue) {
      throw new Error('Bulkhead queue full');
    }
    // Wait in queue with timeout
    return await queueWithTimeout(fn, config.queueTimeout);
  }
  return await executeWithTracking(fn);
}
```

## System Resource Bulkhead

```yaml
# Sidecar resource isolation (K8s)
resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: "2"
    memory: 1Gi
```

## Metrics

| Metric | What It Tracks |
|--------|---------------|
| `bulkhead_active_count` | Currently executing calls |
| `bulkhead_queue_depth` | Waiting in queue |
| `bulkhead_max_allowed` | Configured limit |
| `bulkhead_full_count` | Times bulkhead rejected a call |
| `bulkhead_queue_time` | Time spent waiting in queue |

## Anti-Patterns

- Shared thread pool for all dependencies (one slow call blocks all)
- Unlimited queue (memory exhaustion under load)
- Thread pool bulkhead for I/O heavy with low concurrency (semaphore is better)
- No monitoring on bulkhead saturation (miss capacity planning signals)
- Too many thread pools (oversubscription, context switching overhead)
