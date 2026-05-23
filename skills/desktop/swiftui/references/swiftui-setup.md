# SwiftUI Setup Reference

## Xcode Project Setup

```bash
# Xcode 16+ with macOS 15+ SDK
xcode-select --install

# Create via CLI
mkdir MyApp && cd MyApp
swift package init --type executable

# Or use Xcode template:
# File > New > Project > macOS > App
# Interface: SwiftUI, Language: Swift
```

## Package.swift Configuration

```swift
// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "MyApp",
    platforms: [
        .macOS(.v14)  // Minimum macOS 14 Sonoma
    ],
    dependencies: [],
    targets: [
        .executableTarget(
            name: "MyApp",
            resources: [.process("Assets.xcassets")]
        )
    ]
)
```

## SwiftUI Previews

```swift
#Preview("Light Mode") {
    ContentView()
        .modelContainer(for: Item.self, inMemory: true)
        .frame(width: 800, height: 600)
}

#Preview("Dark Mode") {
    ContentView()
        .modelContainer(for: Item.self, inMemory: true)
        .preferredColorScheme(.dark)
        .frame(width: 800, height: 600)
}

#Preview("Item Detail") {
    ItemDetailView(item: Item(title: "Sample", details: "Preview data"))
        .frame(width: 400, height: 300)
}
```

## Property Wrappers Reference

| Wrapper | Scope | Purpose |
|---------|-------|---------|
| @State | Local view | Simple value types, view-local state |
| @Binding | Passed down | Two-way connection to @State elsewhere |
| @Observable | Class | Swift 5.9 observation — preferred for model layer |
| @StateObject | View owns | Reference type ObservableObject (legacy) |
| @ObservedObject | View observes | Reference type passed in (legacy) |
| @EnvironmentObject | Shared | Dependency injection via environment |
| @Environment | System | Read system values (colorScheme, dismiss, etc.) |
| @AppStorage | Persisted | UserDefaults-backed property |
| @SceneStorage | Per-scene | Scene-scoped persisted state |
| @Query | SwiftData | SwiftData fetch request |
| @FocusState | Keyboard | Track focused element |
| @Bindable | Bindable | Create Binding from @Observable |
| @Namespace | Animation | Named namespace for matched geometry |

## SwiftData Configuration

```swift
import SwiftData

// Model definition
@Model
final class Project {
    @Attribute(.unique) var id: String
    var name: String
    var createdAt: Date
    @Relationship(deleteRule: .cascade) var tasks: [Task]

    init(name: String) {
        self.id = UUID().uuidString
        self.name = name
        self.createdAt = Date()
        self.tasks = []
    }
}

@Model
final class Task {
    var title: String
    var isComplete: Bool
    var project: Project?

    init(title: String) {
        self.title = title
        self.isComplete = false
    }
}

// Container setup
#Preview {
    ContentView()
        .modelContainer(for: [Project.self, Task.self])
}

// @Query usage
@Query(filter: #Predicate<Task> { $0.isComplete == false },
       sort: \Task.title)
var incompleteTasks: [Task]

@Query(filter: #Predicate<Project> { !$0.name.isEmpty },
       sort: [SortDescriptor(\Project.createdAt, order: .reverse)])
var projects: [Project]
```

## Environment Values

```swift
// Inject
ContentView()
    .environment(myViewModel)
    .environment(\.font, .title)
    .modelContainer(for: Item.self)

// Read
@Environment(\.dismiss) private var dismiss
@Environment(\.openWindow) private var openWindow
@Environment(\.colorScheme) private var colorScheme
@Environment(\.controlActiveState) private var activeState
@Environment(\.undoManager) private var undoManager
```

## Common Modifiers

```swift
Text("Hello")
    .font(.title)
    .fontWeight(.semibold)
    .foregroundStyle(.primary)
    .padding()
    .background(.windowBackground, in: .rect(cornerRadius: 8))
    .shadow(radius: 2)
    .help("This is a tooltip")  // macOS tooltip
    .focusable()
    .onHover { hovering in
        cursor = hovering ? .pointingHand : .arrow
    }
    .onTapGesture { print("Tapped") }
```

## Window Configuration

```swift
// Multi-window app
@main
struct MyApp: App {
    var body: some Scene {
        WindowGroup(id: "main") {
            ContentView()
        }
        .windowResizability(.contentSize)
        .windowToolbarStyle(.unified)
        .defaultSize(width: 800, height: 600)

        Window("Inspector", id: "inspector") {
            InspectorView()
        }
        .keyboardShortcut("i", modifiers: [.command, .option])
    }
}
```

## Debugging

```bash
# Enable SwiftUI preview crash logs
export SwiftUI_PREVIEW_CRASH_LOGS=1

# SwiftUI debugging
# In Xcode: Edit Scheme > Run > Arguments > -com.apple.CoreData.ConcurrencyDebug 1

# View debugger
# Xcode > Debug > View Debugging > Capture View Hierarchy

# Signposts for performance
import os.signpost
let signpostID = OSSignpostID(log: .default)
os_signpost(.begin, log: .default, name: "render", signpostID: signpostID)
// work
os_signpost(.end, log: .default, name: "render", signpostID: signpostID)
```

## Distribution

```bash
# Archive
xcodebuild archive -scheme MyApp -configuration Release

# Export for notarization
xcodebuild -exportArchive -archivePath MyApp.xcarchive \
  -exportPath MyApp -exportOptionsPlist ExportOptions.plist

# Notarize
xcrun notarytool submit MyApp.dmg \
  --apple-id user@example.com \
  --team-id TEAMID \
  --password @keychain:AC_PASSWORD
```

## ExportOptions.plist

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>developer-id</string>
  <key>signingStyle</key>
  <string>automatic</string>
  <key>teamID</key>
  <string>TEAMID</string>
</dict>
</plist>
```
