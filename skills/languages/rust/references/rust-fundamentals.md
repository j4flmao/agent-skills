# Rust Fundamentals

## 1. Ownership Rules
Rust memory is managed through a system of ownership with a set of rules checked at compile time.
1. Each value has a variable called its **owner**.
2. There can only be one owner at a time.
3. When the owner goes out of scope, the value will be dropped.

```rust
let s1 = String::from("hello");
let s2 = s1; // Ownership is MOVED to s2.
// println!("{}", s1); // COMPILER ERROR: s1 is invalid.
```

## 2. Borrowing and References
Instead of transferring ownership, you can **borrow** a value using references (`&`).
```rust
fn calculate_length(s: &String) -> usize { // s is a reference to a String
    s.len()
} // s goes out of scope, but since it doesn't have ownership, nothing is dropped.
```

### Mutability Rules
You can have either:
- One mutable reference (`&mut T`).
- Any number of immutable references (`&T`).
This entirely prevents data races.

## 3. Enums and Pattern Matching
Rust's `enum` is actually an Algebraic Data Type (ADT).
```rust
enum Message {
    Quit,
    Move { x: i32, y: i32 },
    Write(String),
}

fn process(msg: Message) {
    match msg {
        Message::Quit => println!("Quitting"),
        Message::Move { x, y } => println!("Moving to {}, {}", x, y),
        Message::Write(text) => println!("Text: {}", text),
    }
}
```

## 4. `Option` and `Result`
Rust has no `null`. It uses `Option<T>` for absence, and `Result<T, E>` for errors.
```rust
enum Option<T> {
    Some(T),
    None,
}

enum Result<T, E> {
    Ok(T),
    Err(E),
}
```
