---
name: backend-transactional-outbox
description: >
  Use this skill when the user says 'outbox', 'transactional outbox', 'outbox pattern', 'reliable event publishing', 'dual write', 'CDC outbox', 'message relay', 'publish events reliably', 'exactly-once publish', 'debezium outbox'. This skill enforces: event publication in the same DB transaction as business data, separate message relay process, at-least-once delivery guarantee, deduplication in consumers, idempotent consumption. Applies to any backend stack. Do NOT use for: in-process events, fire-and-forget messaging, or already-reliable message broker setups.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, universal, outbox, messaging, reliability]
---

# Backend Transactional Outbox

## Purpose
Guarantee reliable event publication by writing events to an outbox table within the same database transaction as the business operation, then publishing them via a separate message relay process.

## Agent Protocol

### Trigger
Exact user phrases: "outbox", "transactional outbox", "outbox pattern", "reliable event publishing", "dual write", "CDC outbox", "message relay", "publish events", "exactly-once publish", "debezium outbox".

### Input Context
- Database technology (PostgreSQL, MySQL, SQL Server, etc.).
- Message broker (Kafka, RabbitMQ, SQS, etc.).
- Whether dual-write (DB + broker) is a current problem.
- Current event publishing mechanism.

### Output Artifact
Outbox implementation design as text. No file unless requested.

### Response Format
```
Outbox table: {table schema}
Write strategy: {same transaction|CDC}
Relay: {polling|CDC|transaction log}
Delivery: {at-least-once|exactly-once}
Consumer dedup: {key and storage}
```

### Completion Criteria
- [ ] Outbox table created in the same database as business data.
- [ ] Business operation and outbox insert are in the same DB transaction.
- [ ] Message relay process is separate from the application.
- [ ] Outbox records are deleted or marked processed after successful publish.
- [ ] Relay handles failures with retry and backoff.
- [ ] Consumers are idempotent (handle duplicate deliveries).
- [ ] Monitoring in place for outbox backlog.

### Max Response Length
15 lines for design. 8 lines for table schema.

## Decision Tree

### Relay Strategy

```
What throughput do you need?
  ├── Low to moderate (<1000 events/sec), want simplicity
  │   └── Polling relay — periodic SQL query for unprocessed rows
  ├── High throughput (>1000 events/sec), need near real-time
  │   └── CDC relay (Debezium) — tail the WAL, no polling overhead
  └── Moderate throughput, want logical replication, no extra infra
      └── PostgreSQL LISTEN/NOTIFY + polling as fallback
```

### When to Use Outbox Pattern

```
Do you write to DB and send a message in the same operation?
  ├── Yes → Use outbox pattern. Without it, dual-write can fail halfway
  ├── No, only DB → No outbox needed
  └── No, only message → No outbox needed
```

## Workflow

### Step 1: Create Outbox Table

```sql
CREATE TABLE outbox_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type VARCHAR(100) NOT NULL,
  aggregate_id VARCHAR(100) NOT NULL,
  event_type VARCHAR(200) NOT NULL,
  event_data JSONB NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT
);

-- Index for polling relay
CREATE INDEX idx_outbox_unprocessed ON outbox_messages(created_at)
  WHERE processed_at IS NULL;

-- Index for cleanup
CREATE INDEX idx_outbox_processed ON outbox_messages(processed_at)
  WHERE processed_at IS NOT NULL;
```

### Step 2: Write Within Transaction

```typescript
async function placeOrder(command: PlaceOrderCommand): Promise<void> {
  await db.transaction(async (tx) => {
    // 1. Business operation
    const order = await tx.orders.insert({ customerId: command.customerId, status: 'pending' });
    await tx.orderItems.insertMany(order.id, command.items);

    // 2. Outbox entry — same transaction
    await tx.outbox.insert({
      id: generateUuid(),
      aggregateType: 'order',
      aggregateId: order.id,
      eventType: 'OrderPlaced',
      eventData: { orderId: order.id, customerId: command.customerId, items: command.items },
      metadata: { correlationId: command.correlationId },
      createdAt: new Date(),
    });
  });
}
```

### Step 3: Message Relay (Polling)

```typescript
class OutboxRelay {
  constructor(
    private db: Database,
    private messageBus: MessageBus,
    private logger: Logger
  ) {}

  async poll(): Promise<void> {
    const messages = await this.db.outbox.findUnprocessed(50);

    for (const message of messages) {
      try {
        await this.messageBus.publish(message.eventType, {
          eventId: message.id,
          eventType: message.eventType,
          aggregateId: message.aggregateId,
          data: message.eventData,
          metadata: message.metadata,
        });

        await this.db.outbox.markProcessed(message.id);
        this.logger.info('Outbox message published', { eventType: message.eventType, id: message.id });
      } catch (err) {
        await this.db.outbox.incrementRetry(message.id);
        this.logger.error('Failed to publish outbox message', { id: message.id, error: err });

        if (message.retryCount >= 10) {
          await this.alertOnDeadLetter(message);
        }
      }
    }
  }

  async start(intervalMs = 1000): Promise<void> {
    setInterval(() => this.poll(), intervalMs);
  }
}
```

### Step 4: Message Relay (CDC with Debezium)

For high-throughput systems, use CDC instead of polling:

```
Application -> PostgreSQL WAL -> Debezium connector -> Kafka -> Consumer

1. Application writes business data + outbox row in same transaction
2. Debezium reads the WAL and captures the outbox insert
3. Debezium publishes to Kafka topic matching event_type
4. Consumer receives the event and processes it
```

CDC advantages: no polling overhead, near real-time, no impact on application database.

Debezium outbox configuration:
```json
{
  "name": "order-service-connector",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "postgres",
    "database.port": "5432",
    "database.user": "debezium",
    "database.password": "***",
    "database.dbname": "orders",
    "table.include.list": "public.outbox_messages",
    "tombstones.on.delete": "false",
    "transforms": "outbox",
    "transforms.outbox.type": "io.debezium.transforms.outbox.EventRouter",
    "transforms.outbox.table.field.event.type": "event_type",
    "transforms.outbox.table.field.event.id": "id",
    "transforms.outbox.table.field.event.key": "aggregate_id",
    "transforms.outbox.table.field.event.timestamp": "created_at"
  }
}
```

### Step 5: Consumer Idempotency

```typescript
async function handleOrderPlaced(event: OutboxEvent): Promise<void> {
  // Deduplicate by event ID
  const processed = await checkProcessed(event.eventId);
  if (processed) return;

  await processOrder(event.data);
  await markProcessed(event.eventId);
}
```

### Step 6: Batched Processing

For higher throughput with polling relay:

```typescript
class BatchedOutboxRelay {
  async poll(): Promise<void> {
    const messages = await this.db.outbox.findUnprocessed(100);
    if (messages.length === 0) return;

    const batches = this.groupByTopic(messages);

    for (const [topic, batch] of batches) {
      try {
        await this.messageBus.publishBatch(topic, batch.map(msg => ({
          eventId: msg.id,
          eventType: msg.eventType,
          aggregateId: msg.aggregateId,
          data: msg.eventData,
        })));

        await this.db.outbox.markProcessedBatch(batch.map(m => m.id));
      } catch (err) {
        // Fall back to individual processing for this batch
        await this.processIndividually(batch);
      }
    }
  }
}
```

### Step 7: Monitoring and Alerting

| Metric | What It Tells | Alert Threshold |
|--------|--------------|-----------------|
| Outbox backlog count | Unprocessed messages | > 1000 for > 5 min |
| Outbox relay latency | Time between insert and publish | > 60s |
| Retry count distribution | Messages failing repeatedly | Retry > 5 |
| Dead letter count | Permanently failed messages | > 0 |
| Relay processing rate | Throughput | Sudden drop > 50% |

```sql
-- Monitoring queries
-- Backlog count
SELECT COUNT(*) FROM outbox_messages WHERE processed_at IS NULL;

-- Stuck messages (>5 min old)
SELECT COUNT(*) FROM outbox_messages
  WHERE processed_at IS NULL
  AND created_at < NOW() - INTERVAL '5 minutes';

-- Failed messages
SELECT COUNT(*) FROM outbox_messages
  WHERE processed_at IS NULL AND retry_count > 5;
```

### Step 8: Cleanup Strategy

```sql
-- Archive processed messages after 7 days
DELETE FROM outbox_messages
  WHERE processed_at IS NOT NULL
  AND processed_at < NOW() - INTERVAL '7 days';

-- Archive dead-letter messages after 30 days (after manual review)
DELETE FROM outbox_messages
  WHERE retry_count >= 10
  AND created_at < NOW() - INTERVAL '30 days';
```

## Production Considerations

| Concern | Practice |
|---------|----------|
| DB load from polling | Poll every 1-5s, batch size 50-100. For >1000 events/s, use CDC |
| Ordering | Outbox table has no ordering guarantee. Use created_at + batch processing |
| Idempotency key storage | Use Redis with TTL matching broker retention, or a dedicated DB table |
| Large payloads | Store event_data as JSONB. For >10KB, store reference (S3 URL) in event_data |
| Transaction size | Multiple outbox rows in one tx is fine. Avoid 1000+ rows per single business operation |
| Relay failures | Alert on retry_count > 5. Manual intervention for dead-letter messages |

## Security

| Risk | Mitigation |
|------|-----------|
| Event data exposure | Encrypt sensitive fields in event_data before storing |
| Relay as vector | Outbox relay should only have write access to broker, not read access to other tables |
| Injection in event_data | event_data is JSONB — use parameterized queries for all outbox table operations |
| Unauthorized event generation | Outbox insert only through application business logic, never direct |

## Anti-Patterns

| Anti-Pattern | Why It's Bad | Fix |
|-------------|-------------|-----|
| Publishing directly from request handler | If broker is down, event is lost. DB tx fails, but user already got response | Use outbox: write to DB first, relay separately |
| Same transaction, different DB | Outbox in PostgreSQL, business data in MySQL — no atomicity | Keep outbox in same DB as business data |
| No dedup in consumer | At-least-once delivery causes duplicate processing | Check idempotency key before processing |
| Long-running relay blocking | Single relay thread blocks if one message fails to publish | Individual message retry, skip failures, process batch |
| Deleting outbox immediately after publish | Lose audit trail, cannot replay | Archive after 7 days, keep for replay capability |

## Rules
- Business operation and outbox insert MUST be in the same database transaction. If either fails, both roll back.
- The message relay is a separate process. Do NOT publish events directly from the application request handler.
- Use the outbox pattern whenever the application writes to a database AND publishes events/messages. Without it, dual-write failures cause data inconsistency.
- CDC-based relay (Debezium) for high throughput (>1000 events/sec). Polling-based relay for moderate throughput.
- Outbox records are never deleted immediately. Archive or purge after 7 days.
- Monitor outbox backlog as a health metric. Backlog > 1000 unprocessed messages triggers an alert.
- Consumers always check for duplicate event processing before acting.
- The outbox table must be in the same database as the business data (same ACID guarantees).
- Always include correlationId in metadata for distributed tracing.
- Never skip the outbox pattern for "simple" cases — dual-write always has failure scenarios.

## Outbox Variants

### Minimal Outbox (No Separate Relay Table)
```sql
-- Embed event publication fields directly in business table
-- Useful when events are tightly coupled to the entity lifecycle
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  customer_id UUID NOT NULL,
  status TEXT NOT NULL,
  -- Embedded outbox fields
  event_published BOOLEAN NOT NULL DEFAULT false,
  event_type TEXT,
  event_payload JSONB,
  event_created_at TIMESTAMPTZ
);

CREATE INDEX idx_orders_unpublished ON orders(event_published)
  WHERE event_published = false;
-- Pros: simpler schema, no join needed
-- Cons: tight coupling, harder to add multiple event types per entity
```

### Transactional Outbox with Message Ordering
```sql
-- Guarantee event ordering within an aggregate
CREATE TABLE outbox_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type VARCHAR(100) NOT NULL,
  aggregate_id VARCHAR(100) NOT NULL,
  -- Sequence number for order guarantee
  sequence_number BIGINT NOT NULL,
  event_type VARCHAR(200) NOT NULL,
  event_data JSONB NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,

  UNIQUE(aggregate_type, aggregate_id, sequence_number)
);

-- Relay must process in sequence_number order per aggregate
-- Enforces: events for same aggregate are published in order
```

## PostgreSQL LISTEN/NOTIFY as Lightweight Relay

```typescript
// Hybrid approach: NOTIFY for low latency, polling as fallback
class HybridOutboxRelay {
  private db: Database;
  private relay: OutboxRelay;

  async start(): Promise<void> {
    // Start polling relay as fallback
    this.relay.start(5000); // poll every 5s

    // Listen for immediate notifications
    await this.db.query('LISTEN outbox_events');
    this.db.on('notification', async (msg: any) => {
      // Trigger immediate poll on notification
      await this.relay.poll();
    });
  }
}

-- Trigger to notify on outbox insert
CREATE OR REPLACE FUNCTION notify_outbox_event()
RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('outbox_events', NEW.id::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER outbox_notify
  AFTER INSERT ON outbox_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_outbox_event();
```

## Error Recovery and Dead Letter Queue

```typescript
class OutboxDLQ {
  private deadLetterStore: Map<string, DeadLetterEntry> = new Map();

  async handleDeadLetter(message: OutboxMessage): Promise<void> {
    const entry: DeadLetterEntry = {
      message,
      failedAt: new Date(),
      failureCount: message.retryCount,
      lastError: message.lastError,
    };

    // Store for manual review
    await this.deadLetterStore.set(message.id, entry);

    // Alert operations team
    await this.alerter.send({
      type: 'outbox_dead_letter',
      messageId: message.id,
      eventType: message.eventType,
      retryCount: message.retryCount,
      lastError: message.lastError,
    });

    // Optionally route to dead letter topic
    await this.messageBus.publish('outbox-dead-letter', {
      messageId: message.id,
      eventType: message.eventType,
      originalPayload: message.eventData,
      failureReason: message.lastError,
    });
  }

  async manualRetry(messageId: string): Promise<void> {
    // Allow ops to manually retry dead-lettered messages
    await this.db.outbox.resetRetry(messageId);
  }
}
```

## Kafka Producer Integration

```typescript
class KafkaOutboxRelay {
  private producer: Producer;
  private db: Database;

  async poll(): Promise<void> {
    const messages = await this.db.outbox.findUnprocessed(100);

    for (const message of messages) {
      try {
        await this.producer.send({
          topic: this.eventTypeToTopic(message.eventType),
          messages: [{
            key: message.aggregateId,
            value: JSON.stringify({
              eventId: message.id,
              eventType: message.eventType,
              aggregateType: message.aggregateType,
              aggregateId: message.aggregateId,
              data: message.eventData,
              metadata: message.metadata,
              createdAt: message.createdAt.toISOString(),
            }),
            headers: {
              'event-type': message.eventType,
              'event-id': message.id,
              'content-type': 'application/json',
            },
          }],
        });

        await this.db.outbox.markProcessed(message.id);
      } catch (err) {
        await this.db.outbox.incrementRetry(message.id, err.message);
      }
    }
  }
}
```

## Deduplication and Idempotency Strategies

```typescript
// Consumer-side deduplication
// Option 1: Database-backed dedup
const processedEvents = new Set<string>(); // or Redis set with TTL

async function handleEvent(event: OutboxEvent): Promise<void> {
  // Check if already processed (idempotency check)
  const alreadyProcessed = await checkProcessedEvent(event.eventId);
  if (alreadyProcessed) {
    logger.info('Skipping already processed event', { eventId: event.eventId });
    return;
  }

  try {
    await processEvent(event);
    await markEventProcessed(event.eventId);
  } catch (err) {
    // Transactional: writing result + marking processed in same transaction
    await db.transaction(async (tx) => {
      await processEventInTx(tx, event);
      await markEventProcessedInTx(tx, event.eventId);
    });
  }
}

// Option 2: Idempotent processing (no explicit dedup store)
// Design handlers so processing the same event twice produces same result
// Example: UPSERT instead of INSERT
async function handleOrderCreated(event: OutboxEvent): Promise<void> {
  await db.query(`
    INSERT INTO orders (id, customer_id, status, total)
    VALUES ($1, $2, 'pending', $3)
    ON CONFLICT (id) DO NOTHING
  `, [event.data.orderId, event.data.customerId, event.data.total]);
}
```

## Performance Benchmarks

| Relay Type | Throughput | Latency (p50) | Latency (p99) | Operational Cost |
|-----------|-----------|---------------|---------------|------------------|
| Polling (1s interval, batch 50) | ~50 msg/s | 500ms | 2000ms | Low |
| Polling (100ms interval, batch 100) | ~500 msg/s | 50ms | 500ms | Medium |
| CDC (Debezium, WAL) | ~10K msg/s | 10ms | 100ms | High |
| LISTEN/NOTIFY + polling | ~200 msg/s | 20ms | 500ms | Low |
| CDC (Debezium, optimized) | ~100K msg/s | 5ms | 50ms | High |

## References
  - references/deduplication-idempotency.md — Deduplication & Idempotency
  - references/message-relay-strategies.md — Message Relay Strategies
  - references/outbox-advanced-scenarios.md — Advanced Outbox Scenarios
  - references/outbox-alternatives.md — Outbox Pattern Alternatives
  - references/outbox-deployment.md — Outbox Deployment
  - references/outbox-implementation.md — Transactional Outbox Pattern
  - references/outbox-implementations.md — Outbox Implementations
  - references/outbox-monitoring.md — Outbox Monitoring and Recovery
## Handoff
No artifact produced.
Next skill: message-queue — for message broker configuration once outbox is in place.
Carry forward: outbox table schema, relay strategy, consumer dedup approach.
