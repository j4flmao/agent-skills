---
name: dotnet-patterns
description: C# .NET-specific patterns — MediatR CQRS, Result pattern, Pipeline Behaviors, Repository, Background Services, SignalR, gRPC.
---

# C# .NET Patterns

## Agent Protocol

### Trigger
User request includes: `mediatr`, `cqrs .net`, `result pattern`, `fluentvalidation`, `pipeline behavior`, `signalr`, `grpc .net`, `background service`, `hosted service`, `repository pattern .net`, `polly`, `refit`.

### Input Context
- .NET version and project type
- Current architecture (controller, minimal api, blazor)
- Specific pattern to implement
- Problem being solved (validation, error handling, real-time, inter-service communication)

### Output Artifact
A markdown document containing:
- Pattern implementation with code examples
- Integration points (DI registration, startup config)
- Testing strategy for the pattern
- Trade-offs and alternative patterns considered

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick. If pattern is already implemented, output `Pattern already present at: [file path].` and stop.

### Completion Criteria
- Pattern implementation compiles and follows .NET conventions
- DI registration is documented
- Testing strategy is included
- Trade-offs are documented

### Max Response Length
4096 tokens

## Patterns

### 1. CQRS with MediatR

**When**: Application has different read and write models (most apps do). Read queries outnumber write commands 10:1+.

#### Command/Query Example

```csharp
// Command
public record CreateOrderCommand(
    Guid CustomerId,
    IReadOnlyList<OrderItemDto> Items) : IRequest<Result<OrderResponse>>;

// Command Handler
public class CreateOrderHandler : IRequestHandler<CreateOrderCommand, Result<OrderResponse>>
{
    private readonly AppDbContext _db;
    public CreateOrderHandler(AppDbContext db) => _db = db;

    public async Task<Result<OrderResponse>> Handle(CreateOrderCommand request, CancellationToken ct)
    {
        var order = Order.Create(request.CustomerId, request.Items);
        _db.Orders.Add(order);
        await _db.SaveChangesAsync(ct);
        return Result.Success(new OrderResponse(order.Id, order.Total));
    }
}

// Query
public record GetOrderQuery(Guid Id) : IRequest<Result<OrderResponse>>;

// Query Handler
public class GetOrderHandler : IRequestHandler<GetOrderQuery, Result<OrderResponse>>
{
    private readonly AppDbContext _db;
    public GetOrderHandler(AppDbContext db) => _db = db;

    public async Task<Result<OrderResponse>> Handle(GetOrderQuery request, CancellationToken ct)
    {
        var order = await _db.Orders.FindAsync(new object[] { request.Id }, ct);
        return order is null
            ? Result.Failure<OrderResponse>(Error.NotFound("Order not found"))
            : Result.Success(new OrderResponse(order.Id, order.Total));
    }
}
```

#### DI Registration

```csharp
builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssembly(typeof(CreateOrderHandler).Assembly);
    cfg.AddOpenBehavior(typeof(ValidationBehavior<,>));
    cfg.AddOpenBehavior(typeof(LoggingBehavior<,>));
    cfg.AddOpenBehavior(typeof(PerformanceBehavior<,>));
});
```

### 2. Result Pattern (FluentResults / Custom)

**When**: Replacing exceptions for expected error cases (validation, not found, conflict). Exceptions reserved for truly unexpected failures.

```csharp
public class Result<T>
{
    public T? Value { get; }
    public Error? Error { get; }
    public bool IsSuccess => Error is null;
    public bool IsFailure => !IsSuccess;

    public static Result<T> Success(T value) => new(value, null);
    public static Result<T> Failure(Error error) => new(default, error);
}

// Usage in endpoint
app.MapPost("/orders", async (CreateOrderCommand cmd, IMediator mediator) =>
{
    var result = await mediator.Send(cmd);
    return result.IsSuccess
        ? Results.Created($"/api/orders/{result.Value.Id}", result.Value)
        : result.Error.Type switch
        {
            ErrorType.Validation => Results.ValidationError(result.Error.Details),
            ErrorType.NotFound => Results.NotFound(result.Error.Message),
            _ => Results.Problem(result.Error.Message)
        };
});
```

### 3. Pipeline Behaviors (MediatR)

**When**: Cross-cutting concerns applied to all commands/queries.

```csharp
public class ValidationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
    where TResponse : IResult
{
    private readonly IEnumerable<IValidator<TRequest>> _validators;

    public async Task<TResponse> Handle(
        TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken ct)
    {
        if (!_validators.Any()) return await next();

        var failures = (await Task.WhenAll(
            _validators.Select(v => v.ValidateAsync(request, ct))))
            .SelectMany(r => r.Errors)
            .Where(f => f is not null)
            .ToList();

        if (failures.Count != 0)
            throw new ValidationException(failures);

        return await next();
    }
}
```

**Pipeline order**: Validation → Logging → Performance → Caching → Handler.

### 4. Repository Pattern

**When**: ONLY when you need to abstract data access for testing (use InMemory/TestContainers instead), restrict query capabilities (Specification), or cache query results.

If you must use it:

```csharp
public interface IOrderRepository
{
    Task<Order?> GetByIdAsync(Guid id, CancellationToken ct);
    void Add(Order order);
}

public class OrderRepository : IOrderRepository
{
    private readonly AppDbContext _db;
    public OrderRepository(AppDbContext db) => _db = db;

    public async Task<Order?> GetByIdAsync(Guid id, CancellationToken ct)
        => await _db.Orders.FindAsync(new object[] { id }, ct);

    public void Add(Order order) => _db.Orders.Add(order);
}
```

### 5. Background Services (IHostedService)

**When**: Long-running tasks, queue consumers, scheduled jobs, health checks.

```csharp
public class OrderExpirationService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    public OrderExpirationService(IServiceScopeFactory scopeFactory) => _scopeFactory = scopeFactory;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var expired = await db.Orders
                .Where(o => o.Status == OrderStatus.Pending && o.CreatedAt < DateTime.UtcNow.AddHours(-24))
                .ToListAsync(stoppingToken);

            foreach (var order in expired) order.Cancel("Auto-expired");
            await db.SaveChangesAsync(stoppingToken);
            await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
        }
    }
}
```

### 6. SignalR (Real-time)

**When**: Real-time updates (notifications, live dashboards, collaborative editing). NOT for request-response.

```csharp
public class OrderHub : Hub
{
    public async Task SubscribeToOrder(Guid orderId)
        => await Groups.AddToGroupAsync(Context.ConnectionId, $"order-{orderId}");
}

// Server-side broadcast
public class OrderStatusUpdater
{
    private readonly IHubContext<OrderHub> _hub;
    public void NotifyStatusChange(Guid orderId, string newStatus)
        => _hub.Clients.Group($"order-{orderId}").SendAsync("StatusChanged", orderId, newStatus);
}
```

### 7. gRPC

**When**: Inter-service communication, high-performance streaming, polyglot environments.

```csharp
// Proto: service OrderService { rpc GetOrder(OrderRequest) returns (OrderResponse); }
public class OrderGrpcService : OrderService.OrderServiceBase
{
    public override async Task<OrderResponse> GetOrder(OrderRequest request, ServerCallContext context)
    {
        var query = new GetOrderQuery(Guid.Parse(request.Id));
        var result = await _mediator.Send(query);
        return new OrderResponse { Id = result.Value.Id.ToString(), Total = (double)result.Value.Total };
    }
}
```

**Selection rule**: gRPC for internal service-to-service. REST/HTTP for external/public APIs. SignalR for browser real-time.

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| **MediatR for everything** | Unnecessary indirection for simple CRUD | Use direct DbContext for simple queries |
| **Result pattern for everything** | Boilerplate for methods that never fail | Use exceptions for truly exceptional cases |
| **Repository over DbContext** | Unnecessary abstraction layer | Use DbContext directly unless testing requires |
| **Fat BackgroundService** | All logic in ExecuteAsync | Delegate to scoped services |
| **gRPC for public API** | Browser incompatibility | Use REST with JSON for public endpoints |

## References

### Reference Files
- `references/cqrs-mediatr.md` — Full MediatR CQRS implementation with examples
- `references/ef-core-patterns.md` — EF Core optimization, migrations, performance patterns

### Related Skills
- `backend/dotnet/architecture/SKILL.md` — .NET project structure and DI
- `backend/universal/design-patterns/SKILL.md` — Foundational GoF patterns
- `backend/universal/testing/SKILL.md` — Testing .NET applications

## Handoff

Hand off to `backend/dotnet/architecture/SKILL.md` for project structure and DI setup. Hand off to `backend/universal/clean-architecture/SKILL.md` for architectural restructuring.
