# Event-Driven Fundamentals

## What is Event-Driven Architecture?

Event-driven architecture (EDA) is a software design pattern where components communicate by producing and consuming events. An event is a significant change in state that other parts of the system can react to asynchronously.

## Domain Events vs Integration Events

### Domain Events
- Stay inside the service boundary
- Published on an in-memory bus (same process)
- Fired in the same transaction as the state change
- Handled synchronously or asynchronously within the service
- Represent business domain concepts

```typescript
// Domain event — defined in Domain layer
class OrderSubmittedEvent implements DomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly customerId: string,
    public readonly total: Money,
    public readonly occurredAt: Date = new Date(),
    public readonly eventId: string = crypto.randomUUID(),
  ) {}
}
```

### Integration Events
- Cross service boundaries
- Published to a message broker
- Produced after the transaction commits (transactional outbox)
- Consumed asynchronously by other services
- Represent public facts other services may care about

```typescript
// Integration event — published to broker, cross-service
interface IntegrationEvent {
  eventId: string;
  eventType: string;
  eventVersion: number;
  occurredAt: string;
  producer: string;
  traceId: string;
  data: Record<string, unknown>;
}
```

## Event Naming Convention

### Past Tense
Events are facts about the past. They describe something that already happened:

| Correct | Incorrect |
|---------|-----------|
| OrderPlaced | PlaceOrder |
| UserRegistered | RegisterUser |
| PaymentFailed | PaymentFailure |
| InventoryReserved | ReserveInventory |
| EmailSent | SendEmail |

### PascalCase with Namespace
`{Domain}.{Aggregate}.{PastTenseVerb}`

```
Order.Submitted
User.Registered
Payment.Succeeded
Inventory.Reserved
Notification.EmailSent
```

## Event Envelope

Every event must carry metadata for tracing, idempotency, and versioning:

```json
{
  "eventId": "0194fdc2-fa2f-7cc0-81d3-ff120745b99c",
  "eventType": "Order.Placed",
  "eventVersion": 2,
  "occurredAt": "2026-05-14T10:30:00.500Z",
  "producer": "order-service",
  "traceId": "7a8b3c2d-1e4f-5a6b-7c8d-9e0f1a2b3c4d",
  "causationId": "6a8b3c2d-1e4f-5a6b-7c8d-9e0f1a2b3c4d",
  "data": {
    "orderId": "2a3b4c5d-6e7f-8a9b-0c1d-2e3f4a5b6c7d",
    "customerId": "3b4c5d6e-7f8a-9b0c-1d2e-3f4a5b6c7d8e",
    "items": [
      { "productId": "p1", "quantity": 2, "price": 19.99 }
    ],
    "total": 39.98
  }
}
```

## Idempotent Consumers

### Why Idempotency Matters
At-least-once delivery guarantees that a message will be delivered at least once. This means duplicates are guaranteed. Every consumer must handle duplicates safely.

### Idempotency Strategies

| Strategy | Mechanism | Best For |
|---|---|---|
| Event ID dedup | Track processed eventIds | Any event |
| Business key dedup | Track by business key (e.g., orderId + eventType) | When eventId not available |
| Upsert | INSERT ON CONFLICT DO NOTHING/UPDATE | Database writes |
| Conditional update | UPDATE WHERE version = expectedVersion | Optimistic concurrency |

### Event ID Deduplication
```typescript
class IdempotentConsumer {
  private processedEvents = new Set<string>();
  private ttl = 86400000; // 24 hours

  async handle(event: IntegrationEvent): Promise<void> {
    if (await this.isProcessed(event.eventId)) {
      logger.debug('Duplicate event ignored', { eventId: event.eventId });
      return;
    }

    await this.processEvent(event.data);
    await this.markProcessed(event.eventId);
  }

  private async isProcessed(eventId: string): Promise<boolean> {
    return this.redis.exists(`processed:${eventId}`);
  }

  private async markProcessed(eventId: string): Promise<void> {
    await this.redis.set(`processed:${eventId}`, '1', 'PX', this.ttl);
  }
}
```

## Message Broker Comparison

| Broker | Model | Ordering | Retention | Latency | Throughput |
|--------|-------|----------|-----------|---------|------------|
| Kafka | Durable log | Per partition | Configurable | ~5ms | 1M msg/s |
| RabbitMQ | Queue + Exchange | Per queue | Ack-based | ~1ms | 50K msg/s |
| NATS | Pub/Sub | None | None (fire & forget) | <1ms | 1M+ msg/s |
| SQS | Queue | Best-effort | Up to 14 days | ~10ms | Unlimited |
| SNS | Pub/Sub | None | Push to subscribers | ~10ms | Unlimited |
| Redis Pub/Sub | Pub/Sub | None | None | <1ms | 100K msg/s |

## Transactional Outbox Pattern

### Why Not Dual Writes?
Writing to the database AND publishing an event in the same operation is risky. If the publish fails, the DB write is committed without an event. If the DB write fails, the event is published without a state change.

### Outbox Solution
Write the event to an outbox table in the SAME database transaction as the data change. A separate process polls the outbox and publishes to the broker.

```sql
-- Same transaction
BEGIN;
  INSERT INTO orders (...) VALUES (...);
  INSERT INTO outbox (event_id, event_type, data, created_at)
    VALUES (gen_random_uuid(), 'OrderPlaced', '{"orderId": "..."}', NOW());
COMMIT;
```

## Dead Letter Queue

Every event consumer should have a dead letter queue (DLQ) for events that cannot be processed after all retries.

### DLQ Flow
```
Event arrives → Process
  ├── Success → Acknowledge
  └── Failure → Retry (up to N times)
       └── Max retries → Publish to DLQ
            └── Alert operators
```

### DLQ Message Format
```json
{
  "originalEvent": { ... },
  "error": "TimeoutError: Payment gateway timeout",
  "failedAt": "2026-05-14T10:31:00.000Z",
  "retryCount": 3,
  "consumerGroup": "order-processor"
}
```

## Consumer Health Monitoring

### Key Metrics
| Metric | What It Measures | Alert Threshold |
|--------|-----------------|----------------|
| Consumer lag | Messages not yet processed | > 10000 |
| Processing time | Time to process one message | > 5s p99 |
| Error rate | Failed / total messages | > 1% |
| DLQ size | Messages in dead letter queue | > 10 |
| Throughput | Messages processed per second | Below expected |

### Distributed Tracing
Every event carries a traceId that spans service boundaries. Use OpenTelemetry or similar to trace event flows:

```typescript
// Producer
const traceId = opentelemetry.trace.getActiveSpan()?.spanContext().traceId ?? uuid();
await producer.send({
  messages: [{ value: event, headers: { traceId } }],
});

// Consumer
const traceId = message.headers.traceId.toString();
opentelemetry.trace.setSpan(
  opentelemetry.trace.getTracer('consumer').startSpan('process-event', {
    links: [{ context: { traceId } }],
  })
);
```
