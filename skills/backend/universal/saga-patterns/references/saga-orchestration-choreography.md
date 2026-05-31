# Saga Orchestration vs Choreography

## Overview

Sagas are the primary pattern for managing distributed transactions across microservices. Two implementation approaches dominate: choreography (decentralized event-driven coordination) and orchestration (centralized command-driven coordination). This reference provides a deep comparison of both approaches, when to use each, implementation patterns for both, and guidance for evolving between them as system complexity grows.

## Conceptual Model

### Choreography

In a choreography saga, each service involved in the transaction knows what to do when it receives a specific event and emits events that trigger the next service in the flow. There is no central coordinator, no single point of control. Services communicate entirely through events.

```
Service A          Service B          Service C
   │                  │                  │
   │── Event: Step1 ──▶                  │
   │  (Step1 Done)    │                  │
   │                  │── Event: Step2 ──▶
   │                  │  (Step2 Done)    │
   │                  │                  │── (Complete)
   │                  │                  │
   │◀── Event: Fail ──┤                  │
   │  (Compensate A)  │                  │
```

### Orchestration

In an orchestration saga, a central orchestrator (also called a saga manager or coordinator) explicitly tells each service what to do, awaits the result, and decides what to do next. The orchestrator encapsulates the entire flow logic.

```
             ┌──────────────┐
             │ Orchestrator │
             └──────┬───────┘
        ┌───────────┼───────────┐
        │           │           │
  ┌─────▼───┐ ┌─────▼───┐ ┌─────▼───┐
  │Service A│ │Service B│ │Service C│
  └─────────┘ └─────────┘ └─────────┘
```

## Detailed Comparison

| Dimension | Choreography | Orchestration |
|-----------|-------------|---------------|
| Control flow | Implicit (event-driven) | Explicit (state machine) |
| Communication pattern | Publish-subscribe | Command-response |
| Service coupling | Looser (only know event schema) | Tighter (know orchestrator API) |
| Flow visibility | Distributed, hard to trace | Centralized, easy to monitor |
| Failure handling | Distributed per-service | Centralized, consistent |
| Testing complexity | High (need full event bus) | Lower (can mock services) |
| Recovery | Complex (replay events) | Simpler (replay saga from store) |
| Scalability | High (event-driven, async) | Medium (orchestrator is bottleneck) |
| Latency | Lower (direct event handling) | Higher (coordinator hop) |
| Adding services | Easy (subscribe to events) | Needs orchestrator update |
| Debugging | Hard (follow event chain) | Easier (check orchestrator state) |
| Transaction boundary | Implicit | Explicit |

## When to Use Each

### Choose Choreography When

1. **Simple linear flows with 2-3 services**: The flow is straightforward with no branching, joining, or conditional logic.
2. **Services are autonomous teams**: Each service team can independently decide how to react to events without coordinating with other teams.
3. **High scalability is required**: Async event processing allows each service to scale independently based on its own load profile.
4. **Low latency is critical**: Removing the orchestrator hop reduces per-request latency.
5. **Service coupling must be minimized**: Services should not know about each other's existence.

Example: Order placement with Inventory Check -> Payment -> Notification.

### Choose Orchestration When

1. **Complex flows with 4+ services**: Multiple steps with branching, parallel execution, or conditional logic.
2. **Strong consistency requirements**: Need explicit control over failure handling and compensation order.
3. **Long-running sagas**: Sagas that span hours or days need a durable coordinator to manage state and recovery.
4. **Compliance and audit requirements**: Need a single source of truth for the full transaction lifecycle.
5. **Multiple teams need visibility**: Operations teams need a central dashboard to monitor saga health.

Example: Loan application process with Credit Check -> Document Verification -> Risk Assessment -> Approval -> Disbursement (many branches and conditions).

## Choreography Implementation Patterns

### Pattern 1: Event-Driven Choreography

```typescript
// Event definitions shared across services
interface DomainEvent {
  eventId: string;
  sagaId: string;
  type: string;
  timestamp: string;
  data: Record<string, unknown>;
}

// Order Service
class OrderService {
  constructor(private eventBus: EventBus, private orderRepo: OrderRepository) {}

  async createOrder(command: CreateOrderCommand): Promise<void> {
    const order = Order.createPending(command.items);
    await this.orderRepo.save(order);

    await this.eventBus.publish({
      eventId: uuid(),
      sagaId: order.id,
      type: 'OrderCreated',
      timestamp: new Date().toISOString(),
      data: { orderId: order.id, items: command.items, total: order.total },
    });
  }

  async onPaymentProcessed(event: DomainEvent): Promise<void> {
    const { orderId, transactionId } = event.data as PaymentProcessedData;
    await this.orderRepo.updateStatus(orderId, 'confirmed', { transactionId });
  }

  async onPaymentFailed(event: DomainEvent): Promise<void> {
    const { orderId, reason } = event.data as PaymentFailedData;
    await this.orderRepo.updateStatus(orderId, 'cancelled', { cancelReason: reason });
  }
}

// Payment Service
class PaymentService {
  constructor(private eventBus: EventBus, private paymentRepo: PaymentRepository) {}

  async onOrderCreated(event: DomainEvent): Promise<void> {
    const { orderId, total } = event.data as OrderCreatedData;

    try {
      const charge = await this.processCharge(total);
      await this.paymentRepo.save({ orderId, chargeId: charge.id, status: 'completed' });

      await this.eventBus.publish({
        eventId: uuid(),
        sagaId: orderId,
        type: 'PaymentProcessed',
        timestamp: new Date().toISOString(),
        data: { orderId, transactionId: charge.id },
      });
    } catch (error) {
      await this.eventBus.publish({
        eventId: uuid(),
        sagaId: orderId,
        type: 'PaymentFailed',
        timestamp: new Date().toISOString(),
        data: { orderId, reason: error.message },
      });
    }
  }
}
```

### Pattern 2: Outbox Pattern for Reliable Event Publishing

The outbox pattern ensures that event publishing is atomic with the database transaction:

```sql
CREATE TABLE outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type VARCHAR(100) NOT NULL,
  aggregate_id VARCHAR(100) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_outbox_unprocessed ON outbox(created_at) WHERE processed_at IS NULL;
```

```typescript
class OutboxPublisher {
  constructor(
    private db: Database,
    private eventBus: EventBus,
  ) {}

  async publishEvents(): Promise<void> {
    const events = await this.db.query(
      `SELECT * FROM outbox WHERE processed_at IS NULL ORDER BY created_at LIMIT 100 FOR UPDATE SKIP LOCKED`
    );

    for (const event of events) {
      try {
        await this.eventBus.publish({
          eventId: event.id,
          type: event.event_type,
          data: event.event_data,
        });
        await this.db.query(
          `UPDATE outbox SET processed_at = now() WHERE id = $1`,
          [event.id]
        );
      } catch (err) {
        await this.db.query(
          `UPDATE outbox SET retry_count = COALESCE(retry_count, 0) + 1 WHERE id = $1`,
          [event.id]
        );
      }
    }
  }
}
```

### Pattern 3: Saga Correlation with Message Headers

```typescript
interface MessageHeaders {
  sagaId: string;
  sagaType: string;
  stepName: string;
  causationId: string;  // ID of the event that caused this event
  correlationId: string; // Business identifier
}

class ChoreographySagaContext {
  private events: DomainEvent[] = [];

  constructor(
    readonly sagaId: string,
    readonly sagaType: string,
  ) {}

  createEvent(type: string, data: Record<string, unknown>, causationId: string): DomainEvent {
    const event: DomainEvent = {
      eventId: uuid(),
      sagaId: this.sagaId,
      sagaType: this.sagaType,
      type,
      causationId,
      timestamp: new Date().toISOString(),
      data,
      headers: {
        sagaId: this.sagaId,
        sagaType: this.sagaType,
        causationId,
      },
    };
    this.events.push(event);
    return event;
  }
}
```

## Orchestration Implementation Patterns

### Pattern 1: State Machine Orchestrator

```typescript
enum SagaState {
  PENDING = 'PENDING',
  STEP_COMPLETED = 'STEP_COMPLETED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  COMPENSATING = 'COMPENSATING',
}

interface SagaStep {
  name: string;
  action: (saga: Saga) => Promise<void>;
  compensation: (saga: Saga) => Promise<void>;
  timeoutMs: number;
  retryConfig: {
    maxRetries: number;
    backoffMs: number;
  };
}

class StateMachineOrchestrator {
  constructor(private sagaStore: SagaStore) {}

  async execute(sagaType: string, sagaId: string, steps: SagaStep[]): Promise<void> {
    const saga = await this.sagaStore.create(sagaType, sagaId);

    for (const step of steps) {
      const executed = await this.executeWithRetry(saga, step);
      if (!executed) {
        await this.executeCompensations(saga, steps);
        return;
      }
    }

    await this.sagaStore.complete(saga);
  }

  private async executeWithRetry(saga: Saga, step: SagaStep): Promise<boolean> {
    let lastError: Error;

    for (let attempt = 1; attempt <= step.retryConfig.maxRetries; attempt++) {
      try {
        const result = await withTimeout(
          step.action(saga),
          step.timeoutMs,
        );
        saga.addCompletedStep(step.name, result);
        await this.sagaStore.save(saga);
        return true;
      } catch (err) {
        lastError = err;
        saga.addRetryAttempt(step.name, attempt, err.message);
        await this.sagaStore.save(saga);
        if (attempt < step.retryConfig.maxRetries) {
          await sleep(step.retryConfig.backoffMs * Math.pow(2, attempt - 1));
        }
      }
    }

    saga.setFailedStep(step.name, lastError.message);
    await this.sagaStore.save(saga);
    return false;
  }

  private async executeCompensations(saga: Saga, steps: SagaStep[]): Promise<void> {
    saga.markCompensating();
    await this.sagaStore.save(saga);

    // Execute compensations in reverse order
    for (const step of steps.reverse()) {
      if (saga.hasCompleted(step.name)) {
        try {
          await step.compensation(saga);
          saga.markStepCompensated(step.name);
          await this.sagaStore.save(saga);
        } catch (err) {
          // Log compensation failure, continue with remaining compensations
          saga.markStepCompensationFailed(step.name, err.message);
          await this.sagaStore.save(saga);
        }
      }
    }

    saga.markFailed();
    await this.sagaStore.save(saga);
  }
}
```

### Pattern 2: Saga Recovery Background Process

```typescript
class SagaRecoveryProcess {
  constructor(
    private sagaStore: SagaStore,
    private orchestrator: StateMachineOrchestrator,
  ) {}

  async recoverStuckSagas(): Promise<void> {
    const stuckSagas = await this.sagaStore.findByStatus(SagaState.PENDING, {
      olderThan: '5 minutes',
    });

    for (const saga of stuckSagas.entries) {
      saga.incrementRecoveryAttempt();
      await this.sagaStore.save(saga);

      try {
        const sagaDefinition = this.getDefinition(saga.sagaType);
        await this.orchestrator.resume(saga, sagaDefinition);
      } catch (err) {
        await this.sagaStore.markRecoveryFailed(saga.id, err.message);
        // Escalate to manual intervention after N recovery failures
        if (saga.recoveryAttempt > 5) {
          await this.escalateToOps(saga);
        }
      }
    }
  }

  private async escalateToOps(saga: Saga): Promise<void> {
    await opsAlert.send({
      type: 'saga_recovery_failed',
      sagaId: saga.id,
      sagaType: saga.sagaType,
      lastStep: saga.failedStep,
      recoveryAttempts: saga.recoveryAttempt,
      data: saga.data,
    });
  }
}
```

### Pattern 3: Parallel Step Execution in Orchestration

```typescript
class ParallelStepOrchestrator {
  async executeParallel(saga: Saga, parallelSteps: SagaStep[][]): Promise<void> {
    for (const stepGroup of parallelSteps) {
      if (stepGroup.length === 1) {
        // Sequential step
        await this.executeSingleStep(saga, stepGroup[0]);
      } else {
        // Parallel steps
        const results = await Promise.allSettled(
          stepGroup.map(step => this.executeSingleStep(saga, step))
        );

        const failures = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[];
        if (failures.length > 0) {
          // All parallel groups fail together — compensate all completed
          await this.compensateAll(saga, stepGroup);
          throw new SagaError('Parallel step group failed', failures);
        }
      }
    }
  }

  private async executeSingleStep(saga: Saga, step: SagaStep): Promise<void> {
    const result = await step.action(saga);
    saga.addCompletedStep(step.name, result);
    await this.sagaStore.save(saga);
  }
}
```

## Saga Type Selection Matrix

```
                    Number of Services
                 2-3        4-6        7+
        ┌─────────────────────────────────────
Simple  │ Choreography  │ Orchestration │ Orchestration
Flow    │               │               │
        │               │               │
Complex │ Orchestration │ Orchestration │ Orchestration (consider
Flow    │               │               │ breaking into sub-sagas)
        │               │               │
Branching│Orchestration │ Orchestration │ Sub-sagas +
         │              │               │ orchestration
```

## Evolving Between Approaches

### Start with Choreography, Evolve to Orchestration

It is common to start with choreography for simplicity and later introduce an orchestrator as complexity grows:

```typescript
class ChoreographyToOrchestrationAdapter {
  // Phase 1: Services emit events directly (choreography)
  // Phase 2: Introduce orchestrator that subscribes to events and issues commands
  // Phase 3: Services stop emitting saga events directly — only orchestrator orchestrates

  async transitionPhase(orderId: string): Promise<void> {
    // Phase 1 — original choreography
    // Order Service -> emits OrderCreated
    // Payment Service -> receives OrderCreated, emits PaymentProcessed
    // Inventory Service -> receives PaymentProcessed, emits InventoryReserved

    // Phase 2 — orchestrator introduced
    // Orchestrator subscribes to all events, starts monitoring flow
    // Services continue emitting events

    // Phase 3 — orchestrator takes over
    // Orchestrator emits commands instead of reacting to events
    // Services execute commands and return results
  }
}
```

### Hybrid: Event-Driven Orchestration

The orchestrator itself uses events to drive the saga, combining the durability of event sourcing with the explicit control of orchestration:

```typescript
class EventDrivenOrchestrator {
  // Orchestrator emits command events
  // Services respond with result events
  // Orchestrator handles all result events through a single handler

  async handleEvent(event: SagaEvent): Promise<void> {
    const saga = await this.sagaStore.load(event.sagaId);

    switch (event.type) {
      case 'SagaStarted':
        await this.emit(saga, 'ReserveInventory', event);
        break;
      case 'InventoryReserved':
        await this.emit(saga, 'ProcessPayment', event);
        break;
      case 'PaymentProcessed':
        await this.emit(saga, 'ConfirmOrder', event);
        break;
      case 'PaymentFailed':
        await this.emit(saga, 'CancelReservation', event); // Compensation
        break;
      case 'InventoryReservationFailed':
        await this.failSaga(saga, event);
        break;
    }
  }
}
```

## Testing Strategies

### Testing Choreography Sagas

```typescript
describe('Choreography Saga', () => {
  let eventBus: InMemoryEventBus;
  let orderService: OrderService;
  let paymentService: PaymentService;

  beforeEach(() => {
    eventBus = new InMemoryEventBus();
    orderService = new OrderService(eventBus, new InMemoryOrderRepo());
    paymentService = new PaymentService(eventBus, new InMemoryPaymentRepo());

    eventBus.registerHandler('OrderCreated', paymentService.onOrderCreated.bind(paymentService));
    eventBus.registerHandler('PaymentProcessed', orderService.onPaymentProcessed.bind(orderService));
    eventBus.registerHandler('PaymentFailed', orderService.onPaymentFailed.bind(orderService));
  });

  it('should complete full happy path', async () => {
    await orderService.createOrder({ customerId: 'c1', items: ['item1'], total: 100 });

    const order = await orderService.getOrder('order-1');
    expect(order.status).toBe('confirmed');
  });

  it('should trigger compensation on payment failure', async () => {
    paymentService.setShouldFail(true);
    await orderService.createOrder({ customerId: 'c1', items: ['item1'], total: 100 });

    const order = await orderService.getOrder('order-1');
    expect(order.status).toBe('cancelled');
  });

  it('should handle out-of-order events gracefully', async () => {
    // Simulate network delay causing events to arrive in wrong order
    eventBus.simulateDelay('PaymentProcessed', 1000);
    await orderService.createOrder({ customerId: 'c1', items: ['item1'], total: 100 });

    const order = await orderService.getOrder('order-1');
    expect(order.status).toBe('confirmed'); // Idempotent handling ensures correctness
  });
});
```

### Testing Orchestration Sagas

```typescript
describe('Orchestration Saga', () => {
  let orchestrator: OrderOrchestrator;
  let sagaStore: InMemorySagaStore;
  let inventoryClient: MockInventoryClient;
  let paymentClient: MockPaymentClient;

  beforeEach(() => {
    sagaStore = new InMemorySagaStore();
    inventoryClient = new MockInventoryClient();
    paymentClient = new MockPaymentClient();
    orchestrator = new OrderOrchestrator(sagaStore, inventoryClient, paymentClient);
  });

  it('should complete all steps successfully', async () => {
    await orchestrator.start('order-1');

    const saga = await sagaStore.load('order-1');
    expect(saga.status).toBe('COMPLETED');
    expect(saga.completedSteps).toEqual(['reserveInventory', 'processPayment', 'confirmOrder']);
  });

  it('should trigger full compensation on step failure', async () => {
    paymentClient.shouldFail = true;
    await orchestrator.start('order-1');

    const saga = await sagaStore.load('order-1');
    expect(saga.status).toBe('FAILED');
    expect(inventoryClient.releaseCalled).toBe(true);  // Compensation was executed
    expect(paymentClient.refundCalled).toBe(false);     // No need to refund what wasn't charged
  });

  it('should resume after orchestrator crash and restart', async () => {
    // Simulate crash mid-way
    inventoryClient.shouldHang = true;
    orchestrator.start('order-1').catch(() => {});

    // Restart orchestrator with recovery
    orchestrator = new OrderOrchestrator(sagaStore, inventoryClient, paymentClient);
    inventoryClient.shouldHang = false;
    await orchestrator.recoverStuckSagas();

    const saga = await sagaStore.load('order-1');
    expect(saga.status).toBe('COMPLETED');
  });
});
```

## Monitoring and Observability

### Key Metrics

```prometheus
# Orchestration metrics
saga_orchestrator_steps_total{saga_type="create_order", status="success"}
saga_orchestrator_steps_total{saga_type="create_order", status="failure"}
saga_orchestrator_duration_seconds{saga_type="create_order"}
saga_orchestrator_compensation_total{saga_type="create_order"}
saga_orchestrator_current_stuck_sagas{saga_type="create_order"}

# Choreography metrics
saga_choreography_events_emitted_total{event_type="OrderCreated"}
saga_choreography_events_consumed_total{event_type="OrderCreated"}
saga_choreography_event_latency_seconds{event_type="OrderCreated"}
saga_choreography_compensation_events_total{event_type="PaymentFailed"}
```

### Distributed Tracing

```typescript
// Propagate trace context through saga steps
interface SagaTraceContext {
  traceId: string;
  sagaId: string;
  stepName: string;
}

class TracedOrchestrator {
  constructor(private tracer: Tracer) {}

  async executeStep(saga: Saga, stepName: string, action: () => Promise<void>): Promise<void> {
    const span = this.tracer.startSpan(`saga.step.${stepName}`, {
      attributes: {
        'saga.id': saga.id,
        'saga.type': saga.sagaType,
        'saga.step': stepName,
        'saga.attempt': saga.getAttemptCount(stepName),
      },
    });

    try {
      await action();
      span.setStatus({ code: SpanStatusCode.OK });
    } catch (err) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
      span.recordException(err);
      throw err;
    } finally {
      span.end();
    }
  }
}
```

## References
- references/compensating-transactions.md — Compensating Transactions
- references/saga-state-management.md — Saga State Management
- references/saga-testing.md — Saga Testing
- references/saga-observability.md — Saga Observability
- references/saga-orchestration.md — Saga Orchestration Patterns
- references/saga-rollback-compensation.md — Saga Rollback and Compensation
