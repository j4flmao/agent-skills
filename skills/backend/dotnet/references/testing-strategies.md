# Testing Strategies for ASP.NET Core Services

A practical test strategy for .NET APIs: fast unit tests for domain logic, integration tests through the real HTTP pipeline with `WebApplicationFactory`, real databases with Testcontainers, contract and architecture tests, and test data management. Examples use xUnit (v3 or v2), but NUnit and MSTest work the same way.

## Test Pyramid for APIs

| Level | Scope | Speed | Share |
|-------|-------|-------|-------|
| Unit | Domain logic, validators, mappers, pure functions | Milliseconds | Most tests |
| Integration | HTTP endpoint through middleware, DI, EF Core, real database | Seconds | Key flows per endpoint |
| Contract | API shape vs consumers (OpenAPI diff, Pact) | Seconds | Public/shared APIs |
| End-to-end | Deployed system | Minutes | Few smoke tests |

ASP.NET Core's in-memory test server makes integration tests cheap enough to cover each endpoint's main and error paths.

## Unit Tests

```csharp
public class OrderPricingTests
{
    [Fact]
    public void Applies_discount_up_to_maximum()
    {
        // Arrange
        var options = Options.Create(new PricingOptions { MaxDiscount = 0.2m, Currency = "EUR" });
        var pricing = new OrderPricing(options);

        // Act
        var total = pricing.Total(subtotal: 100m, requestedDiscount: 0.5m);

        // Assert
        Assert.Equal(80m, total);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(0)]
    public void Rejects_non_positive_subtotal(decimal subtotal)
    {
        var pricing = new OrderPricing(Options.Create(new PricingOptions()));

        var act = () => pricing.Total(subtotal, 0m);

        Assert.Throws<ArgumentOutOfRangeException>(act);
    }
}
```

- Test behavior through public methods; avoid asserting on private implementation details.
- Use `FakeTimeProvider` (`Microsoft.Extensions.Time.Testing`) for time-dependent logic.
- Mock only boundaries you own the abstraction for (NSubstitute, Moq, FakeItEasy). Do not mock `DbContext`; use a real database in integration tests instead.
- `FakeLogger<T>` (`Microsoft.Extensions.Diagnostics.Testing`) captures logs for assertions.

## Integration Tests with WebApplicationFactory

```csharp
public sealed class ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _db = new PostgreSqlBuilder()
        .WithImage("postgres:17")
        .Build();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<DbContextOptions<OrdersDbContext>>();
            services.AddDbContext<OrdersDbContext>(o => o.UseNpgsql(_db.GetConnectionString()));

            services.AddAuthentication(TestAuthHandler.Scheme)
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.Scheme, _ => { });
        });
    }

    public async ValueTask InitializeAsync()
    {
        await _db.StartAsync();
        using var scope = Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<OrdersDbContext>().Database.MigrateAsync();
    }

    public override async ValueTask DisposeAsync()
    {
        await _db.DisposeAsync();
        await base.DisposeAsync();
    }
}
```

The `IAsyncLifetime` signatures shown are xUnit v3 (`ValueTask`); xUnit v2 uses `Task InitializeAsync()` and `Task DisposeAsync()`. `Program` must be visible to the test project (`public partial class Program;` in the API project).

```csharp
public sealed class OrdersEndpointTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Create_then_get_returns_order()
    {
        // Arrange
        var client = factory.CreateClient();
        var request = new CreateOrderRequest("REF-1001", Quantity: 2);

        // Act
        var create = await client.PostAsJsonAsync("/orders", request);
        var location = create.Headers.Location;
        var fetched = await client.GetFromJsonAsync<OrderDto>(location);

        // Assert
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        Assert.NotNull(fetched);
        Assert.Equal(2, fetched!.Quantity);
    }

    [Fact]
    public async Task Create_with_invalid_quantity_returns_problem_details()
    {
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/orders", new CreateOrderRequest("REF-1002", 0));
        var problem = await response.Content.ReadFromJsonAsync<HttpValidationProblemDetails>();

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("Quantity", problem!.Errors.Keys);
    }
}
```

## Test Authentication Handler

```csharp
public sealed class TestAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string Scheme = "Test";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var claims = new[] { new Claim("sub", "user-1"), new Claim("scope", "orders.read orders.write") };
        var identity = new ClaimsIdentity(claims, Scheme);
        return Task.FromResult(AuthenticateResult.Success(
            new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme)));
    }
}
```

Also test the negative path: requests without credentials must get 401, and users without the scope 403. Make the default scheme in tests switchable so both paths are covered.

## Database Strategy in Tests

| Option | Fidelity | Speed | Notes |
|--------|----------|-------|-------|
| Testcontainers with the production engine | High | Container start once per fixture | Recommended |
| SQLite in-memory | Medium | Fast | SQL dialect and behavior differ from SQL Server/PostgreSQL |
| EF Core InMemory provider | Low | Fastest | Not a relational database; Microsoft discourages it for testing |

Isolation between tests: wrap each test in a transaction rolled back at the end, or reset data with Respawn (`Respawner.ResetAsync`) between tests. Avoid test order dependencies.

## Mocking External HTTP Dependencies

- Replace typed `HttpClient` handlers with a stub `HttpMessageHandler`, or run WireMock.Net as a fake server and point configuration at it.
- Test resilience behavior (retries, timeouts) against the fake: simulate 503 then 200, and slow responses.

## Contract and API Shape Tests

- Generate the OpenAPI document in CI (`Microsoft.Extensions.ApiDescription.Server` build-time generation, or fetch `/openapi/v1.json` from the test server) and diff it against the committed version to catch breaking changes.
- Consumer-driven contracts with PactNet for service-to-service APIs.
- Snapshot testing (Verify) for complex responses; review snapshot diffs in PRs.

## Architecture Tests

```csharp
[Fact]
public void Domain_does_not_depend_on_infrastructure()
{
    var result = Types.InAssembly(typeof(Order).Assembly)
        .ShouldNot().HaveDependencyOn("Orders.Infrastructure")
        .GetResult();

    Assert.True(result.IsSuccessful);
}
```

NetArchTest or ArchUnitNET enforce layering rules decided in ADRs.

## Running Tests in CI

```bash
dotnet test -c Release --logger "trx;LogFileName=results.trx" --collect:"XPlat Code Coverage"
```

- Fail the build on test failures; publish TRX and Cobertura coverage reports.
- Track coverage trends but do not chase a percentage; focus on critical paths and error handling.
- Run mutation testing (Stryker.NET) periodically on core domain logic to assess test quality.
- Flaky tests are bugs: quarantine and fix rather than retry silently.

## Checklist

- [ ] Unit tests for domain rules, validators and edge cases (null, empty, out-of-range)
- [ ] Integration tests per endpoint for success, validation, auth and not-found paths
- [ ] Real database engine via Testcontainers; isolated test data
- [ ] External HTTP dependencies faked at the handler or server level
- [ ] OpenAPI diff or contract tests for public APIs
- [ ] Architecture rules enforced by tests
- [ ] Tests run in CI with reports; no tolerated flakiness
