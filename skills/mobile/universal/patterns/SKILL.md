---
name: mobile-patterns
description: >
  Use this skill when the user asks about mobile architecture patterns, MVVM,
  MVI, Clean Architecture, Coordinator, Navigator, Repository pattern, UseCase,
  or dependency injection in mobile apps.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [mobile, patterns, phase-4, universal]
---

# Mobile Architecture Patterns

## Purpose
Select and implement cross-platform mobile architecture patterns including MVVM, MVI, Clean Architecture, Coordinator, and Repository patterns.

## Agent Protocol

### Trigger
User request includes: `mobile pattern`, `mobile architecture`, `mvvm`, `mvi`, `clean architecture mobile`, `coordinator`, `navigator pattern`, `mobile project structure`, `mobile folder structure`, `mobile di`.

### Input Context
- Platform (iOS, Android, Flutter, React Native)
- Architecture approach (MVVM, MVI, Clean, TCA)
- DI framework (Hilt, Swinject, GetIt, manual)

### Output Artifact
A markdown document containing:
- Architecture pattern selection guide
- Folder structure matching the pattern
- Data flow diagram (text)
- Key code snippets for the chosen pattern

### Response Format
No preamble. No postamble. No explanations.

### Max Response Length
4096 tokens

## Decision Trees

### Architecture Pattern Selection

```
App complexity?
├── Simple CRUD, list/detail, <10 screens
│   └── MVVM + Repository (minimal abstraction, well-known)
├── Complex state (real-time, multi-step, concurrent updates)
│   └── MVI (unidirectional, predictable, sealed intents/state)
├── Large codebase, 5+ teams, shared domain logic
│   └── Clean Architecture (strict boundaries, modular)
└── Swift-only, complex state, composable
    └── TCA (The Composable Architecture, SwiftUI-native)
```

### DI Framework Selection

```
Platform?
├── Android
│   ├── Hilt (standard, Dagger wrapper, @HiltViewModel)
│   └── Koin (lightweight, Kotlin DSL, no annotation processing)
├── iOS
│   ├── Swinject (runtime DI, container, assembly)
│   └── Factory (Swift macros, compile-time safe)
├── Flutter
│   ├── GetIt (service locator, simple, fast)
│   └── Riverpod (declarative, auto-dispose, testable)
└── React Native
    ├── InversifyJS (decorators, container)
    └── Manual context-based DI (React Context + hooks)
```

### Navigation Pattern Selection

```
Navigation complexity?
├── Simple linear flow (login → home → detail)
│   └── Built-in navigation (NavigationStack, NavHost, Stack)
├── Deep linking, conditional flows, auth state
│   └── Coordinator pattern (navigation extracted from views)
├── Tab-based with nested stacks
│   └── ShellRoute (Flutter), Tab Navigator (RN)
└── Complex onboarding/wizard with branching
    └── Coordinator with child coordinators
```

## Workflow

### Step 1: Identify Architecture Requirements
Assess team size, app complexity, testing requirements, and platform constraints.

### Step 2: Select Core Pattern
Choose MVVM for standard apps, MVI for complex state, Clean Architecture for large multi-team codebases.

### Step 3: Define Layer Boundaries
Establish dependency rules: presentation depends on domain, domain is pure business logic, data implements domain interfaces.

### Step 4: Separate Navigation
Extract navigation logic into Coordinator/Navigator — views know nothing about other screens.

### Step 5: Set Up Dependency Injection
Configure DI framework with explicit scopes and clear module organization per layer.

## Cross-Platform Pattern Mapping

| Pattern | iOS | Android | Flutter | React Native |
|---|---|---|---|---|
| MVVM | ObservableObject + @Published | ViewModel + StateFlow | ChangeNotifier + Riverpod | useState + Zustand |
| MVI | Combine + enum Intent | MVI + StateFlow + sealed class | BLoC (Event → Bloc → State) | useReducer + dispatch |
| Clean Arch | SPM modules per layer | Gradle modules | Dart packages | Workspace packages |
| Coordinator | Coordinator protocol + child | NavHost + sealed route | GoRouter ShellRoute | React Navigation nesting |

## Rules
- Domain layer must have zero framework dependencies — pure business logic only
- Data layer depends on domain layer — never the reverse
- MVVM: View observes ViewModel state; ViewModel never holds View reference
- MVI: sealed class for intents, single sealed state class, reducer function
- Clean Architecture: outer layers depend on inner layers, never inward
- Coordinator owns navigation — views call coordinator callbacks
- Repository is the single source of truth
- Choose architecture based on app complexity, not trends

## MVVM Implementation

### Android — Jetpack Compose
```kotlin
// ViewModel
@HiltViewModel
class OrderViewModel @Inject constructor(
  private val getOrdersUseCase: GetOrdersUseCase
) : ViewModel() {
  private val _state = MutableStateFlow(OrderUiState())
  val state: StateFlow<OrderUiState> = _state.asStateFlow()

  init { loadOrders() }

  fun onAction(action: OrderAction) {
    when (action) {
      is OrderAction.Refresh -> loadOrders()
      is OrderAction.SelectOrder -> selectOrder(action.id)
    }
  }

  private fun loadOrders() {
    viewModelScope.launch {
      _state.update { it.copy(isLoading = true) }
      getOrdersUseCase().fold(
        onSuccess = { orders ->
          _state.update { it.copy(orders = orders, isLoading = false) }
        },
        onFailure = { error ->
          _state.update { it.copy(error = error.message, isLoading = false) }
        }
      )
    }
  }
}

data class OrderUiState(
  val orders: List<Order> = emptyList(),
  val isLoading: Boolean = false,
  val error: String? = null
)

sealed interface OrderAction {
  data object Refresh : OrderAction
  data class SelectOrder(val id: String) : OrderAction
}

// Composable
@Composable
fun OrderScreen(viewModel: OrderViewModel = hiltViewModel()) {
  val state by viewModel.state.collectAsStateWithLifecycle()
  OrderContent(state = state, onAction = viewModel::onAction)
}
```

### iOS — SwiftUI
```swift
// ViewModel
@MainActor
@Observable
final class OrderViewModel {
  private let getOrdersUseCase: GetOrdersUseCaseProtocol
  var orders: [Order] = []
  var isLoading = false
  var error: String?

  init(getOrdersUseCase: GetOrdersUseCaseProtocol) {
    self.getOrdersUseCase = getOrdersUseCase
  }

  func loadOrders() async {
    isLoading = true
    do {
      orders = try await getOrdersUseCase()
      error = nil
    } catch {
      self.error = error.localizedDescription
    }
    isLoading = false
  }
}

// View
struct OrderView: View {
  @State private var vm: OrderViewModel

  var body: some View {
    List(vm.orders) { order in
      OrderRow(order: order)
    }
    .overlay { if vm.isLoading { ProgressView() } }
    .task { await vm.loadOrders() }
    .refreshable { await vm.loadOrders() }
  }
}
```

### Flutter — Riverpod
```dart
// Provider
@riverpod
class OrderList extends _$OrderList {
  @override
  Future<List<Order>> build() => _fetchOrders();

  Future<List<Order>> _fetchOrders() async {
    final repo = ref.read(orderRepositoryProvider);
    return repo.getOrders();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => _fetchOrders());
  }
}

// View
class OrderScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ordersAsync = ref.watch(orderListProvider);
    return ordersAsync.when(
      data: (orders) => ListView.builder(
        itemCount: orders.length,
        itemBuilder: (_, i) => OrderRow(order: orders[i]),
      ),
      loading: () => const CircularProgressIndicator(),
      error: (e, _) => Text('Error: $e'),
    );
  }
}
```

### React Native — Zustand
```typescript
// Store
import { create } from 'zustand';

interface OrderState {
  orders: Order[];
  isLoading: boolean;
  error: string | null;
  loadOrders: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const useOrderStore = create<OrderState>((set) => ({
  orders: [],
  isLoading: false,
  error: null,
  loadOrders: async () => {
    set({ isLoading: true, error: null });
    try {
      const orders = await orderService.getOrders();
      set({ orders, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },
  refresh: async () => {
    set({ isLoading: true });
    try {
      const orders = await orderService.getOrders();
      set({ orders, isLoading: false });
    } catch (e) {
      set({ isLoading: false });
    }
  },
}));

// Component
function OrderScreen() {
  const { orders, isLoading, loadOrders } = useOrderStore();
  useEffect(() => { loadOrders(); }, []);
  return (
    <FlatList
      data={orders}
      renderItem={({ item }) => <OrderRow order={item} />}
      refreshing={isLoading}
      onRefresh={loadOrders}
    />
  );
}
```

## MVI Implementation

### Android — MVI with StateFlow
```kotlin
// Intent (user actions)
sealed interface OrderIntent {
  data object Load : OrderIntent
  data class Search(val query: String) : OrderIntent
  data class Delete(val id: String) : OrderIntent
}

// State (single source of truth)
data class OrderListState(
  val orders: List<Order> = emptyList(),
  val searchQuery: String = "",
  val isLoading: Boolean = false,
  val error: String? = null
)

// Reducer (pure function)
fun OrderListState.reduce(intent: OrderIntent): OrderListState {
  return when (intent) {
    is OrderIntent.Load -> copy(isLoading = true, error = null)
    is OrderIntent.Search -> copy(searchQuery = intent.query)
    is OrderIntent.Delete -> copy(
      orders = orders.filter { it.id != intent.id }
    )
  }
}

// ViewModel processes intents, emits states
class OrderListViewModel : ViewModel() {
  private val _state = MutableStateFlow(OrderListState())
  val state: StateFlow<OrderListState> = _state.asStateFlow()

  fun process(intent: OrderIntent) {
    _state.update { it.reduce(intent) }
    when (intent) {
      is OrderIntent.Load -> loadOrders()
      is OrderIntent.Search -> searchOrders(intent.query)
      is OrderIntent.Delete -> deleteOrder(intent.id)
    }
  }
}
```

### Flutter — BLoC
```dart
// Event
abstract class OrderEvent {}
class LoadOrders extends OrderEvent {}
class SearchOrders extends OrderEvent { final String query; }

// State
abstract class OrderState {}
class OrderInitial extends OrderState {}
class OrderLoading extends OrderState {}
class OrderLoaded extends OrderState { final List<Order> orders; }
class OrderError extends OrderState { final String message; }

// Bloc
class OrderBloc extends Bloc<OrderEvent, OrderState> {
  final OrderRepository repo;
  OrderBloc(this.repo) : super(OrderInitial()) {
    on<LoadOrders>((event, emit) async {
      emit(OrderLoading());
      try {
        final orders = await repo.getOrders();
        emit(OrderLoaded(orders: orders));
      } catch (e) {
        emit(OrderError(message: e.toString()));
      }
    });
  }
}
```

## Clean Architecture

### Folder Structure
```
project/
├── domain/                    # Pure business logic — zero framework deps
│   ├── model/
│   │   └── Order.kt
│   ├── repository/            # Interfaces only
│   │   └── OrderRepository.kt
│   └── usecase/
│       ├── GetOrdersUseCase.kt
│       └── CreateOrderUseCase.kt
├── data/                      # Implements domain interfaces
│   ├── repository/
│   │   └── OrderRepositoryImpl.kt
│   ├── remote/
│   │   └── OrderApi.kt
│   └── local/
│       ├── OrderDao.kt
│       └── OrderEntity.kt
├── presentation/              # UI framework specific
│   ├── viewmodel/
│   │   └── OrderViewModel.kt
│   ├── screen/
│   │   └── OrderScreen.kt
│   └── navigation/
│       └── OrderNavGraph.kt
└── di/                        # Dependency injection modules
    ├── NetworkModule.kt
    ├── DatabaseModule.kt
    └── RepositoryModule.kt
```

### Dependency Rule
```
presentation/ → domain/ ← data/
Outer layers depend on inner layers. Inner never knows outer.
Domain has no imports from Android, iOS, or platform SDKs.
```

### UseCase Pattern
```kotlin
// domain/usecase/GetOrdersUseCase.kt
class GetOrdersUseCase(
  private val repository: OrderRepository
) {
  suspend operator fun invoke(): Result<List<Order>> {
    return repository.getOrders()
  }
}

// domain/usecase/CreateOrderUseCase.kt
class CreateOrderUseCase(
  private val repository: OrderRepository,
  private val validator: OrderValidator
) {
  suspend operator fun invoke(order: Order): Result<Order> {
    if (!validator.validate(order)) {
      return Result.failure(ValidationException("Invalid order"))
    }
    return repository.createOrder(order)
  }
}
```

## Coordinator / Navigator Pattern

### iOS — Coordinator
```swift
protocol Coordinator: AnyObject {
  var navigationController: UINavigationController { get }
  var childCoordinators: [Coordinator] { get set }
  func start()
}

extension Coordinator {
  func addChild(_ coordinator: Coordinator) {
    childCoordinators.append(coordinator)
  }
  func removeChild(_ coordinator: Coordinator) {
    childCoordinators.removeAll { $0 === coordinator }
  }
}

final class AppCoordinator: Coordinator {
  let navigationController: UINavigationController
  var childCoordinators: [Coordinator] = []

  init(navigationController: UINavigationController) {
    self.navigationController = navigationController
  }

  func start() {
    let vm = OrderListViewModel(onOrderSelected: { [weak self] id in
      self?.showOrderDetail(id)
    })
    let vc = OrderListViewController(viewModel: vm)
    navigationController.pushViewController(vc, animated: false)
  }

  private func showOrderDetail(_ id: String) {
    let child = OrderDetailCoordinator(
      navigationController: navigationController,
      orderId: id
    )
    addChild(child)
    child.onFinish = { [weak self, weak child] in
      guard let child else { return }
      self?.removeChild(child)
    }
    child.start()
  }
}
```

### Android — Navigation Compose
```kotlin
sealed class Route(val route: String) {
  data object OrderList : Route("orders")
  data class OrderDetail(val id: String) : Route("orders/{id}") {
    companion object {
      const val ROUTE = "orders/{id}"
      fun createRoute(id: String) = "orders/$id"
    }
  }
}

@Composable
fun AppNavGraph(navController: NavHostController = rememberNavController()) {
  NavHost(navController, startDestination = Route.OrderList.route) {
    composable(Route.OrderList.route) {
      OrderListScreen(onOrderClick = { id ->
        navController.navigate(Route.OrderDetail.createRoute(id))
      })
    }
    composable(
      route = Route.OrderDetail.ROUTE,
      arguments = listOf(navArgument("id") { type = NavType.StringType })
    ) {
      OrderDetailScreen()
    }
  }
}
```

### Flutter — GoRouter
```dart
final router = GoRouter(
  initialLocation: '/orders',
  routes: [
    ShellRoute(
      builder: (context, state, child) => AppShell(child: child),
      routes: [
        GoRoute(
          path: '/orders',
          builder: (_, __) => const OrderListScreen(),
          routes: [
            GoRoute(
              path: ':id',
              builder: (_, state) => OrderDetailScreen(
                id: state.pathParameters['id']!,
              ),
            ),
          ],
        ),
        GoRoute(path: '/settings', builder: (_, __) => const SettingsScreen()),
      ],
    ),
  ],
);
```

## Repository Pattern

```kotlin
// Repository interface (domain layer)
interface OrderRepository {
  fun getOrders(): Flow<List<Order>>
  suspend fun refreshOrders()
  suspend fun createOrder(order: Order): Order
  suspend fun deleteOrder(id: String)
}

// Repository implementation (data layer)
class OrderRepositoryImpl(
  private val api: OrderApi,
  private val dao: OrderDao,
  private val connectivity: ConnectivityMonitor
) : OrderRepository {
  override fun getOrders(): Flow<List<Order>> {
    return dao.observeAll().map { entities ->
      entities.map { it.toDomain() }
    }
  }

  override suspend fun refreshOrders() {
    if (!connectivity.isOnline()) return
    val remote = api.getOrders()
    dao.upsertAll(remote.map { it.toEntity() })
  }

  override suspend fun createOrder(order: Order): Order {
    val entity = order.toEntity()
    dao.insert(entity)
    if (connectivity.isOnline()) {
      return api.createOrder(order).also { dao.update(it.toEntity()) }
    }
    return order  // Will sync later
  }

  override suspend fun deleteOrder(id: String) {
    dao.delete(id)
    if (connectivity.isOnline()) {
      api.deleteOrder(id)
    }
  }
}
```

## State Management Patterns

### Loading/Error/Success (LES) Wrapper
```kotlin
sealed class UiState<out T> {
  data object Loading : UiState<Nothing>()
  data class Success<T>(val data: T) : UiState<T>()
  data class Error(val message: String, val cause: Throwable? = null) : UiState<Nothing>()
}
```

### Optimistic UI Updates
```typescript
// Zustand — optimistic update with rollback
const useOrderStore = create<OrderState>((set, get) => ({
  deleteOrder: async (id: string) => {
    const previousOrders = get().orders;
    // Optimistic remove
    set((state) => ({
      orders: state.orders.filter((o) => o.id !== id),
    }));
    try {
      await api.deleteOrder(id);  // Confirm on server
    } catch {
      set({ orders: previousOrders });  // Rollback on failure
      throw new Error('Failed to delete order');
    }
  },
}));
```

### Error Boundary Pattern
```swift
enum AsyncResult<T> {
  case idle
  case loading
  case success(T)
  case failure(Error)

  var data: T? {
    if case .success(let value) = self { return value }
    return nil
  }

  var error: Error? {
    if case .failure(let error) = self { return error }
    return nil
  }

  var isLoading: Bool {
    if case .loading = self { return true }
    return false
  }
}
```

## Dependency Injection Setup

### Android — Hilt
```kotlin
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
  @Provides @Singleton
  fun provideOkHttpClient(): OkHttpClient = OkHttpClient.Builder()
    .connectTimeout(10, TimeUnit.SECONDS)
    .build()

  @Provides @Singleton
  fun provideOrderApi(client: OkHttpClient): OrderApi =
    Retrofit.Builder().client(client).build().create(OrderApi::class.java)
}

@Module
@InstallIn(SingletonComponent::class)
object RepositoryModule {
  @Provides @Singleton
  fun provideOrderRepository(api: OrderApi, dao: OrderDao): OrderRepository =
    OrderRepositoryImpl(api, dao)
}
```

### iOS — Swinject
```swift
import Swinject

let container = Container()
container.register(OrderApi.self) { _ in OrderApi() }.inObjectScope(.container)
container.register(OrderDao.self) { _ in OrderDao() }.inObjectScope(.container)
container.register(OrderRepository.self) { r in
  OrderRepositoryImpl(api: r.resolve(OrderApi.self)!, dao: r.resolve(OrderDao.self)!)
}.inObjectScope(.container)
container.register(GetOrdersUseCase.self) { r in
  GetOrdersUseCase(repository: r.resolve(OrderRepository.self)!)
}
container.register(OrderViewModel.self) { r in
  OrderViewModel(getOrdersUseCase: r.resolve(GetOrdersUseCase.self)!)
}
```

### Flutter — GetIt
```dart
final sl = GetIt.instance;

void setupDI() {
  sl.registerLazySingleton<OrderApi>(() => OrderApi());
  sl.registerLazySingleton<OrderDao>(() => OrderDao());
  sl.registerLazySingleton<OrderRepository>(() =>
    OrderRepositoryImpl(api: sl(), dao: sl()));
  sl.registerFactory(() => OrderViewModel(repo: sl()));
}
```

## Anti-Patterns
- **Massive ViewModel**: Thousands of lines with all logic. Decompose into UseCases, separate concerns
- **Leaking framework into domain**: Room annotations, Retrofit types in domain layer. Domain must be pure
- **View holding ViewModel reference**: Prevents garbage collection. ViewModel survives config changes
- **Navigator called from View**: Ties screen to navigation. Use Coordinator callback or navigation event
- **One architecture for every screen**: Different screens need different complexity. Simple screens can use simpler patterns
- **Data layer knowing about presentation**: Returns UI-specific models. Data returns domain models only
- **No UseCase when logic is simple**: Adds boilerplate with no benefit. UseCases only when logic is shared or complex
- **State exposed as mutable object**: Multiple sources of mutation cause race conditions. Expose immutable state only
- **DI creates circular dependencies**: Two classes depending on each other via DI. Extract shared dependency
- **Singletons everywhere**: Global state makes testing impossible. Scope DI to appropriate lifecycle
- **Repository leaking cache details**: Callers should not know about cache strategy. Repository abstracts it

## Testing Patterns

### ViewModel Test (Android)
```kotlin
class OrderViewModelTest {
  private val useCase = mockk<GetOrdersUseCase>()
  private val vm = OrderViewModel(useCase)

  @Test
  fun `load orders emits success state`() = runTest {
    val orders = listOf(Order("1", "Test"))
    coEvery { useCase() } returns Result.success(orders)
    vm.onAction(OrderAction.Refresh)
    val state = vm.state.first { !it.isLoading }
    assertEquals(orders, state.orders)
  }
}
```

### ViewModel Test (iOS)
```swift
@Testable import MyApp

final class OrderViewModelTests: XCTestCase {
  func testLoadOrders() async {
    let mockUseCase = MockGetOrdersUseCase()
    mockUseCase.stubResult = [Order(id: "1", title: "Test")]
    let vm = await OrderViewModel(getOrdersUseCase: mockUseCase)
    await vm.loadOrders()
    let orders = await vm.orders
    XCTAssertEqual(orders.count, 1)
  }
}
```

## Performance Considerations
- ViewModel state should be as flat as possible (minimize data class copies)
- Use `distinctUntilChanged` / `skipRepeats` to avoid unnecessary recomposition
- Debounce search inputs by 300ms before dispatching intents
- Unsubscribe from observers in `onCleared` / `deinit` / `dispose` to prevent leaks
- Prefer `StateFlow` over `LiveData` on Android for better lifecycle handling
- Use `@Stable` annotations on Compose / `equatable` on Flutter to reduce recomposition
- Lazy-load feature modules to reduce cold start time
- Keep UseCases stateless — inject state through parameters
- Profile recomposition counts in debug builds to detect unnecessary redraws

## References
- `references/architecture-patterns.md` — Mobile Architecture Patterns
- `references/clean-arch.md` — Clean Architecture for Mobile
- `references/coordinator.md` — Coordinator / Navigator
- `references/design-patterns.md` — Mobile Design Patterns
- `references/mobile-architecture-patterns.md` — Mobile Architecture Patterns
- `references/mvvm-mvi.md` — MVVM vs MVI

## Handoff
After architecture selection, hand off to:
- `mobile/universal/testing` — Architecture testability, unit testing patterns
- `mobile/universal/networking` — Repository + API layer integration
- `mobile/universal/offline-first` — Offline repository patterns
- `mobile/universal/performance` — Architecture reactivity performance
- `mobile/android` — Jetpack Compose, Hilt, Navigation
- `mobile/ios` — SwiftUI, Combine, Coordinator
- `mobile/flutter` — Riverpod, GoRouter, BLoC
- `mobile/react-native` — Zustand, React Navigation
