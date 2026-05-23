# Coroutines Guide

## Coroutine Scopes

| Scope | Binding | Use Case |
|---|---|---|
| `GlobalScope` | Application lifetime | **Never use** — leaks |
| `CoroutineScope(SupervisorJob() + Dispatchers.IO)` | Manual | Request-scoped work |
| `lifecycleScope` | Android/Aware | ViewModel work |
| `runBlocking` | Current thread | Bridge to non-coroutine code |

## Structured Concurrency Rules

1. Every coroutine launched inside a scope is cancelled when scope cancels.
2. SupervisorJob prevents child failure from cancelling siblings.
3. Never use GlobalScope — always provide explicit scope.

## Dispatchers

| Dispatcher | Threads | Use |
|---|---|---|
| `Dispatchers.Default` | CPU cores | CPU-intensive work |
| `Dispatchers.IO` | 64+ | Blocking I/O |
| `Dispatchers.Main` | UI thread | Android/JavaFX |
| `Dispatchers.Unconfined` | Caller thread | Initial dispatch only |

## Launch vs Async

```kotlin
// Fire-and-forget
scope.launch {
  val result = fetchData()  // suspending call
  process(result)
}

// Deferred result
val deferred: Deferred<Order> = scope.async {
  repository.findById(id) ?: throw NotFoundException()
}
val order = deferred.await()  // suspends until result
```

## Flow API

```kotlin
// Cold stream
fun observeOrders(): Flow<List<Order>> = flow {
  while (true) {
    emit(repository.findAll())
    delay(5000)    // poll every 5s
  }
}.flowOn(Dispatchers.IO)

// Collecting
scope.launch {
  observeOrders()
    .catch { e -> logger.error("Poll failed", e) }
    .collect { orders -> updateUI(orders) }
}
```

## Exception Handling

```kotlin
scope.launch {
  try {
    val order = async { repository.findById(id) }.await()
    process(order)
  } catch (e: NotFoundException) {
    handleNotFound(e)
  }
}

// SupervisorJob prevents cancellation propagation
val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
scope.launch { task1() }   // failure doesn't cancel task2
scope.launch { task2() }
```

## Testing Coroutines
```kotlin
@Test
fun `test suspending function`() = runTest {
  val result = mySuspendingFunction()
  assertEquals(expected, result)
}

@Test
fun `test with delay`() = runTest {
  // Use TestCoroutineScheduler internally
  val result = fetchWithTimeout(1000)
  assertEquals("completed", result)
}
```

## CoroutineContext Elements

| Element | Purpose |
|---|---|
| `Job` | Lifecycle, cancellation |
| `CoroutineDispatcher` | Thread dispatching |
| `CoroutineName` | Debugging name |
| `CoroutineExceptionHandler` | Uncaught exception handler |

## Common Patterns

```kotlin
// Timeout
withTimeout(5000) {
  fetchData()    // throws TimeoutCancellationException
}

// Parallel decomposition
coroutineScope {
  val order = async { repo.findById(id) }
  val customer = async { customerRepo.findById(custId) }
  process(order.await(), customer.await())
}

// Retry with exponential backoff
suspend fun <T> retry(block: suspend () -> T, maxRetries: Int = 3): T {
  repeat(maxRetries - 1) {
    try { return block() }
    catch (e: Exception) { delay(1000L * (1 shl it)) }
  }
  return block()
}
```
