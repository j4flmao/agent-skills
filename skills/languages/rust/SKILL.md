# Rust Skill Architecture

## 1. Skill Context
**Focus**: High-performance systems programming, memory safety without garbage collection, concurrency.
**Triggers**: rust, cargo, borrow checker, lifetimes, ownership, zero-cost abstractions, tokio.

## 2. Core Principles
- **Ownership & Borrowing**: The compiler enforces strict rules: one mutable reference OR multiple immutable references, never both. This eliminates Data Races at compile time.
- **Zero-Cost Abstractions**: High-level constructs (like Iterators or Generics) compile down to the exact same machine code as hand-written low-level C.
- **Fearless Concurrency**: The `Send` and `Sync` traits guarantee thread safety. If a type isn't thread-safe, it won't compile when passed across threads.

## 3. Anti-Patterns
- **Overusing `.clone()`**: Beginners spam `.clone()` to satisfy the borrow checker. This causes hidden memory allocations. Use references (`&`) or `Arc` instead.
- **Ignoring `Result`**: Using `.unwrap()` in production code will cause panics. Always pattern match with `match` or use the `?` operator.
- **Self-Referential Structs**: Rust hates structs that hold references to their own fields. Use `Rc/RefCell` or redesign the data structure.

## 4. References
- `references/rust-fundamentals.md` — Ownership, Lifetimes, and Enums.
- `references/rust-advanced.md` — Unsafe Rust, Macros, and Concurrency.
- `references/rust-testing.md` — Unit testing and Mocking.
