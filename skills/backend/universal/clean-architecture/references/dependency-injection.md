# Dependency Injection

## Purpose

Dependency Injection (DI) is the mechanism that wires the Clean Architecture layers together at runtime. It implements the Dependency Inversion Principle by injecting concrete implementations (Infrastructure) into abstract interfaces (Domain/Application). The Composition Root — the single place where all dependencies are assembled — is the entry point of the application.

## DI Container Patterns

### Manual DI (Poor Man's DI)

No container library. Dependencies are wired by hand in the Composition Root. Best for small applications with few dependencies.

```typescript
// composition-root.ts
import { PostgresUserRepository } from './infrastructure/repositories/postgres-user-repository'
import { SendGridEmailService } from './infrastructure/services/sendgrid-email-service'
import { CreateUserUseCase } from './application/use-cases/create-user-use-case'
import { UserController } from './presentation/controllers/user-controller'

function createContainer() {
  const userRepository = new PostgresUserRepository(createPool())
  const emailService = new SendGridEmailService(apiKey)
  const createUserUseCase = new CreateUserUseCase(userRepository, emailService)
  const userController = new UserController(createUserUseCase)
  return { userController }
}
```

```go
// wire.go - manual wiring
func InitializeApp() (*App, error) {
    db := infrastructure.NewPostgresDB(cfg.DatabaseURL)
    userRepo := infrastructure.NewPostgresUserRepository(db)
    emailSvc := infrastructure.NewSendGridEmailService(cfg.SendGridKey)
    createUserUC := application.NewCreateUserUseCase(userRepo, emailSvc)
    handler := presentation.NewUserHandler(createUserUC)
    router := presentation.NewRouter(handler)
    return &App{Router: router}, nil
}
```

### tsyringe (TypeScript DI Container)

Lightweight container for TypeScript/JavaScript. Uses decorators or constructor signature reflection.

```typescript
import { container, injectable, inject } from 'tsyringe'

@injectable()
class PostgresUserRepository implements UserRepository {
  constructor(@inject('Database') private db: Database) {}
  async findById(id: UserId): Promise<User | null> {
    const row = await this.db.query('SELECT * FROM users WHERE id = $1', [id])
    return row ? this.toDomain(row) : null
  }
}

@injectable()
class CreateUserUseCase {
  constructor(
    @inject('UserRepository') private repo: UserRepository,
    @inject('EmailService') private email: EmailService
  ) {}
}

// Composition Root
import 'reflect-metadata'
container.registerSingleton('Database', Database)
container.registerSingleton('UserRepository', PostgresUserRepository)
container.registerSingleton('EmailService', SendGridEmailService)
container.registerSingleton(CreateUserUseCase)

const useCase = container.resolve(CreateUserUseCase)
```

### InversifyJS (TypeScript Full-Featured DI)

Provides more advanced features: named bindings, contextual bindings, interceptors, and middleware.

```typescript
import { Container, injectable, inject, decorate } from 'inversify'

const TYPES = {
  UserRepository: Symbol.for('UserRepository'),
  EmailService: Symbol.for('EmailService'),
  CreateUserUseCase: Symbol.for('CreateUserUseCase'),
}

@injectable()
class PostgresUserRepository implements UserRepository {
  constructor(@inject(TYPES.Database) private db: Database) {}
}

@injectable()
class CreateUserUseCase {
  constructor(
    @inject(TYPES.UserRepository) private repo: UserRepository,
    @inject(TYPES.EmailService) private email: EmailService
  ) {}
}

const container = new Container()
container.bind<Database>(TYPES.Database).to(Database).inSingletonScope()
container.bind<UserRepository>(TYPES.UserRepository).to(PostgresUserRepository).inRequestScope()
container.bind<EmailService>(TYPES.EmailService).to(SendGridEmailService).inSingletonScope()
container.bind<CreateUserUseCase>(TYPES.CreateUserUseCase).to(CreateUserUseCase)

// Named bindings for multiple implementations
container.bind<PaymentGateway>('PaymentGateway')
  .to(StripePaymentGateway)
  .whenTargetNamed('primary')
container.bind<PaymentGateway>('PaymentGateway')
  .to(PayPalPaymentGateway)
  .whenTargetNamed('fallback')
```

### NestJS DI (Framework-Managed)

NestJS has built-in DI with modules as the composition boundary.

```typescript
// user.module.ts
@Module({
  imports: [DatabaseModule, EmailModule],
  controllers: [UserController],
  providers: [
    { provide: 'UserRepository', useClass: PostgresUserRepository },
    { provide: 'EmailService', useClass: SendGridEmailService },
    CreateUserUseCase,
  ],
  exports: [CreateUserUseCase],
})
export class UserModule {}

// Custom provider factories
@Module({
  providers: [
    {
      provide: 'CacheService',
      useFactory: (config: ConfigService) => {
        if (config.get('CACHE_PROVIDER') === 'redis') {
          return new RedisCacheService(config.get('REDIS_URL'))
        }
        return new InMemoryCacheService()
      },
      inject: [ConfigService],
    },
  ],
})
export class CacheModule {}
```

### Spring Boot DI (Java/Kotlin)

Spring manages beans through component scanning and constructor injection.

```java
@Component
public class PostgresUserRepository implements UserRepository {
    private final JdbcTemplate jdbcTemplate;

    public PostgresUserRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }
}

@Component
public class CreateUserUseCase {
    private final UserRepository userRepository;
    private final EmailService emailService;

    public CreateUserUseCase(UserRepository userRepository, EmailService emailService) {
        this.userRepository = userRepository;
        this.emailService = emailService;
    }
}
```

## Constructor Injection

Constructor injection is the recommended approach. It makes dependencies explicit, enables immutability, and guarantees that objects are always in a valid state.

```typescript
class OrderService {
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly paymentGateway: PaymentGateway,
    private readonly inventoryService: InventoryService,
    private readonly logger: Logger
  ) {
    // Dependencies are assigned and readonly — no setters or properties
  }

  async placeOrder(command: PlaceOrderCommand): Promise<Result> {
    this.logger.info('Placing order', { orderId: command.orderId })
    // Use this.orderRepo, this.paymentGateway, this.inventoryService
  }
}
```

### When Constructor Injection is Difficult

If constructor injection is impractical (legacy code, poor framework support), use setter injection or method injection as a migration stepping stone. Document all TODO items to move toward constructor injection.

```typescript
// Temporary setter injection (migration path only)
class LegacyOrderService {
  private orderRepo!: OrderRepository
  private paymentGateway!: PaymentGateway

  setOrderRepository(repo: OrderRepository) { this.orderRepo = repo }
  setPaymentGateway(gw: PaymentGateway) { this.paymentGateway = gw }

  async placeOrder(command: PlaceOrderCommand): Promise<Result> {
    // Now this.orderRepo and this.paymentGateway are available
  }
}
```

## Scoped Lifetimes

### Transient
A new instance is created every time the dependency is requested. Use for lightweight, stateless services.

```typescript
container.registerTransient('PaymentGateway', StripePaymentGateway)
// Each injection gets a new StripePaymentGateway instance
```

### Singleton
A single instance is shared across the entire application. Use for thread-safe, stateless services or shared caches.

```typescript
container.registerSingleton('Database', Database)
container.registerSingleton('Logger', PinoLogger)
// Same Database and Logger instance everywhere
```

### Scoped (Request Scope)
One instance per scope — typically one instance per HTTP request or per use case execution.

```typescript
// Inversify
container.bind<UnitOfWork>('UnitOfWork').to(UnitOfWork).inRequestScope()

// tsyringe
container.register('UnitOfWork', UnitOfWork, { lifecycle: Lifecycle.Scoped })

// NestJS
@Injectable({ scope: Scope.REQUEST })
export class UnitOfWork {}
```

### Lifetime Decision Matrix

| Component | Lifetime | Reason |
|-----------|----------|--------|
| Repository (stateless) | Singleton | Stateless, thread-safe |
| Repository (with identity map) | Scoped | State per request |
| Use case / Command handler | Transient | Lightweight, stateless |
| HTTP client | Singleton | Connection pooling |
| DbContext / Unit of Work | Scoped | Transaction per request |
| Logger | Singleton | Stateless, buffered |
| Cache service | Singleton | Shared state |
| Email service | Singleton | Stateless |

## Module Organization

### Feature Modules

Group related dependencies into modules. Each feature module registers its own interfaces, implementations, and exports what other modules need.

```typescript
// order.module.ts
@Module({
  imports: [PaymentModule, InventoryModule],
  providers: [
    { provide: 'OrderRepository', useClass: PostgresOrderRepository },
    { provide: 'OrderProjection', useClass: OrderProjection },
    PlaceOrderHandler,
    CancelOrderHandler,
    GetOrderQueryHandler,
  ],
  exports: [PlaceOrderHandler, GetOrderQueryHandler],
})
export class OrderModule {}
```

### Infrastructure Modules

Infrastructure modules register concrete implementations of Domain and Application interfaces. Each module encapsulates a specific infrastructure concern.

```typescript
// database.module.ts
@Module({
  providers: [
    { provide: 'Database', useFactory: createDatabasePool },
    { provide: 'UserRepository', useClass: PostgresUserRepository },
    { provide: 'OrderRepository', useClass: PostgresOrderRepository },
    { provide: 'UnitOfWork', useClass: PostgresUnitOfWork },
  ],
  exports: ['Database', 'UserRepository', 'OrderRepository', 'UnitOfWork'],
})
export class DatabaseModule {}
```

### Domain Modules

Domain modules export only interfaces and pure domain types — no implementations. They are framework-independent.

```typescript
// domain.module.ts (pure, no infrastructure)
@Module({
  providers: [
    { provide: 'UserRepository', useExisting: UserRepository }, // forwards to infrastructure
    DomainService,
  ],
  exports: ['UserRepository', DomainService],
})
export class DomainModule {}
```

## Testing with DI Providers per Test Case

### Mock Injection in Tests

DI containers make it easy to swap implementations per test. Override providers with mocks or fakes.

```typescript
// Jest + tsyringe
import { container } from 'tsyringe'

beforeEach(() => {
  container.clearInstances()
  container.registerSingleton('UserRepository', FakeUserRepository)
  container.registerSingleton('EmailService', MockEmailService)
})

test('create user sends welcome email', async () => {
  const useCase = container.resolve(CreateUserUseCase)
  const result = await useCase.handle(new CreateUserCommand({ name: 'Alice', email: 'alice@test.com' }))
  expect(result.isSuccess()).toBe(true)
  const emailService = container.resolve<MockEmailService>('EmailService')
  expect(emailService.sentEmails).toHaveLength(1)
})
```

### NestJS Testing Module

```typescript
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase
  let mockRepo: jest.Mocked<UserRepository>

  beforeEach(async () => {
    mockRepo = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      save: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateUserUseCase,
        { provide: 'UserRepository', useValue: mockRepo },
        { provide: 'EmailService', useValue: { sendWelcomeEmail: jest.fn() } },
      ],
    }).compile()

    useCase = module.get<CreateUserUseCase>(CreateUserUseCase)
  })

  it('creates user and sends email', async () => {
    mockRepo.findByEmail.mockResolvedValue(null)
    mockRepo.save.mockResolvedValue(undefined)

    const result = await useCase.handle({ name: 'Alice', email: 'a@b.com' })
    expect(result.isSuccess()).toBe(true)
    expect(mockRepo.save).toHaveBeenCalledTimes(1)
  })
})
```

### Spring Boot Test with Mocks

```java
@ExtendWith(MockitoExtension.class)
class CreateUserUseCaseTest {
    @Mock
    private UserRepository userRepository;

    @Mock
    private EmailService emailService;

    @InjectMocks
    private CreateUserUseCase useCase;

    @Test
    void shouldCreateUserAndSendEmail() {
        when(userRepository.findByEmail(any())).thenReturn(Optional.empty());
        when(userRepository.save(any())).thenReturn(user);

        Result result = useCase.handle(new CreateUserCommand("Alice", "a@b.com"));

        assertTrue(result.isSuccess());
        verify(emailService).sendWelcomeEmail(any());
    }
}
```

### In-Memory Fakes for Integration Tests

```typescript
class InMemoryUserRepository implements UserRepository {
  private users = new Map<string, User>()

  async findById(id: UserId): Promise<User | null> {
    return this.users.get(id.toString()) ?? null
  }

  async findByEmail(email: Email): Promise<User | null> {
    return [...this.users.values()].find(u => u.email.equals(email)) ?? null
  }

  async save(user: User): Promise<void> {
    this.users.set(user.id.toString(), user)
  }

  async delete(id: UserId): Promise<void> {
    this.users.delete(id.toString())
  }
}
```

## Circular Dependency Resolution

### Detection
Circular dependencies manifest as stack overflow or null reference errors at runtime. Most DI containers detect them eagerly.

### Prevention
- Extract the shared interface into a third module
- Use event-driven communication to break the cycle
- Apply the Dependency Inversion Principle — make both sides depend on an abstraction
- Use lazy injection (Provider pattern) for unavoidable circular references

```typescript
// Lazy injection in tsyringe
@injectable()
class A {
  constructor(@inject(delay(() => B)) private b: B) {}
}

@injectable()
class B {
  constructor(@inject(delay(() => A)) private a: A) {}
}
```

## Container Configuration Best Practices

1. **Single Composition Root**: One place in the application where all dependencies are registered. Never scatter registrations across modules.

2. **Explicit Registrations**: Prefer explicit interface-to-implementation mappings over auto-discovery. Auto-discovery hides the dependency graph.

3. **Validate at Startup**: Configure the container to validate all registrations at application startup. Catch missing bindings early.

4. **No Service Locator**: The container is used only at the Composition Root. Application code never calls `container.resolve()` or equivalent — that's the Service Locator anti-pattern.

5. **Disposable Management**: Register disposables (database connections, HTTP clients) so the container manages their lifecycle. Ensure proper cleanup on shutdown.

```typescript
// Bad — Service Locator pattern
class OrderService {
  async placeOrder() {
    const repo = container.resolve('OrderRepository') // BAD
  }
}

// Good — constructor injection
class OrderService {
  constructor(private repo: OrderRepository) {}
}
```

## Key Points

- Constructor injection is the default. Setter injection is a migration stepping stone.
- Singleton for stateless services. Scoped for state-per-request. Transient for lightweight services.
- Composition Root is the single place where dependencies are wired.
- Never call the container from application code — that is the Service Locator anti-pattern.
- Override providers in tests to inject mocks, fakes, or in-memory implementations.
- Validate container configuration at startup.
- Use named bindings or tokens for multiple implementations of the same interface.
- One module per feature. One module per infrastructure concern.
- Dependency graphs must be acyclic — use events or abstractions to break cycles.
