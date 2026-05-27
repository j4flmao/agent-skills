# Mobile State Management

## Overview

State management is one of the most critical architectural decisions in mobile development. The right approach reduces bugs, improves performance, and makes code easier to reason about. This guide covers state management patterns, tool comparisons, data flow architectures, and state persistence strategies for mobile apps.

## State Categories

```yaml
state_categories:
  ui_state:
    description: "State that affects what the user sees"
    examples: ["Loading indicators", "Error messages", "Modal visibility", "Selected tab"]
    scope: "Component or screen-level"
    lifetime: "Ephemeral — discarded when view is destroyed"
    management: "Local signals/state variables in the view"
    
  application_state:
    description: "Business data that drives the application"
    examples: ["Current user profile", "Shopping cart contents", "Order list"]
    scope: "Feature or application-level"
    lifetime: "Persistent — survives screen transitions"
    management: "Shared stores, services, or global state"
    
  persisted_state:
    description: "State that survives app restart"
    examples: ["Auth tokens", "User preferences", "Offline data"]
    scope: "Application-level"
    lifetime: "Persistent — survives app restart"
    management: "Secure storage, local database, file system"
    
  server_state:
    description: "State that lives on the server"
    examples: ["API responses", "Other users' data", "Shared content"]
    scope: "Application-level"
    lifetime: "Server-managed"
    management: "Cache layer with stale-while-revalidate pattern"
```

## State Management Approaches

```yaml
state_management_approaches:
  local_component_state:
    platform:
      ios: "@State, @StateObject"
      android: "mutableStateOf in Compose, LiveData in ViewModel"
      flutter: "StatefulWidget + setState, ValueNotifier"
      react_native: "useState, useReducer"
    use_case: "Form inputs, toggle states, temporary UI state"
    pros: "Simple, no dependencies, no boilerplate"
    cons: "Doesn't scale beyond single component"
    
  scoped_shared_state:
    platform:
      ios: "@StateObject in parent, passed via init or @EnvironmentObject"
      android: "SharedViewModel within Activity-scoped NavGraph"
      flutter: "InheritedWidget, Provider, Riverpod"
      react_native: "React Context, useReducer with context"
    use_case: "State shared across a screen or feature (form wizard, multi-step flow)"
    pros: "Shared without prop drilling, scoped to feature"
    cons: "Can over-scope — hard to share across features"
    
  global_state:
    platform:
      ios: "ObservableObject with @Published in singleton service"
      android: "Singleton ViewModel or state holder at Application level"
      flutter: "Riverpod with global providers, Bloc as singleton"
      react_native: "Zustand, Redux, Jotai — global stores"
    use_case: "User session, theme, auth state, feature-level data"
    pros: "Accessible from anywhere in the app"
    cons: "Can become a dumping ground, harder to test"
    
  server_state_cache:
    platform:
      ios: "async/await with NSCache, URLCache"
      android: "Flow + Room cache, Paging 3"
      flutter: "Riverpod family providers with cache duration"
      react_native: "TanStack Query (React Query), SWR, Apollo Client"
    use_case: "API data caching, pagination, optimistic updates"
    pros: "Separation of server and UI state, built-in caching"
    cons: "Another layer to learn and configure"
```

## State Management Tool Comparison

```yaml
tool_comparison:
  redux_style:
    libraries: ["Redux (RN)", "ReSwift (iOS)", "Redux Kotlin (Android)"]
    pattern: "Unidirectional — Action → Reducer → Store → View"
    boilerplate: "High — actions, reducers, selectors, middleware"
    predictability: "Very high — pure functions, time-travel debugging"
    learning_curve: "Steep — many concepts"
    best_for: "Complex state with undo/redo, large teams, strict debugging needs"
    
  observable_stream_style:
    libraries: ["Combine (iOS)", "StateFlow/SharedFlow (Android)", "RxSwift/RxCocoa", "BLoC (Flutter)"]
    pattern: "Stream of states — View subscribes, ViewModel emits"
    boilerplate: "Medium — stream setup, state emission"
    predictability: "High — unidirectional but less structured than Redux"
    learning_curve: "Moderate — requires understanding reactive programming"
    best_for: "Real-time data, complex async flows, form validation"
    
  signal_style:
    libraries: ["SwiftUI @State/@Binding (iOS)", "mutableStateOf (Compose)", "Signals (SolidJS)", "Reactive state (Preact Signals)"]
    pattern: "Fine-grained reactivity — UI re-renders only on signal change"
    boilerplate: "Low — signals are built into framework or minimal library"
    predictability: "High — deterministic, no subscriptions to manage"
    learning_curve: "Low — intuitive for simple to moderate complexity"
    best_for: "Most mobile apps — sufficient for 90% of use cases"
    
  atomic_state:
    libraries: ["Jotai (RN)", "Recoil (RN)", "Riverpod (Flutter)"]
    pattern: "Independent state atoms composed via selectors/derivations"
    boilerplate: "Low-Medium — create atom once, use anywhere"
    predictability: "High — dependency graph explicit, no prop drilling"
    learning_curve: "Moderate — novel concept, powerful once understood"
    best_for: "Medium complexity apps with shared state across many components"
```

## Data Flow Architecture

```yaml
data_flow_architecture:
  unidirectional_data_flow_udf:
    principles:
      - "State flows down (from store to view)"
      - "Events flow up (from view to store via intents/actions)"
      - "State is immutable — new state replaces old state"
      - "Side effects are isolated (middleware, effects, use cases)"
    benefits:
      - "Predictable — same input always produces same output"
      - "Debuggable — every state change is traceable"
      - "Testable — reducers/reducers are pure functions"
      
  model_view_viewmodel_mvvm:
    data_flow:
      - "View observes ViewModel (data binding, observable, stream)"
      - "View dispatches user events to ViewModel"
      - "ViewModel transforms events into state changes"
      - "ViewModel calls repository/service layer for data"
    rule: "ViewModel never holds reference to View — avoids memory leaks"
    
  model_view_intent_mvi:
    data_flow:
      - "View renders a single State object"
      - "View dispatches Intent objects (sealed class)"
      - "Reducer function takes current State + Intent → new State"
      - "Side effects handled by middleware or actor"
    rule: "One State object per screen — no scattered state"
```

## State Persistence

```yaml
state_persistence:
  in_memory:
    lifetime: "App process lifetime"
    storage: "RAM — objects, signals, state holders"
    cleared: "On app background kill, low memory warning"
    typical_data: "UI state, navigation state, transient data"
    
  process_retention:
    lifetime: "Activity/ViewController lifetime"
    storage: "ViewModel (Android), State restoration (iOS)"
    cleared: "On process death (Android), on view controller dealloc (iOS)"
    restoration: "iOS: NSUserActivity state restoration. Android: SavedStateHandle"
    
  persistent:
    lifetime: "User preference or business rule"
    storage: ["Keychain / EncryptedSharedPrefs (tokens)", "UserDefaults / SharedPreferences (settings)", "SQLite / Room / Core Data (structured data)"]
    cleared: "On explicit user action (logout, clear data) or app uninstall"
    
  best_practices:
    - "Persist only what needs to survive app restart — not everything"
    - "Save critical state on app background notification (UIApplication.didEnterBackground)"
    - "Use type-safe serialization (Codable, kotlinx.serialization, json_serializable)"
    - "Handle migration — persisted state schema changes over time"
```

## State Testing

```yaml
state_testing:
  unit_testing_state:
    approach: "Test the state holder (ViewModel, Store, Reducer) in isolation"
    setup: "Create state holder with initial state and mocked dependencies"
    test_cases:
      - "Send intent/action → verify expected state change"
      - "Multiple rapid intents → verify final state is correct"
      - "Error scenario → verify error state is set"
      - "Loading state → verify loading indicator toggles correctly"
      
  integration_testing:
    approach: "Test state flow through multiple layers"
    setup: "Repository with mock data source → ViewModel → View observation"
    test_cases:
      - "Data fetch → loading state → success state → UI renders correctly"
      - "Data fetch → loading state → error state → UI shows error"
      - "User interaction → intent dispatched → ViewModel processes → state updates"
```
