# Advanced Swift

## 1. Swift Concurrency (Actors and async/await)
Swift 5.5 introduced native concurrency, completely replacing messy Grand Central Dispatch (GCD) closures.

### Async/Await
```swift
func fetchUser(id: Int) async throws -> User {
    let (data, response) = try await URLSession.shared.data(from: url)
    return try JSONDecoder().decode(User.self, from: data)
}
```

### Actors
Actors are reference types that protect their internal state from data races by guaranteeing that only one thread can access their mutable state at a time.
```swift
actor BankAccount {
    private var balance: Int = 0
    
    // Cross-actor calls must be awaited
    func deposit(amount: Int) {
        balance += amount
    }
}
```

## 2. Property Wrappers
Property Wrappers allow you to abstract logic away from property getters/setters. Heavily used in SwiftUI (`@State`, `@Binding`).

```swift
@propertyWrapper
struct Capitalized {
    private var value: String = ""
    
    var wrappedValue: String {
        get { value }
        set { value = newValue.capitalized }
    }
}

struct User {
    @Capitalized var name: String
}
// User(name: "alice").name == "Alice"
```

## 3. Result Builders
Result Builders power SwiftUI's declarative syntax, allowing you to build complex trees using sequential statements without commas.

```swift
@resultBuilder
struct ViewBuilder {
    static func buildBlock(_ components: View...) -> TupleView {
        return TupleView(components)
    }
}
// Allows:
// VStack {
//    Text("Hello")
//    Text("World")
// }
```
