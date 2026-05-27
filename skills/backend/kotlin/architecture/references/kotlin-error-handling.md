# Kotlin Error Handling Reference

## Sealed Class Hierarchy

Define application errors as a sealed class hierarchy for exhaustive `when` handling.

```kotlin
sealed class AppException(
    override val message: String,
    val statusCode: Int,
    val errorCode: String
) : RuntimeException(message) {
    
    class NotFound(
        entity: String,
        id: Any
    ) : AppException(
        message = "$entity with id $id not found",
        statusCode = 404,
        errorCode = "NOT_FOUND"
    )
    
    class Validation(
        val errors: List<ValidationError>
    ) : AppException(
        message = errors.joinToString("; ") { it.message },
        statusCode = 400,
        errorCode = "VALIDATION_ERROR"
    )
    
    class Unauthorized(
        reason: String = "Authentication required"
    ) : AppException(
        message = reason,
        statusCode = 401,
        errorCode = "UNAUTHORIZED"
    )
    
    class Forbidden(
        reason: String = "Insufficient permissions"
    ) : AppException(
        message = reason,
        statusCode = 403,
        errorCode = "FORBIDDEN"
    )
    
    class Conflict(
        detail: String
    ) : AppException(
        message = detail,
        statusCode = 409,
        errorCode = "CONFLICT"
    )
    
    class Internal(
        cause: Throwable? = null
    ) : AppException(
        message = cause?.message ?: "Internal server error",
        statusCode = 500,
        errorCode = "INTERNAL_ERROR",
        cause = cause
    )
}

data class ValidationError(
    val field: String,
    val message: String,
    val rejectedValue: Any? = null
)
```

## Global Error Handler (Ktor)

```kotlin
fun Application.configureErrorHandling() {
    install(StatusPages) {
        exception<AppException.NotFound> { call, cause ->
            call.respond(HttpStatusCode.NotFound, ErrorResponse(
                code = cause.errorCode,
                message = cause.message
            ))
        }
        exception<AppException.Validation> { call, cause ->
            call.respond(HttpStatusCode.BadRequest, ErrorResponse(
                code = cause.errorCode,
                message = cause.message,
                details = cause.errors.map {
                    mapOf("field" to it.field, "message" to it.message)
                }
            ))
        }
        exception<AppException.Unauthorized> { call, cause ->
            call.respond(HttpStatusCode.Unauthorized, ErrorResponse(
                code = cause.errorCode,
                message = cause.message
            ))
        }
        exception<AppException.Forbidden> { call, cause ->
            call.respond(HttpStatusCode.Forbidden, ErrorResponse(
                code = cause.errorCode,
                message = cause.message
            ))
        }
        exception<AppException.Conflict> { call, cause ->
            call.respond(HttpStatusCode.Conflict, ErrorResponse(
                code = cause.errorCode,
                message = cause.message
            ))
        }
        exception<Throwable> { call, cause ->
            log.error("Unhandled exception", cause)
            call.respond(HttpStatusCode.InternalServerError, ErrorResponse(
                code = "INTERNAL_ERROR",
                message = "An unexpected error occurred"
            ))
        }
    }
}
```

## Result Type Pattern

```kotlin
sealed class Result<out T> {
    data class Success<T>(val value: T) : Result<T>()
    data class Failure(val error: AppException) : Result<Nothing>()
}

// Extension functions
fun <T> Result<T>.getOrThrow(): T = when (this) {
    is Result.Success -> value
    is Result.Failure -> throw error
}

fun <T> Result<T>.getOrDefault(default: T): T = when (this) {
    is Result.Success -> value
    is Result.Failure -> default
}

inline fun <T, R> Result<T>.map(transform: (T) -> R): Result<R> = when (this) {
    is Result.Success -> Result.Success(transform(value))
    is Result.Failure -> this
}
```

### Usage in Services

```kotlin
class OrderService(private val repo: OrderRepository) {
    suspend fun findById(id: OrderId): Result<Order> {
        return try {
            val order = repo.findById(id)
                ?: return Result.Failure(
                    AppException.NotFound("Order", id)
                )
            Result.Success(order)
        } catch (e: Exception) {
            Result.Failure(AppException.Internal(e))
        }
    }
    
    suspend fun createOrder(request: CreateOrderRequest): Result<Order> {
        val validation = validateRequest(request)
        if (validation != null) {
            return Result.Failure(AppException.Validation(validation))
        }
        return try {
            val order = Order.fromRequest(request)
            Result.Success(repo.save(order))
        } catch (e: Exception) {
            Result.Failure(AppException.Internal(e))
        }
    }
}
```

## Validation Framework

```kotlin
class OrderValidator {
    fun validate(request: CreateOrderRequest): List<ValidationError> {
        val errors = mutableListOf<ValidationError>()
        
        if (request.customerId.isBlank()) {
            errors.add(ValidationError(
                field = "customerId",
                message = "Customer ID must not be blank"
            ))
        }
        
        if (request.items.isEmpty()) {
            errors.add(ValidationError(
                field = "items",
                message = "Order must contain at least one item"
            ))
        }
        
        request.items.forEachIndexed { index, item ->
            if (item.sku.isBlank()) {
                errors.add(ValidationError(
                    field = "items[$index].sku",
                    message = "SKU must not be blank"
                ))
            }
            if (item.quantity <= 0) {
                errors.add(ValidationError(
                    field = "items[$index].quantity",
                    message = "Quantity must be positive"
                ))
            }
            if (item.price <= 0) {
                errors.add(ValidationError(
                    field = "items[$index].price",
                    message = "Price must be positive"
                ))
            }
        }
        
        return errors
    }
}
```

## Structured Error Response

```kotlin
@Serializable
data class ErrorResponse(
    val code: String,
    val message: String,
    val details: List<Map<String, Any?>>? = null,
    val timestamp: Long = Clock.System.now().toEpochMilliseconds(),
    val path: String? = null,
    val traceId: String? = null
)
```

## Coroutine Exception Handling

```kotlin
class ResilientService {
    suspend fun fetchWithRetry(id: String): Result<Data> {
        return retryBehaviour(maxRetries = 3, initialDelay = 100.milliseconds) {
            fetchData(id)
        }
    }
    
    suspend fun <T> retryBehaviour(
        maxRetries: Int,
        initialDelay: Duration,
        factor: Double = 2.0,
        block: suspend () -> T
    ): Result<T> {
        var currentDelay = initialDelay
        repeat(maxRetries) { attempt ->
            try {
                return Result.Success(block())
            } catch (e: Exception) {
                if (attempt == maxRetries - 1) {
                    return Result.Failure(AppException.Internal(e))
                }
                delay(currentDelay)
                currentDelay = (currentDelay * factor).toLong().milliseconds
            }
        }
        return Result.Failure(AppException.Internal())
    }
}
```

## Key Points

- Sealed class hierarchy provides exhaustive error handling
- Global error handler captures all exceptions at the framework level
- Result type pattern enables functional error handling without exceptions
- Validation errors return structured field-level details
- Coroutine exception handling uses retry with exponential backoff
- Error response includes code, message, details, and trace ID
- AppException carries HTTP status code for direct mapping
- Internal errors never expose stack traces to clients
- Validation is separated from business logic
- Recovery blocks handle transient failures gracefully
