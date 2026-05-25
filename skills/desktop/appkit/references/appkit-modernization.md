# AppKit Modernization Reference

## SwiftUI Hosting

```swift
import SwiftUI

// Host SwiftUI view inside AppKit
class HostViewController: NSViewController {
    private var hostingController: NSHostingController<SettingsView>?

    override func viewDidLoad() {
        let swiftUIView = SettingsView()
        hostingController = NSHostingController(rootView: swiftUIView)
        addChild(hostingController!)
        view.addSubview(hostingController!.view)
        hostingController!.view.frame = view.bounds
        hostingController!.view.autoresizingMask = [.width, .height]
    }
}

// Use SwiftUI in NSViewRepresentable
struct MapView: NSViewRepresentable {
    func makeNSView(context: Context) -> MKMapView {
        MKMapView()
    }
    func updateNSView(_ nsView: MKMapView, context: Context) { }
}

// Use AppKit in SwiftUI via NSViewRepresentable
struct AppKitTextField: NSViewRepresentable {
    @Binding var text: String
    func makeNSView(context: Context) -> NSTextField {
        let tf = NSTextField(string: text)
        tf.delegate = context.coordinator
        return tf
    }
    func updateNSView(_ nsView: NSTextField, context: Context) {
        nsView.stringValue = text
    }
}
```

## Combine

```swift
import Combine

class ModernViewModel {
    @Published var searchText = ""
    @Published var results: [Item] = []

    private var cancellables = Set<AnyCancellable>()

    init() {
        $searchText
            .debounce(for: .milliseconds(300), scheduler: RunLoop.main)
            .removeDuplicates()
            .sink { [weak self] text in
                Task { await self?.search(text) }
            }
            .store(in: &cancellables)
    }

    @MainActor
    func search(_ query: String) async {
        // Perform search
    }
}
```

## Async/Await

```swift
// Modern async/await in AppKit
class ModernViewController: NSViewController {
    @IBAction func loadData(_ sender: Any?) {
        Task { [weak self] in
            do {
                let data = try await fetchData()
                await MainActor.run {
                    self?.updateUI(with: data)
                }
            } catch {
                await self?.showError(error)
            }
        }
    }

    func fetchData() async throws -> [Item] {
        let url = URL(string: "https://api.example.com/items")!
        let (data, _) = try await URLSession.shared.data(from: url)
        return try JSONDecoder().decode([Item].self, from: data)
    }
}

// Actor isolation
@MainActor
class SafeViewModel {
    var items: [Item] = []
    func updateItems(_ newItems: [Item]) { items = newItems }
}

// Continuations for delegate-based APIs
class ContinuationDelegate: NSObject, NSOpenSavePanelDelegate {
    func beginOpenPanel() async -> URL? {
        await withCheckedContinuation { continuation in
            let panel = NSOpenPanel()
            panel.delegate = self
            panel.begin { response in
                continuation.resume(returning: response == .OK ? panel.url : nil)
            }
        }
    }
}
```

## Catalyst (Mac Catalyst)

```xml
<!-- Info.plist for Catalyst -->
<key>UIApplicationSceneManifest</key>
<dict>
  <key>UIApplicationSupportsMultipleScenes</key>
  <true/>
</dict>
<key>NSCameraUsageDescription</key>
<string>Used for video calls</string>
```

```swift
// Platform conditionals
#if targetEnvironment(macCatalyst)
// macOS-specific Catalyst code
view.window?.windowScene?.titlebar?.titleVisibility = .hidden
#else
// iOS code
#endif
```

## Dark Mode

```swift
// Respond to appearance changes
override func viewDidChangeEffectiveAppearance() {
    super.viewDidChangeEffectiveAppearance()
    updateColorsForCurrentAppearance()
}

// Get current appearance
let isDark = effectiveAppearance.name == .darkAqua

// Dynamic system colors (automatically adapt)
view.layer?.backgroundColor = NSColor.controlBackgroundColor.cgColor
textField.textColor = NSColor.labelColor

// Custom dynamic color
extension NSColor {
    static var customAdaptive: NSColor {
        NSColor(name: "CustomAdaptive") { appearance in
            appearance.isDark ? NSColor.white : NSColor.black
        }
    }
}

// Observe changes
NSApp.effectiveAppearance.observeChanges {
    // React to appearance change
}
```

## Sandboxing

```xml
<!-- Sandbox entitlements -->
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
```

## Accessibility

```swift
// Set accessibility attributes
button.setAccessibilityLabel("Save document")
button.setAccessibilityHelp("Saves the current document to disk")
slider.setAccessibilityValue("50 percent")

// Implement accessibility protocol
class CustomView: NSView {
    override func accessibilityChildren() -> [Any]? {
        return [childButton, childTextField]
    }
    override func accessibilityRole() -> NSAccessibility.Role? { .group }
    override func isAccessibilityElement() -> Bool { true }
}

// VoiceOver notifications
NSAccessibility.post(element: button,
    notification: .focused)
NSAccessibility.post(element: self,
    notification: .announcementRequested,
    userInfo: [.announcement: "Data loaded successfully"])
```

## Modernization Checklist

- SwiftUI views hosted via NSHostingController for new UIs
- NSViewRepresentable for wrapping AppKit views in SwiftUI
- Combine for reactive data pipelines (debounce, filter, merge)
- async/await for all async operations (URLSession, file I/O)
- @MainActor for UI-bound classes
- Mac Catalyst for iPad app → Mac porting
- Dark mode using dynamic NSColor system values
- Sandboxed with minimal entitlements
- Accessibility labels and roles on all controls
- NSBackgroundActivityScheduler replacing NSTimer for maintenance
- Unarchiver and NSKeyedUnarchiver → modern Codable
- NSOutlineView → List with diffable data sources
- Sparkle framework for self-updating (non-App Store)
