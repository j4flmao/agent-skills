---
name: backend-saga-patterns
description: >
  Use this skill when the user says 'saga', 'distributed transaction', 'choreography saga', 'orchestration saga', 'compensating transaction', 'saga state machine', 'long running transaction', 'saga execution', 'transaction coordinator', 'saga pattern'. This skill enforces: saga for multi-service operations only, clear compensation for every step, saga state persistence, idempotent step execution, failure recovery. Applies to any backend stack. Do NOT use for: single-service transactions (use database transactions), simple pub/sub, or CQRS/event sourcing.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, universal, saga, distributed-systems, patterns]
---

# Backend Saga Patterns

## Purpose
Manage distributed operations across multiple services with clear compensation paths for every step, ensuring system consistency without distributed transactions. Sagas are the standard pattern for maintaining data consistency in microservice architectures where a single business operation spans multiple services and databases.

## Architecture/Decision Trees

### Saga Type Decision Tree
```
Do you have 2-3 services with simple linear flow?
  |-- YES --> Can services react to events autonomously?
  |     |-- YES --> Choreography (simpler, more decoupled)
  |     |-- NO  --> Orchestration (need central control)
  |-- NO --> Do you have 4+ services or branching logic?
        |-- YES --> Orchestration (need coordinating state machine)
        |-- NO --> Choreography with event sourcing for audit

Do you need strong consistency guarantees?
  |-- YES --> Orchestration with saga state persistence
  |-- NO --> Choreography (eventual consistency is acceptable)
```

### State Machine Model
```
                    ┌──────────┐
                    │ PENDING  │
                    └────┬─────┘
                         │ start
                    ┌────▼─────┐
              ┌─────│ RUNNING  │─────┐
              │     └────┬─────┘     │
              │          │           │
     all steps       step fails   timeout
     complete         │           │
              │     ┌──▼──┐    ┌──▼──┐
        ┌─────▼─┐ │COM- │  │ TIMED│
        │COMP-  │ │PEN-  │  │ OUT  │
        │LETED  │ │SATING│  └──────┘
        └───────┘ └──┬───┘
                     │ all comps done
                 ┌───▼────┐
                 │ FAILED │
                 └────────┘
```

## Agent Protocol

### Trigger
Exact user phrases: "saga", "distributed transaction", "choreography saga", "orchestration saga", "compensating transaction", "saga state machine", "long running transaction", "saga execution", "transaction coordinator", "saga pattern", "two phase".

### Input Context
- Services involved in the distributed operation.
- Each service's action and its compensation (rollback).
- Consistency requirements (eventual vs strong).
- Whether a saga coordinator service exists.
- Expected failure modes (network, timeout, business validation).
- Existing messaging infrastructure.

### Output Artifact
Saga design as text. No file unless requested.

### Response Format
```
Saga: {name}
Type: {choreography|orchestration}
Coordinator: {service|none}
Steps:
  1. {service}: {action} | compensation: {rollback}
  2. {service}: {action} | compensation: {rollback}
State: {persistence mechanism}
```

### Completion Criteria
- [ ] Every step has a compensating action defined.
- [ ] Compensations are idempotent and safe to execute multiple times.
- [ ] Saga state is persisted (not in-memory only).
- [ ] Each step is idempotent.
- [ ] Failure in any step triggers compensation for all completed steps.
- [ ] Choreography vs orchestration choice is justified.

### Max Response Length
Per saga: 10 lines. Full design: 30 lines.

## Workflow

### Step 1: Choose Saga Type

| Aspect | Choreography | Orchestration |
|--------|-------------|---------------|
| Coordination | Each service emits/consumes events | Central coordinator |
| Complexity | Low (few services, simple flows) | High (many services, complex flows) |
| Coupling | Loose (services only know events) | Tighter (services talk to coordinator) |
| Visibility | Hard to trace full flow | Single point to monitor |
| Failure handling | Distributed (each service handles) | Centralized (coordinator manages) |
| Best for | 2-3 services, simple linear flows | 4+ services, branching/conditional flows |

### Step 2: Choreography Saga

```typescript
// Order Service
async function handleCreateOrder(command: CreateOrderCommand): Promise<void> {
  const order = Order.createPending(command);
  await orderRepo.save(order);
  await eventBus.publish(new OrderCreatedEvent(order.id, command.customerId, command.items));
}

// On OrderCreated -> Payment Service processes payment
async function handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
  try {
    const payment = await paymentService.processPayment(event.data.customerId, event.data.total);
    await eventBus.publish(new PaymentProcessedEvent(event.data.orderId, payment.transactionId));
  } catch (err) {
    await eventBus.publish(new PaymentFailedEvent(event.data.orderId, err.message));
  }
}

// On PaymentFailed -> Order Service cancels order (compensation)
async function handlePaymentFailed(event: PaymentFailedEvent): Promise<void> {
  const order = await orderRepo.findById(event.data.orderId);
  order.cancel('Payment failed: ' + event.data.reason);
  await orderRepo.save(order);
  await eventBus.publish(new OrderCancelledEvent(order.id));
}
```

### Step 3: Orchestration Saga

```typescript
class OrderOrchestrator {
  private sagaStore: ISagaStore;

  async start(orderId: string): Promise<void> {
    const saga = Saga.create('createOrder', orderId);
    await this.sagaStore.save(saga);
    await this.step1_ReserveInventory(saga);
  }

  private async step1_ReserveInventory(saga: Saga): Promise<void> {
    try {
      await inventoryClient.reserve(saga.data.orderId, saga.data.items);
      saga.stepCompleted('reserveInventory');
      await this.sagaStore.save(saga);
      await this.step2_ProcessPayment(saga);
    } catch (err) {
      await this.fail(saga, 'reserveInventory', err);
    }
  }

  private async step2_ProcessPayment(saga: Saga): Promise<void> {
    try {
      await paymentClient.charge(saga.data.orderId, saga.data.total);
      saga.stepCompleted('processPayment');
      await this.sagaStore.save(saga);
      await this.step3_ConfirmOrder(saga);
    } catch (err) {
      await this.compensate(saga, 'processPayment');
    }
  }

  private async step3_ConfirmOrder(saga: Saga): Promise<void> {
    await orderClient.confirm(saga.data.orderId);
    saga.complete();
    await this.sagaStore.save(saga);
  }

  private async compensate(saga: Saga, failedStep: string): Promise<void> {
    const compensations: Record<string, () => Promise<void>> = {
      processPayment: async () => await paymentClient.refund(saga.data.orderId),
      reserveInventory: async () => await inventoryClient.release(saga.data.orderId),
    };
    const steps = saga.completedSteps.reverse();
    for (const step of steps) {
      if (compensations[step]) {
        await compensations[step]();
      }
    }
    saga.fail(failedStep);
    await this.sagaStore.save(saga);
  }
}
```

### Step 4: Saga State Persistence

```sql
CREATE TABLE saga_state (
  id UUID PRIMARY KEY,
  saga_type VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL,
  data JSONB NOT NULL,
  completed_steps TEXT[] NOT NULL DEFAULT '{}',
  failed_step VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);
```

### Step 5: Handle Failures and Retries

```typescript
// Each step must be idempotent
async function handlePaymentStep(saga: Saga): Promise<void> {
  const existing = await paymentClient.getPaymentStatus(saga.data.orderId);
  if (existing.status === 'completed') {
    return;
  }
  if (existing.status === 'failed') {
    throw new Error('Payment previously failed');
  }
  await paymentClient.charge(saga.data.orderId, saga.data.total);
}

// Retry with backoff for transient failures
async function executeWithRetry(step: () => Promise<void>, maxRetries = 3): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await step();
      return;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      await sleep(Math.pow(2, attempt) * 1000);
    }
  }
}
```

## Rules
- Every step MUST have a compensating action. No exceptions.
- Compensations must be idempotent — running them twice produces the same result as running once.
- Saga state is persisted in a database, not in memory. A saga must survive service restart.
- Use choreography for simple linear flows with 2-3 services. Use orchestration for complex or branching flows.
- Each saga step is idempotent — safe to retry.
- If a saga cannot complete after exhausting retries, it enters a FAILED state requiring manual intervention.
- Log every saga state transition for observability and debugging.
- Never execute compensations for steps that have not completed yet.
- Always use distributed tracing IDs that propagate through all saga steps.
- Timeout handling: set per-step timeouts, not just overall saga timeout.
- Saga steps should be stateless — all state lives in the saga store.
- Never mix synchronous (2PC) and saga patterns in the same flow.

## Best Practices
- Model sagas as explicit state machines with defined transitions.
- Use saga orchestrators as a separate service (not embedded in business logic).
- Implement saga recovery with a background process that scans for stuck sagas.
- Version your saga definitions to handle long-running sagas that span deployments.
- Test compensations independently before testing the full saga flow.
- Use outbox pattern to guarantee event delivery for choreography sagas.
- Monitor saga duration and alert on sagas exceeding expected completion time.

## Common Pitfalls
- **Missing compensation for a step**: Always define compensation at the same time as the forward action. If compensation is impossible, redesign the step.
- **Non-idempotent steps**: If retrying a step creates duplicate side effects (double charge, duplicate reservation), the saga is broken. Make every step safe to retry.
- **Compensation failure**: If compensation itself fails, the saga is stuck in COMPENSATING state. Implement retry-with-backoff for compensations too.
- **Orchestrator single point of failure**: If the orchestrator crashes mid-saga, recovery must re-read saga state from the database and resume. Stateless orchestrators are essential.
- **Event ordering in choreography**: Services may receive events out of order. Design for idempotent event handling with deduplication.
- **Leaked resources**: A saga that times out without proper compensation may leave reserved resources (inventory, credits) permanently locked. Implement TTL-based auto-release as a safety net.

## Compensating Transaction Patterns

```typescript
// Forward action + compensation registered together
interface SagaStep<TContext> {
  name: string;
  invoke: (ctx: TContext) => Promise<void>;
  compensate: (ctx: TContext) => Promise<void>;
  retryConfig?: { maxAttempts: number; backoffMs: number };
  timeoutMs?: number;
}

// Compensation failure handling
async function safeCompensate(step: SagaStep, ctx: any): Promise<boolean> {
  try {
    await step.compensate(ctx);
    return true;
  } catch (err) {
    // Log compensation failure, alert ops
    logger.error(`Compensation failed for step ${step.name}`, { error: err });
    await alertOps({
      type: 'compensation_failure',
      step: step.name,
      sagaId: ctx.sagaId,
    });
    // Even if compensation fails, continue to next step
    // Mark saga for manual review
    return false;
  }
}

// Null compensation (for read-only steps)
// Some steps don't need compensation — e.g., sending a notification
// But consider whether the notification is premature if saga fails later
const notificationStep: SagaStep<OrderContext> = {
  name: 'sendConfirmationEmail',
  invoke: async (ctx) => emailService.send(ctx.customerEmail, ctx.orderDetails),
  compensate: async (ctx) => {
    // No undo for email, but log for audit
    logger.info('Email already sent, notified customer of cancellation', { orderId: ctx.orderId });
  },
};
```

## Handling Partial Failures

```typescript
// Saga recovery — scan for stuck sagas periodically
async function recoverStuckSagas(): Promise<void> {
  const stuckSagas = await sagaStore.findStuck({
    status: ['RUNNING', 'COMPENSATING'],
    updatedBefore: new Date(Date.now() - 30_000), // 30s without update
  });

  for (const saga of stuckSagas) {
    logger.warn('Recovering stuck saga', { sagaId: saga.id, status: saga.status });
    if (saga.status === 'COMPENSATING') {
      // Retry remaining compensations
      await orchestrator.continueCompensation(saga);
    } else {
      // Timeout — assume failure, trigger compensation
      await orchestrator.fail(saga, 'Saga timed out');
    }
  }
}

// Timeout per step (not just overall saga)
async function executeWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Step timed out after ${timeoutMs}ms`)), timeoutMs)
  );
  return Promise.race([fn(), timeout]);
}
```

## Parallel Step Execution

```typescript
// For independent steps that can run in parallel
async function executeParallelSteps(saga: Saga, steps: SagaStep[]): Promise<void> {
  const results = await Promise.allSettled(
    steps.map(step => executeWithRetry(() => step.invoke(saga.data), step.retryConfig))
  );

  const failures = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[];
  if (failures.length > 0) {
    // Compensate successful steps, then fail
    const successfulSteps = steps.filter((_, i) => results[i].status === 'fulfilled');
    for (const step of successfulSteps.reverse()) {
      await safeCompensate(step, saga.data);
    }
    throw new Error(`Parallel steps failed: ${failures.map(f => f.reason).join(', ')}`);
  }
}
```

## Monitoring and Alerting

```typescript
// Structured logging for saga observability
logger.info('Saga step completed', {
  sagaId: saga.id,
  sagaType: saga.type,
  step: 'processPayment',
  status: 'completed',
  duration: 120, // ms
  compensation: false,
});

// Metrics to monitor
// 1. Saga duration (p50, p95, p99) — per saga type
// 2. Step success rate — per step name
// 3. Compensation rate — what % of sagas need compensation
// 4. Stuck saga count — sagas in RUNNING state for > 5 minutes
// 5. Dead saga count — sagas in COMPENSATING state for > 10 minutes
```

```typescript
// OpenTelemetry spans for saga tracing
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('saga-orchestrator');

async function executeSagaStep<T>(step: SagaStep<T>, ctx: T): Promise<void> {
  const span = tracer.startSpan(`saga.step.${step.name}`, {
    attributes: {
      'saga.id': ctx['sagaId'],
      'saga.type': ctx['sagaType'],
      'step.name': step.name,
    },
  });

  try {
    await step.invoke(ctx);
    span.setStatus({ code: SpanStatusCode.OK });
  } catch (err) {
    span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
    span.recordException(err);
    throw err;
  } finally {
    span.end();
  }
}
```

## Compared With
| Pattern | Consistency | Coordination | Best For |
|---------|-------------|--------------|----------|
| Saga (Choreography) | Eventual | Decentralized | Simple flows, few services |
| Saga (Orchestration) | Eventual | Centralized | Complex flows, many services |
| Two-Phase Commit (2PC) | Strong | Coordinator | Same-DB or XA transactions |
| BASE (Basic Availability) | Eventual | Varies | High-availability systems |
| Event Sourcing | Eventual | Event store | Audit-heavy domains |
| Outbox + Event | Eventual | Reliable pub | Single service publishing events |

## Performance
- Saga overhead is dominated by inter-service calls and database writes for state persistence.
- Orchestration sagas add latency of the coordinator hop (1-5ms per step).
- Choreography sagas have lower per-step latency but harder end-to-end observability.
- Saga state persistence in PostgreSQL: ~2-5ms per write. Use separate database to avoid contention.
- Compensations should be fast (sub-100ms) to minimize inconsistency window.
- Parallel step execution can significantly reduce total saga duration.
- Cold start of orchestrator (if using serverless): 200ms-2s depending on platform.
- Typical saga completion: 100-500ms for 3-step orchestration with in-AZ services.

## Tooling/Methodology
- **Event stores**: Kafka, EventStoreDB, RabbitMQ for choreography events.
- **Saga frameworks**: Axon Framework (Java), Eventuate Tram, Temporal.io, Camunda.
- **State persistence**: PostgreSQL, DynamoDB, Cosmos DB for saga state tables.
- **Testing**: Testcontainers for integration tests, chaos engineering for failure testing.
- **Monitoring**: OpenTelemetry spans for saga steps, custom metrics for saga duration and status.
- **CI testing pattern**: Unit test each step's compensation independently. Integration test the full saga with a test container for each dependency. Chaos test: randomly fail steps in staging.

## Security

| Risk | Mitigation |
|------|-----------|
| Unauthorized saga creation | Authenticate and authorize saga start commands |
| Step execution without proper context | Validate saga state integrity before each step |
| Compensation replay attacks | Idempotency keys + deduplication in compensation handlers |
| Sensitive data in saga state | Encrypt sensitive fields in saga store, mask in logs |
| Saga store access | Separate DB credentials for saga store, least-privilege access |
| Event spoofing (choreography) | Validate event origin, sign events, use schema registry |

## References
  - references/choreography-vs-orchestration.md — Choreography vs Orchestration
  - references/compensating-transactions.md — Compensating Transactions
  - references/saga-observability.md — Saga Observability
  - references/saga-orchestration.md — Saga Orchestration Patterns
  - references/saga-state-management.md — Saga State Management
  - references/saga-testing.md — Saga Testing
  - references/saga-timeout-handling.md — Saga Timeout Handling
  - references/saga-orchestration-choreography.md — Saga Orchestration vs Choreography Deep Dive
  - references/saga-rollback-compensation.md — Saga Rollback and Compensation
## Handoff
No artifact produced.
Next skill: event-driven — for event-based communication in choreography sagas.
Carry forward: saga type, step definitions, compensation actions, state persistence.
