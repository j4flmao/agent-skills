# Layer Structure

## Domain Layer (Core)
**Dependencies**: None (stdlib only).  
**Contains**: Entities, Value Objects, Domain Events, Domain Services, Repository Interfaces (ports).  
**Purpose**: Encapsulates business rules and domain logic independent of any external concern.

### Per-Stack Details
- **NestJS/TypeScript**: No decorators. Pure TypeScript classes with plain properties and methods. No `@Entity()`, `@Column()`, or `@Injectable()`. Use plain `class User { constructor(public id: string, public name: string) {} }`.
- **Go**: No imports from infrastructure packages. Interfaces define ports in a separate `domain` package. Structs with methods. No database or HTTP imports.
- **Rust**: Separate crate with zero external dependencies in `Cargo.toml`. Only std library imports. Traits define repository interfaces.
- **Python**: Dataclasses only (`@dataclass`). No Pydantic, no SQLAlchemy models, no Django models, no framework imports. Pure Python with type hints.
- **Spring/Java**: POJOs (Plain Old Java Objects). No Spring annotations (`@Entity`, `@Service`, `@Repository`, `@Autowired`). Use primitive types and custom value objects.

### Domain Entity Example
```typescript
// Domain layer — zero dependencies
export class Order {
  private constructor(
    public readonly id: OrderId,
    public readonly customerId: CustomerId,
    private items: OrderItem[],
    private status: OrderStatus,
    public readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  static create(customerId: CustomerId, items: OrderItem[]): Order {
    if (items.length === 0) throw new Error('Order must have at least one item');
    return new Order(
      OrderId.generate(),
      customerId,
      items,
      OrderStatus.PENDING,
      new Date(),
      new Date(),
    );
  }

  addItem(item: OrderItem): void {
    if (this.status !== OrderStatus.PENDING) throw new Error('Cannot add items to non-pending order');
    this.items.push(item);
    this.updatedAt = new Date();
  }

  get totalAmount(): Money {
    return this.items.reduce((sum, item) => sum.add(item.subtotal), Money.ZERO);
  }
}
```

### Value Object Example
```typescript
// Domain layer — immutable, compared by value
export class Money {
  constructor(public readonly amount: number, public readonly currency: string) {
    if (amount < 0) throw new Error('Amount cannot be negative');
  }

  static ZERO = new Money(0, 'USD');

  add(other: Money): Money {
    if (this.currency !== other.currency) throw new Error('Currency mismatch');
    return new Money(this.amount + other.amount, this.currency);
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }
}
```

### Repository Interface Example
```typescript
// Domain layer — defines contract, no implementation
export interface OrderRepository {
  findById(id: OrderId): Promise<Order | null>;
  findByCustomerId(customerId: CustomerId): Promise<Order[]>;
  save(order: Order): Promise<void>;
  delete(id: OrderId): Promise<void>;
}
```

## Application Layer (Use Cases)
**Dependencies**: Domain only.  
**Contains**: Use Cases (Command/Query Handlers), Application Services, DTOs, Port Interfaces.  
**Purpose**: Orchestrates domain logic, owns transaction boundaries, maps domain errors to application errors.

### Use Case Example
```typescript
// Application layer
export class CreateOrderHandler {
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly productRepo: ProductRepository,
    private readonly emailService: EmailService,
  ) {}

  async execute(command: CreateOrderCommand): Promise<CreateOrderResult> {
    const products = await this.productRepo.findByIds(command.productIds);
    if (products.length !== command.productIds.length) {
      return { error: new ProductNotFoundError() };
    }
    const items = products.map(p => new OrderItem(p.id, p.price));
    const order = Order.create(command.customerId, items);
    await this.orderRepo.save(order);
    await this.emailService.sendOrderConfirmation(order);
    return { order };
  }
}
```

### NestJS Application Service
```typescript
// Application layer — @Injectable() only (lightest NestJS coupling)
@Injectable()
export class PlaceOrderUseCase {
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly productRepo: ProductRepository,
    private readonly paymentService: PaymentPort,
  ) {}

  @Transactional() // Transaction boundary here, not in controller
  async execute(dto: PlaceOrderDto): Promise<PlaceOrderResult> {
    // Orchestrates domain logic
  }
}
```

## Infrastructure Layer (Adapters)
**Dependencies**: Domain + Application interfaces.  
**Contains**: DB implementations, HTTP clients, Message producers/consumers, File system, Caching, External APIs.  
**Purpose**: Implements interfaces defined in upper layers. All framework integration lives here.

### Repository Implementation Example
```typescript
// Infrastructure layer
@Injectable() // Framework decorator OK here
export class PostgresOrderRepository implements OrderRepository {
  constructor(
    @InjectConnection() private readonly connection: Connection, // NestJS-specific
  ) {}

  async findById(id: OrderId): Promise<Order | null> {
    const row = await this.connection.query(
      'SELECT * FROM orders WHERE id = $1',
      [id.toString()],
    );
    if (!row) return null;
    return this.toDomain(row);
  }

  async save(order: Order): Promise<void> {
    await this.connection.query(
      'INSERT INTO orders (id, customer_id, status, created_at) VALUES ($1, $2, $3, $4)',
      [order.id.toString(), order.customerId.toString(), order.status, order.createdAt],
    );
  }

  private toDomain(row: OrderRow): Order {
    return Order.create(
      new CustomerId(row.customer_id),
      [], // items loaded separately
    );
  }
}
```

## Presentation Layer (Interfaces)
**Dependencies**: Application DTOs only.  
**Contains**: Controllers, Routes, GraphQL resolvers, CLI commands, Middleware, Guards/Interceptors.  
**Purpose**: Converts external input to Application DTOs. Never references Domain entities.

### Controller Example
```typescript
// Presentation layer — thin, no business logic
@Controller('/orders')
export class OrderController {
  constructor(private readonly createOrder: CreateOrderHandler) {}

  @Post()
  async create(@Body() dto: CreateOrderRequest): Promise<CreateOrderResponse> {
    const result = await this.createOrder.execute({
      customerId: dto.customerId,
      productIds: dto.productIds,
    });
    if (result.error) {
      throw new HttpException(result.error.message, 400);
    }
    return {
      id: result.order.id.toString(),
      status: result.order.status,
      total: result.order.totalAmount.amount,
    };
  }
}
```

## Dependency Injection Rules
- Domain defines interfaces → Infrastructure implements → Application depends on interfaces
- Composition Root wires everything at the entry point
- DI is Infrastructure concern — Application just receives dependencies
- The Composition Root should be the only place where concrete implementations are instantiated

## Transaction Boundary Rules
- Transactions belong in Application layer use cases — never in controllers, never in repositories
- A use case either succeeds fully or fails fully
- Repository implementations handle the actual transaction mechanism (begin, commit, rollback)
- Use Unit of Work pattern: the Application layer controls when to flush/persist

## Package Structure (NestJS Example)
```
src/
├── domain/
│   ├── order/
│   │   ├── order.entity.ts
│   │   ├── order-item.value-object.ts
│   │   ├── order.repository.interface.ts
│   │   └── order.service.ts (domain service, if needed)
│   └── shared/
│       ├── money.value-object.ts
│       └── order-id.value-object.ts
├── application/
│   ├── use-cases/
│   │   ├── create-order.handler.ts
│   │   └── cancel-order.handler.ts
│   └── ports/
│       ├── email-service.port.ts
│       └── payment-gateway.port.ts
├── infrastructure/
│   ├── persistence/
│   │   ├── postgres-order.repository.ts
│   │   └── order.entity.ts (ORM entity)
│   ├── email/
│   │   └── sendgrid-email.service.ts
│   └── di/
│       └── container.ts (Composition Root)
└── presentation/
    ├── controllers/
    │   └── order.controller.ts
    ├── dto/
    │   ├── create-order.request.ts
    │   └── create-order.response.ts
    └── middleware/
        └── auth.middleware.ts
```
