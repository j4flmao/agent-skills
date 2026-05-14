---
name: backend-event-driven
description: >
  Use this skill when the user says 'event-driven', 'message queue', 'Kafka', 'RabbitMQ', 'pub/sub', 'domain event', 'event sourcing', 'CQRS', 'async messaging', 'event bus', or when designing asynchronous communication between services. This skill enforces: domain vs integration event distinction, event naming (past tense), schema versioning, consumer idempotency, dead letter queues, saga patterns, and event sourcing basics. Applies to Kafka, RabbitMQ, NATS, Redis Pub/Sub, SQS/SNS. Do NOT use for: REST API design, database optimization, or synchronous communication patterns.
version: "1.0.0"
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

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

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

## Workflow

### Step 1: Distinguish Event Types
| Event Type | Scope | Delivery | Schema |
|------------|-------|----------|--------|
| Domain Event | Inside one service (in-process) | In-memory bus, same transaction | Domain object references |
| Integration Event | Between services (cross-process) | Message broker, async, at-least-once | Serialized DTO with version |

Domain events stay inside the service. They never cross service boundaries. Convert domain events to integration events at the service boundary.

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

eventVersion allows schema evolution. Support at least 2 previous versions. Never remove fields from data — only add optional fields.

### Step 4: Consumer Idempotency
Every consumer must handle duplicate deliveries. At-least-once delivery means duplicates are guaranteed.

```typescript
async function handleOrderPlaced(event: OrderPlacedEvent) {
  const processed = await checkProcessed(event.eventId)
  if (processed) return

  await processOrder(event.data)
  await markProcessed(event.eventId)
}
```

Idempotency can be based on eventId (preferred) or a business key (orderId + eventType).

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
- DLQ reprocessing: manual inspection and replay.

### Step 6: Saga Pattern
For operations spanning multiple services:
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

## Rules
- Events are facts about the past. Name them in past tense. Never in future or present tense.
- Domain events never cross service boundaries. Convert to integration events at the boundary.
- Every consumer is idempotent. If you write a consumer without idempotency handling, it is a bug.
- Event schemas are backward-compatible. Add fields. Never remove or rename them.
- Event payloads contain no secrets, no PII, no passwords.
- Every event carries a traceId for distributed tracing across service boundaries.

## References
- `references/messaging-patterns.md` — event schema, consumer idempotency, outbox pattern, retry/DLQ

## Handoff
No artifact produced.
Next skill: backend-testing — test event consumers, idempotency, DLQ handling.
Carry forward: event catalog, message broker choice, saga definitions.
