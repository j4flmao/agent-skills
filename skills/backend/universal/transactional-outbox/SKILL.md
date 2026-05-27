---
name: backend-transactional-outbox
description: >
  Use this skill when the user says 'outbox', 'transactional outbox', 'outbox pattern', 'reliable event publishing', 'dual write', 'CDC outbox', 'message relay', 'publish events reliably', 'exactly-once publish', 'debezium outbox'. This skill enforces: event publication in the same DB transaction as business data, separate message relay process, at-least-once delivery guarantee, deduplication in consumers, idempotent consumption. Applies to any backend stack. Do NOT use for: in-process events, fire-and-forget messaging, or already-reliable message broker setups.
version: "1.0.0"
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

## Rules
- Business operation and outbox insert MUST be in the same database transaction. If either fails, both roll back.
- The message relay is a separate process. Do NOT publish events directly from the application request handler.
- Use the outbox pattern whenever the application writes to a database AND publishes events/messages. Without it, dual-write failures cause data inconsistency.
- CDC-based relay (Debezium) for high throughput (>1000 events/sec). Polling-based relay for moderate throughput.
- Outbox records are never deleted immediately. Archive or purge after 7 days.
- Monitor outbox backlog as a health metric. Backlog > 1000 unprocessed messages triggers an alert.
- Consumers always check for duplicate event processing before acting.

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
