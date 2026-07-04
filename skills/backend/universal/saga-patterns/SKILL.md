---
name: saga-patterns
description: >
  Universal skill for designing, implementing, and managing Saga distributed
  transaction patterns including both Choreography and Orchestration.
  Handles state management, compensating transactions, and resilience 
  in distributed microservice architectures.
version: "2.0.0"
author: j4flmao
license: MIT
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags:
  - backend
  - universal
  - saga
  - microservices
  - transactions
  - choreography
  - orchestration
  - compensating-transactions
---

# Saga Patterns

## Purpose
The Saga Patterns skill is an advanced capability module designed to provide intelligent agents and harness engineering tools with the necessary knowledge and procedural capabilities to handle complex distributed transactions. Traditional monolithic ACID (Atomicity, Consistency, Isolation, Durability) transactions fail in distributed microservice architectures due to the necessity of acquiring locks across disparate database systems and services, which degrades performance and resilience. Instead, the BASE (Basically Available, Soft state, Eventual consistency) model necessitates Saga patterns. This skill outlines detailed procedures, design guidelines, and implementation strategies for building scalable, resilient Sagas using both Choreography (event-driven, decentralized) and Orchestration (centralized controller) approaches. It ensures that agents can generate, audit, and refactor Saga implementations, guaranteeing that compensating transactions are properly aligned, state machines are rigorously defined, and failure scenarios are comprehensively mitigated.

## Core Principles
1. **Eventual Consistency Over Immediate Consistency**: Recognize that in a distributed system, achieving immediate consistency across service boundaries is highly costly. Design sagas to reconcile state asynchronously and handle intermediary "pending" states gracefully.
2. **Idempotency is Mandatory**: Every participant in a saga must expose idempotent endpoints. Given the possibility of network failures, retries, and duplicate message delivery, identical events processed multiple times must yield the exact same system state.
3. **Compensating Transactions Must Be Reversible**: For every forward action (e.g., deducting inventory), a strictly correlated compensating action (e.g., restoring inventory) must exist. Compensations must never fail due to business logic, only due to transient infrastructure issues (which require retries or manual intervention).
4. **Isolate State Management**: Maintain clear boundaries for saga state. In orchestrator-led sagas, the central coordinator must persist the precise step and state of the transaction. In choreography, each local service must independently manage and audit its subset of the saga state.
5. **Assume Inevitable Failure**: Network partitions, process crashes, and dependency timeouts will occur. Sagas must be designed with robust retry policies, exponential backoffs, circuit breakers, and comprehensive dead-letter queue (DLQ) mechanisms to handle prolonged outages gracefully.

## Agent Protocol

### Triggers
- When requested to design a distributed transaction across microservices.
- When an existing microservice transaction suffers from deadlocks or timeouts.
- When an agent must implement a compensating action for a failed operation.
- When evaluating the choice between orchestration and choreography for an event-driven system.

### Input Context Required
- Architecture topology and microservice definitions.
- Event broker or message bus specifications (Kafka, RabbitMQ, SNS/SQS).
- Database types and schemas of participating services.
- Business rules mapping forward transactions to their exact compensating counterparts.

### Output Artifact
- Saga State Machine Definition (JSON/YAML).
- Sequence Diagrams (ASCII).
- Orchestrator or Choreography Boilerplate Code.
- Compensation Mapping Tables.

### Response Formats
```json
{
  "saga_id": "order_fulfillment_saga",
  "pattern_type": "orchestration",
  "participants": [
    "OrderService",
    "InventoryService",
    "PaymentService"
  ],
  "steps": [
    {
      "step": 1,
      "service": "InventoryService",
      "action": "reserve_stock",
      "compensation": "release_stock"
    },
    {
      "step": 2,
      "service": "PaymentService",
      "action": "process_payment",
      "compensation": "refund_payment"
    }
  ],
  "current_status": "configured"
}
```

## Decision Matrix

```text
                        [Is the transaction distributed?]
                                   |
                  +----------------+----------------+
                 Yes                               No
                  |                                 |
      [Number of participating services]        [Use local ACID tx]
                  |
        +---------+---------+
      2-4                 > 4
        |                   |
 [Are domains   [Centralized control
  tightly        needed for auditing?]
  coupled?]                 |
        |             +-----+-----+
   +----+----+      Yes          No
  Yes       No       |            |
   |         |       |            |
[Use       [Use   [Use         [Use
Choreo]    Orche] Orchestration] Choreography]
```

## Detailed Architectural Overview

### Architecture Diagram

```text
                           +---------------------------+
                           |      Saga Orchestrator    |
                           |                           |
                           |   +-------------------+   |
                           |   | State Machine Log |   |
                           |   +-------------------+   |
                           |             |             |
                           +-------------+-------------+
                               /         |         \
                    (Command) / (Event)  | (Cmd)    \ (Event)
                             v           |           v
                 +---------------+       |     +---------------+
                 | Order Service |       |     | Payment Svc   |
                 +---------------+       |     +---------------+
                         |               v             |
                         |        +---------------+    |
                         +------->| Inventory Svc |<---+
                                  +---------------+
```

### Lifecycle Diagram

```text
[Saga Start]
     |
     v
[Execute Step 1] ---> (Success) ---> [Execute Step 2]
     |                                      |
 (Failure)                              (Failure)
     |                                      |
     v                                      v
[Abort Saga]                      [Execute Compensation 1]
                                            |
                                            v
                                      [Abort Saga]
```

## Workflow Steps

### Phase 1: Requirement Gathering and Domain Analysis
1. Identify all services that must participate in the distributed transaction.
2. Document the exact forward operations required from each service.
3. Map out the compensating operations for every forward action.
4. Determine the business constraints, such as timeout thresholds and SLAs.

### Phase 2: Pattern Selection
1. Evaluate the number of participants. If more than 4, strongly prefer orchestration.
2. Assess the auditing requirements. Centralized logging favors orchestration.
3. Determine coupling constraints. Choreography reduces single-point-of-failure risks.
4. Finalize the pattern and document the decision rationale.

### Phase 3: Message and Event Design
1. Define the event schemas for all triggers, commands, and domain events.
2. Establish correlation IDs to trace the saga lifecycle across disparate systems.
3. Define the routing topologies (topics, queues, exchanges).
4. Implement schema registries to prevent breaking changes in event structures.

### Phase 4: State Management Definition
1. Design the state machine for the saga (PENDING, COMPLETED, ABORTED, COMPENSATING, COMPENSATED).
2. Choose a durable data store for the saga log (Event Store, DynamoDB, PostgreSQL).
3. Ensure atomicity between the local state update and the outgoing message (Outbox Pattern).
4. Configure snapshotting if the state machine becomes excessively large.

### Phase 5: Implementation and Idempotency
1. Implement the local transaction logic in each participant.
2. Enforce idempotency using unique constraints on correlation IDs or idempotency keys.
3. Develop the compensating handlers, ensuring they cannot fail due to business rules.
4. Implement retry loops with exponential backoff for transient failures.

### Phase 6: Observability and Testing
1. Configure distributed tracing (OpenTelemetry, Jaeger) propagating trace and correlation IDs.
2. Develop chaos engineering tests to simulate network partitions and node crashes mid-saga.
3. Verify that compensating transactions fire correctly under all failure scenarios.
4. Deploy comprehensive dashboards to monitor saga success rates and durations.

## Extended Troubleshooting Guide

| Symptom | Primary Cause | Mitigation Action |
|---------|---------------|-------------------|
| Ghost records created despite saga failure | Compensating transaction failed to execute | Verify DLQ and setup alerts. Ensure compensation is idempotent and retried infinitely on transient errors. |
| Duplicate execution of saga steps | Lack of idempotency in participant service | Implement idempotency keys using Redis or database unique constraints based on message ID. |
| Out-of-order message delivery | Asynchronous broker delivering events unpredictably | Use orchestrator state machine to reject or queue out-of-order messages until prerequisite states are met. |
| Orchestrator becomes a bottleneck | Database locking or insufficient scaling of orchestrator | Shard the saga state store and horizontally scale orchestrator workers. Switch to event sourcing. |
| Saga stuck in PENDING state indefinitely | Participant service failed to respond and no timeout set | Implement a global timeout mechanism via a cron or scheduled event to automatically trigger compensations. |
| Dual-write inconsistency | Local DB updated but event failed to publish | Implement the Transactional Outbox pattern to atomically commit both state and message intent. |
| Compensation fails due to business rule | Poorly designed compensating logic | Redesign business logic. Compensations must logically always succeed (e.g., refunding money must bypass balance checks). |

## Complete Execution Scenario

```text
[START] Order Created
   |
   +--> [Orchestrator] Receives CreateOrder Command
           |
           +--> Logs State: PENDING
           |
           +--> Sends Command: ReserveInventory
           |
[Inventory Service] <-- Command
   |
   +--> Updates Local DB
   |
   +--> Publishes Event: InventoryReserved
           |
[Orchestrator] <-- Event
   |
   +--> Logs State: INVENTORY_RESERVED
   |
   +--> Sends Command: ProcessPayment
           |
[Payment Service] <-- Command
   |
   +--> External API Call Fails (Timeout)
   |
   +--> Publishes Event: PaymentFailed
           |
[Orchestrator] <-- Event
   |
   +--> Logs State: PAYMENT_FAILED
   |
   +--> Sends Command: ReleaseInventory (Compensation)
           |
[Inventory Service] <-- Command
   |
   +--> Restores Local DB
   |
   +--> Publishes Event: InventoryReleased
           |
[Orchestrator] <-- Event
   |
   +--> Logs State: ABORTED
[END]
```

## Rules and Guidelines
1. **Never use synchronous HTTP calls** within a saga step; rely entirely on asynchronous messaging.
2. **Always implement the Outbox Pattern** to prevent dual-write anomalies where the database updates but the event is lost.
3. **Compensations must be infallible**; they should only fail due to external infrastructure issues, never domain logic validations.
4. **Include standard metadata** (correlation_id, trace_id, timestamp, idempotency_key) in every single event payload.
5. **Limit Saga complexity**; if a saga involves more than 6-7 services, re-evaluate domain boundaries as services may be too micro.

## Reference Guides
- [Architecture Patterns](references/architecture-patterns.md)
- [State Management](references/state-management.md)
- [Performance Optimization](references/performance-optimization.md)
- [Security Best Practices](references/security-best-practices.md)
- [Testing Strategies](references/testing-strategies.md)
- [Deployment Pipelines](references/deployment-pipelines.md)
- [Error Handling](references/error-handling.md)
- [Code Organization](references/code-organization.md)

## Handoff
- When designing distributed systems that rely on asynchronous communication, refer to the `event-driven-architecture` skill.
- For implementing the mandatory dual-write protection mentioned in Rule 2, handoff to the `transactional-outbox` skill.
- For configuring the robust message brokers required by Sagas, refer to the `kafka-streaming` or `rabbitmq-messaging` skills.

<!-- Compression Footer: {"type":"skill","topic":"saga-patterns","status":"complete","version":"2.0.0"} -->