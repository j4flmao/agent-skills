# AppKit Architecture Reference

## Project Structure (Xcode)

```
MyApp/
├── App/
│   ├── AppDelegate.swift            # NSApplicationDelegate
│   └── Info.plist                    # Bundle config, LSUIElement, etc.
├── Windows/
│   ├── MainWindowController.swift    # NSWindowController subclass
│   └── MainWindow.xib                # Window layout in Interface Builder
├── ViewControllers/
│   ├── SidebarViewController.swift   # NSSplitView child
│   ├── DetailViewController.swift
│   └── PreferencesViewController.swift
├── Views/
│   ├── CustomGraphView.swift         # NSView subclass
│   └── BadgeView.swift
├── Models/
│   ├── Document.swift                # NSDocument subclass
│   └── DataStore.swift
├── Helpers/
│   ├── Formatters.swift
│   └── Extensions.swift
├── Resources/
│   ├── Assets.xcassets/
│   └── Main.storyboard
└── Supporting/
    └── MyApp.entitlements           # Sandbox entitlements
```

## App Lifecycle

```swift
@main
class AppDelegate: NSObject, NSApplicationDelegate {
    // 1. applicationWillFinishLaunching — before UI is ready
    func applicationWillFinishLaunching(_ notification: Notification) {
        // Register defaults, set up logging, migrate data
        UserDefaults.standard.register(defaults: ["initialSetup": true])
    }

    // 2. applicationDidFinishLaunching — UI is ready
    func applicationDidFinishLaunching(_ notification: Notification) {
        // Show window, check for updates via Sparkle
    }

    // 3. applicationDidBecomeActive — app in foreground
    func applicationDidBecomeActive(_ notification: Notification) {
        // Refresh UI, check network
    }

    // 4. applicationDidResignActive — app in background
    func applicationDidResignActive(_ notification: Notification) {
        // Pause animations, save autosave
    }

    // 5. applicationWillTerminate — about to quit
    func applicationWillTerminate(_ notification: Notification) {
        // Final save, clean up temp files
    }

    // 6. applicationShouldTerminate — ask to quit
    func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply {
        // Check for unsaved documents
        return .terminateNow
    }
}
```

## Responder Chain

```
NSApplication
  ↑
NSWindow
  ↑
NSWindowController
  ↑
NSViewController
  ↑
NSView (first responder)
  ↓ (default: next responder)
NSView superview → ... → NSWindow → NSWindowController → NSApplication
```

```swift
// Validate menu items via responder chain
override func validateMenuItem(_ menuItem: NSMenuItem) -> Bool {
    switch menuItem.action {
    case #selector(delete(_:)):
        return hasSelection
    case #selector(cut(_:)):
        return hasSelection
    default:
        return super.validateMenuItem(menuItem)
    }
}

// Respond to actions
@IBAction func delete(_ sender: Any?) {
    guard hasSelection else { return }
    deleteSelectedItem()
}

// Become first responder for keyboard events
override var acceptsFirstResponder: Bool { return true }
override func keyDown(with event: NSEvent) {
    if event.keyCode == 51 { // Delete key
        delete(nil)
    } else {
        super.keyDown(with: event)
    }
}
```

## Cocoa Bindings

```swift
// Bind NSTextField value to object property
// In Interface Builder or code:
textField.bind(.value,
    to: personObject,
    withKeyPath: "name",
    options: [.continuouslyUpdatesValue: true])

// Using NSObjectController
let controller = NSObjectController(content: personObject)
textField.bind(.value, to: controller, withKeyPath: "selection.name", options: nil)

// KVO for manual observation
observation = personObject.observe(\.name, options: [.new]) { object, change in
    self.updateUI()
}
```

## Undo Manager

```swift
@IBAction func moveItem(_ sender: Any?) {
    let oldIndex = selectedIndex
    let newIndex = oldIndex + 1
    let item = items[oldIndex]

    // Perform action
    items.remove(at: oldIndex)
    items.insert(item, at: newIndex)

    // Register undo
    undoManager?.registerUndo(withTarget: self) { target in
        target.moveItem(from: newIndex, to: oldIndex)
    }
    undoManager?.setActionName("Move Item")
}

// NSUndoManager grouped operations
undoManager?.beginUndoGrouping()
// ... multiple operations ...
undoManager?.endUndoGrouping()
undoManager?.setActionName("Delete Items")
```

## Sandbox Entitlements

```xml
<!-- MyApp.entitlements -->
<dict>
    <key>com.apple.security.app-sandbox</key>
    <true/>
    <key>com.apple.security.files.user-selected.read-write</key>
    <true/>
    <key>com.apple.security.network.client</key>
    <true/>
    <key>com.apple.security.print</key>
    <true/>
    <key>com.apple.security.device.camera</key>
    <false/>
    <key>com.apple.security.device.microphone</key>
    <false/>
    <key>com.apple.security.personal-information.addressbook</key>
    <false/>
    <key>com.apple.security.files.downloads.read-write</key>
    <false/>
</dict>
```

## NSDocument Architecture

```swift
class MyDocument: NSDocument {
    @objc var content: String = ""

    override class var autosavesInPlace: Bool { true }

    override var windowNibName: String? { "MyDocument" }

    override func data(ofType typeName: String) throws -> Data {
        return Data(content.utf8)
    }

    override func read(from data: Data, ofType typeName: String) throws {
        content = String(data: data, encoding: .utf8) ?? ""
    }
}
```

## Preferences Window

```swift
// Preferences window via storyboard
@IBAction func showPreferences(_ sender: Any?) {
    let storyboard = NSStoryboard(name: "Preferences", bundle: nil)
    let windowController = storyboard.instantiateInitialController()
        as! NSWindowController
    windowController.showWindow(sender)
}

// Tabbed preferences
class PrefsTabViewController: NSTabViewController {
    override func viewDidLoad() {
        tabViewItems = [
            NSTabViewItem(viewController: GeneralPrefsVC()),
            NSTabViewItem(viewController: AdvancedPrefsVC()),
        ]
    }
}
```
