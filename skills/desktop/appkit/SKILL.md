---
name: appkit
description: >
  Use this skill when building mature macOS apps with AppKit — Swift/Objective-C, NSView/NSViewController, nibs and storyboards, NSWindowController, responder chain. Do NOT use for: SwiftUI-native apps, iOS-only projects, cross-platform non-Apple apps.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [desktop, macos, appkit, swift, objective-c, phase-4]
---

# AppKit

## Purpose
Build mature macOS desktop applications using AppKit with Swift or Objective-C, nibs/storyboards, NSView hierarchy, and responder chain.

## Agent Protocol

### Trigger
User request includes: `appkit`, `nsview`, `nsviewcontroller`, `nswindow`, `nib`, `storyboard macos`, `objective-c mac`, `legacy mac app`, `cocoa framework`.

### Input Context
- Language (Swift, Objective-C, Obj-C++)
- Deployment target (macOS 11+, macOS 14+)
- UI approach (storyboard, nibs, code-only)
- Architecture (MVC, MVP, MVVM with Cocoa bindings)
- Distribution (Mac App Store, notarized .dmg, Sparkle)

### Output Artifact
A markdown document containing:
- AppDelegate and NSApplication lifecycle
- NSWindowController and NSViewController setup
- NIB/storyboard structure
- NSView subclass for custom drawing
- Responder chain and target-action pattern
- Bindings and Cocoa KVO
- Menu and toolbar configuration
- Notarization and Sparkle setup

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick.

### Completion Criteria
- AppDelegate conforms to NSApplicationDelegate protocol.
- Main window loaded from storyboard or nib.
- NSViewController manages view lifecycle.
- Custom NSView with draw(_:) override.
- Target-action connections via @IBAction and @IBOutlet.
- Menu bar configured via Main.storyboard or code.

### Max Response Length
4096 tokens

## Workflow

### Step 1: AppDelegate Setup
```swift
import Cocoa

@main
class AppDelegate: NSObject, NSApplicationDelegate {
    private var mainWindowController: MainWindowController?

    func applicationDidFinishLaunching(_ notification: Notification) {
        mainWindowController = MainWindowController()
        mainWindowController?.showWindow(nil)
    }

    func applicationWillTerminate(_ notification: Notification) {
        // Save state, cleanup
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return true
    }
}
```

### Step 2: NSWindowController
```swift
import Cocoa

class MainWindowController: NSWindowController {
    convenience init() {
        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 1000, height: 700),
            styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )
        window.title = "My Mac App"
        window.center()

        let splitVC = MainSplitViewController()
        window.contentViewController = splitVC

        self.init(window: window)
    }
}
```

### Step 3: NSSplitViewController
```swift
import Cocoa

class MainSplitViewController: NSSplitViewController {
    override func viewDidLoad() {
        super.viewDidLoad()

        let sidebarVC = SidebarViewController()
        let sidebarItem = NSSplitViewItem(sidebarWithViewController: sidebarVC)
        sidebarItem.minimumThickness = 180
        sidebarItem.maximumThickness = 300
        addSplitViewItem(sidebarItem)

        let detailVC = DetailViewController()
        let detailItem = NSSplitViewItem(viewController: detailVC)
        detailItem.minimumThickness = 400
        addSplitViewItem(detailItem)
    }
}
```

### Step 4: NSViewController
```swift
import Cocoa

class SidebarViewController: NSViewController {
    private var tableView: NSTableView!
    private var items: [String] = ["Item 1", "Item 2", "Item 3"]

    override func loadView() {
        let scrollView = NSScrollView()
        scrollView.hasVerticalScroller = true

        tableView = NSTableView()
        tableView.addTableColumn(NSTableColumn(identifier: NSUserInterfaceItemIdentifier("name")))
        tableView.headerView = nil
        tableView.delegate = self
        tableView.dataSource = self
        tableView.target = self
        tableView.doubleAction = #selector(doubleClickRow)

        scrollView.documentView = tableView
        view = scrollView
    }

    @objc func doubleClickRow() {
        guard tableView.selectedRow >= 0 else { return }
        let selectedItem = items[tableView.selectedRow]
        print("Selected: \(selectedItem)")
    }
}

extension SidebarViewController: NSTableViewDataSource, NSTableViewDelegate {
    func numberOfRows(in tableView: NSTableView) -> Int { items.count }

    func tableView(_ tableView: NSTableView, viewFor tableColumn: NSTableColumn?, row: Int) -> NSView? {
        let cell = NSTextField(labelWithString: items[row])
        cell.isSelectable = false
        return cell
    }
}
```

### Step 5: Custom NSView Drawing
```swift
import Cocoa

class GraphView: NSView {
    var dataPoints: [CGFloat] = [] {
        didSet { needsDisplay = true }
    }

    override func draw(_ dirtyRect: NSRect) {
        guard let ctx = NSGraphicsContext.current?.cgContext else { return }

        // Background
        ctx.setFillColor(NSColor.controlBackgroundColor.cgColor)
        ctx.fill(bounds)

        // Grid lines
        ctx.setStrokeColor(NSColor.separatorColor.cgColor)
        ctx.setLineWidth(0.5)
        for i in 0..<5 {
            let y = bounds.height * CGFloat(i) / 5
            ctx.move(to: CGPoint(x: 0, y: y))
            ctx.addLine(to: CGPoint(x: bounds.width, y: y))
            ctx.strokePath()
        }

        // Data line
        guard dataPoints.count > 1 else { return }
        ctx.setStrokeColor(NSColor.controlAccentColor.cgColor)
        ctx.setLineWidth(2)
        ctx.beginPath()
        let step = bounds.width / CGFloat(dataPoints.count - 1)
        for (i, point) in dataPoints.enumerated() {
            let x = CGFloat(i) * step
            let y = point * bounds.height
            if i == 0 { ctx.move(to: CGPoint(x: x, y: y)) }
            else { ctx.addLine(to: CGPoint(x: x, y: y)) }
        }
        ctx.strokePath()
    }
}
```

## Rules
- NSApplicationDelegate for app lifecycle.
- NSSplitViewController for sidebar/detail layout.
- @IBOutlet/@IBAction for storyboard/nib connections.
- NSView draw(_:) for custom rendering — never in layout code.
- Responder chain for event handling — not direct window observation.
- KVO via NSKeyValueObservation or Combine, not manual observation.
- Auto Layout or manual frame layout — never mix both.

## References

### Reference Files
- `references/appkit-architecture.md` — NSDocument, MVC, responder chain, Auto Layout, bindings, Core Data integration, window management
- `references/appkit-controls.md` — Controls reference, customization, data sources
- `references/appkit-modernization.md` — SwiftUI hosting, Combine, async/await, Catalyst, dark mode, sandboxing, accessibility
- `references/appkit-best-practices.md` — AppKit best practices, structure, lifecycle, performance

### Related Skills
- `desktop/swiftui/SKILL.md` — Modern declarative alternative to AppKit
- `desktop/electron/SKILL.md` — Cross-platform alternative

## Handoff
Hand off to `desktop/swiftui/SKILL.md` when building new macOS features or migrating to declarative UI. Hand off to `desktop/electron/SKILL.md` when cross-platform deployment required.
