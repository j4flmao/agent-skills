# Swift Fundamentals

## 1. Optionals and Safely Unwrapping
An Optional in Swift is actually an Enum with two cases: `.some(Wrapped)` and `.none`.
```swift
var username: String? = "Alice"

// 1. guard let (Early Exit - Preferred)
func printUser() {
    guard let name = username else {
        print("No user found")
        return
    }
    print("User is \(name)") // name is available in the outer scope
}

// 2. if let (Scoped)
if let name = username {
    print("User is \(name)") // name only available inside brackets
}

// 3. Nil-Coalescing
let display = username ?? "Guest"
```

## 2. Structs vs Classes
- **Structs**: Value types. Mutating a struct creates a new copy (optimized by Copy-on-Write for collections). You must use the `mutating` keyword for functions that alter internal state.
- **Classes**: Reference types. Support inheritance. Managed by ARC.

```swift
struct Point {
    var x, y: Int
    mutating func moveRight() { x += 1 }
}
```

## 3. Closures (Escaping vs Non-Escaping)
By default, closures in Swift are non-escaping (they execute before the function returns). If a closure is stored to be executed later (like an async API call), it must be marked `@escaping`.

```swift
class NetworkManager {
    var onComplete: (() -> Void)?

    // Must be @escaping because we store it to be called later
    func fetch(completion: @escaping () -> Void) {
        self.onComplete = completion
        
        DispatchQueue.main.async {
            completion()
        }
    }
}
```
