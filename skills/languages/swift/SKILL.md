# Swift Skill Architecture

## 1. Skill Context
**Focus**: iOS, macOS, watchOS development, Protocol-Oriented Programming (POP), safe memory management (ARC).
**Triggers**: swift, ios, xcode, protocol-oriented, arc, SwiftUI, UIKit.

## 2. Core Principles
- **Protocol-Oriented Programming (POP)**: Swift prefers protocols and protocol extensions over deep class inheritance. This avoids the fragile base class problem and favors composition.
- **Value Types over Reference Types**: Structs and Enums are value types (allocated on the stack, copied on assignment). Swift heavily encourages using structs for state management to avoid unintended side effects.
- **Automatic Reference Counting (ARC)**: Swift does not have a Garbage Collector. It counts references at compile/runtime. Developers must explicitly manage strong reference cycles using `weak` and `unowned` references.

## 3. Anti-Patterns
- **Force Unwrapping (`!`)**: Crashing the app because an optional is suddenly `nil`. Always use `if let` or `guard let`.
- **Massive View Controller (MVC)**: Putting all network, UI, and business logic inside a `UIViewController`. Use MVVM, VIPER, or TCA (The Composable Architecture) instead.
- **Retain Cycles in Closures**: Forgetting `[weak self]` in an escaping closure (like a network request callback), causing memory leaks because the closure captures the class instance strongly.

## 4. References
- `references/swift-fundamentals.md` — Optionals, Value Types, Closures.
- `references/swift-advanced.md` — Actors, Property Wrappers, Result Builders.
- `references/swift-testing.md` — XCTest and UI Testing.
