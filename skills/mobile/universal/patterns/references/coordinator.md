# Coordinator / Navigator

## Purpose

Extract navigation from view controllers/composable screens. Each coordinator owns a flow. Views only know their own actions.

## iOS (Coordinator)

```swift
final class OrderCoordinator: Coordinator {
    var navigationController: UINavigationController
    private let di: DIContainer

    func start() {
        let vm = OrderListViewModel(di: di)
        vm.onOrderSelected = { [weak self] orderId in
            self?.showDetail(orderId)
        }
        navigationController.pushViewController(OrderListVC(vm: vm), animated: true)
    }

    func showDetail(_ id: String) {
        let vm = OrderDetailViewModel(orderId: id)
        navigationController.pushViewController(OrderDetailVC(vm: vm), animated: true)
    }
}
```

## Android (Navigation)

```kotlin
// Single Activity, NavController
navController.navigate("orders/${orderId}")

// Or Navigator interface
interface Navigator {
    fun goToOrderDetail(orderId: String)
}
```

## Flutter (GoRouter)

```dart
final router = GoRouter(routes: [
  GoRoute(path: '/orders', builder: (_, __) => OrderListScreen(),
    routes: [GoRoute(path: ':id', builder: (_, s) => OrderDetailScreen(id: s.pathParameters['id']!))]),
]);
```
