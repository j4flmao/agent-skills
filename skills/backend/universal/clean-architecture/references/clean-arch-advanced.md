# Clean Architecture Advanced Patterns

## Advanced Use Case Composition

### Workflow Orchestration
Complex business operations often span multiple use cases. Create a workflow orchestrator that composes use cases with compensation logic.

```typescript
class OnboardingWorkflow {
  constructor(
    private createUser: CreateUserHandler,
    private setupBilling: SetupBillingHandler,
    private sendWelcome: SendWelcomeHandler,
    private logger: ILogger,
  ) {}

  async execute(command: OnboardUserCommand): Promise<Result<OnboardingResult>> {
    const userResult = await this.createUser.execute({ name: command.name, email: command.email });
    if (!userResult.isSuccess()) return Result.failure(userResult.getError());
    const { userId } = userResult.getValue();

    try {
      const billingResult = await this.setupBilling.execute({ userId, plan: command.plan });
      if (!billingResult.isSuccess()) {
        await this.createUser.compensate(userId);
        return Result.failure(billingResult.getError());
      }
      await this.sendWelcome.execute({ userId, email: command.email });
      return Result.success({ userId, billingId: billingResult.getValue().billingId });
    } catch (error) {
      await this.createUser.compensate(userId);
      this.logger.error('Onboarding failed', { userId, error });
      return Result.failure('Onboarding failed');
    }
  }
}
```

### Unit of Work with Eventual Dispatch
Domain events must be dispatched AFTER the transaction commits, not before. Store events in an outbox within the same transaction.

```typescript
class UnitOfWork {
  async execute<T>(fn: (outbox: EventOutbox) => Promise<T>): Promise<T> {
    const tx = await this.connection.beginTransaction();
    try {
      const outbox = new EventOutbox(tx);
      const result = await fn(outbox);
      await tx.commit();
      await this.dispatcher.dispatch(outbox.getEvents());
      return result;
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }
}
```

## Testing Strategies

### Architectural Test (Dependency Rule Enforcement)
Automated tests that verify layer boundaries are not violated.

```typescript
describe('Architecture Constraints', () => {
  it('domain has zero infrastructure imports', () => {
    const files = glob.sync('src/domain/**/*.ts');
    const violations = files.filter(f => {
      const content = readFileSync(f, 'utf-8');
      return /from ['"]\.\.\/infrastructure|from ['"]src\/infrastructure/.test(content);
    });
    expect(violations).toEqual([]);
  });

  it('presentation does not import domain directly', () => {
    const files = glob.sync('src/presentation/**/*.ts');
    const violations = files.filter(f => {
      const content = readFileSync(f, 'utf-8');
      return /from ['"]\.\.\/domain|from ['"]src\/domain/.test(content);
    });
    expect(violations).toEqual([]);
  });
});
```

### Fakes vs Mocks Decision
- Use **Fakes** (in-memory implementations) when the interface is used across many tests
- Use **Mocks** when you need to verify specific interaction patterns
- Never mock Domain entities — use real instances

```typescript
// Fake for testing — used across many test files
class InMemoryOrderRepository implements IOrderRepository {
  private store = new Map<string, Order>();
  async findById(id: OrderId): Promise<Order | null> {
    return this.store.get(id.toString()) ?? null;
  }
  async save(order: Order): Promise<void> {
    this.store.set(order.id.toString(), order);
  }
}
```

## Entity Boundary Design

### Aggregate Size Trade-offs
| Aggregate Size | Concurrency | Consistency | Complexity |
|---|---|---|---|
| Small (1 entity) | High | Weak | Low |
| Medium (3-5 entities) | Medium | Strong | Medium |
| Large (10+ entities) | Low | Strong | High |

Rule: Start small. Expand only when a transaction spanning multiple entities is proven necessary.

### Value Object Design Patterns
```typescript
// Wrapper value object — encapsulates primitive validation
class Money {
  constructor(readonly amount: number, readonly currency: string) {
    if (amount < 0) throw new Error('Amount negative');
    if (currency.length !== 3) throw new Error('Invalid currency code');
  }
  add(other: Money): Money {
    if (this.currency !== other.currency) throw new Error('Currency mismatch');
    return new Money(this.amount + other.amount, this.currency);
  }
}

// Composite value object — groups related values
class Address {
  constructor(
    readonly street: string,
    readonly city: string,
    readonly postalCode: string,
    readonly country: string,
  ) {}
}
```

## Performance in Clean Architecture

### Read Model Optimization
For queries that don't need the full aggregate, bypass the domain model and use a dedicated read model:

```typescript
// Application layer — lightweight query handler
class GetOrderSummaryHandler implements IQueryHandler<GetOrderSummaryQuery, OrderSummaryDTO> {
  constructor(private readonly readRepo: IOrderReadRepository) {}

  async execute(query: GetOrderSummaryQuery): Promise<OrderSummaryDTO | null> {
    // Direct query, no aggregate reconstruction — much faster
    return this.readRepo.findSummary(query.orderId);
  }
}
```

### Avoiding Aggregate Reconstruction Overhead
For read-heavy paths, maintain a denormalized read model that is updated asynchronously via domain events.

```
Write Path: Command → Aggregate → Save Events → Publish Event
Read Path:  Query → Read Model (denormalized, pre-joined) → DTO
```

## Security Considerations

### Authentication in Presentation
Authentication checks happen at the Presentation layer (middleware). The Application layer receives an already-authenticated user context.

```typescript
// Presentation middleware — extracts and verifies token
@Injectable()
class AuthMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization?.split(' ')[1];
    const user = this.jwtService.verify(token);
    req.user = { id: user.sub, role: user.role };
    next();
  }
}
```

### Authorization in Application
Authorization checks (does this user have permission to perform this action?) happen in the Application layer.

```typescript
class CancelOrderHandler {
  async execute(command: CancelOrderCommand, user: UserContext): Promise<Result> {
    if (!this.auth.can(user, 'cancel', `order:${command.orderId}`)) {
      return Result.failure(new UnauthorizedError());
    }
    // ...
  }
}
```

## Anti-Pattern Catalog

### Anemic Domain Model
**Symptoms**: Entities are plain data bags with getters/setters. All business logic lives in services.  
**Fix**: Move validation, computation, and business rules into entity methods. Services orchestrate, entities decide.

### Service Locator
**Symptoms**: `container.resolve()` calls scattered through application code.  
**Fix**: Inject all dependencies through constructors. Container is used only in Composition Root.

### Domain Event in Infrastructure
**Symptoms**: Domain events defined in Infrastructure layer, containing serialization logic.  
**Fix**: Define domain events as pure objects in Domain. Convert to integration events at the boundary.

### Premature Optimization
**Symptoms**: Adding read models, caching, or CQRS before profiling proves the need.  
**Fix**: Build with simple patterns first. Profile. Optimize only the bottleneck.

### Shared Entity Across Bounded Contexts
**Symptoms**: A single `User` entity shared across Order, Payment, and Shipping contexts.  
**Fix**: Each bounded context owns its version of the concept (e.g., Order has `Customer`, Payment has `Payer`).

## Production Readiness Checklist

- [ ] Domain layer has zero framework imports — verified by architecture test
- [ ] All external dependencies are behind interfaces (ports)
- [ ] Composition Root is a single, testable function
- [ ] Use cases return Result types, never throw for expected failures
- [ ] Domain events dispatch AFTER transaction commit
- [ ] No Service Locator pattern — constructor injection only
- [ ] Infrastructure tests use test containers, not mocks
- [ ] Architecture tests run in CI to prevent layer violations
- [ ] Every aggregate boundary is documented
- [ ] Read models are rebuildable from domain events
