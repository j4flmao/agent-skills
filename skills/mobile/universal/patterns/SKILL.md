---
name: mobile-patterns
description: Cross-platform mobile architecture patterns — MVVM, MVI, Clean Architecture, Coordinator/ Navigator pattern, Repository, UseCase, DI.
---

# Mobile Architecture Patterns

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

### Max Response Length
4096 tokens

## MVVM

```
View (UI) → ViewModel (state + logic) → Model (data)
View observes ViewModel state via observable/stream
ViewModel exposes state + events. View renders state, dispatches events.
```

```kotlin
// Android (Jetpack Compose)
@Composable
fun OrderScreen(viewModel: OrderViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    OrderContent(state = state, onAction = viewModel::handleAction)
}
```

```swift
// iOS (SwiftUI)
struct OrderView: View {
    @StateObject var vm = OrderViewModel()
    var body: some View {
        List(vm.orders) { order in ... }
            .task { await vm.load() }
    }
}
```

## MVI

```
View → Intent → Model → View
Unidirectional. Single source of truth. State sealed class.
```

```kotlin
sealed class OrderIntent {
    data object Load : OrderIntent()
    data class Search(val query: String) : OrderIntent()
}

data class OrderState(
    val orders: List<Order> = emptyList(),
    val isLoading: Boolean = false
)
```

## Clean Architecture

```
presentation/  ← depends on domain
domain/        ← pure business logic, no framework deps
data/          ← implements domain interfaces, framework deps

Dependency rule: outer → inner. Inner never knows outer.
```

## Coordinator / Navigator

```
Navigation extracted from views. Coordinator owns navigation logic.
View knows nothing about other screens — just calls coordinator callback.
```

```swift
protocol Coordinator: AnyObject {
    func start()
}

final class AppCoordinator: Coordinator {
    func start() {
        let vm = OrderListViewModel(onOrderSelected: { [weak self] id in
            self?.showOrderDetail(id)
        })
        navigationController.pushViewController(OrderListVC(vm: vm), animated: false)
    }
}
```

## References

### Reference Files
- `references/mvvm-mvi.md` — MVVM vs MVI deep dive, state management
- `references/coordinator.md` — Coordinator / Navigator pattern variants
- `references/clean-arch.md` — Clean Architecture rules, layer maps

### Related Skills
- `mobile/universal/state-management/SKILL.md` — cross-platform state patterns
- `mobile/testing/SKILL.md` — testing architectures

## Handoff

Hand off to stack-specific skill (`ios`, `android`, `flutter`, `react-native`) for implementation.
