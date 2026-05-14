# Error Handling Patterns Reference

## Exception Class Hierarchy

### Language-Agnostic

```
Exception (base)
├── SystemException
│   ├── NotFoundException      (404)
│   ├── UnauthorizedException  (401)
│   ├── ForbiddenException     (403)
│   ├── ConflictException      (409)
│   ├── RateLimitException     (429)
│   └── InternalException      (500)
├── ValidationException        (422)
│   ├── FieldValidationError
│   └── BusinessRuleException  (400 / 422)
├── TimeoutException           (504)
└── ExternalServiceException   (502 / 503)
```

## Exception-to-Response Middleware

### C# .NET

```csharp
public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (NotFoundException ex)
        {
            _logger.LogWarning(ex, "Resource not found: {Path}", context.Request.Path);
            await WriteProblemDetails(context, StatusCodes.Status404NotFound, "NOT_FOUND", ex.Message);
        }
        catch (ValidationException ex)
        {
            _logger.LogWarning(ex, "Validation failed: {Path}", context.Request.Path);
            await WriteProblemDetails(context, StatusCodes.Status422UnprocessableEntity, "VALIDATION_ERROR",
                "One or more validation errors occurred.", ex.Errors);
        }
        catch (ConflictException ex)
        {
            _logger.LogWarning(ex, "Conflict: {Path}", context.Request.Path);
            await WriteProblemDetails(context, StatusCodes.Status409Conflict, "CONFLICT", ex.Message);
        }
        catch (UnauthorizedAccessException)
        {
            await WriteProblemDetails(context, StatusCodes.Status401Unauthorized, "UNAUTHORIZED", "Authentication required.");
        }
        catch (ForbiddenException ex)
        {
            await WriteProblemDetails(context, StatusCodes.Status403Forbidden, "FORBIDDEN", ex.Message);
        }
        catch (RateLimitException ex)
        {
            context.Response.Headers.RetryAfter = ex.RetryAfter.Seconds.ToString();
            await WriteProblemDetails(context, StatusCodes.Status429TooManyRequests, "RATE_LIMITED",
                $"Rate limit exceeded. Retry after {ex.RetryAfter.Seconds}s.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception: {Path}", context.Request.Path);
            await WriteProblemDetails(context, StatusCodes.Status500InternalServerError, "INTERNAL_ERROR",
                "An unexpected error occurred.");
        }
    }

    private static async Task WriteProblemDetails(HttpContext context, int statusCode, string code, string message, object? errors = null)
    {
        context.Response.ContentType = "application/problem+json";
        context.Response.StatusCode = statusCode;

        var problem = new
        {
            success = false,
            data = (object?)null,
            error = new
            {
                code,
                message,
                details = errors,
                traceId = Activity.Current?.Id ?? context.TraceIdentifier
            },
            metadata = new
            {
                requestId = context.TraceIdentifier,
                timestamp = DateTime.UtcNow.ToString("o"),
                version = "1.0"
            }
        };

        await context.Response.WriteAsJsonAsync(problem);
    }
}
```

### Python FastAPI

```python
from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(NotFoundException)
async def not_found_handler(request: Request, exc: NotFoundException):
    return JSONResponse(
        status_code=404,
        content={
            "success": False,
            "data": None,
            "error": {
                "code": "NOT_FOUND",
                "message": str(exc),
                "traceId": request.headers.get("x-request-id", "")
            },
            "metadata": {
                "requestId": request.headers.get("x-request-id", ""),
                "timestamp": datetime.utcnow().isoformat(),
                "version": "1.0"
            }
        }
    )

# Register exception handlers
def register_exception_handlers(app: FastAPI):
    app.add_exception_handler(NotFoundException, not_found_handler)
    app.add_exception_handler(ValidationException, validation_handler)
    app.add_exception_handler(Exception, generic_handler)
```

### Java Spring Boot

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(NotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ApiResponse<Void> handleNotFound(NotFoundException ex, HttpServletRequest request) {
        return ApiResponse.fail("NOT_FOUND", ex.getMessage(), request.getRequestId());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.UNPROCESSABLE_ENTITY)
    public ApiResponse<Void> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        List<ErrorDetail> details = ex.getBindingResult().getFieldErrors().stream()
            .map(e -> new ErrorDetail(e.getField(), e.getDefaultMessage()))
            .toList();
        return ApiResponse.fail("VALIDATION_ERROR", "Validation failed", request.getRequestId());
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ApiResponse<Void> handleGeneric(Exception ex, HttpServletRequest request) {
        log.error("Unhandled exception", ex);
        return ApiResponse.fail("INTERNAL_ERROR", "An unexpected error occurred", request.getRequestId());
    }
}
```

## Error Code Catalog

### Domain-Agnostic

| Code | HTTP | Description |
|---|---|---|
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 422 | Input validation failed |
| `BUSINESS_RULE_VIOLATION` | 400 | Business logic constraint |
| `CONFLICT` | 409 | Resource state conflict |
| `UNAUTHORIZED` | 401 | Missing/invalid auth |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `RATE_LIMITED` | 429 | Too many requests |
| `DEPENDENCY_FAILURE` | 502 | Upstream service failed |
| `TIMEOUT` | 504 | Request timed out |
| `BAD_REQUEST` | 400 | Malformed request |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | Wrong content type |

### Domain-Specific Examples

| Code | HTTP | Domain |
|---|---|---|
| `ORDER_NOT_FOUND` | 404 | Order ID does not exist |
| `ORDER_ALREADY_SHIPPED` | 409 | Cannot cancel shipped order |
| `PAYMENT_DECLINED` | 400 | Payment gateway rejected |
| `INSUFFICIENT_INVENTORY` | 409 | Not enough stock |
| `DUPLICATE_EMAIL` | 409 | Email already registered |
| `INVALID_COUPON` | 400 | Coupon code expired |
| `FILE_TOO_LARGE` | 413 | Upload exceeds limit |

## Validation Error Format

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more validation errors occurred.",
    "details": [
      { "field": "email", "reason": "Must be a valid email address", "code": "INVALID_FORMAT" },
      { "field": "age", "reason": "Must be at least 18", "code": "OUT_OF_RANGE" },
      { "field": "items", "reason": "At least one item is required", "code": "REQUIRED" }
    ],
    "traceId": "trace_xyz789"
  }
}
```
