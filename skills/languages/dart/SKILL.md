# Dart Skill Architecture

## 1. Skill Context
**Focus**: Cross-platform UI development (Flutter), client-side logic, high UI performance (60/120 fps).
**Triggers**: dart, flutter, widget, state management, bloc, isolates, ffi.

## 2. Core Principles
- **JIT & AOT Compilation**: Dart runs with a Just-In-Time (JIT) compiler during development for lightning-fast Hot Reload, and compiles Ahead-Of-Time (AOT) to native ARM/x86 machine code for highly optimized production releases.
- **Single-Threaded Event Loop**: Dart is single-threaded by default. Async operations (`Future` and `Stream`) do not run on separate threads; they are scheduled on the Event Loop (similar to Node.js).
- **Everything is an Object**: There are no primitives (even `int` is an object), but Dart is strictly typed and memory-safe.

## 3. Anti-Patterns
- **Blocking the Event Loop**: Running heavy computations (like parsing a massive JSON payload or image processing) directly in an `async` function. This causes "jank" (stuttering) in the UI. Heavy work MUST be moved to a separate `Isolate`.
- **Forgetting `await`**: Dart doesn't warn you aggressively if you call an async function without `await` and don't assign it. The function fires and execution moves on immediately.
- **Ignoring Null Safety Warnings**: Using `!` (bang operator) to force unwrap nullables in Flutter widgets will cause the "Red Screen of Death" in production.

## 4. References
- `references/dart-fundamentals.md` — Null Safety, Mixins, Streams.
- `references/dart-advanced.md` — Isolates, FFI, Metaprogramming.
- `references/dart-testing.md` — Unit tests, Widget tests.
