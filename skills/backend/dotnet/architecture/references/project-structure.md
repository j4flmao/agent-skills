# .NET Project Structure Reference

## Clean Architecture Template

```
YourApp.sln
│
├── src/
│   ├── YourApp.Domain/
│   │   ├── Entities/
│   │   │   ├── Order.cs
│   │   │   ├── OrderItem.cs
│   │   │   └── Customer.cs
│   │   ├── ValueObjects/
│   │   │   ├── Money.cs
│   │   │   ├── Address.cs
│   │   │   └── OrderStatus.cs
│   │   ├── Aggregates/
│   │   │   └── Order.cs  (if aggregate root, combines entity + behavior)
│   │   ├── Events/
│   │   │   ├── OrderCreatedDomainEvent.cs
│   │   │   └── OrderShippedDomainEvent.cs
│   │   ├── Interfaces/
│   │   │   ├── IOrderRepository.cs
│   │   │   └── IPaymentService.cs
│   │   └── YourApp.Domain.csproj
│   │
│   ├── YourApp.Application/
│   │   ├── Common/
│   │   │   ├── Interfaces/
│   │   │   │   └── IApplicationDbContext.cs
│   │   │   ├── Behaviors/
│   │   │   │   ├── ValidationBehavior.cs
│   │   │   │   ├── LoggingBehavior.cs
│   │   │   │   └── PerformanceBehavior.cs
│   │   │   ├── Exceptions/
│   │   │   │   ├── NotFoundException.cs
│   │   │   │   └── ValidationException.cs
│   │   │   └── Mappings/
│   │   │       └── MappingProfile.cs  (AutoMapper or manual)
│   │   ├── Orders/
│   │   │   ├── Commands/
│   │   │   │   ├── CreateOrder/
│   │   │   │   │   ├── CreateOrderCommand.cs
│   │   │   │   │   ├── CreateOrderHandler.cs
│   │   │   │   │   └── CreateOrderValidator.cs
│   │   │   │   └── CancelOrder/
│   │   │   │       ├── CancelOrderCommand.cs
│   │   │   │       ├── CancelOrderHandler.cs
│   │   │   │       └── CancelOrderValidator.cs
│   │   │   └── Queries/
│   │   │       ├── GetOrder/
│   │   │       │   ├── GetOrderQuery.cs
│   │   │       │   └── GetOrderHandler.cs
│   │   │       └── GetOrdersByCustomer/
│   │   │           ├── GetOrdersByCustomerQuery.cs
│   │   │           └── GetOrdersByCustomerHandler.cs
│   │   └── YourApp.Application.csproj
│   │
│   ├── YourApp.Infrastructure/
│   │   ├── Persistence/
│   │   │   ├── AppDbContext.cs
│   │   │   ├── Configurations/
│   │   │   │   ├── OrderConfiguration.cs  (IEntityTypeConfiguration)
│   │   │   │   └── CustomerConfiguration.cs
│   │   │   ├── Migrations/
│   │   │   └── Repositories/
│   │   │       └── OrderRepository.cs  (if needed)
│   │   ├── Services/
│   │   │   ├── PaymentService.cs
│   │   │   └── EmailService.cs
│   │   ├── External/
│   │   │   └── ShippingApiClient.cs
│   │   └── YourApp.Infrastructure.csproj
│   │
│   └── YourApp.Api/
│       ├── Controllers/
│       │   └── OrdersController.cs
│       ├── Endpoints/  (if using Minimal API)
│       │   └── OrderEndpoints.cs
│       ├── Middleware/
│       │   ├── ExceptionHandlingMiddleware.cs
│       │   └── RequestLoggingMiddleware.cs
│       ├── Filters/
│       │   └── ValidationFilter.cs
│       ├── Program.cs
│       └── YourApp.Api.csproj
│
└── tests/
    ├── YourApp.UnitTests/
    │   ├── Application/
    │   │   ├── Orders/
    │   │   │   └── CreateOrderHandlerTests.cs
    │   │   └── Common/
    │   │       └── ValidationBehaviorTests.cs
    │   └── Domain/
    │       └── OrderTests.cs
    │
    ├── YourApp.IntegrationTests/
    │   ├── Api/
    │   │   └── OrdersControllerTests.cs
    │   └── Infrastructure/
    │       └── OrderRepositoryTests.cs
    │
    └── YourApp.ArchTests/
        └── ArchitectureTests.cs  (NetArchTest)

## Dependency Rules (per layer)

| Layer | Depends On | Does NOT Depend On |
|---|---|---|
| Domain | Nothing (plain classes) | Any framework, infrastructure |
| Application | Domain | Infrastructure, API |
| Infrastructure | Domain, Application (via interfaces) | API |
| API | Application, Infrastructure | Domain (indirectly OK) |

## Project Dependencies (csproj)

```
YourApp.Domain: (none)
YourApp.Application: YourApp.Domain, MediatR, FluentValidation
YourApp.Infrastructure: YourApp.Application, EF Core, Dapper, etc.
YourApp.Api: YourApp.Application, YourApp.Infrastructure, Swashbuckle, Serilog
```

## Feature Slices Template

```
YourApp.Api/
├── Program.cs
├── Common/
│   ├── Exceptions/
│   ├── Behaviors/
│   └── EndpointGroups/
└── Features/
    ├── Orders/
    │   ├── CreateOrder/
    │   │   ├── CreateOrderCommand.cs
    │   │   ├── CreateOrderHandler.cs
    │   │   ├── CreateOrderValidator.cs
    │   │   ├── CreateOrderEndpoint.cs
    │   │   └── CreateOrderResponse.cs
    │   ├── GetOrder/
    │   │   ├── GetOrderQuery.cs
    │   │   ├── GetOrderHandler.cs
    │   │   └── GetOrderEndpoint.cs
    │   └── ListOrders/
    │       ├── ListOrdersQuery.cs
    │       ├── ListOrdersHandler.cs
    │       └── ListOrdersEndpoint.cs
    ├── Products/
    │   └── ... (same structure)
    └── Customers/
        └── ... (same structure)
```
