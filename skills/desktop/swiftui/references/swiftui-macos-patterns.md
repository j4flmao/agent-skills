# SwiftUI macOS Patterns Reference

## Menu Bar Extra

```swift
import SwiftUI

@main
struct MyApp: App {
    @NSApplicationDelegateAdaptor(MenuBarDelegate.self) var delegate

    var body: some Scene {
        WindowGroup { ContentView() }
    }
}

class MenuBarDelegate: NSObject, NSApplicationDelegate {
    private var statusItem: NSStatusItem!
    private var popover: NSPopover!

    func applicationDidFinishLaunching(_ notification: Notification) {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        statusItem.button?.image = NSImage(systemSymbolName: "star.fill", accessibilityDescription: "My App")

        popover = NSPopover()
        popover.contentViewController = NSHostingController(rootView: PopoverView())
        popover.behavior = .transient

        statusItem.button?.action = #selector(togglePopover)
    }

    @objc func togglePopover() {
        guard let button = statusItem.button else { return }
        if popover.isShown {
            popover.performClose(nil)
        } else {
            popover.show(relativeTo: button.bounds, of: button, preferredEdge: .minY)
        }
    }
}

struct PopoverView: View {
    var body: some View {
        VStack(spacing: 12) {
            Text("Quick Actions")
                .font(.headline)
            Button("New Item") { /* action */ }
            Button("Preferences") { /* action */ }
            Divider()
            Button("Quit") { NSApplication.shared.terminate(nil) }
        }
        .padding()
        .frame(width: 200)
    }
}
```

## Multiple Windows (macOS 14+)

```swift
import SwiftUI

@main
struct MyApp: App {
    var body: some Scene {
        WindowGroup(id: "editor") {
            EditorView()
        }
        .windowResizability(.contentMinSize)
        .defaultSize(width: 900, height: 600)
        .defaultPosition(.center)
        .windowToolbarStyle(.unified(showsTitle: true))
        .commandsRemoved()

        Window("Preview", id: "preview") {
            PreviewView()
        }
        .keyboardShortcut("p", modifiers: [.command, .option])
        .defaultSize(width: 400, height: 500)

        // Open from code
        // @Environment(\.openWindow) var openWindow
        // openWindow(id: "preview")
        // openWindow(value: documentID)
    }
}
```

## Toolbar and Title Bar

```swift
struct ContentView: View {
    var body: some View {
        NavigationSplitView {
            SidebarView()
        } detail: {
            DetailView()
        }
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button(action: addItem) {
                    Label("Add", systemImage: "plus")
                }
            }

            ToolbarItem(placement: .automatic) {
                Button(action: toggleSidebar) {
                    Label("Toggle Sidebar", systemImage: "sidebar.left")
                }
            }

            ToolbarItemGroup(placement: .automatic) {
                Button("Share", systemImage: "square.and.arrow.up") {}
                Button("Print", systemImage: "printer") {}
            }
        }
        .navigationTitle("My Document")
        .navigationSubtitle("Last edited 2m ago")
    }
}
```

## Tab View (macOS Style)

```swift
TabView {
    Tab("Browse", systemImage: "list.bullet") {
        BrowseView()
    }
    Tab("Favorites", systemImage: "star") {
        FavoritesView()
    }
    Tab("Settings", systemImage: "gearshape") {
        SettingsView()
    }
}
.tabViewStyle(.sidebarAdaptable)  // macOS 15+ sidebar tabs
// .tabViewStyle(.automatic) — default macOS tabs
```

## Alerts, Sheets, and Popovers

```swift
struct ContentView: View {
    @State private var showingAlert = false
    @State private var showingSheet = false
    @State private var showingPopover = false

    var body: some View {
        VStack {
            Button("Show Alert") { showingAlert = true }
            Button("Show Sheet") { showingSheet = true }
            Button("Show Popover") { showingPopover = true }
        }
        .alert("Delete Item?", isPresented: $showingAlert) {
            Button("Delete", role: .destructive) { /* delete */ }
            Button("Cancel", role: .cancel) { }
        } message: {
            Text("This action cannot be undone.")
        }
        .sheet(isPresented: $showingSheet) {
            SheetView()
                .frame(minWidth: 400, minHeight: 300)
        }
        .popover(isPresented: $showingPopover) {
            Text("Popover content")
                .padding()
        }
    }
}
```

## Drag and Drop

```swift
List(items) { item in
    Text(item.title)
        .draggable(item)
}
.onDrop(of: [.text], delegate: DropDelegate(items: $items))

struct DropDelegate: DropDelegate {
    @Binding var items: [Item]

    func performDrop(info: DropInfo) -> Bool {
        guard info.hasItemsConforming(to: [.text]) else { return false }
        // Handle drop
        return true
    }
}
```

## Handoff / Continuity

```swift
struct ContentView: View {
    @State private var activity: NSUserActivity?

    var body: some View {
        Text("Edit")
            .userActivity("com.example.edit") { activity in
                activity.isEligibleForHandoff = true
                activity.userInfo = ["documentID": documentID]
                self.activity = activity
            }
            .onContinueUserActivity("com.example.edit") { activity in
                if let id = activity.userInfo?["documentID"] as? String {
                    loadDocument(id)
                }
            }
    }
}
```

## Bundle-Embedded Help

```swift
// Show Help window
import Cocoa
NSHelpManager.shared.openHelpAnchor("my-help-anchor", inBook: "MyApp Help")

// Help book: MyApp.help/
// Contents/Info.plist
// Contents/Resources/en.lproj/index.html
```

## Full-Screen Support

```swift
struct ContentView: View {
    @Environment(\.isFullScreen) private var isFullScreen

    var body: some View {
        Button(isFullScreen ? "Exit Full Screen" : "Enter Full Screen") {
            NSApplication.shared.keyWindow?.toggleFullScreen(nil)
        }
    }
}
```
