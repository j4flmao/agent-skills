# EF Core Patterns Reference

## DbContext Configuration

### Basic Setup

```csharp
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
```

### Entity Configuration (IEntityTypeConfiguration)

```csharp
public class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.ToTable("Orders");

        builder.HasKey(o => o.Id);
        builder.Property(o => o.Id).ValueGeneratedNever(); // domain-generated

        builder.Property(o => o.Status)
            .HasMaxLength(50)
            .HasConversion<string>();

        builder.Property(o => o.Total)
            .HasColumnType("decimal(18,2)");

        builder.Property(o => o.CreatedAt)
            .HasDefaultValueSql("CURRENT_TIMESTAMP");

        builder.HasMany(o => o.Items)
            .WithOne()
            .HasForeignKey(i => i.OrderId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<Customer>()
            .WithMany()
            .HasForeignKey(o => o.CustomerId);

        // Owned value object
        builder.OwnsOne(o => o.ShippingAddress, address =>
        {
            address.Property(a => a.Street).HasMaxLength(200);
            address.Property(a => a.City).HasMaxLength(100);
            address.Property(a => a.ZipCode).HasMaxLength(20);
        });
    }
}
```

## Performance Patterns

### Query Optimization

```csharp
// BAD: N+1 queries
var orders = await _db.Orders.ToListAsync();
foreach (var order in orders)
{
    await _db.Entry(order).Collection(o => o.Items).LoadAsync(); // N additional queries!
}

// GOOD: Eager loading
var orders = await _db.Orders
    .Include(o => o.Items)
    .ThenInclude(i => i.Product)
    .ToListAsync();

// GOOD: Projection (select only needed columns)
var summaries = await _db.Orders
    .Where(o => o.CustomerId == customerId)
    .Select(o => new OrderSummary(
        o.Id,
        o.Status,
        o.Total,
        o.Items.Count
    ))
    .ToListAsync();

// GOOD: Split query for large collections (EF Core 5+)
var orders = await _db.Orders
    .Include(o => o.Items)
    .AsSplitQuery()
    .ToListAsync();
```

### Bulk Operations

```csharp
// BAD: Updating 1000 rows one by one
foreach (var order in orders)
    order.Status = OrderStatus.Shipped;
await _db.SaveChangesAsync(); // 1000 UPDATE statements

// GOOD: ExecuteUpdate (EF Core 7+)
await _db.Orders
    .Where(o => o.CreatedAt < cutoff && o.Status == OrderStatus.Pending)
    .ExecuteUpdateAsync(setters => setters
        .SetProperty(o => o.Status, OrderStatus.Cancelled)
        .SetProperty(o => o.CancelledAt, DateTime.UtcNow));

// GOOD: ExecuteDelete (EF Core 7+)
await _db.Orders
    .Where(o => o.CreatedAt < archiveCutoff)
    .ExecuteDeleteAsync();
```

### AsNoTracking

```csharp
// Read-only queries: skip change tracking
var orders = await _db.Orders
    .AsNoTracking()
    .Where(o => o.CustomerId == id)
    .ToListAsync(); // ~40% faster
```

## Migration Strategy

### Add Migration

```bash
dotnet ef migrations add AddOrderStatusIndex \
  --project src/YourApp.Infrastructure \
  --startup-project src/YourApp.Api \
  --context AppDbContext
```

### Migration Naming Convention

`{Action}{Entity}{Description}` — e.g., `AddOrderStatusIndex`, `UpdateCustomerEmailLength`, `CreateProductTable`.

### Apply Migrations

#### Development (auto-apply)
```csharp
// Program.cs
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
}
```

#### Production (manual/safe)
```bash
dotnet ef database update \
  --project src/YourApp.Infrastructure \
  --startup-project src/YourApp.Api
```

Or use a migration tool like DbUp for more control.

## Concurrency Handling

### Optimistic Concurrency

```csharp
public class Order
{
    public Guid Id { get; private set; }
    public decimal Total { get; private set; }

    [Timestamp]
    public byte[] RowVersion { get; private set; } = [];

    public void UpdateTotal(decimal newTotal) => Total = newTotal;
}

// When saving, EF throws DbUpdateConcurrencyException if version changed
try
{
    await _db.SaveChangesAsync(ct);
}
catch (DbUpdateConcurrencyException)
{
    // Reload and retry, or reject
    return Result.Failure(Error.Conflict("Order was modified by another user"));
}
```

### Pessimistic Concurrency (SQL Server only)

```csharp
await _db.Database.ExecuteSqlAsync(
    $"SELECT 1 FROM Orders WITH (UPDLOCK, ROWLOCK) WHERE Id = {orderId}");
```

## Connection Resiliency

```csharp
builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default"), sqlOptions =>
    {
        sqlOptions.EnableRetryOnFailure(
            maxRetryCount: 3,
            maxRetryDelay: TimeSpan.FromSeconds(10),
            errorCodesToAdd: null);
    });
});
```

## Testing with EF Core

### InMemory (isolated, fast)

```csharp
public static AppDbContext CreateInMemory()
{
    var options = new DbContextOptionsBuilder<AppDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString())
        .Options;
    return new AppDbContext(options);
}

// Test
var db = CreateInMemory();
db.Orders.Add(Order.Create(...));
await db.SaveChangesAsync();

var result = await db.Orders.FirstOrDefaultAsync(o => o.Id == id);
result.Should().NotBeNull();
```

### TestContainers (real database, slower)

```csharp
public class PostgresTestContainer : IAsyncLifetime
{
    private readonly PostgreSQLContainer _container = new PostgreSQLBuilder().Build();

    public async Task InitializeAsync() => await _container.StartAsync();
    public async Task DisposeAsync() => await _container.StopAsync();

    public string ConnectionString => _container.GetConnectionString();
}
```
