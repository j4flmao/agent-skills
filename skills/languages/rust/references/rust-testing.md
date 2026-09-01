# Rust Testing Framework

## 1. Built-in Test Framework
Rust has a first-class testing framework built directly into `cargo`. You don't need external libraries for basic unit tests.

```rust
pub fn add(a: i32, b: i32) -> i32 { a + b }

#[cfg(test)]
mod tests {
    use super::*; // Import parent module

    #[test]
    fn it_adds_two() {
        assert_eq!(add(2, 2), 4);
    }
    
    #[test]
    #[should_panic(expected = "Divide by zero")]
    fn test_panic() {
        // test code that panics
    }
}
```
Run tests with `cargo test`.

## 2. Integration Tests
Integration tests are placed in a completely separate `tests/` directory at the root of the project. They can only test the public API of your library.

## 3. Mocking with `mockall`
For mocking traits in unit tests, `mockall` is the industry standard.

```rust
use mockall::*;
use mockall::predicate::*;

#[automock]
trait Database {
    fn fetch_user(&self, id: u32) -> String;
}

#[test]
fn test_mocking() {
    let mut mock = MockDatabase::new();
    mock.expect_fetch_user()
        .with(eq(1))
        .times(1)
        .returning(|_| "Alice".to_string());

    assert_eq!(mock.fetch_user(1), "Alice");
}
```

## 4. Fuzz Testing
Rust heavily relies on Fuzz testing to find memory edge cases in unsafe code or parsers. Tools like `cargo-fuzz` (libFuzzer wrapper) feed random data into functions to trigger panics.
