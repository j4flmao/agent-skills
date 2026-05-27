---
name: nestjs-architecture
description: >
  Use this skill when the user says 'NestJS structure', 'Nest module', 'NestJS DDD', 'NestJS clean arch', 'feature module', 'NestJS folder', 'NestJS monorepo', 'where to put in Nest', or when building or reviewing a NestJS application. This skill enforces: one module per bounded context, strict DDD layering (domain/application/infrastructure/presentation), CQRS with CommandBus/QueryBus, repository pattern with interface inversion, and monorepo conventions. Requires @nestjs/core. Do NOT use for: Express without NestJS, Fastify, or general TypeScript.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, nestjs, phase-2, typescript]
---

# NestJS Architecture

## Purpose
Structure NestJS applications with strict DDD layering. Each Nest module is one bounded context. Domain entities have zero NestJS decorators.

## Agent Protocol

### Trigger
Exact user phrases: "NestJS structure", "Nest module", "NestJS DDD", "NestJS clean arch", "feature module", "NestJS folder", "NestJS monorepo", "where to put in Nest", "NestJS module organization".

### Input Context
Before activating, verify:
- package.json has @nestjs/core dependency.
- The feature or module being created is known.

### Output Artifact
No file output. Produces folder structure and code examples as text.

### Response Format
Folder structure:
```
src/modules/{feature}/
  domain/
    entities/
    value-objects/
    events/
    repositories/
  application/
    commands/
    queries/
    handlers/
    dtos/
  infrastructure/
    persistence/
      entities/
      repositories/
    messaging/
  presentation/
    controllers/
    guards/
    interceptors/
  {feature}.module.ts
```

Code example: show only the relevant code, no imports, no explanatory comments.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Module follows the folder structure above.
- [ ] Domain entities are pure TypeScript (no @Entity, no @ObjectType, no decorators).
- [ ] Repository interfaces in domain/, implementations in infrastructure/.
- [ ] Controllers in presentation/ call application handlers, not infrastructure directly.
- [ ] Module providers bind interface to implementation.
- [ ] No forwardRef() usage (circular dependency = design smell).

### Max Response Length
Folder structure: unlimited. Code example: 15 lines per example. Confirmation: 3 lines.

## Workflow

### Step 1: Create Feature Module
```
src/modules/{feature}/
  {feature}.module.ts          -- NestJS module config
  domain/
    entities/                  -- Pure TypeScript classes. No decorators.
    value-objects/             -- Immutable, no identity.
    events/                    -- Domain events (used with EventBus).
    repositories/              -- Interfaces only.
  application/
    commands/                  -- CQRS command classes.
    queries/                   -- CQRS query classes.
    handlers/                  -- Command/Query handlers.
    dtos/                      -- Data transfer objects.
  infrastructure/
    persistence/
      entities/                -- TypeORM/Prisma/Mongoose entities (decorated).
      repositories/            -- Implementations of domain repository interfaces.
    messaging/                 -- Kafka/RabbitMQ producers/consumers.
  presentation/
    controllers/               -- @Controller() classes.
    guards/                    -- Auth guards.
    interceptors/              -- Logging, timing, transformation.
```

### Step 2: Write Module Definition
```typescript
@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature([OrderOrmEntity])],
  controllers: [OrderController],
  providers: [
    PlaceOrderHandler,
    GetOrderHandler,
    { provide: OrderRepository, useClass: OrderPostgresRepository },
    OrderAccessGuard,
  ],
  exports: [OrderRepository],
})
export class OrderModule {}
```

### Step 3: Write Domain Entity
```typescript
export class Order {
  private constructor(
    public readonly id: OrderId,
    public readonly customerId: CustomerId,
    private status: OrderStatus,
    private items: OrderItem[],
  ) {}

  static create(customerId: CustomerId, items: OrderItem[]): Order {
    return new Order(OrderId.generate(), customerId, OrderStatus.PENDING, items)
  }

  confirm(): void {
    if (this.status !== OrderStatus.PENDING) {
      throw new Error('Only pending orders can be confirmed')
    }
    this.status = OrderStatus.CONFIRMED
  }
}
```

### Step 4: Write Repository Interface and Implementation
```typescript
// domain/repositories/order.repository.ts
export abstract class OrderRepository {
  abstract findById(id: OrderId): Promise<Order | null>
  abstract save(order: Order): Promise<void>
}

// infrastructure/persistence/repositories/order-postgres.repository.ts
@Injectable()
export class OrderPostgresRepository implements OrderRepository {
  constructor(private repo: Repository<OrderOrmEntity>) {}

  async findById(id: OrderId): Promise<Order | null> {
    const entity = await this.repo.findOne({ where: { id: id.value } })
    return entity ? entity.toDomain() : null
  }

  async save(order: Order): Promise<void> {
    await this.repo.save(OrderOrmEntity.fromDomain(order))
  }
}
```

### Step 5: CQRS Handler
```typescript
@CommandHandler(PlaceOrderCommand)
export class PlaceOrderHandler implements ICommandHandler<PlaceOrderCommand> {
  constructor(
    @Inject(OrderRepository) private readonly orderRepo: OrderRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: PlaceOrderCommand): Promise<void> {
    const order = Order.create(command.customerId, command.items)
    await this.orderRepo.save(order)
    this.eventBus.publish(new OrderPlacedEvent(order.id))
  }
}
```

## Rules
- One Nest module per bounded context. Never group unrelated features in the same module.
- Domain entities are pure TypeScript. Zero NestJS decorators. Zero ORM decorators. Zero framework imports.
- Import direction: controllers -> handlers -> repositories (via interface). Never controllers -> repositories directly.
- forwardRef is a code smell. If you need forwardRef, your module boundaries are wrong.
- TypeORM/Prisma entities are Infrastructure concerns. Domain entities are never exposed outside the domain folder.
- CQRS: commands for writes, queries for reads. Never mix them in the same handler.

## References
  - references/ddd-nestjs.md — NestJS DDD Patterns
  - references/module-structure.md — NestJS Module Structure
  - references/nestjs-cqrs.md — NestJS CQRS Implementation
  - references/nestjs-deployment.md — NestJS Deployment
  - references/nestjs-modules.md — NestJS Modules
  - references/nestjs-testing.md — NestJS Testing Strategies
## Handoff
No artifact produced.
Next skill: nestjs-patterns — guards, interceptors, pipes, microservices.
Carry forward: module structure, repository interface locations, CQRS setup.
