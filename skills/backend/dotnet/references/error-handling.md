# Error Handling in ASP.NET Core: ProblemDetails, IExceptionHandler, Result Types

How to handle errors consistently in ASP.NET Core APIs: a global exception handler, RFC 9457 Problem Details responses, validation errors, expected failures as results instead of exceptions, and logging that helps diagnosis without leaking internals. Applies to .NET 8 and later.

## Principles

- **Expected failures** (not found, validation, business rule violations, conflicts) are part of the API contract: return typed results with proper status codes.
- **Unexpected failures** (bugs, unavailable dependencies) are exceptions: let them propagate to one global handler that logs and returns a generic 500.
- Never return stack traces or exception messages to clients in production.
- Every error response has the same shape: Problem Details (`application/problem+json`, RFC 9457, which obsoletes RFC 7807).

## Problem Details Setup

```csharp
builder.Services.AddProblemDetails(options =>
{
    options.CustomizeProblemDetails = ctx =>
    {
        ctx.ProblemDetails.Instance = $"{ctx.HttpContext.Request.Method} {ctx.HttpContext.Request.Path}";
        ctx.ProblemDetails.Extensions["traceId"] = Activity.Current?.Id ?? ctx.HttpContext.TraceIdentifier;
    };
});
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

var app = builder.Build();
app.UseExceptionHandler();      // uses registered IExceptionHandler(s) and ProblemDetails
app.UseStatusCodePages();       // ProblemDetails bodies for empty 4xx/5xx responses
```

`AddProblemDetails` registers `IProblemDetailsService`, used by the exception handler middleware, status code pages, and `TypedResults.Problem`.

## Global Exception Handler (IExceptionHandler, .NET 8+)

```csharp
public sealed class GlobalExceptionHandler(
    IProblemDetailsService problemDetails,
    ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext http, Exception exception, CancellationToken ct)
    {
        var (status, title) = exception switch
        {
            OperationCanceledException when http.RequestAborted.IsCancellationRequested
                => (StatusCodes.Status499ClientClosedRequest, "Client closed request"),
            DbUpdateConcurrencyException
                => (StatusCodes.Status409Conflict, "The resource was modified by another request"),
            _ => (StatusCodes.Status500InternalServerError, "An unexpected error occurred")
        };

        if (status >= 500)
            logger.LogError(exception, "Unhandled exception for {Method} {Path}",
                http.Request.Method, http.Request.Path);
        else
            logger.LogWarning(exception, "Request failed with {Status} for {Method} {Path}",
                status, http.Request.Method, http.Request.Path);

        http.Response.StatusCode = status;
        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = http,
            Exception = exception,
            ProblemDetails = { Status = status, Title = title }
        });
    }
}
```

- Multiple handlers can be registered; they run in registration order until one returns `true`.
- `ProblemDetailsContext.Exception` lets the default writer include exception details only in Development (when the developer exception page is active). Keep production responses generic.
- Status 499 is a non-standard code (nginx convention) used here for logging clarity; the client has gone, so the body is not read.

## Expected Failures as Results

Throwing exceptions for control flow is slower and hides the contract. Return typed results from Minimal APIs:

```csharp
public static async Task<Results<Created<OrderDto>, ValidationProblem, Conflict<ProblemDetails>>> Handle(
    CreateOrderRequest request, IOrderService orders, CancellationToken ct)
{
    var errors = CreateOrderValidator.Validate(request);
    if (errors.Count > 0)
        return TypedResults.ValidationProblem(errors);   // 400 with "errors" dictionary

    var result = await orders.CreateAsync(request, ct);
    return result switch
    {
        { IsSuccess: true } => TypedResults.Created($"/orders/{result.Value!.Id}", result.Value),
        { Error: OrderError.DuplicateReference } => TypedResults.Conflict(new ProblemDetails
        {
            Title = "Duplicate order reference",
            Status = StatusCodes.Status409Conflict,
            Detail = $"An order with reference '{request.Reference}' already exists."
        }),
        _ => throw new InvalidOperationException($"Unhandled order error {result.Error}")
    };
}
```

A minimal result type:

```csharp
public enum OrderError { None, DuplicateReference, CustomerBlocked }

public readonly record struct Result<T>(T? Value, OrderError Error)
{
    public bool IsSuccess => Error == OrderError.None;
    public static Result<T> Ok(T value) => new(value, OrderError.None);
    public static Result<T> Fail(OrderError error) => new(default, error);
}
```

Libraries such as `ErrorOr`, `FluentResults` or `OneOf` provide richer versions; keep one approach per codebase.

## Validation

| Option | Notes |
|--------|-------|
| Built-in Minimal API validation (.NET 10) | `builder.Services.AddValidation()`; DataAnnotations on parameters and records; returns 400 ProblemDetails automatically |
| Controllers with `[ApiController]` | Automatic 400 `ValidationProblemDetails` from model state |
| FluentValidation | Rich rules; call validators explicitly or via an endpoint filter |

```csharp
public sealed record CreateOrderRequest(
    [property: Required, StringLength(64)] string Reference,
    [property: Range(1, 1000)] int Quantity);
```

## Mapping Domain Errors to HTTP

| Situation | Status | Notes |
|-----------|--------|-------|
| Malformed input / validation | 400 | `ValidationProblem` with field errors |
| Unauthenticated | 401 | Produced by authentication middleware |
| Authenticated but not allowed | 403 | Do not reveal resource existence if sensitive (consider 404) |
| Resource missing | 404 | |
| Version conflict, duplicate | 409 | Include what conflicted |
| Precondition failed (ETag mismatch) | 412 | With `If-Match` |
| Business rule violation on valid input | 422 | Use consistently or stick to 400/409 |
| Rate limited | 429 | `Retry-After` header; built-in rate limiter `RejectionStatusCode = 429` |
| Downstream unavailable | 503 | `Retry-After` if known |

## Logging Errors

- Log once, at the boundary (global handler), not at every layer that rethrows.
- Use message templates with named properties, not string interpolation: `logger.LogError(ex, "Failed to charge order {OrderId}", orderId)`.
- Include correlation: trace ID in logs and in the ProblemDetails response so support can find the log entry.
- High-volume paths: use the `[LoggerMessage]` source generator to avoid allocations.
- Never log secrets, tokens or full request bodies with personal data.

```csharp
public static partial class Log
{
    [LoggerMessage(Level = LogLevel.Warning, Message = "Payment declined for order {OrderId} with code {Code}")]
    public static partial void PaymentDeclined(ILogger logger, Guid orderId, string code);
}
```

## Exceptions in Background Work

- `BackgroundService.ExecuteAsync` exceptions stop the service; since .NET 6 the default `BackgroundServiceExceptionBehavior.StopHost` also stops the host. Catch, log and decide per iteration whether to continue.
- Always observe tasks (`await`); fire-and-forget tasks swallow exceptions.
- Pass and honor `CancellationToken` so shutdown is clean.

## Resilience vs Error Handling

Transient errors from HTTP dependencies are handled by resilience pipelines (`Microsoft.Extensions.Http.Resilience` with `AddStandardResilienceHandler()`, built on Polly v8: retry with jitter, circuit breaker, timeouts) before they become exceptions in your handlers. Do not add another retry loop in business code on top.

## Checklist

- [ ] `AddProblemDetails` + `UseExceptionHandler` + one `IExceptionHandler`
- [ ] Expected failures returned as typed results, not exceptions
- [ ] Validation errors return 400 ValidationProblem with field details
- [ ] No exception details or stack traces in production responses
- [ ] Trace ID in responses and logs; structured log templates
- [ ] Background services catch and log per iteration
- [ ] Transient dependency failures handled by resilience handlers, once
