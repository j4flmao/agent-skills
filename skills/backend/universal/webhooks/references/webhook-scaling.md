# Webhook Scaling

Scale webhook delivery to handle high throughput and many subscribers efficiently.

## Worker Pool Architecture

Use a pool of workers for parallel delivery:

```typescript
class WebhookWorkerPool {
  private workers: number;
  private queue: AsyncQueue<DeliveryTask>;
  private active = 0;

  constructor(workers: number = 10) {
    this.workers = workers;
    this.queue = new AsyncQueue();
  }

  async start(): Promise<void> {
    const pool = Array.from({ length: this.workers }, () => this.workerLoop());
    await Promise.all(pool);
  }

  private async workerLoop(): Promise<void> {
    while (true) {
      const task = await this.queue.dequeue();
      this.active++;
      try {
        await this.deliver(task);
      } catch (err) {
        logger.error({ taskId: task.id }, 'Delivery failed');
      } finally {
        this.active--;
      }
    }
  }

  async enqueue(subscriber: Subscriber, event: WebhookEvent): Promise<void> {
    await this.queue.enqueue({ subscriber, event, id: uuid() });
  }

  getActiveCount(): number { return this.active; }
  getQueueDepth(): number { return this.queue.size(); }
}
```

## Sharded Delivery by Subscriber

Route events to workers by subscriber ID for ordered delivery:

```typescript
class ShardedWebhookDeliverer {
  private shards: WebhookWorkerPool[];
  private shardCount: number;

  constructor(shardCount: number, workersPerShard: number) {
    this.shardCount = shardCount;
    this.shards = Array.from(
      { length: shardCount },
      () => new WebhookWorkerPool(workersPerShard)
    );
  }

  async deliver(subscriberId: string, event: WebhookEvent): Promise<void> {
    const shardIndex = this.hash(subscriberId) % this.shardCount;
    await this.shards[shardIndex].enqueue(subscriberId, event);
  }

  private hash(value: string): number {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = ((hash << 5) - hash) + value.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
}
```

## Database-Backed Queue

Persist delivery queue for reliability:

```sql
CREATE TABLE webhook_delivery_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL REFERENCES webhook_subscribers(id),
  event_type VARCHAR(200) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT
);

CREATE INDEX idx_queue_status ON webhook_delivery_queue(status, scheduled_at)
  WHERE status = 'pending';
```

## Horizontal Scaling

Scale webhook delivery across multiple nodes:

```typescript
class DistributedWebhookDeliverer {
  private nodeId: string;

  constructor(nodeId: string) {
    this.nodeId = nodeId;
  }

  async claimWork(batchSize: number = 100): Promise<DeliveryTask[]> {
    // Each node claims a batch of pending deliveries
    const tasks = await db.query(`
      UPDATE webhook_delivery_queue
      SET status = 'processing', claimed_by = $1, claimed_at = NOW()
      WHERE id IN (
        SELECT id FROM webhook_delivery_queue
        WHERE status = 'pending' AND scheduled_at <= NOW()
        ORDER BY priority DESC, created_at ASC
        LIMIT $2
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `, [this.nodeId, batchSize]);

    return tasks;
  }

  async complete(id: string): Promise<void> {
    await db.query('DELETE FROM webhook_delivery_queue WHERE id = $1', [id]);
  }

  async fail(id: string, error: string): Promise<void> {
    await db.query(`
      UPDATE webhook_delivery_queue
      SET status = 'pending', retry_count = retry_count + 1,
          last_error = $2, scheduled_at = NOW() + INTERVAL '1 minute' * POWER(2, retry_count),
          claimed_by = NULL, claimed_at = NULL
      WHERE id = $1
    `, [id, error]);
  }

  // Run on a timer
  async processLoop(): Promise<void> {
    while (true) {
      const tasks = await this.claimWork();
      if (tasks.length === 0) {
        await sleep(1000);
        continue;
      }

      await Promise.allSettled(
        tasks.map(task => this.processTask(task))
      );
    }
  }

  // Release stale claims (run periodically)
  async releaseStaleClaims(timeoutMs: number = 60000): Promise<void> {
    await db.query(`
      UPDATE webhook_delivery_queue
      SET status = 'pending', claimed_by = NULL, claimed_at = NULL
      WHERE status = 'processing' AND claimed_at < NOW() - INTERVAL '${timeoutMs} milliseconds'
    `);
  }
}
```

## Delivery Metrics

Track scaling health:

```typescript
interface ScalingMetrics {
  activeWorkers: number;
  queueDepth: number;
  processingRate: number; // events/second
  avgDeliveryLatency: number;
  claimContentionRate: number;
}

async function getScalingMetrics(): Promise<ScalingMetrics> {
  const [activeWorkers, queueDepth, processingRate, avgLatency, contentionRate] = await Promise.all([
    getActiveWorkerCount(),
    getQueueDepth(),
    getProcessingRate(),
    getAvgDeliveryLatency(),
    getClaimContentionRate(),
  ]);

  return { activeWorkers, queueDepth, processingRate, avgDeliveryLatency: avgLatency, claimContentionRate: contentionRate };
}

// Auto-scale workers based on queue depth
function autoScale(queueDepth: number): number {
  if (queueDepth > 10000) return 50;
  if (queueDepth > 1000) return 20;
  return 10;
}
```

## Key Points
- Use worker pools for parallel webhook delivery
- Shard by subscriber ID for ordered delivery within a subscriber
- Persist delivery queue in database for reliability
- Use SKIP LOCKED for horizontal scaling across nodes
- Release stale claims from crashed workers
- Track scaling metrics (queue depth, processing rate, latency)
- Auto-scale worker count based on queue depth
- Monitor claim contention rate to tune batch sizes
