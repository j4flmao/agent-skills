# Rust: The Typestate Pattern (Zero-Cost State Machines)

## 1. The Problem with Runtime State
In traditional OOP, if you have an `HttpRequestBuilder`, you might throw a runtime exception if the user calls `.build()` without setting a URL first. This relies on the programmer remembering to check the documentation, and errors only happen at runtime.

Rust allows us to encode the state of an object directly into the Type System using Generics and Zero-Sized Types (ZSTs). If a developer tries to call `.build()` without a URL, the **code will not compile**.

## 2. Defining Zero-Sized Types for States
We define empty structs that exist only for the compiler. They take up 0 bytes of memory at runtime.

```rust
// Typestates (ZSTs)
pub struct NoUrl;
pub struct HasUrl;

// The Generic Builder
pub struct RequestBuilder<State> {
    url: Option<String>,
    _state: std::marker::PhantomData<State>, // Tells the compiler we are using the generic
}
```

## 3. Implementing State Transitions via Generics
We implement methods *only* for specific generic states.

```rust
// 1. Initial State: Only NoUrl can be created
impl RequestBuilder<NoUrl> {
    pub fn new() -> Self {
        RequestBuilder {
            url: None,
            _state: std::marker::PhantomData,
        }
    }

    // 2. Transition: Consume 'self' (NoUrl) and return a new builder with 'HasUrl'
    pub fn url(self, url: &str) -> RequestBuilder<HasUrl> {
        RequestBuilder {
            url: Some(url.to_string()),
            _state: std::marker::PhantomData,
        }
    }
}

// 3. Final State: Only HasUrl can call .build()
impl RequestBuilder<HasUrl> {
    pub fn build(self) -> String {
        // Safe to unwrap because the type system guarantees it was set!
        format!("Sending request to: {}", self.url.unwrap())
    }
}
```

## 4. The Compiler Guarantee
```rust
fn main() {
    // Valid Flow
    let req = RequestBuilder::new()
        .url("https://api.github.com")
        .build(); // Compiles perfectly

    // Invalid Flow
    let bad_req = RequestBuilder::new()
        .build(); // COMPILER ERROR: no method named `build` found for struct `RequestBuilder<NoUrl>`
}
```
This is the ultimate application of Generics in Rust: moving runtime panics into compile-time guarantees with absolutely zero runtime performance cost.
