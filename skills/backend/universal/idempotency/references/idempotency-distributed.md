# Distributed Idempotency

## Challenges in Distributed Systems

| Challenge | Description | Solution |
|-----------|-------------|----------|
| Network failures | Request sent but response lost; client retries | Idempotency keys + stored response |
| Duplicate messages | Message broker delivers same message twice | Deduplication by message ID |
| Partial failures | Service crashes after processing but before storing idempotency key | Atomic transaction for business op + key |
| Clock skew | Different services have different time | Monotonic timestamps, logical clocks |
| Concurrent requests | Two requests with same idempotency key arrive simultaneously | Pessimistic or optimistic locking |
| Cache inconsistency | Idempotency store replica is stale | Read-after-write consistency, quorum |

## Distributed Locking for Idempotency

```typescript
// Redlock — distributed lock for idempotency key acquisition
class RedlockIdempotencyStore {
  constructor(
    private redlock: Redlock,
    private redis: Redis,
    private ttlMs: number = 86400000,
    private lockMs: number = 5000,
  ) {}

  async executeIdempotent<T>(
    key: string,
    requestBody: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    const lockKey = `lock:idempotency:${key}`;
    const lock = await this.redlock.acquire([lockKey], this.lockMs);

    try {
      // Check if already processed
      const cached = await this.redis.get(`idempotency:${key}`);
      if (cached) {
        return JSON.parse(cached);
      }

      // Execute the operation
      const result = await operation();

      // Cache the result
      await this.redis.set(
        `idempotency:${key}`,
        JSON.stringify(result),
        'PX',
        this.ttlMs,
      );

      return result;
    } finally {
      await lock.release().catch(() => {}); // Best-effort release
    }
  }
}
```

## Multi-Service Idempotency

```typescript
// Saga step with idempotency — safe to retry
class PaymentSagaStep {
  constructor(
    private paymentClient: PaymentServiceClient,
    private sagaStore: SagaStore,
  ) {}

  async processPayment(sagaId: string, orderId: string, amount: number): Promise<void> {
    const stepKey = `saga:${sagaId}:payment`;

    // Step is idempotent — check if already completed
    const status = await this.sagaStore.getStepStatus(stepKey);
    if (status === 'completed') return;
    if (status === 'compensated') throw new Error('Step already compensated');

    try {
      // Payment service deduplicates by idempotency key
      await this.paymentClient.charge({
        idempotencyKey: stepKey,
        orderId,
        amount,
      });

      await this.sagaStore.markStepCompleted(stepKey);
    } catch (err) {
      // Mark as failed for saga coordinator
      await this.sagaStore.markStepFailed(stepKey, err.message);
      throw err;
    }
  }

  async compensatePayment(sagaId: string, orderId: string): Promise<void> {
    const stepKey = `saga:${sagaId}:payment:refund`;

    // Compensation is also idempotent
    const status = await this.sagaStore.getStepStatus(stepKey);
    if (status === 'completed') return;

    await this.paymentClient.refund({ idempotencyKey: stepKey, orderId });
    await this.sagaStore.markStepCompleted(stepKey);
  }
}
```

## Message Deduplication

```typescript
// Consumer-side deduplication
class DeduplicatingConsumer {
  constructor(
    private messageBus: MessageBus,
    private dedupStore: DedupStore,
  ) {}

  async start(): Promise<void> {
    await this.messageBus.consume('order.events', async (message) => {
      // Check dedup by message ID
      if (await this.dedupStore.exists(message.id)) {
        return; // Already processed
      }

      try {
        await this.processOrderEvent(message);

        // Mark as processed
        await this.dedupStore.markProcessed(message.id, 86400); // 24h TTL
      } catch (err) {
        // Will be retried by message broker
        throw err;
      }
    });
  }
}

// Dedup store implementations
interface DedupStore {
  exists(id: string): Promise<boolean>;
  markProcessed(id: string, ttlSeconds: number): Promise<void>;
}

class RedisDedupStore implements DedupStore {
  constructor(private redis: Redis) {}

  async exists(id: string): Promise<boolean> {
    return (await this.redis.exists(`dedup:${id}`)) === 1;
  }

  async markProcessed(id: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(`dedup:${id}`, '1', 'EX', ttlSeconds);
  }
}

class PostgresDedupStore implements DedupStore {
  constructor(private pool: Pool) {}

  async exists(id: string): Promise<boolean> {
    const result = await this.pool.query(
      'SELECT 1 FROM processed_messages WHERE message_id = $1',
      [id],
    );
    return result.rowCount > 0;
  }

  async markProcessed(id: string, _ttlSeconds: number): Promise<void> {
    await this.pool.query(
      'INSERT INTO processed_messages (message_id, processed_at) VALUES ($1, NOW()) ON CONFLICT DO NOTHING',
      [id],
    );
  }
}
```

## Exactly-Once Processing

### Transactional Outbox + Idempotency

```
1. Application begins DB transaction
2. Application writes business data
3. Application writes outbox record (with idempotency key)
4. Application commits transaction (atomic)
5. Outbox relay publishes to message broker
6. Consumer receives message
7. Consumer checks dedup store (by message ID)
8. Consumer processes message
9. Consumer marks as processed (atomic with business logic)
```

### Idempotency in Stream Processing

```java
// Kafka Streams — exactly-once with idempotent state stores
KStream<String, Order> orders = builder.stream("orders");

orders.groupByKey()
  .aggregate(
    OrderAggregate::new,
    (key, order, aggregate) -> aggregate.add(order),
    Materialized.<String, OrderAggregate, KeyValueStore<Bytes, byte[]>>
      as("order-aggregates")
      .withLoggingEnabled()  // changelog topic for fault tolerance
  );

// Streams processes each message exactly-once
// State stores are automatically checkpointed
// On failure, reprocessing from last committed offset
```

## Distributed Idempotency Key Design

```yaml
key_design:
  single_service:
    format: "uuid-v7"
    source: "Client generates"
    scope: "Per-endpoint"
    example: "0195f1d0-7f3a-7b00-8000-8a9b1c2d3e4f"

  saga_step:
    format: "saga:{sagaId}:{stepName}"
    source: "Saga coordinator"
    scope: "Per-saga per-step"
    example: "saga:ord-123:payment"

  cross_service:
    format: "{serviceName}:{resourceType}:{resourceId}:{action}:{timestamp}:{nonce}"
    source: "Service that owns the resource"
    scope: "Global uniqueness"
    example: "orders:payment:pay_456:refund:1717153830:a1b2c3"

  message_dedup:
    format: "{sourceService}.{eventType}.{messageId}"
    source: "Producer service"
    scope: "Global uniqueness"
    example: "orders.OrderPlaced.msg_789"
```

## Failure Modes and Recovery

| Failure Mode | Impact | Recovery |
|-------------|--------|----------|
| Idempotency store down | Cannot process mutating requests | Circuit breaker: fail fast, return 503 |
| Lock acquisition timeout | Slow concurrent requests | Reduce lock timeout, use optimistic locking |
| Clock drift between services | Stale idempotency key expiration | Use monotonic clocks, generous TTL margins |
| Partial write to idempotency store | Request processed but not recorded as idempotent | Retry with same key, detect and deduplicate |
| Network partition | Split-brain — two requests with same key processed | Use consensus-based idempotency store |

## Monitoring Distributed Idempotency

```yaml
metrics:
  idempotency_hit_count:
    description: "Number of idempotency cache hits"
    alert: "None (expected behavior)"
  idempotency_miss_count:
    description: "Number of first-time idempotency requests"
    alert: "None (expected behavior)"
  idempotency_conflict_count:
    description: "Number of concurrent request conflicts"
    alert: "> 1% of total requests"
  idempotency_store_latency:
    description: "Idempotency store read/write latency"
    alert: "p99 > 100ms"
  idempotency_store_errors:
    description: "Idempotency store operation errors"
    alert: "> 0 in 5 minutes"
```
