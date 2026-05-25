# NestJS Modules

## Module Structure

```
src/modules/{feature}/
  {feature}.module.ts          -- NestJS module config
  domain/
    entities/                  -- Pure TypeScript classes
    value-objects/             -- Immutable, no identity
    events/                    -- Domain events
    repositories/              -- Interfaces only
  application/
    commands/                  -- CQRS command classes
    queries/                   -- CQRS query classes
    handlers/                  -- Command/Query handlers
    dtos/                      -- Data transfer objects
  infrastructure/
    persistence/
      entities/                -- TypeORM entities (decorated)
      repositories/            -- Implementations of domain interfaces
    messaging/                 -- Kafka/RabbitMQ producers
  presentation/
    controllers/               -- @Controller() classes
    guards/                    -- Auth guards
    interceptors/              -- Logging, timing, transformation
```

## Module Types

| Type | Purpose | Example |
|------|---------|---------|
| **Feature** | Bounded context | OrderModule, UserModule |
| **Shared** | Cross-cutting | LoggingModule, AuthModule |
| **Core** | Singleton services | DatabaseModule, ConfigModule |
| **Library** | Utilities | ValidationModule |

## Feature Module

```typescript
@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([OrderOrmEntity]),
    ClientsModule.register([
      { name: 'INVENTORY_SERVICE', transport: Transport.TCP },
    ]),
  ],
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

## Dynamic Modules

```typescript
@Module({})
export class ConfigModule {
  static forRoot(options: ConfigOptions): DynamicModule {
    return {
      module: ConfigModule,
      providers: [
        { provide: 'CONFIG_OPTIONS', useValue: options },
        ConfigService,
      ],
      exports: [ConfigService],
      global: true,
    };
  }
}

// Usage
@Module({
  imports: [ConfigModule.forRoot({ path: '.env' })],
})
export class AppModule {}
```

## Global Modules

```typescript
@Global()
@Module({
  providers: [DatabaseService, LoggerService],
  exports: [DatabaseService, LoggerService],
})
export class CoreModule {}

// Available everywhere without re-importing
@Module({
  imports: [CoreModule], // Once in AppModule
})
export class AppModule {}
```

## Module Forward References

```typescript
// AVOID: forwardRef is a code smell
@Module({
  imports: [forwardRef(() => BModule)],
})
export class AModule {}

// BETTER: Restructure module boundaries
// If A and B depend on each other, extract shared module
@Module({
  imports: [SharedModule],
  exports: [SharedModule],
})
export class AModule {}

@Module({
  imports: [SharedModule],
  exports: [SharedModule],
})
export class BModule {}
```

## Module Re-export

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([Order])],
  exports: [TypeOrmModule], // Re-export to make Order repository available
})
export class DatabaseModule {}
```

## Circular Dependency Resolution

```typescript
// If truly unavoidable (should be rare):
@Module({
  imports: [forwardRef(() => PaymentModule)],
})
export class OrderModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes('*');
  }
}
```

## Module Scopes and Encapsulation

```typescript
// By default, providers are encapsulated
// Use exports to share providers
@Module({
  providers: [OrderService],
  exports: [OrderService], // Make available to other modules
})
export class OrderModule {}

// Use global scope sparingly
@Injectable({ scope: Scope.DEFAULT })
export class OrderService {}
```

## Testing Modules

```typescript
describe('OrderModule', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [OrderModule],
    })
      .overrideProvider(OrderRepository)
      .useClass(MockOrderRepository)
      .compile();
  });

  it('should resolve OrderService', () => {
    const service = module.get(OrderService);
    expect(service).toBeDefined();
  });
});
```
