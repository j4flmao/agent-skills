# Kotlin Coroutines Patterns Reference

## Overview

Comprehensive reference for Kotlin coroutines in backend applications: structured concurrency, scope management, flow integration, exception handling, testing, and common patterns.

## Table of Contents

1. Coroutine Fundamentals
2. Structured Concurrency
3. Coroutine Scopes
4. Job Management
5. Exception Handling
6. Coroutine Context
7. Channels
8. Flows
9. Integration with Frameworks
10. Testing Coroutines
11. Common Patterns
12. Performance

---

## 1. Coroutine Fundamentals

### Basics

```kotlin
import kotlinx.coroutines.*

// Launch a coroutine
fun main() = runBlocking {
    launch {
        delay(1000L)
        println("World!")
    }
    println("Hello,")
}

// Async/await
suspend fun fetchUser(): User {
    delay(1000L)
    return User("Alice")
}

suspend fun fetchOrder(): Order {
    delay(1000L)
    return Order("ORD-123")
}

fun main() = runBlocking {
    val user = async { fetchUser() }
    val order = async { fetchOrder() }
    println("${user.await()} - ${order.await()}")
}
```

### Dispatchers

```kotlin
import kotlinx.coroutines.*

// Dispatchers.Default: CPU-intensive work
suspend fun calculatePi(iterations: Int): Double = withContext(Dispatchers.Default) {
    // CPU-bound computation
    var sum = 0.0
    for (i in 0 until iterations) {
        sum += 4.0 * (1.0 - (i % 2) * 2.0) / (2.0 * i + 1.0)
    }
    sum
}

// Dispatchers.IO: I/O-bound work (database, network)
suspend fun loadUserFromDatabase(id: String): User = withContext(Dispatchers.IO) {
    // Blocking JDBC call
    jdbc.query("SELECT * FROM users WHERE id = ?", id).map { it.toUser() }
}

// Dispatchers.Main: UI thread (Android/JavaFX only)
// Dispatchers.Unconfined: Not recommended for backend
```

### Suspend Functions

```kotlin
// Suspend function rules
suspend fun processOrder(order: Order): Order {
    // Can call other suspend functions
    val validated = validateOrder(order)
    val saved = saveOrder(validated)
    return saved
}

// Cannot call from non-suspend functions without a coroutine
fun processSync(order: Order): Order {
    // Compile error: Suspend function 'processOrder' should be called only from a coroutine
    // return processOrder(order)

    // Workaround: runBlocking (use sparingly)
    return runBlocking {
        processOrder(order)
    }
}

// Can call regular functions normally
suspend fun processOrder(order: Order): Order {
    val log = logOperation("processing")  // Regular function call
    return doWork(order)
}
```

---

## 2. Structured Concurrency

### Fundamentals

```kotlin
// Structured concurrency ensures:
// 1. Coroutines are launched in a specific scope
// 2. Parent coroutine waits for all children to complete
// 3. Cancel parent cancels all children
// 4. Exception in child propagates to parent (unless supervisorScope)

fun main() = runBlocking {
    // This scope ensures all children complete before exiting
    coroutineScope {
        launch { doWork("A", 1000) }
        launch { doWork("B", 500) }
        println("Both launched")
    }
    println("Both completed")
}

suspend fun doWork(name: String, ms: Long) {
    delay(ms)
    println("$name done")
}
```

### coroutineScope vs supervisorScope

```kotlin
import kotlinx.coroutines.*

// coroutineScope: failure propagates
suspend fun processOrdersInScope(): List<Order> = coroutineScope {
    val order1 = async { fetchOrder("1") }
    val order2 = async { fetchOrder("2") }
    val order3 = async { fetchOrder("3") }

    // If any async fails, all others are cancelled
    listOf(order1.await(), order2.await(), order3.await())
}

// supervisorScope: failure is isolated
suspend fun processOrdersWithSupervisor(): List<Result<Order>> = supervisorScope {
    val order1 = async { fetchOrder("1") }
    val order2 = async { fetchOrder("2") }
    val order3 = async { fetchOrder("3") }

    // Each async is independent - failure in one doesn't cancel others
    listOf(
        runCatching { order1.await() },
        runCatching { order2.await() },
        runCatching { order3.await() },
    )
}
```

### Scope Nesting

```kotlin
class OrderProcessor {
    suspend fun processAll(orders: List<Order>): List<ProcessedOrder> = coroutineScope {
        orders.map { order ->
            async {
                processOne(order)
            }
        }.awaitAll()
    }

    private suspend fun processOne(order: Order): ProcessedOrder {
        return withContext(Dispatchers.Default) {
            // Process order
            ProcessedOrder(order.id, order.totalAmount * 1.1)
        }
    }
}
```

---

## 3. Coroutine Scopes

### Application Scope

```kotlin
import kotlinx.coroutines.*
import kotlin.coroutines.CoroutineContext

// Application-level scope (survives requests)
object AppScope {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    fun launch(block: suspend CoroutineScope.() -> Unit): Job {
        return scope.launch {
            block()
        }
    }

    fun cancelAll() {
        scope.cancel()
    }
}

// Usage in service
class BackgroundJobService {
    fun scheduleCleanup() {
        AppScope.launch {
            delay(60_000) // Wait 1 minute
            performCleanup()
        }
    }

    private suspend fun performCleanup() {
        // Database cleanup logic
    }
}
```

### Request Scope

```kotlin
// Ktor request scope
fun Application.module() {
    install(StatusPages) {
        exception<Throwable> { call, cause ->
            call.respond(HttpStatusCode.InternalServerError)
        }
    }

    routing {
        get("/api/orders") {
            // The call creates a coroutine scope automatically
            val orders = orderService.findAll()
            call.respond(orders)
        }
    }
}

// Custom request scope with timeout
class RequestScope(private val requestTimeoutMs: Long = 30_000) {
    suspend fun <T> withTimeout(block: suspend CoroutineScope.() -> T): T {
        return kotlinx.coroutines.withTimeout(requestTimeoutMs) {
            coroutineScope {
                block()
            }
        }
    }
}
```

### Scoped Service Pattern

```kotlin
class OrderService(
    private val repository: OrderRepository,
    private val eventBus: EventBus,
) {
    // Method-level scoping - each call is a coroutineScope
    suspend fun createOrder(request: CreateOrderRequest): Order = coroutineScope {
        // Validate
        val validated = validate(request)

        // Save
        val saved = repository.save(validated.toOrder())

        // Fire and forget (launch for independent work)
        launch {
            eventBus.publish(OrderCreatedEvent(saved.id))
        }

        saved
    }

    suspend fun processBatch(requests: List<CreateOrderRequest>): List<Order> = coroutineScope {
        requests.map { request ->
            async {
                createOrder(request)
            }
        }.awaitAll()
    }
}
```

---

## 4. Job Management

### Job States

```kotlin
fun main() = runBlocking {
    val job = launch {
        delay(1000)
        println("Done")
    }

    println("Job isActive: ${job.isActive}")
    println("Job isCompleted: ${job.isCompleted}")
    println("Job isCancelled: ${job.isCancelled}")

    job.join() // Wait for completion
    println("Job isCompleted after join: ${job.isCompleted}")
}

// Job lifecycle: New -> Active -> Completing -> Completed
//                         -> Cancelling -> Cancelled
```

### Job Hierarchies

```kotlin
fun main() = runBlocking {
    val parentJob = launch {
        val child1 = launch {
            delay(2000)
            println("Child 1 done")
        }
        val child2 = launch {
            delay(1000)
            println("Child 2 done")
        }
    }

    delay(500)
    parentJob.cancel() // Cancels parent AND both children
    parentJob.join()
    println("Parent cancelled")
}
```

### Completion Handlers

```kotlin
fun main() = runBlocking {
    val job = launch {
        delay(1000)
        println("Work done")
    }

    // Invoked when job completes (success, cancel, or failure)
    job.invokeOnCompletion { cause ->
        if (cause != null) {
            println("Job failed: $cause")
        } else {
            println("Job completed successfully")
        }
    }

    job.join()
}
```

---

## 5. Exception Handling

### Exception Propagation

```kotlin
import kotlinx.coroutines.*

// Exception propagation in coroutineScope
suspend fun riskyOperation(): String = coroutineScope {
    val deferred = async {
        delay(100)
        throw RuntimeException("Failed!")
    }

    try {
        deferred.await()
    } catch (e: Exception) {
        "Recovered: ${e.message}"
    }
}

fun main() = runBlocking {
    val result = riskyOperation()
    println(result) // Recovered: Failed!
}

// Exception in launch (different from async)
fun main() = runBlocking {
    val job = launch {
        throw RuntimeException("Crash!")
    }

    try {
        job.join()
    } catch (e: Exception) {
        // This does NOT catch it!
        // launch exceptions propagate through the scope
    }
}
```

### Exception Handler

```kotlin
import kotlinx.coroutines.*

fun main() = runBlocking {
    val handler = CoroutineExceptionHandler { _, throwable ->
        println("Caught: ${throwable.message}")
    }

    // Handler catches exceptions from launch (not async)
    val scope = CoroutineScope(SupervisorJob() + handler)

    scope.launch {
        throw RuntimeException("Error in launch")
    }

    delay(500)
    println("Still running")
}

// Global handler (set on JVM)
fun main() {
    val handler = CoroutineExceptionHandler { _, throwable ->
        System.err.println("Global handler: ${throwable.message}")
    }
    Thread.setDefaultUncaughtExceptionHandler(handler)
    // ...
}
```

### try/catch in Coroutines

```kotlin
suspend fun safeCall(): Result<String> = runCatching {
    riskyNetworkCall()
}

suspend fun processWithRecovery(order: Order): ProcessedOrder {
    return try {
        processOrder(order)
    } catch (e: NetworkException) {
        retryWithBackoff { processOrder(order) }
    } catch (e: ValidationException) {
        throw e // Re-throw domain exceptions
    } catch (e: Exception) {
        logger.error("Unexpected error processing order ${order.id}", e)
        throw OrderProcessingException(order.id, e)
    }
}

// Retry with exponential backoff
suspend fun <T> retryWithBackoff(
    maxRetries: Int = 3,
    initialDelayMs: Long = 100,
    factor: Double = 2.0,
    block: suspend () -> T,
): T {
    var currentDelay = initialDelayMs
    repeat(maxRetries - 1) { attempt ->
        try {
            return block()
        } catch (e: Exception) {
            if (e is NonRetryableException) throw e
            delay(currentDelay)
            currentDelay = (currentDelay * factor).toLong()
        }
    }
    return block() // Last attempt
}
```

---

## 6. Coroutine Context

### Context Elements

```kotlin
import kotlinx.coroutines.*
import kotlin.coroutines.CoroutineContext

// Key context elements
// - Job: controls lifecycle
// - CoroutineDispatcher: determines thread
// - CoroutineName: debugging name
// - CoroutineExceptionHandler: exception handling

fun main() = runBlocking {
    launch(Dispatchers.Default + CoroutineName("worker-1")) {
        println("Running on ${Thread.currentThread().name}")
        println("Name: ${coroutineContext[CoroutineName]?.name}")
    }
}

// Custom context element
data class RequestId(val id: String) : CoroutineContext.Element {
    companion object Key : CoroutineContext.Key<RequestId>
    override val key: CoroutineContext.Key<*> get() = Key
}

fun main() = runBlocking {
    launch(RequestId("req-123")) {
        val requestId = coroutineContext[RequestId]
        println("Processing request: ${requestId?.id}")
    }
}
```

### Context Propagation

```kotlin
class CorrelationIdService {
    private val correlationId = ThreadLocal<String>()

    suspend fun <T> withCorrelationId(id: String, block: suspend () -> T): T {
        correlationId.set(id)
        return withContext(Dispatchers.IO) {
            try {
                block()
            } finally {
                // ThreadLocal is not automatically propagated across dispatchers!
                correlationId.remove()
            }
        }
    }

    fun currentId(): String? = correlationId.get()
}

// Better: Use kotlinx-coroutines-reactive or custom context
data class CorrelationId(val value: String) : CoroutineContext.Element {
    companion object Key : CoroutineContext.Key<CorrelationId>
    override val key: CoroutineContext.Key<*> get() = Key
}

suspend fun <T> withCorrelationId(id: String, block: suspend CoroutineScope.() -> T): T {
    return withContext(CorrelationId(id)) {
        block()
    }
}

fun main() = runBlocking {
    withCorrelationId("trace-123") {
        val ctx = coroutineContext[CorrelationId]
        println("Correlation: ${ctx?.value}")
    }
}
```

---

## 7. Channels

### Channel Basics

```kotlin
import kotlinx.coroutines.channels.*

fun main() = runBlocking {
    val channel = Channel<Int>(capacity = 10)

    // Producer
    launch {
        for (i in 1..5) {
            channel.send(i)
            delay(100)
        }
        channel.close()
    }

    // Consumer
    for (value in channel) {
        println("Received: $value")
    }
}

// Channel types
// - RendezvousChannel: no buffer, sender waits for receiver
// - LinkedListChannel: unlimited buffer
// - ArrayChannel: bounded buffer (capacity parameter)
// - ConflatedChannel: keeps only the latest value
```

### Fan-Out / Fan-In

```kotlin
fun main() = runBlocking {
    val channel = Channel<String>(10)

    // Multiple producers
    fun CoroutineScope.produceStrings(prefix: String, count: Int) = launch {
        repeat(count) {
            channel.send("$prefix-$it")
            delay(50)
        }
    }

    produceStrings("A", 5)
    produceStrings("B", 5)

    delay(1000)
    channel.close()

    // Multiple consumers (fan-out)
    repeat(3) { id ->
        launch {
            for (msg in channel) {
                println("Consumer $id: $msg")
            }
        }
    }
}
```

---

## 8. Flows

### Flow Basics

```kotlin
import kotlinx.coroutines.flow.*

// Cold stream
fun orderUpdates(): Flow<Order> = flow {
    val orders = listOf(
        Order("1", "pending"),
        Order("2", "confirmed"),
        Order("3", "shipped"),
    )
    for (order in orders) {
        delay(100) // Simulate async work
        emit(order)
    }
}

fun main() = runBlocking {
    orderUpdates()
        .filter { it.status == "pending" }
        .map { it.copy(status = "processed") }
        .collect { println(it) }
}

// Flow builders
val numberFlow = flowOf(1, 2, 3)
val rangeFlow = (1..10).asFlow()
val emptyFlow = emptyFlow<String>()
```

### Terminal Operators

```kotlin
fun main() = runBlocking {
    val flow = (1..5).asFlow()

    // Collect (terminal)
    flow.collect { println(it) }

    // toList / toSet
    val list = flow.toList()
    val set = flow.toSet()

    // first / single
    val first = flow.first()
    val single = flowOf(1).single()

    // reduce / fold
    val sum = flow.reduce { acc, value -> acc + value }
    val folded = flow.fold(10) { acc, value -> acc + value }

    // count
    val count = flow.count { it > 2 }

    // launchIn (non-blocking collect)
    flow.onEach { println(it) }
        .launchIn(GlobalScope)
}
```

### Flow Transformation

```kotlin
fun main() = runBlocking {
    val flow = (1..10).asFlow()

    flow
        .map { it * 2 }
        .filter { it % 3 == 0 }
        .transform { value ->
            emit("Value: $value")
            emit("Double: ${value * 2}")
        }
        .take(3)
        .collect { println(it) }

    // FlatMap variants
    flow.flatMapConcat { value ->
        flowOf("A-$value", "B-$value")
    }.collect { println(it) }

    flow.flatMapMerge(concurrency = 2) { value ->
        flowOf("$value-1", "$value-2")
    }.collect { println(it) }

    flow.flatMapLatest { value ->
        flow {
            emit("Start $value")
            delay(100)
            emit("End $value")
        }
    }.collect { println(it) }
}
```

### Flow Exception Handling

```kotlin
fun main() = runBlocking {
    flow {
        emit(1)
        emit(2)
        throw RuntimeException("Error")
    }
        .catch { e ->
            emit(-1) // Emit fallback value
            println("Caught: ${e.message}")
        }
        .collect { println(it) }

    // onCompletion
    (1..3).asFlow()
        .onCompletion { cause ->
            if (cause != null) {
                println("Flow completed with error: $cause")
            } else {
                println("Flow completed successfully")
            }
        }
        .catch { /* handled in onCompletion */ }
        .collect { println(it) }
}
```

### Flow with Backpressure

```kotlin
import kotlinx.coroutines.flow.*
import kotlin.system.measureTimeMillis

// Buffer
fun main() = runBlocking {
    val time = measureTimeMillis {
        flow {
            repeat(100) {
                emit(it)
                delay(100) // Slow producer
            }
        }
            .buffer(50) // Buffer emissions
            .collect { value ->
                delay(300) // Slow consumer
                println(value)
            }
    }
    println("Time: $time ms")

    // Conflate: keep only the latest
    val conflated = flow {
        repeat(10) {
            emit(it)
            delay(100)
        }
    }.conflate()

    conflated.collect { println(it) }

    // CollectLatest: cancel previous on new emission
    flow {
        repeat(10) {
            emit(it)
            delay(100)
        }
    }.collectLatest { value ->
        println("Processing $value")
        delay(300) // Will be cancelled on new emission
        println("Done $value")
    }.also { println("Complete") }
}
```

### StateFlow and SharedFlow

```kotlin
import kotlinx.coroutines.flow.*

// StateFlow: always has a value, conflated
class OrderViewModel {
    private val _state = MutableStateFlow(OrderState())
    val state: StateFlow<OrderState> = _state.asStateFlow()

    fun updateOrder(order: Order) {
        _state.value = _state.value.copy(currentOrder = order)
    }
}

data class OrderState(
    val currentOrder: Order? = null,
    val isLoading: Boolean = false,
    val error: String? = null,
)

// SharedFlow: no initial value, configurable replay
class EventBus {
    private val _events = MutableSharedFlow<DomainEvent>(
        replay = 0,
        extraBufferCapacity = 64,
        onBufferOverflow = BufferOverflow.DROP_OLDEST,
    )
    val events: SharedFlow<DomainEvent> = _events.asSharedFlow()

    suspend fun publish(event: DomainEvent) {
        _events.emit(event)
    }
}

fun main() = runBlocking {
    val eventBus = EventBus()

    // Collector
    launch {
        eventBus.events.collect { event ->
            println("Received: $event")
        }
    }

    // Publisher
    delay(100)
    eventBus.publish(OrderCreatedEvent("1"))
    eventBus.publish(OrderCreatedEvent("2"))
}
```

---

## 9. Integration with Frameworks

### Ktor Integration

```kotlin
fun Application.module() {
    // Request-scoped coroutines
    routing {
        get("/api/orders") {
            // The request handler provides a coroutine scope
            val orders = orderService.findAll()
            call.respond(orders)
        }

        // Streaming with Flow
        get("/api/orders/stream") {
            call.respondTextWriter(contentType = ContentType.Text.EventStream) {
                orderService.streamUpdates().collect { order ->
                    write("data: ${Json.encodeToString(order)}\n\n")
                    flush()
                }
            }
        }
    }
}
```

### Spring Boot Integration

```kotlin
@Service
class OrderService {
    suspend fun createOrder(request: CreateOrderRequest): Order {
        // Spring supports suspend functions in controllers
        return withContext(Dispatchers.IO) {
            orderRepository.save(request.toOrder())
        }
    }

    // Flow in Spring WebFlux
    fun streamOrders(): Flow<Order> = flow {
        var page = 0
        do {
            val orders = orderRepository.findAll(PageRequest.of(page++, 100))
            orders.forEach { emit(it) }
        } while (orders.hasNext())
    }
}

@RestController
class OrderController(private val service: OrderService) {

    @GetMapping("/api/orders")
    suspend fun listOrders(): List<Order> {
        return service.findAll()
    }

    @GetMapping("/api/orders/stream", produces = [MediaType.TEXT_EVENT_STREAM_VALUE])
    fun streamOrders(): Flux<Order> {
        return service.streamOrders().asFlux()
    }
}
```

---

## 10. Testing Coroutines

### Test Dispatchers

```kotlin
import kotlinx.coroutines.*
import kotlinx.coroutines.test.*
import org.junit.jupiter.api.Test

class OrderServiceTest {
    private val testDispatcher = StandardTestDispatcher()

    @BeforeEach
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
    }

    @AfterEach
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `test with virtual time`() = runTest {
        var result = false

        launch {
            delay(1000)
            result = true
        }

        // Fast-forward time
        advanceTimeBy(1000)
        assertTrue(result)
    }

    @Test
    fun `test until idle`() = runTest {
        var counter = 0

        launch {
            delay(500)
            counter = 1
        }
        launch {
            delay(1000)
            counter = 2
        }

        // Execute all pending tasks
        advanceUntilIdle()
        assertEquals(2, counter)
    }
}
```

### runTest Usage

```kotlin
class CoroutineServiceTest {
    @Test
    fun `test suspend function`() = runTest {
        val service = OrderService(
            repository = mockk {
                coEvery { save(any()) } returns Order("1", "cust-1")
            }
        )

        val result = service.createOrder(CreateOrderRequest("cust-1"))

        assertEquals("1", result.id)
    }

    @Test
    fun `test with delay`() = runTest {
        // runTest uses virtual time by default
        val start = currentTime
        delay(1000)
        val end = currentTime

        assertEquals(1000, end - start)
    }

    @Test
    fun `test multiple coroutines`() = runTest {
        val results = mutableListOf<Int>()

        coLaunch {
            delay(300)
            results.add(1)
        }
        coLaunch {
            delay(100)
            results.add(2)
        }

        advanceUntilIdle()
        assertEquals(listOf(2, 1), results)
    }
}
```

### Testing Flows

```kotlin
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.test.*
import org.junit.jupiter.api.Test

class OrderFlowTest {

    @Test
    fun `test flow emissions`() = runTest {
        val flow = flow {
            emit(1)
            emit(2)
            emit(3)
        }

        val results = mutableListOf<Int>()
        flow.collect { results.add(it) }

        assertEquals(listOf(1, 2, 3), results)
    }

    @Test
    fun `test flow with timeout`() = runTest {
        val flow = flow {
            emit(1)
            delay(1000)
            emit(2)
        }

        // Use virtual time to skip the delay
        val results = mutableListOf<Int>()
        launch {
            flow.collect { results.add(it) }
        }

        advanceTimeBy(1000)
        assertEquals(listOf(1), results)
        advanceTimeBy(1000)
        assertEquals(listOf(1, 2), results)
    }

    @Test
    fun `test StateFlow`() = runTest {
        val stateFlow = MutableStateFlow(0)

        val emissions = mutableListOf<Int>()
        val job = launch {
            stateFlow.collect { emissions.add(it) }
        }

        stateFlow.value = 1
        stateFlow.value = 2
        stateFlow.value = 3

        // StateFlow is conflated
        assertEquals(listOf(0, 1, 2, 3), emissions)

        job.cancel()
    }
}
```

---

## 11. Common Patterns

### Parallel Decomposition

```kotlin
suspend fun getOrderDetails(orderId: String): OrderDetails = coroutineScope {
    val order = async { orderRepository.findById(orderId) }
    val payments = async { paymentRepository.findByOrder(orderId) }
    val shipments = async { shipmentRepository.findByOrder(orderId) }

    OrderDetails(
        order = order.await(),
        payments = payments.await(),
        shipments = shipments.await(),
    )
}

// With error handling per component
suspend fun getOrderDetailsSafe(orderId: String): OrderDetailsSafe = coroutineScope {
    val orderDef = async { orderRepository.findById(orderId) }
    val paymentDef = async {
        runCatching { paymentRepository.findByOrder(orderId) }
    }
    val shipmentDef = async {
        runCatching { shipmentRepository.findByOrder(orderId) }
    }

    OrderDetailsSafe(
        order = orderDef.await() ?: throw OrderNotFoundException(orderId),
        payments = paymentDef.await().getOrDefault(emptyList()),
        shipments = shipmentDef.await().getOrDefault(emptyList()),
    )
}
```

### Timeout Pattern

```kotlin
suspend fun <T> withTimeoutOrDefault(
    timeoutMs: Long,
    default: T,
    block: suspend CoroutineScope.() -> T,
): T {
    return try {
        withTimeout(timeoutMs) {
            coroutineScope {
                block()
            }
        }
    } catch (e: TimeoutCancellationException) {
        logger.warn("Operation timed out after ${timeoutMs}ms")
        default
    }
}

// Usage
val order = withTimeoutOrDefault(5000, Order.empty()) {
    fetchOrderFromSlowService("ord-123")
}
```

### Rate Limiting with Coroutines

```kotlin
class RateLimiter(private val maxRequests: Int, private val periodMs: Long) {
    private val semaphore = Semaphore(maxRequests)
    private val resetInterval = periodMs / maxRequests

    suspend fun <T> acquire(block: suspend () -> T): T {
        semaphore.acquire()
        try {
            return block()
        } finally {
            launch {
                delay(resetInterval)
                semaphore.release()
            }
        }
    }
}

// Usage
val rateLimiter = RateLimiter(maxRequests = 10, periodMs = 1000)

suspend fun makeApiCall(request: ApiRequest): ApiResponse {
    return rateLimiter.acquire {
        httpClient.post("https://api.example.com/orders") {
            setBody(request)
        }
    }
}
```

### Fire-and-Forget with Supervision

```kotlin
class NotificationService {
    suspend fun sendOrderConfirmation(order: Order) {
        // Fire and forget - don't wait for notification to complete
        supervisorScope {
            launch {
                try {
                    emailService.send(order)
                } catch (e: Exception) {
                    logger.error("Email failed for order ${order.id}", e)
                }
            }
            launch {
                try {
                    smsService.send(order)
                } catch (e: Exception) {
                    logger.error("SMS failed for order ${order.id}", e)
                }
            }
        }
    }
}
```

---

## 12. Performance

### Coroutine Overhead

```kotlin
// Coroutines are lightweight - millions can run concurrently
// Memory: ~200 bytes per coroutine (vs ~1MB per thread)
// Context switching: ~1us (vs ~10us for threads)

suspend fun processOrdersEfficiently(orders: List<Order>): List<Result<Order>> = coroutineScope {
    orders.map { order ->
        async {
            runCatching { processOrder(order) }
        }
    }.awaitAll()
}

// Batch with controlled concurrency
suspend fun <T> processInBatches(
    items: List<T>,
    batchSize: Int = 100,
    block: suspend (List<T>) -> Unit,
) {
    items.chunked(batchSize).forEach { batch ->
        withContext(Dispatchers.IO) {
            block(batch)
        }
    }
}
```

### Thread Pool Tuning

```kotlin
// Custom dispatcher for specific workloads
val DB_DISPATCHER = Dispatchers.IO.limitedParallelism(10)
val NETWORK_DISPATCHER = Dispatchers.IO.limitedParallelism(20)

class DatabaseService {
    suspend fun query(): List<Order> = withContext(DB_DISPATCHER) {
        jdbcTemplate.query("SELECT * FROM orders")
    }
}

class NetworkService {
    suspend fun fetch(url: String): String = withContext(NETWORK_DISPATCHER) {
        URL(url).readText()
    }
}
```

---

## References

- Kotlin Coroutines Guide: https://kotlinlang.org/docs/coroutines-guide.html
- Structured Concurrency: https://kotlinlang.org/docs/structured-concurrency.html
- Coroutine Context: https://kotlinlang.org/docs/reference/coroutines/coroutine-context-and-dispatchers.html
- Kotlin Flows: https://kotlinlang.org/docs/flow.html
- Coroutines Testing: https://kotlinlang.org/api/kotlinx.coroutines/kotlinx-coroutines-test/
- Ktor Coroutines: https://ktor.io/docs/advanced.html#coroutines
