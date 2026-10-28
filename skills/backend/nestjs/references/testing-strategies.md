# NestJS Testing Strategies: Unit, Integration, E2E

NestJS ships `@nestjs/testing`, which builds a real DI container in tests so providers can be overridden. This reference covers the test pyramid for Nest apps with Jest (default) or Vitest.

## Test Types

| Level | Scope | Dependencies | Tooling |
|-------|-------|--------------|---------|
| Unit | One provider/class | All collaborators mocked | Jest/Vitest, `Test.createTestingModule` or plain `new` |
| Integration | Module + real DB/broker | Testcontainers | Jest + `@testcontainers/postgresql` |
| E2E (API) | Whole app over HTTP | Real infra in containers | Supertest |
| Contract | Consumer/provider API | Pact broker | `@pact-foundation/pact` |

## Unit Test a Service

```typescript
// orders.service.spec.ts
import { Test } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { OrderRepository } from './application/order-repository.port';
import { PaymentGateway } from '../payments/payment-gateway';
import { InsufficientStockError } from '../domain/errors';

describe('OrdersService', () => {
  let service: OrdersService;
  const repo = { findById: jest.fn(), save: jest.fn() };
  const payments = { charge: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: OrderRepository, useValue: repo },
        { provide: PaymentGateway, useValue: payments },
      ],
    }).compile();
    service = moduleRef.get(OrdersService);
  });

  it('charges and saves a valid order', async () => {
    // Arrange
    payments.charge.mockResolvedValue({ id: 'ch_1' });
    const input = { customerId: 'c1', items: [{ sku: 'A', qty: 1 }] };

    // Act
    const order = await service.place(input);

    // Assert
    expect(payments.charge).toHaveBeenCalledWith('c1', expect.any(Number));
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ id: order.id }));
  });

  it('rejects an empty order', async () => {
    // Arrange
    const input = { customerId: 'c1', items: [] };

    // Act / Assert
    await expect(service.place(input)).rejects.toThrow(InsufficientStockError);
    expect(payments.charge).not.toHaveBeenCalled();
  });
});
```

For pure classes with constructor injection, `new OrdersService(repo as any, payments as any)` is faster than building a module. `@golevelup/ts-jest` `createMock<T>()` auto-mocks every method.

## Testing Guards, Pipes, Interceptors

```typescript
it('RolesGuard denies a user without role', () => {
  // Arrange
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['admin']) } as unknown as Reflector;
  const guard = new RolesGuard(reflector);
  const ctx = {
    getHandler: () => null, getClass: () => null,
    switchToHttp: () => ({ getRequest: () => ({ user: { roles: ['user'] } }) }),
  } as unknown as ExecutionContext;

  // Act
  const allowed = guard.canActivate(ctx);

  // Assert
  expect(allowed).toBe(false);
});
```

## Integration Tests with Testcontainers

```typescript
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

let pg: StartedPostgreSqlContainer;
let moduleRef: TestingModule;

beforeAll(async () => {
  pg = await new PostgreSqlContainer('postgres:17-alpine').start();
  moduleRef = await Test.createTestingModule({
    imports: [
      TypeOrmModule.forRoot({ type: 'postgres', url: pg.getConnectionUri(), autoLoadEntities: true, migrationsRun: true, migrations: [__dirname + '/../migrations/*.ts'] }),
      OrdersModule,
    ],
  }).compile();
}, 60_000);

afterAll(async () => { await moduleRef.close(); await pg.stop(); });
```

Run real migrations rather than `synchronize: true` so tests exercise the production schema. Truncate tables between tests or wrap each test in a rolled-back transaction.

## E2E with Supertest

```typescript
// test/orders.e2e-spec.ts
import request from 'supertest';

describe('Orders API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PaymentGateway).useValue({ charge: jest.fn().mockResolvedValue({ id: 'ch_test' }) })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: (ctx: ExecutionContext) => {
        ctx.switchToHttp().getRequest().user = { id: 'u1', roles: ['user'] };
        return true;
      } })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true })); // mirror main.ts
    await app.init();
  });

  afterAll(() => app.close());

  it('POST /orders returns 201', async () => {
    const res = await request(app.getHttpServer())
      .post('/orders')
      .send({ items: [{ sku: 'A', qty: 1 }] })
      .expect(201);
    expect(res.body.id).toBeDefined();
  });

  it('POST /orders rejects unknown fields', () =>
    request(app.getHttpServer()).post('/orders').send({ items: [], admin: true }).expect(400));
});
```

Extract global setup (pipes, filters, prefixes) from `main.ts` into a `configureApp(app)` function and call it in both places, so E2E tests do not drift from production.

Fastify adapter: `await app.getHttpAdapter().getInstance().ready()` after `init()`.

## Override Options

| Method | Use |
|--------|-----|
| `overrideProvider(X).useValue/useClass/useFactory` | Replace a service or client |
| `overrideGuard`, `overrideInterceptor`, `overridePipe`, `overrideFilter` | Bypass cross-cutting concerns |
| `overrideModule(M).useModule(TestM)` | Swap an entire module (Nest 10+) |

## Microservices and Queues

Test message handlers as plain methods with unit tests; for transport-level tests start a broker container and connect a `ClientProxy`. For BullMQ, run processors against a Redis container and await job completion with `job.waitUntilFinished(queueEvents)`.

## Configuration

```json
// package.json
"jest": {
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": "src",
  "testRegex": ".*\\.spec\\.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" },
  "testEnvironment": "node",
  "collectCoverageFrom": ["**/*.(t|j)s", "!**/*.module.ts", "!main.ts"]
}
```

`@swc/jest` speeds up transforms considerably for large suites.

## Pitfalls

- Mocks returning values the real dependency never returns.
- E2E app not using the same pipes/filters as production.
- Shared DB state between tests causing order-dependent failures.
- Testing private methods instead of observable behavior.
- `jest.mock` of whole modules hiding DI wiring errors; prefer provider overrides.

## Checklist

- [ ] Unit tests for services, guards, pipes with AAA structure
- [ ] Edge cases: empty input, not found, conflicts, thrown errors
- [ ] Integration tests against real DB via Testcontainers and migrations
- [ ] E2E tests share `configureApp()` with `main.ts`
- [ ] External HTTP/payment clients overridden, never called for real
- [ ] Tests isolated and runnable in parallel in CI
