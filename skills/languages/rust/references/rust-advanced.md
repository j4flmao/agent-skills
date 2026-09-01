# Advanced Rust

## 1. Unsafe Rust
Sometimes you need to tell the compiler: "I know what I'm doing, stop checking." This is necessary for FFI (calling C code) or writing low-level data structures (like a doubly linked list).

```rust
let mut num = 5;
let r1 = &num as *const i32; // Raw pointer

unsafe {
    println!("r1 is: {}", *r1); // Dereferencing a raw pointer REQUIRES an unsafe block
}
```
**Rule of thumb**: Keep `unsafe` blocks as small as possible and wrap them in safe APIs.

## 2. Macros
Macros in Rust are code that writes other code (Metaprogramming).
- **Declarative Macros** (`macro_rules!`): Used for pattern matching syntax trees (e.g., `vec![]`).
- **Procedural Macros**: Acts like a compiler plugin. It takes a stream of tokens and outputs a stream of tokens. Often used for custom derives (e.g., `#[derive(Serialize)]`).

## 3. Concurrency: `Send` and `Sync`
Rust's concurrency model is built on two marker traits:
- **`Send`**: Indicates that ownership of the type can be transferred safely between threads.
- **`Sync`**: Indicates that it is safe to access the type from multiple threads via shared references (`&T`). (A type `T` is `Sync` if `&T` is `Send`).

```rust
use std::sync::{Arc, Mutex};
use std::thread;

// Arc provides thread-safe reference counting.
// Mutex provides thread-safe interior mutability.
let counter = Arc::new(Mutex::new(0));
let mut handles = vec![];

for _ in 0..10 {
    let counter = Arc::clone(&counter);
    let handle = thread::spawn(move || {
        let mut num = counter.lock().unwrap();
        *num += 1;
    });
    handles.push(handle);
}
```
