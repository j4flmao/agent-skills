---
name: ios
description: >
  Use this skill when the user asks about iOS development, Swift, SwiftUI, UIKit,
  iOS architecture, MVVM, Coordinator, Core Data, SwiftData, or iOS testing.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [mobile, ios, phase-4]
---

# iOS Native

## Purpose
Build iOS native applications using Swift, SwiftUI/UIKit, MVVM+Coordinator architecture, Combine/async-await, Core Data, and XCTest.

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

## Workflow

### Step 1: Set Up Project Structure
Organize code with feature-based folders: App, Features, Core (Network, Persistence, DI), and Common components.

### Step 2: Implement MVVM with Coordinator
Create ViewModels with ObservableObject, Coordinators for navigation logic, and dependency injection container.

### Step 3: Build UI with SwiftUI or UIKit
Use SwiftUI with @StateObject/@Published for reactive UI, or UIKit with programmatic view controllers and delegates.

### Step 4: Set Up Persistence
Configure Core Data or SwiftData with NSPersistentContainer, context management, and save flows.

### Step 5: Write Tests
Cover ViewModels with XCTest unit tests using mock services and UI flows with XCUITest.

## Architecture Decision Trees

### UI Framework Selection
```
Deployment target?
├── iOS 16+ → SwiftUI (native NavigationStack, SwiftData, Observable macros)
├── iOS 14-15 → SwiftUI with UIKit fallbacks for complex interactions
└── iOS 13- → UIKit (SwiftUI limited by deployment target requirement)
    
Team expertise?
├── New Swift team → SwiftUI (faster to build, less code)
├── Experienced UIKit team → UIKit for complex features, SwiftUI for simpler screens
└── Enterprise app → UIKit (proven, better accessibility, broader testing tools)
```

### Architecture Pattern Selection
```
App complexity + team size?
├── Simple (<10 screens, CRUD) → MVVM
│   ViewModel @Observable, lightweight, quick to implement
├── Complex state management → TCA (The Composable Architecture)
│   Reducer pattern, testable, unidirectional, own your dependencies
├── Legacy codebase → VIPER
│   Strong separation, best for huge teams, more boilerplate
└── Multi-platform Swift → Clean Swift (VIP)
    Testable, clear boundaries, used with Swift on server too
```

### Data Persistence Strategy
```
Data complexity?
├── Simple objects, light queries → SwiftData (iOS 17+)
│   Macro-based, Swift-native, auto-save, iCloud sync
├── Relational, existing Core Data → Core Data
│   Mature, complex queries, migration, iCloud, multi-threaded
├── Ephemeral, in-memory → UserDefaults + Codable
└── Full-text search, large datasets → GRDB (SQLite)
    Raw SQL control, migrations, combine publishers

Sync needed?
├── Yes → CloudKit + Core Data / SwiftData
├── No → Local persistence only
└── Real-time → Firebase Firestore
```

### Concurrency Model
```
Task type?
├── One-shot network call → async/await (structured concurrency)
├── Stream of values → AsyncSequence (AsyncStream, AsyncAlgorithms)
├── Reactive chain → Combine (pre iOS 13-16, being superseded by Swift concurrency)
└── Long-running observation → AsyncStream + @Observable (iOS 17+)
```

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

    init(navigationController: UINavigationController, di: DIContainer) {
        self.navigationController = navigationController
        self.di = di
    }

    func start() {
        let vm = OrderViewModel(service: di.orderService)
        vm.onSelectOrder = { [weak self] order in
            self?.showDetail(order)
        }
        let vc = OrderListViewController(viewModel: vm)
        navigationController.pushViewController(vc, animated: false)
    }

    private func showDetail(_ order: Order) {
        let vm = OrderDetailViewModel(order: order)
        let vc = OrderDetailViewController(viewModel: vm)
        navigationController.pushViewController(vc, animated: true)
    }
}
```

## SwiftUI + async-await

```swift
// OrderViewModel.swift
@MainActor
@Observable
final class OrderViewModel {
    var orders: [Order] = []
    var isLoading = false
    var errorMessage: String?
    private let service: OrderService

    init(service: OrderService) {
        self.service = service
    }

    func loadOrders() async {
        isLoading = true
        errorMessage = nil
        do {
            orders = try await service.fetchOrders()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

// OrderListView.swift
struct OrderListView: View {
    @State private var viewModel: OrderViewModel

    var body: some View {
        Group {
            if viewModel.isLoading {
                ProgressView()
            } else if let error = viewModel.errorMessage {
                ContentUnavailableView("Error", systemImage: "exclamationmark.triangle",
                    description: Text(error))
            } else {
                List(viewModel.orders) { order in
                    Text(order.customerName)
                }
            }
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
    private var dataSource: UITableViewDiffableDataSource<String, Order>!

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
        dataSource = UITableViewDiffableDataSource(tableView: tableView) { tableView, indexPath, order in
            let cell = tableView.dequeueReusableCell(withIdentifier: "cell", for: indexPath)
            cell.textLabel?.text = order.customerName
            return cell
        }
    }

    private func bindViewModel() {
        Task { @MainActor in
            for await orders in viewModel.$orders.values {
                var snapshot = NSDiffableDataSourceSnapshot<String, Order>()
                snapshot.appendSections(["main"])
                snapshot.appendItems(orders)
                await dataSource.apply(snapshot)
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

    init(inMemory: Bool = false) {
        container = NSPersistentContainer(name: "AppModel")
        if inMemory {
            container.persistentStoreDescriptions.first?.url = URL(fileURLWithPath: "/dev/null")
        }
        container.loadPersistentStores { _, error in
            if let error = error { fatalError("\(error)") }
        }
        container.viewContext.automaticallyMergesChangesFromParent = true
    }

    var context: NSManagedObjectContext { container.viewContext }

    func save() {
        if context.hasChanges {
            try? context.save()
        }
    }
}

// Background context for heavy operations
func performBackgroundTask(_ block: @escaping (NSManagedObjectContext) -> Void) {
    let context = container.newBackgroundContext()
    context.perform {
        block(context)
        try? context.save()
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

    override func tearDown() {
        sut = nil
        mockService = nil
    }

    func testLoadOrders() async {
        mockService.stubOrders = [Order(id: "1", customerName: "Test")]
        await sut.loadOrders()
        XCTAssertEqual(sut.orders.count, 1)
        XCTAssertFalse(sut.isLoading)
    }

    func testLoadOrdersFailure() async {
        mockService.shouldFail = true
        await sut.loadOrders()
        XCTAssertTrue(sut.orders.isEmpty)
        XCTAssertNotNil(sut.errorMessage)
    }
}
```

## Production Considerations

- Memory: Use `Instruments Allocations` and `Leaks` instrument each sprint
- Startup: Static framework reduces launch time vs dynamic frameworks
- Size: Asset catalog with `Preserve Vector Data` for PDF assets
- Crash-free rate target: >99.5% before App Store release
- Thread sanitizer: Enable in test scheme to catch data race bugs
- `OSLog` for structured logging — never `print()` in production
- `MetricKit` for production performance monitoring (hang rate, launch time, power)
- `BackgroundTasks` framework for deferrable background work (BGAppRefreshTask, BGProcessingTask)

## SwiftUI Performance Patterns

- `equatable()` modifier for view equality checks
- `LazyVStack` inside `ScrollView` for large lists (not `VStack`)
- `@ViewBuilder` for conditional content instead of `AnyView`
- `PreferenceKey` for child-to-parent communication
- `.drawingGroup()` for Metal-backed offscreen rendering (complex shapes)
- `id(_:)` modifier for stable identity in animations and transitions
- `@ObservedObject` vs `@StateObject` — parent creates, child observes

## UIKit Performance Patterns

- `UITableViewDiffableDataSource` for declarative, animated updates
- `UICollectionViewCompositionalLayout` for complex, responsive layouts
- Cell reuse identifiers must match registered cells — runtime crash otherwise
- Self-sizing cells with `estimatedRowHeight` and `UITableView.automaticDimension`
- `prefetchDataSource` for loading data before cells appear
- `cellReuseIdentifier` + `prepareForReuse` to reset cell state

## Concurrency Safety

- `@MainActor` on all ViewModels and UI controllers
- `Task { @MainActor in ... }` for dispatching back to main thread
- `AsyncStream` for bridging callback-based APIs to async sequences
- `withThrowingTaskGroup` for parallel async operations (multiple API calls)
- `Task` lifetime tied to view lifecycle with `.task` modifier
- Cancellation: check `Task.isCancelled` in long-running loops
- `await Task.yield()` for cooperative cancellation points

## Anti-Patterns

- **Massive View Controller**: UIKit MVC with business logic in view controllers — extract to ViewModel/Coordinator
- **SwiftUI view with business logic**: Keep logic in `@Observable` classes, not in View body
- **Force-unwrapping optionals**: Use `guard let` or optional chaining — never `!` outside tests
- **Shared mutable state**: Prefer value types (structs) for model data, actors for shared mutable state
- **NotificationCenter abuse**: Use Combine publishers or async streams instead of NotificationCenter for app-internal events
- **Retain cycles**: Always `[weak self]` in escaping closures; use `WeakReference<T>` wrapper for Combine cancellables
- **Over-reliance on @Published**: Use `@Observable` macro (iOS 17+) — fewer view updates
- **Singleton proliferation**: Use DI container (Swinject, Factory) for service dependencies
- **Long-running blocking tasks**: Never block main thread — use `Task.detached` or `DispatchQueue.global()`

## Rules

- Coordinators own all navigation logic — views never push or present directly
- ViewModels use @Published/@Observable properties and are marked @MainActor
- Core Data operations on background context — never block main thread
- Use async/await over Combine for simple one-shot network calls
- SwiftUI views should be lightweight — push business logic to ViewModels
- Avoid retain cycles: use [weak self] in escaping closures and Combine cancellables
- All network calls handle errors with do/catch and show user-facing error states
- Use UITableViewDiffableDataSource for UIKit table/collection views
- Prefer static frameworks over dynamic to reduce launch time
- MetricKit for production performance: hang rate, launch time, power consumption
- OSLog over print() — structured logging with privacy classification
- BackgroundTasks for deferrable work — not app delegate background fetch

## References
  - references/ios-advanced.md — Ios Advanced Topics
  - references/ios-architecture.md — iOS Architecture — MVVM, Coordinator, Combine, Swift Concurrency
  - references/ios-fundamentals.md — Ios Fundamentals
  - references/swiftui-patterns.md — SwiftUI Patterns
  - references/swiftui-performance.md — SwiftUI Performance Optimization
  - references/testing.md — iOS Testing (XCTest)
  - references/uikit-interop.md — SwiftUI / UIKit Interop
## Handoff

Hand off to `mobile/universal/deployment/SKILL.md` for deployment.
