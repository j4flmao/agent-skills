# Use Case Patterns

## Purpose

Use cases (also called interactors or application services) are the orchestrators of business operations. Each use case encapsulates a single business workflow — it receives typed input, coordinates domain objects and infrastructure ports, and produces typed output. Use cases live in the Application layer and depend only on the Domain layer.

## Use Case / Interactor Pattern

### Structure

A use case follows a consistent structure: receive a command/query DTO, validate preconditions, execute domain logic, persist changes, publish events, return a result.

```typescript
interface UseCase<I, O> {
  execute(input: I): Promise<O>
}

class PlaceOrderUseCase implements UseCase<PlaceOrderCommand, PlaceOrderResult> {
  constructor(
    private orderRepo: OrderRepository,
    private paymentGateway: PaymentGateway,
    private inventoryClient: InventoryClient,
    private unitOfWork: UnitOfWork,
    private eventBus: EventBus
  ) {}

  async execute(command: PlaceOrderCommand): Promise<PlaceOrderResult> {
    // 1. Load aggregate
    const customer = await this.orderRepo.findCustomer(command.customerId)
    if (!customer) return Result.failure('Customer not found')

    // 2. Rehydrate domain entity
    const order = Order.create(customer, command.items, command.shippingAddress)

    // 3. Execute domain logic (validates invariants)
    const payment = await this.paymentGateway.charge(order.total, customer.paymentMethod)
    order.confirmPayment(payment.transactionId)

    // 4. Coordinate with other services
    await this.inventoryClient.reserve(order.items)

    // 5. Persist within a transaction
    await this.unitOfWork.execute(async () => {
      await this.orderRepo.save(order)
    })

    // 6. Publish events
    for (const event of order.domainEvents) {
      await this.eventBus.publish(event)
    }

    return Result.success({ orderId: order.id, total: order.total })
  }
}
```

### Single Responsibility

Each use case handles exactly one business operation. Name use cases with imperative verbs:

- `RegisterUser`
- `ProcessPayment`
- `CancelSubscription`
- `UpdateShippingAddress`
- `GenerateInvoice`

A common mistake is creating a single `UserService` class with 20 methods. Each method should be a separate use case class.

```typescript
// BAD — God service
class UserService {
  async createUser() { /* ... */ }
  async updateProfile() { /* ... */ }
  async changePassword() { /* ... */ }
  async deactivateAccount() { /* ... */ }
  async updateEmail() { /* ... */ }
  async addPaymentMethod() { /* ... */ }
  // 15 more methods...
}

// GOOD — one class per use case
class CreateUserUseCase { /* ... */ }
class UpdateUserProfileUseCase { /* ... */ }
class ChangeUserPasswordUseCase { /* ... */ }
class DeactivateUserAccountUseCase { /* ... */ }
```

## Input DTOs

### Command Objects

Commands carry data into the use case. They are plain objects with no behavior. Use readonly/immutable types.

```typescript
interface PlaceOrderCommand {
  readonly customerId: string
  readonly items: ReadonlyArray<{
    productId: string
    quantity: number
  }>
  readonly shippingAddress: Address
  readonly paymentMethodId: string
  readonly couponCode?: string
}
```

### Validation at the Boundary

Input validation happens at the Presentation layer before the command is passed to the use case. The use case validates business rules, not data formats.

```typescript
// Presentation layer — input format validation
import { z } from 'zod'

const placeOrderSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
  })).min(1),
  shippingAddress: addressSchema,
  paymentMethodId: z.string().uuid(),
  couponCode: z.string().optional(),
})

type ValidatedCommand = z.infer<typeof placeOrderSchema>

function validate(input: unknown): ValidatedCommand {
  return placeOrderSchema.parse(input)
}

// Use case — business rule validation
class PlaceOrderUseCase {
  async execute(command: PlaceOrderCommand) {
    if (command.items.some(i => i.quantity > this.maxPerOrder)) {
      return Result.failure('Order exceeds maximum quantity')
    }
    // Business logic...
  }
}
```

### Validation Patterns

| Concern | Layer | Example |
|---------|-------|---------|
| Required fields | Presentation | Zod/Joi class-validator schema |
| Format (email, UUID, phone) | Presentation | Regex, format validators |
| Business rules | Use Case | Duplicate check, balance check |
| Data integrity | Infrastructure | Unique constraint, FK check |
| Authorization | Use Case | Can user act on this resource? |

## Output DTOs

### Result Types

Use cases return typed result objects. Never return domain entities directly. Never throw exceptions for expected failures.

```typescript
class Result<T> {
  private constructor(
    readonly success: boolean,
    readonly value?: T,
    readonly error?: string
  ) {}

  static success<T>(value: T): Result<T> {
    return new Result(true, value)
  }

  static failure<T>(error: string): Result<T> {
    return new Result(false, undefined, error)
  }

  isSuccess(): boolean { return this.success }
  getValue(): T {
    if (!this.success) throw new Error('Cannot get value from failed result')
    return this.value!
  }
  getError(): string {
    if (this.success) throw new Error('Cannot get error from successful result')
    return this.error!
  }
}

// Usage in controller
const result = await this.placeOrderUseCase.execute(command)
if (!result.isSuccess()) {
  return Response.badRequest(result.getError())
}
return Response.ok(result.getValue())
```

### Return Types per Use Case

| Use Case | Return Type |
|----------|-------------|
| Create entity | Entity ID + status |
| Query data | DTO with requested data |
| Process payment | Transaction ID + receipt |
| Generate report | File reference or stream |
| Delete entity | Success/void |

### Never Leak Domain Entities

The use case must map domain entities to DTOs before returning. The Presentation layer receives only DTOs.

```typescript
class GetUserProfileUseCase {
  constructor(private repo: UserRepository) {}

  async execute(query: GetUserProfileQuery): Promise<Result<UserProfileDTO>> {
    const user = await this.repo.findById(new UserId(query.userId))
    if (!user) return Result.failure('User not found')

    return Result.success({
      id: user.id.toString(),
      name: user.name.full,
      email: user.email.value,
      role: user.role.toString(),
      joinedAt: user.createdAt.toISOString(),
    })
  }
}
```

## Presenter Boundaries

### Separating Response Formatting

The use case returns domain-oriented result objects. The presenter (or response formatter) converts them to the external format (JSON, XML, HTML, gRPC).

```typescript
// Use case returns a generic result
class GetOrdersUseCase {
  async execute(query: GetOrdersQuery): Promise<Result<OrderDTO[]>> {
    const orders = await this.readRepo.findOrders(query)
    return Result.success(orders.map(order => this.toDTO(order)))
  }
}

// Presenter formats for the protocol
class HttpOrderPresenter {
  present(result: Result<OrderDTO[]>): HttpResponse {
    if (!result.isSuccess()) {
      return { statusCode: 404, body: { error: result.getError() } }
    }
    return {
      statusCode: 200,
      body: { data: result.getValue(), total: result.getValue().length },
    }
  }
}

class GraphQLOrderPresenter {
  present(result: Result<OrderDTO[]>): GraphQLResponse {
    if (!result.isSuccess()) {
      return { errors: [{ message: result.getError() }] }
    }
    return { data: { orders: result.getValue() } }
  }
}
```

### WebSocket and Streaming Presenters

For real-time protocols, presenters may push data through channels.

```typescript
class WebSocketOrderPresenter {
  constructor(private ws: WebSocket) {}

  present(result: Result<OrderDTO[]>): void {
    if (!result.isSuccess()) {
      this.ws.send(JSON.stringify({ type: 'error', message: result.getError() }))
      return
    }
    this.ws.send(JSON.stringify({ type: 'orders_updated', data: result.getValue() }))
  }
}
```

## Cross-Cutting Concerns

### Logging

Inject a logger interface (not a concrete logger) into each use case. Log entry, exit, and failures.

```typescript
class PlaceOrderUseCase {
  constructor(
    private orderRepo: OrderRepository,
    private logger: Logger
  ) {}

  async execute(command: PlaceOrderCommand) {
    this.logger.info('PlaceOrder started', { customerId: command.customerId })
    try {
      const result = await this.processOrder(command)
      this.logger.info('PlaceOrder succeeded', { orderId: result.getValue().orderId })
      return result
    } catch (error) {
      this.logger.error('PlaceOrder failed', { error, customerId: command.customerId })
      throw error
    }
  }
}
```

### Authorization

Authorization checks are a use case precondition. The use case receives an authenticated user context and checks permissions.

```typescript
interface AuthorizationService {
  canUserAction(userId: UserId, action: string, resource: string): Promise<boolean>
}

class CancelOrderUseCase {
  constructor(
    private orderRepo: OrderRepository,
    private auth: AuthorizationService
  ) {}

  async execute(command: CancelOrderCommand, userContext: UserContext): Promise<Result> {
    const authorized = await this.auth.canUserAction(
      userContext.userId, 'cancel', `order:${command.orderId}`
    )
    if (!authorized) return Result.failure('Not authorized')

    const order = await this.orderRepo.findById(new OrderId(command.orderId))
    if (!order) return Result.failure('Order not found')

    order.cancel(userContext.userId)
    await this.orderRepo.save(order)
    return Result.success()
  }
}
```

### Instrumentation

Metrics and tracing should wrap use cases transparently using decorators or middleware.

```typescript
// Decorator for metrics
class MetricsDecorator implements UseCase<I, O> {
  constructor(
    private inner: UseCase<I, O>,
    private metrics: MetricsClient,
    private useCaseName: string
  ) {}

  async execute(input: I): Promise<O> {
    const start = Date.now()
    try {
      const result = await this.inner.execute(input)
      this.metrics.recordDuration(this.useCaseName, Date.now() - start)
      this.metrics.incrementSuccess(this.useCaseName)
      return result
    } catch (error) {
      this.metrics.incrementFailure(this.useCaseName)
      throw error
    }
  }
}
```

## Use Case Composition

### Orchestrating Multiple Use Cases

When a business operation requires multiple use cases, create a higher-level use case that composes them.

```typescript
class OnboardingWorkflow {
  constructor(
    private createUser: CreateUserUseCase,
    private setupBilling: SetupBillingUseCase,
    private sendWelcome: SendWelcomeUseCase,
    private logger: Logger
  ) {}

  async execute(command: OnboardUserCommand): Promise<Result<OnboardingResult>> {
    // Step 1: Create the user account
    const userResult = await this.createUser.execute({
      name: command.name,
      email: command.email,
    })
    if (!userResult.isSuccess()) return Result.failure(userResult.getError())
    const { userId } = userResult.getValue()

    try {
      // Step 2: Set up billing
      const billingResult = await this.setupBilling.execute({
        userId,
        plan: command.plan,
        paymentMethod: command.paymentMethod,
      })
      if (!billingResult.isSuccess()) {
        // Compensate: roll back user creation
        await this.createUser.rollback(userId)
        return Result.failure(billingResult.getError())
      }

      // Step 3: Send welcome
      await this.sendWelcome.execute({ userId, email: command.email })

      return Result.success({ userId, billingId: billingResult.getValue().billingId })
    } catch (error) {
      // Compensate
      await this.createUser.rollback(userId).catch(e => this.logger.error('Rollback failed', e))
      return Result.failure('Onboarding failed')
    }
  }
}
```

### Transaction Scripts in Use Cases

For simple CRUD operations, the use case may be a straightforward transaction script. This is acceptable when business logic is minimal.

```typescript
class UpdateUserNameUseCase {
  constructor(private repo: UserRepository) {}

  async execute(command: UpdateUserNameCommand): Promise<Result> {
    const user = await this.repo.findById(new UserId(command.userId))
    if (!user) return Result.failure('User not found')

    user.changeName(Name.create(command.firstName, command.lastName))
    await this.repo.save(user)
    return Result.success()
  }
}
```

## Transaction Boundaries

### Unit of Work

The use case defines the transaction boundary. All repository operations within a single use case execute atomically.

```typescript
class TransferFundsUseCase {
  constructor(
    private accountRepo: AccountRepository,
    private unitOfWork: UnitOfWork
  ) {}

  async execute(command: TransferFundsCommand): Promise<Result> {
    return this.unitOfWork.execute(async () => {
      const fromAccount = await this.accountRepo.findById(new AccountId(command.fromAccountId))
      const toAccount = await this.accountRepo.findById(new AccountId(command.toAccountId))

      if (!fromAccount || !toAccount) return Result.failure('Account not found')

      fromAccount.withdraw(Money.from(command.amount))
      toAccount.deposit(Money.from(command.amount))

      await this.accountRepo.save(fromAccount)
      await this.accountRepo.save(toAccount)

      return Result.success()
    })
  }
}
```

### Transaction Propagation Rules

| Scenario | Behavior |
|----------|----------|
| Single aggregate write | One transaction, one repository save |
| Multiple aggregate writes | One transaction, Unit of Work coordinates |
| read-only query | No transaction needed |
| External API call | Never inside a transaction |
| Event publishing | After transaction commit (outbox pattern) |

## Testing Use Cases

```typescript
describe('PlaceOrderUseCase', () => {
  let useCase: PlaceOrderUseCase
  let mockOrderRepo: jest.Mocked<OrderRepository>
  let mockPaymentGateway: jest.Mocked<PaymentGateway>
  let mockEventBus: jest.Mocked<EventBus>

  beforeEach(() => {
    mockOrderRepo = { findCustomer: jest.fn(), save: jest.fn() }
    mockPaymentGateway = { charge: jest.fn() }
    mockEventBus = { publish: jest.fn() }
    useCase = new PlaceOrderUseCase(mockOrderRepo, mockPaymentGateway, mockEventBus)
  })

  it('places order successfully', async () => {
    mockOrderRepo.findCustomer.mockResolvedValue(customerFixture)
    mockPaymentGateway.charge.mockResolvedValue({ transactionId: 'tx-123' })

    const result = await useCase.execute(validCommand)

    expect(result.isSuccess()).toBe(true)
    expect(mockOrderRepo.save).toHaveBeenCalled()
    expect(mockEventBus.publish).toHaveBeenCalledTimes(1)
  })

  it('fails when customer not found', async () => {
    mockOrderRepo.findCustomer.mockResolvedValue(null)

    const result = await useCase.execute(validCommand)

    expect(result.isSuccess()).toBe(false)
    expect(result.getError()).toBe('Customer not found')
    expect(mockOrderRepo.save).not.toHaveBeenCalled()
  })

  it('fails when payment declines', async () => {
    mockOrderRepo.findCustomer.mockResolvedValue(customerFixture)
    mockPaymentGateway.charge.mockRejectedValue(new Error('Card declined'))

    const result = await useCase.execute(validCommand)

    expect(result.isSuccess()).toBe(false)
  })
})
```

## Key Points

- Each use case handles exactly one business operation — one class, one public method.
- Use cases receive typed command DTOs, not raw request objects.
- Use cases return typed result objects, never domain entities.
- Validation is split: format validation in Presentation, business rule validation in the Use Case.
- Transaction boundaries are defined at the use case level using Unit of Work.
- Cross-cutting concerns (logging, auth, metrics) are injected as port interfaces.
- Use cases compose to form higher-level workflows with compensating actions.
- Every use case is independently testable because all dependencies are injected.
- Domain entities are never leaked outside the Application layer.
