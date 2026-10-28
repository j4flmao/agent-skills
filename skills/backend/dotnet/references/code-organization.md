# Code Organization in ASP.NET Core (.NET 8/10)

How to structure ASP.NET Core services: solution layout, vertical slices vs layers, organizing Minimal API endpoints, dependency injection registration, configuration binding, and build-wide settings. Examples target .NET 10 (LTS, November 2025) and also work on .NET 8 (LTS) unless noted.

## Solution Layout

```text
Orders.sln
Directory.Build.props          # shared MSBuild settings (nullable, analyzers, warnings as errors)
Directory.Packages.props       # central package version management
global.json                    # pinned SDK version
src/
  Orders.Api/                  # host: Program.cs, endpoints, middleware, composition root
  Orders.Application/          # use cases (optional; omit for small services)
  Orders.Domain/               # entities, value objects, domain rules (no framework references)
  Orders.Infrastructure/       # EF Core, messaging, external clients
tests/
  Orders.UnitTests/
  Orders.IntegrationTests/
```

For small services, a single project organized by feature folders is often clearer than four projects. Split projects when you need enforced dependency direction (Domain must not reference Infrastructure) or independent reuse.

## Shared Build Settings

```xml
<!-- Directory.Build.props -->
<Project>
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
    <AnalysisLevel>latest-recommended</AnalysisLevel>
    <EnforceCodeStyleInBuild>true</EnforceCodeStyleInBuild>
  </PropertyGroup>
</Project>
```

```xml
<!-- Directory.Packages.props -->
<Project>
  <PropertyGroup>
    <ManagePackageVersionsCentrally>true</ManagePackageVersionsCentrally>
  </PropertyGroup>
  <ItemGroup>
    <PackageVersion Include="Microsoft.EntityFrameworkCore.SqlServer" Version="10.0.0" />
    <PackageVersion Include="Serilog.AspNetCore" Version="9.0.0" />
  </ItemGroup>
</Project>
```

Projects then reference packages without versions: `<PackageReference Include="Serilog.AspNetCore" />`. Use the versions current for your target framework.

## Vertical Slices vs Layers

| Approach | Organize by | Good for | Risk |
|----------|-------------|----------|------|
| Layered (Controllers / Services / Repositories) | Technical role | Simple CRUD, teams used to it | Changes touch many folders; anemic services |
| Clean / Onion | Dependency rings | Complex domains, long-lived systems | Ceremony, interface-per-class sprawl |
| Vertical slices | Feature (CreateOrder, GetOrder) | Most APIs; changes stay local | Duplication if shared logic is not extracted |

A pragmatic combination: vertical slices in the API/Application project, with a domain project for shared business rules.

```text
Orders.Api/
  Features/
    Orders/
      CreateOrder.cs        # request, validator, handler, endpoint mapping
      GetOrder.cs
      OrdersEndpoints.cs    # MapGroup registration
    Customers/
  Infrastructure/
    OrdersDbContext.cs
  Program.cs
```

## Organizing Minimal API Endpoints

```csharp
// Features/Orders/OrdersEndpoints.cs
public static class OrdersEndpoints
{
    public static IEndpointRouteBuilder MapOrders(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/orders")
            .WithTags("Orders")
            .RequireAuthorization();

        group.MapGet("/{id:guid}", GetOrder.Handle).WithName("GetOrder");
        group.MapPost("/", CreateOrder.Handle);
        return app;
    }
}

// Features/Orders/GetOrder.cs
public static class GetOrder
{
    public static async Task<Results<Ok<OrderDto>, NotFound>> Handle(
        Guid id, OrdersDbContext db, CancellationToken ct)
    {
        var order = await db.Orders.AsNoTracking()
            .Where(o => o.Id == id)
            .Select(o => new OrderDto(o.Id, o.CustomerId, o.Total))
            .FirstOrDefaultAsync(ct);

        return order is null ? TypedResults.NotFound() : TypedResults.Ok(order);
    }
}

public sealed record OrderDto(Guid Id, Guid CustomerId, decimal Total);
```

`TypedResults` with `Results<...>` gives compile-time checked responses and accurate OpenAPI metadata. Controllers remain fully supported; pick one style per service.

## Composition Root

Keep `Program.cs` short by grouping registrations in extension methods per module:

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddOrdersModule(builder.Configuration)
    .AddProblemDetails()
    .AddOpenApi();                       // built-in OpenAPI document generation (.NET 9+)

var app = builder.Build();

app.UseExceptionHandler();
app.UseAuthentication();
app.UseAuthorization();
app.MapOpenApi();
app.MapOrders();
app.Run();

public partial class Program;            // allows WebApplicationFactory<Program> in tests
```

```csharp
public static class OrdersModule
{
    public static IServiceCollection AddOrdersModule(this IServiceCollection services, IConfiguration config)
    {
        services.AddDbContext<OrdersDbContext>(o =>
            o.UseSqlServer(config.GetConnectionString("Orders")));
        services.AddScoped<IOrderPricing, OrderPricing>();
        services.AddOptions<PricingOptions>()
            .Bind(config.GetSection(PricingOptions.Section))
            .ValidateDataAnnotations()
            .ValidateOnStart();
        return services;
    }
}
```

### Service lifetimes

| Lifetime | Use | Pitfall |
|----------|-----|---------|
| Singleton | Stateless, thread-safe services, caches, `HttpClient` handlers via factory | Capturing a scoped service (captive dependency) |
| Scoped | Per-request: `DbContext`, unit of work | Resolving from root provider outside a scope |
| Transient | Lightweight, stateless helpers | Disposable transients resolved from root are held until shutdown |

Enable scope validation (on by default in Development) to catch captive dependencies.

## Options Pattern

```csharp
public sealed class PricingOptions
{
    public const string Section = "Pricing";
    [Range(0, 1)] public decimal MaxDiscount { get; init; }
    [Required] public string Currency { get; init; } = "EUR";
}
```

Inject `IOptions<T>` (static), `IOptionsSnapshot<T>` (per request, scoped) or `IOptionsMonitor<T>` (change notifications). `ValidateOnStart` fails fast at startup instead of on first use.

## Interfaces and Abstractions

- Introduce an interface when there are multiple implementations or a real test seam (external systems, clocks via `TimeProvider`), not for every class.
- `DbContext` already implements unit of work and repository patterns; wrap it in repositories only when you need to hide EF Core from the domain or share complex queries.
- Use `TimeProvider` (built in since .NET 8) instead of `DateTime.UtcNow` for testable time.

## Naming and Folder Conventions

| Item | Convention |
|------|------------|
| Namespaces | Match folder structure (`Orders.Api.Features.Orders`) |
| Request/response types | `CreateOrderRequest`, `OrderDto` as records |
| Async methods | `Async` suffix in libraries; optional in endpoint handlers |
| Extension registration | `AddXxx` for services, `MapXxx` for endpoints, `UseXxx` for middleware |

## Checklist

- [ ] SDK pinned in `global.json`; shared settings in `Directory.Build.props`
- [ ] Central package management enabled
- [ ] Nullable reference types and analyzers on, warnings as errors
- [ ] Features organized by slice; dependency direction enforced where layers exist
- [ ] `Program.cs` delegates to module extension methods
- [ ] Options validated on start; correct service lifetimes
