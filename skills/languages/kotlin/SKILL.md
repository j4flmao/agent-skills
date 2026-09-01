# Kotlin Skill Architecture

## 1. Skill Context
**Focus**: Android development, Modern JVM Backend (Spring Boot), Multiplatform (KMP), null safety, coroutines.
**Triggers**: kotlin, k8s, spring boot, android, jvm, coroutines, null-safety.

## 2. Core Principles
- **100% Java Interoperability**: Kotlin compiles to JVM bytecode. You can call Java from Kotlin and vice versa seamlessly.
- **Null Safety by Default**: The type system distinguishes between nullable (`String?`) and non-nullable (`String`) types, effectively eliminating `NullPointerException` (The Billion Dollar Mistake).
- **Extension Functions**: You can add new methods to existing classes (even final ones like `String`) without inheriting from them.

## 3. Anti-Patterns
- **The `!!` Operator**: Force-unwrapping a nullable type. If it's null, it throws an NPE. Only use this if you mathematically prove to the compiler something cannot be null, but prefer `?:` (Elvis operator).
- **Global Mutable State in Coroutines**: Coroutines run on multiple threads. Mutating a shared variable without `Mutex` or `Atomic` types causes race conditions.
- **Heavy computations in `Dispatchers.Main`**: Blocking the main thread in Android freezes the UI. Always switch to `Dispatchers.Default` for CPU work and `Dispatchers.IO` for network/DB work.

## 4. References
- `references/kotlin-fundamentals.md` — Nullability, Data Classes, Scope Functions.
- `references/kotlin-advanced.md` — Coroutines, Flows, Inline Classes.
- `references/kotlin-testing.md` — MockK, Kotest, Coroutine Testing.
