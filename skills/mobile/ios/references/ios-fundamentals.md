# iOS Fundamentals

## Overview
iOS is Apple's mobile operating system for iPhone and iPad. Modern iOS development uses Swift with SwiftUI for UI, Combine for reactive programming, and Swift Package Manager for dependencies. UIKit remains relevant for complex custom UI and backward compatibility.

## Core Concepts

### App Lifecycle
An iOS app transitions through states: Not Running, Active, Inactive, Background, Suspended. `UISceneDelegate` manages scene lifecycle (multitasking). `@main` attribute marks the app entry point. `applicationDidEnterBackground` for saving state.

### View Controller Lifecycle (UIKit)
View controllers follow: `loadView`, `viewDidLoad`, `viewWillAppear`, `viewDidAppear`, `viewWillDisappear`, `viewDidDisappear`. Use `viewDidLoad` for one-time setup, `viewWillAppear` for refresh on return. `deinit` for cleanup.

### SwiftUI View Lifecycle
Views are value types that describe UI. Body computed property evaluated when state changes. `onAppear`/`onDisappear` for lifecycle hooks. `@State` for local state, `@StateObject` for owned ObservableObject, `@ObservedObject` for passed objects.

### MVC and MVVM
UIKit follows MVC (Massive View Controller — anti-pattern). Modern iOS uses MVVM with `ObservableObject`/`@Published` and SwiftUI. View observes ViewModel's `@Published` properties. ViewModel handles business logic and state.

## Architecture Patterns

### MVVM with SwiftUI
View (struct) observes ViewModel (`@Observable` class in iOS 17+). ViewModel injects dependencies, manages state, and handles user actions. Repository abstracts data source. Coordinator handles navigation (optional in SwiftUI with NavigationStack).

### Coordinator Pattern (UIKit)
Navigation extracted from ViewControllers. Coordinator owns UINavigationController and manages screen transitions. Child coordinators for nested flows. ViewControllers communicate via delegate/callback, never push directly.

### Model-View-Update (TCA)
The Composable Architecture for Swift: State (single source of truth), Action (user events), Reducer (pure function: State + Action -> State + Effect). Store manages state and dispatches actions. Strongly typed and testable.

## Data Management

### Core Data
Apple's object graph and persistence framework. Managed Object Model defines entities/relationships. NSPersistentContainer handles stack setup. NSFetchedResultsController for reactive table updates. Lightweight migration for simple schema changes.

### SwiftData (iOS 17+)
Modern replacement for Core Data using Swift macros. `@Model` macro on classes. `@Query` for fetching in SwiftUI. `ModelContainer` for configuration. Automatic iCloud sync with `CloudKit` container.

### UserDefaults & Keychain
UserDefaults for lightweight preferences (strings, numbers, booleans). Keychain for sensitive data (tokens, passwords) via `SecItemAdd`/`SecItemCopyMatching`. Use `kSecAttrAccessibleWhenUnlockedThisDeviceOnly` for maximum security.

## Security Fundamentals

### App Transport Security (ATS)
ATS enforces HTTPS connections (TLS 1.2+) to all URLs. Configure exceptions in Info.plist for specific domains. Disable ATS only with strong justification (`NSAllowsArbitraryLoads`). Use certificate pinning for sensitive APIs.

### Face ID / Touch ID
Use `LAContext` from `LocalAuthentication` framework. Check `canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics)` before prompting. Fall back to device passcode. Handle `.appCancel`, `.userFallback`, and `.biometryLockout` errors.

### Data Protection
File-level encryption with `NSFileProtectionComplete` for sensitive data. Keychain data encrypted per-file. Exclude non-sensitive files from backup with `URLResourceValues.isExcludedFromBackup`.

## Build & Dependency Management

### Xcode Build System
Xcode uses build settings (`.xcconfig` files) for configuration. Schemes define build/run/test/profile/archive actions. Configurations: Debug (development), Release (App Store). Provisioning profiles and certificates managed via Apple Developer portal.

### Swift Package Manager
SPM is Apple's integrated dependency manager. `Package.swift` defines dependencies and targets. Xcode resolves and integrates packages. Prefer SPM over CocoaPods for new projects. Supports binary targets for closed-source libraries.

### CocoaPods and Carthage
CocoaPods: `Podfile` specifies dependencies, `pod install` generates workspace. Carthage: builds dynamic frameworks, manual linking. Both are legacy — migrate to SPM when possible.

## Testing

### XCTest
Apple's testing framework integrated with Xcode. Unit tests for business logic. Performance tests with `measure` block. UI tests with XCUITest for automated interaction. Test plans for organizing test configurations.

### Snapshot Testing
iOSSnapshotTestCase (FBSnapshotTestCase) for visual regression. Compare rendered view against reference PNG. Run on CI with consistent simulator configuration. Require human review for baseline changes.

### Swift Testing (iOS 17+)
New testing framework with `#expect` macros, parameterized tests, and traits. `@Test` attribute replaces `test` prefix. `@Suite` for test organization. Traits for tags, enabled conditions, and time limits.

## Key Points
- Swift is the primary language; SwiftUI is the modern UI framework
- Combine/Observable for reactive state management
- MVVM + Repository + Coordinator for clean architecture
- Core Data / SwiftData for persistence; Keychain for secrets
- SPM for dependency management (migrate from CocoaPods)
- XCUITest + XCTest for testing; snapshot tests for visual regression
- ATS enforces HTTPS; Data Protection for file encryption
- `@Observable` (iOS 17+) replaces `ObservableObject`
- NavigationStack for declarative navigation
- Build configurations via `.xcconfig` files
