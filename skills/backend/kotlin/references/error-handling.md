# Kotlin Backend Error Handling

Modelling, propagating, and reporting errors in Kotlin services: exceptions vs typed results, coroutine cancellation, and mapping to HTTP problem responses in Ktor and Spring.

## Decide: Exception or Typed Result

| Situation | Approach |
|-----------|----------|
| Programming bugs, broken invariants | Throw (`require`, `check`, `error`) and let it reach the global handler |
| Infrastructure failure (DB down, timeout) | Exception, mapped to 5xx/503 at the edge |
| Expected business outcome (not found, insufficient funds, validation) | Sealed result type or domain exception with a stable code |
| Multiple validation errors to accumulate | Arrow `Either`/`zipOrAccumulate` or a list of field errors |

Pick one convention per codebase and apply it consistently.

## Standard Library Preconditions

```kotlin
fun transfer(amountCents: Long, from: Account, to: Account) {
    require(amountCents > 0) { "amountCents must be positive, was $amountCents" }   // IllegalArgumentException
    check(from.isActive) { "Account ${from.id} is not active" }                     // IllegalStateException
}
```

## Sealed Result Types

```kotlin
sealed interface PayResult {
    data class Paid(val order: Order) : PayResult
    data class Declined(val reason: String) : PayResult
    data object NotFound : PayResult
}

when (val r = payOrder(id)) {
    is PayResult.Paid -> call.respond(HttpStatusCode.OK, r.order.toDto())
    is PayResult.Declined -> call.respond(HttpStatusCode.PaymentRequired, problem("payment_declined", r.reason))
    PayResult.NotFound -> call.respond(HttpStatusCode.NotFound, problem("order_not_found", "Order $id not found"))
}
```

`when` over a sealed type is exhaustive, so adding a case breaks compilation at every call site that needs updating.

## Domain Exception Hierarchy

```kotlin
sealed class DomainException(val code: String, message: String) : RuntimeException(message)
class NotFoundException(resource: String, id: Any) :
    DomainException("${resource}_not_found", "$resource $id not found")
class ConflictException(code: String, message: String) : DomainException(code, message)
class ValidationException(val fieldErrors: Map<String, String>) :
    DomainException("validation_failed", "Request validation failed")
```

## `runCatching` and Cancellation

`runCatching` catches `Throwable`, including `CancellationException`. Swallowing cancellation breaks structured concurrency (the coroutine keeps running after its scope was cancelled).

```kotlin
// Wrong inside suspend code
val user = runCatching { client.fetchUser(id) }.getOrNull()

// Right
suspend inline fun <T> catchingNonCancellation(block: () -> T): Result<T> =
    try { Result.success(block()) }
    catch (e: CancellationException) { throw e }
    catch (e: Exception) { Result.failure(e) }
```

Also never catch `Throwable` broadly in suspend functions without rethrowing `CancellationException`.

## Coroutine Failure Semantics

- `coroutineScope { }`: one child failing cancels siblings and rethrows — use for "all must succeed".
- `supervisorScope { }`: child failures are independent; handle each `async` result with `try`/`await`.
- `CoroutineExceptionHandler` only applies to root coroutines started with `launch`; it does not catch exceptions from `async` (those surface on `await`).
- `withTimeout` throws `TimeoutCancellationException` (a `CancellationException`); use `withTimeoutOrNull` when a timeout is an expected outcome, or catch and convert it to a domain error.

```kotlin
val appScope = CoroutineScope(SupervisorJob() + Dispatchers.Default +
    CoroutineExceptionHandler { _, e -> log.error("Unhandled background failure", e) })
```

## Ktor: StatusPages

```kotlin
@Serializable
data class Problem(val type: String, val title: String, val status: Int, val detail: String? = null,
                   val errors: Map<String, String>? = null)

fun Application.configureErrors() = install(StatusPages) {
    exception<ValidationException> { call, e ->
        call.respond(HttpStatusCode.UnprocessableEntity,
            Problem("validation_failed", "Validation failed", 422, errors = e.fieldErrors))
    }
    exception<NotFoundException> { call, e ->
        call.respond(HttpStatusCode.NotFound, Problem(e.code, "Not found", 404, e.message))
    }
    exception<ConflictException> { call, e ->
        call.respond(HttpStatusCode.Conflict, Problem(e.code, "Conflict", 409, e.message))
    }
    exception<BadRequestException> { call, e ->
        call.respond(HttpStatusCode.BadRequest, Problem("bad_request", "Malformed request", 400, e.message))
    }
    exception<Throwable> { call, e ->
        call.application.log.error("Unhandled error on ${call.request.httpMethod.value} ${call.request.uri}", e)
        call.respond(HttpStatusCode.InternalServerError, Problem("internal_error", "Internal error", 500))
    }
}
```

Respond with `Content-Type: application/problem+json` (RFC 9457) if clients expect it.

## Spring: ProblemDetail

```kotlin
@RestControllerAdvice
class ErrorHandler {
    @ExceptionHandler(NotFoundException::class)
    fun notFound(e: NotFoundException): ProblemDetail =
        ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, e.message ?: "").apply {
            setProperty("code", e.code)
        }
}
```

Enable `spring.mvc.problemdetails.enabled=true` (or the WebFlux equivalent) for framework errors.

## Logging Rules

- Log once, at the boundary that handles the error; do not log and rethrow at each layer.
- Include identifiers (`orderId`, `customerId`, request id via MDC); never log secrets or full payment data.
- 4xx: log at INFO/WARN without stack trace; 5xx: ERROR with stack trace.
- With coroutines, propagate MDC using `kotlinx-coroutines-slf4j` `MDCContext()`.

## Pitfalls

- `!!` in request handling → NPE becomes a 500; validate input and use typed errors.
- Returning `null` for failures hides the reason; return a sealed result or throw.
- Leaking exception messages from the DB driver to clients.
- Retrying non-idempotent operations in a generic catch block.

## Checklist

- [ ] Clear rule: exceptions for bugs/infra, typed results or domain exceptions for business outcomes
- [ ] `CancellationException` always rethrown
- [ ] One global handler mapping to problem responses
- [ ] Stable machine-readable error codes
- [ ] Single log entry per failure, with context and request id
