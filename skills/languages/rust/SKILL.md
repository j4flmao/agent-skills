---
name: lang-rust
description: >
  Use this skill when the user says 'Rust', 'cargo', 'borrow checker', 'lifetimes', 'ownership', 'traits', 'generics Rust', 'Result and ?', 'thiserror', 'anyhow', 'tokio', 'async Rust', 'Send Sync', 'unsafe Rust', 'clippy', 'Rust 2024 edition'. Writes and reviews idiomatic Rust: ownership and borrowing, lifetimes, traits and generics, error handling, async with Tokio, concurrency with Send/Sync, unsafe boundaries, Cargo workspaces, testing and tooling. Do NOT use for: Rust web framework architecture (use backend/rust/*), no_std firmware (use bare-metal-rust), Tauri desktop apps (use desktop/tauri).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [languages, rust, ownership, async, tokio, cargo]
---

# Rust

## Purpose
Rust guarantees memory safety and freedom from data races in safe code through ownership and borrowing, with performance comparable to C/C++. Productivity comes from designing data so the borrow checker agrees, using the type system for errors and states, and keeping `unsafe` small and audited. This skill covers those idioms for current stable Rust (2024 edition).

## Agent Protocol

### Trigger
"Rust", "cargo", "borrow checker", "lifetimes", "ownership", "traits", "Result", "thiserror", "anyhow", "tokio", "async Rust", "Send/Sync", "unsafe", "clippy".

### Input Context
- Rust toolchain/MSRV and edition; crate type (binary, library, workspace)
- Runtime (sync, Tokio, embedded) and key dependencies
- The compiler error or code to review

### Output Artifact
Rust code, `Cargo.toml` changes, or an explanation of a borrow-checker error with the fix. No file unless requested.

### Response Format
```
Toolchain: {1.xx, edition 2024}
Problem/Goal: {what}
Code: {snippet}
Why it compiles/is sound: {ownership/lifetime reasoning}
Verify: cargo clippy -- -D warnings && cargo test
```

## 1. Ownership and Borrowing
- Each value has one owner; assignment/pass-by-value moves it (unless `Copy`). At any time: many `&T` **or** one `&mut T`.
- Function signatures: take `&str`/`&[T]`/`&T` to borrow, `T` to consume, `&mut T` to modify; return owned values.
- Fixing borrow errors: shorten borrows (scope blocks, compute indices first), split structs so fields are borrowed independently, use indices/IDs instead of references between objects, or move ownership.
- `.clone()` is fine for small or reference-counted data; in hot paths prefer borrowing. `Rc`/`Arc` for shared ownership, `RefCell`/`Mutex`/`RwLock` for interior mutability.
- Self-referential structs do not work with plain references — use indices, arenas, or `Pin` + crates like `ouroboros` only when unavoidable.

## 2. Lifetimes
Lifetimes name how long borrows are valid; elision rules cover most functions. Annotate when returning a reference derived from inputs:
```rust
fn longest<'a>(a: &'a str, b: &'a str) -> &'a str { if a.len() >= b.len() { a } else { b } }
```
Structs holding references need lifetime parameters (`struct Parser<'src> { input: &'src str }`); if that spreads everywhere, store owned data instead.

## 3. Traits and Generics
- Generics (`fn f<T: Display>(x: T)` / `impl Display`) are monomorphised: zero-cost dispatch, larger binaries. Trait objects (`Box<dyn Trait>`, `&dyn Trait`) use a vtable: one copy of code, dynamic dispatch.
- Implement standard traits so types compose: `Debug`, `Clone`, `PartialEq`/`Eq`/`Hash`, `Default`, `From`/`TryFrom`, `Display`, `Iterator`.
- Encode states in types (typestate) to make invalid sequences unrepresentable — see `references/typestate-pattern-generics.md`.

## 4. Error Handling
```rust
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ConfigError {
    #[error("reading {path}: {source}")]
    Io { path: String, #[source] source: std::io::Error },
    #[error("invalid port {0}")]
    InvalidPort(u32),
}

pub fn load(path: &str) -> Result<Config, ConfigError> {
    let text = std::fs::read_to_string(path)
        .map_err(|source| ConfigError::Io { path: path.to_owned(), source })?;
    parse(&text)
}
```
- Libraries: typed errors with `thiserror`. Applications: `anyhow::Result` with `.context("...")` for rich messages.
- `?` propagates; `unwrap()`/`expect()` only for invariants (`expect` with the reason) and in tests. Panics are for bugs, not for expected failures.

## 5. Concurrency
- `Send` (can move to another thread) and `Sync` (`&T` can be shared) are auto traits; the compiler rejects sharing non-thread-safe types (`Rc`, `RefCell`) across threads.
- Patterns: `std::thread::scope` for borrowing data in threads, `Arc<Mutex<T>>`/`Arc<RwLock<T>>`, channels (`std::sync::mpsc`, `crossbeam`), data parallelism with `rayon` (`par_iter()`).

## 6. Async with Tokio
```rust
#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let client = reqwest::Client::builder().timeout(std::time::Duration::from_secs(5)).build()?;
    let (a, b) = tokio::try_join!(
        client.get("https://example.com/a").send(),
        client.get("https://example.com/b").send(),
    )?;
    println!("{} {}", a.status(), b.status());
    Ok(())
}
```
- Futures are lazy and cooperative: never block inside async code (`std::thread::sleep`, heavy CPU, blocking I/O) — use `tokio::time::sleep`, `spawn_blocking`, or a rayon pool.
- `tokio::spawn` requires `'static + Send` futures; use `JoinSet` to manage groups of tasks and `CancellationToken` (tokio-util) or `select!` for shutdown.
- Do not hold a `std::sync::Mutex` guard across `.await`; use `tokio::sync::Mutex` only when the lock must be held across awaits.
- `async fn` in traits is stable (1.75); use `#[trait_variant::make(Send)]` or explicit `impl Future + Send` when callers need `Send` futures.

## 7. Unsafe
Keep `unsafe` blocks minimal, wrapped in safe APIs, each with a `// SAFETY:` comment stating the invariant. Run `cargo miri test` on unsafe code. In the 2024 edition `unsafe extern` blocks and `unsafe` attributes (`#[unsafe(no_mangle)]`) are required, and references to `static mut` are denied by default.

## 8. Cargo and Tooling
- Workspaces for multi-crate repos with shared `[workspace.dependencies]`; feature flags additive only.
- `cargo fmt`, `cargo clippy -- -D warnings`, `cargo test`, `cargo doc`, `cargo deny`/`cargo audit` for licences and advisories, `cargo nextest` for faster tests, `criterion`/`divan` for benchmarks, `cargo flamegraph` for profiling.
- Release profile: `lto = "thin"`, `codegen-units = 1` when binary speed matters.

## 9. Anti-Patterns
| Anti-pattern | Problem | Fix |
|--------------|---------|-----|
| `.unwrap()` on I/O/parse results in production | panics | `?` with context |
| Cloning to silence the borrow checker in hot loops | allocations | restructure borrows / indices |
| `Arc<Mutex<_>>` around everything | contention, deadlocks | message passing, ownership per task |
| Blocking calls inside async tasks | stalls the runtime | `spawn_blocking` |
| `String` parameters where `&str` suffices | forces allocations on callers | borrow (`&str`, `impl AsRef<str>`) |
| Large `unsafe` blocks without invariants | unsound code | small blocks + `SAFETY` comments + Miri |

## 10. Checklist
- [ ] Clippy clean with `-D warnings`; `cargo fmt` applied
- [ ] Errors typed (lib) or contextual (app); no stray `unwrap`
- [ ] No blocking in async; tasks joined/cancelled on shutdown
- [ ] `unsafe` justified, encapsulated, tested under Miri
- [ ] `cargo audit`/`cargo deny` in CI

## References
- `references/rust-fundamentals.md` — ownership, lifetimes, enums
- `references/rust-advanced.md` — unsafe, macros, concurrency
- `references/typestate-pattern-generics.md` — typestate with generics
- `references/rust-testing.md` — unit/integration tests, mocking
