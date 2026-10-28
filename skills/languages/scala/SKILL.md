---
name: lang-scala
description: >
  Use this skill when the user says 'Scala', 'Scala 3', 'sbt', 'scala-cli', 'given/using', 'implicits', 'type classes', 'opaque types', 'ADT enum', 'Cats Effect', 'ZIO', 'Pekko', 'Akka', 'Spark Scala', 'for-comprehension', 'munit'. Writes and reviews idiomatic Scala 3 (and Scala 2.13 where required): ADTs with enums, type classes with givens, extension methods, opaque types, effect systems (Cats Effect, ZIO), actor toolkits, Spark constraints, builds and testing. Do NOT use for: Play framework service architecture (use backend/scala/play), Spark job tuning (use data/distributed-compute), Java-only code (use java).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [languages, scala, functional-programming, jvm, cats-effect, zio]
---

# Scala

## Purpose
Scala blends object-oriented and functional programming on the JVM with an expressive type system. Scala 3 simplified implicits into `given`/`using`, added enums, opaque types and union types. This skill covers idiomatic modelling, effect handling, ecosystem choices (including licence changes in the actor space), and version constraints such as Spark's Scala 2.13 requirement.

## Agent Protocol

### Trigger
"Scala", "Scala 3", "sbt", "scala-cli", "given/using", "implicits", "type classes", "opaque types", "enum ADT", "Cats Effect", "ZIO", "Pekko", "Akka", "Spark Scala", "for-comprehension".

### Input Context
- Scala version (3.3 LTS / latest 3.x, or 2.13) and JVM version
- Ecosystem (Typelevel/Cats Effect, ZIO, Pekko/Akka, Spark, Play)
- Build tool (sbt, Mill, scala-cli)

### Output Artifact
Scala code, build definitions, or review findings. No file unless requested.

### Response Format
```
Scala/JVM: {3.3 LTS / 21}
Stack: {Cats Effect | ZIO | Pekko | Spark | plain}
Change: {what and why}
Code: {snippet}
Verify: {sbt test / scala-cli test, scalafmt, scalafix}
```

## 1. Version Choice
- New projects: Scala 3 (3.3.x is the LTS line; newer 3.x "Next" releases add features). Libraries cross-build where users still need 2.13.
- Apache Spark: use Scala 2.13 (Spark 4 dropped 2.12; Scala 3 is not officially supported for Spark applications).
- Scala 3 can consume most Scala 2.13 libraries (TASTy/binary compatibility), but macros must be rewritten.

## 2. Modelling with ADTs and Opaque Types
```scala
enum PaymentStatus:
  case Pending
  case Settled(amount: BigDecimal)
  case Failed(reason: String)

opaque type AccountId = String
object AccountId:
  def apply(s: String): Either[String, AccountId] =
    if s.matches("[A-Z]{2}\\d{8}") then Right(s) else Left(s"invalid account id: $s")
  extension (id: AccountId) def value: String = id

def describe(s: PaymentStatus): String = s match
  case PaymentStatus.Pending        => "pending"
  case PaymentStatus.Settled(amt)   => s"settled $amt"
  case PaymentStatus.Failed(reason) => s"failed: $reason"
```
- Pattern matches on enums/sealed traits are checked for exhaustiveness.
- Opaque types give type safety without boxing; smart constructors validate once at the boundary.
- `case class` + `copy` for immutable records; `val` over `var`; immutable collections by default.

## 3. Type Classes with Givens
```scala
trait Show[A]:
  extension (a: A) def show: String

given Show[Int] with
  extension (a: Int) def show: String = s"Int($a)"

given [A](using s: Show[A]): Show[List[A]] with
  extension (as: List[A]) def show: String = as.map(_.show).mkString("[", ", ", "]")

def log[A: Show](a: A): Unit = println(a.show)   // context bound = using Show[A]
```
- `given` defines instances, `using` requests them, `summon[T]` retrieves one; imports of givens are explicit (`import mylib.given`).
- Prefer derivation (`derives Eq, Codec`) where libraries support it (e.g. circe, zio-json).
- Higher-kinded types (`F[_]`) power tagless-final style — see `references/higher-kinded-types.md`; use it when abstracting over effects is valuable, not by default.

## 4. Errors and Effects
- Pure code: `Option` for absence, `Either[E, A]` for recoverable errors, `Try` at the edges with exception-throwing Java APIs. Avoid `null` (enable `-Yexplicit-nulls` in Scala 3 when interop allows).
- Effect systems manage async, resources and concurrency with cancellation:
| | Cats Effect 3 (Typelevel) | ZIO 2 |
|--|---------------------------|-------|
| Core type | `IO[A]` | `ZIO[R, E, A]` (env, typed error) |
| Resources | `Resource` | `ZIO.scoped`, `ZLayer` |
| Concurrency | fibers, `parTraverse`, `Ref`, `Deferred` | fibers, `ZIO.foreachPar`, `Ref`, `Promise` |
| Ecosystem | http4s, fs2, doobie, skunk | zio-http, zio-streams, zio-json |
- Do not mix `Future` with an effect system casually; convert at the boundary (`IO.fromFuture`, `ZIO.fromFuture`). `Future` is eager and needs an `ExecutionContext`.
- Blocking calls go on the blocking pool (`IO.blocking`, `ZIO.attemptBlocking`).

## 5. Actors
Akka changed to the Business Source Licence (BSL) in 2022 (version 2.7+); commercial use beyond the free tier needs a licence. Apache Pekko is the Apache-2.0 fork of Akka 2.6 with the same APIs under `org.apache.pekko`. Use typed actors (`Behavior[T]`) for new code.

## 6. Build and Tooling
- sbt (most common), Mill, or scala-cli for scripts/small projects (`//> using dep ...` directives).
- Formatting/linting: scalafmt, scalafix; compiler flags `-deprecation -feature -Werror` (Scala 3: `-Wunused:all`).
- Testing: munit, ScalaTest, weaver (Cats Effect), zio-test; ScalaCheck for property tests. See `references/scala-testing.md`.

## 7. Anti-Patterns
| Anti-pattern | Problem | Fix |
|--------------|---------|-----|
| Implicit conversions | surprising behaviour | explicit methods / extension methods |
| Wildcard implicit/given imports everywhere | hard-to-trace resolution | targeted given imports |
| `Await.result` on Futures in request paths | thread starvation | compose asynchronously |
| Throwing exceptions in pure code | breaks referential transparency | `Either`/effect error channel |
| Deep type-level abstractions for simple apps | onboarding cost | concrete types first |
| Mutable collections shared across threads | races | immutable data, `Ref` |

## 8. Checklist
- [ ] Scala version chosen per constraints (Spark → 2.13)
- [ ] ADTs/enums with exhaustive matches; opaque types for IDs
- [ ] Errors modelled in types; effects isolated at edges
- [ ] Blocking work on blocking pools; resources acquired with `Resource`/scopes
- [ ] scalafmt/scalafix and warnings-as-errors in CI

## References
- `references/scala-fundamentals.md` — case classes, pattern matching, for-comprehensions
- `references/scala-advanced.md` — type classes, givens, ZIO/Cats Effect
- `references/higher-kinded-types.md` — `F[_]`, tagless final
- `references/scala-testing.md` — ScalaTest, munit, property-based testing
