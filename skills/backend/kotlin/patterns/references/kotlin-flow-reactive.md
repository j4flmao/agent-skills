# Kotlin Flow Reactive Patterns Reference

## Overview

Comprehensive reference for building reactive data pipelines with Kotlin Flow: operators, error handling, concurrency, backpressure, Spring WebFlux integration, Ktor streaming, and reactive database access.

## Table of Contents

1. Flow Fundamentals
2. Flow Builders and Context
3. Transforming Operators
4. Filtering Operators
5. Combining Flows
6. Error Handling
7. Flow Lifecycle
8. Backpressure and Buffering
9. StateFlow and SharedFlow
10. Reactive Streams Interop
11. Spring WebFlux Integration
12. Ktor Streaming
13. Reactive Database Access
14. Testing Reactive Flows
15. Performance
16. Anti-Patterns

---

## 1. Flow Fundamentals

### What is a Flow?

A cold asynchronous stream of values. Flow is conceptually similar to RxJava's Observable or Reactor's Flux but built natively into Kotlin coroutines.

```kotlin
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*

// Cold stream: starts producing only when collected
val coldFlow: Flow<Int> = flow {
    println("Flow started")
    for (i in 1..3) {
        delay(100)
        emit(i)
    }
}

fun main() = runBlocking {
    println("Calling collect first time")
    coldFlow.collect { println(it) }

    println("Calling collect second time")
    coldFlow.collect { println(it) }
}

// Output:
// Calling collect first time
// Flow started
// 1
// 2
// 3
// Calling collect second time
// Flow started
// 1
// 2
// 3
```

### Flow vs Other Reactive Types

```kotlin
// Flow: cold, structured, cancellable
// - Cold: restarts on each collector
// - Structured: respects parent coroutine cancellation
// - Backpressure-aware: suspending emit/collect
// - Only terminal operations trigger execution

// RxJava Observable: cold, non-backpressured by default
// RxJava Flowable: cold, backpressured
// Reactor Flux: cold/hot, backpressured

fun main() = runBlocking {
    // Flow example
    flowOf(1, 2, 3)
        .map { it * 2 }
        .collect { println(it) }

    // Equivalent Reactor Flux
    // Flux.just(1, 2, 3)
    //     .map { it * 2 }
    //     .subscribe { println(it) }
}
```

### Suspend vs Flow

```kotlin
// suspend: returns a single value asynchronously
suspend fun getUser(id: String): User = withContext(Dispatchers.IO) {
    repository.findById(id)
}

// Flow: returns multiple values asynchronously
fun getUsers(): Flow<User> = flow {
    var page = 0
    do {
        val pageResult = repository.findAll(page++)
        pageResult.forEach { emit(it) }
    } while (pageResult.hasNext())
}

// Single value with Flow
fun getSingleUser(id: String): Flow<User> = flow {
    emit(repository.findById(id))
}

// Usually just use suspend for single values, Flow for streams
```

---

## 2. Flow Builders and Context

### Flow Builders

```kotlin
fun main() = runBlocking {
    // flow builder - general purpose
    flow {
        for (i in 1..3) {
            delay(100)
            emit(i)
        }
    }

    // flowOf - from vararg values
    flowOf(1, 2, 3)

    // asFlow - from collections/sequences
    listOf(1, 2, 3).asFlow()
    setOf("a", "b").asFlow()
    (1..10).asFlow()

    // emptyFlow
    emptyFlow<Int>()

    // callbackFlow - for callback-based APIs
    fun observeClickEvents(): Flow<ClickEvent> = callbackFlow {
        val listener = ClickListener { event ->
            trySend(event) // Non-suspending send
        }
        button.addOnClickListener(listener)
        awaitClose { button.removeOnClickListener(listener) }
    }

    // channelFlow - allows concurrent emissions
    channelFlow {
        launch {
            send(1)
        }
        launch {
            send(2)
        }
    }
}
```

### Flow Context

```kotlin
// flowOn: change upstream dispatcher
fun main() = runBlocking {
    flow {
        println("Emitting on ${Thread.currentThread().name}")
        emit(1)
        emit(2)
    }
        .flowOn(Dispatchers.IO) // Upstream runs on IO
        .collect {
            println("Collecting on ${Thread.currentThread().name}")
        }
}

// Multiple flowOn calls affect only the upstream
fun main() = runBlocking {
    flow {
        emit(1)
    }
        .flowOn(Dispatchers.IO)
        .map {
            println("Map on ${Thread.currentThread().name}")
            it * 2
        }
        .flowOn(Dispatchers.Default) // Map + upstream on Default
        .collect {
            println("Collect on ${Thread.currentThread().name}")
        }
}
```

### Debugging Flow

```kotlin
fun main() = runBlocking {
    flowOf(1, 2, 3)
        .onEach {
            println("Element: $it on ${Thread.currentThread().name}")
        }
        .collect()

    // Or use the coroutine context for debugging
    val flow = flowOf("a", "b")
        .flowOn(Dispatchers.Default + CoroutineName("flow-producer"))

    launch(CoroutineName("flow-collector")) {
        flow.collect { println(it) }
    }
}
```

---

## 3. Transforming Operators

### Map and Transform

```kotlin
fun main() = runBlocking {
    // map: 1:1 transformation
    flowOf("apple", "banana", "cherry")
        .map { it.uppercase() }
        .collect { println(it) }

    // transform: general-purpose transformation
    flowOf(1, 2, 3)
        .transform { value ->
            emit("Value: $value")
            emit("Double: ${value * 2}")
            emit("Square: ${value * value}")
        }
        .collect { println(it) }

    // withIndex: access index
    flowOf("a", "b", "c")
        .withIndex()
        .collect { (index, value) ->
            println("[$index] $value")
        }
}
```

### FlatMap Variants

```kotlin
fun main() = runBlocking {
    val flow = (1..3).asFlow()

    // flatMapConcat: sequential, results emitted one after another
    flow.flatMapConcat { value ->
        flow {
            delay(value * 100L)
            emit("Concat: $value")
        }
    }.collect { println(it) }

    // flatMapMerge: concurrent, order may differ
    flow.flatMapMerge(concurrency = 2) { value ->
        flow {
            delay(value * 100L)
            emit("Merge: $value")
        }
    }.collect { println(it) }

    // flatMapLatest: cancel previous when new value arrives
    flowOf(1, 2, 3)
        .flatMapLatest { value ->
            flow {
                emit("Start $value")
                delay(200)
                emit("End $value")
            }
        }
        .collect { println(it) }

    // mapLatest: map with cancellation
    (1..10).asFlow()
        .mapLatest { value ->
            delay(100)
            value * 2
        }
        .collect { println(it) }
}
```

### Scan

```kotlin
fun main() = runBlocking {
    // scan (fold accumulator emitting intermediate results)
    flowOf(1, 2, 3, 4, 5)
        .scan(0) { acc, value -> acc + value }
        .collect { println(it) }

    // Output: 0, 1, 3, 6, 10, 15

    // Practical: running total
    data class Transaction(val amount: Double, val runningTotal: Double)

    flowOf(
        Transaction(100.0, 0.0),
        Transaction(-50.0, 0.0),
        Transaction(200.0, 0.0),
    ).scan(0.0) { acc, tx ->
        tx.copy(runningTotal = acc + tx.amount)
    }.collect { println(it.runningTotal) }
}
```

---

## 4. Filtering Operators

```kotlin
fun main() = runBlocking {
    val flow = (1..10).asFlow()

    // filter
    flow.filter { it % 2 == 0 }
        .collect { println(it) }

    // filterNot
    flow.filterNot { it % 2 == 0 }
        .collect { println(it) }

    // filterNotNull
    flowOf(1, null, 2, null, 3)
        .filterNotNull()
        .collect { println(it) }

    // take
    flow.take(3)
        .collect { println(it) }

    // drop
    flow.drop(7)
        .collect { println(it) }

    // distinctUntilChanged
    flowOf(1, 1, 2, 2, 3, 1, 1)
        .distinctUntilChanged()
        .collect { println(it) } // 1, 2, 3, 1

    // debounce (from kotlinx-coroutines-core 1.6+)
    flow {
        emit(1)
        delay(100)
        emit(2)
        delay(500)
        emit(3)
    }.debounce(300)
        .collect { println(it) } // 2, 3

    // sample
    flow {
        repeat(10) {
            emit(it)
            delay(100)
        }
    }.sample(500)
        .collect { println(it) } // ~0, ~5, ~9
}
```

---

## 5. Combining Flows

### Zip

```kotlin
fun main() = runBlocking {
    val flow1 = (1..4).asFlow()
    val flow2 = flowOf("A", "B", "C", "D", "E")

    // Zip: pairs values by index, stops when shortest flow completes
    flow1.zip(flow2) { num, letter ->
        "$num: $letter"
    }.collect { println(it) }

    // Output:
    // 1: A
    // 2: B
    // 3: C
    // 4: D
}
```

### Combine

```kotlin
fun main() = runBlocking {
    val searchQuery = MutableStateFlow("")
    val filterCategory = MutableStateFlow("all")

    // Combine: emits when any source emits, uses latest values
    searchQuery.combine(filterCategory) { query, category ->
        "Search: '$query' in '$category'"
    }.collect { println(it) }

    searchQuery.value = "kotlin"
    searchQuery.value = "coroutines"
    filterCategory.value = "programming"

    // Output:
    // Search: '' in 'all'
    // Search: 'kotlin' in 'all'
    // Search: 'coroutines' in 'all'
    // Search: 'coroutines' in 'programming'
}
```

### Merge

```kotlin
fun main() = runBlocking {
    val flow1 = flowOf(1, 2, 3).delayEach(100)
    val flow2 = flowOf("A", "B", "C").delayEach(150)

    // Merge: interleaves emissions
    merge(
        flow1.map { "Number: $it" },
        flow2.map { "Letter: $it" },
    ).collect { println(it) }

    // Output:
    // Number: 1
    // Number: 2
    // Letter: A
    // Number: 3
    // Letter: B
    // Letter: C
}
```

---

## 6. Error Handling

### Catch Operator

```kotlin
fun main() = runBlocking {
    // catch: handles upstream exceptions only
    flow {
        emit(1)
        emit(2)
        throw RuntimeException("Error!")
        emit(3)
    }.catch { e ->
        println("Caught: ${e.message}")
        emit(-1) // Can emit fallback values
    }.collect { println(it) }

    // Output:
    // 1
    // 2
    // Caught: Error!
    // -1

    // catch does NOT handle exceptions from downstream operators or collect
    flowOf(1, 2, 3)
        .catch { println("Never reached") }
        .map {
            if (it == 2) throw RuntimeException("Downstream error")
            it
        }
        .catch { println("Downstream catch: ${it.message}") } // Need another catch
        .collect { println(it) }
}
```

### Retry

```kotlin
fun main() = runBlocking {
    var attempts = 0

    // retry: retry on exception
    flow {
        attempts++
        if (attempts < 3) throw RuntimeException("Attempt $attempts failed")
        emit("Success after $attempts attempts")
    }
        .retry(3) { cause ->
            println("Retrying after: ${cause.message}")
            cause is RuntimeException // Only retry on certain exceptions
        }
        .collect { println(it) }

    // retryWhen: fine-grained retry control
    flow {
        throw RuntimeException("Database timeout")
    }
        .retryWhen { cause, attempt ->
            if (attempt >= 3) return@retryWhen false
            println("Retry attempt $attempt")
            delay(100 * (attempt + 1)) // Exponential backoff
            return@retryWhen true
        }
        .onEmpty { println("All retries exhausted") }
        .catch { println("Final error: ${it.message}") }
        .collect { println(it) }
}
```

### OnCompletion

```kotlin
fun main() = runBlocking {
    flowOf(1, 2, 3)
        .onCompletion { cause ->
            if (cause != null) {
                println("Flow completed with exception: $cause")
            } else {
                println("Flow completed successfully")
            }
        }
        .catch { /* handled */ }
        .collect { println(it) }

    // With error
    flow {
        emit(1)
        throw RuntimeException("Boom")
    }
        .onCompletion { cause ->
            println("Completed with: ${cause?.message}")
        }
        .catch { println("Caught: ${it.message}") }
        .collect { println(it) }
}
```

---

## 7. Flow Lifecycle

### OnStart and OnEach

```kotlin
fun main() = runBlocking {
    flowOf(1, 2, 3)
        .onStart {
            println("Flow started")
            emit(0) // Can emit additional values at start
        }
        .onEach {
            println("Processing: $it")
            if (it == 2) throw RuntimeException("Error on $it")
        }
        .catch { println("Error: ${it.message}") }
        .collect()
}
```

### OnEmpty

```kotlin
fun main() = runBlocking {
    // onEmpty: executed when flow completes without emitting
    emptyFlow<Int>()
        .onEmpty {
            println("No elements emitted")
            emit(0)
        }
        .collect { println(it) }

    // Not triggered when there are emissions
    flowOf(1)
        .onEmpty { println("Not printed") }
        .collect { println(it) }
}
```

### LaunchIn

```kotlin
fun main() = runBlocking {
    // launchIn: non-blocking collection in a separate coroutine
    flowOf(1, 2, 3)
        .onEach {
            println("Processing: $it on ${Thread.currentThread().name}")
        }
        .catch { println("Error: $it") }
        .onCompletion { println("Flow completed") }
        .launchIn(CoroutineScope(Dispatchers.Default))

    delay(500) // Wait for collection
    println("Main continues")
}
```

---

## 8. Backpressure and Buffering

### Buffer

```kotlin
import kotlin.system.measureTimeMillis

fun main() = runBlocking {
    val time = measureTimeMillis {
        flow {
            repeat(10) {
                delay(100) // Slow producer
                emit(it)
            }
        }
            .buffer(5) // Buffer up to 5 elements
            .collect { value ->
                delay(300) // Even slower consumer
                println("Received $value")
            }
    }
    println("Total time: ${time}ms")
    // Without buffer: ~4000ms (10 * 100 + 10 * 300)
    // With buffer: ~3100ms (10 * 100 + 3 * 300 + buffer overlap)
}
```

### Conflate

```kotlin
fun main() = runBlocking {
    // conflate: only keep latest value
    flow {
        repeat(10) {
            delay(100)
            emit(it)
        }
    }
        .conflate()
        .collect { value ->
            delay(500) // Slow consumer
            println("Processed: $value")
        }

    // Only processes latest values, drops intermediate
    // Output: 0, 1, 3, 5, 7, 9 (approximate)
}
```

### CollectLatest

```kotlin
fun main() = runBlocking {
    // collectLatest: cancel previous processing when new value arrives
    flow {
        repeat(10) {
            delay(100)
            emit(it)
        }
    }
        .collectLatest { value ->
            println("Starting $value")
            delay(500) // Will be cancelled when new value arrives
            println("Finished $value")
        }

    // Only the last value completes processing
    // Output: Starting 0, Starting 1, ..., Starting 9, Finished 9
}
```

---

## 9. StateFlow and SharedFlow

### StateFlow

```kotlin
import kotlinx.coroutines.flow.*

// StateFlow: State holder with a single current value
// Always has a value, conflated (only latest matters)
// Replays the latest value to new collectors

class OrderStateMachine {
    private val _state = MutableStateFlow(OrderState.IDLE)
    val state: StateFlow<OrderState> = _state.asStateFlow()

    fun startOrder() {
        if (_state.value == OrderState.IDLE) {
            _state.value = OrderState.PENDING
        }
    }

    fun confirmOrder() {
        _state.value = OrderState.CONFIRMED
    }

    fun failOrder(error: String) {
        _state.value = OrderState.FAILED(error)
    }
}

enum class OrderState {
    IDLE, PENDING, CONFIRMED
}

data class OrderState(
    val status: String,
    val items: List<String>,
) {
    companion object {
        val IDLE = OrderState(status = "idle", items = emptyList())
    }

    fun copy(status: String = this.status, items: List<String> = this.items): OrderState {
        return OrderState(status, items)
    }
}

// StateFlow behavior
fun main() = runBlocking {
    val state = MutableStateFlow(0)

    val collector1 = launch {
        state.collect { println("Collector 1: $it") }
    }

    delay(10)
    state.value = 1
    state.value = 2
    state.value = 3

    delay(10)
    val collector2 = launch {
        state.collect { println("Collector 2: $it") }
    }

    state.value = 4
    delay(10)
    collector1.cancel()
    collector2.cancel()

    // Output:
    // Collector 1: 0
    // Collector 1: 1
    // Collector 1: 2
    // Collector 1: 3
    // Collector 1: 4
    // Collector 2: 3 (replays latest value)
    // Collector 2: 4
}
```

### SharedFlow

```kotlin
// SharedFlow: Event bus, no initial value, configurable replay and buffer

class OrderEventBus {
    private val _events = MutableSharedFlow<OrderEvent>(
        replay = 0, // Don't replay past events
        extraBufferCapacity = 64,
        onBufferOverflow = BufferOverflow.DROP_OLDEST,
    )
    val events: SharedFlow<OrderEvent> = _events.asSharedFlow()

    suspend fun publish(event: OrderEvent) {
        _events.emit(event)
    }

    // Non-suspending publish if needed
    fun publishBlocking(event: OrderEvent) {
        _events.tryEmit(event) // Returns false if buffer full
    }
}

sealed class OrderEvent {
    data class Created(val orderId: String) : OrderEvent()
    data class Updated(val orderId: String, val changes: List<String>) : OrderEvent()
    data class Cancelled(val orderId: String, val reason: String) : OrderEvent()
}

fun main() = runBlocking {
    val eventBus = OrderEventBus()

    launch {
        eventBus.events.collect { event ->
            println("Received: $event")
        }
    }

    delay(100)
    eventBus.publish(OrderEvent.Created("1"))
    eventBus.publish(OrderEvent.Updated("1", listOf("status")))
    eventBus.publish(OrderEvent.Cancelled("1", "user request"))

    delay(100)
}
```

### SharedFlow Configuration

```kotlin
// Various SharedFlow configurations

// Event bus (no replay, drop overflow)
val eventBus = MutableSharedFlow<Event>(
    replay = 0,
    extraBufferCapacity = 128,
    onBufferOverflow = BufferOverflow.DROP_OLDEST,
)

// Cache with replay (store last N values)
val recentOrders = MutableSharedFlow<Order>(
    replay = 10,
    extraBufferCapacity = 0,
)

// No buffer at all (suspending emit)
val tightFlow = MutableSharedFlow<CriticalEvent>(
    replay = 0,
    extraBufferCapacity = 0,
)
```

---

## 10. Reactive Streams Interop

### Flow to Reactor

```kotlin
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.reactive.*
import reactor.core.publisher.Flux
import reactor.core.publisher.Mono

// Convert Flow to Flux
fun Flow<Order>.toFlux(): Flux<Order> = this.asFlux()

// Convert Flow to Mono (first element)
suspend fun Flow<Order>.toMono(): Mono<Order> = this.asMono()

// Example
class OrderService {
    fun streamOrders(): Flow<Order> = flow {
        var page = 0
        do {
            val result = repository.findAll(PageRequest.of(page++, 100))
            result.forEach { emit(it) }
        } while (result.hasNext())
    }

    fun streamOrdersAsFlux(): Flux<Order> {
        return streamOrders().asFlux()
    }
}
```

### Reactor to Flow

```kotlin
import reactor.core.publisher.Flux
import reactor.core.publisher.Mono
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.reactive.*

// Convert Flux to Flow
fun Flux<Order>.toFlow(): Flow<Order> = this.asFlow()

// Convert Mono to Flow
fun Mono<Order>.toFlow(): Flow<Order> = this.asFlow()

// Convert Mono to suspend
suspend fun <T> Mono<T>.await(): T = this.awaitSingle()

// Example
class ExternalServiceClient {
    private val webClient: WebClient

    fun getOrders(customerId: String): Flow<Order> {
        return webClient.get()
            .uri("/api/customers/{id}/orders", customerId)
            .retrieve()
            .bodyToFlux(Order::class.java)
            .asFlow()
    }
}
```

### Reactive Sequence Conversion

```kotlin
fun main() = runBlocking {
    // Flow to Flux
    val flux: Flux<Int> = flowOf(1, 2, 3).asFlux()

    // Flux to Flow
    val flow: Flow<Int> = Flux.just(4, 5, 6).asFlow()

    // Mono to suspend
    val user: User = Mono.just(User("Alice")).awaitSingle()

    // Flow to Mono
    val mono: Mono<User> = flowOf(User("Bob")).asMono()

    // Observable to Flow (RxJava2)
    // import kotlinx.coroutines.reactive.*
    // Observable.just(1, 2, 3).toFlow(BackpressureStrategy.BUFFER).asFlow()
}
```

---

## 11. Spring WebFlux Integration

### Reactive Controllers

```kotlin
import kotlinx.coroutines.flow.*
import org.springframework.web.bind.annotation.*
import reactor.core.publisher.Flux
import reactor.core.publisher.Mono

@RestController
@RequestMapping("/api/orders")
class OrderController(private val service: OrderService) {

    // Return Flow directly (Spring converts to Flux)
    @GetMapping
    fun findAll(): Flow<Order> {
        return service.findAll()
    }

    @GetMapping("/{id}")
    suspend fun findById(@PathVariable id: String): Order {
        return service.findById(id)
    }

    @PostMapping
    suspend fun create(@RequestBody request: CreateOrderRequest): Order {
        return service.create(request)
    }

    // SSE (Server-Sent Events)
    @GetMapping(value = ["/stream"], produces = [MediaType.TEXT_EVENT_STREAM_VALUE])
    fun stream(): Flux<OrderEvent> {
        return service.eventStream().asFlux()
    }
}
```

### Reactive Service Layer

```kotlin
@Service
class OrderService(
    private val repository: ReactiveOrderRepository,
    private val inventoryClient: InventoryClient,
) {
    // Return Flow from reactive repository
    fun findAll(): Flow<Order> {
        return repository.findAll().asFlow()
    }

    suspend fun findById(id: String): Order {
        return repository.findById(id).awaitSingle()
    }

    // Complex reactive flow
    fun findAvailable(): Flow<Order> {
        return repository.findByStatus("pending")
            .asFlow()
            .map { order ->
                val available = inventoryClient.checkAvailability(order.items)
                order.copy(available = available)
            }
            .filter { it.available }
    }

    // Reactive transaction
    @Transactional
    suspend fun placeOrder(request: CreateOrderRequest): Order {
        val order = Order(
            id = UUID.randomUUID().toString(),
            customerId = request.customerId,
            items = request.items,
            status = "pending",
        )
        val saved = repository.save(order).awaitSingle()
        inventoryClient.reserve(saved.items).awaitSingle()
        return saved
    }
}
```

### Reactive RestClient

```kotlin
import org.springframework.web.reactive.function.client.*
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.reactive.*

@Service
class InventoryClient(private val webClient: WebClient) {

    fun checkAvailability(items: List<OrderItem>): Flow<AvailabilityResult> {
        return webClient.post()
            .uri("/api/inventory/check")
            .bodyValue(CheckRequest(items))
            .retrieve()
            .bodyToFlux(AvailabilityResult::class.java)
            .asFlow()
    }

    suspend fun reserve(items: List<OrderItem>): ReservationResult {
        return webClient.post()
            .uri("/api/inventory/reserve")
            .bodyValue(ReserveRequest(items))
            .retrieve()
            .bodyToMono(ReservationResult::class.java)
            .awaitSingle()
    }
}
```

---

## 12. Ktor Streaming

### SSE with Ktor

```kotlin
import io.ktor.server.routing.*
import io.ktor.server.html.*
import io.ktor.server.netty.*
import io.ktor.http.*
import io.ktor.server.response.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*

fun Application.module() {
    routing {
        get("/api/orders/stream") {
            call.response.header(HttpHeaders.ContentType, ContentType.Text.EventStream.toString())
            call.response.header(HttpHeaders.CacheControl, "no-cache")
            call.response.header("Connection", "keep-alive")

            // Stream using Flow
            val flow = orderService.streamUpdates()

            flow.collect { order ->
                val data = """data: {"id":"${order.id}","status":"${order.status}"}"""
                call.response.write(data)
                call.response.write("\n\n")
                call.response.flush()
            }
        }

        // Streaming with response.content
        get("/api/stream") {
            call.respondTextWriter(
                contentType = ContentType.Text.EventStream
            ) {
                flow {
                    var counter = 0
                    while (counter < 10) {
                        emit(++counter)
                        delay(1000)
                    }
                }.collect { count ->
                    write("data: count=$count\n\n")
                    flush()
                }
            }
        }
    }
}
```

### WebSocket with Ktor

```kotlin
import io.ktor.server.routing.*
import io.ktor.server.websocket.*
import io.ktor.websocket.*
import kotlinx.coroutines.flow.*

fun Application.module() {
    install(WebSockets)

    routing {
        webSocket("/api/orders/ws") {
            send(Frame.Text("Connected"))

            // Receive messages
            launch {
                for (frame in incoming) {
                    if (frame is Frame.Text) {
                        val text = frame.readText()
                        // Process received message
                    }
                }
            }

            // Send updates using Flow
            val updates = orderService.streamUpdates()
            updates.collect { order ->
                val json = """{"id":"${order.id}","status":"${order.status}"}"""
                send(Frame.Text(json))
            }
        }
    }
}
```

---

## 13. Reactive Database Access

### R2DBC

```kotlin
import org.springframework.data.r2dbc.repository.*
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.reactive.*

// Reactive repository with R2DBC
interface OrderRepository : R2dbcRepository<Order, String> {
    @Query("SELECT * FROM orders WHERE customer_id = :customerId")
    fun findByCustomerId(customerId: String): Flux<Order>

    @Query("SELECT * FROM orders WHERE status = :status ORDER BY created_at DESC")
    fun findByStatus(status: String): Flow<Order>
}

// Service using reactive DB
@Service
class OrderService(private val repository: OrderRepository) {

    fun findByCustomer(customerId: String): Flow<Order> {
        return repository.findByCustomerId(customerId).asFlow()
    }

    suspend fun countByStatus(status: String): Long {
        return repository.countByStatus(status).awaitSingle()
    }

    // Pagination with Flow
    fun findAllPaged(pageSize: Int = 100): Flow<Order> = flow {
        var page = 0
        var hasMore = true
        while (hasMore) {
            val orders = repository.findAll(
                PageRequest.of(page++, pageSize)
            ).asFlow().toList()
            orders.forEach { emit(it) }
            hasMore = orders.size == pageSize
        }
    }
}
```

### MongoDB Reactive

```kotlin
import org.springframework.data.mongodb.repository.ReactiveMongoRepository
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.reactive.*

interface OrderMongoRepository : ReactiveMongoRepository<Order, String> {
    fun findByCustomerId(customerId: String): Flux<Order>
    fun findByStatusIn(statuses: List<String>): Flux<Order>
}

@Service
class MongoOrderService(private val repository: OrderMongoRepository) {

    fun findByStatuses(statuses: List<String>): Flow<Order> {
        return repository.findByStatusIn(statuses).asFlow()
    }

    suspend fun aggregateByCustomer(): Flow<CustomerAggregation> {
        return repository.findAll()
            .asFlow()
            .groupBy { it.customerId }
            .map { (customerId, orders) ->
                CustomerAggregation(
                    customerId = customerId,
                    totalOrders = orders.count(),
                    totalAmount = orders.sumOf { it.totalAmount },
                )
            }
    }
}
```

---

## 14. Testing Reactive Flows

### Basic Flow Testing

```kotlin
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.test.*
import org.junit.jupiter.api.Test
import kotlin.test.*

class OrderFlowTest {

    @Test
    fun `test simple flow`() = runTest {
        val flow = flowOf(1, 2, 3)

        val result = flow.toList()
        assertEquals(listOf(1, 2, 3), result)
    }

    @Test
    fun `test flow transformation`() = runTest {
        val flow = (1..5).asFlow()
            .map { it * 2 }
            .filter { it > 5 }

        val result = flow.toList()
        assertEquals(listOf(6, 8, 10), result)
    }

    @Test
    fun `test error handling`() = runTest {
        val flow = flow {
            emit(1)
            throw RuntimeException("Error")
        }.catch { emit(-1) }

        val result = flow.toList()
        assertEquals(listOf(1, -1), result)
    }
}
```

### Testing with Virtual Time

```kotlin
class FlowVirtualTimeTest {

    @Test
    fun `test delay with virtual time`() = runTest {
        val flow = flow {
            emit(1)
            delay(1000)
            emit(2)
        }

        val result = mutableListOf<Int>()
        val job = launch {
            flow.collect { result.add(it) }
        }

        assertEquals(1, result.size) // Only first value
        assertEquals(listOf(1), result.toList())

        advanceTimeBy(1000)
        assertEquals(listOf(1, 2), result.toList())

        job.cancel()
    }

    @Test
    fun `test debounce with virtual time`() = runTest {
        val flow = flow {
            emit(1)
            delay(50)
            emit(2)
            delay(50)
            emit(3)
            delay(500)
            emit(4)
        }.debounce(200)

        val result = mutableListOf<Int>()
        val job = launch {
            flow.collect { result.add(it) }
        }

        advanceUntilIdle()
        assertEquals(listOf(3, 4), result.toList())

        job.cancel()
    }
}
```

### Testing StateFlow

```kotlin
class StateFlowTest {

    @Test
    fun `test StateFlow value updates`() = runTest {
        val stateFlow = MutableStateFlow(0)

        val emitted = mutableListOf<Int>()
        val job = launch {
            stateFlow.collect { emitted.add(it) }
        }

        stateFlow.value = 1
        stateFlow.value = 2
        stateFlow.value = 3

        // StateFlow remembers all values (conflated doesn't drop)
        assertEquals(listOf(0, 1, 2, 3), emitted.toList())

        job.cancel()
    }

    @Test
    fun `test StateFlow with deduplication`() = runTest {
        val stateFlow = MutableStateFlow(0)
        val deduplicated = mutableListOf<Int>()

        val job = launch {
            stateFlow
                .distinctUntilChanged()
                .collect { deduplicated.add(it) }
        }

        stateFlow.value = 0 // Same value - should not emit
        stateFlow.value = 1
        stateFlow.value = 1 // Same value - should not emit
        stateFlow.value = 2

        assertEquals(listOf(0, 1, 2), deduplicated.toList())

        job.cancel()
    }
}
```

---

## 15. Performance

### Flow Performance Characteristics

```kotlin
// Flow is generally very fast due to:
// - No allocation per emission (inline operators)
// - No reflection-based dispatch
// - Coroutine-based (suspension vs blocking)

fun main() = runBlocking {
    val count = 1_000_000

    // Measure throughput
    val time = measureTimeMillis {
        (1..count).asFlow()
            .map { it * 2 }
            .filter { it % 3 == 0 }
            .collect()
    }
    println("Processed $count elements in ${time}ms")
}
```

### When to Use Flow vs Alternative

```kotlin
// Use Flow when:
// - Multiple values over time (streaming)
// - Backpressure matters
// - Complex data pipelines
// - Reactive integrations (WebFlux, R2DBC)

// Use suspend when:
// - Single async value
// - Simple async operation
// - Fire-and-forget operation

// Use Channel when:
// - Point-to-point communication
// - Producer/consumer patterns
// - Hot data streams needing buffer

// Use Collections when:
// - In-memory data processing
// - Small data sets
// - No async operations needed
```

---

## 16. Anti-Patterns

### Common Mistakes

```kotlin
// Anti-pattern 1: Blocking inside a Flow
fun badFlow(): Flow<Order> = flow {
    val orders = repository.findAll() // Blocking call in flow builder
    orders.forEach { emit(it) }
}

// Correct: Use withContext
fun goodFlow(): Flow<Order> = flow {
    emitAll(repository.findAllAsync())
}.flowOn(Dispatchers.IO)

// Anti-pattern 2: Collecting flow from non-coroutine context
fun badCollect(flow: Flow<Int>) {
    runBlocking {
        flow.collect { println(it) }
    }
}

// Correct: Use appropriate scope
fun goodCollect(flow: Flow<Int>, scope: CoroutineScope) {
    scope.launch {
        flow.collect { println(it) }
    }
}

// Anti-pattern 3: Using launch {} inside flow builder
fun badFlow(): Flow<Int> = flow {
    launch { // This launch is not structured!
        emit(1)
    }
}

// Correct: Use channelFlow for concurrent emission
fun goodFlow(): Flow<Int> = channelFlow {
    launch {
        send(1)
    }
    launch {
        send(2)
    }
}
```

### Flow Collection Pitfalls

```kotlin
// Anti-pattern: Terminal operator outside scope
suspend fun processForever() {
    flow<Int> {
        // infinite flow
    }.collect { /* never returns */ }
}

// Anti-pattern: Missing cancellation check
flow {
    for (i in 0..10_000_000) {
        // should check cancellation
        emit(i)
    }
}

// Correct: Check cancellation or use cancellable
flow {
    for (i in 0..10_000_000) {
        ensureActive() // Check cancellation
        emit(i)
    }
}.cancellable().collect()
```

---

## References

- Kotlin Flow Guide: https://kotlinlang.org/docs/flow.html
- StateFlow and SharedFlow: https://kotlinlang.org/api/kotlinx.coroutines/kotlinx-coroutines-core/kotlinx.coroutines.flow/-state-flow/
- Spring WebFlux: https://docs.spring.io/spring-framework/reference/web/webflux.html
- Ktor Streaming: https://ktor.io/docs/response.html#stream
- R2DBC: https://r2dbc.io/
- Reactive Streams: https://www.reactive-streams.org/
