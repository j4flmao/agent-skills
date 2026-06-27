---
name: backend-event-driven
description: >
  Use this skill when the user says 'event-driven', 'message queue', 'Kafka', 'RabbitMQ', 'pub/sub', 'domain event', 'event sourcing', 'CQRS', 'async messaging', 'event bus', or when designing asynchronous communication between services. This skill enforces: domain vs integration event distinction, event naming (past tense), schema versioning, consumer idempotency, dead letter queues, saga patterns, and event sourcing basics. Applies to Kafka, RabbitMQ, NATS, Redis Pub/Sub, SQS/SNS. Do NOT use for: REST API design, database optimization, or synchronous communication patterns.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, architecture, events, phase-2, universal]
---

# Backend Event-Driven

## Purpose
Design event-driven systems with clear event boundaries, reliable delivery, observable flows, and error recovery. Every event is a fact. Every consumer is idempotent. Every failure has a recovery path.

## Agent Protocol

### Trigger
Exact user phrases: "event-driven", "message queue", "Kafka", "RabbitMQ", "pub/sub", "domain event", "event sourcing", "CQRS", "async messaging", "event bus", "saga", "distributed transaction".

### Input Context
Before activating, verify:
- The message broker is known (Kafka, RabbitMQ, NATS, Redis, SQS/SNS) or ask.
- The service boundaries are known (which services produce events, which consume them).
- Whether events are in-process (single service) or cross-service.

### Output Artifact
No file output unless requested. Produces event design as text.

### Response Format
```
Event: {EventName}
Version: {n}
Producer: {service name}
Consumers: [{service list}]
Schema: {key fields}
Idempotency key: {eventId or business key}
```

For sagas:
```
Saga: {name}
Type: {choreography/orchestration}
Steps:
1. {service}: {action}
2. {service}: {action}
Compensation:
1. {service}: {rollback action}
2. {service}: {rollback action}
```

### Completion Criteria
- [ ] Domain vs integration event distinction is documented.
- [ ] Every event has a clear name, version, producer, and schema.
- [ ] Consumer idempotency strategy is specified for every consumer.
- [ ] Dead letter queue strategy is specified.
- [ ] Saga pattern is defined for multi-service operations (if applicable).
- [ ] No synchronous calls across service boundaries that should be async.
- [ ] Event schema includes version field.

### Max Response Length
Per event: 7 lines. Per saga: 10 lines.

## Architecture Decision Tree

### Event Type Decision

```
Does the event stay inside a single service boundary?
  ├── Yes → Domain Event (in-process, same transaction)
  └── No → Integration Event (cross-service, async broker)
```

### Delivery Guarantee Decision

```
Can the consumer handle duplicates?
  ├── Yes → At-least-once (simpler, standard)
  └── No → Exactly-once (idempotent consumers + transactional outbox)
```

### Event Ordering Decision

```
Does the consumer need to process events in strict order?
  ├── Yes → Use partition key (entity ID as Kafka key) — events for same entity go to same partition
  └── No → Any partition is fine — simpler, better throughput
```

## Workflow

### Step 1: Distinguish Event Types
| Event Type | Scope | Delivery | Schema |
|------------|-------|----------|--------|
| Domain Event | Inside one service (in-process) | In-memory bus, same transaction | Domain object references |
| Integration Event | Between services (cross-process) | Message broker, async, at-least-once | Serialized DTO with version |

### Step 2: Event Naming
Past tense verb + noun. PascalCase.
- OrderPlaced
- UserRegistered
- PaymentFailed
- InventoryReserved

### Step 3: Event Schema
Every event envelope includes:
```json
{
  "eventId": "uuid-v7",
  "eventType": "OrderPlaced",
  "eventVersion": 1,
  "occurredAt": "2026-05-14T10:30:00.000Z",
  "producer": "order-service",
  "traceId": "uuid",
  "data": {
    "orderId": "uuid",
    "customerId": "uuid"
  }
}
```

### Step 4: Consumer Idempotency
Every consumer must handle duplicate deliveries. At-least-once delivery means duplicates are guaranteed.

```typescript
async function handleOrderPlaced(event: OrderPlacedEvent) {
  const processed = await checkProcessed(event.eventId);
  if (processed) return;
  await processOrder(event.data);
  await markProcessed(event.eventId);
}
```

### Step 5: Dead Letter Queue
```
Producer -> Exchange -> Queue -> Consumer
                                 |
                     retry 3 times
                                 |
                              DLQ -> alert on accumulation
```

- Retry: 3 attempts with exponential backoff (1s, 4s, 16s).
- After 3 failures: move to DLQ with original event + error details.
- DLQ monitoring: alert if DLQ contains more than 10 messages.

### Step 6: Saga Pattern
```
Choreography (simple, few services):
  Order Service: create order (pending) -> emit OrderCreated
  Payment Service: on OrderCreated -> process payment -> emit PaymentProcessed / PaymentFailed
    on PaymentFailed: emit OrderPaymentFailed
  Order Service: on PaymentProcessed -> confirm order
    on OrderPaymentFailed: cancel order (compensation)

Orchestration (complex, many services):
  Order Saga Orchestrator: coordinates all steps
  1. Create Order
  2. Process Payment  <- compensation: refund payment
  3. Reserve Inventory <- compensation: release inventory
  4. Confirm Order
  5. Ship Order       <- compensation: cancel shipment
```

## Event Schema Design

### Versioning Strategy
```typescript
interface EventEnvelope<T = unknown> {
  eventId: string;
  eventType: string;
  eventVersion: number;
  occurredAt: string;
  producer: string;
  traceId: string;
  data: T;
}

// Version 1 schema
interface OrderPlacedV1 {
  orderId: string;
  customerId: string;
  total: number;
}

// Version 2 schema (added items, deprecated total)
interface OrderPlacedV2 {
  orderId: string;
  customerId: string;
  total: number;        // Deprecated — use items.total
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
    total: number;
  }>;
}
```

### Schema Evolution Rules
- Add fields as optional — never required
- Never remove fields — mark as deprecated instead
- Never rename fields — add the new field, deprecate the old
- Support at least 2 previous versions in consumers

## Event Bus Patterns

### In-Process Event Bus
```typescript
class InProcessEventBus {
  private handlers = new Map<string, Function[]>();

  subscribe(eventType: string, handler: Function): void {
    const handlers = this.handlers.get(eventType) || [];
    handlers.push(handler);
    this.handlers.set(eventType, handlers);
  }

  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.eventType) || [];
    await Promise.allSettled(
      handlers.map(h =>
        h(event).catch(e => {
          logger.error('Event handler failed', { eventType: event.eventType, error: e });
        })
      )
    );
  }
}
```

### Transactional Outbox Pattern
```typescript
// Write event to outbox table in the same transaction as the write
class OutboxPattern {
  async execute(command: CreateOrderCommand): Promise<Result> {
    return this.unitOfWork.execute(async (tx) => {
      const order = Order.create(command);
      await this.orderRepo.save(order, tx);
      
      // Write event to outbox in the SAME transaction
      await this.outboxRepo.save({
        eventId: uuid(),
        eventType: 'OrderPlaced',
        data: { orderId: order.id, customerId: command.customerId },
        status: 'pending',
      }, tx);
      
      return Result.success({ orderId: order.id });
    });
  }
}

// Separate process polls outbox and publishes to broker
class OutboxPublisher {
  async publishPending(): Promise<void> {
    const pending = await this.outboxRepo.findPending(100);
    for (const event of pending) {
      try {
        await this.messageBroker.publish(event.eventType, event.data);
        await this.outboxRepo.markPublished(event.id);
      } catch (error) {
        logger.error('Failed to publish outbox event', { eventId: event.id });
        // Will be retried on next poll
      }
    }
  }
}
```

## Ordering Guarantees

### Kafka Partition Ordering
Events with the same key go to the same partition, preserving order:

```typescript
await producer.send({
  topic: 'order.events',
  messages: [{
    key: orderId, // All events for this order go to the same partition
    value: event,
  }],
});
```

### Out-of-Order Event Handling
```typescript
class OutOfOrderHandler {
  private expectedVersion = new Map<string, number>();

  async handle(event: OrderEvent): Promise<void> {
    const currentVersion = this.expectedVersion.get(event.aggregateId) ?? 0;
    
    if (event.version < currentVersion) {
      logger.warn('Duplicate or out-of-order event', { eventId: event.eventId });
      return; // Already processed
    }
    
    if (event.version > currentVersion + 1) {
      // We missed some events — store for later processing
      await this.pendingStore.save(event);
      logger.warn('Gap detected, storing event', {
        aggregateId: event.aggregateId,
        expected: currentVersion + 1,
        got: event.version,
      });
      return;
    }
    
    await this.processEvent(event);
    this.expectedVersion.set(event.aggregateId, event.version);
    
    // Process any pending events that are now in order
    await this.processPending(event.aggregateId);
  }
}
```

## Error Handling

### Retry with Exponential Backoff
```typescript
class RetryableConsumer {
  private maxRetries = 3;
  private baseDelay = 1000; // 1 second

  async consume(message: Message): Promise<void> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        await this.process(message);
        return; // Success
      } catch (error) {
        logger.error('Processing failed', {
          messageId: message.id,
          attempt,
          error,
        });
        if (attempt < this.maxRetries) {
          await this.delay(this.baseDelay * Math.pow(2, attempt - 1));
        }
      }
    }
    // All retries exhausted — send to DLQ
    await this.sendToDLQ(message);
  }
}
```

## Production Considerations

### Monitoring Events
```typescript
interface EventMetrics {
  produced: number;
  consumed: number;
  failed: number;
  latency_ms: number;  // Time from produce to consume
  lag: number;         // Unprocessed messages
}

// Export via metrics system
metrics.counter('events.produced', { eventType });
metrics.counter('events.consumed', { eventType, consumer });
metrics.counter('events.failed', { eventType, consumer });
metrics.histogram('events.latency_ms', latency, { eventType });
```

### Security
- Event payloads contain no secrets, no PII, no passwords
- Use event schema validation to prevent malformed events
- Authenticate producer identity (mTLS, SASL)
- Encrypt events at rest and in transit

## Anti-Patterns
1. **Domain events crossing service boundaries**: Domain events are in-process. Convert to integration events for cross-service.
2. **Non-idempotent consumers**: Every consumer must handle duplicates.
3. **Synchronous event handlers**: Blocking the producer until all handlers complete.
4. **Future/present tense event names**: Events are facts about the past.
5. **No event schema versioning**: All consumers break when schema changes.
6. **Too many event types**: Each distinct event type has maintenance cost. Consolidate when semantics are the same.
7. **No dead letter queue**: Failed events are lost without recovery path.

## Rules
- Events are facts about the past. Name them in past tense.
- Domain events never cross service boundaries. Convert to integration events at the boundary.
- Every consumer is idempotent. If you write a consumer without idempotency handling, it is a bug.
- Event schemas are backward-compatible. Add fields. Never remove or rename them.
- Event payloads contain no secrets, no PII, no passwords.
- Every event carries a traceId for distributed tracing across service boundaries.
- Use transactional outbox for reliable event publishing.
- Every event has a dead letter queue for failed processing.
- Monitor event latency, lag, and failure rates.

## References
  - references/dead-letter-queue.md — Dead Letter Queue
  - references/event-driven-fundamentals.md — Event-Driven Fundamentals
  - references/event-driven-advanced.md — Event-Driven Advanced Patterns
  - references/event-driven-monitoring.md — Event-Driven Monitoring
  - references/event-driven-testing.md — Event-Driven Testing
  - references/event-governance.md — Event Governance
  - references/event-notification-patterns.md — Event Notification Patterns
  - references/event-schema-management.md — Event Schema Management
  - references/messaging-patterns.md — Messaging & Event-Driven Patterns
  - references/saga-choreography.md — Saga and Choreography Patterns
## Handoff
No artifact produced.
Next skill: backend-testing — test event consumers, idempotency, DLQ handling.
Carry forward: event catalog, message broker choice, saga definitions.
## Implementation Patterns

### Observer Pattern for Event Handling
`
interface EventObserver<T> {
  onEvent(event: T): Promise<void>;
}

class EventBus<T> {
  private observers: Set<EventObserver<T>> = new Set();
  subscribe(observer: EventObserver<T>): void {
    this.observers.add(observer);
  }
  unsubscribe(observer: EventObserver<T>): void {
    this.observers.delete(observer);
  }
  async emit(event: T): Promise<void> {
    const results = Array.from(this.observers).map(o => o.onEvent(event));
    await Promise.allSettled(results);
  }
}
`

### Configuration-Driven Approach
`
config:
  defaults:
    timeout: 30s
    retryCount: 3
  overrides:
    production:
      timeout: 60s
      retryCount: 5
    development:
      timeout: 300s
      retryCount: 1
`

## Production Considerations

### Deployment Checklist
- [ ] Configuration validated against schema before startup
- [ ] Health check endpoints registered and monitored
- [ ] Graceful shutdown with draining period (30s timeout)
- [ ] Resource limits configured (CPU, memory, file descriptors)
- [ ] Log level set appropriate for environment
- [ ] Metrics endpoint secured and exposed
- [ ] Rate limiting configured per-tier
- [ ] TLS certificates valid and auto-renewing
- [ ] Database migrations run as separate deployment step
- [ ] Feature flags ready for gradual rollout

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% over 5min | Critical | Page on-call |
| p99 latency | > 2s over 5min | Warning | Investigate |
| Throughput drop | > 50% over 1min | Critical | Check upstream |
| Queue depth | > 1000 over 1min | Warning | Scale consumers |
| Disk usage | > 85% | Warning | Clean or expand |
| Memory usage | > 90% heap | Critical | Restart or scale |

## Anti-Patterns

| Anti-Pattern | Symptom | Root Cause | Solution |
|-------------|---------|------------|----------|
| Premature optimization | Complex code for no measured benefit | Guessing instead of profiling | Measure first, optimize based on data |
| Copy-paste reuse | Duplicate code across codebase | Lack of abstraction | Extract shared logic into libraries |
| Gold-plating | Features with no current requirement | Over-engineering | YAGNI — build what's needed now |
| Magical thinking | Assumptions without validation | Skipping error handling | Handle all failure modes explicitly |

## Performance Optimization

### Caching Strategy
Cache hierarchy: L1 (in-memory local) → L2 (distributed Redis/Memcached) → L3 (CDN/Edge).
Cache invalidation: TTL-based (simple, stale), event-based (complex, fresh), write-through (consistent, higher write latency), write-behind (fast writes, eventual consistency).

### Resource Pooling
- Database connections: Pool of reusable connections (HikariCP, pgBouncer)
- HTTP connections: Keep-alive + connection pooling for external calls
- Thread pool: Bounded thread pools for async task execution

### Profiling Methodology
1. Establish baseline with production traffic profile
2. Profile CPU with sampling profiler (pprof, perf, async-profiler)
3. Profile memory with heap dumps and allocation tracking
4. Profile I/O with strace/perf trace for syscall analysis
5. Profile latency with distributed tracing (OpenTelemetry)
6. Identify bottleneck, formulate hypothesis, implement fix
7. Re-profile to verify improvement, repeat

## Security Considerations

### Threat Modeling (STRIDE)
- Spoofing: Identity validation, authentication
- Tampering: Integrity checks, digital signatures
- Repudiation: Audit logs, non-repudiation
- Information disclosure: Encryption, access control
- Denial of service: Rate limiting, resource quotas
- Elevation of privilege: Principle of least privilege

### Supply Chain Security
- Dependency scanning: Snyk, Dependabot, Trivy
- SBOM generation: CycloneDX or SPDX format
- Signed commits: GPG or SSH commit signing
- Artifact verification: Checksum validation, signature verification

### Secrets Management
- Secrets never in code — always in secrets manager (Vault, AWS Secrets Manager)
- Rotation policy: Rotate database credentials every 90 days
- Access audit: Log every secrets access, alert on anomalies
- Encryption at rest and in transit for all secrets
- Principle of least privilege: each service gets only its own secrets

## Rules
- Default-deny security posture — allow only explicitly required access.
- All inputs validated, all outputs encoded, all errors handled.
- Defend in depth — multiple layers of security controls.
- Fail securely — errors default to safe behavior.
- Log security-relevant events for audit and investigation.
- Keep dependencies updated — automate vulnerability scanning.
- Design for observability from day one, not as an afterthought.
- Document all architectural decisions with rationale.
- Review code for security, performance, and correctness before merging.