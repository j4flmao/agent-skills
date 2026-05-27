# Request Queuing and Prioritization

When requests exceed rate limits, queuing provides a graceful alternative to immediate rejection.

## Queue with Prioritization

```typescript
interface QueuedRequest {
  id: string;
  priority: number; // lower = higher priority
  timestamp: Date;
  execute: () => Promise<any>;
}

class RequestQueue {
  private queue: QueuedRequest[] = [];

  enqueue(request: QueuedRequest): void {
    // Insert sorted by priority, then FIFO within same priority
    const idx = this.queue.findIndex(
      r => r.priority > request.priority ||
        (r.priority === request.priority && r.timestamp > request.timestamp)
    );
    if (idx === -1) {
      this.queue.push(request);
    } else {
      this.queue.splice(idx, 0, request);
    }
  }

  dequeue(): QueuedRequest | undefined {
    return this.queue.shift();
  }

  get length(): number { return this.queue.length; }
}
```

## Priority Tiers

Map request types to priority levels:

```typescript
const PRIORITY = {
  CRITICAL: 0,  // payment, account deletion
  HIGH: 1,      // checkout, order placement
  NORMAL: 2,    // search, browse
  LOW: 3,       // analytics, background sync
  BULK: 4,      // batch operations, imports
};

function getPriority(request: Request): number {
  if (request.path.startsWith('/payments')) return PRIORITY.CRITICAL;
  if (request.path.startsWith('/checkout')) return PRIORITY.HIGH;
  if (request.path.startsWith('/search')) return PRIORITY.NORMAL;
  return PRIORITY.LOW;
}
```

## Token Bucket with Queue

Instead of dropping excess requests, queue them:

```typescript
class TokenBucketWithQueue {
  private queue = new RequestQueue();

  async consume(key: string, cost: number = 1): Promise<boolean> {
    if (this.tokens >= cost) {
      this.tokens -= cost;
      return true; // immediate grant
    }

    // Queue the request with deadline
    return new Promise((resolve) => {
      this.queue.enqueue({
        id: uuid(),
        priority: getPriority(currentRequest),
        timestamp: new Date(),
        execute: async () => {
          // Wait until tokens available
          await this.waitForTokens(cost);
          resolve(true);
        },
      });
      // Set max queue wait time
      setTimeout(() => resolve(false), this.maxQueueWaitMs);
    });
  }

  private async waitForTokens(cost: number): Promise<void> {
    while (this.tokens < cost) {
      await sleep(100); // poll or use event-based
    }
    this.tokens -= cost;
  }
}
```

## Fair Queue Scheduling

Prevent starvation of low-priority requests:

```typescript
class FairScheduler {
  private queues = new Map<string, RequestQueue>();
  private quantum = 5; // max requests per round per queue

  schedule(): void {
    for (const [key, queue] of this.queues) {
      for (let i = 0; i < this.quantum; i++) {
        const request = queue.dequeue();
        if (!request) break;
        this.process(request);
      }
    }
  }
}
```

## Backpressure Signals

Communicate queue state to upstream callers:

```typescript
const queueMetrics = {
  'X-Queue-Depth': queue.length.toString(),
  'X-Queue-Wait-Ms': estimatedWaitTime.toString(),
  'X-Queue-Priority': currentPriority.toString(),
};

// Response with queue position
if (queued) {
  return {
    status: 202,
    headers: { 'Retry-After': '5', ...queueMetrics },
    body: { status: 'queued', position: queue.length, estimatedWaitMs: 5000 },
  };
}
```

## Dead Letter Queue

Requests that exceed max queue time or fail processing:

```typescript
async function processWithDLQ(request: QueuedRequest): Promise<void> {
  try {
    const result = await Promise.race([
      request.execute(),
      timeout(request.maxWaitMs),
    ]);
    await notifyClient(request.id, result);
  } catch (err) {
    await deadLetterStore.save({
      requestId: request.id,
      payload: request,
      error: err.message,
      timestamp: new Date(),
    });
    await notifyClient(request.id, { status: 'timed_out' });
  }
}
```

## Key Points
- Sort queued requests by priority, then FIFO within priority
- Define clear priority tiers (critical > high > normal > low > bulk)
- Use fair scheduling to prevent low-priority starvation
- Expose queue depth and estimated wait time via headers
- Set max queue wait time — requests exceeding it get 429/503
- Use dead letter queue for requests that failed while queued
- Log all queue operations for observability
