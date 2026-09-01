# C# Skill Architecture

## 1. Skill Context
**Focus**: Enterprise backend systems, game development (Unity), high-performance cloud APIs (.NET Core).
**Triggers**: csharp, c#, .net core, linq, async await, entity framework, asp.net.

## 2. Core Principles
- **Managed Memory with Value Types**: C# uses a Garbage Collector for classes (reference types allocated on the Heap), but heavily utilizes `struct` (value types allocated on the Stack) to achieve C++ like memory locality and avoid GC pressure.
- **Asynchronous by Default**: The `async / await` state machine is baked into the language deeply, making I/O bound scalability trivial compared to classic thread pools.
- **Language Integrated Query (LINQ)**: Functional programming concepts applied to collections, SQL databases, and XML.

## 3. Anti-Patterns
- **`async void`**: Should only ever be used for UI Event Handlers. Using `async void` in a library or API swallows exceptions and crashes the application domain. Always use `async Task`.
- **`.Result` or `.Wait()`**: Blocking an async task synchronously causes catastrophic thread pool starvation (Deadlocks) in ASP.NET classic. Always use `await`.
- **String Concatenation in Loops**: Strings are immutable. Using `+=` in a loop allocates thousands of strings. Use `StringBuilder`.

## 4. References
- `references/csharp-fundamentals.md` — Value vs Reference types, LINQ, Async.
- `references/csharp-advanced.md` — Reflection, Span, Source Generators.
- `references/csharp-testing.md` — xUnit, Moq, FluentAssertions.
