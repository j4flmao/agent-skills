# .NET Result Pattern

## Core Result Type

Replace exceptions for expected errors with a Result type:

```csharp
public readonly struct Result<T>
{
    private readonly T? _value;
    private readonly Error? _error;

    private Result(T value) { _value = value; _error = null; IsSuccess = true; }
    private Result(Error error) { _value = default; _error = error; IsSuccess = false; }

    public bool IsSuccess { get; }
    public bool IsFailure => !IsSuccess;

    public T Value => IsSuccess ? _value! : throw new InvalidOperationException("Cannot access value of failed result");
    public Error Error => IsFailure ? _error! : throw new InvalidOperationException("Cannot access error of success result");

    public static Result<T> Success(T value) => new(value);
    public static Result<T> Failure(Error error) => new(error);

    public TOut Match<TOut>(Func<T, TOut> onSuccess, Func<Error, TOut> onFailure)
        => IsSuccess ? onSuccess(_value!) : onFailure(_error!);

    public async Task<TOut> MatchAsync<TOut>(Func<T, Task<TOut>> onSuccess, Func<Error, Task<TOut>> onFailure)
        => IsSuccess ? await onSuccess(_value!) : await onFailure(_error!);
}

public readonly struct Error
{
    public Error(string code, string message, ErrorType type = ErrorType.Validation)
    {
        Code = code;
        Message = message;
        Type = type;
    }

    public string Code { get; }
    public string Message { get; }
    public ErrorType Type { get; }

    public static Error NotFound(string message) => new("NOT_FOUND", message, ErrorType.NotFound);
    public static Error Validation(string message) => new("VALIDATION", message, ErrorType.Validation);
    public static Error Conflict(string message) => new("CONFLICT", message, ErrorType.Conflict);
    public static Error Unauthorized(string message = "Unauthorized") => new("UNAUTHORIZED", message, ErrorType.Unauthorized);
}

public enum ErrorType
{
    Validation,
    NotFound,
    Conflict,
    Unauthorized,
    Forbidden,
    Internal,
}
```

## Service Layer with Result

```csharp
public class OrderService
{
    private readonly IOrderRepository _repo;
    private readonly IInventoryClient _inventory;

    public OrderService(IOrderRepository repo, IInventoryClient inventory)
    {
        _repo = repo;
        _inventory = inventory;
    }

    public async Task<Result<OrderResponse>> CreateAsync(CreateOrderCommand command)
    {
        var validation = ValidateCreate(command);
        if (validation.IsFailure) return Result<OrderResponse>.Failure(validation.Error);

        var stockResult = await _inventory.CheckAvailability(command.Items);
        if (stockResult.IsFailure) return stockResult.MapFailure<OrderResponse>();

        var order = Order.Create(command.CustomerId, command.Items);
        await _repo.SaveAsync(order);
        return Result<OrderResponse>.Success(new OrderResponse(order.Id, order.Total));
    }

    public async Task<Result<OrderResponse>> GetByIdAsync(Guid id)
    {
        var order = await _repo.GetByIdAsync(id);
        if (order is null) return Result<OrderResponse>.Failure(Error.NotFound($"Order {id} not found"));
        return Result<OrderResponse>.Success(new OrderResponse(order.Id, order.Total));
    }

    private Result<Unit> ValidateCreate(CreateOrderCommand command)
    {
        if (command.Items.Count == 0)
            return Result<Unit>.Failure(Error.Validation("At least one item required"));
        if (command.Items.Any(i => i.Quantity <= 0))
            return Result<Unit>.Failure(Error.Validation("Quantity must be positive"));
        return Result<Unit>.Success(Unit.Value);
    }
}
```

## Result Extensions

```csharp
public static class ResultExtensions
{
    public static Result<TNew> Map<T, TNew>(this Result<T> result, Func<T, TNew> mapper)
        => result.IsSuccess
            ? Result<TNew>.Success(mapper(result.Value))
            : Result<TNew>.Failure(result.Error);

    public static Result<TNew> MapFailure<T, TNew>(this Result<T> result)
        => Result<TNew>.Failure(result.Error);

    public static async Task<Result<TNew>> Bind<T, TNew>(this Result<T> result, Func<T, Task<Result<TNew>>> binder)
        => result.IsSuccess ? await binder(result.Value) : Result<TNew>.Failure(result.Error);
}
```

## Controller Integration

```csharp
[ApiController]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    private readonly OrderService _service;

    public OrdersController(OrderService service) => _service = service;

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateOrderCommand command)
    {
        var result = await _service.CreateAsync(command);
        return result.Match<IActionResult>(
            onSuccess: order => CreatedAtAction(nameof(GetById), new { id = order.Id }, order),
            onFailure: error => error.Type switch
            {
                ErrorType.Validation => BadRequest(new ProblemDetails
                {
                    Title = "Validation Error",
                    Detail = error.Message,
                    Status = 400,
                }),
                ErrorType.NotFound => NotFound(new ProblemDetails
                {
                    Title = "Not Found",
                    Detail = error.Message,
                    Status = 404,
                }),
                ErrorType.Conflict => Conflict(new ProblemDetails
                {
                    Title = "Conflict",
                    Detail = error.Message,
                    Status = 409,
                }),
                _ => StatusCode(500, new ProblemDetails
                {
                    Title = "Internal Error",
                    Detail = "An unexpected error occurred",
                    Status = 500,
                }),
            }
        );
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _service.GetByIdAsync(id);
        return result.Match<IActionResult>(
            onSuccess: Ok,
            onFailure: error => NotFound(new ProblemDetails { Title = "Not Found", Detail = error.Message, Status = 404 })
        );
    }
}
```

## Integrating with Pipeline Behaviors

```csharp
public class ResultMappingBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TResponse : IResult
{
    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken ct)
    {
        try
        {
            return await next();
        }
        catch (NotFoundException ex)
        {
            return (TResponse)typeof(Result<>)
                .MakeGenericType(typeof(TResponse).GetGenericArguments()[0])
                .GetMethod("Failure")!
                .Invoke(null, new object[] { Error.NotFound(ex.Message) })!;
        }
        catch (ValidationException ex)
        {
            return (TResponse)typeof(Result<>)
                .MakeGenericType(typeof(TResponse).GetGenericArguments()[0])
                .GetMethod("Failure")!
                .Invoke(null, new object[] { Error.Validation(ex.Message) })!;
        }
    }
}
```

## Key Points

- Use Result for expected errors, exceptions for unexpected bugs
- Result has Success and Failure variants with typed error
- Map errors consistently through service layer to HTTP responses
- Combine Result with FluentValidation for validation errors
- Use Match pattern to handle both paths explicitly
- Avoid wrapping trivial results — direct return is fine
- Extend with Bind/Map for composable error handling
- Integrate with MediatR pipeline behaviors for cross-cutting
- Never throw in domain logic except for truly exceptional cases
- Test both success and failure paths for every service method
