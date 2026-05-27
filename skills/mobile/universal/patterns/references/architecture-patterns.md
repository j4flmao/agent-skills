# Mobile Architecture Patterns

## MVVM Pattern

```swift
// View
class ProductViewController: UIViewController {
    private let viewModel: ProductViewModel
    private var cancellables: Set<AnyCancellable> = []

    init(viewModel: ProductViewModel) {
        self.viewModel = viewModel
        super.init(nibName: nil, bundle: nil)
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        viewModel.$state
            .receive(on: DispatchQueue.main)
            .sink { [weak self] state in
                self?.render(state: state)
            }
            .store(in: &cancellables)

        viewModel.loadProduct()
    }

    private func render(state: ProductViewModel.State) {
        switch state {
        case .loading:
            showLoadingIndicator()
        case .loaded(let product):
            updateUI(with: product)
        case .error(let message):
            showError(message: message)
        }
    }
}

// ViewModel
class ProductViewModel: ObservableObject {
    enum State {
        case loading
        case loaded(Product)
        case error(String)
    }

    @Published private(set) var state: State = .loading
    private let repository: ProductRepository

    func loadProduct() {
        state = .loading

        Task {
            do {
                let product = try await repository.fetchProduct()
                state = .loaded(product)
            } catch {
                state = .error(error.localizedDescription)
            }
        }
    }
}
```

## Coordinator Pattern

```swift
protocol Coordinator: AnyObject {
    var childCoordinators: [Coordinator] { get set }
    var navigationController: UINavigationController { get }
    func start()
}

class AppCoordinator: Coordinator {
    var childCoordinators: [Coordinator] = []
    let navigationController: UINavigationController

    init(navigationController: UINavigationController) {
        self.navigationController = navigationController
    }

    func start() {
        let splashCoordinator = SplashCoordinator(navigationController: navigationController)
        childCoordinators.append(splashCoordinator)
        splashCoordinator.start()
    }

    func showAuth() {
        let authCoordinator = AuthCoordinator(navigationController: navigationController)
        childCoordinators.append(authCoordinator)
        authCoordinator.start()
    }

    func showMain() {
        let tabCoordinator = MainTabCoordinator(navigationController: navigationController)
        childCoordinators.append(tabCoordinator)
        tabCoordinator.start()
    }

    func childDidFinish(_ child: Coordinator?) {
        childCoordinators.removeAll { $0 === child }
    }
}

class ProductListCoordinator: Coordinator {
    var childCoordinators: [Coordinator] = []
    let navigationController: UINavigationController

    func start() {
        let viewModel = ProductListViewModel()
        let viewController = ProductListViewController(viewModel: viewModel)
        viewModel.onProductSelected = { [weak self] productId in
            self?.showProductDetail(productId: productId)
        }
        navigationController.pushViewController(viewController, animated: true)
    }

    func showProductDetail(productId: String) {
        let detailCoordinator = ProductDetailCoordinator(
            navigationController: navigationController,
            productId: productId
        )
        childCoordinators.append(detailCoordinator)
        detailCoordinator.start()
    }
}
```

## Repository Pattern

```swift
protocol ProductRepository {
    func fetchProducts() async throws -> [Product]
    func getProduct(id: String) async throws -> Product
    func saveProduct(_ product: Product) async throws
}

class ProductRepositoryImpl: ProductRepository {
    private let apiClient: APIClient
    private let localCache: OfflineStorageManager

    func fetchProducts() async throws -> [Product] {
        do {
            let products = try await apiClient.get("/products")
            try localCache.save(products, forKey: "all_products")
            return products
        } catch {
            if let cached: [Product] = try localCache.load([Product].self, forKey: "all_products") {
                return cached
            }
            throw error
        }
    }
}
```

## Key Points

- Use MVVM for reactive data binding
- Use Coordinator pattern for navigation flow
- Use Repository pattern for data access abstraction
- Use dependency injection for testability
- Separate concerns into layers (UI, Business, Data)
- Use use cases for business logic
- Implement error handling at each layer
- Follow single responsibility principle
- Use protocol-oriented design for flexibility
- Implement unit tests for business logic
- Use snapshot tests for UI components
- Document architecture decisions in ADRs
