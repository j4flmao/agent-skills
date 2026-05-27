# Testing and Benchmarking Rust Applications

## Overview
Rust's testing ecosystem provides unit tests, integration tests, doc tests, property-based testing, and benchmarking. Combined with mockall for trait mocking and proptest for property-based testing, you can achieve high confidence in your Rust applications.

## Unit Tests

### Module-Level Tests
```rust
// crates/domain/src/entities/user.rs
#[cfg(test)]
mod tests {
    use super::*;
    use crate::value_objects::Email;

    #[test]
    fn test_user_creation_success() {
        let email = Email::new("test@example.com".to_string()).unwrap();
        let user = User::new(email, "Alice".to_string()).unwrap();
        assert_eq!(user.name, "Alice");
        assert!(user.is_active);
    }

    #[test]
    fn test_user_creation_empty_name() {
        let email = Email::new("test@example.com".to_string()).unwrap();
        let result = User::new(email, "".to_string());
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), DomainError::Validation(_)));
    }

    #[test]
    fn test_user_deactivation() {
        let email = Email::new("test@example.com".to_string()).unwrap();
        let mut user = User::new(email, "Alice".to_string()).unwrap();
        user.deactivate();
        assert!(!user.is_active);
    }
}
```

### Value Object Tests
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn valid_email_accepted() {
        let email = Email::new("user@example.com".to_string());
        assert!(email.is_ok());
        assert_eq!(email.unwrap().as_str(), "user@example.com");
    }

    #[test]
    fn invalid_email_rejected() {
        assert!(Email::new("not-an-email".to_string()).is_err());
        assert!(Email::new("".to_string()).is_err());
        assert!(Email::new("@.com".to_string()).is_err());
    }

    #[test]
    fn email_is_lowercased() {
        let email = Email::new("USER@Example.Com".to_string()).unwrap();
        assert_eq!(email.as_str(), "user@example.com");
    }
}
```

## Integration Tests

### Test Directory Structure
```
tests/
  common/
    mod.rs
    test_helpers.rs
  user_tests.rs
  order_tests.rs
  api_tests.rs
```

### Integration Test Example
```rust
// tests/user_tests.rs
mod common;

use common::test_helpers::setup_test_app;
use axum::http::StatusCode;

#[tokio::test]
async fn test_create_user_via_api() {
    let app = setup_test_app().await;

    let response = app
        .post("/api/v1/users")
        .json(&serde_json::json!({
            "email": "new@example.com",
            "name": "New User",
        }))
        .await;

    assert_eq!(response.status_code(), StatusCode::CREATED);

    let body: serde_json::Value = response.json();
    assert_eq!(body["email"], "new@example.com");
    assert!(body["id"].is_string());
}

#[tokio::test]
async fn test_get_nonexistent_user() {
    let app = setup_test_app().await;
    let response = app.get("/api/v1/users/nonexistent-id").await;
    assert_eq!(response.status_code(), StatusCode::NOT_FOUND);
}
```

### Test Helpers
```rust
// tests/common/test_helpers.rs
use axum::Router;
use sqlx::PgPool;
use sqlx::postgres::PgPoolOptions;

pub struct TestApp {
    pub router: Router,
    pub pool: PgPool,
}

pub async fn setup_test_app() -> TestApp {
    let database_url = std::env::var("TEST_DATABASE_URL")
        .unwrap_or_else(|_| "postgres://localhost:5432/test".to_string());

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to connect to test database");

    run_migrations(&pool).await;

    let app = build_test_app(pool.clone()).await;
    TestApp { router: app, pool }
}

impl TestApp {
    pub async fn post(&self, path: &str, body: &serde_json::Value) -> TestResponse {
        // Implementation
        TestResponse { /* ... */ }
    }

    pub async fn get(&self, path: &str) -> TestResponse {
        TestResponse { /* ... */ }
    }
}

pub struct TestResponse {
    // Implementation
}

impl TestResponse {
    pub fn status_code(&self) -> StatusCode {
        StatusCode::OK
    }

    pub fn json<T: serde::de::DeserializeOwned>(&self) -> T {
        serde_json::from_str("{}").unwrap()
    }
}
```

## Mocking with mockall

### Mocking Traits
```rust
use mockall::automock;

#[automock]
#[async_trait]
pub trait UserRepository: Send + Sync {
    async fn find_by_id(&self, id: &UserId) -> Result<Option<User>, DomainError>;
    async fn save(&self, user: &User) -> Result<(), DomainError>;
    async fn delete(&self, id: &UserId) -> Result<(), DomainError>;
}

#[tokio::test]
async fn test_create_user_use_case_with_mock() {
    let mut mock_repo = MockUserRepository::new();

    mock_repo
        .expect_save()
        .withf(|user: &User| user.email.as_str() == "test@example.com")
        .returning(|_| Ok(()));

    let use_case = CreateUserUseCase::new(Arc::new(mock_repo));
    let request = CreateUserRequest {
        email: "test@example.com".to_string(),
        name: "Test".to_string(),
    };

    let result = use_case.execute(request).await;
    assert!(result.is_ok());
}
```

## Property-Based Testing with Proptest

### Proptest Examples
```rust
use proptest::prelude::*;

proptest! {
    #[test]
    fn email_validation_doesnt_panic(email in ".*") {
        let _ = Email::new(email);
    }

    #[test]
    fn user_name_doesnt_exceed_limits(name in "[a-zA-Z0-9 ]{0,256}") {
        let email = Email::new("test@example.com".to_string()).unwrap();
        let user = User::new(email, name.clone());
        if name.trim().is_empty() {
            assert!(user.is_err());
        } else {
            assert!(user.is_ok());
        }
    }

    #[test]
    fn money_cannot_be_negative(amount in -10000..10000i64) {
        let result = Money::new(amount, Currency::USD);
        if amount < 0 {
            assert!(result.is_err());
        } else {
            assert!(result.is_ok());
            assert_eq!(result.unwrap().amount(), amount as u64);
        }
    }
}
```

### Custom Strategies
```rust
use proptest::strategy::Strategy;

fn valid_email_strategy() -> impl Strategy<Value = String> {
    (
        "[a-z]{3,10}",
        "[a-z]{2,10}",
        "[a-z]{2,4}",
    )
        .prop_map(|(local, domain, tld)| format!("{}@{}.{}", local, domain, tld))
}

proptest! {
    #[test]
    fn valid_emails_always_pass(email in valid_email_strategy()) {
        let result = Email::new(email.clone());
        assert!(result.is_ok(), "Email {} should be valid", email);
    }
}
```

## Benchmarks

### Criterion Benchmarks
```rust
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn bench_user_creation(c: &mut Criterion) {
    let email = Email::new("test@example.com".to_string()).unwrap();

    c.bench_function("create_user", |b| {
        b.iter(|| {
            let user = User::new(black_box(email.clone()), "Alice".to_string());
            black_box(user)
        })
    });
}

fn bench_email_validation(c: &mut Criterion) {
    c.bench_function("email_validation", |b| {
        b.iter(|| {
            let result = Email::new(black_box("user@example.com".to_string()));
            black_box(result)
        })
    });
}

fn bench_database_query(c: &mut Criterion) {
    let rt = tokio::runtime::Runtime::new().unwrap();

    c.bench_function("find_user_by_id", |b| {
        let pool = rt.block_on(async { setup_db().await });
        b.to_async(&rt).iter(|| async {
            let result = sqlx::query("SELECT * FROM users WHERE id = $1")
                .bind(black_box(Uuid::new_v4()))
                .fetch_optional(&pool)
                .await;
            black_box(result)
        })
    });
}

criterion_group!(benches, bench_user_creation, bench_email_validation, bench_database_query);
criterion_main!(benches);
```

### Running Benchmarks
```bash
# Run all benchmarks
cargo bench

# Run specific benchmark
cargo bench --bench user_benchmarks

# Compare with previous
cargo bench -- --save-baseline current
cargo bench -- --baseline current
```

## Documentation Tests

### Doc Tests
```rust
/// Creates a new user with the given email and name.
///
/// # Examples
///
/// ```
/// use domain::entities::User;
/// use domain::value_objects::Email;
///
/// let email = Email::new("alice@example.com".to_string()).unwrap();
/// let user = User::new(email, "Alice".to_string()).unwrap();
/// assert_eq!(user.name, "Alice");
/// ```
pub fn new(email: Email, name: String) -> Result<Self, DomainError> {
    // implementation
}
```

## Async Test Patterns

### Testing Async Code
```rust
#[tokio::test]
async fn test_async_repository() {
    let pool = setup_test_database().await;
    let repo = PostgresUserRepository::new(pool);

    let user = create_test_user(&repo).await;
    assert!(user.is_ok());

    let found = repo.find_by_id(&user.unwrap().id).await;
    assert!(found.is_ok());
    assert!(found.unwrap().is_some());
}
```

## Key Points
- Unit tests live alongside code in `#[cfg(test)] mod tests`
- Integration tests go in the `tests/` directory
- mockall generates mock implementations of traits for testing
- proptest finds edge cases through randomized testing
- Criterion provides statistical benchmarking
- Doc tests keep examples in sync with implementation
- Test databases should be isolated per test run
- Async tests require a runtime (tokio::test)
- Benchmark critical paths like validation and serialization
- Test both success and error paths for all use cases
