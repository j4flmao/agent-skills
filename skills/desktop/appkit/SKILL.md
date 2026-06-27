---
name: desktop-appkit
description: >
  Use when the user asks about macOS app development with AppKit, Cocoa, Objective-C, Swift AppKit, macOS UI framework, or native Mac application architecture. Do NOT use for: SwiftUI (desktop-swiftui), or cross-platform desktop (desktop-electron, desktop-tauri).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [desktop, appkit, macos]
---

# AppKit

## Purpose
Build native macOS applications using AppKit — Apple's mature, Objective-C-originated UI framework. AppKit provides deep OS integration, native look and feel, and access to macOS-specific features (menus, toolbars, sheets, drawers, NSTableView, NSCollectionView, document architecture) that SwiftUI cannot fully replace.

## Agent Protocol

### Trigger
Exact user phrases: "AppKit", "macOS app", "Cocoa framework", "NSView", "NSViewController", "NSTableView", "NSDocument", "native Mac app", "Mac Catalyst", "Objective-C Mac", "Swift AppKit".

### Input Context
- macOS deployment target (macOS 12 Monterey+, macOS 14 Sonoma+)
- Language preference (Swift, Objective-C, or mixed)
- App architecture (single window, multi-document, preferences window)
- Existing codebase details (SwiftUI hybrid, pure AppKit, legacy)
- Performance requirements (large data sets, real-time rendering, heavy computation)
- Distribution method (Mac App Store, notarized DMG, enterprise MDM)

### Output Artifact
AppKit architecture plan with view controller hierarchy, window management, delegation patterns, and data flow design.

### Completion Criteria
- [ ] Window architecture defined (NSWindow, NSWindowController, storyboard/XIB vs programmatic)
- [ ] View controller hierarchy established (NSViewController, NSView lifecycle)
- [ ] Data model with bindings or delegate/dataSource patterns
- [ ] Menu bar and toolbar designed
- [ ] Document-based app architecture (if applicable) with NSDocument/NSDocumentController
- [ ] Sheet, popover, and modal dialog strategy
- [ ] Drag-and-drop support (if needed)
- [ ] Accessibility (NSAccessibility protocol) integrated
- [ ] Sandbox entitlements and security-scoped bookmarks configured
- [ ] Dark mode and Dynamic Type support

### Max Response Length
250 lines.

## Framework/Methodology

### AppKit Architecture Decision Tree
```
What type of macOS app?
├── Document-based (files are the primary data unit)
│   → NSDocument + NSDocumentController architecture
│   → Auto-save, versions, NSFileWrapper, UTType declaration
├── Single-window utility (calculator, preferences, toolbar)
│   → NSWindowController + single NSViewController
│   → NSWindow level behavior (floating, modal panel)
├── Multi-window browser/inspector (Xcode, Finder-like)
│   → NSWindowController per window, NSWindowController + delegate
│   → NSWindow restoration, tabs (NSWindowTabGroup)
└── Menu bar app (status item, background process)
    → NSStatusItem + NSMenu (no dock icon if LSUIElement)
    → NSApplication delegate, activateIgnoringOtherApps
```

### MVC in AppKit (Traditional Cocoa Pattern)
```
Model (NSManagedObject / Codable structs)
    ↕ Bindings or KVO
Controller (NSViewController / NSWindowController)
    ↕ Outlets and Actions
View (NSView subclasses: NSTableView, NSButton, NSTextField)
```

### View Controller Lifecycle
```
loadView()              // Create view hierarchy programmatically (or load from nib)
  ↓
viewDidLoad()           // Setup initial state, register observers, configure views
  ↓
viewWillAppear()        // View about to appear (update from model)
  ↓
viewDidAppear()         // View appeared (start animations, set first responder)
  ↓
viewWillDisappear()     // View about to disappear (save state)
  ↓
viewDidDisappear()      // View disappeared (stop timers, remove observers)
```

## Workflow

### Step 1: Choose Architecture Pattern

| Pattern | Description | Best For |
|---------|-------------|----------|
| MVC (Traditional) | Model-View-Controller, Cocoa native | Simple apps, document-based apps |
| MVVM + Bindings | NSObjectController, ArrayController, bindings in IB | Form-heavy, preferences, inspector panels |
| Presenter | NSViewController as presenter, passive views | Testable logic, moderate complexity |
| Coordinator | AppKit + child view controller coordination | Multi-screen flows, wizards |
| Combine + AppKit | Reactive pipelines with NSObject subscriptions | Modern Swift, async data handling |

Modern approach: Use Combine for binding-like data flow without IB bindings, which are fragile and hard to debug.

```swift
class DocumentViewController: NSViewController {
    let viewModel = DocumentViewModel()
    private var cancellables = Set<AnyCancellable>()

    override func viewDidLoad() {
        super.viewDidLoad()
        viewModel.$documentTitle
            .sink { [weak self] title in
                self?.titleLabel.stringValue = title
            }
            .store(in: &cancellables)

        viewModel.$isDirty
            .sink { [weak self] dirty in
                self?.view.window?.isDocumentEdited = dirty
            }
            .store(in: &cancellables)
    }
}
```

### Step 2: Set Up Window and Menu Architecture

```swift
// AppDelegate with programmatic window creation
class AppDelegate: NSObject, NSApplicationDelegate {
    var window: NSWindow!

    func applicationDidFinishLaunching(_ notification: Notification) {
        let windowSize = NSSize(width: 1000, height: 700)
        let screenFrame = NSScreen.main?.visibleFrame ?? NSRect.zero
        let windowOrigin = NSPoint(
            x: (screenFrame.width - windowSize.width) / 2,
            y: (screenFrame.height - windowSize.height) / 2
        )

        window = NSWindow(
            contentRect: NSRect(origin: windowOrigin, size: windowSize),
            styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )
        window.title = "My App"
        window.contentViewController = MainSplitViewController()
        window.makeKeyAndOrderFront(nil)
    }

    func applicationWillTerminate(_ notification: Notification) {
        // Save state, close resources
    }
}
```

Menu System:
- Main menu defined in Main.storyboard or programmatically via NSMenu
- Use NSMenuItem validation (validateMenuItem:) for enabling/disabling dynamically
- Key equivalents: Cmd+C, Cmd+V, etc. (avoid conflicts with system shortcuts)
- Services menu for system-wide integration
- Auto-enable items based on responder chain

```swift
// Validating menu items dynamically
override func validateMenuItem(_ menuItem: NSMenuItem) -> Bool {
    switch menuItem.action {
    case #selector(deleteSelectedItem):
        return tableView.selectedRow >= 0
    case #selector(exportDocument):
        return document != nil
    default:
        return super.validateMenuItem(menuItem)
    }
}
```

### Step 3: Implement Core UI Components

NSTableView (Virtualized List):
```swift
class MyTableViewController: NSViewController, NSTableViewDataSource, NSTableViewDelegate {
    @IBOutlet weak var tableView: NSTableView!
    var items: [Item] = []

    // NSTableViewDataSource
    func numberOfRows(in tableView: NSTableView) -> Int { items.count }

    func tableView(_ tableView: NSTableView, viewFor tableColumn: NSTableColumn?, row: Int) -> NSView? {
        let cell = tableView.makeView(withIdentifier: tableColumn!.identifier, owner: self) as! NSTableCellView
        cell.textField?.stringValue = items[row].name
        return cell
    }

    // NSTableViewDelegate
    func tableViewSelectionDidChange(_ notification: Notification) {
        let selectedRow = tableView.selectedRow
        // Update detail view
    }
}
```

Performance Tips for Large NSTableView:
- Use view-based NSTableView (not cell-based) for modern macOS
- Implement `tableView:heightOfRow:` only if variable heights are required (expensive)
- Batch updates with `tableView.beginUpdates()` / `tableView.endUpdates()`
- Use `NSTableViewDataSource` instead of Cocoa Bindings for >10K rows
- For real-time updates: `NSAnimationContext` to batch layout changes

NSCollectionView (Grid/Layout):
```swift
let layout = NSCollectionViewFlowLayout()
layout.itemSize = NSSize(width: 200, height: 150)
layout.minimumInteritemSpacing = 16
layout.minimumLineSpacing = 16
layout.sectionInset = NSEdgeInsets(top: 16, left: 16, bottom: 16, right: 16)

let collectionView = NSCollectionView()
collectionView.collectionViewLayout = layout
collectionView.register(MyCollectionViewItem.self, forItemWithIdentifier: .myItem)
```

### Step 4: Implement Drag and Drop

```swift
// Pasteboard data types
extension NSPasteboard.PasteboardType {
    static let myCustomType = NSPasteboard.PasteboardType("com.example.myapp.mytype")
}

// Drag source
override func mouseDragged(with event: NSEvent) {
    let pasteboardItem = NSPasteboardItem()
    pasteboardItem.setString(serializedData, forType: .myCustomType)

    let draggingItem = NSDraggingItem(pasteboardWriter: pasteboardItem)
    draggingItem.setDraggingFrame(dragImageRect, contents: dragImage)
    beginDraggingSession(with: [draggingItem], event: event, source: self)
}

// Drop destination
override func draggingEntered(_ sender: NSDraggingInfo) -> NSDragOperation {
    return sender.draggingPasteboard.canReadObject(forClasses: [NSString.self], options: nil) ? .copy : []
}

override func performDragOperation(_ sender: NSDraggingInfo) -> Bool {
    guard let strings = sender.draggingPasteboard.readObjects(forClasses: [NSString.self], options: nil) as? [String] else { return false }
    handleDroppedStrings(strings)
    return true
}
```

### Step 5: Implement Dark Mode and Accessibility

Dark Mode support is automatic if you use NSColor system colors:
```swift
// System colors that adapt automatically
view.layer?.backgroundColor = NSColor.controlBackgroundColor.cgColor
textField.textColor = NSColor.labelColor
placeholderField.textColor = NSColor.secondaryLabelColor

// Custom adaptative colors
let dynamicColor = NSColor(name: "customAccent") { appearance in
    let isDark = appearance.name == .darkAqua || appearance.name == .vibrantDark
    return isDark ? NSColor(red: 0.4, green: 0.6, blue: 1.0, alpha: 1.0) : NSColor(red: 0.0, green: 0.3, blue: 0.8, alpha: 1.0)
}
```

Accessibility:
```swift
// Every NSView subclass must be an NSAccessibilityElement
override func isAccessibilityElement() -> Bool { true }

override func accessibilityRole() -> NSAccessibility.Role { .button }

override func accessibilityLabel() -> String? { "Save document" }

override func accessibilityPerformPress() -> Bool {
    performClick()
    return true
}
```

### Step 6: Sandboxing and Distribution

```xml
<!-- Entitlements for sandboxed apps -->
<key>com.apple.security.app-sandbox</key>
<true/>
<key>com.apple.security.files.user-selected.read-write</key>
<true/>
<key>com.apple.security.network.client</key>
<true/>
<key>com.apple.security.files.bookmarks.app-scope</key>
<true/>
```

## Architecture Patterns

### Split View Controller (NSSplitViewController)

```swift
class MainSplitViewController: NSSplitViewController {
    override func viewDidLoad() {
        let sidebarVC = SidebarViewController()
        let contentVC = ContentViewController()

        let sidebarItem = NSSplitViewItem(sidebarWithViewController: sidebarVC)
        sidebarItem.minimumThickness = 180
        sidebarItem.maximumThickness = 300

        let contentItem = NSSplitViewItem(viewController: contentVC)
        contentItem.minimumThickness = 400

        addSplitViewItem(sidebarItem)
        addSplitViewItem(contentItem)
    }
}
```

### Document-Based App Architecture

```swift
class MyDocument: NSDocument {
    @objc dynamic var content = MyDocumentData()

    override class var autosavesInPlace: Bool { true }

    override func makeWindowControllers() {
        let storyboard = NSStoryboard(name: "Main", bundle: nil)
        let wc = storyboard.instantiateController(withIdentifier: "Document Window Controller") as! NSWindowController
        addWindowController(wc)

        // Pass data to view controller
        (wc.contentViewController as? DocumentViewController)?.document = self
    }

    override func data(ofType typeName: String) throws -> Data {
        return try JSONEncoder().encode(content)
    }

    override func read(from data: Data, ofType typeName: String) throws {
        content = try JSONDecoder().decode(MyDocumentData.self, from: data)
    }
}
```

### Responder Chain and Target/Action Pattern

The responder chain enables flexible event handling:
1. First responder (key view → view controller → window → window controller → app delegate)
2. Cut/copy/paste/selectAll are handled via responder chain
3. Implement `@IBAction` methods on any responder for automatic menu validation

## Common Pitfalls

| Pitfall | Description | Prevention |
|---------|-------------|------------|
| Retain cycles with delegates | Strong reference from view to delegate | Always use weak references for delegates and dataSources |
| Stale bindings | IB bindings break silently when model changes | Use Combine or willSet/didSet observers instead |
| Main thread blocking | Heavy computation on main thread freezes UI | Dispatch to global queue, update UI on main |
| Improper view lifecycle | Crash when accessing outlets before loadView() | Only access outlets after viewDidLoad() |
| Dark mode breakage | Hardcoded colors look wrong in dark mode | Use NSColor.systemColors or dynamic NSColor always |
| Sandbox denial | App rejected for missing entitlement | Test with sandbox enabled from day one |
| Missing menu validation | Menu items enabled when they shouldn't be | Always implement validateMenuItem: |
| Window state loss | Window position/size not restored | Implement window autosave name, encode restorable state |
| Sheet on wrong window | Sheet on modal panel instead of key window | Call beginSheet: on the correct window |

## Best Practices

| Practice | Rationale |
|----------|-----------|
| Use storyboard for menu + windows, programmatic for complex views | Maintains clarity without fighting IB limitations |
| Prefer NSViewController containment over custom container | Built-in child management, responder chain support |
| Use Cocoa Bindings sparingly | Works in IB but breaks silently — replace with Combine |
| Always implement validateMenuItem: | Correct menu state is expected macOS behavior |
| Use NSView's wantsLayer = true for complex rendering | Hardware-accelerated compositing |
| Test with VoiceOver enabled | Accessibility is a requirement, not a feature |
| Use autosave for window state | Users expect restored window positions |
| Prefer Swift over Objective-C for new code | Memory safety, Swift concurrency, Combine |
| Use structured concurrency (async/await) | Avoids callback pyramids, integrates with AppKit |
| Version your Core Data model | Irreversible migration is a support nightmare |

## Patterns

### Sidebar + Content + Detail (Three-Column Layout)
```swift
let sidebar = NSSplitViewItem(sidebarWithViewController: sidebarVC)
let content = NSSplitViewItem(viewController: contentVC)
let detail = NSSplitViewItem(viewController: detailVC)
// Content gets more space: hold splitter position with NSSplitViewItem behavior
```

### Sheet for Modal Tasks
```swift
let sheetVC = SheetViewController()
presentAsSheet(sheetVC)
// Or for critical operations:
presentAsModalWindow(sheetVC)
```

### Popover for Transient Information
```swift
let popoverVC = PopoverContentViewController()
let popover = NSPopover()
popover.contentViewController = popoverVC
popover.behavior = .transient  // Dismisses on click outside
popover.show(relativeTo: button.bounds, of: button, preferredEdge: .maxY)
```

### Preferences Window
```swift
// Use NSTabView in a separate window controller
// NSWindowController with window level .normal (not modal)
// Register defaults via UserDefaults.standard.register(defaults:)
```

## References
  - references/appkit-advanced.md — AppKit Advanced Topics
  - references/appkit-fundamentals.md — AppKit Fundamentals
  - references/appkit-patterns.md — AppKit Architecture Patterns
  - references/macos-deployment.md — macOS Deployment Reference
## Handoff
Hand off to `desktop-swiftui` for SwiftUI migration strategy. Hand off to `design-accessibility` for VoiceOver compliance testing.
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

### AppKit vs SwiftUI

| Decision | AppKit | SwiftUI |
|---|---|---|
| Minimum OS | macOS 10.0+ | macOS 11.0+ |
| Flexibility | Full control, any UI | Limited to SwiftUI capabilities |
| Performance | Native AppKit views | SwiftUI rendering overhead |
| Interop | — | NSHostingView for embedding |
| Development speed | Slower (manual layout) | Faster (declarative) |
| Future-proof | Stable (legacy) | Apple's focus |
| Best for | Complex, legacy macOS apps | New development, simple UIs |

### Storyboard vs Programmatic Layout

| Aspect | Storyboard (XIB) | Programmatic |
|---|---|---|
| Visualization | Visual editor | Runtime only |
| Merge conflicts | Frequent (XML) | Rare (code) |
| Reusability | NIB loading | Custom NSView subclasses |
| Debugging | Hard (runtime connections) | Easy (breakpoints) |
| Team preference | Design-oriented | Code-oriented |