---
name: rust-patterns
description: >
  Use this skill when implementing Rust-specific patterns — async/tokio patterns, ownership/borrowing strategies, error handling with thiserror/anyhow, serde serialization, FFI, concurrency with Arc/RwLock, and API patterns. This skill enforces: thiserror for library errors, anyhow for application errors, serde for serialization, Arc for shared state, and tokio for async. Requires Rust (Cargo.toml). Do NOT use for: Go goroutines, Java threads, or non-Rust specific concurrency patterns.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, rust, phase-8]
---

# Rust Patterns

## Purpose
Implement Rust-specific patterns — async/await with tokio, error handling with thiserror/anyhow, serde for JSON, ownership patterns, concurrency with Arc/RwLock, and API handler patterns with Axum.

## Agent Protocol

### Trigger
User request includes: `Rust async`, `Rust tokio`, `Rust error handling`, `Rust serde`, `Rust ownership`, `Rust Arc`, `Rust Mutex`, `Rust pattern`, `Rust API handler`.

### Input Context
- Async runtime (tokio)
- Web framework (Axum, Actix-web)
- Error pattern needed (thiserror, anyhow)
- Concurrency model (Arc, channels, actor)

### Output Artifact
Code examples for the requested pattern — async handler, error type, serialization, shared state.

### Response Format
Pattern name, problem, implementation. No preamble, no postamble.

### Completion Criteria
- Async handler with proper error types
- Error type with thiserror derive
- Serde derive for serializable types
- Shared state with Arc<RwLock<T>>
- tokio::spawn with JoinHandle cleanup

### Max Response Length
4096 tokens

## Architecture Decision Trees

### Error Handling: thiserror vs anyhow vs eyre

| Criterion | thiserror | anyhow | eyre |
|-----------|-----------|--------|------|
| Use case | Libraries, domain errors | Application, binary code | Application (custom reports) |
| Error type | Custom `enum` | `anyhow::Error` | `eyre::Report` |
| Backtrace | Manual | Automatic | Automatic (with feature) |
| Context | `#[error("...")]` annotations | `.context()` method | `.wrap_err()` method |
| Pattern | `Result<T, MyError>` | `anyhow::Result<T>` | `eyre::Result<T>` |

Decision: Library/reusable crate → thiserror. Application binary → anyhow. Mixed: thiserror in domain, anyhow at handler layer.

### Shared State: Arc vs Channel vs Actor

| Pattern | Mechanism | Best For |
|---------|-----------|----------|
| Arc<RwLock<T>> | Shared mutable state | Configuration, cache, metrics |
| tokio::sync::RwLock | Async-aware locking | Long-held async locks |
| mpsc channel | One-to-many send | Task queue, event broadcast |
| oneshot channel | One-shot response | Request-reply |
| Actor pattern | Stateful processing | Game loop, connection manager |

Decision: Read-heavy shared state → `Arc<RwLock<T>>`. Work distribution → `mpsc` channel. Request-response → `oneshot`. Complex state machine → Actor.

## Workflow

### Step 1: Error Handling Pattern

```rust
// Library errors — thiserror (domain crate)
use thiserror::Error;

#[derive(Error, Debug)]
pub enum RepositoryError {
    #[error("not found: {entity} ({id})")]
    NotFound { entity: String, id: String },
    #[error("conflict: {0}")]
    Conflict(String),
    #[error("database error: {0}")]
    Database(#[from] sqlx::Error),
    #[error("validation: {0}")]
    Validation(String),
}

// Application errors — converting from domain to HTTP
impl IntoResponse for RepositoryError {
    fn into_response(self) -> Response {
        let status = match &self {
            RepositoryError::NotFound { .. } => StatusCode::NOT_FOUND,
            RepositoryError::Conflict(_) => StatusCode::CONFLICT,
            RepositoryError::Validation(_) => StatusCode::BAD_REQUEST,
            RepositoryError::Database(_) => StatusCode::INTERNAL_SERVER_ERROR,
        };
        let body = Json(serde_json::json!({
            "error": self.to_string()
        }));
        (status, body).into_response()
    }
}

// Handler returns Result<T, RepositoryError>
async fn get_user(
    Path(id): Path<Uuid>,
    State(repo): State<Arc<dyn UserRepository>>,
) -> Result<Json<User>, RepositoryError> {
    let user = repo.find_by_id(id)
        .await?
        .ok_or_else(|| RepositoryError::NotFound {
            entity: "User".into(),
            id: id.to_string(),
        })?;
    Ok(Json(user))
}
```

### Step 2: Async Handler Pattern (Axum)

```rust
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{delete, get, post, put},
    Json, Router,
};
use serde::Deserialize;
use std::sync::Arc;
use uuid::Uuid;

// DTOs
#[derive(Deserialize)]
pub struct CreateUserRequest {
    pub name: String,
    pub email: String,
}

#[derive(Deserialize)]
pub struct PaginationParams {
    page: Option<u32>,
    per_page: Option<u32>,
}

// Shared application state
#[derive(Clone)]
pub struct AppState {
    pub user_repo: Arc<dyn UserRepository>,
    pub order_repo: Arc<dyn OrderRepository>,
}

// Router setup
pub fn user_routes() -> Router<AppState> {
    Router::new()
        .route("/", get(list_users).post(create_user))
        .route("/{id}", get(get_user).put(update_user).delete(delete_user))
}

// Handlers
async fn list_users(
    State(state): State<AppState>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<Vec<User>>, AppError> {
    let page = params.page.unwrap_or(1);
    let per_page = params.per_page.unwrap_or(20);
    let (users, _total) = state.user_repo.find_all(page, per_page).await?;
    Ok(Json(users))
}

async fn create_user(
    State(state): State<AppState>,
    Json(body): Json<CreateUserRequest>,
) -> Result<(StatusCode, Json<User>), AppError> {
    let user = User::new(body.email, body.name);
    state.user_repo.save(&user).await?;
    Ok((StatusCode::CREATED, Json(user)))
}

async fn get_user(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<User>, AppError> {
    let user = state.user_repo.find_by_id(id)
        .await?
        .ok_or(AppError::NotFound("User".into()))?;
    Ok(Json(user))
}
```

### Step 3: Serde Serialization Patterns

```rust
use serde::{Deserialize, Serialize};

// Rename fields for snake_case JSON
#[derive(Debug, Serialize, Deserialize)]
pub struct OrderResponse {
    #[serde(rename = "orderId")]
    pub order_id: Uuid,
    pub status: OrderStatus,
    pub total: f64,
    #[serde(with = "chrono::serde::ts_seconds")]
    pub created_at: DateTime<Utc>,
}

// Flatten for composition
#[derive(Serialize)]
pub struct PaginatedResponse<T: Serialize> {
    pub data: Vec<T>,
    pub total: u64,
    pub page: u32,
    #[serde(rename = "perPage")]
    pub per_page: u32,
}

// Custom serialization for sensitive fields
#[derive(Serialize)]
pub struct UserResponse {
    pub id: Uuid,
    pub name: String,
    pub email: String,
    #[serde(skip_serializing)]
    pub password_hash: String,
}

// Enum serialization
#[derive(Debug, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "user_role", rename_all = "lowercase")]
#[serde(rename_all = "snake_case")]
pub enum OrderStatus {
    Pending,
    Confirmed,
    Shipped,
    Cancelled,
}
```

### Step 4: Concurrency with Shared State

```rust
use std::sync::Arc;
use tokio::sync::RwLock;

// Shared application config (read-heavy)
#[derive(Clone)]
pub struct AppConfig {
    inner: Arc<RwLock<Config>>,
}

impl AppConfig {
    pub fn new(config: Config) -> Self {
        Self { inner: Arc::new(RwLock::new(config)) }
    }

    pub async fn read(&self) -> Config {
        self.inner.read().await.clone()
    }

    pub async fn update(&self, config: Config) {
        let mut w = self.inner.write().await;
        *w = config;
    }
}

// Worker pool pattern
pub async fn spawn_workers(
    num_workers: usize,
    mut rx: tokio::sync::mpsc::Receiver<WorkItem>,
) {
    let mut handles = Vec::new();
    for id in 0..num_workers {
        let mut rx = rx.resubscribe();
        handles.push(tokio::spawn(async move {
            while let Some(item) = rx.recv().await {
                process_work(id, item).await;
            }
        }));
    }
    for handle in handles {
        handle.await.expect("Worker panicked");
    }
}
```

### Step 5: Pipeline Pattern with tower

```rust
use axum::body::Body;
use std::task::{Context, Poll};
use tower::{Layer, Service};

#[derive(Clone)]
pub struct RequestTimerLayer;

impl<S> Layer<S> for RequestTimerLayer {
    type Service = RequestTimerMiddleware<S>;
    fn layer(&self, inner: S) -> Self::Service {
        RequestTimerMiddleware { inner }
    }
}

#[derive(Clone)]
pub struct RequestTimerMiddleware<S> {
    inner: S,
}

impl<S> Service<Request<Body>> for RequestTimerMiddleware<S>
where
    S: Service<Request<Body>, Response = Response<Body>> + Clone + Send + 'static,
    S::Future: Send,
{
    type Response = S::Response;
    type Error = S::Error;
    type Future = Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>> + Send>>;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.inner.poll_ready(cx)
    }

    fn call(&mut self, req: Request<Body>) -> Self::Future {
        let start = Instant::now();
        let fut = self.inner.call(req);
        Box::pin(async move {
            let response = fut.await?;
            tracing::info!("request completed in {:?}", start.elapsed());
            Ok(response)
        })
    }
}
```

## Production Considerations

### Memory and Performance
- Measure with `cargo bench` and `criterion` for microbenchmarks
- Profile with `perf` (Linux) or `samply` (cross-platform)
- Use `#[inline]` sparingly — only on hot small functions
- Prefer `Box<[T]>` over `Vec<T>` for immutable collections
- Use `Cow<'_, str>` to avoid allocations in read-heavy paths
- Enable `codegen-units = 1` in release for maximum optimization

### Logging and Observability
```rust
use tracing::{info, error, span, Level};
use tracing_subscriber::{fmt, EnvFilter};

fn setup_tracing() {
    fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .with_target(true)
        .with_thread_ids(true)
        .init();
}
```

## Anti-Patterns

| Anti-Pattern | Why | Fix |
|-------------|-----|-----|
| `Box<dyn Error>` in library | Loses type info, can't match | `thiserror` custom enum |
| `std::sync::Mutex` in async context | Blocks tokio worker threads | `tokio::sync::Mutex` |
| `unwrap()` on `Result` from library | Panics on unexpected error | Propagate with `?` |
| `Arc<Mutex<T>>` for immutable state | Unnecessary synchronization | `Arc<T>` for read-only |
| `clone()` on large `Arc<T>` | Atomic ref count is cheap, `clone()` is not | Use `Arc::clone(&arc)` |
| `.await` in hot loop | Hurts concurrency | Batch or `join_all` |

## Security Considerations
- `secrecy::SecretString` for passwords, API keys — `Zeroize` on drop
- `serde::Serializer` `skip_serializing` for sensitive fields in responses
- `jsonwebtoken` — validate `alg`, `exp`, `iss`, `aud` fields
- Input validation at handler boundary with `validator` crate
- SQL injection: `sqlx` uses prepared statements by default — never `format!`
- `tower-http` `CorsLayer` with explicit allow origins

## Testing Strategies

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use axum::{
        body::Body,
        http::{Method, Request, StatusCode},
    };
    use tower::ServiceExt;

    #[tokio::test]
    async fn test_create_user_handler() {
        let app = test_app().await;
        let response = app
            .oneshot(
                Request::builder()
                    .method(Method::POST)
                    .uri("/api/v1/users")
                    .header("content-type", "application/json")
                    .body(Body::from(r#"{"name":"Test","email":"test@test.com"}"#))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::CREATED);
    }
}
```

Use `axum::Router::oneshot` for handler testing without a server. Use `sqlx::test` for database integration tests. Use `cargo nextest` for parallel test execution.

## Rules
- Domain/application errors use `thiserror` derive macros. Application handlers convert to HTTP responses via `IntoResponse`.
- Shared state uses `Arc<T>` for read-only, `Arc<RwLock<T>>` for mutable, `tokio::sync` variants for async.
- All async code uses tokio runtime — `#[tokio::main]` entry point.
- Serde derives on all types crossing the API boundary — custom serialization via `#[serde(with = "...")]`.
- Axum extractors (`Path`, `Query`, `Json`, `State`) for typed handler parameters.
- `tower-http` middleware for CORS, compression, tracing, rate limiting.
- Never `unwrap()` in production code — `?` propagation with proper error types.

## References
  - references/async-tokio.md — Async Tokio Patterns
  - references/concurrency-sync.md — Concurrency and Sync
  - references/error-handling.md — Error Handling
  - references/ownership-patterns.md — Ownership and Borrowing
  - references/rust-api-patterns.md — API Patterns
  - references/rust-error-handling.md — Rust Error Handling
  - references/rust-ffi.md — FFI Patterns
  - references/rust-serialization.md — Serialization with Serde
  - references/rust-testing.md — Rust Testing
  - references/serde-patterns.md — Serde Patterns
## Handoff
Hand off to `backend/rust/architecture/SKILL.md` for project structure or `backend/universal/api-response/SKILL.md` for API response formatting.
