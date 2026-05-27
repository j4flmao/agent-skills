---
name: backend-saga-patterns
description: >
  Use this skill when the user says 'saga', 'distributed transaction', 'choreography saga', 'orchestration saga', 'compensating transaction', 'saga state machine', 'long running transaction', 'saga execution', 'transaction coordinator', 'saga pattern'. This skill enforces: saga for multi-service operations only, clear compensation for every step, saga state persistence, idempotent step execution, failure recovery. Applies to any backend stack. Do NOT use for: single-service transactions (use database transactions), simple pub/sub, or CQRS/event sourcing.
version: "1.0.0"
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
Manage distributed operations across multiple services with clear compensation paths for every step, ensuring system consistency without distributed transactions.

## Agent Protocol

### Trigger
Exact user phrases: "saga", "distributed transaction", "choreography saga", "orchestration saga", "compensating transaction", "saga state machine", "long running transaction", "saga execution", "transaction coordinator", "saga pattern", "two phase".

### Input Context
- Services involved in the distributed operation.
- Each service's action and its compensation (rollback).
- Consistency requirements (eventual vs strong).
- Whether a saga coordinator service exists.

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
    // Compensation: payment failed — notify order service to cancel
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

    // Execute compensations in reverse order
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
  status VARCHAR(20) NOT NULL, -- RUNNING, COMPLETED, FAILED
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
    return; // Already processed — idempotent
  }
  if (existing.status === 'failed') {
    throw new Error('Payment previously failed');
  }
  // Process fresh
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
      await sleep(Math.pow(2, attempt) * 1000); // 2s, 4s, 8s
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

## References
  - references/choreography-vs-orchestration.md — Choreography vs Orchestration
  - references/compensating-transactions.md — Compensating Transactions
  - references/saga-observability.md — Saga Observability
  - references/saga-orchestration.md — Saga Orchestration Patterns
  - references/saga-state-management.md — Saga State Management
  - references/saga-testing.md — Saga Testing
  - references/saga-timeout-handling.md — Saga Timeout Handling
## Handoff
No artifact produced.
Next skill: event-driven — for event-based communication in choreography sagas.
Carry forward: saga type, step definitions, compensation actions, state persistence.
