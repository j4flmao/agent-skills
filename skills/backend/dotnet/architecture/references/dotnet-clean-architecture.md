# .NET Clean Architecture

## Layer Structure

```
src/
  YourApp.Domain/           # Enterprise business rules
  YourApp.Application/      # Use cases / application logic
  YourApp.Infrastructure/   # External concerns (DB, APIs, filesystem)
  YourApp.Api/              # Presentation / entry point
tests/
  YourApp.UnitTests/
  YourApp.IntegrationTests/
  YourApp.ArchTests/
```

## Dependency Rule

Layers depend inward. Domain has zero external dependencies.

```
Api → Application → Domain
  ↓          ↓
Infrastructure → Domain
```

## Domain Layer

```csharp
// Domain/Entities/Order.cs — pure C#, no framework
public class Order
{
    private readonly List<OrderItem> _items = [];

    public Guid Id { get; private set; }
    public string CustomerId { get; private set; }
    public OrderStatus Status { get; private set; }
    public IReadOnlyList<OrderItem> Items => _items.AsReadOnly();

    private Order() { } // EF Core constructor

    public static Order Create(string customerId, List<OrderItem> items)
    {
        if (string.IsNullOrWhiteSpace(customerId))
            throw new DomainException("CustomerId required");
        if (items.Count == 0)
            throw new DomainException("At least one item required");
        return new Order { Id = Guid.NewGuid(), CustomerId = customerId, Status = OrderStatus.Pending };
    }

    public void Confirm()
    {
        if (Status != OrderStatus.Pending)
            throw new DomainException("Only pending orders can be confirmed");
        Status = OrderStatus.Confirmed;
    }
}
```

```csharp
// Domain/ValueObjects/Money.cs
public record Money(decimal Amount, string Currency)
{
    public static Money operator +(Money a, Money b)
    {
        if (a.Currency != b.Currency)
            throw new DomainException("Currency mismatch");
        return new Money(a.Amount + b.Amount, a.Currency);
    }
}
```

## Application Layer

```csharp
// Application/Common/Interfaces/IOrderRepository.cs
public interface IOrderRepository
{
    Task<Order?> GetByIdAsync(Guid id, CancellationToken ct);
    Task AddAsync(Order order, CancellationToken ct);
    Task SaveChangesAsync(CancellationToken ct);
}

// Application/UseCases/CreateOrderCommand.cs
public record CreateOrderCommand(string CustomerId, List<OrderItemDto> Items) : IRequest<Result<Guid>>;

public class CreateOrderHandler : IRequestHandler<CreateOrderCommand, Result<Guid>>
{
    private readonly IOrderRepository _repo;
    public CreateOrderHandler(IOrderRepository repo) => _repo = repo;

    public async Task<Result<Guid>> Handle(CreateOrderCommand request, CancellationToken ct)
    {
        var items = request.Items.Select(i => new OrderItem(i.ProductId, i.Quantity));
        var order = Order.Create(request.CustomerId, items.ToList());
        await _repo.AddAsync(order, ct);
        await _repo.SaveChangesAsync(ct);
        return Result.Success(order.Id);
    }
}
```

## Infrastructure Layer

```csharp
// Infrastructure/Persistence/AppDbContext.cs
public class AppDbContext : DbContext
{
    public DbSet<OrderEntity> Orders => Set<OrderEntity>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        builder.Entity<OrderEntity>(entity =>
        {
            entity.ToTable("Orders");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.CustomerId).IsRequired().HasMaxLength(100);
            entity.OwnsMany(e => e.Items, item =>
            {
                item.WithOwner().HasForeignKey("OrderId");
                item.ToTable("OrderItems");
            });
        });
    }
}

// Infrastructure/Persistence/Repositories/OrderRepository.cs
public class OrderRepository : IOrderRepository
{
    private readonly AppDbContext _db;
    public OrderRepository(AppDbContext db) => _db = db;

    public async Task<Order?> GetByIdAsync(Guid id, CancellationToken ct)
    {
        var entity = await _db.Orders.FindAsync([id], ct);
        return entity?.ToDomain();
    }
}
```

## Presentation Layer (Api)

```csharp
// Program.cs — DI composition root
builder.Services.AddScoped<IOrderRepository, OrderRepository>();
builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssemblyContaining<CreateOrderHandler>());

WebApplication app = builder.Build();

app.MapPost("/api/orders", async (CreateOrderCommand cmd, ISender sender) =>
{
    var result = await sender.Send(cmd);
    return result.Match(
        id => Results.Created($"/api/orders/{id}", id),
        error => Results.Problem(error.Message));
});
```

## Rules

| Layer | Can reference | Cannot reference |
|-------|---------------|------------------|
| Domain | Nothing | External frameworks |
| Application | Domain | Infrastructure, Api |
| Infrastructure | Domain | Api |
| Api | Application, Infrastructure | Nothing |
