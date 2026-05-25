# Clean Architecture Layers

## Layer Dependency Graph

```
┌──────────────────────────────┐
│       Presentation           │
│  (Controllers, Resolvers,   │
│   Middleware, CLI)           │
│         ↓ depends on         │
├──────────────────────────────┤
│       Application            │
│  (Use Cases, DTOs, Ports)    │
│         ↓ depends on         │
├──────────────────────────────┤
│         Domain               │
│  (Entities, Value Objects,   │
│   Domain Events, Interfaces) │
│         ↑ implements         │
├──────────────────────────────┤
│      Infrastructure          │
│  (DB, HTTP Clients, Queues,  │
│   DI Container)              │
└──────────────────────────────┘
```

## Layer Responsibilities

| Layer | Owns | Does NOT Own |
|-------|------|-------------|
| Domain | Business rules, invariants, entities, value objects | Framework annotations, DB mappings, serialization |
| Application | Use cases, orchestration, transaction boundaries | HTTP details, DB queries, infrastructure concerns |
| Infrastructure | DB implementations, API clients, message producers | Business rules, use case orchestration |
| Presentation | HTTP routing, input validation, response formatting | Business logic, DB access |

## Per-Stack Domain Layer Rules

### TypeScript/NestJS

```typescript
// VALID — pure TypeScript, zero NestJS imports
export class Email {
  private constructor(public readonly value: string) {
    if (!value.includes('@')) throw new Error('Invalid email');
  }
  static create(value: string): Email { return new Email(value); }
}

// INVALID — NestJS decorator in domain
// @Entity() export class User { ... }  ← WRONG, belongs in infrastructure
```

### Go

```go
// VALID — no imports from database or HTTP packages
type UserRepository interface {
    FindByID(id UserID) (*User, error)
    Save(user *User) error
}

// Repository interface belongs in domain package
// Implementation in infrastructure/postgres package
```

### Python

```python
# VALID — pure dataclass, no framework imports
@dataclass
class Order:
    id: OrderId
    customer_id: CustomerId
    items: list[OrderItem]
    status: OrderStatus

    def add_item(self, item: OrderItem) -> None:
        if self.status != OrderStatus.PENDING:
            raise BusinessRuleError("Cannot modify non-pending order")
        self.items.append(item)
```

### Java/Spring

```java
// VALID — POJO, no Spring annotations
public class Product {
    private final ProductId id;
    private final Money price;
    private final String name;

    public Product(ProductId id, Money price, String name) {
        this.id = id;
        this.price = price;
        this.name = name;
    }
}

// INVALID — Spring annotation in domain
// @Entity public class Product { ... }  ← WRONG
```

## Application Layer Patterns

### Use Case Interface

```typescript
interface IUseCase<TCommand, TResult> {
  execute(command: TCommand): Promise<TResult>;
}

// Command
class CreateOrderCommand {
  constructor(
    public readonly customerId: string,
    public readonly items: Array<{ productId: string; quantity: number }>,
  ) {}
}

// Result
type CreateOrderResult =
  | { success: true; orderId: string }
  | { success: false; error: OrderError };
```

### Transaction Boundary

```typescript
class CreateOrderHandler implements IUseCase<CreateOrderCommand, CreateOrderResult> {
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly orderRepo: IOrderRepository,
    private readonly productRepo: IProductRepository,
    private readonly eventBus: IEventBus,
  ) {}

  async execute(command: CreateOrderCommand): Promise<CreateOrderResult> {
    return this.unitOfWork.execute(async (tx) => {
      const products = await this.productRepo.findByIds(command.items.map(i => i.productId));
      if (products.length !== command.items.length) {
        return { success: false, error: new ProductNotFoundError() };
      }
      const order = Order.create(command.customerId, products, command.items);
      await this.orderRepo.save(order, tx);
      await this.eventBus.publish(new OrderCreatedEvent(order.id));
      return { success: true, orderId: order.id.toString() };
    });
  }
}
```

## Infrastructure Layer Rules

- implements interfaces from Domain and Application layers
- contains all framework-specific code (ORM, HTTP, serialization)
- owns the DI container / Composition Root
- never imported by Domain or Application layers

### Dependency Injection

```typescript
// Composition Root — NestJS module
@Module({
  providers: [
    { provide: 'IOrderRepository', useClass: PostgresOrderRepository },
    { provide: 'IEventBus', useClass: KafkaEventBus },
    CreateOrderHandler,
  ],
  controllers: [OrderController],
})
export class OrderModule {}
```

## Common Layer Violations

| Violation | Example | Fix |
|-----------|---------|-----|
| Domain imports ORM | `import { Column } from 'typeorm'` | Move entity annotation to infrastructure layer |
| Application calls DB directly | `connection.query(...)` in use case | Inject repository interface instead |
| Controller contains business logic | `if (order.status === 'pending')` in controller | Move to use case or domain entity |
| Infrastructure contains business rules | Validation in repository implementation | Move validation to domain entity |
| Presentation depends on Domain | Controller receives domain entity | Map to DTO in presentation layer |
