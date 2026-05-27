# Mobile Design Patterns

## Factory Pattern

```swift
protocol ViewControllerFactory {
    func makeProductList() -> UIViewController
    func makeProductDetail(productId: String) -> UIViewController
    func makeCheckout() -> UIViewController
    func makeProfile() -> UIViewController
}

class DefaultViewControllerFactory: ViewControllerFactory {
    private let dependencies: Dependencies

    init(dependencies: Dependencies) {
        self.dependencies = dependencies
    }

    func makeProductList() -> UIViewController {
        let repository = ProductRepositoryImpl(
            apiClient: dependencies.apiClient,
            localCache: dependencies.cache
        )
        let viewModel = ProductListViewModel(repository: repository)
        return ProductListViewController(viewModel: viewModel)
    }

    func makeProductDetail(productId: String) -> UIViewController {
        let repository = ProductRepositoryImpl(
            apiClient: dependencies.apiClient,
            localCache: dependencies.cache
        )
        let viewModel = ProductDetailViewModel(productId: productId, repository: repository)
        return ProductDetailViewController(viewModel: viewModel)
    }
}

// Builder Pattern
class AlertBuilder {
    private var title: String?
    private var message: String?
    private var preferredStyle: UIAlertController.Style = .alert
    private var actions: [UIAlertAction] = []

    func setTitle(_ title: String) -> Self {
        self.title = title
        return self
    }

    func setMessage(_ message: String) -> Self {
        self.message = message
        return self
    }

    func setStyle(_ style: UIAlertController.Style) -> Self {
        self.preferredStyle = style
        return self
    }

    func addAction(title: String, style: UIAlertAction.Style = .default, handler: (() -> Void)? = nil) -> Self {
        let action = UIAlertAction(title: title, style: style) { _ in handler?() }
        actions.append(action)
        return self
    }

    func build() -> UIAlertController {
        let alert = UIAlertController(title: title, message: message, preferredStyle: preferredStyle)
        actions.forEach { alert.addAction($0) }
        return alert
    }
}
```

## Observer Pattern

```swift
protocol EventObserver: AnyObject {
    func onEvent(_ event: AppEvent)
}

enum AppEvent {
    case userLoggedIn(userId: String)
    case userLoggedOut
    case productAddedToCart(productId: String, quantity: Int)
    case orderPlaced(orderId: String)
    case subscriptionChanged(tier: SubscriptionTier)
}

class EventBus {
    static let shared = EventBus()
    private var observers = NSHashTable<AnyObject>(options: .weakMemory)

    func addObserver(_ observer: EventObserver) {
        observers.add(observer)
    }

    func removeObserver(_ observer: EventObserver) {
        observers.remove(observer)
    }

    func post(_ event: AppEvent) {
        observers.allObjects.compactMap { $0 as? EventObserver }.forEach {
            $0.onEvent(event)
        }
    }
}

class AnalyticsObserver: EventObserver {
    func onEvent(_ event: AppEvent) {
        switch event {
        case .userLoggedIn(let userId):
            AnalyticsManager.shared.identify(userId: userId)
        case .orderPlaced(let orderId):
            AnalyticsManager.shared.track("order_placed", properties: ["order_id": orderId])
        default:
            break
        }
    }
}
```

## Strategy Pattern

```swift
protocol PaymentStrategy {
    func pay(amount: Decimal, currency: String) async throws -> PaymentResult
    func validate() -> Bool
}

class ApplePayStrategy: PaymentStrategy {
    func pay(amount: Decimal, currency: String) async throws -> PaymentResult {
        return PaymentResult(success: true, transactionId: UUID().uuidString)
    }

    func validate() -> Bool {
        return PKPaymentAuthorizationViewController.canMakePayments()
    }
}

class CardPaymentStrategy: PaymentStrategy {
    func pay(amount: Decimal, currency: String) async throws -> PaymentResult {
        return PaymentResult(success: true, transactionId: UUID().uuidString)
    }

    func validate() -> Bool {
        return true
    }
}

class PaymentContext {
    private var strategy: PaymentStrategy

    func setStrategy(_ strategy: PaymentStrategy) {
        self.strategy = strategy
    }

    func processPayment(amount: Decimal, currency: String) async throws -> PaymentResult {
        guard strategy.validate() else {
            throw PaymentError.methodNotAvailable
        }
        return try await strategy.pay(amount: amount, currency: currency)
    }
}
```

## Key Points

- Use Factory pattern for object creation
- Use Builder pattern for complex object construction
- Use Observer pattern for event-driven communication
- Use Strategy pattern for interchangeable algorithms
- Use Adapter pattern for third-party integrations
- Use Decorator pattern for adding responsibilities
- Use Singleton sparingly for shared resources
- Use Delegate pattern for one-to-one communication
- Use protocol extensions for default implementations
- Prefer composition over inheritance
- Keep design patterns consistent across codebase
- Document pattern usage in code reviews
