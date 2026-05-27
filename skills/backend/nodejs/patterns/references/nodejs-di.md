# Node.js Dependency Injection Reference

## Manual DI Pattern

Node.js benefits from manual dependency injection without heavy frameworks.

```typescript
// types.ts
export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export interface OrderRepository {
  findById(id: string): Promise<Order | null>;
  save(order: Order): Promise<Order>;
}

export interface EventBus {
  publish(event: unknown): Promise<void>;
}
```

### Container Implementation

```typescript
// container.ts
export class Container {
  private instances = new Map<string, unknown>();
  private factories = new Map<string, () => unknown>();

  register<T>(key: string, factory: () => T): void {
    this.factories.set(key, factory);
  }

  registerSingleton<T>(key: string, factory: () => T): void {
    this.factories.set(key, () => {
      if (!this.instances.has(key)) {
        this.instances.set(key, factory());
      }
      return this.instances.get(key) as T;
    });
  }

  resolve<T>(key: string): T {
    const factory = this.factories.get(key);
    if (!factory) throw new Error(`Service ${key} not registered`);
    return factory() as T;
  }
}

export const container = new Container();
```

### Service Registration

```typescript
// di/register.ts
import { container } from './container';
import { PinoLogger } from './infra/logger';
import { PostgresOrderRepository } from './infra/repository';
import { KafkaEventBus } from './infra/event-bus';
import { OrderService } from './application/order-service';

container.registerSingleton('logger', () => new PinoLogger());
container.registerSingleton('orderRepository', () => 
  new PostgresOrderRepository(container.resolve('logger'))
);
container.registerSingleton('eventBus', () => 
  new KafkaEventBus(container.resolve('logger'))
);
container.register('orderService', () => 
  new OrderService(
    container.resolve('orderRepository'),
    container.resolve('eventBus')
  )
);
```

### Service Consumption

```typescript
// application/order-service.ts
export class OrderService {
  constructor(
    private readonly repo: OrderRepository,
    private readonly eventBus: EventBus
  ) {}

  async createOrder(request: CreateOrderRequest): Promise<Order> {
    const order = Order.create(request);
    const saved = await this.repo.save(order);
    await this.eventBus.publish(new OrderCreatedEvent(saved));
    return saved;
  }
}

// entry point
import { container } from './di/container';
import './di/register';

const service = container.resolve<OrderService>('orderService');
```

## Factory Pattern for DI

```typescript
export class ServiceFactory {
  static createOrderService(): OrderService {
    const logger = new PinoLogger();
    const repo = new PostgresOrderRepository(logger);
    const eventBus = new KafkaEventBus(logger);
    return new OrderService(repo, eventBus);
  }

  static createTestOrderService(): OrderService {
    const logger = new PinoLogger();
    const repo = new InMemoryOrderRepository();
    const eventBus = new InMemoryEventBus();
    return new OrderService(repo, eventBus);
  }
}
```

## DI with Inversify

```typescript
import { Container, injectable, inject } from 'inversify';

const TYPES = {
  Logger: Symbol.for('Logger'),
  OrderRepository: Symbol.for('OrderRepository'),
  OrderService: Symbol.for('OrderService'),
};

@injectable()
class PinoLogger implements Logger {}

@injectable()
class PostgresOrderRepository implements OrderRepository {
  constructor(@inject(TYPES.Logger) private logger: Logger) {}
}

@injectable()
class OrderService {
  constructor(
    @inject(TYPES.OrderRepository) private repo: OrderRepository,
    @inject(TYPES.Logger) private logger: Logger
  ) {}
}

const container = new Container();
container.bind<Logger>(TYPES.Logger).to(PinoLogger).inSingletonScope();
container.bind<OrderRepository>(TYPES.OrderRepository).to(PostgresOrderRepository);
container.bind<OrderService>(TYPES.OrderService).to(OrderService);
```

## DI with awilix

```typescript
import { createContainer, asClass, asFunction, Lifetime } from 'awilix';

const container = createContainer();

container.register({
  logger: asClass(PinoLogger).singleton(),
  orderRepository: asClass(PostgresOrderRepository).scoped(),
  orderService: asClass(OrderService).transient(),
});

// Usage
const service = container.resolve('orderService');
```

## Testing with DI

```typescript
class OrderServiceTest {
  private repo: InMemoryOrderRepository;
  private service: OrderService;

  beforeEach(() => {
    this.repo = new InMemoryOrderRepository();
    this.service = new OrderService(this.repo, new InMemoryEventBus());
  });

  test('saves order to repository', async () => {
    await this.service.createOrder(testRequest);
    expect(this.repo.orders).toHaveLength(1);
  });
}
```

## Key Points

- Constructor injection makes dependencies explicit and testable
- Container pattern centralizes service wiring
- Factory pattern provides production and test variants
- Inversify provides decorator-based DI with TypeScript
- awilix offers lightweight DI with scoped lifetimes
- Manual DI avoids framework lock-in
- InMemory implementations enable fast unit testing
- Register production bindings at composition root
- Each test creates fresh instances for isolation
- Interfaces define contracts between layers
