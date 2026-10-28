# NestJS Architecture Patterns: Modules, DI, and Layering

NestJS is an opinionated Node.js framework built on a module system and a constructor-injection IoC container. This reference covers how to structure modules, providers and layers so an application stays testable as it grows.

## Building Blocks

| Element | Decorator | Responsibility |
|---------|-----------|----------------|
| Module | `@Module()` | Groups providers/controllers; declares `imports`, `exports` |
| Controller | `@Controller()` | Maps HTTP/RPC routes to handlers; no business logic |
| Provider | `@Injectable()` | Services, repositories, factories resolved by the container |
| Guard | `CanActivate` | Authorization decision before the handler runs |
| Interceptor | `NestInterceptor` | Wraps handler execution (logging, mapping, caching, timeouts) |
| Pipe | `PipeTransform` | Validates/transforms input arguments |
| Exception filter | `@Catch()` | Converts thrown errors into responses |

Request lifecycle order: middleware -> guards -> interceptors (before) -> pipes -> handler -> interceptors (after) -> exception filters (on error).

## Feature Modules

One module per bounded context or feature. Export only what other modules need.

```typescript
// orders/orders.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order } from './order.entity';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [TypeOrmModule.forFeature([Order]), PaymentsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
```

Rules:
- A provider is visible only inside its module unless exported.
- `@Global()` modules are for genuinely cross-cutting infrastructure (config, logger). Overusing them hides dependencies.
- Shared code that has no state belongs in a plain library, not a module.

## Dynamic Modules

Configurable modules expose `forRoot`/`forRootAsync` (app-wide) and `forFeature` (per consumer). Since Nest 9, `ConfigurableModuleBuilder` generates the boilerplate.

```typescript
// mailer/mailer.module-definition.ts
import { ConfigurableModuleBuilder } from '@nestjs/common';

export interface MailerOptions { host: string; port: number; from: string; }

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
  new ConfigurableModuleBuilder<MailerOptions>().setClassMethodName('forRoot').build();

// mailer/mailer.module.ts
@Module({ providers: [MailerService], exports: [MailerService] })
export class MailerModule extends ConfigurableModuleClass {}

// mailer/mailer.service.ts
@Injectable()
export class MailerService {
  constructor(@Inject(MODULE_OPTIONS_TOKEN) private readonly opts: MailerOptions) {}
}

// app.module.ts
MailerModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (cfg: ConfigService) => ({
    host: cfg.getOrThrow('SMTP_HOST'),
    port: cfg.getOrThrow<number>('SMTP_PORT'),
    from: cfg.getOrThrow('MAIL_FROM'),
  }),
});
```

## Provider Types

```typescript
providers: [
  OrdersService,                                            // class provider
  { provide: 'CLOCK', useValue: { now: () => new Date() } }, // value provider
  { provide: PaymentGateway, useClass: StripeGateway },      // swap implementation
  {
    provide: 'REDIS',
    useFactory: async (cfg: ConfigService) => createClient({ url: cfg.getOrThrow('REDIS_URL') }).connect(),
    inject: [ConfigService],
  },
  { provide: 'LEGACY_SERVICE', useExisting: OrdersService },  // alias
]
```

Use an abstract class (not an interface) as the token when you want type-safe injection without string tokens: interfaces are erased at runtime.

## Injection Scopes

| Scope | Lifetime | Cost |
|-------|----------|------|
| `DEFAULT` (singleton) | One instance per app | Cheapest; default choice |
| `REQUEST` | New instance per request | Bubbles up: every dependent becomes request-scoped |
| `TRANSIENT` | New instance per consumer | Each injecting class gets its own |

Prefer singletons and pass request context explicitly, or use `AsyncLocalStorage` (e.g. `nestjs-cls`) for request-scoped data such as tenant ID or correlation ID.

## Hexagonal / Clean Layering in Nest

```
src/orders/
  domain/            # entities, value objects, domain errors (no Nest imports)
  application/       # use cases, ports (abstract classes)
  infrastructure/    # TypeORM/Prisma repositories, HTTP clients (adapters)
  interface/         # controllers, DTOs, message handlers
  orders.module.ts   # wiring only
```

```typescript
// application/order-repository.port.ts
export abstract class OrderRepository {
  abstract findById(id: string): Promise<Order | null>;
  abstract save(order: Order): Promise<void>;
}

// orders.module.ts
providers: [PlaceOrderUseCase, { provide: OrderRepository, useClass: TypeOrmOrderRepository }]
```

The use case depends on the port; tests bind an in-memory implementation.

## CQRS Module

`@nestjs/cqrs` provides `CommandBus`, `QueryBus`, `EventBus` and sagas. Use it when read and write paths diverge; for plain CRUD it adds indirection without benefit.

```typescript
export class PlaceOrderCommand { constructor(readonly customerId: string, readonly items: LineItem[]) {} }

@CommandHandler(PlaceOrderCommand)
export class PlaceOrderHandler implements ICommandHandler<PlaceOrderCommand> {
  constructor(private readonly repo: OrderRepository, private readonly events: EventBus) {}
  async execute(cmd: PlaceOrderCommand): Promise<string> {
    const order = Order.place(cmd.customerId, cmd.items);
    await this.repo.save(order);
    this.events.publish(new OrderPlacedEvent(order.id));
    return order.id;
  }
}
```

The in-process `EventBus` is not durable. For cross-service events use a transactional outbox plus a broker (`@nestjs/microservices` transports, or a Kafka/RabbitMQ client).

## Microservices and Hybrid Apps

```typescript
const app = await NestFactory.create(AppModule);
app.connectMicroservice<MicroserviceOptions>({
  transport: Transport.KAFKA,
  options: { client: { brokers: [process.env.KAFKA_BROKER!] }, consumer: { groupId: 'orders' } },
});
await app.startAllMicroservices();
await app.listen(3000);
```

Handlers use `@MessagePattern()` (request-response) or `@EventPattern()` (fire-and-forget).

## Circular Dependencies

`forwardRef(() => OtherModule)` resolves cycles but is a design smell. Fix by extracting the shared piece into a third module or by communicating through events.

## Pitfalls

- Business logic in controllers: untestable without HTTP.
- One giant `SharedModule` exporting everything.
- Request-scoped providers deep in the graph silently making the whole chain per-request.
- Importing a module twice with different `forRoot` config: only one wins.
- Using string tokens without constants; typos fail at runtime.

## Checklist

- [ ] Each feature module exports a minimal public surface
- [ ] Ports are abstract classes; adapters bound in the module
- [ ] No `forwardRef` without a documented reason
- [ ] Config loaded via `ConfigModule` with validation at startup
- [ ] Request context via `AsyncLocalStorage`, not request scope, where possible
- [ ] Cross-service events go through a durable broker/outbox
