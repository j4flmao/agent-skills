# Rust Testing Guide

## Test Organization

```rust
// Unit tests — alongside code
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_order_total() {
        let order = Order::new("cust-1".into());
        order.add_item(Item::new(100.0, 2));
        assert_eq!(order.total(), 200.0);
    }
}

// Integration tests — in tests/ directory
// tests/api_test.rs
use my_app::app;

#[tokio::test]
async fn test_create_order() {
    let app = app().await;
    let response = app
        .post("/api/orders")
        .json(&CreateOrderRequest { customer_id: "c1".into() })
        .await;
    assert_eq!(response.status(), 201);
}
```

## Testing Async Code

```rust
use tokio::test;

#[tokio::test]
async fn test_async_repo() {
    let repo = PostgresRepo::new().await;
    let order = repo.save(test_order()).await.unwrap();
    let found = repo.find_by_id(order.id()).await.unwrap();
    assert_eq!(found.id(), order.id());
}

// With timeout
#[tokio::test(start_paused = true)]
async fn test_with_timeout() {
    tokio::time::sleep(Duration::from_secs(3600)).await; // instant
}
```

## Mocking with Mockall

```rust
use mockall::{automock, predicate::*};

#[automock]
trait OrderRepository {
    fn find_by_id(&self, id: Uuid) -> Result<Order, Error>;
    fn save(&self, order: Order) -> Result<Order, Error>;
}

#[tokio::test]
async fn test_order_service() {
    let mut mock = MockOrderRepository::new();
    mock.expect_find_by_id()
        .with(eq(Uuid::new_v4()))
        .returning(|_| Ok(Order::default()));

    let service = OrderService::new(Box::new(mock));
    let result = service.get_order(Uuid::new_v4()).await;
    assert!(result.is_ok());
}
```

## Property-Based Testing

```rust
use proptest::prelude::*;

proptest! {
    #[test]
    fn test_order_total_never_negative(
        price in 0.0..10000.0f64,
        qty in 0u32..100,
    ) {
        let item = Item::new(price, qty);
        assert!(item.total() >= 0.0);
    }

    #[test]
    fn test_email_validation(email in "[a-z]+@[a-z]+\\.[a-z]{2,4}") {
        assert!(is_valid_email(&email));
    }
}
```

## Test Fixtures & Setup

```rust
use std::sync::OnceLock;
use sqlx::PgPool;

static POOL: OnceLock<PgPool> = OnceLock::new();

async fn test_db() -> &'static PgPool {
    POOL.get_or_init(|| async {
        PgPool::connect(&std::env::var("TEST_DATABASE_URL").unwrap())
            .await
            .unwrap()
    }).await
}

fn test_order() -> Order {
    Order::new(
        CustomerId::new("c1"),
        vec![Item::new("SKU-1", 50.0, 2)],
    )
}
```

## Recommended Crates

| Crate | Purpose |
|-------|---------|
| `mockall` | Trait mocking |
| `proptest` | Property-based testing |
| `fake` | Fake data generation |
| `claim` | Better assertion macros |
| `testcontainers` | DB integration tests |
| `assert_matches` | Pattern matching assertions |

## Test Attribute Cheat Sheet

```rust
#[test]                    // Basic test
#[tokio::test]             // Async tokio test
#[should_panic(expected)]  // Expected panic
#[ignore]                  // Skip test
#[cfg(test)]               // Test-only module
```

## Best Practices

- One assertion per test — use `assert_eq!`, `assert_ne!`, `assert!`
- AAA pattern: Arrange, Act, Assert
- Use `#[should_panic]` sparingly — prefer `Result<(), Error>` return
- `cargo test` with `-- --nocapture` to see println output
- `cargo test <name>` to run specific test
- Use `with |e| format!("{e:?}")` in `Result::expect` for test setup only
