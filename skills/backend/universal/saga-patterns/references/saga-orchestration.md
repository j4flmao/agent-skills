# Saga Orchestration Patterns

## Choreography-Based Saga

### Event-Driven Saga
```typescript
class OrderSaga {
  async onOrderCreated(event: OrderCreatedEvent): Promise<void> {
    await this.eventBus.publish('InventoryReserve', {
      orderId: event.orderId,
      items: event.items,
    });
  }

  async onInventoryReserved(event: InventoryReservedEvent): Promise<void> {
    await this.eventBus.publish('PaymentProcess', {
      orderId: event.orderId,
      amount: event.total,
      paymentMethod: event.paymentMethod,
    });
  }

  async onPaymentProcessed(event: PaymentProcessedEvent): Promise<void> {
    await this.eventBus.publish('OrderConfirm', {
      orderId: event.orderId,
    });
  }

  // Compensation (rollback)
  async onPaymentFailed(event: PaymentFailedEvent): Promise<void> {
    await this.eventBus.publish('InventoryRelease', {
      orderId: event.orderId,
      items: event.items,
      reason: 'Payment failed',
    });
  }

  async onInventoryReservationFailed(event: InventoryFailedEvent): Promise<void> {
    await this.eventBus.publish('OrderCancelled', {
      orderId: event.orderId,
      reason: 'Insufficient inventory',
    });
  }
}
```

## Orchestration-Based Saga

### Saga Orchestrator
```typescript
class SagaOrchestrator {
  private sagas: Map<string, SagaStep[]> = new Map();

  constructor(private eventBus: EventBus, private logger: Logger) {
    this.registerOrderSaga();
  }

  private registerOrderSaga(): void {
    this.sagas.set('order-creation', [
      {
        name: 'validate-order',
        execute: async (ctx) => await this.validateOrder(ctx),
        compensate: async (ctx) => await this.cancelOrder(ctx),
      },
      {
        name: 'reserve-inventory',
        execute: async (ctx) => await this.reserveInventory(ctx),
        compensate: async (ctx) => await this.releaseInventory(ctx),
      },
      {
        name: 'process-payment',
        execute: async (ctx) => await this.processPayment(ctx),
        compensate: async (ctx) => await this.refundPayment(ctx),
      },
      {
        name: 'confirm-order',
        execute: async (ctx) => await this.confirmOrder(ctx),
        compensate: async (ctx) => await this.undoConfirmOrder(ctx),
      },
    ]);
  }

  async startSaga(sagaType: string, context: SagaContext): Promise<void> {
    const steps = this.sagas.get(sagaType);
    if (!steps) throw new Error(`Unknown saga: ${sagaType}`);

    const sagaId = uuid();
    context.sagaId = sagaId;

    this.logger.info(`Starting saga ${sagaType} [${sagaId}]`);

    const executedSteps: SagaStep[] = [];

    for (const step of steps) {
      try {
        this.logger.info(`Executing step: ${step.name} [${sagaId}]`);
        await step.execute(context);
        executedSteps.push(step);
      } catch (error) {
        this.logger.error(`Step ${step.name} failed [${sagaId}]:`, error);

        // Compensate in reverse order
        await this.compensate(sagaId, executedSteps.reverse(), context);
        throw new SagaFailedError(sagaType, sagaId, error);
      }
    }

    this.logger.info(`Saga ${sagaType} completed [${sagaId}]`);
  }

  private async compensate(
    sagaId: string,
    steps: SagaStep[],
    context: SagaContext
  ): Promise<void> {
    for (const step of steps) {
      try {
        this.logger.info(`Compensating step: ${step.name} [${sagaId}]`);
        await step.compensate(context);
      } catch (error) {
        this.logger.error(`Compensation failed for ${step.name} [${sagaId}]:`, error);
        // Log failure and continue compensating
      }
    }
  }
}
```

## Transactional Outbox Pattern

### Outbox for Reliable Messaging
```typescript
class SagaOutbox {
  async createOrder(request: CreateOrderRequest): Promise<void> {
    await this.db.transaction(async (tx) => {
      // 1. Create order in database
      const order = await tx.orders.create({
        data: {
          customerId: request.customerId,
          items: request.items,
          status: 'PENDING',
        },
      });

      // 2. Store saga event in outbox (same transaction)
      await tx.outbox.create({
        data: {
          aggregateType: 'order',
          aggregateId: order.id,
          eventType: 'OrderCreated',
          payload: JSON.stringify({
            orderId: order.id,
            items: request.items,
            total: order.total,
          }),
        },
      });
    });

    // Outbox publisher picks up the event and starts the saga
  }
}
```

## Key Points
- Use choreography-based sagas for simple workflows with few services
- Use orchestration-based sagas for complex workflows requiring centralized coordination
- Implement compensating transactions for every step in the saga
- Store saga state for recovery and monitoring
- Use the transactional outbox pattern for reliable message publishing
- Handle partial failures gracefully with reverse-order compensation
- Implement idempotency for all saga steps to handle retries
- Monitor saga execution with structured logging and tracing
- Set timeouts for each saga step to detect stalls
- Use saga pattern for distributed transactions requiring eventual consistency
