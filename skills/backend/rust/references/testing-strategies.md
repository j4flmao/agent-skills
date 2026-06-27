# Rust Backend Testing Strategies

## 1. The Rust Testing Ecosystem

Rust provides a built-in testing framework that executes seamlessly via `cargo test`. A robust backend test suite should cover:
- Unit Tests (Testing pure logic and domain functions).
- Integration Tests (Testing the API endpoints with a real or mocked database).
- End-to-End (E2E) Tests.

## 2. Unit Testing

Unit tests should reside in the same file as the code they test, within a `tests` module annotated with `#[cfg(test)]`.

```rust
// src/domain/calculator.rs
pub fn calculate_discount(price: f64, discount_pct: f64) -> f64 {
    price * (1.0 - (discount_pct / 100.0))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_discount() {
        let result = calculate_discount(100.0, 20.0);
        assert_eq!(result, 80.0);
    }
}
```

## 3. Mocking Dependencies

For testing services that rely on external systems (like databases), use mocking. The `mockall` crate is widely used for this.

```rust
// src/ports/user_repo.rs
use async_trait::async_trait;
use mockall::automock;
use crate::domain::User;

#[automock]
#[async_trait]
pub trait UserRepository: Send + Sync {
    async fn find_user(&self, id: i32) -> Result<Option<User>, String>;
}

// src/application/service.rs
#[cfg(test)]
mod tests {
    use super::*;
    use crate::ports::user_repo::MockUserRepository;
    use std::sync::Arc;

    #[tokio::test]
    async fn test_user_service_finds_user() {
        let mut mock_repo = MockUserRepository::new();
        
        mock_repo.expect_find_user()
            .with(mockall::predicate::eq(1))
            .times(1)
            .returning(|_| Ok(Some(User { id: 1, name: "Test".into() })));

        let service = UserService::new(Arc::new(mock_repo));
        let user = service.get_user(1).await.unwrap();
        
        assert_eq!(user.name, "Test");
    }
}
```

## 4. Integration Testing with Axum

Integration tests should test the entire HTTP lifecycle without spinning up the actual server port. Axum allows extracting the `Router` and testing it directly using `tower::ServiceExt`.

Place integration tests in the `tests/` directory at the project root.

```rust
// tests/api_tests.rs
use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use tower::ServiceExt; // for `oneshot` and `ready`
use my_backend::app_router; // Your function returning Axum Router

#[tokio::test]
async fn test_health_check() {
    let app = app_router();

    let response = app
        .oneshot(Request::builder().uri("/health").body(Body::empty()).unwrap())
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
}
```

## 5. Database Integration Testing (Testcontainers)

Mocking the database is good for unit tests, but integration tests should use a real database. `testcontainers` allows spinning up Docker containers dynamically during testing.

```rust
use testcontainers::clients;
use testcontainers::images::postgres::Postgres;
use sqlx::PgPool;

#[tokio::test]
async fn test_database_insert() {
    let docker = clients::Cli::default();
    let node = docker.run(Postgres::default());
    
    let port = node.get_host_port_ipv4(5432);
    let connection_string = format!("postgres://postgres:postgres@localhost:{}/postgres", port);
    
    let pool = PgPool::connect(&connection_string).await.unwrap();
    
    // Run migrations dynamically
    sqlx::migrate!("./migrations").run(&pool).await.unwrap();

    // Perform real database tests...
}
```

### 5.1 Faster DB Tests: `sqlx::test`

If you don't want the overhead of Testcontainers per test, `sqlx` provides a highly optimized `#[sqlx::test]` macro that creates an isolated logical database for each test, running migrations automatically.

```rust
#[sqlx::test]
async fn test_user_repo(pool: sqlx::PgPool) {
    let repo = PostgresUserRepository::new(pool);
    let user = User::new("test@test.com");
    
    assert!(repo.save(&user).await.is_ok());
}
```

## 6. Snapshot Testing

For complex JSON responses, snapshot testing ensures the API shape doesn't change unexpectedly. Use the `insta` crate.

```rust
use insta::assert_json_snapshot;
use serde_json::json;

#[test]
fn test_api_response() {
    let response_data = json!({
        "id": 123,
        "name": "Test Product",
        "tags": ["new", "sale"]
    });

    assert_json_snapshot!(response_data, {
        ".id" => "[id]" // Mask changing fields like IDs or timestamps
    });
}
```

## 7. Testing Coverage

Generate coverage reports to ensure adequate test density using `tarpaulin`.

```bash
cargo install cargo-tarpaulin
cargo tarpaulin --ignore-tests
```

## 8. Summary Checklist
- [ ] Unit tests co-located with code.
- [ ] Mock external traits using `mockall`.
- [ ] HTTP endpoint tests using `tower::ServiceExt::oneshot`.
- [ ] Real database testing via `sqlx::test` or `testcontainers`.
- [ ] Run `cargo tarpaulin` in CI for coverage metrics.
