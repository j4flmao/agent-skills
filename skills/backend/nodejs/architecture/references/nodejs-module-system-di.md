# Node.js Module System and Dependency Injection

## Overview

This reference covers the Node.js module system (CommonJS, ESM), dependency injection patterns, and container implementations. It includes practical examples for Express, Fastify, and Hono frameworks.

## Table of Contents

1. Module Systems (CommonJS vs ESM)
2. Module Resolution
3. Dependency Injection Fundamentals
4. Manual DI (No Container)
5. DI Container Implementation
6. Framework-Specific DI
7. Testing with DI
8. Circular Dependencies
9. Module Patterns
10. Performance and Best Practices

---

## 1. Module Systems

### CommonJS (CJS)

```javascript
// exports.js
const db = require('./db');
const config = require('./config');

module.exports = class OrderService {
  constructor() {
    this.db = db;
    this.config = config;
  }

  async findById(id) {
    return this.db.query('SELECT * FROM orders WHERE id = $1', [id]);
  }
};

// Alternative exports
module.exports = OrderService;
module.exports.default = OrderService;
module.exports.createOrderService = (db) => new OrderService(db);

// require
const OrderService = require('./exports');
const { createOrderService } = require('./exports');
```

### ES Modules (ESM)

```javascript
// services/order.service.mjs (or .js with "type": "module" in package.json)
import db from '../infrastructure/database.js';
import config from '../config/env.js';

export class OrderService {
  constructor() {
    this.db = db;
    this.config = config;
  }

  async findById(id) {
    return this.db.query('SELECT * FROM orders WHERE id = $1', [id]);
  }
}

export function createOrderService(database) {
  return new OrderService(database);
}

// Named vs default
export default OrderService;
export { OrderService };
export { OrderService as OrderServiceAlias };
```

### CJS/ESM Interop

```typescript
// package.json
{
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    }
  }
}

// ESM importing CJS
import pkg from 'express';
const { Router } = pkg;

// CJS importing ESM (dynamic import)
async function loadEsm() {
  const esmModule = await import('./esm-module.mjs');
  return esmModule.default;
}
```

### Dual Package Publishing

```json
{
  "name": "my-library",
  "version": "1.0.0",
  "main": "./dist/cjs/index.js",
  "module": "./dist/esm/index.mjs",
  "exports": {
    ".": {
      "import": "./dist/esm/index.mjs",
      "require": "./dist/cjs/index.js"
    },
    "./utils": {
      "import": "./dist/esm/utils.mjs",
      "require": "./dist/cjs/utils.js"
    }
  }
}
```

---

## 2. Module Resolution

### Node.js Resolution Algorithm

```javascript
// require('./foo')
// 1. foo.js (or .json, .node)
// 2. foo/index.js
// 3. node_modules/foo (walk up directories)

// ESM resolution
// import './foo' (must include extension)
// import './foo.js' (explicit)
// import 'pkg' (package.json exports field)
```

### TypeScript Resolution

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "moduleResolution": "node16", // or "bundler"
    "module": "node16",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "baseUrl": ".",
    "paths": {
      "@modules/*": ["src/modules/*"],
      "@shared/*": ["src/shared/*"]
    }
  }
}

// With path aliases
import { OrderService } from '@modules/orders/application/OrderService';
import { Database } from '@shared/infrastructure/Database';
```

---

## 3. Dependency Injection Fundamentals

### Why DI

```typescript
// Without DI (tight coupling, hard to test)
class OrderService {
  private db = new Database();
  private logger = new ConsoleLogger();
  
  async getOrder(id: string) {
    this.logger.log(`Fetching order ${id}`);
    return this.db.query('SELECT * FROM orders WHERE id = $1', [id]);
  }
}

// With DI (loose coupling, testable)
class OrderService {
  constructor(
    private readonly db: Database,
    private readonly logger: Logger,
  ) {}

  async getOrder(id: string) {
    this.logger.log(`Fetching order ${id}`);
    return this.db.query('SELECT * FROM orders WHERE id = $1', [id]);
  }
}

// Testing with DI is trivial
const mockDb = { query: vi.fn() };
const mockLogger = { log: vi.fn() };
const service = new OrderService(mockDb as any, mockLogger as any);
```

### Types of Injection

```typescript
// Constructor Injection (preferred)
class OrderService {
  constructor(
    private readonly repository: OrderRepository,
    private readonly eventBus: EventBus,
  ) {}
}

// Property Injection (use sparingly)
class OrderService {
  @inject repository!: OrderRepository;
  @inject eventBus!: EventBus;
}

// Method Injection (for optional dependencies)
class OrderService {
  async createOrder(command: CreateOrderCommand, context?: RequestContext) {
    const auditLogger = context?.auditLogger ?? new NullAuditLogger();
    // ...
  }
}
```

---

## 4. Manual DI (No Container)

### Factory Pattern

```typescript
// factories/order-service.factory.ts
import { Database } from '../infrastructure/Database';
import { OrderService } from '../modules/orders/application/OrderService';
import { PostgresOrderRepository } from '../modules/orders/infrastructure/PostgresOrderRepository';
import { InProcessEventBus } from '../shared/infrastructure/InProcessEventBus';
import { ConsoleLogger } from '../shared/infrastructure/ConsoleLogger';

export function createOrderService(): OrderService {
  const db = new Database(process.env.DATABASE_URL!);
  const logger = new ConsoleLogger();
  const repo = new PostgresOrderRepository(db, logger);
  const eventBus = new InProcessEventBus();
  return new OrderService(repo, eventBus, logger);
}

// app.ts
import { createOrderService } from './factories/order-service.factory';

const orderService = createOrderService();
```

### Builder Pattern

```typescript
class ServiceBuilder {
  private db: Database | undefined;
  private logger: Logger | undefined;
  private eventBus: EventBus | undefined;

  withDatabase(url: string): this {
    this.db = new Database(url);
    return this;
  }

  withLogger(logger: Logger): this {
    this.logger = logger;
    return this;
  }

  withEventBus(eventBus: EventBus): this {
    this.eventBus = eventBus;
    return this;
  }

  buildOrderService(): OrderService {
    return new OrderService(
      new PostgresOrderRepository(
        this.db ?? new Database(process.env.DATABASE_URL!),
        this.logger ?? new ConsoleLogger(),
      ),
      this.eventBus ?? new InProcessEventBus(),
      this.logger ?? new ConsoleLogger(),
    );
  }
}

// Usage
const service = new ServiceBuilder()
  .withDatabase('postgres://localhost:5432/mydb')
  .withLogger(new JsonLogger())
  .buildOrderService();
```

---

## 5. DI Container Implementation

### Simple Container

```typescript
type Factory<T> = (container: Container) => T;
type Lifetime = 'singleton' | 'transient' | 'scoped';

interface Registration<T> {
  factory: Factory<T>;
  lifetime: Lifetime;
  instance?: T;
}

class Container {
  private registrations = new Map<string, Registration<any>>();

  register<T>(name: string, factory: Factory<T>, lifetime: Lifetime = 'transient'): void {
    this.registrations.set(name, { factory, lifetime });
  }

  resolve<T>(name: string): T {
    const registration = this.registrations.get(name);
    if (!registration) throw new Error(`Service ${name} not registered`);

    if (registration.lifetime === 'singleton') {
      if (!registration.instance) {
        registration.instance = registration.factory(this);
      }
      return registration.instance as T;
    }

    return registration.factory(this);
  }

  // Create child container for request scoping
  createScope(): Container {
    const scope = new Container();
    scope.registrations = new Map(this.registrations);
    return scope;
  }
}

// Setup
const container = new Container();
container.register('db', () => new Database(process.env.DATABASE_URL!), 'singleton');
container.register('logger', () => new ConsoleLogger(), 'singleton');
container.register('orderRepo', (c) => new PostgresOrderRepository(c.resolve('db'), c.resolve('logger')), 'singleton');
container.register('orderService', (c) => new OrderService(c.resolve('orderRepo'), c.resolve('logger')), 'transient');
container.register('orderController', (c) => new OrderController(c.resolve('orderService')), 'transient');

// Usage
const controller = container.resolve<OrderController>('orderController');
```

### Awilix Container (Production)

```typescript
import { createContainer, asClass, asValue, asFunction, Lifetime } from 'awilix';

const container = createContainer();

container.register({
  database: asValue(new Database(process.env.DATABASE_URL!)),
  logger: asClass(ConsoleLogger).singleton(),
  orderRepository: asClass(PostgresOrderRepository).singleton(),
  orderService: asClass(OrderService).transient(),
  orderController: asClass(OrderController).transient(),
});

// Auto-register from filesystem
container.loadModules(['src/**/*.service.ts', 'src/**/*.repository.ts'], {
  formatName: 'camelCase',
  resolverOptions: {
    lifetime: Lifetime.SINGLETON,
  },
});
```

### Typed Container with Inversify

```typescript
import { Container, injectable, inject, ContainerModule } from 'inversify';

const TYPES = {
  Database: Symbol.for('Database'),
  Logger: Symbol.for('Logger'),
  OrderRepository: Symbol.for('OrderRepository'),
  OrderService: Symbol.for('OrderService'),
} as const;

@injectable()
class PostgresOrderRepository implements OrderRepository {
  constructor(@inject(TYPES.Database) private db: Database) {}
}

@injectable()
class OrderService {
  constructor(
    @inject(TYPES.OrderRepository) private repo: OrderRepository,
    @inject(TYPES.Logger) private logger: Logger,
  ) {}
}

const container = new Container();
container.bind<Database>(TYPES.Database).toConstantValue(new Database());
container.bind<Logger>(TYPES.Logger).to(ConsoleLogger);
container.bind<OrderRepository>(TYPES.OrderRepository).to(PostgresOrderRepository);
container.bind<OrderService>(TYPES.OrderService).to(OrderService);

const service = container.get<OrderService>(TYPES.OrderService);
```

---

## 6. Framework-Specific DI

### Express with Awilix

```typescript
import { createContainer, asClass } from 'awilix';
import { scopePerRequest } from 'awilix-express';

const container = createContainer();
container.register({
  orderService: asClass(OrderService).scoped(),
  logger: asClass(ConsoleLogger).singleton(),
});

const app = express();
app.use(scopePerRequest(container));

// Controller
class OrderController {
  async list(req: Request, res: Response) {
    const service = req.di.resolve('orderService');
    const orders = await service.findAll();
    res.json(orders);
  }
}
```

### Fastify with DI

```typescript
import Fastify from 'fastify';
import { fastifyAwilixPlugin, diContainer } from '@fastify/awilix';

const app = Fastify();

await app.register(fastifyAwilixPlugin, {
  disposeOnClose: true,
  disposeOnResponse: true,
});

app.addHook('onRequest', async (request) => {
  request.diScope.register({
    orderService: asClass(OrderService).scoped(),
  });
});

app.get('/api/orders', async (request, reply) => {
  const service = request.diScope.resolve<OrderService>('orderService');
  const orders = await service.findAll();
  return orders;
});
```

---

## 7. Testing with DI

```typescript
import { describe, it, expect, vi } from 'vitest';

interface Database {
  query(sql: string, params: any[]): Promise<any[]>;
}

class MockDatabase implements Database {
  readonly query = vi.fn();
}

describe('OrderService', () => {
  it('injects mock database', async () => {
    const mockDb = new MockDatabase();
    mockDb.query.mockResolvedValue([{ id: '1', customerId: 'cust-1' }]);

    const service = new OrderService(mockDb, new NullLogger());
    const result = await service.findAll();

    expect(result).toHaveLength(1);
    expect(mockDb.query).toHaveBeenCalledWith(
      'SELECT * FROM orders',
      []
    );
  });
});

// Integration test with real container
describe('OrderService Integration', () => {
  let container: Container;

  beforeAll(() => {
    container = new Container();
    container.register('db', () => new TestDatabase(), 'singleton');
    container.register('logger', () => new NullLogger(), 'singleton');
    container.register('orderService', (c) =>
      new OrderService(c.resolve('db'), c.resolve('logger')),
      'transient'
    );
  });

  it('uses real database', async () => {
    const service = container.resolve<OrderService>('orderService');
    const orders = await service.findAll();
    expect(orders).toBeDefined();
  });
});
```

---

## 8. Circular Dependencies

### Detection

```typescript
// Circular: A -> B -> C -> A
class A { constructor(b: B) {} }
class B { constructor(c: C) {} }
class C { constructor(a: A) {} }  // Problem!

// Detection tool
import madge from 'madge';

const result = await madge('./src', { detectiveOptions: { ts: { skipTypeImports: true } } });
const circular = result.circular();
console.log('Circular dependencies:', circular);
```

### Resolution Strategies

```typescript
// Strategy 1: Extract shared interface
// Before
class OrderService {
  constructor(private paymentService: PaymentService) {}
}
class PaymentService {
  constructor(private orderService: OrderService) {}
}

// After
interface PaymentGateway {
  processPayment(orderId: string, amount: number): Promise<void>;
}
class StripePaymentGateway implements PaymentGateway {
  // No reference to OrderService
}
class OrderService {
  constructor(private paymentGateway: PaymentGateway) {}
}

// Strategy 2: Event-based decoupling
class OrderService {
  constructor(private eventBus: EventBus) {}

  async createOrder(command: CreateOrderCommand): Promise<void> {
    const order = Order.create(command);
    await this.repo.save(order);
    await this.eventBus.publish(new OrderCreatedEvent(order.id));
  }
}

class NotificationService {
  constructor(private eventBus: EventBus) {
    this.eventBus.subscribe('OrderCreated', this.onOrderCreated.bind(this));
  }

  async onOrderCreated(event: OrderCreatedEvent): Promise<void> {
    await this.sendConfirmation(event.orderId);
  }
}

// Strategy 3: Lazy injection (awaitable)
class ServiceA {
  private serviceB!: ServiceB;

  async init(): Promise<void> {
    this.serviceB = await container.resolve('serviceB');
  }
}
```

---

## 9. Module Patterns

### Singleton Pattern (Module-Level)

```typescript
// ES Module singletons are natural (modules are cached)
let instance: Database | null = null;

export function getDatabase(): Database {
  if (!instance) {
    instance = new Database(process.env.DATABASE_URL!);
  }
  return instance;
}

// CommonJS singleton
class Config {
  private static instance: Config;
  private constructor() {}

  static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }
}
```

### Factory Module

```typescript
// services/index.ts
import { OrderService } from './order.service';
import { createOrderRepository } from '../repositories';
import { getDatabase } from '../database';
import { getLogger } from '../logging';

export function createApplicationServices() {
  const db = getDatabase();
  const logger = getLogger();

  return {
    orderService: new OrderService(createOrderRepository(db, logger), logger),
    userService: new UserService(createUserRepository(db, logger), logger),
  };
}
```

### Barrel Module

```typescript
// modules/orders/index.ts
export { OrderService } from './application/OrderService';
export { OrderController } from './presentation/OrderController';
export { Order } from './domain/Order';
export { OrderRepository } from './domain/OrderRepository';
export type { CreateOrderCommand } from './application/CreateOrderCommand';
export type { OrderResponse } from './application/OrderResponse';
```

---

## 10. Performance and Best Practices

### Module Loading Performance

```typescript
// Slow: dynamic requires at top level
const modules = ['order', 'user', 'payment'].map(m => require(`./${m}.service`));

// Fast: direct imports
import { OrderService } from './order.service';
import { UserService } from './user.service';
import { PaymentService } from './payment.service';

// ESM tree-shaking
import { OrderService } from './services'; // Only imports what's used
```

### Container Performance

```typescript
// Singleton wherever possible (reduces creation overhead)
container.register('db', () => new Database(), 'singleton');
container.register('repo', (c) => new Repository(c.resolve('db')), 'singleton');

// Transient for stateful services
container.register('controller', (c) => new Controller(c.resolve('service')), 'transient');

// Scoped for request-specific services
container.register('requestContext', (c) => new RequestContext(), 'scoped');
```

### Best Practices Checklist

```typescript
// DO: Constructor injection
class OrderService {
  constructor(
    private readonly repo: OrderRepository,
    private readonly logger: Logger,
  ) {}
}

// DO: Interface-based dependencies
interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  error(message: string, error?: Error): void;
}

// DO: Single responsibility per class
class OrderService {
  // Only order-related business logic
}

// DON'T: Service locator pattern (hides dependencies)
class OrderService {
  async createOrder() {
    const db = ServiceLocator.get('database'); // Hidden dependency
    const logger = ServiceLocator.get('logger');  // Hidden dependency
  }
}

// DON'T: Static methods with global state
export class OrderService {
  static async createOrder() {
    // Global state makes testing impossible
  }
}
```

### DI Anti-Patterns

```typescript
// Anti-pattern: Injecting container
class OrderService {
  constructor(private container: Container) {}
  // This hides all dependencies. Never do this.
  async createOrder() {
    const repo = this.container.resolve('orderRepo');
    const eventBus = this.container.resolve('eventBus');
  }
}

// Anti-pattern: Service Locator
class ServiceLocator {
  private static services = new Map<string, any>();
  
  static register(name: string, service: any) {
    this.services.set(name, service);
  }
  
  static get<T>(name: string): T {
    return this.services.get(name);
  }
}

// Anti-pattern: God object container
const services = {
  orderService: new OrderService(),
  userService: new UserService(),
  paymentService: new PaymentService(),
  // ... 50 more services
  // This class violates SRP
};
```

### Recommended Library Stack

| Need | Library |
|---|---|
| Simple DI | Manual factories / Awilix |
| TypeScript-first DI | Inversify |
| Framework integration | awilix-express, @fastify/awilix |
| Module analysis | madge |
| Circular detection | dpdm, madge |
| ESM/CJS dual publishing | tsup, unbuild |

---

## References

- Node.js Module Documentation: https://nodejs.org/api/modules.html
- Node.js ES Modules: https://nodejs.org/api/esm.html
- Awilix DI Container: https://github.com/jeffijoe/awilix
- InversifyJS: https://github.com/inversify/InversifyJS
- TypeScript Module Resolution: https://www.typescriptlang.org/docs/handbook/module-resolution.html
- DI in Node.js: https://blog.risingstack.com/dependency-injection-in-node-js/
