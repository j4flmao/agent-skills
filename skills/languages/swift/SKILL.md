---
name: lang-swift
description: >
  Use this skill when the user says 'Swift', 'Swift 6', 'strict concurrency', 'actor', 'Sendable', 'async let', 'MainActor', 'data race error', 'protocol-oriented', 'value types', 'ARC', 'retain cycle', 'weak self', 'optionals', 'Swift Package Manager', 'Swift Testing', 'typed throws'. Writes and reviews modern Swift (Swift 6 language mode / Swift 6.2): optionals, value vs reference semantics, protocols and generics, ARC and retain cycles, structured concurrency with actors and Sendable, error handling, SwiftPM and testing. Do NOT use for: iOS app architecture and SwiftUI/UIKit specifics (use ios), macOS app frameworks (use desktop/swiftui or desktop/appkit), server-side Vapor architecture (use backend/swift/vapor).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [languages, swift, concurrency, actors, arc]
---

# Swift

## Purpose
Swift combines value semantics, protocol-oriented design and automatic reference counting with compile-time data-race safety in the Swift 6 language mode. Migration pain and bugs cluster around concurrency isolation, `Sendable`, retain cycles and force-unwrapping. This skill covers current idioms (Swift 6.x) for those areas.

## Agent Protocol

### Trigger
"Swift", "Swift 6", "strict concurrency", "actor", "Sendable", "async let", "MainActor", "protocol-oriented", "value types", "ARC", "retain cycle", "weak self", "optionals", "SwiftPM", "Swift Testing", "typed throws".

### Input Context
- Swift toolchain / Xcode version and language mode (Swift 5 with concurrency checking, or Swift 6)
- Platform (iOS/macOS app, server on Linux, package/library)
- Compiler diagnostics being fixed, if any

### Output Artifact
Swift code, `Package.swift` settings, or an explanation of a concurrency diagnostic with the fix. No file unless requested.

### Response Format
```
Toolchain/mode: {Swift 6.2, language mode 6}
Change: {what and why}
Code: {snippet}
Isolation: {which actor each piece runs on; why types are Sendable}
Verify: {swift build / swift test, Thread Sanitizer, Instruments}
```

## 1. Optionals
- `T?` must be unwrapped: `if let x`, `guard let x else { return }`, `??` defaults, optional chaining `a?.b?.c`.
- Force unwrap `!` and implicitly unwrapped optionals only where an invariant guarantees a value (e.g. `@IBOutlet` after load); otherwise crash risk.

## 2. Value vs Reference Semantics
- `struct`/`enum` are value types: copies are independent (standard collections use copy-on-write so copying is cheap until mutation). Value types are not guaranteed to live on the stack — storage is the compiler's choice.
- `class` and `actor` are reference types with identity, managed by ARC.
- Default to structs for models and state; use classes for shared identity, inheritance, or Objective-C interop.
- Noncopyable types (`~Copyable`) express unique ownership (file descriptors, tokens) with `consuming`/`borrowing` parameters.

## 3. Protocols and Generics
```swift
protocol Repository {
    associatedtype Item: Identifiable
    func fetch(id: Item.ID) async throws -> Item
}

func load<R: Repository>(_ repo: R, ids: [R.Item.ID]) async throws -> [R.Item] {
    try await withThrowingTaskGroup(of: R.Item.self) { group in
        for id in ids { group.addTask { try await repo.fetch(id: id) } }
        return try await group.reduce(into: []) { $0.append($1) }
    }
}
```
- `some Protocol` (opaque, static dispatch) vs `any Protocol` (existential box, dynamic dispatch) — prefer `some`/generics in hot code; `any` is explicit since Swift 5.6 and required for existentials with associated types.
- Protocol extensions provide default implementations; composition over class inheritance. (The generic call above needs `R: Sendable` under Swift 6 checking because the task closures capture `repo`.)

## 4. ARC and Retain Cycles
- Strong reference cycles (object ↔ closure, parent ↔ child, delegate) leak. Break them with `weak` (optional, becomes nil) or `unowned` (non-optional, crashes if the object is gone — use only when lifetimes are guaranteed).
- Escaping closures stored on `self` capture it strongly: `{ [weak self] in guard let self else { return } ... }`.
- `Task { }` keeps captured `self` alive until the task finishes; cancel long-running tasks when the owner goes away.
- Find leaks with Xcode's Memory Graph debugger and Instruments Leaks/Allocations.

## 5. Structured Concurrency
- `async`/`await`, `async let` for a fixed number of concurrent children, `TaskGroup` for dynamic fan-out; child tasks are cancelled with their parent. `Task.detached` only when you explicitly need no inherited context.
- Cancellation is cooperative: check `try Task.checkCancellation()` or `Task.isCancelled` in long loops.
- **Actors** serialise access to their mutable state; calls from outside are `await`ed. Actor methods are re-entrant: state can change across an `await` inside the actor — re-check invariants after suspension.
- `@MainActor` for UI state and UI-facing types.
```swift
actor ImageCache {
    private var store: [URL: Data] = [:]
    func data(for url: URL, loader: @Sendable (URL) async throws -> Data) async throws -> Data {
        if let hit = store[url] { return hit }
        let data = try await loader(url)          // suspension: another call may fill the cache meanwhile
        store[url] = data
        return data
    }
}
```

### Swift 6 data-race safety
- The Swift 6 language mode turns data-race diagnostics into errors. Values crossing isolation domains must be `Sendable` (value types of Sendable members are implicitly Sendable; final classes with immutable state can conform; `@unchecked Sendable` is a promise you must back with locking).
- `sending` parameters/results (Swift 6) allow transferring non-Sendable values when the compiler can prove no other reference remains.
- Swift 6.2 "approachable concurrency": opt-in default `@MainActor` isolation for app/UI targets, nonisolated async functions running on the caller's actor, and `@concurrent` to explicitly move work off it. Enable per target via build settings / SwiftPM `swiftSettings`.
- Migrate module by module: enable complete checking in Swift 5 mode first, fix warnings, then switch the language mode.

## 6. Error Handling
- `throws` with `do/catch`, `try?` (to optional), `try!` (crash on error — avoid). Typed throws (Swift 6): `func parse() throws(ParseError) -> Config` when callers benefit from exhaustive handling; untyped `throws` remains the default for public APIs.
- Use `Result` mainly when storing outcomes or bridging callback APIs.

## 7. Tooling and Testing
- SwiftPM (`Package.swift`) for packages and server apps; `swift build`, `swift test`; `swift-format` or SwiftLint for style.
- Swift Testing (`import Testing`, `@Test`, `#expect`, `#require`, parameterised tests) ships with Xcode 16+/Swift 6 toolchains and runs alongside XCTest; XCTest remains for UI tests and performance tests. See `references/swift-testing.md`.
- Thread Sanitizer for runtime races in code still compiled in Swift 5 mode.

## 8. Anti-Patterns
| Anti-pattern | Problem | Fix |
|--------------|---------|-----|
| Force unwrapping external data | crashes | `guard let`, decoding with defaults/errors |
| Strong `self` in stored escaping closures | leaks | `[weak self]` |
| `@unchecked Sendable` to silence errors | hides real races | actor, immutable state, or a lock with proof |
| `DispatchQueue` + `async/await` mixed ad hoc | lost isolation guarantees | adopt actors/`@MainActor` consistently |
| Massive view controllers / god types | untestable | split state, services, views (see `ios`) |
| `any Protocol` in tight loops | dynamic dispatch + boxing | generics / `some` |

## 9. Checklist
- [ ] No unjustified `!`/`try!`
- [ ] Models are value types; reference types justified
- [ ] Closures capturing `self` reviewed for cycles; long tasks cancellable
- [ ] Complete concurrency checking (or Swift 6 mode) clean without `@unchecked` shortcuts
- [ ] Tests in Swift Testing/XCTest; leaks checked in Instruments

## References
- `references/swift-fundamentals.md` — optionals, value types, closures
- `references/swift-advanced.md` — actors, property wrappers, result builders
- `references/protocol-associated-types.md` — associated types, opaque and existential types
- `references/swift-testing.md` — XCTest and Swift Testing
