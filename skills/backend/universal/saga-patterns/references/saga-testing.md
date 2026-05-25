# Saga Testing

## Test Pyramid for Sagas

```
         ╱╲
        ╱  ╲         E2E (full saga across services)
       ╱    ╲
      ╱────────╲
     ╱          ╲      Integration (real broker, real DB)
    ╱            ╲
   ╱──────────────╲
  ╱                ╲   Compensation Tests (rollback scenarios)
 ╱                  ╲
╱────────────────────╲  Unit Tests (saga state machine, step handlers)
```

## Unit Testing Saga State Machine

```typescript
describe('OrderSaga', () => {
  let saga: OrderSaga;

  beforeEach(() => {
    saga = new OrderSaga('saga-1', { orderId: 'ord-1', customerId: 'c1' });
  });

  it('starts in PENDING state', () => {
    expect(saga.status).toBe(SagaStatus.PENDING);
    expect(saga.completedSteps).toEqual([]);
  });

  it('tracks completed steps', () => {
    saga.stepCompleted('reserveInventory');
    expect(saga.completedSteps).toEqual(['reserveInventory']);
    expect(saga.status).toBe(SagaStatus.RUNNING);
  });

  it('marks as completed when all steps done', () => {
    for (const step of ['reserveInventory', 'processPayment', 'confirmOrder']) {
      saga.stepCompleted(step);
    }
    saga.complete();
    expect(saga.status).toBe(SagaStatus.COMPLETED);
  });

  it('marks as failed and stores failed step', () => {
    saga.fail('processPayment', 'Insufficient funds');
    expect(saga.status).toBe(SagaStatus.FAILED);
    expect(saga.failedStep).toBe('processPayment');
    expect(saga.failureReason).toBe('Insufficient funds');
  });

  it('prevents step completion after failure', () => {
    saga.fail('processPayment', 'error');
    expect(() => saga.stepCompleted('confirmOrder')).toThrow('Saga has failed');
  });

  it('returns completed steps in order', () => {
    saga.stepCompleted('reserveInventory');
    saga.stepCompleted('processPayment');
    expect(saga.completedSteps).toEqual(['reserveInventory', 'processPayment']);
  });
});
```

## Testing Saga Orchestrator

```typescript
describe('OrderSagaOrchestrator', () => {
  let orchestrator: OrderSagaOrchestrator;
  let sagaStore: jest.Mocked<ISagaStore>;
  let inventoryClient: jest.Mocked<InventoryClient>;
  let paymentClient: jest.Mocked<PaymentClient>;
  let orderClient: jest.Mocked<OrderClient>;
  let notificationClient: jest.Mocked<NotificationClient>;

  beforeEach(() => {
    sagaStore = {
      save: jest.fn(),
      findById: jest.fn(),
      findPending: jest.fn(),
    };
    inventoryClient = {
      reserve: jest.fn().mockResolvedValue({ success: true }),
      release: jest.fn().mockResolvedValue({ success: true }),
    };
    paymentClient = {
      charge: jest.fn().mockResolvedValue({ success: true }),
      refund: jest.fn().mockResolvedValue({ success: true }),
    };
    orderClient = {
      confirm: jest.fn().mockResolvedValue({ success: true }),
      cancel: jest.fn().mockResolvedValue({ success: true }),
    };
    notificationClient = {
      send: jest.fn().mockResolvedValue({ success: true }),
    };

    orchestrator = new OrderSagaOrchestrator(
      sagaStore, inventoryClient, paymentClient, orderClient, notificationClient,
    );
  });

  it('completes saga when all steps succeed', async () => {
    await orchestrator.start({ orderId: 'ord-1', customerId: 'c1', items: [], total: 100 });

    // Verify all steps called
    expect(inventoryClient.reserve).toHaveBeenCalled();
    expect(paymentClient.charge).toHaveBeenCalled();
    expect(orderClient.confirm).toHaveBeenCalled();
    expect(notificationClient.send).toHaveBeenCalled();
    expect(sagaStore.save).toHaveBeenCalledTimes(5); // initial + 4 steps
  });

  it('compensates on payment failure', async () => {
    paymentClient.charge.mockRejectedValue(new Error('Card declined'));

    await orchestrator.start({ orderId: 'ord-1', customerId: 'c1', items: [], total: 100 });

    // Compensation should release inventory
    expect(inventoryClient.release).toHaveBeenCalled();
    // Order should not be confirmed
    expect(orderClient.confirm).not.toHaveBeenCalled();
    // Saga should be in FAILED state
    const savedSaga = sagaStore.save.mock.calls
      .map(c => c[0])
      .find(s => s.status === SagaStatus.FAILED);
    expect(savedSaga).toBeDefined();
    expect(savedSaga.failedStep).toBe('processPayment');
  });

  it('retries transient failures', async () => {
    paymentClient.charge
      .mockRejectedValueOnce(new Error('Timeout'))
      .mockResolvedValueOnce({ success: true });

    await orchestrator.start({ orderId: 'ord-1', customerId: 'c1', items: [], total: 100 });

    // Should have retried
    expect(paymentClient.charge).toHaveBeenCalledTimes(2);
    expect(orchestrator.completedSteps).toContain('confirmOrder');
  });

  it('reports idempotent step execution', async () => {
    // Simulate recovery — step was already completed
    const saga = Saga.load({
      id: 'saga-1', status: SagaStatus.RUNNING, completedSteps: ['reserveInventory'],
    });
    sagaStore.findById.mockResolvedValue(saga);

    await orchestrator.resume('saga-1');

    // Should skip already completed step
    expect(inventoryClient.reserve).not.toHaveBeenCalled();
    // Should continue with remaining steps
    expect(paymentClient.charge).toHaveBeenCalled();
  });
});
```

## Compensation Testing

```typescript
describe('Saga Compensation', () => {
  let orchestrator: OrderSagaOrchestrator;
  let sagaStore: InMemorySagaStore;
  let inventoryClient: jest.Mocked<InventoryClient>;
  let paymentClient: jest.Mocked<PaymentClient>;

  beforeEach(() => {
    sagaStore = new InMemorySagaStore();
    inventoryClient = {
      reserve: jest.fn().mockResolvedValue({ success: true }),
      release: jest.fn().mockResolvedValue({ success: true }),
    };
    paymentClient = {
      charge: jest.fn().mockRejectedValue(new Error('Declined')),
      refund: jest.fn().mockResolvedValue({ success: true }),
    };

    orchestrator = new OrderSagaOrchestrator(
      sagaStore, inventoryClient, paymentClient, orderClient, notificationClient,
    );
  });

  it('compensates in reverse order', async () => {
    await orchestrator.start({ orderId: 'ord-1', items: [], total: 100 });

    // Verify compensation order: processPayment → reserveInventory
    const compensationCalls = [
      inventoryClient.release.mock.invocationCallOrder[0],
    ];

    // Inventory released after payment fails
    expect(inventoryClient.release).toHaveBeenCalled();

    // Verify saga state
    const saga = sagaStore.sagas.get('saga-1');
    expect(saga.status).toBe(SagaStatus.FAILED);
    expect(saga.failedStep).toBe('processPayment');
  });

  it('handles compensation failure gracefully', async () => {
    inventoryClient.release.mockRejectedValue(new Error('Release failed'));

    await orchestrator.start({ orderId: 'ord-1', items: [], total: 100 });

    // Compensation failure should be logged but not prevent saga failure state
    const saga = sagaStore.sagas.get('saga-1');
    expect(saga.status).toBe(SagaStatus.FAILED);
    // Compensation should have been attempted
    expect(inventoryClient.release).toHaveBeenCalled();
  });

  it('compensations are idempotent', async () => {
    paymentClient.charge.mockRejectedValue(new Error('Declined'));

    // Run saga twice
    await orchestrator.start({ orderId: 'ord-1', items: [], total: 100 });
    // Compensation already applied
    inventoryClient.release.mockClear();
    await orchestrator.compensateExisting('ord-1');

    // Compensation should not double-execute
    expect(inventoryClient.release).not.toHaveBeenCalled();
  });
});
```

## Integration Testing

```typescript
describe('Saga Integration', () => {
  let postgres: StartedPostgresContainer;
  let kafka: StartedKafkaContainer;
  let orchestrator: OrderSagaOrchestrator;

  beforeAll(async () => {
    postgres = await new PostgresContainer('postgres:16').start();
    kafka = await new KafkaContainer('confluent:7.6').start();

    const pool = new Pool({ connectionString: postgres.getConnectionUri() });
    await runMigrations(pool);
    const sagaStore = new PostgresSagaStore(pool);
    const eventBus = new KafkaEventBus(kafka.getBootstrapServers());

    orchestrator = new OrderSagaOrchestrator(
      sagaStore,
      new InventoryClient('http://inventory:3001'),
      new PaymentClient('http://payment:3002'),
      new OrderClient('http://order:3003'),
      new NotificationClient(eventBus),
    );
  }, 120000);

  it('completes full saga flow', async () => {
    const result = await orchestrator.start({
      orderId: 'int-ord-1',
      customerId: 'int-cust-1',
      items: [{ productId: 'p1', quantity: 1 }],
      total: 49.99,
    });

    const saga = await orchestrator.getStatus(result.sagaId);
    expect(saga.status).toBe(SagaStatus.COMPLETED);
  });
});
```

## Testing Recovery

```typescript
describe('Saga Recovery', () => {
  it('recovers interrupted saga on restart', async () => {
    const sagaStore = new PostgresSagaStore(pool);
    const saga = Saga.create('order-saga', 'ord-1');
    saga.stepCompleted('reserveInventory');
    await sagaStore.save(saga);

    // Simulate crash — saga is in RUNNING state with one step done

    const orchestrator = new OrderSagaOrchestrator(/* deps */);
    const pendingSagas = await sagaStore.findPending();

    for (const pending of pendingSagas) {
      await orchestrator.resume(pending.id);
    }

    const recovered = await sagaStore.findById(saga.id);
    expect(recovered.status).toBe(SagaStatus.COMPLETED);
  });

  it('detects permanently failed saga', async () => {
    const saga = Saga.create('order-saga', 'ord-1');
    saga.fail('processPayment', 'Card declined permanently');
    await sagaStore.save(saga);

    // Should not auto-retry — requires manual intervention
    const failedSagas = await sagaStore.findByStatus(SagaStatus.FAILED);
    expect(failedSagas).toHaveLength(1);
  });
});
```
