---
name: dotnet-architecture
description: >
  Use this skill when designing or reviewing C# .NET backend architecture — project structure, API design, middleware, DI, EF Core, configuration patterns. This skill enforces: Clean Architecture or Feature Slices, proper middleware ordering, DI lifetime rules, and standardized error handling. Do NOT use for: frontend architecture, database schema design, or DevOps pipeline configuration.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, dotnet, csharp, phase-4]
---

# C# .NET Architecture

## Purpose
Define and enforce .NET backend architecture, project structure, and configuration patterns.

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

## Workflow

### Step 1: Select Project Structure
Choose between Clean Architecture (vertical slicing) or Feature Slices (folding) based on project scale.

**Clean Architecture (Vertical)**

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

**Feature Slices (Folding)**

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

### Step 2: Choose API Design Pattern

**Controller-based API**
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

**Minimal API**
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

### Step 3: Configure Middleware Pipeline
Order matters — incorrect ordering causes silent failures.

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

### Step 4: Register Dependencies with Correct Lifetimes

| Component Type | Lifetime | Rule |
|---|---|---|
| **DbContext** | Scoped | Never singleton — DbContext is not thread-safe |
| **Repository / Service** | Scoped | Default for stateless services |
| **HttpClient** | Typed client | Use `AddHttpClient<T>` — never `new HttpClient()` |
| **Singleton Services** | Singleton | Must be thread-safe, no scoped dependencies |
| **Transient Services** | Transient | Lightweight, no shared state |
| **MediatR** | Transient handlers | Each handler is transient |

### Step 5: Set Up Entity Framework Core

```csharp
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default"),
        x => x.MigrationsHistoryTable("__EFMigrationsHistory", "public")));
```

**No-Repository Pattern (Recommended)**: EF Core DbContext IS the repository + Unit of Work. Wrapping it in a custom repository layer is unnecessary unless:
- Testing requires mockable data access (use InMemory/TestContainers instead)
- You need to restrict queries (specification pattern)
- You are caching query results

**Migration Strategy**:
```bash
dotnet ef migrations add InitialCreate --project src/YourApp.Infrastructure
dotnet ef database update --project src/YourApp.Api
```

### Step 6: Configure Options Pattern

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

### Step 7: Implement Error Handling

**ProblemDetails (RFC 7807)**
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

**FluentValidation + MediatR Pipeline** — Automatically return 422 with validation errors:
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

## Rules
- Use latest LTS .NET version unless specified otherwise.
- DbContext is always scoped — never singleton.
- No `new HttpClient()` — always use `IHttpClientFactory` or typed clients.
- Error responses use ProblemDetails (RFC 7807) format.
- FluentValidation with MediatR pipeline behavior for validation.
- Configuration uses Options pattern with typed settings classes.
- Middleware order follows the documented pipeline sequence.
- Controllers only contain routing/HTTP concerns — all logic in handlers/services.

## References
  - references/api-design.md — .NET API Design Reference
  - references/dotnet-clean-architecture.md — .NET Clean Architecture
  - references/dotnet-cqrs-event-sourcing.md — .NET CQRS and Event Sourcing
  - references/dotnet-microservices.md — .NET Microservices
  - references/dotnet-testing-architecture.md — .NET Testing Architecture
  - references/project-structure.md — .NET Project Structure Reference
## Handoff
Hand off to `backend/dotnet/patterns/SKILL.md` for CQRS/MediatR, Result pattern, Pipeline behaviors. Hand off to `backend/universal/clean-architecture/SKILL.md` for architectural restructuring.
