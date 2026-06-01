---
name: dotnet-architecture
description: >
  Use this skill when structuring .NET applications — clean architecture, vertical slices, CQRS, MediatR, dependency injection, and project organization. This skill enforces: solution structure conventions, dependency flow direction, DI registration patterns, and architecture testing. Requires .NET SDK (dotnet new). Do NOT use for: Go, Node.js, Java, or non-.NET stacks.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, dotnet, phase-2]
---

# .NET Architecture

## Purpose
Structure .NET applications with clean architecture, vertical slices, or CQRS — dependency inversion, MediatR pipelines, DI registration, and solution organization.

## Agent Protocol

### Trigger
User request includes: `dotnet clean architecture`, `dotnet vertical slice`, `dotnet CQRS`, `dotnet solution structure`, `.NET project layout`, `dotnet DI`, `dotnet MediatR`.

### Input Context
- .NET version (6+, 8+, 9+)
- Architecture (Clean Architecture, Vertical Slices, N-tier)
- Database (EF Core, Dapper, ADO.NET)
- Patterns (CQRS, Event Sourcing, Repository)

### Output Artifact
Solution structure, project references, DI registration, MediatR pipeline, EF Core setup.

### Response Format
Produce artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions.

### Completion Criteria
- Solution split by concern: Domain, Application, Infrastructure, Presentation
- Domain has zero external dependencies
- Application depends only on Domain
- Infrastructure implements Application/Domain interfaces
- DI registered in Composition Root (Presentation layer)
- Architecture tests enforce dependency rules

### Max Response Length
4096 tokens

## Architecture Decision Trees

### Clean Architecture vs Vertical Slices vs N-tier

| Criterion | Clean Architecture | Vertical Slices | N-tier |
|-----------|-------------------|-----------------|--------|
| Team size | 5+ (many devs on same codebase) | 2-5 (feature teams) | 1-3 (simple apps) |
| Domain complexity | High (many business rules) | Medium (CRUD-heavy) | Low (simple CRUD) |
| Change frequency | Core domain changes rarely | Features change independently | Everything changes together |
| Testing strategy | Unit test domain, integration infra | Feature-level integration tests | End-to-end, horizontal |
| Learning curve | Steep (many abstractions) | Moderate (vertical boundaries) | Low (traditional layers) |

Decision: Complex domain with many rules → Clean Architecture. CRUD-heavy medium app → Vertical Slices. Simple API with few rules → N-tier.

### CQRS: Full vs Simple

| Aspect | Full CQRS (separate models) | Simple CQRS (same model, separate methods) |
|--------|----------------------------|-------------------------------------------|
| Read/write models | Separate DbContext, tables | Same DbContext, different queries |
| Complexity | High (eventual consistency) | Low (immediate consistency) |
| Performance | Optimized for each workload | Compromise |
| When to use | High read/write asymmetry | Simple CRUD with queries |

Decision: Reports/analytics workload separate from transactional → Full CQRS. Simple list/detail views → Simple CQRS.

## Workflow

### Step 1: Solution Structure (Clean Architecture)

```
src/
  Domain/
    Entities/
    ValueObjects/
    Aggregates/
    DomainEvents/
    Exceptions/
    Interfaces/
  Application/
    Common/
      Interfaces/
      Behaviors/        // MediatR pipelines
      Mappings/
    Features/
      Users/
        Commands/
        Queries/
        DTOs/
        Validators/
    DependencyInjection.cs
  Infrastructure/
    Persistence/
      Context/
      Configurations/
      Repositories/
    Services/
    DependencyInjection.cs
  Presentation/
    Controllers/
    Middleware/
    Program.cs
tests/
  Domain.Tests/
  Application.Tests/
  Integration.Tests/
  Architecture.Tests/
```

### Step 2: Domain Layer (Zero Dependencies)

```csharp
// Domain/Entities/Order.cs
public class Order : IAggregateRoot
{
    public Guid Id { get; private set; }
    public string OrderNumber { get; private set; }
    public OrderStatus Status { get; private set; }
    private readonly List<OrderItem> _items = new();
    public IReadOnlyCollection<OrderItem> Items => _items.AsReadOnly();

    private Order() { } // EF Core

    public Order(string orderNumber)
    {
        Id = Guid.NewGuid();
        OrderNumber = orderNumber;
        Status = OrderStatus.Pending;
        AddDomainEvent(new OrderCreatedDomainEvent(Id));
    }

    public void AddItem(string product, decimal price, int quantity)
    {
        if (Status != OrderStatus.Pending)
            throw new DomainException("Cannot modify confirmed order");
        _items.Add(new OrderItem(product, price, quantity));
    }

    public void Confirm()
    {
        if (_items.Count == 0)
            throw new DomainException("Cannot confirm empty order");
        Status = OrderStatus.Confirmed;
        AddDomainEvent(new OrderConfirmedDomainEvent(Id));
    }
}

// Domain/ValueObjects/Money.cs
public record Money
{
    public decimal Amount { get; init; }
    public string Currency { get; init; }

    public Money(decimal amount, string currency)
    {
        if (amount < 0) throw new DomainException("Amount cannot be negative");
        if (string.IsNullOrWhiteSpace(currency)) throw new DomainException("Currency required");
        Amount = amount;
        Currency = currency.ToUpperInvariant();
    }
}
```

### Step 3: Application Layer (MediatR + CQRS)

```csharp
// Application/Features/Orders/Commands/CreateOrder/CreateOrderCommand.cs
public record CreateOrderCommand(string OrderNumber, List<OrderItemDto> Items) : IRequest<OrderDto>;

// Application/Features/Orders/Commands/CreateOrder/CreateOrderCommandHandler.cs
public class CreateOrderCommandHandler : IRequestHandler<CreateOrderCommand, OrderDto>
{
    private readonly IOrderRepository _repository;
    private readonly IMapper _mapper;

    public CreateOrderCommandHandler(IOrderRepository repository, IMapper mapper)
    {
        _repository = repository;
        _mapper = mapper;
    }

    public async Task<OrderDto> Handle(CreateOrderCommand request, CancellationToken cancellationToken)
    {
        var order = new Order(request.OrderNumber);
        request.Items.ForEach(i => order.AddItem(i.Product, i.Price, i.Quantity));
        await _repository.AddAsync(order);
        await _repository.SaveChangesAsync(cancellationToken);
        return _mapper.Map<OrderDto>(order);
    }
}

// Application/Common/Behaviors/ValidationBehavior.cs
public class ValidationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    private readonly IEnumerable<IValidator<TRequest>> _validators;

    public ValidationBehavior(IEnumerable<IValidator<TRequest>> validators)
        => _validators = validators;

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken ct)
    {
        if (!_validators.Any()) return await next();

        var context = new ValidationContext<TRequest>(request);
        var failures = _validators
            .Select(v => v.Validate(context))
            .SelectMany(r => r.Errors)
            .Where(f => f != null)
            .ToList();

        if (failures.Count != 0)
            throw new ValidationException(failures);

        return await next();
    }
}

// Application/Common/Behaviors/LoggingBehavior.cs
public class LoggingBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
{
    private readonly ILogger<LoggingBehavior<TRequest, TResponse>> _logger;

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken ct)
    {
        var requestName = typeof(TRequest).Name;
        _logger.LogInformation("Processing {Request}", requestName);
        var stopwatch = Stopwatch.StartNew();
        var response = await next();
        stopwatch.Stop();
        _logger.LogInformation("Completed {Request} in {Elapsed}ms", requestName, stopwatch.ElapsedMilliseconds);
        return response;
    }
}
```

### Step 4: Dependency Injection

```csharp
// Application/DependencyInjection.cs
public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(Assembly.GetExecutingAssembly()));
        services.AddValidatorsFromAssembly(Assembly.GetExecutingAssembly());
        services.AddAutoMapper(Assembly.GetExecutingAssembly());

        services.AddTransient(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
        services.AddTransient(typeof(IPipelineBehavior<,>), typeof(LoggingBehavior<,>));

        return services;
    }
}

// Infrastructure/DependencyInjection.cs
public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        services.AddDbContext<AppDbContext>(options =>
            options.UseSqlServer(config.GetConnectionString("Default")));

        services.AddScoped<IOrderRepository, OrderRepository>();
        services.AddScoped<IUnitOfWork>(sp => sp.GetRequiredService<AppDbContext>());

        return services;
    }
}

// Presentation/Program.cs
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddControllers();
```

### Step 5: EF Core Configuration

```csharp
// Infrastructure/Persistence/Configurations/OrderConfiguration.cs
public class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.ToTable("Orders");
        builder.HasKey(o => o.Id);
        builder.Property(o => o.OrderNumber).IsRequired().HasMaxLength(50);
        builder.Property(o => o.Status).HasConversion<string>().HasMaxLength(20);
        builder.OwnsMany(o => o.Items, item =>
        {
            item.WithOwner().HasForeignKey("OrderId");
            item.Property(i => i.Product).IsRequired().HasMaxLength(100);
            item.Property(i => i.Price).HasColumnType("decimal(18,2)");
        });
        builder.Ignore(o => o.DomainEvents);
    }
}
```

### Step 6: Architecture Tests

```csharp
// tests/Architecture.Tests/ArchitectureTests.cs
public class ArchitectureTests
{
    [Fact]
    public void Domain_ShouldNotDependOnInfrastructure()
    {
        var domainAssembly = typeof(Order).Assembly;
        var infrastructureAssembly = typeof(OrderRepository).Assembly;
        var result = domainAssembly.GetReferencedAssemblies()
            .Any(a => a.FullName == infrastructureAssembly.FullName);
        Assert.False(result);
    }

    [Fact]
    public void Application_ShouldNotDependOnInfrastructure()
    {
        var appAssembly = typeof(CreateOrderCommand).Assembly;
        var infraAssembly = typeof(OrderRepository).Assembly;
        var result = appAssembly.GetReferencedAssemblies()
            .Any(a => a.FullName == infraAssembly.FullName);
        Assert.False(result);
    }
}
```

## Production Considerations

### EF Core Performance
- Use `AsNoTracking()` for read-only queries
- Batch inserts with `AddRange()` not individual `Add()`
- Use `ExecuteUpdate/ExecuteDelete` for bulk operations (EF Core 7+)
- Enable `UseLoggerFactory` only in development
- Connection resiliency: `EnableRetryOnFailure()` for transient faults
- Compiled queries for hot paths: `EF.CompileQuery()`

### API Versioning
```csharp
services.AddApiVersioning(options =>
{
    options.DefaultApiVersion = new ApiVersion(1, 0);
    options.AssumeDefaultVersionWhenUnspecified = true;
    options.ReportApiVersions = true;
    options.ApiVersionReader = new UrlSegmentApiVersionReader();
});
```

### OpenTelemetry
```csharp
builder.Services.AddOpenTelemetry()
    .WithTracing(t => t
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddEntityFrameworkCoreInstrumentation()
        .AddOtlpExporter());
```

## Anti-Patterns

| Anti-Pattern | Why | Fix |
|-------------|-----|-----|
| Domain depending on EF Core | Couples business rules to ORM | Keep Domain clean — use interfaces |
| `Task.Run()` in ASP.NET Core | Steals thread pool threads | Use async I/O natively |
| Fat controllers | Business logic in UI layer | Thin controller → MediatR handler |
| `DbContext` as singleton | Concurrency issues, stale data | Scoped per request |
| AutoMapper in Domain | Domain shouldn't know about mapping | Mapping only in Application layer |
| `[ApiController]` without validation attribute | Model state may be invalid | Always add `[ApiController]` for auto-400 |

## Security Considerations
- Apply `[Authorize]` at controller or endpoint level, never globally skip
- Use Data Protection API for encrypting sensitive data at rest
- Validate anti-forgery tokens for state-changing endpoints
- Rate limiting with `AspNetCoreRateLimit` or YARP
- CSRF protection via anti-forgery tokens in cookie-based auth
- Secrets via User Secrets (dev), Key Vault / environment (prod)
- Never log sensitive data — use `[LogProperties]` selectively

## Testing Strategies

### Unit Test Domain Logic
```csharp
[Fact]
public void Order_WithNoItems_CannotBeConfirmed()
{
    var order = new Order("ORD-001");
    Assert.Throws<DomainException>(() => order.Confirm());
}
```

### Integration Test with TestContainers
```csharp
public class OrderRepositoryTests : IClassFixture<TestContainerFixture>
{
    [Fact]
    public async Task AddOrder_PersistsToDatabase()
    {
        var order = new Order("ORD-001");
        order.AddItem("Widget", 10m, 2);
        await _repository.AddAsync(order);
        await _repository.SaveChangesAsync();
        var saved = await _context.Orders.FindAsync(order.Id);
        Assert.NotNull(saved);
        Assert.Equal("ORD-001", saved.OrderNumber);
    }
}
```

Use `WebApplicationFactory<T>` for integration tests. Use `Testcontainers` for SQL Server/PostgreSQL. Use `Verify` for snapshot testing.

## Rules
- Domain layer has ZERO external NuGet dependencies.
- Application depends only on Domain and NuGet packages (MediatR, FluentValidation, AutoMapper).
- Infrastructure implements Application/Infrastructure interfaces, never depends on Application.
- DI registration happens only in the Composition Root (Presentation/Program.cs or each layer's DependencyInjection.cs).
- All async methods return Task<T> — no async void.
- Configuration via IOptions pattern, never direct IConfiguration injection.
- Exception handling via middleware, not try-catch in controllers.
- CORS, auth, rate limiting, exception handling, and swagger as middleware pipeline.

## References
  - references/api-design.md — .NET API Design
  - references/dotnet-clean-architecture.md — .NET Clean Architecture
  - references/dotnet-cqrs-event-sourcing.md — CQRS and Event Sourcing
  - references/dotnet-microservices.md — .NET Microservices
  - references/dotnet-testing-architecture.md — Architecture Testing
  - references/project-structure.md — Project Structure Reference
## Handoff
Hand off to `backend/dotnet/patterns/SKILL.md` for MediatR pipelines, result pattern, and EF Core patterns.
