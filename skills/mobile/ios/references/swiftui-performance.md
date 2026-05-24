# SwiftUI Performance Optimization

## View Identity and Lifecycle

### Identity Matters
```swift
// SwiftUI uses identity to track views across updates
// Two types of identity:

// 1. Structural identity — compiler-inferred from code structure
if isLoggedIn {
    DashboardView() // Identity 1
} else {
    LoginView()     // Identity 2 — completely different view tree
}

// 2. Explicit identity — with .id() modifier
ForEach(items, id: \.id) { item in
    ItemRow(item: item) // Stable identity from item.id
}

// Wrong: anonymous identity causes full re-creation
ForEach(items.indices, id: \.self) { index in
    ItemRow(item: items[index]) // Items shifting index = new identity
}
```

### View Lifecycle
```swift
// onAppear/onDisappear are tied to identity
// If identity changes, the old view disappears and new one appears

struct ItemRow: View {
    let item: Item

    var body: some View {
        HStack {
            Text(item.name)
            Spacer()
            Text("\(item.value)")
        }
        .onAppear { print("Appeared: \(item.id)") }
        .onDisappear { print("Disappeared: \(item.id)") }
    }
}

// With stable identity: only newly added items trigger appear/disappear
// Without identity: EVERY visible item re-appears on update
```

## Equatable Views

```swift
// By default, SwiftUI views are NOT Equatable
// SwiftUI uses property-by-property comparison in body

// Optimize with EquatableView:
struct ExpensiveRow: View {
    let title: String
    let subtitle: String
    let isSelected: Bool

    var body: some View {
        ComplexView(title: title, subtitle: subtitle, isSelected: isSelected)
    }
}

// Manual Equatable conformance
extension ExpensiveRow: Equatable {
    static func == (lhs: ExpensiveRow, rhs: ExpensiveRow) -> Bool {
        lhs.title == rhs.title &&
        lhs.subtitle == rhs.subtitle &&
        lhs.isSelected == rhs.isSelected
    }
}

// Usage — skip evaluation when equal
EquatableView(content: ExpensiveRow(...))
// Or modifier:
ExpensiveRow(...).equatable()
```

### Body Comparison
```swift
// Without EquatableView: SwiftUI evaluates BOTH branches and diffs
// With EquatableView: if old == new, skip body entirely

// When to use EquatableView:
// 1. Complex view hierarchies
// 2. Views that don't change every frame
// 3. List/ForEach rows (especially in scroll views)

// When NOT needed:
// 1. Simple views (Text, Image, etc.)
// 2. Views whose inputs always change
// 3. Views at the root of your app
```

## @ViewBuilder Optimization

```swift
// @ViewBuilder creates a conditional view graph
// Each branch has structural identity

struct ConditionalView: View {
    let state: LoadState

    var body: some View {
        // All three branches are always evaluated for type-erasure
        // But only one renders
        switch state {
        case .loading:
            ProgressView()
        case .loaded(let data):
            ContentView(data: data)
        case .error(let error):
            ErrorView(error: error)
        }
    }
}

// Performance tip: avoid complex @ViewBuilder with many conditionals
// Extract repeated branches into computed properties
struct BetterConditionalView: View {
    let state: LoadState

    @ViewBuilder
    var body: some View {
        switch state {
        case .loading: loadingView
        case .loaded(let data): ContentView(data: data)
        case .error(let error): ErrorView(error: error)
        }
    }

    private var loadingView: some View {
        ProgressView()
            .scaleEffect(1.5)
            .tint(.blue)
    }
}
```

## Lazy Stacks and Grids

```swift
// LazyVStack vs VStack
// LazyVStack: only creates views when they appear on screen
// VStack: creates all views immediately

// Incorrect — creates 10000 views
ScrollView {
    VStack {
        ForEach(0..<10000, id: \.self) { i in
            Text("Item \(i)")
        }
    }
}

// Correct — lazily creates visible views only
ScrollView {
    LazyVStack {
        ForEach(0..<10000, id: \.self) { i in
            ItemRow(index: i)
        }
    }
}
```

### Lazy Grid Optimization
```swift
struct LazyGridDemo: View {
    let items: [Item]

    var body: some View {
        ScrollView {
            LazyVGrid(
                columns: [
                    GridItem(.adaptive(minimum: 100, maximum: 200)),
                    GridItem(.adaptive(minimum: 100, maximum: 200))
                ],
                spacing: 8
            ) {
                ForEach(items, id: \.id) { item in
                    ItemCell(item: item)
                }
            }
            .padding(.horizontal)
        }
    }
}

// Performance tips for lazy grids:
// 1. .fixedSize() on grid items helps sizing
// 2. Avoid complex geometry calculations in item views
// 3. Use .drawingGroup() for complex compositing
// 4. Pre-compute layout values outside the view
```

## Instruments for SwiftUI

### Key Instruments
```swift
// SwiftUI profiling instruments:
// 1. SwiftUI Body Frequency — how often views evaluate body
// 2. View Body — time spent in body evaluations
// 3. SwiftUI Rendering — rendering performance
// 4. Time Profiler — CPU usage per function
// 5. Core Animation — GPU frame rates

// Common measurements:
// Body evaluations per second: target < 10 for idle views
// Body evaluation time: target < 1ms per view
// Frame rate: 60fps (16ms budget), 120fps on ProMotion (8ms)
```

### Using os_signpost for custom instrumentation
```swift
import OSLog

struct PerformanceTrackedView: View {
    let data: LargeDataSet

    var body: some View {
        let signpostID = OSSignpostID(log: .default)
        os_signpost(.begin, log: .default, name: "View Body",
                   signpostID: signpostID, "LargeDataSet")

        let result = computeExpensiveView(data)

        os_signpost(.end, log: .default, name: "View Body",
                   signpostID: signpostID)

        return result
    }

    private func computeExpensiveView(_ data: LargeDataSet) -> some View {
        // ...
    }
}
```

## Precomputed Layouts

```swift
struct PrecomputedLayoutView: View {
    let items: [Item]

    // Precompute geometry outside body
    private var layoutData: [ItemLayout] {
        items.map { item in
            ItemLayout(
                id: item.id,
                size: CGSize(
                    width: item.name.width(withFont: .body),
                    height: 60
                ),
                color: determineColor(for: item)
            )
        }
    }

    var body: some View {
        List(layoutData, id: \.id) { layout in
            Text(layout.id)
                .frame(width: layout.size.width, height: layout.size.height)
                .background(layout.color)
        }
    }

    // Cache expensive computations
    @State private var cache: [String: ItemLayout] = [:]

    private func determineColor(for item: Item) -> Color {
        // Expensive color calculation
    }
}
```

## PreferenceKey and CoordinateSpace

```swift
// PreferenceKey for communication without performance hit
struct ScrollOffsetKey: PreferenceKey {
    static var defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = nextValue()
    }
}

// Efficient geometry reading — only triggers on scroll
struct ScrollOffsetReader: View {
    var body: some View {
        GeometryReader { proxy in
            Color.clear
                .preference(
                    key: ScrollOffsetKey.self,
                    value: proxy.frame(in: .named("scroll")).minY
                )
        }
        .frame(height: 0) // Zero height = no visual impact
    }
}
```

## Key Anti-patterns

| Anti-pattern | Problem | Fix |
|---|---|---|
| @ObservedObject on entire model | Entire body re-evaluates | Split into smaller models, use @Published selectively |
| Complex body with GeometryReader | Geometry changes trigger full re-eval | Isolate GeometryReader to wrapper view |
| ForEach without .id | Broken identity → full re-creation | Provide stable identifier |
| Binding to computed property | Read + write = 2 evaluations per frame | Use @State with onChange |
| .animation() on large list | Animates all changes | Use .animation(nil, value:) to disable per-element |
| Overuse of @StateObject | View-specific state in parent | Push down to child, use @StateObject per view |
