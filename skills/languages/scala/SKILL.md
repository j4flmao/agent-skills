# Scala Skill Architecture

## 1. Skill Context
**Focus**: Functional Programming on the JVM, Big Data (Apache Spark), highly concurrent systems (Akka, ZIO).
**Triggers**: scala, sbt, functional programming, type classes, implicits, givens, spark, zio, cats.

## 2. Core Principles
- **Pure Functional Programming**: Scala encourages writing pure functions without side effects. State is represented through immutable data structures (like `List`, `Vector`, `Map`).
- **Expression-Oriented**: Almost everything in Scala is an expression that returns a value (including `if/else`, `try/catch`, and `match`).
- **Advanced Type System**: Scala has one of the most powerful type systems on the JVM, supporting Higher-Kinded Types (`F[_]`), Intersection Types, and Union Types (Scala 3).

## 3. Anti-Patterns
- **Using `var` instead of `val`**: Mutable state (`var`) should be avoided. Use `val` and create new copies of case classes with the `.copy()` method.
- **Throwing Exceptions**: In pure functional Scala, throwing exceptions breaks referential transparency. Use `Try`, `Either`, or `Option` to encode errors in the return type.
- **Overusing `null`**: Scala integrates with Java, so `null` exists, but a Scala developer should *never* use it. Always wrap potentially absent values in `Option`.

## 4. References
- `references/scala-fundamentals.md` — Case Classes, Pattern Matching, For-comprehensions.
- `references/scala-advanced.md` — Type Classes, ZIO, Implicits/Givens.
- `references/scala-testing.md` — ScalaTest and Property-Based Testing.
