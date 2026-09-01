# Advanced Scala

## 1. Implicits and Givens (Scala 3)
In Scala 2, `implicit` parameters were used to automatically pass context (like a database connection or execution context) without polluting the method signature.
In Scala 3, this was redesigned into `given` and `using` for clarity.

```scala
// Scala 3 Syntax
given defaultTimeout: Int = 5000

// The compiler automatically injects defaultTimeout here
def fetchData(url: String)(using timeout: Int): String = {
  s"Fetching $url with timeout $timeout"
}

fetchData("http://api.com") 
```

## 2. Type Classes
Scala doesn't need traditional interfaces to add behavior to a class. Type Classes allow you to define behavior for types you don't even own (like `String` or `Int`).

```scala
trait JsonEncoder[A] {
  def encode(a: A): String
}

// Implement for a type we own
given JsonEncoder[User] with
  def encode(u: User): String = s"""{"name": "${u.name}"}"""

// An extension method utilizing the Type Class
extension [A](value: A)(using encoder: JsonEncoder[A])
  def toJson: String = encoder.encode(value)

val u = User("Alice")
println(u.toJson) // Extremely clean API
```

## 3. Pure Functional Effects (ZIO / Cats Effect)
Instead of dealing with `Future` (which starts executing immediately and is difficult to compose safely), modern Scala uses effect systems like ZIO. A `ZIO` effect is just a description of a program that hasn't run yet.

```scala
import zio._

val myApp: ZIO[Any, IOException, Unit] = for {
  _    <- Console.printLine("What is your name?")
  name <- Console.readLine
  _    <- Console.printLine(s"Hello, $name!")
} yield ()

// The program only executes when interpreted by the ZIO Runtime
```
