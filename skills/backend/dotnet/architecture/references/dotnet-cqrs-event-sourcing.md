# .NET CQRS and Event Sourcing

## CQRS with MediatR

Separate read and write models using MediatR commands and queries:

```csharp
// Command (Write)
public record CreateOrderCommand(
    Guid CustomerId,
    IReadOnlyList<OrderItemDto> Items,
    string Currency
) : IRequest<Result<OrderResponse>>;

public class CreateOrderHandler : IRequestHandler<CreateOrderCommand, Result<OrderResponse>>
{
    private readonly AppDbContext _db;
    private readonly IEventBus _eventBus;

    public CreateOrderHandler(AppDbContext db, IEventBus eventBus)
    {
        _db = db;
        _eventBus = eventBus;
    }

    public async Task<Result<OrderResponse>> Handle(CreateOrderCommand request, CancellationToken ct)
    {
        var order = Order.Create(request.CustomerId, request.Items, request.Currency);
        _db.Orders.Add(order);
        await _db.SaveChangesAsync(ct);
        await _eventBus.Publish(new OrderCreatedEvent(order.Id, order.CustomerId, order.Total), ct);
        return Result.Success(new OrderResponse(order.Id, order.Total));
    }
}

// Query (Read)
public record GetOrdersQuery(
    Guid CustomerId,
    int Page,
    int PageSize
) : IRequest<Result<PaginatedResult<OrderResponse>>>;

public class GetOrdersHandler : IRequestHandler<GetOrdersQuery, Result<PaginatedResult<OrderResponse>>>
{
    private readonly AppDbContext _db;

    public GetOrdersHandler(AppDbContext db) => _db = db;

    public async Task<Result<PaginatedResult<OrderResponse>>> Handle(GetOrdersQuery request, CancellationToken ct)
    {
        var query = _db.Orders
            .Where(o => o.CustomerId == request.CustomerId)
            .OrderByDescending(o => o.CreatedAt);

        var total = await query.CountAsync(ct);
        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(o => new OrderResponse(o.Id, o.Total))
            .ToListAsync(ct);

        return Result.Success(new PaginatedResult<OrderResponse>(items, total, request.Page, request.PageSize));
    }
}
```

## Event Sourcing with Marten

```csharp
// Domain events
public record OrderInitiated(Guid OrderId, Guid CustomerId, DateTime OccurredAt);
public record OrderItemAdded(Guid OrderId, string Sku, int Quantity, decimal Price);
public record OrderSubmitted(Guid OrderId, decimal Total);
public record OrderShipped(Guid OrderId, string TrackingNumber);
public record OrderDelivered(Guid OrderId);

// Aggregate
public class OrderAggregate
{
    public Guid Id { get; private set; }
    public Guid CustomerId { get; private set; }
    public OrderStatus Status { get; private set; }
    public List<OrderItem> Items { get; } = new();
    public decimal Total { get; private set; }

    public static OrderAggregate Create(Guid customerId)
    {
        var order = new OrderAggregate();
        order.Apply(new OrderInitiated(Guid.NewGuid(), customerId, DateTime.UtcNow));
        return order;
    }

    public void AddItem(string sku, int quantity, decimal price)
    {
        Ensure.NotSubmitted();
        Apply(new OrderItemAdded(Id, sku, quantity, price));
    }

    public void Submit()
    {
        Ensure.HasItems();
        Apply(new OrderSubmitted(Id, Total));
    }

    public void Apply(OrderInitiated e)
    {
        Id = e.OrderId;
        CustomerId = e.CustomerId;
        Status = OrderStatus.Initiated;
    }

    public void Apply(OrderItemAdded e)
    {
        Items.Add(new OrderItem(e.Sku, e.Quantity, e.Price));
        Total = Items.Sum(i => i.Quantity * i.Price);
    }

    public void Apply(OrderSubmitted e)
    {
        Status = OrderStatus.Submitted;
    }
}

// Marten configuration
public class MartenConfig
{
    public static void Configure(IServiceCollection services, string connectionString)
    {
        services.AddMarten(options =>
        {
            options.Connection(connectionString);
            options.Events.AddEventTypes(new[] {
                typeof(OrderInitiated),
                typeof(OrderItemAdded),
                typeof(OrderSubmitted),
            });
        });
    }
}
```

## Projections

```csharp
// Read model projection
public class OrderListViewProjection : IProjection
{
    public void Apply(IDocumentOperations ops, IReadOnlyList<StreamAction> streams)
    {
        foreach (var stream in streams)
        {
            foreach (var @event in stream.Events)
            {
                switch (@event.Data)
                {
                    case OrderInitiated e:
                        ops.Store(new OrderListEntry
                        {
                            Id = e.OrderId,
                            CustomerId = e.CustomerId,
                            Status = "Initiated",
                            CreatedAt = e.OccurredAt,
                        });
                        break;
                    case OrderSubmitted e:
                        ops.Store<OrderListEntry>(e.OrderId, entry => entry.Status = "Submitted");
                        break;
                }
            }
        }
    }
}
```

## Event Bus Integration

```csharp
public interface IEventBus
{
    Task Publish<T>(T @event, CancellationToken ct = default) where T : class;
}

public class InMemoryEventBus : IEventBus
{
    private readonly IServiceProvider _services;

    public InMemoryEventBus(IServiceProvider services) => _services = services;

    public async Task Publish<T>(T @event, CancellationToken ct = default) where T : class
    {
        using var scope = _services.CreateScope();
        var handlers = scope.ServiceProvider.GetServices<IEventHandler<T>>();
        foreach (var handler in handlers)
        {
            await handler.Handle(@event, ct);
        }
    }
}

public interface IEventHandler<T> where T : class
{
    Task Handle(T @event, CancellationToken ct);
}

public class OrderCreatedHandler : IEventHandler<OrderCreatedEvent>
{
    private readonly EmailService _email;
    private readonly ILogger<OrderCreatedHandler> _logger;

    public OrderCreatedHandler(EmailService email, ILogger<OrderCreatedHandler> logger)
    {
        _email = email;
        _logger = logger;
    }

    public async Task Handle(OrderCreatedEvent @event, CancellationToken ct)
    {
        _logger.LogInformation("Order {Id} created, sending confirmation", @event.OrderId);
        await _email.SendOrderConfirmation(@event.OrderId, @event.CustomerId);
    }
}
```

## Key Points

- Separate commands (writes) from queries (reads) for different models
- Use Marten for event sourcing with PostgreSQL
- Events are immutable facts — never modify past events
- Projections build read models from event streams
- Event bus for loose coupling between aggregates
- Version events for backward compatibility
- Snapshot aggregates periodically for performance
- Store events in order with global sequence position
- Handle idempotency in event handlers to prevent duplicates
- Test event-sourced aggregates by replaying events
