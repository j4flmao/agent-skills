# Mobile Architecture Patterns

Cross-platform guide to structuring mobile apps: layering, presentation patterns (MVVM, MVI, unidirectional data flow), navigation ownership, dependency injection, and modularization, with equivalents for iOS (SwiftUI), Android (Jetpack Compose), Flutter and React Native.

## Reference Layering

```text
┌──────────────────────────────┐
│ UI (views / composables /    │  renders state, forwards user intents
│ widgets / components)        │
├──────────────────────────────┤
│ Presentation (ViewModel,     │  holds UI state, maps domain → UI, handles intents
│ Bloc/Notifier, store)        │
├──────────────────────────────┤
│ Domain (use cases, models)   │  optional; pure business rules, no framework imports
├──────────────────────────────┤
│ Data (repositories)          │  single source of truth, caching, sync
│  ├─ remote data source (HTTP/GraphQL)
│  └─ local data source (DB, key-value, files)
└──────────────────────────────┘
```

Dependencies point downward. The domain layer is optional: add it when logic is shared across screens or complex enough to test in isolation; skip it for thin CRUD screens. Android's official architecture guide follows this shape (UI layer, optional domain layer, data layer).

## Presentation Patterns

| Pattern | State | Events | Good for |
|---------|-------|--------|----------|
| MVVM | Observable properties on ViewModel | Method calls | Most apps; idiomatic on Android and SwiftUI |
| MVI / UDF | Single immutable `UiState` | Intents/actions reduced into new state | Complex screens, reproducible state |
| Redux-style store | Global store + reducers | Actions | Shared cross-screen state (RN/web teams) |
| BLoC | Streams of states | Events | Flutter teams wanting explicit event → state |
| MVC (UIKit legacy) | Controller-owned | Delegates | Maintenance of older UIKit code |

Unidirectional data flow is the common denominator: state flows down to UI, events flow up to the state holder.

## Platform Equivalents

| Concern | iOS (SwiftUI) | Android (Compose) | Flutter | React Native |
|---------|---------------|-------------------|---------|--------------|
| State holder | `@Observable` class (iOS 17+) or `ObservableObject` | `ViewModel` + `StateFlow` | `Notifier` (Riverpod), `Bloc`/`Cubit` | Zustand/Redux Toolkit store, hooks |
| Observe in UI | `@State`/`@Bindable` | `collectAsStateWithLifecycle()` | `ref.watch` / `BlocBuilder` | hooks / selectors |
| Async | `async/await`, `Task` | Coroutines, `viewModelScope` | `Future`/`Stream` | Promises, TanStack Query |
| DI | Initializer injection, Factory/Swinject | Hilt / Koin | Riverpod providers, get_it | Context/providers, module factories |
| Navigation | `NavigationStack` + path | Navigation Compose (type-safe routes) | go_router | React Navigation / Expo Router |

## Examples

### Android (Compose + ViewModel)
```kotlin
data class OrdersUiState(
    val isLoading: Boolean = false,
    val orders: List<OrderUi> = emptyList(),
    val error: String? = null,
)

@HiltViewModel
class OrdersViewModel @Inject constructor(
    private val repo: OrderRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(OrdersUiState(isLoading = true))
    val state: StateFlow<OrdersUiState> = _state.asStateFlow()

    init { refresh() }

    fun refresh() = viewModelScope.launch {
        _state.update { it.copy(isLoading = true, error = null) }
        runCatching { repo.fetchOrders() }
            .onSuccess { list -> _state.update { it.copy(isLoading = false, orders = list.map(::toUi)) } }
            .onFailure { e -> _state.update { it.copy(isLoading = false, error = e.message) } }
    }
}

@Composable
fun OrdersRoute(vm: OrdersViewModel = hiltViewModel()) {
    val state by vm.state.collectAsStateWithLifecycle()
    OrdersScreen(state = state, onRetry = vm::refresh)
}
```

`runCatching` also catches `CancellationException`; in production code rethrow it so cancellation propagates.

### iOS (SwiftUI + Observation)
```swift
@MainActor
@Observable
final class OrdersViewModel {
    private(set) var orders: [OrderUI] = []
    private(set) var isLoading = false
    private(set) var errorMessage: String?
    private let repo: OrderRepository

    init(repo: OrderRepository) { self.repo = repo }

    func refresh() async {
        isLoading = true
        defer { isLoading = false }
        do {
            orders = try await repo.fetchOrders().map(OrderUI.init)
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

struct OrdersView: View {
    @State var model: OrdersViewModel
    var body: some View {
        List(model.orders) { OrderRow(order: $0) }
            .overlay { if model.isLoading { ProgressView() } }
            .task { await model.refresh() }
            .refreshable { await model.refresh() }
    }
}
```

### Flutter (Riverpod)
```dart
@riverpod
class Orders extends _$Orders {
  @override
  Future<List<Order>> build() => ref.watch(orderRepositoryProvider).fetchOrders();

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => ref.read(orderRepositoryProvider).fetchOrders());
  }
}
```

## Repository as Single Source of Truth

- UI observes the local store (DB/cache); network responses write into it. This gives offline support and consistent state across screens.
- Repositories expose streams/flows (`Flow<List<Order>>`, `AsyncStream`, `Stream`) plus explicit `refresh()`.
- Map DTOs to domain models at the data boundary; never leak transport types to UI.

## Navigation Ownership

- Navigation decisions live in the presentation layer as events or route state, not inside data code.
- Deep links resolve to typed routes in one place (see deep-linking skill).
- Pass IDs between screens, not large objects; the destination loads from the repository.

## Modularization

| Module type | Contains | Depends on |
|-------------|----------|------------|
| `app` | Entry point, DI graph, navigation host | features, core |
| `feature-*` | Screens + ViewModels for one feature | core, domain/data APIs |
| `core-ui` / design system | Shared components, theme | — |
| `core-data` / `core-network` / `core-database` | Repositories, clients | — |
| `domain` | Use cases, models | — |

Rules: features never depend on other features (communicate via navigation and shared data modules); keep the graph acyclic; build time and ownership boundaries are the main reasons to split.

## Choosing

| Situation | Choice |
|-----------|--------|
| Small app, few screens | MVVM, no domain layer, single module |
| Complex screen state/forms | MVI-style single `UiState` |
| Multiple teams | Feature modules with clear APIs |
| Shared logic across iOS/Android | Kotlin Multiplatform for data/domain, native UI |

## Pitfalls

- ViewModels holding references to views/contexts (leaks).
- Business logic in views/composables/widgets.
- Multiple mutable sources of truth for the same entity.
- Collecting flows without lifecycle awareness (work continues in background).
- God "BaseViewModel" classes accumulating unrelated helpers.

## Checklist

- [ ] Clear UI → presentation → (domain) → data layering
- [ ] Unidirectional data flow with immutable UI state
- [ ] Repository is the single source of truth
- [ ] DI used for repositories and clients; no global singletons in tests
- [ ] Feature modules independent of each other
