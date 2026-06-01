# iOS Advanced Topics

## Introduction
Advanced iOS topics cover performance profiling, Combine deep patterns, Swift concurrency, Core Data heavy migrations, custom animations, advanced testing, and App Store optimization.

## Advanced SwiftUI

### Performance Optimization
Use `EquatableView` / `.equatable()` to prevent unnecessary recomputation. `LazyVStack` for lists (over `VStack` + `ScrollView`). `AnyLayout` for adaptive layouts. Profile with Xcode Instruments (SwiftUI template). Avoid complex view hierarchies in `List` rows.

### Custom Transitions and Animations
`MatchedGeometryEffect` for shared element transitions. `transition(_:)` with asymmetric transitions (insertion/removal). `TimelineView` for time-driven animations. `Canvas` for custom drawing with GPU acceleration. `.animation(_:value:)` for targeted animations.

### Preferences and View Tree
`PreferenceKey` protocol for child-to-parent communication. `anchorPreference` for geometry-based preferences. `GeometryReader` for container-relative sizing. Custom layouts with `Layout` protocol (iOS 16+).

## Combine Framework

### Publishers and Operators
`URLSession.DataTaskPublisher` for network requests. `PassthroughSubject` for imperative bridging. `CurrentValueSubject` for state with initial value. Key operators: `map`, `flatMap`, `switchToLatest`, `debounce`, `throttle`, `combineLatest`, `zip`.

### Memory Management
`AnyCancellable` store in `Set<AnyCancellable>` or `@Published` property wrapper. `share()` / `multicast()` for avoiding duplicate work. `flatMap` with `maxPublishers` to limit concurrency. Use `weak self` in closures to avoid retain cycles.

### Scheduler Strategies
`receive(on: DispatchQueue.main)` for UI updates. `subscribe(on:)` for background work. `ImmediateScheduler` for testing. `RunLoop.main` for timer-based publishers. `DispatchQueue.main.async` in sink for main thread guarantee.

## Swift Concurrency

### Async/Await
Structured concurrency with `async` functions and `await` calls. `Task { }` for fire-and-forget. `Task.detached` for unowned scope. `Task.withCheckedContinuation` for bridging callbacks. `AsyncSequence` for streaming data.

### Actors
`actor` keyword for thread-safe mutable state. Actor isolation enforced at compile time. `nonisolated` for sync methods that don't access mutable state. `MainActor` for main-thread-bound code. `@MainActor` on classes/functions.

### AsyncStream
`AsyncStream` for bridging callback-based APIs to async sequences. Buffering policy for back pressure. `TaskGroup` for dynamic task creation. `withThrowingTaskGroup` for error handling in parallel tasks.

## Core Data Advanced

### Heavyweight Migration
Use `NSMappingModel` for complex schema changes (renames, splits, merges). `NSMigrationManager` for custom migration logic. Progressive migration for multi-step upgrades. Test migration from every previous version in CI.

### Performance
Batch operations with `NSBatchInsertRequest` / `NSBatchUpdateRequest` (bypasses context). Prefetch relationships with `relationshipKeyPathsForPrefetching`. Set fetch batch size for large datasets. Use `privateQueueConcurrencyType` for background contexts.

### iCloud Sync
`NSPersistentCloudKitContainer` for bidirectional iCloud sync. Handle sync conflicts with `NSMergePolicy`. Test with multiple devices simultaneously. Be aware of sync delays (seconds to minutes). Account for quota limits.

## Advanced Testing

### XCUITest Patterns
Page Object Model for reusable screen definitions. `XCTContext.runActivity` for test step logging. Screenshot capture on failure. `waitForExistence` with timeout (no fixed delays). Test on multiple device sizes.

### Performance Testing
`measure(metrics: [XCTClockMetric, XCPMemoryMetric])` for baseline tracking. `XCTOSSignpostMetric` for custom signpost measurement. `MetricKit` for production performance aggregation. Compare against baseline in CI.

### Network Testing
`OHHTTPStubs` / `.urlProtocol` for network request mocking. `URLProtocol` subclass for intercepting URLSession requests. Test offline scenarios, timeouts, and error responses. Verify retry behavior.

## App Store Optimization

### App Thinning
Asset catalog slicing for device-specific assets. On-demand resources for downloadable content. SPM and static frameworks reduce dynamic linker overhead. Bitcode is deprecated in Xcode 16.

### Code Signing & Provisioning
Fastlane Match for automated certificate management. Distribution certificates vs development certificates. Provisioning profiles per capability/team. Xcode Cloud or GitHub Actions with `APP_STORE_CONNECT_API_KEY`.

### Submission Best Practices
TestFlight internal testing (100 testers, no review). External testing with Beta App Review. Phased release (7-day gradual). Monitor crash rate during phased release. Pre-release crash reporting with TestFlight feedback.

## Key Points
- Instruments for SwiftUI and memory profiling
- `@Observable` class (iOS 17+) replaces ObservableObject for better perf
- `switchToLatest` for search-as-you-type patterns in Combine
- Actors for thread-safe state management
- Heavyweight Core Data migration with NSMappingModel
- Page Object Model for maintainable XCUITest suites
- Baseline performance tracking with XCTMetric
- On-demand resources for app thinning
- Fastlane Match for certificate automation
- Phased releases with crash monitoring
