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
No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

——

### Max Response Length
4096 tokens

## Workflow

### Step 1: Identify Architecture Requirements
Assess team size, app complexity, testing requirements, and platform constraints to select the appropriate pattern.

### Step 2: Select Core Pattern
Choose MVVM for standard apps with data binding, MVI for complex state with unidirectional flow, or Clean Architecture for large multi-team codebases.

### Step 3: Define Layer Boundaries
Establish dependency rules: presentation depends on domain, domain is pure business logic, data implements domain interfaces.

### Step 4: Separate Navigation
Extract navigation logic into Coordinator/Navigator — views should know nothing about other screens.

### Step 5: Set Up Dependency Injection
Configure DI framework with explicit scopes and clear module organization per layer.

## Rules

- Domain layer must have zero framework dependencies — pure business logic only
- Data layer depends on domain layer — never the reverse
- MVVM: View observes ViewModel state; ViewModel never holds View reference
- MVI: sealed class for intents, single sealed state class, reducer function
- Clean Architecture: outer layers depend on inner layers, never inward
- Coordinator owns navigation — views call coordinator callbacks, not navigators directly
- Repository is the single source of truth — data sources are implementation details

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
