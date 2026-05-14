# CQRS with MediatR Reference

## Full Implementation

### Command/Query Base

```csharp
// Base types (from MediatR)
// IRequest<TResponse> — for commands and queries
// IRequest — for commands without return value
// INotification — for events (fire-and-forget)

using MediatR;

// Application/Common/Interfaces/ICommand.cs
public interface ICommand<out TResponse> : IRequest<TResponse> { }

// Application/Common/Interfaces/IQuery.cs
public interface IQuery<out TResponse> : IRequest<TResponse> { }
```

### Command Example: Create Order

```csharp
// Application/Orders/Commands/CreateOrder/CreateOrderCommand.cs
public record CreateOrderCommand(
    Guid CustomerId,
    IReadOnlyList<CreateOrderItemDto> Items
) : ICommand<Result<OrderResponse>>;

// Application/Orders/Commands/CreateOrder/CreateOrderCommandValidator.cs
public class CreateOrderCommandValidator : AbstractValidator<CreateOrderCommand>
{
    public CreateOrderCommandValidator()
    {
        RuleFor(x => x.CustomerId).NotEmpty();
        RuleFor(x => x.Items).NotEmpty().WithMessage("At least one item is required.");
        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.ProductId).NotEmpty();
            item.RuleFor(i => i.Quantity).GreaterThan(0);
        });
    }
}

// Application/Orders/Commands/CreateOrder/CreateOrderCommandHandler.cs
public class CreateOrderCommandHandler : ICommandHandler<CreateOrderCommand, Result<OrderResponse>>
{
    private readonly IApplicationDbContext _db;
    private readonly IPublisher _publisher;

    public CreateOrderCommandHandler(IApplicationDbContext db, IPublisher publisher)
    {
        _db = db;
        _publisher = publisher;
    }

    public async Task<Result<OrderResponse>> Handle(CreateOrderCommand request, CancellationToken ct)
    {
        var customer = await _db.Customers.FindAsync(new object[] { request.CustomerId }, ct);
        if (customer is null)
            return Result.Failure<OrderResponse>(Error.NotFound("Customer not found"));

        var order = Order.Create(request.CustomerId, request.Items);
        _db.Orders.Add(order);

        await _db.SaveChangesAsync(ct);

        await _publisher.Publish(new OrderCreatedDomainEvent(order.Id, order.Total), ct);

        return Result.Success(new OrderResponse(order.Id, order.Total, order.Items.Count));
    }
}
```

### Query Example: Get Order

```csharp
// Application/Orders/Queries/GetOrder/GetOrderQuery.cs
public record GetOrderQuery(Guid Id) : IQuery<Result<OrderResponse>>;

// Application/Orders/Queries/GetOrder/GetOrderQueryHandler.cs
public class GetOrderQueryHandler : IQueryHandler<GetOrderQuery, Result<OrderResponse>>
{
    private readonly IApplicationDbContext _db;
    private readonly IMapper _mapper;

    public GetOrderQueryHandler(IApplicationDbContext db, IMapper mapper)
    {
        _db = db;
        _mapper = mapper;
    }

    public async Task<Result<OrderResponse>> Handle(GetOrderQuery request, CancellationToken ct)
    {
        var order = await _db.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == request.Id, ct);

        if (order is null)
            return Result.Failure<OrderResponse>(Error.NotFound($"Order {request.Id} not found"));

        return Result.Success(_mapper.Map<OrderResponse>(order));
    }
}
```

### Event Handler (Side Effects)

```csharp
// Domain event
public record OrderCreatedDomainEvent(Guid OrderId, decimal Total) : INotification;

// Application/Orders/Events/OrderCreated/OrderCreatedEmailHandler.cs
public class OrderCreatedEmailHandler : INotificationHandler<OrderCreatedDomainEvent>
{
    private readonly IEmailService _email;

    public OrderCreatedEmailHandler(IEmailService email) => _email = email;

    public async Task Handle(OrderCreatedDomainEvent notification, CancellationToken ct)
    {
        await _email.SendOrderConfirmationAsync(notification.OrderId);
    }
}

// Application/Orders/Events/OrderCreated/OrderCreatedAuditHandler.cs
public class OrderCreatedAuditHandler : INotificationHandler<OrderCreatedDomainEvent>
{
    private readonly IAuditService _audit;

    public OrderCreatedAuditHandler(IAuditService audit) => _audit = audit;

    public async Task Handle(OrderCreatedDomainEvent notification, CancellationToken ct)
    {
        await _audit.LogAsync("OrderCreated", notification.OrderId.ToString());
    }
}
```

### DI Registration

```csharp
// Program.cs or Application/DependencyInjection.cs
public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssembly(Assembly.GetExecutingAssembly());
            cfg.AddOpenBehavior(typeof(ValidationBehavior<,>));
            cfg.AddOpenBehavior(typeof(LoggingBehavior<,>));
            cfg.AddOpenBehavior(typeof(PerformanceBehavior<,>));
        });

        services.AddValidatorsFromAssembly(Assembly.GetExecutingAssembly());
        services.AddAutoMapper(Assembly.GetExecutingAssembly());

        return services;
    }
}
```

## Pipeline Behaviors

### Validation Behavior

```csharp
public class ValidationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
    where TResponse : IResult
{
    private readonly IEnumerable<IValidator<TRequest>> _validators;

    public ValidationBehavior(IEnumerable<IValidator<TRequest>> validators)
        => _validators = validators;

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        if (!_validators.Any())
            return await next();

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
```

### Performance Behavior

```csharp
public class PerformanceBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    private readonly ILogger<PerformanceBehavior<TRequest, TResponse>> _logger;

    public PerformanceBehavior(ILogger<PerformanceBehavior<TRequest, TResponse>> logger)
        => _logger = logger;

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        var sw = Stopwatch.StartNew();
        var response = await next();
        sw.Stop();

        if (sw.ElapsedMilliseconds > 500)
            _logger.LogWarning(
                "Long running request: {Request} ({Elapsed}ms)",
                typeof(TRequest).Name,
                sw.ElapsedMilliseconds);

        return response;
    }
}
```

## Testing

### Unit Test Command Handler

```csharp
public class CreateOrderCommandHandlerTests
{
    [Fact]
    public async Task Handle_ValidRequest_ReturnsSuccessWithOrderId()
    {
        // Arrange
        var db = Substitute.For<IApplicationDbContext>();
        var orders = new List<Order>();
        db.Orders.Returns(new TestDbSet<Order>(orders));
        db.SaveChangesAsync(Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(1));

        var publisher = Substitute.For<IPublisher>();
        var handler = new CreateOrderCommandHandler(db, publisher);
        var command = new CreateOrderCommand(Guid.NewGuid(), new List<CreateOrderItemDto>
        {
            new(Guid.NewGuid(), 2)
        });

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Id.Should().NotBeEmpty();
    }

    [Fact]
    public async Task Handle_InvalidCustomer_ReturnsFailure()
    {
        // Arrange
        var db = Substitute.For<IApplicationDbContext>();
        db.Customers.FindAsync(Arg.Any<object[]>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult<Customer?>(null));

        var publisher = Substitute.For<IPublisher>();
        var handler = new CreateOrderCommandHandler(db, publisher);

        // Act
        var result = await handler.Handle(new CreateOrderCommand(Guid.NewGuid(), new List<CreateOrderItemDto>()), CancellationToken.None);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.NotFound);
    }
}
```

### Integration Test

```csharp
public class OrdersControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public OrdersControllerTests(WebApplicationFactory<Program> factory)
        => _factory = factory;

    [Fact]
    public async Task CreateOrder_ValidRequest_Returns201()
    {
        var client = _factory.CreateClient();
        var request = new { CustomerId = Guid.NewGuid(), Items = new[] { new { ProductId = Guid.NewGuid(), Quantity = 1 } } };
        var content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json");

        var response = await client.PostAsync("/api/orders", content);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }
}
```
