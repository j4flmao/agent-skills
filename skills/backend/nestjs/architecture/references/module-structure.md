# NestJS Module Structure

## Module Organization
```
src/
├── domain/
│   ├── entities/
│   │   └── order.entity.ts
│   ├── value-objects/
│   │   └── money.ts
│   ├── events/
│   │   └── order-placed.event.ts
│   ├── repositories/
│   │   └── order.repository.ts (interface only)
│   └── services/
│       └── order.service.ts (domain logic only)
├── application/
│   ├── use-cases/
│   │   └── place-order.use-case.ts
│   ├── commands/
│   │   └── place-order.command.ts
│   └── dtos/
│       └── place-order.dto.ts
└── infrastructure/
    ├── persistence/
    │   ├── prisma/
    │   │   └── prisma-order.repository.ts
    │   └── mappers/
    │       └── order.mapper.ts
    ├── messaging/
    │   └── rabbitmq/
    ├── auth/
    │   └── jwt.strategy.ts
    └── controllers/
        └── order.controller.ts
```

## Module Definition
```typescript
@Module({
  imports: [PrismaModule, RabbitmqModule],
  controllers: [OrderController],
  providers: [
    PlaceOrderUseCase,
    OrderDomainService,
    { provide: OrderRepository, useClass: PrismaOrderRepository },
  ],
  exports: [OrderRepository],
})
export class OrderModule {}
```

## Dependency Direction
```
Controller → UseCase → DomainService → Repository (interface)
                                            ↓
                                    PrismaOrderRepository (impl)
```

- Domain layer: zero NestJS decorators, pure TypeScript
- Application layer: NestJS injectable use cases
- Infrastructure layer: NestJS controllers, repositories, guards
