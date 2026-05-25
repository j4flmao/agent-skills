# .NET CQRS with MediatR

## CQRS Decision Guide

| Scenario | CQRS | Simple CRUD |
|----------|------|-------------|
| Read/write models differ | ✅ | ❌ |
| High read vs write ratio | ✅ | ❌ |
| Complex domain logic | ✅ | ❌ |
| Simple CRUD API | ❌ | ✅ |
| Performance separation needed | ✅ | ❌ |

## Command Pattern

```csharp
// Command — request to change state
public record PlaceOrderCommand(
    Guid CustomerId,
    IReadOnlyList<OrderItemDto> Items,
    string ShippingAddress
) : IRequest<Result<OrderResponse>>;

// Command Handler — single responsibility
public class PlaceOrderHandler : IRequestHandler<PlaceOrderCommand, Result<OrderResponse>>
{
    private readonly IOrderRepository _repo;
    private readonly IDomainEventPublisher _publisher;

    public PlaceOrderHandler(IOrderRepository repo, IDomainEventPublisher publisher)
    {
        _repo = repo;
        _publisher = publisher;
    }

    public async Task<Result<OrderResponse>> Handle(PlaceOrderCommand cmd, CancellationToken ct)
    {
        var orderResult = Order.Create(cmd.CustomerId, cmd.Items, cmd.ShippingAddress);
        if (orderResult.IsFailure) return Result.Failure<OrderResponse>(orderResult.Error);

        await _repo.AddAsync(orderResult.Value, ct);
        await _repo.SaveChangesAsync(ct);
        await _publisher.PublishAsync(new OrderPlacedEvent(orderResult.Value.Id), ct);

        return Result.Success(new OrderResponse(orderResult.Value.Id, orderResult.Value.Status));
    }
}
```

## Query Pattern

```csharp
// Query — request to read state, no side effects
public record GetOrderQuery(Guid OrderId) : IRequest<Result<OrderResponse>>;

public record SearchOrdersQuery(
    Guid? CustomerId,
    OrderStatus? Status,
    int Page,
    int PageSize
) : IRequest<Result<PaginatedResult<OrderSummary>>>;

// Query Handler — optimized for reads
public class GetOrderHandler : IRequestHandler<GetOrderQuery, Result<OrderResponse>>
{
    private readonly IOrderReadRepository _readRepo;

    public GetOrderHandler(IOrderReadRepository readRepo) => _readRepo = readRepo;

    public async Task<Result<OrderResponse>> Handle(GetOrderQuery query, CancellationToken ct)
    {
        var order = await _readRepo.GetByIdAsync(query.OrderId, ct);
        return order is null
            ? Result.Failure<OrderResponse>(Error.NotFound("Order not found"))
            : Result.Success(order);
    }
}
```

## Separate Read/Write Models

```csharp
// Write model (domain aggregate)
public class Order : AggregateRoot
{
    public Guid Id { get; private set; }
    private List<OrderItem> _items = [];
    public OrderStatus Status { get; private set; }

    public void AddItem(ProductId productId, int quantity, Money price)
    {
        if (Status != OrderStatus.Pending)
            throw new DomainException("Cannot modify confirmed order");
        _items.Add(new OrderItem(productId, quantity, price));
    }
}

// Read model (denormalized for queries)
public class OrderReadModel
{
    public Guid Id { get; set; }
    public string CustomerName { get; set; }
    public string Status { get; set; }
    public decimal TotalAmount { get; set; }
    public int ItemCount { get; set; }
    public DateTime CreatedAt { get; set; }
}
```

## MediatR Pipeline Behaviors

```csharp
// Registration
builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssemblyContaining<PlaceOrderHandler>();
    cfg.AddOpenBehavior(typeof(ValidationBehavior<,>));
    cfg.AddOpenBehavior(typeof(LoggingBehavior<,>));
    cfg.AddOpenBehavior(typeof(TransactionBehavior<,>));
});

// Validation pipeline
public class ValidationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    private readonly IEnumerable<IValidator<TRequest>> _validators;

    public async Task<TResponse> Handle(
        TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken ct)
    {
        if (!_validators.Any()) return await next();

        var failures = await Task.WhenAll(
            _validators.Select(v => v.ValidateAsync(request, ct)));
        var errors = failures.SelectMany(r => r.Errors).Where(e => e != null).ToList();

        if (errors.Count != 0)
            throw new ValidationException(errors);

        return await next();
    }
}
```

## FluentValidation

```csharp
public class PlaceOrderValidator : AbstractValidator<PlaceOrderCommand>
{
    public PlaceOrderValidator()
    {
        RuleFor(x => x.CustomerId).NotEmpty();
        RuleFor(x => x.Items).NotEmpty().WithMessage("At least one item required");
        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.ProductId).NotEmpty();
            item.RuleFor(i => i.Quantity).GreaterThan(0);
            item.RuleFor(i => i.Price).GreaterThan(0);
        });
        RuleFor(x => x.ShippingAddress).NotEmpty().MaximumLength(500);
    }
}
```

## Event Sourcing Read Model Projection

```csharp
// Project events to read model
public class OrderProjection :
    INotificationHandler<OrderPlacedEvent>,
    INotificationHandler<OrderConfirmedEvent>
{
    private readonly OrdersReadDbContext _db;

    public async Task Handle(OrderPlacedEvent notification, CancellationToken ct)
    {
        await _db.OrderSummaries.AddAsync(new OrderReadModel
        {
            Id = notification.OrderId,
            Status = "Pending",
            CreatedAt = DateTime.UtcNow,
        }, ct);
        await _db.SaveChangesAsync(ct);
    }
}
```
