# SwiftUI Fundamentals

## Overview
SwiftUI is Apple's declarative framework for building macOS (and other Apple platform) user interfaces. SwiftUI for macOS provides automatic support for Dark Mode, Dynamic Type, Accessibility, and native window management. This reference covers fundamental SwiftUI macOS concepts.

## Core Concepts

### Concept 1: Declarative UI
SwiftUI views are value types that describe the UI based on current state. The framework handles updates when state changes. Views are composed from smaller views using modifiers. The body property returns the view hierarchy. @main struct App: App starts the application.

### Concept 2: State Management
@State (local, simple state), @Binding (passed reference), @StateObject/@ObservedObject (reference types with ObservableObject), @EnvironmentObject (shared via environment), @AppStorage (UserDefaults). @Observable macro (iOS 17/macOS 14) replaces ObservableObject with simpler syntax.

### Concept 3: Scene Architecture
WindowGroup (main document or app windows), DocumentGroup (file-based documents), Settings (preferences window), MenuBarExtra (menu bar app), Window (custom named window). Scene composition defines the app's window structure. Each scene has its own view hierarchy.

### Concept 4: NavigationSplitView
Three-column layout (sidebar, content, detail) is the standard macOS navigation pattern. NavigationStack for simpler push navigation. NavigationSplitView automatically adapts to window width. Use NavigationLink, List selection, or programmatic navigation.

### Concept 5: Commands and Menus
Commands are grouped into CommandMenu sections (File, Edit, View, Window, Help). Use .keyboardShortcut() for keyboard shortcuts. Focused bindings (@FocusedBinding) enable context-sensitive menu items. @FocusedValue for focused view data propagation.

## Best Practices

- NavigationSplitView for three-panel macOS navigation
- @Observable over ObservableObject (simpler, less boilerplate)
- SwiftData over Core Data for new projects
- Extract sub-views extensively (SwiftUI performance)
- Commands in a dedicated Commands struct
- NSViewRepresentable for AppKit components SwiftUI doesn't have
- Always set defaultSize and frame(minWidth:minHeight:)
- Test with VoiceOver

## Anti-Patterns

- iOS patterns on macOS (TabView where NavigationSplitView belongs)
- Missing keyboard shortcuts
- Single window assumption for multi-window apps
- Heavy View.body (frequent recomputation)
- @Published in @StateObject when @Observable works
- Missing Settings scene (no preferences window)
- No minimum window size (can resize to unusable)
- Hardcoded colors (dark mode breakage)
