# Android Testing

## Unit Test (JUnit 5 + MockK)
```kotlin
class OrderRepositoryTest {
    private val api = mockk<ApiService>()
    private val dao = mockk<OrderDao>()
    private val repo = OrderRepositoryImpl(api, dao)

    @Test
    fun `getOrders fetches from remote and caches locally`() = runTest {
        val remoteOrders = listOf(OrderResponse("1", "Alice", 100.0))
        coEvery { api.getOrders() } returns remoteOrders
        coEvery { dao.insertAll(any()) } just runs

        val result = repo.getOrders()

        assertTrue(result.isSuccess)
        coVerify { dao.insertAll(any()) }
    }

    @Test
    fun `getOrders falls back to local on network error`() = runTest {
        coEvery { api.getOrders() } throws IOException("Network error")
        coEvery { dao.getAll() } returns flowOf(listOf(OrderEntity("1", "Alice", 100.0, "PENDING")))

        val result = repo.getOrders()

        assertTrue(result.isSuccess)
    }
}
```

## UI Test (Compose + Espresso)
```kotlin
@RunWith(AndroidJUnit4::class)
class OrderDetailScreenTest {
    @get:Rule val composeTestRule = createComposeRule()

    @Test
    fun showsOrderDetails() {
        val order = Order("1", "Alice", 100.0, OrderStatus.DELIVERED)
        composeTestRule.setContent { OrderDetailScreen(order) }
        composeTestRule.onNodeWithText("Alice").assertIsDisplayed()
        composeTestRule.onNodeWithText("$100.0").assertIsDisplayed()
    }
}
```

## Room Test
```kotlin
@RunWith(AndroidJUnit4::class)
class OrderDaoTest {
    private lateinit var db: AppDatabase
    private lateinit var dao: OrderDao

    @Before fun createDb() {
        db = Room.inMemoryDatabaseBuilder(
            ApplicationProvider.getApplicationContext(), AppDatabase::class.java
        ).build()
        dao = db.orderDao()
    }

    @After fun closeDb() = db.close()

    @Test
    fun insertAndRead() = runTest {
        val order = OrderEntity("1", "Alice", 100.0, "PENDING")
        dao.insertAll(listOf(order))
        val orders = dao.getAll().first()
        assertEquals(1, orders.size)
    }
}
```
