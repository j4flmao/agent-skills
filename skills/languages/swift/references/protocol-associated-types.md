# Swift: Protocols with Associated Types (PATs)

## 1. The Limitation of Standard Generics
In Swift, you can write generic structs and classes like `struct Stack<Element>`. However, when you want to define a generic *interface* (Protocol), Swift uses a different concept: **Associated Types**.

You cannot write `protocol Repository<T>`. Instead, you define an associated type inside the protocol.

## 2. Defining a Protocol with an Associated Type
```swift
protocol Repository {
    // A placeholder name to be used within the protocol
    associatedtype Entity
    associatedtype ID

    func getById(id: ID) -> Entity?
    func save(entity: Entity)
}
```

## 3. Implementing the PAT
When a concrete struct or class adopts the protocol, the compiler automatically infers what `Entity` and `ID` are based on the implementation signatures.

```swift
struct User {
    let uuid: UUID
    let name: String
}

class UserRepository: Repository {
    // The compiler infers Entity = User and ID = UUID
    private var database: [UUID: User] = [:]

    func getById(id: UUID) -> User? {
        return database[id]
    }

    func save(entity: User) {
        database[entity.uuid] = entity
    }
}
```

## 4. The "Type Erasure" Design Pattern (Any...)
Because PATs resolve at compile-time, you **cannot** use them as variable types. 
For example, this is a compiler error:
`var repos: [Repository] = [] // ERROR: Protocol 'Repository' can only be used as a generic constraint`

To hold a heterogeneous collection of generic protocols, Swift developers use the **Type Erasure** design pattern by creating an `AnyRepository` wrapper class.

```swift
// The Type Eraser Wrapper
class AnyRepository<T, U>: Repository {
    private let _getById: (U) -> T?
    private let _save: (T) -> Void

    // Capture the methods of the concrete repository in closures
    init<R: Repository>(_ repository: R) where R.Entity == T, R.ID == U {
        self._getById = repository.getById
        self._save = repository.save
    }

    func getById(id: U) -> T? {
        return _getById(id)
    }

    func save(entity: T) {
        _save(entity)
    }
}

// Now you can store them!
let userRepo = UserRepository()
let wrappedRepo = AnyRepository(userRepo)
var repos: [AnyRepository<User, UUID>] = [wrappedRepo]
```
