# Kotlin Testing with MockK Reference

## Basic MockK Setup

Add MockK to your Gradle build:

```kotlin
dependencies {
    testImplementation("io.mockk:mockk:1.13.9")
    testImplementation("org.jetbrains.kotlin:kotlin-test:1.9.22")
}
```

## Creating Mocks

```kotlin
// Relaxed mock — returns default values for unstubbed calls
val repo = mockk<OrderRepository>(relaxed = true)

// Strict mock — throws on unstubbed calls
val repo = mockk<OrderRepository>()

// Mock with relaxed unit functions
val eventBus = mockk<EventBus>(relaxUnitFun = true)

// Spy on real object
val realService = spy(OrderService(repo, eventBus))
```

### Stubbing

```kotlin
// Simple return
every { repo.findById("123") } returns Order("cust-1", 99.99)

// Return nothing (Unit)
every { repo.save(any()) } just Runs

// Throw
every { repo.findById("999") } throws AppException.NotFound("Order", "999")

// Answer with lambda
every { repo.findById(any()) } answers {
    val id = firstArg<String>()
    if (id.startsWith("test")) Order("test", 10.0) else null
}

// Multiple answers
every { repo.findById(any()) } returnsMany listOf(
    Order("cust-1", 10.0),
    Order("cust-2", 20.0),
    null
)
```

## Coroutine Support

```kotlin
class OrderServiceTest {
    private val repo = mockk<OrderRepository>()
    private val service = OrderService(repo)
    
    @Test
    fun `suspend function mock`() = runTest {
        // coEvery for suspend functions
        coEvery { repo.findById("123") } returns Order("cust-1", 99.99)
        
        val result = service.findById("123")
        
        assertEquals("cust-1", result.customerId)
    }
    
    @Test
    fun `suspend function verify`() = runTest {
        coEvery { repo.save(any()) } returns Order("cust-1", 50.0)
        
        service.createOrder(CreateOrderRequest("cust-1", listOf(...)))
        
        // coVerify for suspend functions
        coVerify { repo.save(any()) }
        coVerify(exactly = 1) { repo.save(match { it.total > 0 }) }
        coVerify(exactly = 0) { repo.save(match { it.total <= 0 }) }
    }
}
```

## Verification

```kotlin
class VerificationTest {
    private val repo = mockk<OrderRepository>()
    private val service = OrderService(repo)
    
    @Test
    fun `verify call count`() = runTest {
        coEvery { repo.findById(any()) } returns Order("cust-1", 10.0)
        
        service.findById("1")
        service.findById("2")
        
        coVerify(exactly = 2) { repo.findById(any()) }
        coVerify(atLeast = 1) { repo.findById(any()) }
        coVerify(atMost = 3) { repo.findById(any()) }
        coVerify(exactly = 0) { repo.delete(any()) }
    }
    
    @Test
    fun `verify argument matching`() {
        every { repo.save(any()) } returns Unit
        
        service.updateOrder("123", UpdateRequest(status = "SHIPPED"))
        
        verify { repo.save(match { it.id == "123" && it.status == "SHIPPED" }) }
        verify { repo.save(assert { order ->
            assertNotNull(order)
            assertEquals("123", order.id)
        })}
    }
    
    @Test
    fun `verify order`() = runTest {
        coEvery { repo.save(any()) } returns Order("cust-1", 10.0)
        
        service.createOrder(...)
        
        coVerifyOrder {
            repo.save(any())
        }
    }
}
```

## Slot Capture

```kotlin
@Test
fun `capture argument`() = runTest {
    val slot = slot<Order>()
    coEvery { repo.save(capture(slot)) } answers { slot.captured }
    
    val request = CreateOrderRequest("cust-1", listOf(
        CreateOrderItem("SKU-1", 2, Money(29.99))
    ))
    service.createOrder(request)
    
    val savedOrder = slot.captured
    assertEquals("cust-1", savedOrder.customerId)
    assertEquals(1, savedOrder.items.size)
    assertEquals(Money(59.98), savedOrder.total)
}
```

## Timeout Verification

```kotlin
@Test
fun `verify within timeout`() = runTest {
    coEvery { repo.findById(any()) } coAnswers {
        delay(50)
        Order("cust-1", 10.0)
    }
    
    val result = runBlocking {
        withTimeout(1000) {
            service.findById("123")
        }
    }
    
    assertEquals("cust-1", result.customerId)
}
```

## Partial Mocking (Spy)

```kotlin
@Test
fun `spy on real object`() {
    val repo = PostgresOrderRepository(database)
    val spy = spyk(repo)
    
    every { spy.findById("special") } returns Order("special", 999.99)
    every { spy.findById(any<String>()) } answers { callOriginal() }
    
    assertEquals(Order("special", 999.99), spy.findById("special"))
    // Real method called for other IDs
    assertNotNull(spy.findById("normal-id"))
}
```

## Slot and MutableList Captors

```kotlin
@Test
fun `capture multiple calls`() {
    val slot = mutableListOf<Order>()
    every { repo.save(capture(slot)) } returns Unit
    
    repo.save(Order("1", 10.0))
    repo.save(Order("2", 20.0))
    repo.save(Order("3", 30.0))
    
    assertEquals(3, slot.size)
    assertEquals("1", slot[0].id)
    assertEquals("3", slot[2].id)
}
```

## Hierarchical Mocking

```kotlin
@Test
fun `hierarchical mocking`() {
    val order = mockk<Order> {
        every { id } returns "order-123"
        every { status } returns OrderStatus.PENDING
        every { items } returns listOf(
            mockk {
                every { sku } returns "SKU-1"
                every { quantity } returns 2
            }
        )
    }
    
    assertEquals("order-123", order.id)
    assertEquals("SKU-1", order.items[0].sku)
}
```

## Clearing Mocks

```kotlin
@Test
fun `mock lifecycle`() {
    val repo = mockk<OrderRepository>()
    
    // Clear all stubs and recorded calls
    clearMocks(repo)
    
    // Clear only recorded calls, keep stubs
    clearMocks(repo, answers = false, recordedCalls = true)
    
    // Clear all
    clearMocks(repo, answers = true, recordedCalls = true, verificationMarks = true)
}
```

## Key Points

- `mockk()` creates strict mocks; `mockk(relaxed = true)` returns defaults
- `coEvery`/`coVerify` handles suspend functions
- `capture(slot)` captures arguments for assertions
- `spyk()` creates partial mocks over real objects
- `every { ... } returns` / `every { ... } throws` define stubbing
- `verify(exactly = N)` checks invocation count
- `match { ... }` provides custom argument matching
- `answers { ... }` computes return values at call time
- Hierarchical mocking simulates complex object graphs
- `clearMocks` resets stub state between tests
