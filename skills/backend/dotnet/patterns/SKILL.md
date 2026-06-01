---
name: dotnet-patterns
description: >
  Use this skill when implementing .NET patterns — MediatR pipelines, CQRS, Result pattern, EF Core patterns, pipeline behaviors, and event sourcing. This skill enforces: MediatR for CQRS, FluentValidation for validation, Result type for error handling, EF Core conventions. Requires .NET SDK (dotnet new). Do NOT use for: Java, Node.js, Go, or non-.NET stacks.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, dotnet, phase-3]
---

# .NET Patterns

## Purpose
Implement production-grade .NET patterns — MediatR pipeline behaviors, CQRS with separate models, Result pattern for explicit error handling, EF Core performance patterns, and event sourcing.

## Agent Protocol

### Trigger
User request includes: `dotnet MediatR pattern`, `dotnet CQRS`, `dotnet Result pattern`, `dotnet EF Core`, `dotnet pipeline behavior`, `dotnet FluentValidation`, `dotnet AutoMapper`.

### Input Context
- Architecture (Clean Architecture, Vertical Slices)
- ORM (EF Core, Dapper)
- Patterns needed (CQRS, Event Sourcing, Outbox, Saga)
- Testing approach (xUnit, NUnit)

### Output Artifact
Code examples for requested patterns — pipeline behavior, CQRS handler, Result type, EF optimization.

### Response Format
Code-first output. Pattern name, problem statement, implementation. No preamble, no postamble.

### Completion Criteria
- MediatR pipeline behaviors ordered
- CQRS with separate Command/Query handlers
- Result type with implicit conversions
- EF Core query optimization applied
- Unit of Work pattern with SaveChangesAsync

### Max Response Length
4096 tokens

## Architecture Decision Trees

### Pipeline Behavior Order

| Order | Behavior | Purpose |
|-------|----------|---------|
| 1 | LoggingBehavior | Log request start/end with timing |
| 2 | ValidationBehavior | Validate before processing |
| 3 | PerformanceBehavior | Warn if > threshold (500ms) |
| 4 | UnhandledExceptionBehavior | Catch and wrap unhandled |
| 5 | TransactionBehavior | Wrap in DB transaction |

Pipeline behaviors run in registration order (first added = outer wrapper, runs first).

### FluentValidation vs Data Annotations

| Criterion | FluentValidation | Data Annotations |
|-----------|-----------------|------------------|
| Separation | External to model | On model properties |
| Conditional rules | Yes (When/Unless) | Limited |
| Cross-property | Yes (Must) | No |
| DI support | Yes (inject services) | No |
| Testability | Easy (validator per model) | Requires model instantiation |

Decision: Complex validation rules → FluentValidation. Simple non-null/range checks → Data Annotations.

## Workflow

### Step 1: MediatR Pipeline Behaviors

```csharp
// Application/Common/Behaviors/PerformanceBehavior.cs
public class PerformanceBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    private readonly ILogger<PerformanceBehavior<TRequest, TResponse>> _logger;

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken ct)
    {
        const int threshold = 500;
        var sw = Stopwatch.StartNew();
        var response = await next();
        sw.Stop();

        if (sw.ElapsedMilliseconds > threshold)
        {
            _logger.LogWarning("Long running request: {Name} ({Elapsed}ms)",
                typeof(TRequest).Name, sw.ElapsedMilliseconds);
        }

        return response;
    }
}

// Application/Common/Behaviors/TransactionBehavior.cs
public class TransactionBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    private readonly AppDbContext _context;

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken ct)
    {
        if (request is IQuery<TResponse>) return await next();

        await using var transaction = await _context.Database.BeginTransactionAsync(ct);
        try
        {
            var response = await next();
            await transaction.CommitAsync(ct);
            return response;
        }
        catch
        {
            await transaction.RollbackAsync(ct);
            throw;
        }
    }
}
```

### Step 2: Result Pattern

```csharp
// Application/Common/Models/Result.cs
public class Result<T>
{
    private readonly T? _value;
    public T Value => IsSuccess ? _value! : throw new InvalidOperationException("No value on failure");
    public bool IsSuccess { get; }
    public bool IsFailure => !IsSuccess;
    public Error Error { get; }

    private Result(T value)
    {
        _value = value;
        IsSuccess = true;
        Error = Error.None();
    }

    private Result(Error error)
    {
        IsSuccess = false;
        Error = error;
    }

    public static Result<T> Success(T value) => new(value);
    public static Result<T> Failure(Error error) => new(error);

    public TOut Match<TOut>(Func<T, TOut> onSuccess, Func<Error, TOut> onFailure)
        => IsSuccess ? onSuccess(_value!) : onFailure(Error);
}

// Application/Common/Models/Error.cs
public record Error(string Code, string Message)
{
    public static Error None() => new(string.Empty, string.Empty);
    public static Error NotFound(string entity) => new("NOT_FOUND", $"{entity} not found");
    public static Error Validation(string message) => new("VALIDATION_ERROR", message);
    public static Error Conflict(string message) => new("CONFLICT", message);
}

// Usage in handler
public async Task<Result<OrderDto>> Handle(CreateOrderCommand request, CancellationToken ct)
{
    var existing = await _repository.FindByOrderNumber(request.OrderNumber);
    if (existing is not null)
        return Result<OrderDto>.Failure(Error.Conflict("Order number already exists"));

    var order = new Order(request.OrderNumber);
    await _repository.AddAsync(order);
    return Result<OrderDto>.Success(_mapper.Map<OrderDto>(order));
}

// Controller consumes result
[HttpPost]
public IActionResult CreateOrder(CreateOrderCommand command)
{
    var result = await _mediator.Send(command);
    return result.Match<IActionResult>(
        onSuccess: dto => CreatedAtAction(nameof(GetById), new { id = dto.Id }, dto),
        onFailure: error => error.Code switch
        {
            "NOT_FOUND" => NotFound(new { error.Message }),
            "VALIDATION_ERROR" => BadRequest(new { error.Message }),
            "CONFLICT" => Conflict(new { error.Message }),
            _ => StatusCode(500, new { error.Message }),
        }
    );
}
```

### Step 3: EF Core Query Optimization

```csharp
// Repository with optimized queries
public class OrderRepository : IOrderRepository
{
    private readonly AppDbContext _context;

    public async Task<Order?> GetByIdWithItemsAsync(Guid id)
    {
        return await _context.Orders
            .Include(o => o.Items)
            .AsSplitQuery()  // Avoid cartesian explosion
            .FirstOrDefaultAsync(o => o.Id == id);
    }

    public async Task<PagedResult<OrderSummary>> GetPagedAsync(int page, int size)
    {
        var query = _context.Orders
            .AsNoTracking()
            .Select(o => new OrderSummary
            {
                Id = o.Id,
                OrderNumber = o.OrderNumber,
                Status = o.Status,
                ItemCount = o.Items.Count,
                Total = o.Items.Sum(i => i.Price * i.Quantity)
            });

        var total = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * size)
            .Take(size)
            .ToListAsync();

        return new PagedResult<OrderSummary>(items, total, page, size);
    }

    public async Task BulkUpdateStatusAsync(OrderStatus fromStatus, OrderStatus toStatus)
    {
        await _context.Orders
            .Where(o => o.Status == fromStatus)
            .ExecuteUpdateAsync(s => s.SetProperty(o => o.Status, toStatus));
    }
}

// Compiled query for hot paths
private static readonly Func<AppDbContext, Guid, Task<Order?>> GetOrderById =
    EF.CompileAsyncQuery((AppDbContext ctx, Guid id) =>
        ctx.Orders.AsNoTracking().FirstOrDefault(o => o.Id == id));
```

### Step 4: Outbox Pattern for Reliable Messaging

```csharp
// Domain/DomainEvents/IDomainEvent.cs
public interface IDomainEvent
{
    Guid EventId { get; }
    DateTime OccurredOn { get; }
}

// Infrastructure/Persistence/OutboxMessage.cs
public class OutboxMessage
{
    public Guid Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime OccurredOn { get; set; }
    public DateTime? ProcessedOn { get; set; }
    public string? Error { get; set; }
}

// Save domain events as outbox messages
public override async Task<int> SaveChangesAsync(CancellationToken ct = default)
{
    var domainEvents = ChangeTracker.Entries<IAggregateRoot>()
        .Select(e => e.Entity)
        .SelectMany(e =>
        {
            var events = e.DomainEvents.ToList();
            e.ClearDomainEvents();
            return events;
        })
        .ToList();

    var outboxMessages = domainEvents.Select(e => new OutboxMessage
    {
        Id = Guid.NewGuid(),
        Type = e.GetType().AssemblyQualifiedName!,
        Content = JsonSerializer.Serialize(e, _jsonOptions),
        OccurredOn = DateTime.UtcNow,
    }).ToList();

    OutboxMessages.AddRange(outboxMessages);

    return await base.SaveChangesAsync(ct);
}
```

### Step 5: Event Sourcing with EF Core

```csharp
// Domain/Events/OrderEvents.cs
public record OrderCreatedEvent(Guid OrderId, string OrderNumber, DateTime OccurredOn) : IDomainEvent;
public record OrderItemAddedEvent(Guid OrderId, string Product, decimal Price, int Quantity) : IDomainEvent;
public record OrderConfirmedEvent(Guid OrderId, DateTime OccurredOn) : IDomainEvent;

// Infrastructure/Persistence/EventStore.cs
public class EventStore : IEventStore
{
    private readonly AppDbContext _context;

    public async Task AppendEventsAsync(Guid aggregateId, IEnumerable<IDomainEvent> events, int expectedVersion)
    {
        var eventData = events.Select(e => new EventDescriptor
        {
            AggregateId = aggregateId,
            EventType = e.GetType().Name,
            EventData = JsonSerializer.Serialize(e),
            Version = expectedVersion++,
            Timestamp = DateTime.UtcNow,
        });

        await _context.EventDescriptors.AddRangeAsync(eventData);
        await _context.SaveChangesAsync();
    }

    public async Task<List<IDomainEvent>> GetEventsAsync(Guid aggregateId)
    {
        var descriptors = await _context.EventDescriptors
            .Where(d => d.AggregateId == aggregateId)
            .OrderBy(d => d.Version)
            .ToListAsync();

        return descriptors.Select(d =>
            JsonSerializer.Deserialize(d.EventData, GetEventType(d.EventType)) as IDomainEvent)
            .ToList()!;
    }

    private Type GetEventType(string eventType) => eventType switch
    {
        nameof(OrderCreatedEvent) => typeof(OrderCreatedEvent),
        nameof(OrderItemAddedEvent) => typeof(OrderItemAddedEvent),
        nameof(OrderConfirmedEvent) => typeof(OrderConfirmedEvent),
        _ => throw new InvalidOperationException($"Unknown event: {eventType}")
    };
}
```

## Production Considerations

### EF Core Connection Resiliency

```csharp
services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        connectionString,
        sqlOptions =>
        {
            sqlOptions.EnableRetryOnFailure(
                maxRetryCount: 3,
                maxRetryDelay: TimeSpan.FromSeconds(10),
                errorNumbersToAdd: null);
            sqlOptions.CommandTimeout(30);
        }));
```

### Caching with LazyCache or IDistributedCache

```csharp
public class CachedOrderRepository : IOrderRepository
{
    private readonly IOrderRepository _inner;
    private readonly IDistributedCache _cache;

    public async Task<Order?> GetByIdAsync(Guid id)
    {
        var cacheKey = $"order:{id}";
        var cached = await _cache.GetStringAsync(cacheKey);
        if (cached is not null) return JsonSerializer.Deserialize<Order>(cached);

        var order = await _inner.GetByIdAsync(id);
        if (order is not null)
            await _cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(order),
                new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5) });
        return order;
    }
}
```

## Anti-Patterns

| Anti-Pattern | Why | Fix |
|-------------|-----|-----|
| `IQueryable` outside repository | Leaks DB details to application | Return `IEnumerable<T>` or `List<T>` |
| `async void` in ASP.NET Core | Uncatchable exceptions, process crash | Always `async Task` |
| `DbSet<T>` in Application | Couples to EF Core | Use repository interfaces |
| Multiple `Include()` without `AsSplitQuery()` | Cartesian explosion, huge result sets | Use `AsSplitQuery()` or projection |
| `SaveChangesAsync` in each handler | No transactional consistency | Outbox + TransactionBehavior |
| Direct `IConfiguration` injection | Hard to test, violates ISP | `IOptions<T>` pattern |

## Security Considerations
- EF Core raw SQL: always use parameterization, never string interpolation
- SQL injection via `FromSqlRaw`: validate all inputs, use `FromSqlInterpolated`
- Encrypt sensitive columns with EF Core value converters
- Use `[EncryptColumn]` attribute or custom `ValueConverter` for PII
- Audit logging via EF Core `SaveChangesInterceptor` or outbox events

## Testing Strategies

### Unit Testing Pipeline Behaviors

```csharp
[Fact]
public async Task ValidationBehavior_ShouldThrowWhenInvalid()
{
    var validator = new InlineValidator<TestRequest>();
    validator.RuleFor(x => x.Value).GreaterThan(0);
    var behavior = new ValidationBehavior<TestRequest, TestResponse>(
        new[] { validator });

    await Assert.ThrowsAsync<ValidationException>(() =>
        behavior.Handle(new TestRequest { Value = -1 }, () => Task.FromResult(new TestResponse()), CancellationToken.None));
}
```

### Integration Testing EF Core
Use `WebApplicationFactory<T>` with in-memory or TestContainers SQL Server. Seed data in test setup. Verify with `Shouldly` or `FluentAssertions`. Use `Verify` for snapshot testing of complex responses.

## Rules
- MediatR pipeline order: Logging → Validation → Performance → Exception → Transaction.
- Result pattern at Application boundary — never throw for expected failure paths.
- Domain events dispatched via MediatR `INotification`, never directly.
- Outbox pattern for reliable messaging — never publish events within same transaction.
- EF Core: `AsNoTracking` for reads, `AsSplitQuery` for multiple includes, `ExecuteUpdate` for bulk.
- Caching layer wraps repository — decorated with `IDistributedCache`.
- All DB access goes through repository interface — no `DbContext` in handlers.

## References
  - references/cqrs-mediatr.md — CQRS with MediatR
  - references/dotnet-cqrs.md — .NET CQRS Patterns
  - references/dotnet-event-sourcing.md — Event Sourcing in .NET
  - references/dotnet-pipeline-behaviors.md — MediatR Pipeline Behaviors
  - references/dotnet-result-pattern.md — Result Pattern
  - references/ef-core-patterns.md — EF Core Patterns
## Handoff
Hand off to `backend/dotnet/architecture/SKILL.md` for architecture structure or `backend/universal/api-response/SKILL.md` for API response formatting.
