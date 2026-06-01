---
name: backend-message-queue
description: >
  Use this skill when the user says 'message queue', 'Kafka', 'RabbitMQ', 'SQS', 'pub-sub', 'event bus', 'consumer group', 'topic', 'queue', 'at-least-once', 'exactly-once', 'idempotent consumer', 'event sourcing', 'dead letter queue', 'DLQ', 'message broker', 'producer', 'consumer', 'event-driven', 'async processing', or when designing asynchronous messaging. This skill enforces consistent messaging patterns: broker selection, topic/queue topology, message schema, consumer groups, retry, DLQ, and idempotency. Applies to any backend stack. Do NOT use for: gRPC streaming, WebSocket real-time, REST API design, or database CDC.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, messaging, phase-2, universal]
---

# Backend Message Queue

## Purpose
Design consistent, production-grade message-driven systems. Every message flow must follow the same conventions for broker selection, topic/queue topology, message schema, delivery guarantees, consumer idempotency, retry, and dead-letter handling.

## Agent Protocol

### Trigger
Exact user phrases: "message queue", "Kafka", "RabbitMQ", "SQS", "pub-sub", "event bus", "consumer group", "topic", "queue", "at-least-once", "exactly-once", "idempotent consumer", "event sourcing", "dead letter queue", "DLQ", "message broker", "producer", "consumer", "event-driven", "async processing", "design a message flow".

### Input Context
Before activating, verify:
- The business event or asynchronous task is known.
- The delivery guarantee requirement (at-most-once / at-least-once / exactly-once) is known. If not, ask: "What delivery guarantee do you need?"
- The throughput requirement is known.
- The broker preference (Kafka / RabbitMQ / SQS) is known. If not, ask: "Which broker? Kafka (high throughput, replay), RabbitMQ (routing, flexibility), or SQS (managed, simple)?"

### Output Artifact
No file output unless the user requests it. Produces messaging topology specs as text.

### Response Format
For each topic/queue:
```
Broker: {Kafka | RabbitMQ | SQS}
Name: {topic or queue name}
Type: {topic | queue | exchange + queue}
Partitions: {number} / Shards: {number}
Retention: {TTL or size limit}
Consumers: {consumer group or worker pool}
Dead-letter: {DLQ name}
```

For each message type:
```
Schema: {event_name} v{version}
Key: {partition key field}
Payload: {field list}
Guarantee: {at-most-once | at-least-once | exactly-once}
Idempotency key: {field name}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Broker is selected with justification.
- [ ] Every topic/queue has: name, type, partitions, retention, consumers, DLQ.
- [ ] Every message has: schema with version, key, payload, delivery guarantee, idempotency key.
- [ ] Consumer failure handling (retry policy, DLQ routing) is defined.
- [ ] Ordering requirements are documented (key-based partitioning).
- [ ] Schema evolution strategy is defined.

### Max Response Length
Per topic/queue: 8 lines. Per message type: 6 lines.

## Decision Tree

### Which Broker?

```
What are your requirements?
  ├── High throughput (>100K msg/s), replay, log compaction, analytics
  │   └── Apache Kafka — partitioning, consumer groups, long retention
  ├── Flexible routing (topic/direct/fanout), per-message ack, task queues
  │   └── RabbitMQ — exchanges, bindings, TTL, dead-lettering
  ├── Fully managed, no ops, Lambda triggers, simple
  │   └── AWS SQS — auto-scale, limited features, 256KB max
  ├── High throughput, low latency, JVM-free
  │   └── Pulsar — geo-replication, multi-tenancy, segment-based storage
  └── Pub/sub with push delivery, mobile/web integration
      └── Google Pub/Sub — managed, exactly-once, push subscriptions
```

### Which Delivery Guarantee?

```
What happens if a message is lost?
  ├── Data loss is acceptable (metrics, non-critical logs)
  │   └── At-most-once — fire and forget, lowest overhead
  ├── Duplicates are OK, data loss is not
  │   └── At-least-once — retry on failure, idempotent consumer required
  ├── Neither loss nor duplicates allowed (financial, inventory)
  │   └── Exactly-once — transactional producer + dedup consumer + idempotent processing
  └── I don't know
      └── Default to at-least-once — safest choice for most use cases
```

## Workflow

### Step 1: Select Broker
```
Kafka:      high throughput (100k+ msg/s), replay, log compaction, multi-consumer
            Best for: event sourcing, analytics pipelines, audit logs, CDC

RabbitMQ:   flexible routing (exchanges, bindings), low latency, per-message ack
            Best for: task queues, RPC, complex routing, lower throughput

SQS:        fully managed, no ops, auto-scaled, simple
            Best for: AWS-native, simple queues, Lambda triggers, small teams
```

### Step 2: Define Topic / Queue Topology
```
Kafka:
  topic: user.events.v1 (partitions: 6, replication: 3, retention: 7d)
  consumer group: user-service-group (6 consumers = 1 per partition)

RabbitMQ:
  exchange: user.events (type: topic)
  queue: user.created (bind key: user.created.*)
  queue: user.updated (bind key: user.updated.*)
  dead-letter exchange: user.events.dlx

SQS:
  queue: user-events-queue (visibility timeout: 30s, retention: 4d)
  DLQ: user-events-dlq (max receives: 3)
```

### Step 3: Define Message Schema
Every message has a consistent envelope:
```json
{
  "id": "uuid",
  "type": "UserCreated",
  "version": 1,
  "timestamp": "2026-05-18T10:00:00Z",
  "producer": "user-service",
  "key": "user_abc123",
  "data": {
    "user_id": "abc123",
    "name": "Jane Doe",
    "email": "jane@example.com"
  }
}
```

### Step 4: Delivery Guarantees
```
At-most-once:     fire and forget. Lowest overhead, possible data loss.
                  Use: metrics, non-critical logs.

At-least-once:    retry on failure. Lower overhead, no data loss, possible duplicates.
                  Use: order processing, notifications, data sync.
                  Required: idempotent consumer.

Exactly-once:     transactional producers + idempotent consumers + dedup.
                  High overhead. Only when mandated by compliance.
                  Use: financial transactions, inventory deduction.
```

### Step 5: Idempotent Consumer Pattern
```
On receive message:
  1. Check if idempotency_key exists in processed set (Redis / DB).
  2. If exists → ack and skip (duplicate).
  3. If not exists → process, store idempotency_key, commit offset / ack.

Idempotency key = message.id or business_key + event_type
Processed set TTL: match broker retention period
```

```typescript
class IdempotentConsumer {
  private processed = new Set<string>();

  async process<T>(message: Message<T>, handler: (data: T) => Promise<void>): Promise<void> {
    if (this.processed.has(message.id)) {
      logger.info('Duplicate message skipped', { id: message.id });
      return;
    }
    await handler(message.data);
    this.processed.add(message.id);
    // For persistence: store in Redis with TTL
  }
}
```

### Step 6: Retry and Dead-Letter Queue
```
Kafka:
  - Retry topic: user.events.v1.retry (consumers reprocess after delay)
  - DLQ topic: user.events.v1.dlq (after 3 retries)
  - Alert on DLQ message production

RabbitMQ:
  - Retry policy: reject → DLX → retry queue (with TTL) → requeue
  - Max retries: 3 with exponential backoff (10s, 30s, 60s)
  - After max: route to DLQ permanently

SQS:
  - redrive policy: maxReceiveCount = 3
  - DLQ for failed messages
  - Lambda DLQ destinations for async invocation failures
```

```typescript
// Kafka consumer with retry (Node.js)
class RetryableConsumer {
  private maxRetries = 3;
  private retryTopics: Record<string, string> = {};

  async consume(topic: string, handler: (msg: Message) => Promise<void>) {
    const consumer = this.kafka.consumer({ groupId: 'order-service' });
    await consumer.subscribe({ topic });

    await consumer.run({
      eachMessage: async ({ topic: originTopic, partition, message }) => {
        const parsed = JSON.parse(message.value!.toString());
        const retryCount = parsed._metadata?.retryCount ?? 0;

        try {
          await handler(parsed);
          await consumer.commitOffsets([{ topic: originTopic, partition, offset: message.offset }]);
        } catch (err) {
          if (retryCount >= this.maxRetries) {
            await this.sendToDLQ(parsed);
            logger.error('Message sent to DLQ after max retries', { id: parsed.id, error: err });
          } else {
            const delayTopic = `${topic}.retry-${retryCount + 1}`;
            await this.producer.send({
              topic: delayTopic,
              messages: [{
                value: JSON.stringify({
                  ...parsed,
                  _metadata: { retryCount: retryCount + 1, lastError: (err as Error).message },
                }),
              }],
            });
          }
        }
      },
    });
  }
}
```

### Step 7: Consumer Group Scaling
```
Kafka partitions vs consumers:
  Partitions = 6, Consumers = 6  → Each consumer gets 1 partition (ideal)
  Partitions = 6, Consumers = 3  → Each consumer gets 2 partitions (balanced)
  Partitions = 6, Consumers = 10 → 4 consumers idle (waste)
  
  Rule: consumer count <= partition count
```

```typescript
// Graceful shutdown for consumer
async function shutdownGracefully(consumer: Consumer) {
  process.on('SIGTERM', async () => {
    logger.info('Shutting down consumer...');
    await consumer.disconnect();
    process.exit(0);
  });
}
```

### Step 8: Producer Patterns

```typescript
// Kafka producer with idempotency
const producer = kafka.producer({
  idempotent: true,                   // exactly-once production
  maxInFlightRequests: 5,             // limit concurrency
  retries: 3,
});

async function publishEvent(event: DomainEvent) {
  await producer.send({
    topic: event.type.replace(/([a-z])([A-Z])/g, '$1.$2').toLowerCase() + '.v1',
    messages: [{
      key: event.aggregateId,         // ordering by aggregate
      value: JSON.stringify({
        id: uuidv4(),
        type: event.constructor.name,
        version: 1,
        timestamp: new Date().toISOString(),
        producer: serviceName,
        key: event.aggregateId,
        data: event,
      }),
      headers: { 'event-type': event.constructor.name },
    }],
  });
}
```

### Step 9: Monitoring and Observability

| Metric | What It Tells | Alert Threshold |
|--------|--------------|-----------------|
| Consumer lag | How far behind consumers are | Lag > 1000 for > 5 min |
| Messages in DLQ | Permanent failures | > 0, alert immediately |
| Processing time | Consumer health | p99 > 10s |
| Throughput (msg/s) | System load | Compare to baseline |
| Failed deliveries | Broker connectivity | > 1% for > 1 min |
| Queue depth (SQS/Rabbit) | Backlog | Depth > 10000 |

```typescript
// Kafka lag monitoring
async function checkConsumerLag(admin: Admin, groupId: string): Promise<void> {
  const lag = await admin.fetchOffsets({ groupId });
  for (const partition of lag) {
    const topicLag = partition.offset ?? 0;
    if (topicLag > 1000) {
      logger.warn('High consumer lag', { groupId, partition: partition.partition, lag: topicLag });
    }
  }
}
```

## Production Considerations

| Concern | Practice |
|---------|----------|
| Message ordering | Use key-based partitioning. Same key = same partition = ordered |
| Schema evolution | Add fields only (backward compat). Version in envelope. Never mutate existing fields |
| Large messages | >1MB: store reference (S3 URL) in message, not the payload itself |
| Rebalancing (Kafka) | Static group membership to reduce rebalance frequency |
| Connection security | TLS for all brokers. SASL/SCRAM or mTLS for auth |
| Geo-distribution | Kafka MirrorMaker for cross-region replication. Pulsar has native geo-replication |

## Security

| Risk | Mitigation |
|------|-----------|
| Unauthorized produce/consume | ACLs per topic (Kafka), IAM policies (SQS), Vhost permissions (RabbitMQ) |
| Message tampering | TLS in transit. Optional: message-level HMAC or encryption |
| Sensitive data in messages | Encrypt payload at application level before producing |
| DoS via large messages | Enforce max message size at broker level |
| Credential exposure | Use IAM roles (AWS), service accounts, or vault, never hardcoded creds |

## Anti-Patterns

| Anti-Pattern | Why It's Bad | Fix |
|-------------|-------------|-----|
| Using MQ as a database | Storage grows unbounded, no query capability | Define retention limits, use DB for persistence |
| Infinite retention | Storage explosion, slow rebalances | Set retention by time and size |
| No DLQ monitoring | Silent data loss | Alert on DLQ message production |
| Committing offset before processing | Lost messages on crash | Commit after processing (at-least-once) |
| Too many partitions | Rebalance overhead, connection overhead | Partitions = consumers × 2-3 max |
| Synchronous producing | Increases latency, reduces throughput | Batch or async produce |
| Single consumer on partitioned topic | N-1 idle partitions | Match consumer count to partitions |

## Rules
- Never consume from production topics without a consumer group id.
- Always set a retention limit (time or size). Never use infinite retention.
- Every message must have a unique id and timestamp.
- Always use key-based partitioning when message ordering matters.
- Schema evolve via new version — never mutate existing message schemas.
- DLQ must have monitoring and alerting. Unattended DLQ = silent data loss.
- Consumer lag must be monitored. Set alerts for lag > threshold.
- Never commit offsets before processing is complete (at-least-once).
- Max message size: 1MB for Kafka, 256KB for SQS, unlimited for RabbitMQ (practical: 10MB).
- Never produce to a topic that doesn't exist — create topics with proper config first.
- Use idempotent producers for Kafka (exactly-once semantics to broker).

## References
  - references/broker-comparison.md — Message Broker Comparison
  - references/consumer-patterns.md — Consumer Patterns
  - references/kafka-patterns.md — Kafka Patterns
  - references/message-design.md — Message Schema Design
  - references/message-queue-monitoring.md — Message Queue Monitoring
  - references/message-queue-security.md — Message Queue Security
  - references/producer-patterns.md — Producer Patterns
  - references/rabbitmq-patterns.md — RabbitMQ Patterns
## Handoff
No artifact produced unless requested.
Next skill: backend-caching — if the event-driven system needs to cache materialized views or read models.
Carry forward: topic/queue topology, message schemas, consumer group configs, retry/DLQ policies.
