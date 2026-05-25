# Clean Architecture Testing

## Test Pyramid by Layer

```
         ╱╲
        ╱  ╲         E2E (2-3 critical journeys)
       ╱    ╲
      ╱──────╲
     ╱        ╲      Integration (infrastructure adapters)
    ╱          ╲
   ╱────────────╲
  ╱              ╲   Application (use cases with mocked ports)
 ╱                ╲
╱──────────────────╲ Domain (pure unit tests, zero mocks)
```

## Domain Testing — Zero Mocks

```typescript
describe('Money Value Object', () => {
  it('rejects negative amounts', () => {
    expect(() => new Money(-1, 'USD')).toThrow('Amount cannot be negative');
  });

  it('rejects currency mismatch on add', () => {
    const usd = new Money(10, 'USD');
    const eur = new Money(5, 'EUR');
    expect(() => usd.add(eur)).toThrow('Currency mismatch');
  });

  it('handles zero correctly', () => {
    expect(Money.ZERO.amount).toBe(0);
    expect(Money.ZERO.add(new Money(5, 'USD'))).toEqual(new Money(5, 'USD'));
  });
});

describe('Order Entity', () => {
  it('transitions from pending to confirmed', () => {
    const order = Order.create(customerId, [validItem]);
    order.confirm();
    expect(order.status).toBe(OrderStatus.CONFIRMED);
  });

  it('prevents transition from cancelled to confirmed', () => {
    const order = Order.create(customerId, [validItem]);
    order.cancel();
    expect(() => order.confirm()).toThrow('Cannot confirm a cancelled order');
  });
});
```

## Application Testing — Mock Ports

```typescript
describe('CreateOrderHandler', () => {
  let handler: CreateOrderHandler;
  let orderRepo: jest.Mocked<IOrderRepository>;
  let productRepo: jest.Mocked<IProductRepository>;
  let eventBus: jest.Mocked<IEventBus>;
  let uow: jest.Mocked<IUnitOfWork>;

  beforeEach(() => {
    orderRepo = { save: jest.fn() };
    productRepo = { findByIds: jest.fn() };
    eventBus = { publish: jest.fn() };
    uow = { execute: jest.fn((fn) => fn()) };
    handler = new CreateOrderHandler(uow, orderRepo, productRepo, eventBus);
  });

  it('creates order when all products exist', async () => {
    productRepo.findByIds.mockResolvedValue([product1, product2]);
    const result = await handler.execute(validCommand);
    expect(result.success).toBe(true);
    expect(orderRepo.save).toHaveBeenCalledWith(expect.any(Order));
    expect(eventBus.publish).toHaveBeenCalledWith(expect.any(OrderCreatedEvent));
  });

  it('returns error when product not found', async () => {
    productRepo.findByIds.mockResolvedValue([product1]); // only 1 of 2 found
    const result = await handler.execute(validCommand);
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(ProductNotFoundError);
    expect(orderRepo.save).not.toHaveBeenCalled();
  });

  it('rolls back transaction on failure', async () => {
    productRepo.findByIds.mockRejectedValue(new Error('DB timeout'));
    await expect(handler.execute(validCommand)).rejects.toThrow('DB timeout');
  });
});
```

## Infrastructure Testing — Test Containers

```typescript
describe('PostgresOrderRepository', () => {
  let container: StartedPostgresContainer;
  let pool: Pool;
  let repo: PostgresOrderRepository;

  beforeAll(async () => {
    container = await new PostgresContainer('postgres:16')
      .withDatabase('testdb')
      .withUsername('test')
      .withPassword('test')
      .withExposedPorts(5432)
      .start();
    pool = new Pool({ connectionString: container.getConnectionUri() });
    await runMigrations(pool);
    repo = new PostgresOrderRepository(pool);
  }, 60000);

  afterAll(async () => {
    await pool.end();
    await container.stop();
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE orders CASCADE');
  });

  it('persists and retrieves order with items', async () => {
    const order = Order.create('cust-1', [
      new OrderItem('prod-1', new Money(10, 'USD'), 2),
    ]);
    await repo.save(order);
    const found = await repo.findById(order.id);
    expect(found?.id).toEqual(order.id);
    expect(found?.items).toHaveLength(1);
    expect(found?.totalAmount).toEqual(new Money(20, 'USD'));
  });

  it('returns null for non-existent order', async () => {
    const found = await repo.findById(OrderId.generate());
    expect(found).toBeNull();
  });
});
```

## Presentation Testing — Test Server

```typescript
describe('OrderController', () => {
  let app: INestApplication;
  let handler: jest.Mocked<CreateOrderHandler>;

  beforeAll(async () => {
    handler = { execute: jest.fn() };
    const module = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [{ provide: CreateOrderHandler, useValue: handler }],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  it('returns 201 with order ID', async () => {
    handler.execute.mockResolvedValue({ success: true, orderId: 'ord-1' });
    return request(app.getHttpServer())
      .post('/orders')
      .send({ customerId: 'cust-1', items: [{ productId: 'p1', quantity: 2 }] })
      .expect(201)
      .expect((res) => expect(res.body.orderId).toBe('ord-1'));
  });

  it('returns 400 for invalid input', async () => {
    return request(app.getHttpServer())
      .post('/orders')
      .send({}) // missing required fields
      .expect(400);
  });

  it('returns 409 for duplicate order', async () => {
    handler.execute.mockResolvedValue({ success: false, error: new DuplicateOrderError() });
    return request(app.getHttpServer())
      .post('/orders')
      .send(validOrder)
      .expect(409);
  });
});
```

## Fakes vs Mocks

```typescript
// Fake implementation — used across many tests
class InMemoryOrderRepository implements IOrderRepository {
  private store = new Map<string, Order>();
  async findById(id: OrderId): Promise<Order | null> {
    return this.store.get(id.toString()) ?? null;
  }
  async save(order: Order): Promise<void> {
    this.store.set(order.id.toString(), order);
  }
  async delete(id: OrderId): Promise<void> {
    this.store.delete(id.toString());
  }
}

// Use fakes when the interface is used in many tests
// Use mocks when you need to verify specific interactions
```

## Coverage Targets by Layer

| Layer | Coverage | Focus Areas |
|-------|----------|-------------|
| Domain | 95%+ | All entity methods, edge cases, invariants, domain events |
| Application | 90%+ | All use case paths, error handling, transaction boundaries |
| Infrastructure | 80%+ | Query correctness, mapping, error cases |
| Presentation | 85%+ | Route behavior, status codes, validation errors |

## Architecture Test (Dependency Verification)

```typescript
describe('Architecture Constraints', () => {
  it('domain layer has zero infrastructure imports', () => {
    const files = glob.sync('src/domain/**/*.ts');
    const violations = files.filter(f => {
      const content = readFileSync(f, 'utf-8');
      return content.includes('from \'..') && !content.includes('../domain');
    });
    expect(violations).toEqual([]);
  });

  it('presentation layer does not import domain entities', () => {
    const files = glob.sync('src/presentation/**/*.ts');
    const violations = files.filter(f => {
      const content = readFileSync(f, 'utf-8');
      return content.includes('from \'../domain') || content.includes('from \'src/domain');
    });
    expect(violations).toEqual([]);
  });
});
```
