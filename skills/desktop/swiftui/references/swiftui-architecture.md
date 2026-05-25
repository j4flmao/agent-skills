# SwiftUI Architecture Reference

## View Protocol

```swift
struct ContentView: View {
    var body: some View {
        Text("Hello, SwiftUI!")
            .font(.title)
            .foregroundStyle(.accent)
    }
}
```

Key view types:
- `Text`, `Image`, `Label` — basic content
- `HStack`, `VStack`, `ZStack`, `Grid` — layout
- `List`, `Table`, `Form` — structured data
- `NavigationStack`, `NavigationSplitView` — navigation
- `Button`, `Toggle`, `Slider`, `Picker` — controls

## @State / @Binding / @Observable

```swift
// @State — local view state (value type)
struct CounterView: View {
    @State private var count = 0

    var body: some View {
        Button("Count: \(count)") { count += 1 }
    }
}

// @Binding — passed-down mutable reference
struct ChildView: View {
    @Binding var value: String
    var body: some View {
        TextField("Enter text", text: $value)
    }
}

// @Observable — reference type state (iOS 17+ / macOS 14+)
@Observable
class AppModel {
    var username = ""
    var isLoggedIn = false
}

struct ProfileView: View {
    @State private var model = AppModel()
    var body: some View {
        TextField("Name", text: $model.username)
    }
}

// @Environment — shared system values
@Environment(\.colorScheme) private var colorScheme
@Environment(\.openWindow) private var openWindow
@Environment(\.dismiss) private var dismiss
@Environment(\.modelContext) private var modelContext
```

## Data Flow

```
App State → @Observable class
                ↓
         Bindable (property wrapper)
                ↓
         View reads property
                ↓
         State change triggers body re-evaluation
```

```swift
// Environment injection
struct MyApp: App {
    @State private var model = AppModel()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(model)
        }
    }
}

// Consume
struct ContentView: View {
    @Environment(AppModel.self) private var model
    // ...
}
```

## Navigation Stack

```swift
// NavigationStack (programmatic + push)
struct ItemsView: View {
    @State private var path = NavigationPath()
    @State private var items = ["Item A", "Item B", "Item C"]

    var body: some View {
        NavigationStack(path: $path) {
            List(items, id: \.self) { item in
                NavigationLink(item, value: item)
            }
            .navigationTitle("Items")
            .navigationDestination(for: String.self) { item in
                DetailView(item: item)
            }
        }
    }
}

// NavigationSplitView (sidebar + content + detail)
struct SplitView: View {
    @State private var selectedItem: Item?
    @State private var columnVisibility = NavigationSplitViewVisibility.all

    var body: some View {
        NavigationSplitView(columnVisibility: $columnVisibility) {
            SidebarView(selection: $selectedItem)
        } content: {
            ContentView(item: selectedItem)
        } detail: {
            DetailView(item: selectedItem)
        }
    }
}
```

## Layout System

```swift
// Layout protocol — custom layout
struct RadialLayout: Layout {
    func sizeThatFits(proposal: ProposedViewSize,
                      subviews: Subviews,
                      cache: inout ()) -> CGSize {
        proposal.replacingUnspecifiedDimensions()
    }

    func placeSubviews(in bounds: CGRect,
                       proposal: ProposedViewSize,
                       subviews: Subviews,
                       cache: inout ()) {
        let radius = min(bounds.width, bounds.height) / 2
        let center = CGPoint(x: bounds.midX, y: bounds.midY)
        for (index, subview) in subviews.enumerated() {
            let angle = 2 * .pi * Double(index) / Double(subviews.count)
            let point = CGPoint(
                x: center.x + CGFloat(cos(angle)) * radius,
                y: center.y + CGFloat(sin(angle)) * radius)
            subview.place(at: point, anchor: .center, proposal: .unspecified)
        }
    }
}

// Fixed spacing
HStack(spacing: 8) { /* ... */ }

// Flexible with priority
VStack {
    Text("Priority").layoutPriority(1)
    Text("Fills remaining space").frame(maxWidth: .infinity)
}
```

## Key Architecture Rules

- @Observable over ObservableObject for new code (iOS 17+ / macOS 14+)
- @State for local value type state, @Observable for model objects
- @Binding for child → parent communication
- @Environment for shared dependencies (modelContext, dismiss, etc.)
- NavigationSplitView for sidebar-detail on macOS
- NavigationStack for hierarchical push navigation
- Previews for all views with sample data
- Small focused view structs — never monolithic views
- ViewModifier protocol for reusable styling patterns
- .commands modifier for menu bar items (macOS)
- .focusedSceneValue for responder chain-like behavior
