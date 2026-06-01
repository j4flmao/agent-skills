---
name: android
description: >
  Use this skill when the user asks about Android development, Kotlin, Jetpack
  Compose, Android architecture, MVVM, Clean Architecture, Room, Hilt, Retrofit,
  or Android testing.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [mobile, android, phase-4]
---

# Android Native

## Purpose
Implement Android native applications using Kotlin, Jetpack Compose, MVVM+Clean Architecture, Coroutines+Flow, Hilt DI, Room, and comprehensive testing.

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

## Workflow

### Step 1: Set Up Project Structure
Organize code with Clean Architecture layers: data, domain, ui, and di with feature-based packaging.

### Step 2: Implement Domain Layer
Define domain models, repository interfaces, and use cases independent of framework dependencies.

### Step 3: Implement Data Layer
Set up Room database with DAOs and entities, Retrofit API service, and repository implementations bridging local and remote sources.

### Step 4: Configure Dependency Injection
Set up Hilt modules for database, network, and repository bindings with appropriate scopes.

### Step 5: Build UI with Jetpack Compose
Create ViewModels with StateFlow, Compose screens with state collection, and handle loading/error/success states.

### Step 6: Write Tests
Cover domain use cases with JUnit + MockK unit tests and UI screens with Compose + Espresso UI tests.

## Architecture Decision Trees

### Architecture Selection
```
App complexity?
├── Simple CRUD (<10 screens, no complex state)
│   → MVVM + Repository — ViewModel → Repository → API/DB
│   → No UseCase layer needed
├── Complex state (real-time, multi-step forms)
│   → MVI with sealed Intent/State classes, reducer pattern
│   → Single state object per screen
└── Large codebase (5+ teams, shared domain)
    → Clean Architecture with strict layer separation
    → Domain module shared across features
```

### DI Strategy
```
Team preference?
├── Annotation-based → Hilt
│   Pros: compile-time verification, @HiltViewModel, less boilerplate
│   Cons: slower build, kapt/ksp overhead
├── Manual DI → Koin
│   Pros: no annotation processing, fast builds, easy to learn
│   Cons: runtime errors for missing bindings
└── Compiler-assisted → Dagger (raw)
    Pros: most control, mature
    Cons: steep learning curve, verbose
```

### Navigation Approach
```
Single-activity?
├── Yes → Jetpack Navigation Compose
│   NavHost with sealed Route class, type-safe arguments
├── Multi-activity → Navigation component with XML
└── Feature-modules → Dynamic feature navigation with NavDeepLink
```

### Image Loading Strategy
```
Network images needed?
├── Yes, Coil — Kotlin coroutines, Compose integration, memory-efficient
└── Yes, Glide — Mature, animated GIF/WebP, disk cache, OK
    Coil preferred for new projects — lighter (150KB vs ~500KB)
```

### Background Work Strategy
```
WorkManager vs Foreground Service vs AlarmManager
├── Deferrable, reliable → WorkManager (constraints, chaining, battery-optimized)
├── User-visible must continue → Foreground Service (notification required)
└── Exact timing needed → AlarmManager (limited, consider ScheduleTaskExecutor)
```

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
    private val _state = MutableStateFlow<OrderUiState>(OrderUiState.Loading)
    val state: StateFlow<OrderUiState> = _state.asStateFlow()

    fun loadOrders() {
        viewModelScope.launch {
            _state.value = OrderUiState.Loading
            getOrders()
                .onSuccess { _state.value = OrderUiState.Success(it) }
                .onFailure { _state.value = OrderUiState.Error(it.message) }
        }
    }
}

sealed interface OrderUiState {
    data object Loading : OrderUiState
    data class Success(val orders: List<Order>) : OrderUiState
    data class Error(val message: String?) : OrderUiState
}

// ui/orders/OrderListScreen.kt
@Composable
fun OrderListScreen(
    viewModel: OrderViewModel = hiltViewModel(),
    onOrderClick: (String) -> Unit
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) { viewModel.loadOrders() }

    when (val s = state) {
        is OrderUiState.Loading -> CircularProgressIndicator()
        is OrderUiState.Error -> ErrorMessage(s.message, onRetry = viewModel::loadOrders)
        is OrderUiState.Success -> LazyColumn {
            items(s.orders, key = { it.id }) { order ->
                OrderCard(order = order, onClick = { onOrderClick(order.id) })
            }
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

    @Query("DELETE FROM orders WHERE id = :id")
    suspend fun deleteById(id: String)
}

// data/local/AppDatabase.kt
@Database(entities = [OrderEntity::class], version = 1, exportSchema = true)
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
            .addConverterFactory(MoshiConverterFactory.create())
            .addCallAdapterFactory(CoroutineCallAdapterFactory())
            .client(OkHttpClient.Builder()
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .addInterceptor(HttpLoggingInterceptor().apply {
                    level = if (BuildConfig.DEBUG) BODY else NONE
                })
                .build())
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
        return Room.databaseBuilder(ctx, AppDatabase::class.java, "app-db")
            .fallbackToDestructiveMigration()
            .build()
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

    @Test
    fun `returns failure when repository fails`() = runTest {
        coEvery { repo.getOrders() } returns Result.failure(IOException("Network error"))

        val result = useCase()

        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is IOException)
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
        every { viewModel.state } returns MutableStateFlow(
            OrderUiState.Success(listOf(
                Order("1", "Alice", 50.0, OrderStatus.PENDING)
            ))
        ).asStateFlow()

        composeTestRule.setContent {
            OrderListScreen(viewModel = viewModel, onOrderClick = {})
        }

        composeTestRule.onNodeWithText("Alice").assertIsDisplayed()
    }

    @Test
    fun showsErrorState() {
        val viewModel = mockk<OrderViewModel>()
        every { viewModel.state } returns MutableStateFlow(
            OrderUiState.Error("Failed to load")
        ).asStateFlow()

        composeTestRule.setContent {
            OrderListScreen(viewModel = viewModel, onOrderClick = {})
        }

        composeTestRule.onNodeWithText("Failed to load").assertIsDisplayed()
    }
}
```

## Compose Performance Patterns

```kotlin
// Stable data classes — Compose skips recomposition when inputs are stable
@Stable
data class OrderUiModel(val id: String, val name: String, val total: Double)

// derivedStateOf for expensive computations
val totalPrice by remember(orders) {
    derivedStateOf { orders.sumOf { it.total } }
}

// LazyColumn keys for stable identity
items(orders, key = { it.id }) { order -> OrderCard(order) }

// Remember lambda to avoid allocation on recomposition
val onItemClick = remember { { id: String -> onOrderClick(id) } }

// ContentType for list-item differentiation
items(orders, key = { it.id }, contentType = { "order" }) { ... }
```

## Compose Modifier Best Practices

- Modifier order matters: `size` → `padding` → `background` → `clickable` (outer to inner)
- Klibs `Modifier.composed` for reusable modifier chains
- Avoid `Modifier.absoluteOffset` — prefer `Modifier.offset` for RTL support
- `Modifier.clipToBounds()` to prevent content overflow
- `Modifier.alpha(0f)` vs `Modifier.visible(false)` — invisible keeps layout space, gone releases it

## Production Considerations

- ProGuard/R8 rules: keep `@Keep` annotations, Moshi adapters, Retrofit interfaces
- Network security config for certificate pinning
- Baseline Profiles for startup optimization (30%+ faster cold start)
- LeakCanary for memory leak detection in debug builds
- Chucker for network inspection in debug builds
- StrictMode for detecting disk/network on main thread during development
- App Startup library for ordered, lazy SDK initialization

## Kotlin Coroutines & Flow Best Practices

- `viewModelScope.launch` for fire-and-forget operations (logging, analytics)
- `viewModelScope.async` for concurrent decomposition (parallel API calls)
- `flatMapLatest` for search-as-you-type debounced queries
- `stateIn(WhileSubscribed(5000))` to keep upstream active for 5s after last subscriber
- `catch { emit(UiState.Error(it)) }` for error recovery in Flow chains
- `Retrofit suspend functions` are main-safe — no need to wrap with `withContext(IO)`
- Room DAO `Flow` automatically runs on background thread
- `Dispatchers.IO` for blocking operations, `Dispatchers.Default` for CPU-heavy work

## Package Structure Options

```
Feature-first (recommended for medium+ apps):
com.example.app/
├── feature/orders/
│   ├── data/ local/ remote/ repository/
│   ├── domain/ model/ repository/ usecase/
│   └── ui/ OrderListScreen OrderViewModel
├── core/ network/ database/ di/ testing/

Layer-first (simple apps):
com.example.app/
├── data/
├── domain/
├── ui/
└── di/
```

## Anti-Patterns

- **God ViewModels**: ViewModel handling logic for multiple screens — split per screen
- **Repository exposing raw data sources**: Never return `ApiResult` or `DbModel` — map to domain models
- **Hilt unscoped bindings**: Always declare scope — unscoped = new instance every injection
- **CollectAsState instead of collectAsStateWithLifecycle**: Without lifecycle awareness, collection leaks when screen is in background
- **MutableStateFlow exposure**: Expose as `StateFlow`, keep `MutableStateFlow` private
- **Using GlobalScope**: Never use `GlobalScope.launch` — creates leaked coroutines tied to app process
- **Main thread DB access**: Room on main thread throws — use `suspend` functions or `Flow`
- **Ignoring configuration changes**: State in ViewModel survives rotation; state in `remember` does not
- **Deep layout hierarchy**: Compose recomposes deeply nested layouts inefficiently — keep composable depth <10 levels

## Rules

- Repository interfaces belong in domain layer; implementations in data layer
- ViewModels expose state via StateFlow, never expose mutable state
- Hilt modules must declare explicit scopes — no unscoped bindings for singletons
- Room operations on IO thread — use coroutine dispatchers or Room's built-in threading
- Compose screens collect StateFlow with collectAsStateWithLifecycle, not collectAsState
- Use sealed interfaces for UI state to represent loading, success, and error
- DI modules are in a separate package — never scatter provides across feature packages
- Baseline Profiles for all release builds targeting startup performance
- Compose Modifier order: size → padding → background → clickable (outside-in)
- Navigation routes defined in a single sealed class — never stringly-typed routes
- Image loading via Coil in Compose with `AsyncImage` or `rememberAsyncImagePainter`
- ProGuard rules must keep all Moshi/Retrofit/Kotlin serialization classes

## References
  - references/android-advanced.md — Android Advanced Topics
  - references/android-architecture.md — Android Architecture — MVVM + Clean Architecture
  - references/android-fundamentals.md — Android Fundamentals
  - references/compose-performance.md — Jetpack Compose Performance Optimization
  - references/hilt-di.md — Hilt Dependency Injection
  - references/jetpack-compose.md — Jetpack Compose
  - references/testing.md — Android Testing
## Handoff

Hand off to `mobile/universal/deployment/SKILL.md` for deployment.
