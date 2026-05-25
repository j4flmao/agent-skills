# CQRS Testing

## Test Pyramid for CQRS

```
         ╱╲
        ╱  ╲         E2E (full command→event→query flow)
       ╱    ╲
      ╱────────╲
     ╱          ╲      Query Handler Tests (against read model)
    ╱            ╲
   ╱──────────────╲
  ╱                ╲   Command Handler Tests (with mocked repositories)
 ╱                  ╲
╱────────────────────╲  Domain Model Tests (command-side aggregates)
                       Projection Tests (event→read model mapping)
```

## Command Handler Testing

```typescript
describe('PlaceOrderHandler', () => {
  let handler: PlaceOrderHandler;
  let orderRepo: jest.Mocked<IOrderRepository>;
  let eventBus: jest.Mocked<IEventBus>;

  beforeEach(() => {
    orderRepo = { save: jest.fn(), findById: jest.fn() };
    eventBus = { publish: jest.fn() };
    handler = new PlaceOrderHandler(orderRepo, eventBus);
  });

  it('creates order and publishes event on success', async () => {
    const command = new PlaceOrderCommand({
      customerId: 'cust-1',
      items: [{ productId: 'p1', quantity: 2, price: 10 }],
    });

    const result = await handler.handle(command);

    expect(result.isSuccess).toBe(true);
    expect(orderRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      customerId: 'cust-1',
      status: 'pending',
    }));
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'OrderPlaced' }),
    );
  });

  it('returns failure for empty order', async () => {
    const command = new PlaceOrderCommand({
      customerId: 'cust-1',
      items: [],
    });

    const result = await handler.handle(command);

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(EmptyOrderError);
    expect(orderRepo.save).not.toHaveBeenCalled();
  });

  it('throws on duplicate command (idempotency check)', async () => {
    const command = new PlaceOrderCommand({
      idempotencyKey: 'dup-key',
      customerId: 'cust-1',
      items: [{ productId: 'p1', quantity: 1, price: 10 }],
    });

    orderRepo.findById.mockResolvedValue(existingOrder);

    const result = await handler.handle(command);

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(DuplicateCommandError);
  });
});
```

## Query Handler Testing

```typescript
describe('GetOrderQueryHandler', () => {
  let handler: GetOrderQueryHandler;
  let readRepo: jest.Mocked<IOrderReadRepository>;

  beforeEach(() => {
    readRepo = {
      findById: jest.fn(),
      findByCustomerId: jest.fn(),
      search: jest.fn(),
    };
    handler = new GetOrderQueryHandler(readRepo);
  });

  it('returns order detail for valid query', async () => {
    const expectedOrder: OrderDetail = {
      id: 'ord-1',
      customerName: 'Alice',
      itemCount: 3,
      total: 45.50,
      status: 'shipped',
      createdAt: new Date('2026-05-20'),
    };
    readRepo.findById.mockResolvedValue(expectedOrder);

    const query = new GetOrderQuery({ orderId: 'ord-1' });
    const result = await handler.handle(query);

    expect(result).toEqual(expectedOrder);
    expect(readRepo.findById).toHaveBeenCalledWith('ord-1');
  });

  it('returns null for non-existent order', async () => {
    readRepo.findById.mockResolvedValue(null);

    const query = new GetOrderQuery({ orderId: 'nonexistent' });
    const result = await handler.handle(query);

    expect(result).toBeNull();
  });

  it('filters by date range', async () => {
    const from = new Date('2026-01-01');
    const to = new Date('2026-06-01');
    const query = new SearchOrdersQuery({
      customerId: 'cust-1',
      fromDate: from,
      toDate: to,
      status: 'shipped',
    });

    await handler.handle(query);

    expect(readRepo.search).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 'cust-1',
        fromDate: from,
        toDate: to,
        status: 'shipped',
      }),
    );
  });
});
```

## Projection Testing

```typescript
describe('OrderProjection', () => {
  let projection: OrderProjection;
  let readDb: jest.Mocked<IOrderReadRepository>;

  beforeEach(() => {
    readDb = {
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    projection = new OrderProjection(readDb);
  });

  it('creates order summary on OrderPlaced', async () => {
    const event = new OrderPlacedEvent({
      orderId: 'ord-1',
      customerId: 'cust-1',
      customerName: 'Alice',
      items: [{ productId: 'p1', quantity: 2, price: 10 }],
      total: 20,
    });

    await projection.onOrderPlaced(event);

    expect(readDb.insert).toHaveBeenCalledWith('order_summaries', {
      id: 'ord-1',
      customerId: 'cust-1',
      customerName: 'Alice',
      itemCount: 1,
      total: 20,
      status: 'placed',
      createdAt: expect.any(Date),
    });
  });

  it('updates order status on OrderShipped', async () => {
    const event = new OrderShippedEvent({
      orderId: 'ord-1',
      trackingNumber: 'TRACK123',
      carrier: 'UPS',
    });

    await projection.onOrderShipped(event);

    expect(readDb.update).toHaveBeenCalledWith(
      'order_summaries', 'ord-1',
      expect.objectContaining({
        status: 'shipped',
        trackingNumber: 'TRACK123',
        carrier: 'UPS',
      }),
    );
  });

  it('handles out-of-order events gracefully', async () => {
    const shipEvent = new OrderShippedEvent({ orderId: 'ord-1', /* ... */ });
    const cancelEvent = new OrderCancelledEvent({ orderId: 'ord-1', /* ... */ });

    // Ship arrives before place (retry/async)
    await projection.onOrderShipped(shipEvent);
    // Should not throw, should be idempotent
    expect(readDb.update).toHaveBeenCalled();

    await projection.onOrderPlaced(new OrderPlacedEvent({ orderId: 'ord-1', /* ... */ }));
    // Should create the record
  });
});
```

## Read Model Consistency Testing

```typescript
describe('Read Model Consistency', () => {
  let commandHandler: PlaceOrderHandler;
  let queryHandler: GetOrderQueryHandler;
  let eventBus: InMemoryEventBus;
  let projection: OrderProjection;
  let commandRepo: InMemoryOrderRepository;
  let readRepo: InMemoryOrderReadRepository;

  beforeEach(() => {
    commandRepo = new InMemoryOrderRepository();
    readRepo = new InMemoryOrderReadRepository();
    eventBus = new InMemoryEventBus();
    projection = new OrderProjection(readRepo);

    // Subscribe projection to events
    eventBus.subscribe('OrderPlaced', (e) => projection.onOrderPlaced(e));
    eventBus.subscribe('OrderShipped', (e) => projection.onOrderShipped(e));

    commandHandler = new PlaceOrderHandler(commandRepo, eventBus);
    queryHandler = new GetOrderQueryHandler(readRepo);
  });

  it('eventually consistent: command then query returns order', async () => {
    const command = new PlaceOrderCommand({
      customerId: 'cust-1',
      items: [{ productId: 'p1', quantity: 1, price: 10 }],
    });

    await commandHandler.handle(command);

    // Simulate async projection processing
    await eventBus.processPending();

    const query = new GetOrderQuery({ orderId: commandRepo.lastSavedId() });
    const result = await queryHandler.handle(query);

    expect(result).not.toBeNull();
    expect(result?.status).toBe('placed');
    expect(result?.total).toBe(10);
  });

  it('read model is rebuildable from events', async () => {
    // Execute some commands
    await commandHandler.handle(createCommand('ord-1', 'cust-1'));
    await commandHandler.handle(createCommand('ord-2', 'cust-1'));

    // Clear and rebuild
    readRepo.clear();
    await eventBus.replayAll(projection);

    const allOrders = await readRepo.findByCustomerId('cust-1');
    expect(allOrders).toHaveLength(2);
  });
});
```

## Integration Testing (Real Infrastructure)

```typescript
describe('CQRS Integration', () => {
  let postgresContainer: StartedPostgresContainer;
  let pool: Pool;
  let commandRepo: PostgresOrderRepository;
  let readRepo: PostgresOrderReadRepository;
  let eventBus: KafkaEventBus;
  let kafkaContainer: StartedKafkaContainer;

  beforeAll(async () => {
    postgresContainer = await new PostgresContainer('postgres:16').start();
    pool = new Pool({ connectionString: postgresContainer.getConnectionUri() });
    await runMigrations(pool);
    commandRepo = new PostgresOrderRepository(pool);
    readRepo = new PostgresOrderReadRepository(pool);

    kafkaContainer = await new KafkaContainer('confluent:7.6')
      .withNetwork(postgresContainer.getNetwork())
      .start();
    eventBus = new KafkaEventBus(kafkaContainer.getBootstrapServers());
  }, 120000);

  afterAll(async () => {
    await pool.end();
    await postgresContainer.stop();
    await kafkaContainer.stop();
  });

  it('propagates command to read model via event', async () => {
    const handler = new PlaceOrderHandler(commandRepo, eventBus);
    const projection = new OrderProjection(readRepo);

    // Subscribe projection to event bus
    await eventBus.consume('OrderPlaced', (e) => projection.onOrderPlaced(e));

    const command = new PlaceOrderCommand({ customerId: 'c1', items: [validItem] });
    await handler.handle(command);

    // Wait for async propagation
    await delay(2000);

    const result = await readRepo.findById(commandRepo.lastSavedId());
    expect(result).not.toBeNull();
  });
});
```

## Test Data Builders for CQRS

```typescript
// Test data builders
class OrderBuilder {
  private order: Partial<OrderDetail> = {};

  withId(id: string): OrderBuilder { this.order.id = id; return this; }
  withCustomer(name: string): OrderBuilder { this.order.customerName = name; return this; }
  withStatus(status: string): OrderBuilder { this.order.status = status; return this; }
  withTotal(total: number): OrderBuilder { this.order.total = total; return this; }
  withItems(count: number): OrderBuilder { this.order.itemCount = count; return this; }

  build(): OrderDetail {
    return {
      id: this.order.id || 'ord-default',
      customerName: this.order.customerName || 'Test User',
      itemCount: this.order.itemCount || 1,
      total: this.order.total || 10,
      status: this.order.status || 'placed',
      createdAt: new Date(),
    };
  }
}

// Usage
const order = new OrderBuilder()
  .withId('ord-1')
  .withCustomer('Alice')
  .withStatus('shipped')
  .withTotal(99.99)
  .build();
```
