# .NET Testing Architecture

## Test Pyramid for .NET

| Layer | Framework | Purpose |
|-------|-----------|---------|
| Unit | xUnit / NUnit | Business logic, domain models |
| Integration | TestContainers | Database, message queue |
| Functional | WebApplicationFactory | HTTP endpoints |
| E2E | Playwright / Selenium | Full browser flow |

## Unit Testing Domain Logic

```csharp
public class OrderTests
{
    [Fact]
    public void CreateOrder_HasCorrectInitialState()
    {
        var order = Order.Create(Guid.NewGuid(), new List<OrderItemDto>(), "USD");
        Assert.Equal(OrderStatus.Initiated, order.Status);
        Assert.True(order.CreatedAt > DateTime.UtcNow.AddSeconds(-1));
    }

    [Fact]
    public void AddItem_UpdatesTotal()
    {
        var order = Order.Create(Guid.NewGuid(), new List<OrderItemDto>(), "USD");
        order.AddItem("SKU-001", 2, 25.99m);
        Assert.Equal(51.98m, order.Total);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void AddItem_NegativeQuantity_Throws(int quantity)
    {
        var order = Order.Create(Guid.NewGuid(), new List<OrderItemDto>(), "USD");
        Assert.Throws<DomainException>(() => order.AddItem("SKU-001", quantity, 10m));
    }
}
```

## Integration Tests with TestContainers

```csharp
public class OrderRepositoryTests : IClassFixture<PostgreSqlContainer>
{
    private readonly PostgreSqlContainer _container;
    private readonly AppDbContext _context;

    public OrderRepositoryTests(PostgreSqlContainer container)
    {
        _container = container;
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(_container.GetConnectionString())
            .Options;
        _context = new AppDbContext(options);
        _context.Database.Migrate();
    }

    [Fact]
    public async Task SaveAndRetrieveOrder()
    {
        var repo = new OrderRepository(_context);
        var order = Order.Create(Guid.NewGuid(), new List<OrderItemDto>(), "USD");
        order.AddItem("PROD-1", 2, 49.99m);

        await repo.SaveAsync(order);
        var retrieved = await repo.GetByIdAsync(order.Id);

        Assert.NotNull(retrieved);
        Assert.Equal(order.Total, retrieved.Total);
        Assert.Single(retrieved.Items);
    }
}
```

## Functional Tests with WebApplicationFactory

```csharp
public class OrderApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;

    public OrderApiTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureTestServices(services =>
            {
                services.RemoveAll<DbContextOptions<AppDbContext>>();
                services.AddDbContext<AppDbContext>(options =>
                    options.UseInMemoryDatabase("TestDb"));
            });
        });
        _client = _factory.CreateClient();
    }

    [Fact]
    public async Task PostOrder_Returns201()
    {
        var payload = new
        {
            CustomerId = Guid.NewGuid(),
            Items = new[] { new { Sku = "PROD-1", Quantity = 1, Price = 29.99m } }
        };

        var response = await _client.PostAsJsonAsync("/api/orders", payload);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var order = await response.Content.ReadFromJsonAsync<OrderResponse>();
        Assert.NotNull(order);
    }

    [Fact]
    public async Task GetOrder_NotFound_Returns404()
    {
        var response = await _client.GetAsync($"/api/orders/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
```

## Mocking with NSubstitute

```csharp
public class OrderServiceTests
{
    [Fact]
    public async Task CreateOrder_PublishesEvent()
    {
        var repo = Substitute.For<IOrderRepository>();
        var eventBus = Substitute.For<IEventBus>();
        var service = new OrderService(repo, eventBus);

        var dto = new CreateOrderCommand(Guid.NewGuid(), new List<OrderItemDto>(), "USD");
        await service.CreateAsync(dto);

        await eventBus.Received(1).Publish(Arg.Is<OrderCreatedEvent>(e => e.OrderId != Guid.Empty));
    }
}
```

## Performance Tests

```csharp
[MemoryDiagnoser]
public class OrderServiceBenchmark
{
    private OrderService _service = null!;

    [GlobalSetup]
    public void Setup()
    {
        var repo = Substitute.For<IOrderRepository>();
        repo.SaveAsync(Arg.Any<Order>()).Returns(Task.CompletedTask);
        _service = new OrderService(repo, Substitute.For<IEventBus>());
    }

    [Benchmark]
    public async Task CreateOrder()
    {
        var dto = new CreateOrderCommand(Guid.NewGuid(), new List<OrderItemDto>(), "USD");
        await _service.CreateAsync(dto);
    }
}
```

## Test Configuration

```csharp
// Base test class
public abstract class TestBase
{
    protected readonly ITestOutputHelper Output;

    protected TestBase(ITestOutputHelper output) => Output = output;

    protected static AppDbContext CreateDbContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;
        return new AppDbContext(options);
    }
}
```

## Key Points

- Use xUnit with Facts and Theories for unit tests
- TestContainers for real database integration tests
- WebApplicationFactory for full HTTP endpoint testing
- Substitute dependencies with NSubstitute or Moq
- Follow arrange-act-assert pattern consistently
- Test edge cases: null inputs, empty collections, boundary values
- Run unit tests on every PR, integration nightly
- Use collection fixtures for shared container resources
- Benchmark critical paths with BenchmarkDotNet
- Measure code coverage but focus on meaningful assertions
