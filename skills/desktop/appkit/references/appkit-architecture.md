# AppKit Architecture Reference

## NSDocument Architecture

```swift
class MyDocument: NSDocument {
    @objc dynamic var content = ""

    override class var autosavesInPlace: Bool { true }
    override var windowNibName: String? { "MyDocument" }

    override func data(ofType typeName: String) throws -> Data {
        Data(content.utf8)
    }

    override func read(from data: Data, ofType typeName: String) throws {
        content = String(data: data, encoding: .utf8) ?? ""
    }

    // Undo support
    @IBAction func changeContent(_ sender: Any?) {
        let oldContent = content
        // ... modify content
        undoManager?.registerUndo(withTarget: self) { target in
            target.content = oldContent
        }
    }
}
```

## MVC Pattern

```
Model        → Data + business logic (NSManagedObject, structs)
View         → NSView subviews, nibs (no logic)
Controller   → NSViewController, NSWindowController (mediates)
```

```swift
// ViewController — mediates between model and view
class ListViewController: NSViewController {
    @objc var items: [Item] = []
    @IBOutlet var tableView: NSTableView!

    func updateItems(_ newItems: [Item]) {
        items = newItems
        tableView.reloadData()
    }
}
```

## Responder Chain

```
NSApplication → NSWindow → NSWindowController
  → NSViewController → NSView → subviews (first responder)
  ↑ validateMenuItem(_:) for state-based menu enabling
```

```swift
// Validate menu items
override func validateMenuItem(_ menuItem: NSMenuItem) -> Bool {
    switch menuItem.action {
    case #selector(delete(_:)): return hasSelection
    case #selector(cut(_:)): return hasSelection
    case #selector(paste(_:)): return NSPasteboard.general.canReadItem()
    default: return super.validateMenuItem(menuItem)
    }
}

// Respond to action
@IBAction func delete(_ sender: Any?) {
    guard hasSelection else { return }
    deleteSelectedItem()
}

// Become first responder for keyboard events
override var acceptsFirstResponder: Bool { true }
```

## Auto Layout

```swift
// Programmatic Auto Layout
let view = NSView()
view.translatesAutoresizingMaskIntoConstraints = false
parentView.addSubview(view)

NSLayoutConstraint.activate([
    view.topAnchor.constraint(equalTo: parentView.topAnchor, constant: 16),
    view.leadingAnchor.constraint(equalTo: parentView.leadingAnchor, constant: 16),
    view.trailingAnchor.constraint(equalTo: parentView.trailingAnchor, constant: -16),
    view.heightAnchor.constraint(greaterThanOrEqualToConstant: 44),
])

// Priority for compression resistance / hugging
view.setContentHuggingPriority(.required, for: .horizontal)
view.setContentCompressionResistancePriority(.defaultLow, for: .vertical)

// Visual Format Language
let constraints = NSLayoutConstraint.constraints(
    withVisualFormat: "H:|-[button]-[textField(>=200)]-|",
    metrics: nil, views: ["button": button, "textField": textField])
```

## Cocoa Bindings

```swift
// Bind control to object property
textField.bind(.value,
    to: personObject,
    withKeyPath: "name",
    options: [.continuouslyUpdatesValue: true])

// Array controller for table binding
let arrayController = NSArrayController()
arrayController.content = itemsArray
tableView.bind(.content, to: arrayController,
    withKeyPath: "arrangedObjects", options: nil)

// KVO observation
observation = personObject.observe(\.name, options: [.new]) { object, change in
    updateUI()
}
```

## Core Data Integration

```swift
// NSPersistentContainer setup
class DataController {
    lazy var container: NSPersistentContainer = {
        let container = NSPersistentContainer(name: "MyApp")
        container.loadPersistentStores { _, error in
            if let error = error { fatalError(error.localizedDescription) }
        }
        return container
    }()

    var context: NSManagedObjectContext { container.viewContext }
}

// NSManagedObject subclass
@objc(Item)
class Item: NSManagedObject {
    @NSManaged var name: String
    @NSManaged var createdAt: Date
}

// Use with NSArrayController for Cocoa Bindings
arrayController.managedObjectContext = dataController.context
arrayController.entityName = "Item"
```

## Window Management

```swift
// NSWindowController
class MainWindowController: NSWindowController {
    convenience init() {
        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 1000, height: 700),
            styleMask: [.titled, .closable, .miniaturizable, .resizable,
                        .fullSizeContentView],
            backing: .buffered, defer: false)
        window.title = "My App"
        window.center()
        self.init(window: window)
    }
}

// Multiple windows
@IBAction func showPreferences(_ sender: Any?) {
    let prefWC = PreferencesWindowController()
    prefWC.showWindow(sender)
}

// Sheet
presentAsSheet(viewController)

// NSWindowDelegate
func windowWillClose(_ notification: Notification) {
    saveState()
}
func windowDidResize(_ notification: Notification) {
    saveWindowFrame()
}
```

## Key Architecture Rules

- NSApplicationDelegate for app lifecycle
- NSDocument for document-based apps (autosave, versions, iCloud)
- NSWindowController manages a single window
- NSSplitViewController for sidebar/detail layouts
- @IBOutlet/@IBAction for nib/storyboard connections
- Responder chain for event handling — not direct observation
- Cocoa Bindings + KVO for model-view synchronization
- Core Data with NSArrayController for data-bound tables
- Auto Layout for adaptive layouts
- NSViewController manages view lifecycle (loadView, viewDidLoad)
