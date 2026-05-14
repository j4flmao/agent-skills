# .NET API Design Reference

## Controller-based API vs Minimal API

### Controller-based API

```csharp
// Program.cs
builder.Services.AddControllers();
builder.Services.AddApiVersioning();
// ...
app.MapControllers();

// Controllers/OrdersController.cs
[ApiController]
[Route("api/v{version:apiVersion}/orders")]
[Authorize(Policy = "Order.Read")]
public class OrdersController : ControllerBase
{
    private readonly IMediator _mediator;

    public OrdersController(IMediator mediator) => _mediator = mediator;

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(OrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OrderResponse>> Get(
        Guid id, CancellationToken ct)
    {
        var result = await _mediator.Send(new GetOrderQuery(id), ct);
        return result.Match<ActionResult>(
            value => Ok(value),
            error => NotFound(new ProblemDetails { Title = error.Message })
        );
    }

    [HttpPost]
    [ProducesResponseType(typeof(OrderResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<OrderResponse>> Create(
        CreateOrderRequest request, CancellationToken ct)
    {
        var command = new CreateOrderCommand(request.CustomerId, request.Items);
        var result = await _mediator.Send(command, ct);
        return result.Match<ActionResult>(
            value => CreatedAtAction(nameof(Get), new { id = value.Id }, value),
            error => BadRequest(error.Message)
        );
    }
}
```

**When**: 15+ endpoints, complex authorization, need IActionResult flexibility, OpenAPI rich metadata.

### Minimal API

```csharp
// Program.cs — all in one file or extension methods
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddMediatR(...);
var app = builder.Build();

// Group endpoints
var orders = app.MapGroup("/api/orders")
    .WithTags("Orders")
    .RequireAuthorization("Order.Read");

orders.MapGet("/{id:guid}", async (Guid id, IMediator mediator) =>
{
    var result = await mediator.Send(new GetOrderQuery(id));
    return result.Match(
        value => Results.Ok(value),
        error => Results.NotFound(new { error.Message })
    );
})
.WithName("GetOrder")
.WithOpenApi();

orders.MapPost("/", async (CreateOrderRequest request, IMediator mediator) =>
{
    var result = await mediator.Send(new CreateOrderCommand(request.CustomerId, request.Items));
    return result.Match(
        value => Results.Created($"/api/orders/{value.Id}", value),
        error => Results.BadRequest(new { error.Message })
    );
})
.WithName("CreateOrder")
.WithOpenApi();

app.Run();
```

**When**: <50 endpoints, straightforward auth, microservices, quick prototyping.

## Versioning

### URL Path Versioning (Recommended)

```csharp
// Program.cs
builder.Services.AddApiVersioning(options =>
{
    options.DefaultApiVersion = new ApiVersion(1, 0);
    options.AssumeDefaultVersionWhenUnspecified = true;
    options.ReportApiVersions = true;
    options.ApiVersionReader = new UrlSegmentApiVersionReader();
});

// Controller
[Route("api/v{version:apiVersion}/orders")]
```

### Versioning Strategy

| Version | Change Type | Migration |
|---|---|---|
| v1 → v2 | Breaking change | Old URL deprecated, returned in response header |
| v1.0 → v1.1 | New fields (backward-compatible) | No URL change, new fields optional |
| v1 → v1 | Bug fix | Same URL, no schema change |

## OpenAPI Configuration

```csharp
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "YourApp API",
        Version = "v1",
        Description = "API for managing orders"
    });
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        In = ParameterLocation.Header,
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });
});
```

## Filtering, Sorting, Pagination

### Query Parameter Convention

```
GET /api/orders?status=pending&fromDate=2024-01-01&sort=-createdAt&page=1&pageSize=20
```

```csharp
public record PaginationRequest(
    int Page = 1,
    int PageSize = 20,
    string? Sort = null,
    string? Filter = null);

public class PaginatedList<T>
{
    public IReadOnlyList<T> Items { get; init; }
    public int Page { get; init; }
    public int PageSize { get; init; }
    public int TotalCount { get; init; }
    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
    public bool HasNextPage => Page * PageSize < TotalCount;
    public bool HasPreviousPage => Page > 1;
}
```

### EF Core Implementation

```csharp
public async Task<PaginatedList<Order>> GetOrdersAsync(PaginationRequest request, CancellationToken ct)
{
    var query = _db.Orders.AsQueryable();

    // Filtering
    if (request.Filter is not null)
        query = ApplyFilter(query, request.Filter);

    // Sorting
    query = request.Sort switch
    {
        "-createdAt" => query.OrderByDescending(o => o.CreatedAt),
        "createdAt" => query.OrderBy(o => o.CreatedAt),
        "-total" => query.OrderByDescending(o => o.Total),
        _ => query.OrderBy(o => o.CreatedAt)
    };

    var totalCount = await query.CountAsync(ct);
    var items = await query
        .Skip((request.Page - 1) * request.PageSize)
        .Take(request.PageSize)
        .ToListAsync(ct);

    return new PaginatedList<Order>
    {
        Items = items,
        Page = request.Page,
        PageSize = request.PageSize,
        TotalCount = totalCount
    };
}
```

## Error Response Standard

```csharp
// ProblemDetails format (RFC 7807)
{
    "type": "https://example.com/errors/validation",
    "title": "Validation Error",
    "status": 422,
    "detail": "One or more validation failures occurred.",
    "instance": "/api/orders",
    "errors": {
        "Items": ["At least one item is required"],
        "CustomerId": ["Customer not found"]
    }
}
```

## Rate Limiting (.NET 7+)

```csharp
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddFixedWindowLimiter("Api", opt =>
    {
        opt.PermitLimit = 100;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueLimit = 0;
    });
});
app.UseRateLimiter();
```

## Health Checks

```csharp
builder.Services.AddHealthChecks()
    .AddDbContextCheck<AppDbContext>()
    .AddUrlGroup(new Uri("https://external-service.com"), "External");

app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResponseWriter = async (context, report) =>
    {
        context.Response.ContentType = "application/json";
        var response = new
        {
            status = report.Status.ToString(),
            checks = report.Entries.Select(e => new
            {
                name = e.Key,
                status = e.Value.Status.ToString(),
                duration = e.Value.Duration
            })
        };
        await context.Response.WriteAsJsonAsync(response);
    }
});
```
