# Testing Strategy

## Testing by Layer

### Domain Layer Testing
**Type**: Pure unit tests.  
**Dependencies**: None (zero mocks).  
**Focus**: Business rules, invariants, entity behavior, value object equality, domain events.

Domain tests require no test doubles because the Domain layer has zero external dependencies. Entities and value objects are tested in isolation with plain assertions.

```typescript
describe('Order Entity', () => {
  it('creates with PENDING status', () => {
    const order = Order.create(new CustomerId('123'), [validItem]);
    expect(order.status).toBe(OrderStatus.PENDING);
  });

  it('rejects creation with empty items', () => {
    expect(() => Order.create(new CustomerId('123'), [])).toThrow('must have at least one item');
  });

  it('calculates total amount correctly', () => {
    const order = Order.create(new CustomerId('123'), [
      new OrderItem('p1', new Money(10, 'USD'), 2),
      new OrderItem('p2', new Money(5, 'USD'), 1),
    ]);
    expect(order.totalAmount).toEqual(new Money(25, 'USD'));
  });

  it('prevents adding items after cancellation', () => {
    const order = Order.create(new CustomerId('123'), [validItem]);
    order.cancel();
    expect(() => order.addItem(validItem)).toThrow('non-pending order');
  });
});
```

### Application Layer Testing
**Type**: Integration tests with mocked ports.  
**Dependencies**: Repository interfaces and service ports are mocked. Domain entities are real.  
**Focus**: Use case orchestration, transaction boundaries, error handling, mapping.

Application tests mock only the interfaces (ports), not concrete implementations. The use case is tested with real domain entities and mocked repositories.

```typescript
describe('CreateOrderHandler', () => {
  let handler: CreateOrderHandler;
  let orderRepo: jest.Mocked<OrderRepository>;
  let emailService: jest.Mocked<EmailService>;

  beforeEach(() => {
    orderRepo = { findById: jest.fn(), save: jest.fn(), /* ... */ };
    emailService = { sendOrderConfirmation: jest.fn() };
    handler = new CreateOrderHandler(orderRepo, emailService);
  });

  it('creates order and sends confirmation', async () => {
    const result = await handler.execute({
      customerId: '123',
      productIds: ['p1', 'p2'],
    });
    expect(orderRepo.save).toHaveBeenCalledWith(expect.any(Order));
    expect(emailService.sendOrderConfirmation).toHaveBeenCalled();
    expect(result.order).toBeDefined();
  });

  it('returns error when product not found', async () => {
    const result = await handler.execute({
      customerId: '123',
      productIds: ['nonexistent'],
    });
    expect(result.error).toBeInstanceOf(ProductNotFoundError);
    expect(orderRepo.save).not.toHaveBeenCalled();
  });
});
```

### Infrastructure Layer Testing
**Type**: Integration tests with real infrastructure.  
**Dependencies**: Test containers (Docker) for databases, message queues, and caches. HTTP test servers for API clients.  
**Focus**: Repository query correctness, data mapping, integration behavior.

Infrastructure tests use real infrastructure via test containers. Never mock the database or message queue. Use Testcontainers library for Docker-based test infrastructure:

```typescript
describe('PostgresOrderRepository', () => {
  let container: StartedPostgresContainer;
  let repo: PostgresOrderRepository;

  beforeAll(async () => {
    container = await new PostgresContainer('postgres:16')
      .withDatabase('test')
      .withUsername('test')
      .withPassword('test')
      .start();
    const pool = new Pool({ connectionString: container.getConnectionUri() });
    await runMigrations(pool);
    repo = new PostgresOrderRepository(pool);
  }, 30000);

  afterAll(async () => {
    await container.stop();
  });

  it('saves and retrieves an order', async () => {
    const order = Order.create(new CustomerId('123'), [validItem]);
    await repo.save(order);
    const retrieved = await repo.findById(order.id);
    expect(retrieved?.id).toEqual(order.id);
    expect(retrieved?.totalAmount).toEqual(order.totalAmount);
  });

  it('returns null for non-existent order', async () => {
    const result = await repo.findById(OrderId.generate());
    expect(result).toBeNull();
  });
});
```

### Presentation Layer Testing
**Type**: E2E tests with HTTP test server.  
**Dependencies**: Real application server (lightweight), mocked Application layer.  
**Focus**: Request/response contract, serialization, input validation, HTTP status codes, headers.

Presentation tests use a test server instance with real middleware but mocked use cases:

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
    await app.init();
  });

  it('returns 201 for valid order request', async () => {
    handler.execute.mockResolvedValue({
      order: { id: 'ord-1', status: 'PENDING', totalAmount: { amount: 25, currency: 'USD' } },
    });
    const response = await request(app.getHttpServer())
      .post('/orders')
      .send({ customerId: '123', productIds: ['p1', 'p2'] })
      .expect(201);
    expect(response.body.id).toBe('ord-1');
  });

  it('returns 400 for invalid input', async () => {
    await request(app.getHttpServer())
      .post('/orders')
      .send({}) // missing required fields
      .expect(400);
  });
});
```

## Test Organization

### Test File Placement
```
src/
├── domain/
│   └── order/
│       ├── order.entity.ts
│       └── order.entity.test.ts      # Unit test in same directory
├── application/
│   └── use-cases/
│       ├── create-order.handler.ts
│       └── create-order.handler.test.ts  # Integration test in same directory
├── infrastructure/
│   └── persistence/
│       ├── postgres-order.repository.ts
│       └── postgres-order.repository.test.ts  # Integration with test container
└── presentation/
    └── controllers/
        ├── order.controller.ts
        └── order.controller.test.ts  # E2E with test server
```

### Naming Conventions
- Unit tests: `{filename}.test.ts` (TypeScript), `{filename}_test.go` (Go), `test_{filename}.py` (Python), `{filename}Test.java` (Java)
- Integration tests: `{filename}.integration.test.ts`, `{filename}_integration_test.go`
- Test helpers: `{filename}.test-helper.ts`

## Mock Strategy by Layer

| Layer | Mock Strategy | Why |
|---|---|---|
| Domain | No mocks | Pure logic with zero dependencies |
| Application | Mock ports (interfaces) | Test use case logic without infrastructure |
| Infrastructure | No mocks — use test containers | Test real integration behavior |
| Presentation | Mock use cases | Test HTTP contracts without running use cases |

## Coverage Targets

| Layer | Minimum Coverage | Focus |
|---|---|---|
| Domain | 95% | Every entity method, every validation rule, every edge case |
| Application | 90% | Every use case path (success, error, edge case) |
| Infrastructure | 80% | Every query, every mapping, error cases |
| Presentation | 85% | Every route, every status code, every validation error |

## Test Doubles Guidelines

### When to Mock
- Mock ports/interfaces only, never concrete classes
- Use stubs for return values, spies for verification
- Use fakes (in-memory implementations) when the same interface is used across many tests
- Never mock domain entities — use real entity instances

### Fakes for Repository Interfaces
```typescript
// In-memory fake for testing
class InMemoryOrderRepository implements OrderRepository {
  private orders = new Map<string, Order>();

  async findById(id: OrderId): Promise<Order | null> {
    return this.orders.get(id.toString()) ?? null;
  }

  async save(order: Order): Promise<void> {
    this.orders.set(order.id.toString(), order);
  }
}
```

## Layer Boundary Tests

### Dependency Rule Enforcement
Add architecture tests that verify no layer violates the dependency rules:
```typescript
describe('Architecture Rules', () => {
  it('domain layer does not import infrastructure', () => {
    const domainFiles = glob.sync('src/domain/**/*.ts');
    const violations = domainFiles.filter(f => {
      const content = fs.readFileSync(f, 'utf8');
      return content.includes('from "../infrastructure"') || 
             content.includes("from 'src/infrastructure");
    });
    expect(violations).toEqual([]);
  });
});
```
