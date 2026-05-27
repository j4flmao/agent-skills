# .NET Pipeline Behaviors

## MediatR Pipeline Behaviors

Cross-cutting concerns applied to all commands and queries:

```csharp
public class ValidationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
    where TResponse : IResult
{
    private readonly IEnumerable<IValidator<TRequest>> _validators;

    public ValidationBehavior(IEnumerable<IValidator<TRequest>> validators)
        => _validators = validators;

    public async Task<TResponse> Handle(
        TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken ct)
    {
        if (!_validators.Any())
            return await next();

        var context = new ValidationContext<TRequest>(request);
        var failures = (await Task.WhenAll(
            _validators.Select(v => v.ValidateAsync(context, ct))))
            .SelectMany(r => r.Errors)
            .Where(f => f is not null)
            .ToList();

        if (failures.Count != 0)
            throw new ValidationException(failures);

        return await next();
    }
}
```

## Logging Behavior

```csharp
public class LoggingBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    private readonly ILogger<LoggingBehavior<TRequest, TResponse>> _logger;

    public LoggingBehavior(ILogger<LoggingBehavior<TRequest, TResponse>> logger)
        => _logger = logger;

    public async Task<TResponse> Handle(
        TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken ct)
    {
        var requestName = typeof(TRequest).Name;
        var requestId = Guid.NewGuid();

        using (_logger.BeginScope(new { RequestId = requestId, Request = requestName }))
        {
            _logger.LogInformation("Handling {RequestName} {RequestId}", requestName, requestId);
            var stopwatch = Stopwatch.StartNew();

            try
            {
                var response = await next();
                stopwatch.Stop();
                _logger.LogInformation(
                    "Handled {RequestName} {RequestId} in {Elapsed}ms",
                    requestName, requestId, stopwatch.ElapsedMilliseconds);
                return response;
            }
            catch (Exception ex)
            {
                stopwatch.Stop();
                _logger.LogError(ex,
                    "Failed {RequestName} {RequestId} after {Elapsed}ms",
                    requestName, requestId, stopwatch.ElapsedMilliseconds);
                throw;
            }
        }
    }
}
```

## Performance Monitoring Behavior

```csharp
public class PerformanceBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    private readonly ILogger<PerformanceBehavior<TRequest, TResponse>> _logger;
    private const int SlowThresholdMs = 500;

    public PerformanceBehavior(ILogger<PerformanceBehavior<TRequest, TResponse>> logger)
        => _logger = logger;

    public async Task<TResponse> Handle(
        TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken ct)
    {
        var start = Stopwatch.GetTimestamp();
        var response = await next();
        var elapsed = Stopwatch.GetElapsedTime(start);

        if (elapsed.TotalMilliseconds > SlowThresholdMs)
        {
            _logger.LogWarning(
                "Slow request: {RequestName} took {Elapsed}ms (threshold: {Threshold}ms)",
                typeof(TRequest).Name, elapsed.TotalMilliseconds, SlowThresholdMs);
        }

        return response;
    }
}
```

## Caching Behavior

```csharp
public class CachingBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : ICacheableRequest<TResponse>
{
    private readonly IMemoryCache _cache;
    private readonly ILogger<CachingBehavior<TRequest, TResponse>> _logger;

    public CachingBehavior(IMemoryCache cache, ILogger<CachingBehavior<TRequest, TResponse>> logger)
    {
        _cache = cache;
        _logger = logger;
    }

    public async Task<TResponse> Handle(
        TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken ct)
    {
        var cacheKey = $"{typeof(TRequest).Name}_{request.CacheKey}";

        if (_cache.TryGetValue(cacheKey, out TResponse? cached))
        {
            _logger.LogDebug("Cache hit for {CacheKey}", cacheKey);
            return cached!;
        }

        _logger.LogDebug("Cache miss for {CacheKey}", cacheKey);
        var response = await next();

        _cache.Set(cacheKey, response, TimeSpan.FromSeconds(request.CacheDurationSeconds));
        return response;
    }
}

public interface ICacheableRequest<TResponse>
{
    string CacheKey { get; }
    int CacheDurationSeconds { get; }
}
```

## Authorization Behavior

```csharp
public class AuthorizationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IAuthorizedRequest
{
    private readonly ICurrentUserService _currentUser;
    private readonly IAuthorizationService _auth;

    public AuthorizationBehavior(ICurrentUserService currentUser, IAuthorizationService auth)
    {
        _currentUser = currentUser;
        _auth = auth;
    }

    public async Task<TResponse> Handle(
        TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken ct)
    {
        var user = _currentUser.User;
        if (user is null)
            throw new UnauthorizedAccessException("User not authenticated");

        var authorized = await _auth.AuthorizeAsync(user, request, request.PolicyName);
        if (!authorized.Succeeded)
            throw new ForbiddenAccessException();

        return await next();
    }
}

public interface IAuthorizedRequest
{
    string PolicyName { get; }
}
```

## Transaction Behavior

```csharp
public class TransactionBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
    where TResponse : IResult
{
    private readonly AppDbContext _db;
    private readonly ILogger<TransactionBehavior<TRequest, TResponse>> _logger;

    public TransactionBehavior(AppDbContext db, ILogger<TransactionBehavior<TRequest, TResponse>> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<TResponse> Handle(
        TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken ct)
    {
        if (_db.Database.CurrentTransaction is not null)
            return await next();

        var strategy = _db.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _db.Database.BeginTransactionAsync(ct);
            try
            {
                var response = await next();
                await transaction.CommitAsync(ct);
                return response;
            }
            catch
            {
                await transaction.RollbackAsync(ct);
                throw;
            }
        });
    }
}
```

## Behavior Registration Order

```csharp
builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssembly(typeof(Program).Assembly);
    cfg.AddOpenBehavior(typeof(AuthorizationBehavior<,>));   // 1st: auth
    cfg.AddOpenBehavior(typeof(ValidationBehavior<,>));      // 2nd: validate
    cfg.AddOpenBehavior(typeof(CachingBehavior<,>));         // 3rd: cache
    cfg.AddOpenBehavior(typeof(TransactionBehavior<,>));     // 4th: transaction
    cfg.AddOpenBehavior(typeof(LoggingBehavior<,>));         // 5th: log
    cfg.AddOpenBehavior(typeof(PerformanceBehavior<,>));     // 6th: monitor
});
```

## Key Points

- Pipeline behaviors execute in registration order
- Validation first to fail fast on invalid input
- Authorization before business logic
- Transaction wraps the handler for atomicity
- Logging and performance monitoring wrap everything
- Each behavior handles one cross-cutting concern
- Behaviors can short-circuit: caching returns early
- Test each behavior independently with mocked handlers
- Generic constraints ensure behaviors apply correctly
- Use scoped services inside behaviors via IServiceProvider
