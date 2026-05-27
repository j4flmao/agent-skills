# Webhook Rate Limiting

Rate limit webhook delivery to protect subscriber endpoints from overload.

## Per-Subscriber Rate Limits

Each subscriber has a delivery rate limit:

```typescript
class WebhookRateLimiter {
  private limits = new Map<string, SubscriberLimit>();

  setSubscriberLimit(subscriberId: string, maxPerSecond: number): void {
    this.limits.set(subscriberId, { maxPerSecond, tokens: maxPerSecond, lastRefill: Date.now() });
  }

  canDeliver(subscriberId: string): boolean {
    const limit = this.limits.get(subscriberId);
    if (!limit) return true; // no limit configured

    // Refill tokens
    const elapsed = (Date.now() - limit.lastRefill) / 1000;
    limit.tokens = Math.min(limit.maxPerSecond, limit.tokens + elapsed * limit.maxPerSecond);
    limit.lastRefill = Date.now();

    if (limit.tokens >= 1) {
      limit.tokens -= 1;
      return true;
    }

    return false;
  }
}
```

## Tiered Rate Limits

Different plans get different delivery limits:

```typescript
const TIER_LIMITS = {
  free:    { maxPerSecond: 10,  maxBurst: 20,  maxPending: 100 },
  pro:     { maxPerSecond: 100, maxBurst: 200, maxPending: 1000 },
  enterprise: { maxPerSecond: 1000, maxBurst: 2000, maxPending: 10000 },
};

async function enqueueWebhook(subscriber: Subscriber, event: WebhookEvent): Promise<void> {
  const tier = TIER_LIMITS[subscriber.plan] ?? TIER_LIMITS.free;

  // Check pending queue depth
  const pending = await getPendingCount(subscriber.id);
  if (pending >= tier.maxPending) {
    logger.warn({ subscriberId: subscriber.id }, 'Pending queue full — dropping event');
    await deadLetterQueue.send({ subscriber, event, reason: 'queue_full' });
    return;
  }

  await deliveryQueue.enqueue({ subscriber, event });
}
```

## Queue-Backed Delivery

Use a queue to smooth out delivery spikes:

```typescript
class QueueBackedWebhookDeliverer {
  private queue = new Map<string, WebhookEvent[]>();
  private workers = new Map<string, boolean>();

  async enqueue(subscriberId: string, event: WebhookEvent): Promise<void> {
    if (!this.queue.has(subscriberId)) {
      this.queue.set(subscriberId, []);
    }
    this.queue.get(subscriberId)!.push(event);
    this.scheduleDelivery(subscriberId);
  }

  private scheduleDelivery(subscriberId: string): void {
    if (this.workers.get(subscriberId)) return; // already processing

    this.workers.set(subscriberId, true);
    setImmediate(async () => {
      await this.deliverBatch(subscriberId);
      this.workers.set(subscriberId, false);
    });
  }

  private async deliverBatch(subscriberId: string): Promise<void> {
    const events = this.queue.get(subscriberId) ?? [];
    if (events.length === 0) return;

    const rateLimiter = new WebhookRateLimiter();
    const batch: WebhookEvent[] = [];

    for (const event of events) {
      if (rateLimiter.canDeliver(subscriberId)) {
        batch.push(event);
      } else {
        break; // rate limited — wait for next cycle
      }
    }

    // Remove delivered events from queue
    this.queue.set(subscriberId, events.slice(batch.length));

    // Deliver batch in parallel
    await Promise.allSettled(
      batch.map(event => this.deliver(subscriberId, event))
    );

    // Schedule next batch if queue still has items
    if (this.queue.get(subscriberId)?.length) {
      setTimeout(() => this.scheduleDelivery(subscriberId), 1000);
    }
  }
}
```

## Backpressure to Producers

When subscribers are slow, apply backpressure:

```typescript
async function handleWebhookGeneration(event: DomainEvent): Promise<void> {
  const subscribers = await getActiveSubscribers(event.type);
  const backpressure = await getSystemBackpressure();

  if (backpressure.queueDepth > backpressure.maxDepth) {
    logger.warn({ eventType: event.type }, 'Backpressure threshold reached — throttling webhook generation');
    // Apply backpressure to the producer
    throw new RetryableError('System under backpressure — retry later');
  }

  for (const subscriber of subscribers) {
    try {
      await webhookService.deliver(subscriber, event);
    } catch (err) {
      if (err instanceof RateLimitError) {
        await webhookService.enqueue(subscriber, event);
      }
    }
  }
}
```

## Monitoring Per-Subscriber Delivery

```typescript
interface SubscriberMetrics {
  delivered: number;
  rateLimited: number;
  failed: number;
  avgLatencyMs: number;
  queueDepth: number;
}

async function getSubscriberMetrics(subscriberId: string): Promise<SubscriberMetrics> {
  const windowStart = Date.now() - 60000; // last minute

  const [delivered, rateLimited, failed, queueDepth] = await Promise.all([
    db.deliveryLogs.count({ subscriberId, timestamp: { $gte: windowStart }, status: 'success' }),
    db.deliveryLogs.count({ subscriberId, timestamp: { $gte: windowStart }, status: 'rate_limited' }),
    db.deliveryLogs.count({ subscriberId, timestamp: { $gte: windowStart }, status: 'failed' }),
    getQueueDepth(subscriberId),
  ]);

  return { delivered, rateLimited, failed, avgLatencyMs: 0, queueDepth };
}
```

## Key Points
- Apply per-subscriber rate limits using token bucket
- Configure tiered limits based on subscriber plan
- Use delivery queues to smooth traffic spikes
- Apply backpressure to producers when queue depth exceeds threshold
- Monitor per-subscriber delivery metrics (delivered, rate limited, failed)
- Drop events and log when pending queue is full
- Use separate rate limiters per subscriber to prevent one slow consumer from affecting others
