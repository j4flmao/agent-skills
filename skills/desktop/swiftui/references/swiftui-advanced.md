# SwiftUI Advanced Topics

## Overview
Advanced SwiftUI for macOS covers complex animations, custom layout, preference system, Swift Charts, AppKit bridging, focus management, SwiftData migrations, and performance optimization.

## Advanced Concepts

### Concept 1: Custom Layout
Layout protocol (iOS 16/macOS 13+) creates custom layout containers with sizeThatFits and placeSubviews. Use AnyLayout to switch between layouts (HStack/VStack/ZStack) based on environment. Custom layout enables responsive designs that SwiftUI's built-in containers don't support.

### Concept 2: Preference System
Preferences propagate child view values to ancestor views: PreferenceKey protocol with default value and reduce function. Use for: tab selection, scroll offset, child size, selection state. Combine with GeometryReader for layout-dependent data.

### Concept 3: Swift Charts
Chart framework for data visualization: Chart view with BarMark, LineMark, PointMark, AreaMark, RuleMark. Customize with chartXAxis, chartYAxis, chartLegend, chartForegroundStyleScale. Interactive charts with chartGesture and selection.

### Concept 4: Focus Management
@FocusState for keyboard focus control, focused() modifier for focusable views, FocusSection for directional focus groups, and FocusedValue for propagating focused view data. Essential for keyboard-navigable macOS apps.

### Concept 5: SwiftData Migrations
Schema migration: VersionedSchema, SchemaMigrationPlan, and MigrationStage (custom and lightweight). Lightweight migrations (add/remove properties, rename properties) are automatic. Custom migrations require data transformation logic.

## Advanced Techniques

### Custom Layout Example
```swift
struct FlowLayout: Layout {
    func sizeThatFits(proposal: ProposedViewSize,
                      subviews: Subviews,
                      cache: inout ()) -> CGSize {
        // Calculate flowing layout size
    }
    func placeSubviews(in bounds: CGRect,
                       proposal: ProposedViewSize,
                       subviews: Subviews,
                       cache: inout ()) {
        // Position subviews in flow
    }
}
```

### Matched Geometry Effect
```swift
// Shared element transition between views
@Namespace var animation
VStack {
    if isExpanded {
        DetailView()
            .matchedGeometryEffect(id: "card", in: animation)
    } else {
        CardView()
            .matchedGeometryEffect(id: "card", in: animation)
    }
}
```

### Focus Management
```swift
@FocusState var focusedField: Field?
TextField("Name", value: $name)
    .focused($focusedField, equals: .name)
TextField("Email", value: $email)
    .focused($focusedField, equals: .email)
```

## Anti-Patterns

- GeometryReader in every view (performance)
- Over-reliance on @State for complex state (use @Observable)
- Chart with too many marks (readability)
- Missing keyboard navigation in macOS apps
- Heavy preference propagation (preference tree evaluation cost)
- matchedGeometryEffect without namespace isolation
- SwiftData without migration planning
- ObservableObject when @Observable works
