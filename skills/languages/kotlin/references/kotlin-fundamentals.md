# Kotlin Fundamentals

## 1. Null Safety and the Elvis Operator
Nullability is built into the type system.
```kotlin
var a: String = "abc"
// a = null // COMPILER ERROR

var b: String? = "abc"
b = null // OK

// Safe call (?.)
val length = b?.length // Returns null if b is null

// Elvis operator (?:)
val safeLength = b?.length ?: 0 // Returns 0 if b is null
```

## 2. Data Classes
In Java, you write POJOs with `equals()`, `hashCode()`, `toString()`, and `copy()`. In Kotlin, it's one line.
```kotlin
data class User(val id: Int, val name: String)

val u1 = User(1, "Alice")
val u2 = u1.copy(name = "Bob") // Creates a new immutable copy
```

## 3. Scope Functions
Kotlin standard library provides `let`, `run`, `with`, `apply`, and `also` to execute a block of code within the context of an object.

- **`let`**: Used for null-checks. (Context object: `it`, Returns: lambda result)
  ```kotlin
  name?.let { print(it.length) }
  ```
- **`apply`**: Used for object configuration. (Context object: `this`, Returns: context object)
  ```kotlin
  val intent = Intent().apply {
      action = Intent.ACTION_VIEW
      data = Uri.parse("https://google.com")
  }
  ```
- **`also`**: Used for side-effects like logging. (Context object: `it`, Returns: context object)
  ```kotlin
  val user = getUser().also { logger.info("Fetched user: $it") }
  ```
