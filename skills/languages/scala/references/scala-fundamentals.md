# Scala Fundamentals

## 1. Case Classes and Immutability
Case classes are the bread and butter of Scala. They are immutable, compare by value (not reference), and come with built-in `apply`, `unapply`, and `copy` methods.

```scala
case class User(id: Int, name: String, isActive: Boolean)

val u1 = User(1, "Alice", true) // No 'new' keyword needed
val u2 = u1.copy(isActive = false) // Creates a new immutable instance
```

## 2. Pattern Matching
Scala's `match` is like a `switch` statement on steroids. It can destructure case classes, check types, and apply guard conditions.

```scala
def processUser(user: User): String = user match {
  case User(1, "Alice", true) => "Found active Admin Alice"
  case User(_, name, true)    => s"Found active user $name"
  case User(_, _, false)      => "User is inactive"
  case _                      => "Unknown"
}
```

## 3. For-Comprehensions
A for-comprehension is syntactic sugar for chaining `flatMap`, `map`, and `withFilter` on monadic types (like `Option`, `List`, `Future`).

```scala
val maybeUser: Option[String] = Some("Alice")
val maybeAge: Option[Int] = Some(25)

// The result is an Option[String]
val result: Option[String] = for {
  user <- maybeUser
  age  <- maybeAge if age >= 18
} yield s"$user is an adult."

println(result) // Some("Alice is an adult.")
```
