# iOS Architecture — MVVM, Coordinator, Combine, Swift Concurrency

## MVVM with Coordinator

### Coordinator Pattern
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
    private let di: DIContainer

    init(navigationController: UINavigationController, di: DIContainer) {
        self.navigationController = navigationController
        self.di = di
    }

    func start() {
        showOrders()
    }

    private func showOrders() {
        let coordinator = OrderCoordinator(
            navigationController: navigationController,
            di: di
        )
        addChild(coordinator)
        coordinator.onFinish = { [weak self] in
            self?.removeChild(coordinator)
        }
        coordinator.start()
    }
}

final class OrderCoordinator: Coordinator {
    let navigationController: UINavigationController
    var childCoordinators: [Coordinator] = []
    var onFinish: (() -> Void)?
    private let di: DIContainer

    func start() {
        let vm = OrderListViewModel(
            getOrdersUseCase: di.getOrdersUseCase
        )
        let vc = OrderListViewController(viewModel: vm)

        vm.onSelectOrder = { [weak self] order in
            self?.showOrderDetail(order)
        }

        navigationController.pushViewController(vc, animated: true)
    }

    private func showOrderDetail(_ order: Order) {
        let vm = OrderDetailViewModel(order: order)
        let vc = OrderDetailViewController(viewModel: vm)
        navigationController.pushViewController(vc, animated: true)
    }
}
```

### ViewModel
```swift
@MainActor
final class OrderListViewModel: ObservableObject {
    @Published private(set) var orders: [Order] = []
    @Published private(set) var isLoading = false
    @Published private(set) var error: String?

    var onSelectOrder: ((Order) -> Void)?

    private let getOrdersUseCase: GetOrdersUseCase
    private var loadTask: Task<Void, Never>?

    init(getOrdersUseCase: GetOrdersUseCase) {
        self.getOrdersUseCase = getOrdersUseCase
    }

    func loadOrders() {
        loadTask?.cancel()
        loadTask = Task { [weak self] in
            guard let self = self else { return }
            self.isLoading = true
            self.error = nil

            do {
                let stream = try await self.getOrdersUseCase.execute()
                for try await orders in stream {
                    self.orders = orders
                    self.isLoading = false
                }
            } catch {
                if !(error is CancellationError) {
                    self.error = error.localizedDescription
                    self.isLoading = false
                }
            }
        }
    }

    func selectOrder(_ order: Order) {
        onSelectOrder?(order)
    }

    deinit {
        loadTask?.cancel()
    }
}
```

## Combine Framework

### Publishers and Subscribers
```swift
import Combine

final class CombineViewModel: ObservableObject {
    @Published var searchText = ""
    @Published var results: [SearchResult] = []
    @Published var isSearching = false

    private var cancellables = Set<AnyCancellable>()

    init(service: SearchService) {
        // Debounced search
        $searchText
            .debounce(for: .milliseconds(300), scheduler: DispatchQueue.main)
            .removeDuplicates()
            .filter { $0.count >= 2 || $0.isEmpty }
            .map { text -> AnyPublisher<[SearchResult], Never> in
                guard !text.isEmpty else {
                    return Just([]).eraseToAnyPublisher()
                }
                return service.search(query: text)
                    .catch { _ in Just([]) }
                    .eraseToAnyPublisher()
            }
            .switchToLatest() // Cancel previous search on new input
            .receive(on: DispatchQueue.main)
            .assign(to: &$results)
    }
}
```

### Combine + SwiftUI Integration
```swift
struct OrderListView: View {
    @StateObject private var viewModel: OrderListViewModel

    var body: some View {
        List {
            if viewModel.isLoading {
                ProgressView()
            }
            ForEach(viewModel.orders, id: \.id) { order in
                OrderRow(order: order)
                    .onTapGesture { viewModel.selectOrder(order) }
            }
        }
        .task { await viewModel.loadOrders() }
        .overlay {
            if let error = viewModel.error {
                Text(error).foregroundColor(.red)
            }
        }
    }
}
```

## async/await Concurrency

### Structured Concurrency
```swift
actor OrderService {
    private let api: APIClient
    private let cache: OrderCache

    func fetchOrders() async throws -> [Order] {
        // Structured concurrency: tasks are automatically cancelled
        async let remote = try api.fetchOrders()
        async let cached = cache.loadOrders()

        do {
            let orders = try await remote
            await cache.save(orders)
            return orders
        } catch {
            // Fallback to cache on network failure
            return try await cached
        }
    }

    func fetchOrderWithDetails(id: String) async throws -> OrderDetails {
        // Three parallel requests
        async let order = try api.fetchOrder(id: id)
        async let history = try api.fetchOrderHistory(id: id)
        async let related = try api.fetchRelatedOrders(id: id)

        return try await OrderDetails(
            order: order,
            history: history,
            related: related
        )
    }
}
```

### Task Groups
```swift
func fetchAllOrders(for ids: [String]) async throws -> [Order] {
    try await withThrowingTaskGroup(of: Order.self) { group in
        for id in ids {
            group.addTask {
                try await api.fetchOrder(id: id)
            }
        }

        var orders: [Order] = []
        for try await order in group {
            orders.append(order)
        }
        return orders
    }
}

// Timeout pattern
func fetchWithTimeout() async throws -> Order {
    try await withThrowingTaskGroup(of: Order.self) { group in
        group.addTask {
            try await self.api.fetchOrder(id: "123")
        }

        group.addTask {
            try await Task.sleep(nanoseconds: 5_000_000_000)
            throw TimeoutError()
        }

        let result = try await group.next()! // First to complete wins
        group.cancelAll() // Cancel remaining tasks
        return result
    }
}
```

### MainActor Usage
```swift
@MainActor
final class MainActorViewModel: ObservableObject {
    @Published var data: [Item] = []

    // Automatically runs on main actor
    func updateUI() {
        data = loadSynchronously()
    }

    // Explicit main actor for non-UI work
    @MainActor
    func reload() async {
        let result = await fetchData() // Background thread
        data = result // Main actor (implicit due to @MainActor class)
    }

    // Call from non-main context
    nonisolated func backgroundWork() {
        // Can't access @Published or @MainActor properties here
        Task { @MainActor in
            self.updateUI()
        }
    }
}
```

## Swift 6 Data Race Safety

### Sendable and @Sendable
```swift
// Sendable types can be safely passed across concurrency domains
struct Order: Sendable {
    let id: String
    let amount: Double
}

// Class with internal locking
final class Cache: @unchecked Sendable {
    private let lock = NSLock()
    private var storage: [String: Data] = [:]

    func get(_ key: String) -> Data? {
        lock.lock()
        defer { lock.unlock() }
        return storage[key]
    }
}

// @Sendable closures
func fetchAndProcess(_ process: @Sendable (Data) async throws -> Data) async throws -> Data {
    let data = try await fetch()
    return try await process(data) // Safe to call concurrently
}
```

### Actor Isolation
```swift
actor OrderActor {
    private var orders: [String: Order] = [:]
    private var pendingOperations: Int = 0

    func addOrder(_ order: Order) {
        orders[order.id] = order
        pendingOperations += 1
    }

    func getOrder(id: String) -> Order? {
        orders[id]
    }

    // Cross-actor access must be async
    // let order = await orderActor.getOrder(id: "123")
}

// Non-isolated function that accesses actor
extension OrderActor {
    nonisolated func createDiagnostic() -> String {
        "OrderActor with \(pendingOperations) operations"
        // Warning: can't access actor-isolated state from nonisolated
    }
}
```

## Dependency Injection

```swift
// Manual DI (preferred over frameworks)
final class DIContainer {
    // Singletons
    lazy var apiClient: APIClient = {
        APIClient(session: .shared, baseURL: config.apiURL)
    }()

    lazy var orderCache: OrderCache = {
        OrderCache()
    }()

    // Services
    lazy var orderService: OrderService = {
        OrderService(api: apiClient, cache: orderCache)
    }()

    // Use Cases
    lazy var getOrdersUseCase: GetOrdersUseCase = {
        GetOrdersUseCase(service: orderService)
    }()

    // Config
    private let config = AppConfig.shared
}
```

## Platform Architecture Comparison

| Pattern | State Management | Navigation | Testability | Complexity |
|---|---|---|---|---|
| MVVM + Coordinator | ObservableObject / @Published | Coordinator objects | High | Medium |
| TCA (The Composable Architecture) | Reducer + Store | StackNavigation | High | High |
| VIPER | Separate presenter/entity | Wireframes | Very High | High |
| MVC | Massive ViewController | Segues/storyboards | Low | Low |
| MVP | Presenter delegates | Coordinator | Medium | Medium |
