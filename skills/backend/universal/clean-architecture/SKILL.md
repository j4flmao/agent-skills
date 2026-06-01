---
name: backend-clean-architecture
description: >
  Use this skill when the user asks 'where does this code go', 'what layer', 'clean architecture', 'hexagonal', 'ports and adapters', 'domain layer', 'application layer', 'infrastructure layer', 'should this be in service or repository', or when designing or reviewing backend code organization. This skill enforces strict Clean/Hexagonal Architecture layer rules — Domain has ZERO dependencies on infrastructure. Applies to NestJS, Go, Rust, Python, Spring Boot. Do NOT use for: database optimization, API endpoint design, or frontend code organization.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, architecture, phase-2, universal]
---

# Backend Clean Architecture

## Purpose
Enforce strict layer separation in backend code. Domain layer has zero dependencies on frameworks, databases, or external libraries. Every piece of code must belong to exactly one layer.

## Agent Protocol

### Trigger
Exact user phrases: "where does this code go", "what layer", "clean architecture", "hexagonal", "ports and adapters", "domain layer", "application layer", "infrastructure layer", "should this be in service or repository", "layer violation", "architecture rule".

### Input Context
Before activating, verify:
- The stack is known (NestJS, Go, Rust, Python, Spring Boot).
- The user has described a specific piece of code or asked about a specific location.
- The project's folder structure is visible or has been described.

### Output Artifact
No file output. This skill produces text guidance.

### Response Format
Answer exactly:
```
{code piece} -> {Layer}: {one-sentence justification}
File: {suggested file path}
```

If there is a violation:
```
VIOLATION: {file}:{line}
Layer {X} imports Layer {Y} which is NOT allowed.
Fix: {specific refactor instruction}
Direction: {layer name} -> {layer name} is the correct direction.
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output.

### Completion Criteria
- [ ] The layer for the code has been identified.
- [ ] If a violation exists, it has been identified with specific file/line.
- [ ] The fix direction has been specified.
- [ ] No layer rules have been explained — only applied.

### Max Response Length
Layer assignment: 3 lines. Violation: 5 lines.

## Architecture Decision Tree

### Where Does This Code Go?

```
Is the code a business concept/rule?
  ├── Yes → Does it depend on a framework, DB, or external library?
  │         ├── No  → Domain Layer (Entity, Value Object, Domain Service, Repository Interface)
  │         └── Yes → INFRASTRUCTURE LAYER VIOLATION — extract pure logic to Domain
  ├── No → Does it orchestrate business operations?
  │         ├── Yes → Application Layer (Use Case, Command/Query Handler, Port Interface)
  │         └── No → Does it handle external input (HTTP, CLI, message)?
  │                  ├── Yes → Presentation Layer (Controller, Middleware, DTO, Resolver)
  │                  └── No → Does it implement external concerns?
  │                           ├── Yes → Infrastructure Layer (DB repo, API client, queue)
  │                           └── No → Reconsider the architecture — every piece fits one layer
```

### Dependency Direction Decision Tree

```
Code A imports Code B. Is Code B in a layer that A may depend on?
  A = Domain   → B must be Domain (or stdlib) — no other layer allowed
  A = Application → B may be Domain or Application — never Infrastructure
  A = Presentation → B may be Application (DTOs) — never Domain entities directly
  A = Infrastructure → B may be Domain interfaces, Application interfaces, or Infrastructure
```

## Layer Structure

### Domain Layer (Core)
The Domain layer is the innermost layer. It contains entities, value objects, domain events, domain services, and repository interfaces (ports). This layer has zero dependencies on anything external — no frameworks, no databases, no HTTP libraries, no ORM annotations. It uses only standard library types.

Domain entities encapsulate business rules and invariants. Value objects are immutable and compared by value. Domain events represent something meaningful that happened in the domain. Repository interfaces define the contract for data access without specifying the implementation. Domain services orchestrate domain logic that doesn't naturally belong to a single entity.

```typescript
// Domain — pure business logic, zero external dependencies
export class Email {
  private constructor(public readonly value: string) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error('Invalid email');
  }
  static create(value: string): Email { return new Email(value); }
  equals(other: Email): boolean { return this.value === other.value; }
}
```

```python
# Domain — Python dataclass, no framework imports
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

    @property
    def total(self) -> Money:
        return sum((item.price * item.quantity) for item in self.items)
```

### Application Layer (Use Cases)
The Application layer contains use case interactors, application services, command/query handlers, DTOs, and port interfaces. It depends only on the Domain layer. Use cases orchestrate the flow of data to and from the Domain layer. Each use case has a single responsibility: execute a specific business operation.

```typescript
// Application — orchestrates domain, depends only on Domain interfaces
class CreateOrderHandler {
  constructor(
    private readonly orderRepo: IOrderRepository,
    private readonly productRepo: IProductRepository,
    private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(command: CreateOrderCommand): Promise<Result<OrderDTO>> {
    return this.unitOfWork.execute(async () => {
      const products = await this.productRepo.findByIds(command.productIds);
      if (products.length !== command.productIds.length) {
        return Result.failure(new NotFoundError('Some products not found'));
      }
      const order = Order.create(command.customerId, products.map(p => 
        new OrderItem(p.id, p.price, command.items.find(i => i.productId === p.id)!.quantity)
      ));
      await this.orderRepo.save(order);
      return Result.success(order.toDTO());
    });
  }
}
```

### Interface Adapters Layer (Presentation)
Contains controllers, routes, GraphQL resolvers, CLI commands, middleware, guards, and interceptors. Depends on Application DTOs only — never on Domain entities directly.

### Frameworks and Drivers Layer (Infrastructure)
Contains database implementations (ORM models, repositories), HTTP clients, message queue producers/consumers, file system access, and external service integrations. Implements interfaces from Domain and Application layers.

### Layer Dependency Diagram
```
Presentation → Application → Domain ← Infrastructure
                 ↓               ↑
            Application ←── Infrastructure (implements interfaces)
```

### Dependency Rule (Strict Check)
```typescript
// VIOLATION: Domain imports infrastructure
import { Entity, Column } from 'typeorm';  // WRONG

@Entity()  // WRONG — ORM annotation in Domain
export class User { ... }

// CORRECT: Domain has zero imports from outside Domain
export class User {
  constructor(
    public readonly id: UserId,
    public readonly name: Name,
    public readonly email: Email,
  ) {}
}
```

## Dependency Inversion

### Port and Adapter Pattern
```
Port: interface UserRepository { findById(id): User }
Adapter: class PostgresUserRepository implements UserRepository
```

Ports are interfaces defined in the Domain or Application layer. Adapters are concrete implementations in the Infrastructure layer. The pattern ensures that the core business logic (Domain + Application) never directly depends on infrastructure code.

### Composition Root
The Composition Root is the entry point of the application where all dependencies are wired together. It is located in the Infrastructure layer. The Composition Root creates concrete implementations and injects them into the Application layer.

```typescript
// Composition Root — the ONLY place where concrete implementations are instantiated
function buildContainer(): Container {
  const db = new PostgresConnection(config.dbUrl);
  const userRepo = new PostgresUserRepository(db);
  const emailService = new SendGridEmailService(config.sendGridKey);
  return {
    createUserUseCase: new CreateUserUseCase(userRepo, emailService),
    getUserUseCase: new GetUserUseCase(userRepo),
  };
}
```

## Use Case Isolation

### Single Responsibility per Use Case
Each use case handles exactly one business operation: `CreateOrder`, `ProcessPayment`, `UpdateUserProfile`. Use cases are not services with many methods — they are individual classes or functions.

```python
# GOOD: One class per use case
class CreateOrderUseCase:
    def __init__(self, repo: OrderRepository, uow: UnitOfWork):
        self.repo = repo
        self.uow = uow

    async def execute(self, command: CreateOrderCommand) -> Result[OrderDTO]:
        async with self.uow:
            order = Order.create(command.customer_id, command.items)
            await self.repo.save(order)
            return Result.success(OrderDTO.from_domain(order))

# BAD: God service with many methods
class OrderService:
    async def create_order(self, cmd): ...  # should be its own class
    async def cancel_order(self, cmd): ...  # should be its own class
    async def ship_order(self, cmd): ...    # should be its own class
```

### Command and Query Separation
Commands change state (mutations). Queries return data (no side effects).

```typescript
// Command — mutates state, returns success/failure
class CancelOrderCommand {
  constructor(public readonly orderId: string, public readonly reason: string) {}
}
class CancelOrderHandler implements ICommandHandler<CancelOrderCommand, Result> {
  async handle(command: CancelOrderCommand): Promise<Result> { ... }
}

// Query — returns data, no side effects
class GetOrderQuery {
  constructor(public readonly orderId: string) {}
}
class GetOrderHandler implements IQueryHandler<GetOrderQuery, OrderDTO> {
  async handle(query: GetOrderQuery): Promise<OrderDTO | null> { ... }
}
```

### Use Case Transaction Boundaries
Transactions belong in Application layer use cases — not in controllers, not in repositories.

```typescript
class TransferFundsHandler {
  constructor(
    private readonly accountRepo: IAccountRepository,
    private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(command: TransferFundsCommand): Promise<Result> {
    return this.unitOfWork.execute(async () => {
      const from = await this.accountRepo.findById(command.fromAccountId);
      const to = await this.accountRepo.findById(command.toAccountId);
      if (!from || !to) return Result.failure('Account not found');
      from.withdraw(command.amount);
      to.deposit(command.amount);
      await this.accountRepo.save(from);
      await this.accountRepo.save(to);
      return Result.success();
    });
  }
}
```

## Entity Boundaries

### Aggregate Design Principles
- Aggregate = cluster of domain objects treated as a single unit
- One aggregate per transaction — never modify multiple aggregates in one transaction
- Reference other aggregates by ID only, never by object reference
- Aggregate root is the single entry point — all operations go through the root

```typescript
// Aggregate Root: Order
class Order extends AggregateRoot {
  private items: OrderItem[] = [];
  
  addItem(product: Product, quantity: number): void {
    if (this.status !== OrderStatus.PENDING) throw new Error('Order locked');
    this.items.push(new OrderItem(product.id, product.price, quantity));
    this.addDomainEvent(new ItemAddedEvent(this.id, product.id, quantity));
  }
  
  // References Product by ID only — does NOT hold Product entity
  private items: OrderItem[];
}

// Value Object: OrderItem (immutable, no identity)
class OrderItem {
  constructor(
    readonly productId: ProductId,  // reference to other aggregate by ID
    readonly price: Money,
    readonly quantity: number,
  ) {}
}
```

### Entity Boundary Rules
| Rule | Rationale |
|------|-----------|
| One aggregate per transaction | Avoid distributed transaction complexity |
| Reference by ID, not by object | Lazy loading, clear boundaries |
| Aggregate root protects invariants | Consistency boundary |
| Small aggregates > large aggregates | Performance, concurrency |
| Value objects are immutable | Thread safety, no identity confusion |

## DTO and Mapper Patterns

### DTO Design
DTOs are simple data containers with no behavior. They exist at the Presentation boundary. Never expose Domain entities directly to external consumers.

```typescript
// Presentation DTO — flat, serializable, no behavior
interface CreateOrderRequest {
  customerId: string;
  items: Array<{ productId: string; quantity: number }>;
}

interface OrderResponse {
  id: string;
  status: string;
  total: number;
  currency: string;
  createdAt: string;
}
```

### Mapping Strategy
```typescript
// Presentation layer mapper — converts Domain → DTO
function orderToResponse(order: Order): OrderResponse {
  return {
    id: order.id.toString(),
    status: order.status,
    total: order.total.amount,
    currency: order.total.currency,
    createdAt: order.createdAt.toISOString(),
  };
}
```

```python
# Presentation layer mapper
def order_to_response(order: Order) -> OrderResponse:
    return OrderResponse(
        id=str(order.id),
        status=order.status.value,
        total=order.total.amount,
        currency=order.total.currency,
        created_at=order.created_at.isoformat(),
    )
```

### Anti-Pattern: Serializing Domain Entities Directly
```typescript
// WRONG — exposing Domain entity to external consumer
@Get('/orders/:id')
async getOrder(id: string): Promise<Order> {
  return this.orderRepo.findById(id);  // breaks encapsulation, couples API to domain
}

// CORRECT — map to DTO
@Get('/orders/:id')
async getOrder(id: string): Promise<OrderResponse> {
  const order = await this.handler.execute(new GetOrderQuery(id));
  return orderToResponse(order);
}
```

## Error Handling Across Layers

### Layer-Specific Error Types
```
Domain:   DomainError (business rule violations)
App:      ApplicationError (not found, not authorized, use case failures)
Infra:    InfrastructureError (network failure, DB connection lost)
Presentation: HTTP status code mapping (404, 409, 422, 500)
```

```typescript
// Domain — business concept error
class InsufficientBalanceError extends DomainError {
  constructor(accountId: string) {
    super(`Account ${accountId} has insufficient balance`);
    this.code = 'INSUFFICIENT_BALANCE';
  }
}

// Application — use case error
class NotFoundError extends ApplicationError {
  constructor(entity: string, id: string) {
    super(`${entity} with id ${id} not found`);
    this.code = 'NOT_FOUND';
  }
}

// Presentation — maps domain/app errors to HTTP
class ErrorMapper {
  map(error: DomainError | ApplicationError): { status: number; body: object } {
    if (error instanceof InsufficientBalanceError) return { status: 422, body: { code: error.code } };
    if (error instanceof NotFoundError) return { status: 404, body: { code: error.code } };
    return { status: 500, body: { code: 'INTERNAL_ERROR' } };
  }
}
```

## Validation

### Validation Layer Assignment
| Validation Type | Layer | Example |
|---|---|---|
| Input format (email, required fields) | Presentation | Zod/Joi schema validation |
| Business rules (duplicate, insufficient) | Domain | Entity invariant checks |
| Authorization (can user edit this?) | Application | Permission check |
| Data integrity (FK exists) | Infrastructure | DB constraint |

## Testing Strategy

### Per-Layer Testing
| Layer | Test Type | What to Test | Mock/Real |
|---|---|---|---|
| Domain | Unit | Entities, VOs, domain services, invariants | Nothing — pure logic |
| Application | Integration | Use cases, command/query handlers | Mock ports (interfaces) |
| Infrastructure | Integration | DB queries, API client, message queues | Real DB (test container), mock server |
| Presentation | E2E | Controllers, resolvers, middleware, request/response | Test server instance |

```typescript
// Domain test — zero mocks
describe('Email Value Object', () => {
  it('rejects invalid format', () => {
    expect(() => Email.create('not-an-email')).toThrow('Invalid email');
  });
  it('accepts valid email', () => {
    expect(Email.create('user@example.com').value).toBe('user@example.com');
  });
});

// Application test — mock ports
describe('CreateOrderHandler', () => {
  it('returns order ID on success', async () => {
    const result = await handler.execute(validCommand);
    expect(result.isSuccess()).toBe(true);
    expect(mockOrderRepo.save).toHaveBeenCalled();
  });
});
```

## Cross-Cutting Concerns

### Logging
Define interface in Application, implement in Infrastructure:
```typescript
// Application port
interface ILogger {
  info(msg: string, ctx?: object): void;
  error(msg: string, ctx?: object): void;
  warn(msg: string, ctx?: object): void;
}
```

### Caching
```typescript
// Application port
interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl: number): Promise<void>;
  invalidate(key: string): Promise<void>;
}
```

## Production Considerations

### Performance
- Domain entities should be lightweight — no lazy loading, no proxies
- Use read-only DTOs for queries to avoid loading full aggregates
- Cache application-level DTOs, not domain entities
- Repository methods should batch-load to avoid N+1

### Security
- Domain layer validates ALL inputs — trust no layer below
- Infrastructure layer sanitizes all external data
- Never log domain entity internals (may contain PII)
- Authentication in Presentation, Authorization in Application

### Anti-Patterns
1. **Anemic Domain Model**: Entities with only getters/setters, all logic in services → move logic into entities
2. **Service Locator**: Calling `container.resolve()` in application code → use constructor injection
3. **Leaky Abstraction**: Exposing ORM entities as domain entities → map at infrastructure boundary
4. **God Use Case**: A use case doing too many things → split into single-responsibility use cases
5. **Transaction in Controller**: Opening a DB transaction in a controller → move to application layer

### Trade-Offs
| Decision | Benefit | Cost |
|---|---|---|
| Separate application + domain layers | Clear separation of concerns | More files, more boilerplate |
| CQRS with clean architecture | Optimized read/write models | Eventual consistency complexity |
| Strict interface definitions | Testable, swappable implementations | Interface maintenance overhead |
| Domain events | Loose coupling, audit trail | Eventual consistency, debugging complexity |
| Repository pattern | Abstracted data access | ORM feature leakage risk |

## Rules
- Domain has ZERO imports from infrastructure. This is non-negotiable.
- All external dependencies enter through interfaces (ports) defined in Domain/Application.
- DTOs exist at the Presentation boundary. Domain entities are never serialized directly.
- Repository interfaces (ports) live in Domain. Repository implementations live in Infrastructure.
- Application owns the business flow. Domain owns the business rules.
- Controllers never call repositories directly. They always go through Application use cases.
- If you cannot classify code into one of the four layers, the architecture is wrong.
- Never use `container.resolve()` outside the Composition Root.
- Never throw HTTP-specific exceptions from Application or Domain layers.
- Every public method in Domain should be unit-testable with zero mocks.

## References
  - references/clean-arch-fundamentals.md — Clean Architecture Fundamentals
  - references/clean-arch-advanced.md — Clean Architecture Advanced Patterns
  - references/clean-arch-errors.md — Clean Architecture Error Handling
  - references/clean-arch-events.md — Clean Architecture Domain Events
  - references/clean-arch-testing.md — Clean Architecture Testing
  - references/dependency-injection.md — Dependency Injection
  - references/dependency-rule-deep.md — Dependency Rule Deep Dive
  - references/entity-boundaries.md — Entity Boundaries and Aggregate Design
  - references/layer-structure.md — Layer Structure
  - references/use-case-patterns.md — Use Case Patterns
## Handoff
No artifact produced.
Next skill: backend-api-design — after layers are defined, design API contracts that respect layer boundaries.
Carry forward: stack, layer decisions, interface definitions.
