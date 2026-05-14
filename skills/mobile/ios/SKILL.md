---
name: ios
description: iOS native development — Swift, SwiftUI, UIKit, MVVM+Coordinator, Combine, async/await, Core Data, XCTest.
---

# iOS Native

## Agent Protocol

### Trigger
User request includes: `ios`, `swift`, `swiftui`, `uikit`, `ios architecture`, `ios testing`, `ios native`.

### Input Context
- Xcode version
- Deployment target
- Swift version
- Architecture pattern (MVVM, TCA, VIPER)

### Output Artifact
A markdown document containing:
- Project structure
- SwiftUI/UIKit setup
- MVVM+Coordinator pattern
- Combine/async-await concurrency
- Core Data / SwiftData setup
- XCTest test plan

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick.

### Max Response Length
4096 tokens

## Project Structure

```
App/
├── Sources/
│   ├── App/
│   │   └── App.swift
│   ├── Features/
│   │   ├── Orders/
│   │   │   ├── OrderListView.swift
│   │   │   ├── OrderDetailView.swift
│   │   │   ├── OrderViewModel.swift
│   │   │   └── OrderCoordinator.swift
│   │   └── ...
│   ├── Core/
│   │   ├── Network/
│   │   ├── Persistence/
│   │   └── DI/
│   └── Common/
│       ├── Extensions/
│       └── Components/
└── Tests/
    ├── UnitTests/
    └── UITests/
```

## MVVM + Coordinator

```swift
// OrderCoordinator.swift
final class OrderCoordinator: Coordinator {
    var navigationController: UINavigationController
    private let di: DIContainer

    func start() {
        let vm = OrderViewModel(service: di.orderService)
        let vc = OrderListViewController(viewModel: vm)
        vm.onSelectOrder = { [weak self] order in
            self?.showDetail(order)
        }
        navigationController.pushViewController(vc, animated: false)
    }

    private func showDetail(_ order: Order) {
        let vm = OrderDetailViewModel(order: order)
        let vc = OrderDetailViewController(viewModel: vm)
        navigationController.pushViewController(vc, animated: true)
    }
}
```

## SwiftUI + Combine

```swift
// OrderViewModel.swift
@MainActor
final class OrderViewModel: ObservableObject {
    @Published var orders: [Order] = []
    @Published var isLoading = false
    private let service: OrderService

    init(service: OrderService) {
        self.service = service
    }

    func loadOrders() async {
        isLoading = true
        do {
            orders = try await service.fetchOrders()
        } catch {
            print("Error: \(error)")
        }
        isLoading = false
    }
}

// OrderListView.swift
struct OrderListView: View {
    @StateObject var viewModel: OrderViewModel

    var body: some View {
        List(viewModel.orders) { order in
            Text(order.customerName)
        }
        .task { await viewModel.loadOrders() }
    }
}
```

## UIKit Programmatic

```swift
final class OrderListViewController: UIViewController {
    private let viewModel: OrderViewModel
    private let tableView = UITableView()

    init(viewModel: OrderViewModel) {
        self.viewModel = viewModel
        super.init(nibName: nil, bundle: nil)
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        setupTableView()
        bindViewModel()
    }

    private func setupTableView() {
        view.addSubview(tableView)
        tableView.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            tableView.topAnchor.constraint(equalTo: view.topAnchor),
            tableView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            tableView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            tableView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
        tableView.register(UITableViewCell.self, forCellReuseIdentifier: "cell")
    }

    private func bindViewModel() {
        Task { @MainActor in
            for await orders in viewModel.$orders.values {
                tableView.reloadData()
            }
        }
    }
}
```

## Core Data

```swift
// PersistenceController.swift
struct PersistenceController {
    static let shared = PersistenceController()
    let container: NSPersistentContainer

    init() {
        container = NSPersistentContainer(name: "AppModel")
        container.loadPersistentStores { _, error in
            if let error = error { fatalError("\(error)") }
        }
    }

    var context: NSManagedObjectContext { container.viewContext }

    func save() {
        if context.hasChanges {
            try? context.save()
        }
    }
}
```

## Testing (XCTest)

```swift
import XCTest
@testable import App

final class OrderViewModelTests: XCTestCase {
    var sut: OrderViewModel!
    var mockService: MockOrderService!

    override func setUp() {
        mockService = MockOrderService()
        sut = OrderViewModel(service: mockService)
    }

    func testLoadOrders() async {
        mockService.stubOrders = [Order(id: "1", customerName: "Test")]
        await sut.loadOrders()
        XCTAssertEqual(sut.orders.count, 1)
        XCTAssertFalse(sut.isLoading)
    }
}
```

## References

### Reference Files
- `references/swiftui-patterns.md` — SwiftUI navigation, state, animations
- `references/uikit-interop.md` — SwiftUI/UIKit interoperability
- `references/testing.md` — XCTest, XCUITest, snapshot testing

### Related Skills
- `mobile/universal/deployment/SKILL.md` — App Store Connect, TestFlight, CI/CD
- `backend/universal/api-response/SKILL.md` — REST API response design

## Handoff

Hand off to `mobile/universal/deployment/SKILL.md` for deployment.
