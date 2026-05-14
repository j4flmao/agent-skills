---
name: dotnet-architecture
description: C# .NET backend architecture — project structure, API design, middleware, DI, EF Core, configuration patterns.
---

# C# .NET Architecture

## Agent Protocol

### Trigger
User request includes: `.net`, `dotnet`, `c#`, `asp.net`, `web api`, `minimal api`, `blazor`, `entity framework`, `ef core`, `middleware`, `startup`.

### Input Context
- .NET version (6, 7, 8, 9 — use latest LTS unless specified)
- Project type (Web API, Minimal API, gRPC, Blazor Server, Blazor WASM)
- Existing project structure if refactoring
- ORM preference (EF Core, Dapper, raw ADO.NET — default EF Core)
- Authentication/Authorization requirements

### Output Artifact
A markdown document containing:
- Project folder structure following Clean Architecture or Feature Slices
- Program.cs / Startup configuration with middleware ordering
- Dependency injection registration rules (lifetime per component type)
- API pattern selection (Minimal vs Controller) with routing structure
- EF Core setup (DbContext, migrations, repository or no-repository)
- Configuration (Options pattern, IOptionsSnapshot vs IOptionsMonitor)
- Error handling strategy (ProblemDetails, ExceptionFilter, middleware)
- Logging setup (Serilog or OpenTelemetry)

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick. If scaffolding is complete, output `Scaffolding complete. Run dotnet restore && dotnet build to verify.` and stop.

### Completion Criteria
- Project structure matches specified template
- Every layer has clear responsibility
- DI registration rules documented with lifetime guidance
- API patterns selected with rationale
- EF Core setup with migration strategy
- Error handling and logging configured

### Max Response Length
4096 tokens

## Project Structure Templates

### Clean Architecture (Vertical)

```
src/
  YourApp.Domain/          # Entities, ValueObjects, Aggregates, DomainEvents, Interfaces
  YourApp.Application/     # UseCases, CQRS Commands/Queries, DTOs, Mapping, Validation
  YourApp.Infrastructure/  # EF Core, Repositories (if any), External Services, FileSystem
  YourApp.Api/             # Controllers / Minimal API endpoints, Middleware, Filters
tests/
  YourApp.UnitTests/
  YourApp.IntegrationTests/
  YourApp.ArchTests/
```

### Feature Slices (Folding)

```
src/
  YourApp.Api/
    Features/
      Orders/
        CreateOrder/
          CreateOrderCommand.cs
          CreateOrderHandler.cs
          CreateOrderValidator.cs
          CreateOrderEndpoint.cs
          CreateOrderResponse.cs
      Products/
        GetProduct/
          ... (same pattern)
    Common/
      Exceptions/
      Behaviors/
      Middleware/
```

**Selection rule**: Clean Architecture for large projects (>50 endpoints) or multiple presentation layers. Feature Slices for medium projects where team ownership by feature is needed. Simple folder-per-controller for small APIs (<5 endpoints).

## API Design Patterns

### Controller-based API

```csharp
[ApiController]
[Route("api/v{version:apiVersion}/[controller]")]
public class OrdersController : ControllerBase
{
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(OrderResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct) { }
}
```

**When**: Complex APIs with versioning, authorization policies per endpoint, multiple response types, OpenAPI rich metadata.

### Minimal API

```csharp
var app = builder.Build();
app.MapGet("/api/orders/{id:guid}", async (Guid id, IMediator mediator, CancellationToken ct) =>
{
    var query = new GetOrderQuery(id);
    var result = await mediator.Send(query, ct);
    return result.Match(Results.Ok, Results.NotFound);
});
```

**When**: Small to medium APIs, microservices, simple CRUD, DDD lite. Avoid when endpoint count >50 or complex authorization.

## Middleware Pipeline (Order Matters)

```csharp
app.UseExceptionHandler();       // 1. Global error handling
app.UseHsts();                   // 2. Security headers (dev: UseSwagger before)
app.UseHttpsRedirection();       // 3. HTTPS redirect
app.UseSerilogRequestLogging();  // 4. Request logging
app.UseAuthentication();         // 5. Auth
app.UseAuthorization();          // 6. Authz
app.UseRateLimiter();            // 7. Rate limiting
app.MapControllers();            // 8. Endpoints
```

## Dependency Injection Rules

| Component Type | Lifetime | Rule |
|---|---|---|
| **DbContext** | Scoped | Never singleton — DbContext is not thread-safe |
| **Repository / Service** | Scoped | Default for stateless services |
| **HttpClient** | Typed client | Use `AddHttpClient<T>` — never `new HttpClient()` |
| **Singleton Services** | Singleton | Must be thread-safe, no scoped dependencies |
| **Transient Services** | Transient | Lightweight, no shared state |
| **MediatR** | Transient handlers | Each handler is transient |

## Entity Framework Core

### Configuration

```csharp
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default"),
        x => x.MigrationsHistoryTable("__EFMigrationsHistory", "public")));
```

### No-Repository Pattern (Recommended)

EF Core DbContext IS the repository + Unit of Work. Wrapping it in a custom repository layer is unnecessary unless:
- Testing requires mockable data access (use InMemory/TestContainers instead)
- You need to restrict queries (specification pattern)
- You are caching query results

### Migration Strategy

```bash
dotnet ef migrations add InitialCreate --project src/YourApp.Infrastructure
dotnet ef database update --project src/YourApp.Api
```

## Configuration

### Options Pattern

```csharp
public class JwtOptions
{
    public const string Section = "Jwt";
    public string Secret { get; set; } = string.Empty;
    public int ExpiryMinutes { get; set; } = 60;
}
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.Section));
```

| Interface | Behavior | When |
|---|---|---|
| **IOptions<T>** | Singleton, reads at first resolution | Static config |
| **IOptionsSnapshot<T>** | Scoped, reads per request | Config that changes at runtime |
| **IOptionsMonitor<T>** | Singleton, but updated on config change | Hot-reload config |

## Error Handling

### ProblemDetails (RFC 7807)

```csharp
app.UseExceptionHandler(exceptionHandlerApp =>
    exceptionHandlerApp.Run(async context =>
    {
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/problem+json";
        var problem = new ProblemDetails
        {
            Title = "An error occurred",
            Status = StatusCodes.Status500InternalServerError,
            Instance = context.Request.Path
        };
        await context.Response.WriteAsJsonAsync(problem, JsonContext.Default.ProblemDetails);
    }));
```

### FluentValidation + MediatR Pipeline

Automatically return 422 with validation errors:
```csharp
public class ValidationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken ct)
    {
        var validationResult = await _validator.ValidateAsync(request, ct);
        if (!validationResult.IsValid)
            throw new ValidationException(validationResult.Errors);
        return await next();
    }
}
```

## References

### Reference Files
- `references/project-structure.md` — Detailed project templates with file-by-file guidance
- `references/api-design.md` — API design patterns, versioning, OpenAPI configuration

### Related Skills
- `backend/dotnet/patterns/SKILL.md` — .NET-specific patterns (MediatR CQRS, Result pattern)
- `backend/universal/clean-architecture/SKILL.md` — Clean Architecture principles
- `backend/universal/oop-principles/SKILL.md` — SOLID and OOP foundation
- `backend/universal/testing/SKILL.md` — Testing strategies for .NET

## Handoff

Hand off to `backend/dotnet/patterns/SKILL.md` for CQRS/MediatR, Result pattern, Pipeline behaviors. Hand off to `backend/universal/clean-architecture/SKILL.md` for architectural restructuring.
