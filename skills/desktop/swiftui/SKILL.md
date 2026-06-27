---
name: desktop-swiftui
description: >
  Use when the user asks about SwiftUI for macOS, SwiftUI desktop patterns, AppKit bridging, SwiftUI app lifecycle, or SwiftUI multiplatform apps. Do NOT use for: AppKit-only (desktop-appkit), or iOS SwiftUI (mobile skill).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [desktop, swiftui, macos]
---

# SwiftUI

## Purpose
Build native macOS applications using SwiftUI — Apple's declarative UI framework for all Apple platforms. SwiftUI on macOS provides automatic support for Dark Mode, Dynamic Type, Accessibility, and native window management with less code than AppKit.

## Agent Protocol

### Trigger
Exact user phrases: "SwiftUI macOS", "SwiftUI App", "macOS SwiftUI", "SwiftUI multiplatform", "SwiftUI scene", "NSViewRepresentable", "SwiftUI window", "SwiftUI settings", "SwiftUI commands".

### Input Context
- Minimum macOS target (macOS 12+, macOS 14+ for latest APIs)
- App lifecycle (SwiftUI App vs AppKit delegate with SwiftUI views)
- Platform targets (macOS only vs multiplatform iOS + macOS)
- Architecture (MVVM, TCA, Redux, Combine)
- Core Data, SwiftData, or other persistence
- Window types (single window, multiple windows, document-based, settings, menu bar)

### Output Artifact
SwiftUI macOS architecture with scene structure, view hierarchy, state management, and platform-specific patterns.

### Completion Criteria
- [ ] App structure defined (WindowGroup, DocumentGroup, MenuBarExtra, Settings)
- [ ] Window management strategy (multiple windows, window group, custom scene)
- [ ] View hierarchy with navigation (NavigationSplitView, NavigationStack)
- [ ] State management (ObservableObject, @State, @Binding, @Environment)
- [ ] Model layer (SwiftData, Core Data, or Codable structs)
- [ ] Commands and menus (MenuBarExtra, CommandMenu, CommandGroup)
- [ ] Toolbar and sidebar configuration
- [ ] Drag and drop (NSDraggingDestination, .onDrop, .onDrag)
- [ ] Accessibility integration (VoiceOver, keyboard navigation)
- [ ] AppKit bridge (NSViewRepresentable for missing SwiftUI components)

### Max Response Length
250 lines.

## Framework/Methodology

### SwiftUI for macOS Decision Tree
```
What type of macOS app?
├── Simple single-window (settings, player, quick tool)
│   → WindowGroup with NavigationStack
│   → @AppStorage for preferences
├── Multi-window MDI (editor, dashboard, browser)
│   → WindowGroup with ID-based windows
│   → WindowScene for custom window management
├── Document-based (file editor, image viewer)
│   → DocumentGroup with file types
│   → SwiftData or Codable for document model
├── Menu bar app (status bar, background)
│   → MenuBarExtra scene
│   → NSApplication activation policy: .accessory
└── Preferences window
    → Settings scene (macOS 13+)
    → TabView with form-based controls
```

### SwiftUI macOS Scenes
```
@main struct MyApp: App {
    var body: some Scene {
        WindowGroup { ContentView() }          // Main window
        DocumentGroup(...)                      // Document-based window
        MenuBarExtra(...)                       // Menu bar app
        Settings { SettingsView() }            // Preferences
        Window("Name", id: "custom") { ... }  // Custom window (macOS 13+)
        WindowGroup("Name", id: "group") { ... }
    }
}
```

## Workflow

### Step 1: Set Up macOS SwiftUI App

```swift
// MyApp.swift
import SwiftUI

@main
struct MyApp: App {
    @State private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(appState)
                .frame(minWidth: 800, minHeight: 600)
        }
        .windowResizability(.contentSize)
        .windowToolbarStyle(.unified)
        .defaultSize(width: 1000, height: 700)

        Settings {
            SettingsView()
                .environment(appState)
        }
    }
}

@Observable
class AppState {
    var selectedItemID: UUID?
    var items: [Item] = []
    var isEditing = false
}
```

### Step 2: Build NavigationSplitView (macOS Standard)

```swift
// ContentView.swift - Three-column macOS navigation
import SwiftUI

struct ContentView: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        NavigationSplitView {
            // Sidebar
            List(appState.items, selection: $appState.selectedItemID) { item in
                Text(item.name)
                    .tag(item.id)
            }
            .navigationSplitViewColumnWidth(min: 180, ideal: 200, max: 300)
        } content: {
            // Content list (middle column)
            if let id = appState.selectedItemID,
               let item = appState.items.first(where: { $0.id == id }) {
                ItemListView(item: item)
            } else {
                ContentUnavailableView(
                    "Select an Item",
                    systemImage: "sidebar.left",
                    description: Text("Choose an item from the sidebar")
                )
            }
        } detail: {
            // Detail view (right column)
            if let id = appState.selectedItemID,
               let item = appState.items.first(where: { $0.id == id }) {
                DetailView(item: item)
            } else {
                ContentUnavailableView(
                    "No Selection",
                    systemImage: "rectangle.and.text.magnifyingglass",
                    description: Text("Select an item to view details")
                )
            }
        }
    }
}
```

### Step 3: Toolbar and Commands

```swift
// Toolbar configuration
struct ContentView: View {
    @Environment(AppState.self) private var appState
    @State private var isShowingSheet = false

    var body: some View {
        NavigationSplitView {
            // Sidebar content
        } content: {
            // Content
        } detail: {
            // Detail
        }
        .toolbar {
            ToolbarItem {
                Button(action: { isShowingSheet = true }) {
                    Label("Add Item", systemImage: "plus")
                }
            }
            ToolbarItem(placement: .primaryAction) {
                Button(action: appState.refresh) {
                    Label("Refresh", systemImage: "arrow.clockwise")
                }
            }
        }
        .sheet(isPresented: $isShowingSheet) {
            AddItemSheet()
        }
    }
}

// Menu commands
struct MyCommands: Commands {
    @FocusedBinding(\.selectedItem) private var selectedItem

    var body: some Commands {
        CommandGroup(replacing: .newItem) {
            Button("New Item") {
                // Create new item
            }
            .keyboardShortcut("n", modifiers: .command)
        }

        CommandMenu("Item") {
            Button("Duplicate") {
                // Duplicate selected item
            }
            .keyboardShortcut("d", modifiers: .command)
            .disabled(selectedItem == nil)

            Divider()

            Button("Delete") {
                // Delete selected item
            }
            .keyboardShortcut(.delete, modifiers: .command)
        }
    }
}
```

### Step 4: Model Data with SwiftData (macOS 14+)

```swift
import SwiftData

@Model
final class Item {
    var name: String
    var detail: String
    var creationDate: Date
    var isFavorite: Bool
    @Attribute(.externalStorage) var thumbnailData: Data?

    init(name: String, detail: String) {
        self.name = name
        self.detail = detail
        self.creationDate = .now
        self.isFavorite = false
    }
}

// Usage in app
@main
struct MyApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(for: Item.self)
    }
}

// Usage in view
struct ContentView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \Item.creationDate, order: .reverse) private var items: [Item]

    var body: some View {
        List {
            ForEach(items) { item in
                Text(item.name)
            }
            .onDelete(perform: deleteItems)
        }
    }

    private func deleteItems(offsets: IndexSet) {
        for index in offsets {
            modelContext.delete(items[index])
        }
    }
}
```

### Step 5: AppKit Bridge (NSViewRepresentable)

```swift
// Wrapping NSTableView for complex table behavior
struct TableViewWrapper: NSViewRepresentable {
    @Binding var items: [Item]
    var selectedItem: Binding<UUID?>

    func makeNSView(context: Context) -> NSTableView {
        let tableView = NSTableView()
        tableView.delegate = context.coordinator
        tableView.dataSource = context.coordinator
        tableView.columnAutoresizingStyle = .uniformColumnAutoresizingStyle

        let column = NSTableColumn(identifier: .init("name"))
        column.title = "Name"
        column.width = 200
        tableView.addTableColumn(column)

        return tableView
    }

    func updateNSView(_ nsView: NSTableView, context: Context) {
        nsView.reloadData()
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    class Coordinator: NSObject, NSTableViewDelegate, NSTableViewDataSource {
        var parent: TableViewWrapper

        init(_ parent: TableViewWrapper) {
            self.parent = parent
        }

        func numberOfRows(in tableView: NSTableView) -> Int {
            parent.items.count
        }

        func tableView(_ tableView: NSTableView, viewFor tableColumn: NSTableColumn?, row: Int) -> NSView? {
            let cell = tableView.makeView(withIdentifier: .init("cell"), owner: nil)
                as? NSTableCellView ?? NSTableCellView()

            let item = parent.items[row]
            cell.textField?.stringValue = item.name
            return cell
        }
    }
}
```

### Step 6: Drag and Drop (SwiftUI Native)

```swift
List {
    ForEach(viewModel.items) { item in
        Text(item.name)
            .onDrag {
                NSItemProvider(object: item.id.uuidString as NSString)
            }
            .onDrop(of: [.text], delegate: ItemDropDelegate(item: item, viewModel: viewModel))
    }
}

struct ItemDropDelegate: DropDelegate {
    let item: Item
    let viewModel: ViewModel

    func performDrop(info: DropInfo) -> Bool {
        guard let provider = info.itemProviders(for: [.text]).first else { return false }
        provider.loadObject(ofClass: NSString.self) { text, _ in
            guard let idString = text as? String,
                  let id = UUID(uuidString: idString) else { return }
            Task { @MainActor in
                viewModel.moveItem(id: id, to: item.id)
            }
        }
        return true
    }
}
```

## Common Pitfalls

| Pitfall | Description | Prevention |
|---------|-------------|------------|
| iOS patterns on macOS | TabView where NavigationSplitView belongs | Use NavigationSplitView for sidebar/content/detail |
| Missing keyboard shortcuts | No keyboard navigation for menus | Use CommandMenu and .keyboardShortcut() |
| No focus management | Keyboard tab order broken | Use @FocusState, .focused() modifier |
| Single window assumption | App can't open multiple windows | Use WindowGroup, not fixed single window |
| Heavy View.body | Frequent recomputation | Extract sub-views, use computed properties |
| @Published in @StateObject | Using Combine when @Observable works | Prefer @Observable (iOS 17/macOS 14+) |
| Missing Settings scene | No preferences window | Add Settings scene, use TabView + Form |
| Ignoring @Environment values | Platform-specific behavior | Use @Environment(\.colorScheme), .controlSize, etc. |
| No drag and drop | Users expect drag from lists | Implement .onDrag + .onDrop on List items |
| Missing minimum window size | Window can shrink to unusable size | Use .frame(minWidth:minHeight:) |

## Best Practices

| Practice | Rationale |
|----------|-----------|
| NavigationSplitView for 3-panel | macOS standard Finder/Xcode pattern |
| @Observable over ObservableObject | Simpler, less boilerplate, value semantics |
| SwiftData over Core Data for new projects | Native Swift, macros, automatic iCloud |
| Extract sub-views extensively | SwiftUI performance depends on small view bodies |
| Use ViewThatFits for adaptive layout | Automatically selects best-fitting layout variant |
| Menus and commands in a Commands struct | Separated from views, reusable, testable |
| Prefer NSViewRepresentable over fighting SwiftUI | Some things (NSTableView perf) are best in AppKit |
| Default size and minimum size always set | Prevents unusable tiny windows |
| Test with VoiceOver | Accessibility is expected on macOS |
| Use PreviewProvider in DEBUG | SwiftUI previews accelerate development |

## Architecture Patterns

### Window Identification (Multiple Windows)
```swift
WindowGroup(id: "editor") {
    EditorView()
        .environment(appState)
}
.windowResizability(.contentSize)

// Open new editor window
@Environment(\.openWindow) private var openWindow
openWindow(id: "editor")
```

### Menu Bar Extra App
```swift
MenuBarExtra("MyApp", systemImage: "star.fill") {
    Button("Show Window") { showWindow() }
    Divider()
    Button("Quit") { NSApplication.shared.terminate(nil) }
}

// Configure activation policy
// In AppDelegate or Info.plist:
// LSUIElement = true
```

### Form-Based Preferences
```swift
struct SettingsView: View {
    @AppStorage("showSidebar") private var showSidebar = true
    @AppStorage("recentFiles") private var recentFiles = 10
    @AppStorage("theme") private var theme = "system"

    var body: some View {
        TabView {
            Form {
                Toggle("Show Sidebar", isOn: $showSidebar)
                Picker("Recent Files", selection: $recentFiles) {
                    Text("5").tag(5)
                    Text("10").tag(10)
                    Text("20").tag(20)
                }
            }
            .tabItem { Label("General", systemImage: "gearshape") }

            Form {
                Picker("Theme", selection: $theme) {
                    Text("System").tag("system")
                    Text("Light").tag("light")
                    Text("Dark").tag("dark")
                }
            }
            .tabItem { Label("Appearance", systemImage: "paintpalette") }
        }
        .frame(width: 400, height: 250)
    }
}
```

## References
  - references/swiftui-advanced.md — SwiftUI Advanced Topics
  - references/swiftui-fundamentals.md — SwiftUI Fundamentals
  - references/swiftui-macos-patterns.md — SwiftUI macOS Patterns Reference
  - references/swiftui-navigation.md — SwiftUI Navigation Patterns Reference
## Handoff
Hand off to `desktop-appkit` for AppKit bridge details. Hand off to `design-accessibility` for VoiceOver testing.
## Implementation Patterns

### Observer Pattern for Event Handling
`
interface EventObserver<T> {
  onEvent(event: T): Promise<void>;
}

class EventBus<T> {
  private observers: Set<EventObserver<T>> = new Set();
  subscribe(observer: EventObserver<T>): void {
    this.observers.add(observer);
  }
  unsubscribe(observer: EventObserver<T>): void {
    this.observers.delete(observer);
  }
  async emit(event: T): Promise<void> {
    const results = Array.from(this.observers).map(o => o.onEvent(event));
    await Promise.allSettled(results);
  }
}
`

### Configuration-Driven Approach
`
config:
  defaults:
    timeout: 30s
    retryCount: 3
  overrides:
    production:
      timeout: 60s
      retryCount: 5
    development:
      timeout: 300s
      retryCount: 1
`

## Production Considerations

### Deployment Checklist
- [ ] Configuration validated against schema before startup
- [ ] Health check endpoints registered and monitored
- [ ] Graceful shutdown with draining period (30s timeout)
- [ ] Resource limits configured (CPU, memory, file descriptors)
- [ ] Log level set appropriate for environment
- [ ] Metrics endpoint secured and exposed
- [ ] Rate limiting configured per-tier
- [ ] TLS certificates valid and auto-renewing
- [ ] Database migrations run as separate deployment step
- [ ] Feature flags ready for gradual rollout

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% over 5min | Critical | Page on-call |
| p99 latency | > 2s over 5min | Warning | Investigate |
| Throughput drop | > 50% over 1min | Critical | Check upstream |
| Queue depth | > 1000 over 1min | Warning | Scale consumers |
| Disk usage | > 85% | Warning | Clean or expand |
| Memory usage | > 90% heap | Critical | Restart or scale |

## Anti-Patterns

| Anti-Pattern | Symptom | Root Cause | Solution |
|-------------|---------|------------|----------|
| Premature optimization | Complex code for no measured benefit | Guessing instead of profiling | Measure first, optimize based on data |
| Copy-paste reuse | Duplicate code across codebase | Lack of abstraction | Extract shared logic into libraries |
| Gold-plating | Features with no current requirement | Over-engineering | YAGNI — build what's needed now |
| Magical thinking | Assumptions without validation | Skipping error handling | Handle all failure modes explicitly |

## Performance Optimization

### Caching Strategy
Cache hierarchy: L1 (in-memory local) → L2 (distributed Redis/Memcached) → L3 (CDN/Edge).
Cache invalidation: TTL-based (simple, stale), event-based (complex, fresh), write-through (consistent, higher write latency), write-behind (fast writes, eventual consistency).

### Resource Pooling
- Database connections: Pool of reusable connections (HikariCP, pgBouncer)
- HTTP connections: Keep-alive + connection pooling for external calls
- Thread pool: Bounded thread pools for async task execution

### Profiling Methodology
1. Establish baseline with production traffic profile
2. Profile CPU with sampling profiler (pprof, perf, async-profiler)
3. Profile memory with heap dumps and allocation tracking
4. Profile I/O with strace/perf trace for syscall analysis
5. Profile latency with distributed tracing (OpenTelemetry)
6. Identify bottleneck, formulate hypothesis, implement fix
7. Re-profile to verify improvement, repeat

## Security Considerations

### Threat Modeling (STRIDE)
- Spoofing: Identity validation, authentication
- Tampering: Integrity checks, digital signatures
- Repudiation: Audit logs, non-repudiation
- Information disclosure: Encryption, access control
- Denial of service: Rate limiting, resource quotas
- Elevation of privilege: Principle of least privilege

### Supply Chain Security
- Dependency scanning: Snyk, Dependabot, Trivy
- SBOM generation: CycloneDX or SPDX format
- Signed commits: GPG or SSH commit signing
- Artifact verification: Checksum validation, signature verification

### Secrets Management
- Secrets never in code — always in secrets manager (Vault, AWS Secrets Manager)
- Rotation policy: Rotate database credentials every 90 days
- Access audit: Log every secrets access, alert on anomalies
- Encryption at rest and in transit for all secrets
- Principle of least privilege: each service gets only its own secrets

## Rules
- Default-deny security posture — allow only explicitly required access.
- All inputs validated, all outputs encoded, all errors handled.
- Defend in depth — multiple layers of security controls.
- Fail securely — errors default to safe behavior.
- Log security-relevant events for audit and investigation.
- Keep dependencies updated — automate vulnerability scanning.
- Design for observability from day one, not as an afterthought.
- Document all architectural decisions with rationale.
- Review code for security, performance, and correctness before merging.

## Architecture Decision Trees

### SwiftUI App vs UIKit App Delegate

| Decision | SwiftUI App (@main) | UIKit App Delegate |
|---|---|---|
| Boilerplate | Minimal (< 10 lines) | Significant (SceneDelegate) |
| Lifecycle | Automatic | Manual control |
| UIKit interop | UIHostingController | Full UIKit access |
| Scene support | Built-in WindowGroup | UISceneConfiguration |
| Minimum iOS | iOS 14+ / macOS 11+ | iOS 2+ |
| Best for | New SwiftUI projects | UIKit migration, complex lifecycle |

### @StateObject vs @ObservedObject vs @EnvironmentObject

| Aspect | @StateObject | @ObservedObject | @EnvironmentObject |
|---|---|---|---|
| Ownership | View creates and owns | Parent owns | Ancestor injects |
| Lifetime | View's lifetime | Parent controls | Environment tree |
| Re-creation | Persists across view updates | Re-created if parent rebuilds | Stable |
| Testability | Direct init | Inject mock | Environment injection |
| Use case | View's own data model | Shared model, parent-owned | Global app state |