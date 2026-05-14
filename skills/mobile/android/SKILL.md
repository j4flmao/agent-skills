---
name: android
description: Android native development — Kotlin, Jetpack Compose, MVVM+Clean, Coroutines+Flow, Hilt, Room, JUnit+Espresso.
---

# Android Native

## Agent Protocol

### Trigger
User request includes: `android`, `kotlin`, `jetpack`, `compose`, `android architecture`, `android testing`, `room`, `hilt`.

### Input Context
- Android SDK version (compileSdk / minSdk / targetSdk)
- Kotlin version
- Build system (Gradle KTS)
- Architecture pattern (MVVM, Clean, MVI)

### Output Artifact
A markdown document containing:
- Project structure
- Jetpack Compose setup
- MVVM+Clean Architecture
- Coroutines+Flow concurrency
- Hilt dependency injection
- Room database setup
- JUnit + Espresso test plan

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick.

### Max Response Length
4096 tokens

## Project Structure

```
app/
├── src/main/java/com/example/app/
│   ├── App.kt
│   ├── MainActivity.kt
│   ├── data/
│   │   ├── local/
│   │   │   ├── AppDatabase.kt
│   │   │   ├── OrderDao.kt
│   │   │   └── OrderEntity.kt
│   │   ├── remote/
│   │   │   ├── ApiService.kt
│   │   │   └── OrderResponse.kt
│   │   └── repository/
│   │       └── OrderRepositoryImpl.kt
│   ├── di/
│   │   ├── AppModule.kt
│   │   ├── DatabaseModule.kt
│   │   └── NetworkModule.kt
│   ├── domain/
│   │   ├── model/
│   │   │   └── Order.kt
│   │   ├── repository/
│   │   │   └── OrderRepository.kt
│   │   └── usecase/
│   │       └── GetOrdersUseCase.kt
│   └── ui/
│       ├── orders/
│       │   ├── OrderListScreen.kt
│       │   ├── OrderDetailScreen.kt
│       │   └── OrderViewModel.kt
│       └── theme/
└── src/test/
    └── ...
```

## MVVM + Clean Architecture

```kotlin
// domain/model/Order.kt
data class Order(
    val id: String,
    val customerName: String,
    val total: Double,
    val status: OrderStatus
)

enum class OrderStatus { PENDING, SHIPPED, DELIVERED }

// domain/repository/OrderRepository.kt
interface OrderRepository {
    suspend fun getOrders(): Result<List<Order>>
    suspend fun getOrder(id: String): Result<Order>
}

// domain/usecase/GetOrdersUseCase.kt
class GetOrdersUseCase(private val repo: OrderRepository) {
    suspend operator fun invoke(): Result<List<Order>> = repo.getOrders()
}
```

## Jetpack Compose UI

```kotlin
// ui/orders/OrderViewModel.kt
@HiltViewModel
class OrderViewModel @Inject constructor(
    private val getOrders: GetOrdersUseCase
) : ViewModel() {
    private val _orders = MutableStateFlow<List<Order>>(emptyList())
    val orders: StateFlow<List<Order>> = _orders.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    fun loadOrders() {
        viewModelScope.launch {
            _isLoading.value = true
            getOrders().onSuccess { _orders.value = it }
            _isLoading.value = false
        }
    }
}

// ui/orders/OrderListScreen.kt
@Composable
fun OrderListScreen(
    viewModel: OrderViewModel = hiltViewModel(),
    onOrderClick: (String) -> Unit
) {
    val orders by viewModel.orders.collectAsStateWithLifecycle()
    val isLoading by viewModel.isLoading.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) { viewModel.loadOrders() }

    LazyColumn {
        items(orders, key = { it.id }) { order ->
            OrderCard(order = order, onClick = { onOrderClick(order.id) })
        }
    }
}

@Composable
fun OrderCard(order: Order, onClick: () -> Unit) {
    Card(modifier = Modifier.clickable(onClick = onClick)) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(text = order.customerName, style = MaterialTheme.typography.titleMedium)
            Text(text = "$${order.total}", style = MaterialTheme.typography.bodyLarge)
        }
    }
}
```

## Room Database

```kotlin
// data/local/OrderEntity.kt
@Entity(tableName = "orders")
data class OrderEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "customer_name") val customerName: String,
    val total: Double,
    val status: String
)

// data/local/OrderDao.kt
@Dao
interface OrderDao {
    @Query("SELECT * FROM orders")
    fun getAll(): Flow<List<OrderEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(orders: List<OrderEntity>)
}

// data/local/AppDatabase.kt
@Database(entities = [OrderEntity::class], version = 1)
abstract class AppDatabase : RoomDatabase() {
    abstract fun orderDao(): OrderDao
}
```

## Hilt DI

```kotlin
// di/AppModule.kt
@Module
@InstallIn(SingletonComponent::class)
object AppModule {
    @Provides @Singleton
    fun provideOrderRepository(
        api: ApiService,
        dao: OrderDao
    ): OrderRepository = OrderRepositoryImpl(api, dao)
}

// di/NetworkModule.kt
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    @Provides @Singleton
    fun provideApiService(): ApiService {
        return Retrofit.Builder()
            .baseUrl("https://api.example.com/")
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ApiService::class.java)
    }
}

// di/DatabaseModule.kt
@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {
    @Provides @Singleton
    fun provideDatabase(@ApplicationContext ctx: Context): AppDatabase {
        return Room.databaseBuilder(ctx, AppDatabase::class.java, "app-db").build()
    }

    @Provides fun provideOrderDao(db: AppDatabase): OrderDao = db.orderDao()
}
```

## Testing

### Unit Test (JUnit + MockK)

```kotlin
class GetOrdersUseCaseTest {
    private val repo = mockk<OrderRepository>()
    private val useCase = GetOrdersUseCase(repo)

    @Test
    fun `returns orders successfully`() = runTest {
        val orders = listOf(Order("1", "Test", 100.0, OrderStatus.PENDING))
        coEvery { repo.getOrders() } returns Result.success(orders)

        val result = useCase()

        assertTrue(result.isSuccess)
        assertEquals(orders, result.getOrThrow())
    }
}
```

### UI Test (Compose + Espresso)

```kotlin
@RunWith(AndroidJUnit4::class)
class OrderListScreenTest {
    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun displaysOrders() {
        val viewModel = mockk<OrderViewModel>()
        every { viewModel.orders } returns MutableStateFlow(
            listOf(Order("1", "Alice", 50.0, OrderStatus.PENDING))
        ).asStateFlow()

        composeTestRule.setContent {
            OrderListScreen(viewModel = viewModel, onOrderClick = {})
        }

        composeTestRule.onNodeWithText("Alice").assertIsDisplayed()
    }
}
```

## References

### Reference Files
- `references/jetpack-compose.md` — Compose navigation, state hoisting, animations
- `references/hilt-di.md` — Hilt modules, scopes, ViewModel injection
- `references/testing.md` — JUnit, MockK, Espresso, Compose UI test

### Related Skills
- `mobile/universal/deployment/SKILL.md` — Play Console, CI/CD, testing
- `backend/universal/api-response/SKILL.md` — REST API response design

## Handoff

Hand off to `mobile/universal/deployment/SKILL.md` for deployment.
