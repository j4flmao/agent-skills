# AppKit Best Practices

## Project Structure

```
MyApp.xcodeproj
├── Sources/
│   ├── App/
│   │   ├── AppDelegate.swift
│   │   └── AppDelegate+Menu.swift
│   ├── Windows/
│   │   └── MainWindowController.swift
│   ├── ViewControllers/
│   │   ├── MainSplitViewController.swift
│   │   ├── SidebarViewController.swift
│   │   └── DetailViewController.swift
│   ├── Views/
│   │   ├── CustomGraphView.swift
│   │   └── StyledButton.swift
│   ├── Models/
│   │   └── DataModel.swift
│   └── Services/
│       └── DataService.swift
├── Resources/
│   ├── Main.storyboard
│   └── Assets.xcassets
└── MyApp.entitlements
```

## View Controller Lifecycle

| Phase | Method | Use Case |
|-------|--------|----------|
| Loading | loadView() | Programmatic view creation |
| Loaded | viewDidLoad() | Initial setup, bindings |
| Appearing | viewWillAppear() | Refresh data, start timers |
| Appeared | viewDidAppear() | Start animations, observers |
| Disappearing | viewWillDisappear() | Save state |
| Disappeared | viewDidDisappear() | Cleanup observers |

### View Loading Best Practice
```swift
class CustomViewController: NSViewController {
    override func loadView() {
        view = NSView(frame: NSRect(x: 0, y: 0, width: 400, height: 300))
        view.wantsLayer = true
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        setupSubviews()
        setupBindings()
        setupNotifications()
    }
}
```

## Memory Management

| Pattern | Risk | Mitigation |
|---------|------|------------|
| Closure capture | Retain cycle | Use [weak self] |
| Delegate pattern | Strong reference | Use weak delegate |
| KVO | Observer not removed | Use NSKeyValueObservation |
| NotificationCenter | Observer leak | Remove in deinit |
| Layer-backed views | CALayer retain | Break manually in viewDidDisappear |

## Responder Chain

```
NSApplication → NSWindow → NSWindowController → NSViewController → NSView
                                                      ↓
                                               Responder Chain
                                                      ↓
                                               First Responder
```

- Override `responds(to:)` for dynamic selector validation
- Use `target` and `action` for button/menu connections
- Validate menu items with `validateMenuItem(_:)`
- Implement `NSResponder` methods in view controllers, not AppDelegate

## Auto Layout Guidelines

- Use stack views (NSStackView) for linear layouts
- Constraints: leading/trailing over left/right
- Content hugging and compression resistance priorities
- Use layout guides for consistent spacing
- Prefer constraint-based layout over frame calculations

## Performance Tips
- Use layer-backed views (wantsLayer = true) for smooth rendering
- Reuse table/collection views with identifiers
- Avoid synchronous networking on main thread
- Batch Core Data saves (50-100 inserts per batch)
- Profile with Instruments before optimizing
