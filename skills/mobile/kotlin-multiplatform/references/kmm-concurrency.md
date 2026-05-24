# KMM Concurrency — Coroutines, Flows, and Threading

## Kotlin Coroutines in commonMain

### Structured Concurrency
```kotlin
// commonMain — structured concurrency basics
class OrderViewModel {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    // All child coroutines are cancelled when scope is cancelled
    fun loadOrders() {
        scope.launch {
            try {
                val orders = withContext(Dispatchers.Default) {
                    repository.fetchOrders() // Heavy computation
                }
                _uiState.value = UiState.Success(orders)
            } catch (e: Exception) {
                _uiState.value = UiState.Error(e)
            }
        }
    }

    fun cancel() {
        scope.cancel() // Cancel all coroutines
    }
}
```

### Coroutine Scopes in KMM
```kotlin
// commonMain — platform-agnostic scope management
expect class ViewModelScope {
    val coroutineScope: CoroutineScope
}

actual class ViewModelScope {
    actual val coroutineScope: CoroutineScope = CoroutineScope(
        SupervisorJob() + Dispatchers.Main
    )
}

// On Android, this integrates with AndroidX ViewModel
// On iOS, the scope is manually managed via lifecycle
```

## expect/actual for Platform Concurrency

### Dispatchers
```kotlin
// commonMain
expect val ApplicationDispatcher: CoroutineDispatcher

// androidMain
actual val ApplicationDispatcher: CoroutineDispatcher = Dispatchers.Main

// iosMain
actual val ApplicationDispatcher: CoroutineDispatcher = Dispatchers.Default
// Note: Dispatchers.Main is not available by default on iOS
// Use kotlinx-coroutines-core's Dispatchers.Default or create Main dispatcher
```

### Mutex / Locks
```kotlin
// commonMain — use kotlinx.coroutines.sync.Mutex
// Available in all KMP targets
class ThreadSafeCache<K, V> {
    private val mutex = Mutex()
    private val cache = mutableMapOf<K, V>()

    suspend fun getOrPut(key: K, factory: suspend () -> V): V {
        return mutex.withLock {
            cache.getOrPut(key) { factory() }
        }
    }

    suspend fun clear() {
        mutex.withLock {
            cache.clear()
        }
    }
}

// Alternative: use AtomicReference from kotlinx.atomicfu
// but Mutex is preferred for complex operations
```

### Atomic Operations
```kotlin
// commonMain — atomic operations via kotlinx.atomicfu
import kotlinx.atomicfu.atomic

class AtomicCounter {
    private val count = atomic(0)

    fun increment(): Int {
        return count.addAndGet(1)
    }

    fun decrement(): Int {
        return count.addAndGet(-1)
    }

    fun get(): Int = count.value

    fun compareAndSet(expected: Int, new: Int): Boolean {
        return count.compareAndSet(expected, new)
    }
}
```

## Flows in KMM

### SharedFlow vs StateFlow
```kotlin
// commonMain — Flow patterns
class OrderRepository {
    // StateFlow: always has a value, replays to new subscribers
    private val _orders = MutableStateFlow<List<Order>>(emptyList())
    val orders: StateFlow<List<Order>> = _orders.asStateFlow()

    // SharedFlow: no initial value, configurable replay
    private val _events = MutableSharedFlow<OrderEvent>(
        replay = 0,
        extraBufferCapacity = 10,
        onBufferOverflow = BufferOverflow.DROP_OLDEST
    )
    val events: SharedFlow<OrderEvent> = _events.asSharedFlow()

    fun updateOrders(newOrders: List<Order>) {
        _orders.value = newOrders
    }

    fun emitEvent(event: OrderEvent) {
        _events.tryEmit(event)
    }
}
```

### Flow Operators
```kotlin
// commonMain — common flow transformations
class OrderListViewModel(
    private val repository: OrderRepository
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    // Combine multiple flows
    val filteredOrders: StateFlow<List<Order>> = combine(
        repository.orders,
        _searchQuery
    ) { orders, query ->
        if (query.isBlank()) orders
        else orders.filter { it.name.contains(query, ignoreCase = true) }
    }.stateIn(
        scope = scope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = emptyList()
    )

    // FlatMapLatest for dynamic flow switching
    val orderDetails: Flow<OrderDetail> = _selectedOrderId
        .filterNotNull()
        .flatMapLatest { id ->
            repository.observeOrderDetail(id)
        }

    // Catch and retry
    val safeOrders: Flow<List<Order>> = repository.orders
        .catch { e ->
            // Emit empty list on error
            emit(emptyList())
            // Log error
            println("Error loading orders: $e")
        }
        .retry(3) { e ->
            e is IOException && !e.isPermanent
        }
}
```

### Flow Testing
```kotlin
// commonTest — testing flows with turbine
@Test
fun testOrderFlow() = runTest {
    val repository = FakeOrderRepository()
    val viewModel = OrderListViewModel(repository)

    // Turbine library for flow testing
    viewModel.filteredOrders.test {
        // Initial value (empty)
        assertEquals(emptyList(), awaitItem())

        // Add orders
        repository.emitOrders(listOf(Order("1", "Test")))
        assertEquals(listOf(Order("1", "Test")), awaitItem())

        // Cancel
        cancelAndIgnoreRemaining()
    }
}
```

## Threading Models

### Platform Thread Comparison
| Feature | Android (JVM) | iOS (Native) |
|---|---|---|
| Main thread | UI thread | Main run loop |
| Background | Thread pool (Dispatchers.IO) | GCD queue (DispatchQueue) |
| Main dispatcher | Dispatchers.Main (Android) | Dispatchers.Main (via kotlinx-coroutines) |
| IO dispatcher | Dispatchers.IO (unbounded) | Dispatchers.Default (limited) |
| Parallelism | JVM thread pool | DispatchQueue concurrent |

### Avoiding Main Thread Blocking
```kotlin
// commonMain — proper dispatcher usage
class HeavyComputationUseCase {
    suspend fun compute(data: List<RawData>): ComputedResult {
        return withContext(Dispatchers.Default) {
            // CPU-intensive work
            data.map { transform(it) }
                .filter { it.isValid }
                .reduce { acc, item -> acc.combine(item) }
        }
    }
}

class NetworkUseCase {
    suspend fun fetchData(): NetworkResult {
        return withContext(Dispatchers.IO) {
            // I/O work — network, database
            api.fetchData()
        }
    }
}
```

### iOS-Specific Considerations
```kotlin
// iosMain — iOS threading
import kotlinx.cinterop.ExperimentalForeignApi
import platform.Foundation.*

// DispatchQueue integration
class IOSSpecificWorker {
    private val backgroundQueue = dispatch_queue_create(
        "com.example.worker",
        dispatch_queue_attr_make_with_qos_class(
            DISPATCH_QUEUE_CONCURRENT,
            QOS_CLASS_UTILITY, 0
        )
    )

    // Use NSLock for thread safety on iOS
    private val lock = NSLock()

    fun synchronizedOperation(block: () -> Unit) {
        lock.lock()
        try {
            block()
        } finally {
            lock.unlock()
        }
    }
}

// Ensure proper main thread dispatching
class iOSViewModel {
    // Dispatch to main queue for UIKit updates
    fun updateUI() {
        dispatch_async(dispatch_get_main_queue()) {
            // Native UI update
        }
    }
}
```

## Coroutine Exception Handling

```kotlin
// commonMain — exception handling hierarchy
class ExceptionHandlerViewModel {
    private val exceptionHandler = CoroutineExceptionHandler { _, throwable ->
        // Handle uncaught exceptions
        println("Unhandled exception: $throwable")
    }

    private val scope = CoroutineScope(
        SupervisorJob() + Dispatchers.Default + exceptionHandler
    )

    fun launchWork() {
        scope.launch {
            // SupervisorJob prevents child failure from cancelling siblings
            val job1 = launch {
                try {
                    riskyOperation()
                } catch (e: Exception) {
                    // Handled locally
                    emitError(e)
                }
            }

            val job2 = launch {
                safeOperation() // Runs even if job1 fails
            }
        }
    }
}

// Scope vs supervisorScope
suspend fun parallelWork() = supervisorScope {
    val job1 = launch {
        throw RuntimeException("Job 1 failed")
    }
    val job2 = launch {
        delay(100)
        println("Job 2 completes") // Runs despite job1 failure
    }
    // supervisorScope: job2 continues
    // coroutineScope: job2 is cancelled when job1 fails
}
```

## Cancellation

```kotlin
// commonMain — cooperative cancellation
suspend fun cancellableOperation(): Result {
    return withContext(Dispatchers.Default) {
        var i = 0
        while (i < 1_000_000 && isActive) {
            // Check isActive or yield()
            yield()

            // Expensive computation chunk
            computeChunk(i)
            i += 1000
        }

        if (!isActive) {
            throw CancellationException("Operation cancelled")
        }

        Result.success(computeFinalResult())
    }
}

// Non-cancellable block
suspend fun cleanup() = withContext(NonCancellable) {
    // This block cannot be cancelled
    // Use sparingly — only for critical cleanup
    closeResources()
    flushLogs()
}
```

## KMM-Specific Concurrency Gotchas

| Issue | Cause | Fix |
|---|---|---|
| No Dispatchers.Main on iOS | iOS doesn't have built-in main dispatcher | Add `kotlinx-coroutines-core` dependency; use `Dispatchers.Main` from library |
| Freeze/isolation on iOS | Kotlin/Native object freezing | Mark shared mutable state with `@ThreadLocal` or use `AtomicReference` |
| Mutex not available | Using Java's synchronized | Use `kotlinx.coroutines.sync.Mutex` |
| Main thread violation | Calling UIKit from background | Dispatch to main queue explicitly |
| Memory leak from coroutine scope | Scope not cancelled | Use lifecycle-aware scope (Android) or manual cancellation (iOS) |

## Best Practices

- Use `SupervisorJob` in ViewModel scopes to isolate failures
- Prefer `StateFlow` over `MutableStateFlow` for public API
- Use `SharingStarted.WhileSubscribed(5000)` to keep upstream active during config changes
- Never use `GlobalScope` — always manage scope lifecycle
- Use `withContext(Dispatchers.Default)` for CPU-bound work
- Use `withContext(Dispatchers.IO)` for I/O-bound work
- Call `flowOn(Dispatchers.Default)` for flow transformations
- Use `channelFlow` for callback-to-flow bridges
- Test coroutines with `runTest` and `TestDispatcher`
