---
name: swiftui
description: >
  Use this skill when building declarative macOS/iOS apps with SwiftUI — Swift, previews, property wrappers, App Intents, SwiftData, cross-device adaptation. Do NOT use for: AppKit legacy apps requiring NSView/NSViewController, UIKit-only projects, cross-platform non-Apple apps.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [desktop, macos, swiftui, swift, apple, phase-4]
---

# SwiftUI

## Purpose
Build declarative macOS applications using SwiftUI with Swift, property wrappers, SwiftData persistence, and platform-adaptive patterns.

## Agent Protocol

### Trigger
User request includes: `swiftui`, `swift ui`, `macos swiftui`, `swiftui mac app`, `declarative mac`, `swiftdata`, `@State`, `@Observable`, `apple swift`.

### Input Context
- Target platform (macOS, iOS, both)
- Minimum OS version (macOS 14+, macOS 15+)
- Data persistence (SwiftData, CoreData, UserDefaults)
- Architecture (MVVM, MVC, TCA)
- Deployment (Mac App Store, notarized .dmg)

### Output Artifact
A markdown document containing:
- App entry point with @main App struct
- WindowGroup and Window configuration
- SwiftUI views with property wrappers
- Data flow (@State, @Environment, @Observable)
- SwiftData model and persistence
- Navigation (NavigationSplitView, NavigationStack)
- Menu bar and commands
- Previews for all views

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick.

### Completion Criteria
- @main App struct with WindowGroup.
- Views use @Observable or @ObservableObject for state.
- SwiftData model defined with @Model macro.
- NavigationSplitView for sidebar + detail layout.
- Menu commands added via .commands modifier.
- Previews provided for all major views.
- App builds and runs on target macOS version.

### Max Response Length
4096 tokens

## Workflow

### Step 1: App Entry Point
```swift
import SwiftUI
import SwiftData

@main
struct MyMacApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(for: Item.self)

        Settings {
            SettingsView()
        }
    }
}
```

### Step 2: SwiftData Model
```swift
import SwiftData
import Foundation

@Model
final class Item {
    var title: String
    var details: String
    var createdAt: Date
    var isComplete: Bool

    init(title: String, details: String = "") {
        self.title = title
        self.details = details
        self.createdAt = Date()
        self.isComplete = false
    }
}
```

### Step 3: Observable ViewModel
```swift
import Observation
import SwiftData

@Observable
final class ItemViewModel {
    var searchText = ""
    var selectedItem: Item?
    var isShowingEditor = false

    private var modelContext: ModelContext

    init(modelContext: ModelContext) {
        self.modelContext = modelContext
    }

    func addItem(title: String) {
        let item = Item(title: title)
        modelContext.insert(item)
        try? modelContext.save()
    }

    func deleteItem(_ item: Item) {
        modelContext.delete(item)
        try? modelContext.save()
    }

    func toggleComplete(_ item: Item) {
        item.isComplete.toggle()
        try? modelContext.save()
    }
}
```

### Step 4: Main View with Navigation
```swift
import SwiftUI
import SwiftData

struct ContentView: View {
    @Environment(\.modelContext) private var modelContext
    @State private var viewModel: ItemViewModel?
    @Query(sort: \Item.createdAt, order: .reverse) private var items: [Item]

    var body: some View {
        NavigationSplitView {
            List(items) { item in
                HStack {
                    Image(systemName: item.isComplete ? "checkmark.circle.fill" : "circle")
                        .foregroundStyle(item.isComplete ? .green : .secondary)
                    Text(item.title)
                        .strikethrough(item.isComplete)
                    Spacer()
                    Text(item.createdAt, style: .date)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .onTapGesture { viewModel?.selectedItem = item }
            }
            .navigationTitle("Items")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button(action: { viewModel?.isShowingEditor = true }) {
                        Label("Add", systemImage: "plus")
                    }
                }
            }
        } detail: {
            if let item = viewModel?.selectedItem {
                ItemDetailView(item: item)
            } else {
                ContentUnavailableView("Select an Item",
                    systemImage: "square.and.pencil")
            }
        }
        .onAppear {
            viewModel = ItemViewModel(modelContext: modelContext)
        }
        .sheet(isPresented: Binding(get: { viewModel?.isShowingEditor ?? false },
                                     set: { viewModel?.isShowingEditor = $0 })) {
            ItemEditorView(viewModel: viewModel)
        }
    }
}
```

### Step 5: Menu Bar and Keyboard Shortcuts
```swift
import SwiftUI

struct MyMacApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .commands {
            CommandGroup(after: .newItem) {
                Button("Duplicate") {
                    // Duplicate selected item
                }
                .keyboardShortcut("d", modifiers: [.command, .shift])
            }

            CommandMenu("Actions") {
                Button("Mark Complete") {
                    // Toggle complete
                }
                .keyboardShortcut("i")

                Divider()

                Button("Export...") {
                    // Export data
                }
                .keyboardShortcut("e")
            }
        }
    }
}
```

## Rules
- @Observable over ObservableObject for new code.
- @Model macro for all SwiftData entities.
- NavigationSplitView for sidebar-detail layouts.
- View extracted into small, focused structs with Previews.
- @Environment for modelContext, dismiss, openWindow.
- Previews provided for every view with sample data.
- Menu commands via .commands modifier on Scene.

## References

### Reference Files
- `references/swiftui-architecture.md` — View protocol, @State/@Binding/@ObservedObject, data flow, navigation stack, layout system
- `references/swiftui-deployment.md` — Mac App Store, code signing, notarization, Swift Packages, CI/CD for macOS, sandboxing
- `references/swiftui-macos-patterns.md` — macOS-specific patterns, menus, windows, app lifecycle
- `references/swiftui-setup.md` — Project setup, Xcode, previews, debugging, deployment

### Related Skills
- `desktop/appkit/SKILL.md` — AppKit for legacy or NSView-level macOS apps
- `desktop/electron/SKILL.md` — Cross-platform alternative for macOS + Windows

## Handoff
Hand off to `desktop/appkit/SKILL.md` when need NSView/NSViewController, AppKit-level control, or backward compatibility with older macOS.
