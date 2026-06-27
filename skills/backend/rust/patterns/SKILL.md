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
## Implementation Patterns

### Factory Pattern for Module Creation
`
function createModule<T>(config: ModuleConfig): T {
  const dependencies = initializeDependencies(config);
  const module = new Module(dependencies);
  module.hooks.onInit();
  return module as T;
}
`

### Builder Pattern for Complex Configuration
`
class ConfigBuilder {
  private config: AppConfig = new AppConfig();
  withDatabase(url: string): ConfigBuilder { ... }
  withCache(ttl: number): ConfigBuilder { ... }
  withLogging(level: string): ConfigBuilder { ... }
  build(): AppConfig { return this.config; }
}
`

## Production Considerations

### Deployment Checklist
- [ ] Production build with optimizations enabled
- [ ] Environment variables configured per environment
- [ ] Health check endpoint responds correctly
- [ ] Error tracking and monitoring integrated
- [ ] Logging level configured (not debug in production)
- [ ] Resource limits configured
- [ ] Database migrations applied
- [ ] Static assets built and served from CDN or cache
- [ ] Feature flags toggled appropriately
- [ ] Rollback plan documented and tested

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% | Critical | Rollback or fix |
| p95 latency | > 500ms | Warning | Profile and optimize |
| Uptime | < 99.9% | Critical | Investigate infrastructure |
| Memory usage | > 80% | Warning | Check for leaks |
| CPU usage | > 80% | Warning | Scale up or optimize |

## Rules
- Prefer composition over inheritance
- Favor immutable data structures
- Use dependency injection for testability
- Keep functions pure when possible — no side effects
- Fail fast with clear error messages
- Don't repeat yourself (DRY) — extract shared logic
- Keep it simple (KISS) — avoid unnecessary complexity
- You aren't gonna need it (YAGNI) — build what's required
- Separate concerns — single responsibility per module
- Code to interfaces, not implementations
- Write self-documenting code — clear names over comments
- Prefer standard library over third-party dependencies
- Handle errors explicitly — no silent failures
- Validate inputs at boundaries
- Log at appropriate levels (debug, info, warn, error)

## Implementation Patterns

### Pattern: Result-Based Error Handling

```rust
use std::fmt;

#[derive(Debug)]
pub enum AppError {
    NotFound(String),
    Validation(String),
    Database(String),
    Unauthorized,
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::NotFound(msg) => write!(f, "Not found: {}", msg),
            AppError::Validation(msg) => write!(f, "Validation error: {}", msg),
            AppError::Database(msg) => write!(f, "Database error: {}", msg),
            AppError::Unauthorized => write!(f, "Unauthorized"),
        }
    }
}

impl std::error::Error for AppError {}

pub type AppResult<T> = Result<T, AppError>;

impl From<sqlx::Error> for AppError {
    fn from(err: sqlx::Error) -> Self {
        AppError::Database(err.to_string())
    }
}
```

### Pattern: Builder with Typed State

```rust
pub struct RequestBuilder<A, B, C> {
    url: String,
    method: Method,
    _marker: std::marker::PhantomData<(A, B, C)>,
}

impl RequestBuilder<(), (), ()> {
    pub fn new(url: &str) -> Self {
        Self { url: url.to_string(), method: Method::GET, _marker: PhantomData }
    }

    pub fn method(self, method: Method) -> RequestBuilder<(), (), Method> {
        RequestBuilder { url: self.url, method, _marker: PhantomData }
    }
}

impl RequestBuilder<(), (), Method> {
    pub fn build(self) -> Request {
        Request { url: self.url, method: self.method }
    }
}
```

## Production Considerations

- `RUST_BACKTRACE=1` for panic diagnostics. Disable in production (full backtrace is slow).
- `RUST_LOG=info` for logging. Structured logging with `tracing` + `tracing-subscriber`.
- Memory profiling with `jemalloc` or `mimalloc` allocator for throughput.
- `max_blocking_threads` in Tokio runtime. Default 512. Tune for IO-bound tasks.
- Binary size: `opt-level = "z"`, `lto = true`, `codegen-units = 1` for smallest release.
- Signal handling: `tokio::signal` for graceful shutdown. Drain connections.
- Crash recovery: process manager (systemd, supervisor) restarts on panic.
- Heap profiling: `dhat` or `pprof-rs` for memory leak detection.

## Anti-Patterns

| Anti-Pattern | Why It Hurts | Fix |
|---|---|---|
| `unwrap()` in library code | Panics on unexpected states. | Return `Result`. Handle at boundary. |
| `unsafe` without justification | Undefined behavior risk. | Only use unsafe for FFI. Wrap in safe abstractions. |
| `.clone()` everywhere | Unnecessary allocations. | Use references. `Cow` for borrowed/owned duality. |
| Dynamic dispatch overuse | Vtable overhead. No inlining. | Enums for closed sets. Traits only for open sets. |
| `Arc<Mutex<T>>` as default concurrency | Contention. Deadlock risk. | Choose correct primitive: channels, atomics, RwLock. |
| Ignoring `#[must_use]` warnings | Dropped results silently. | Use `let _ = expr` or `expr?` explicitly. |

## Performance Optimization

- Zero-cost abstractions: prefer monomorphized generics over trait objects.
- `#[inline]` on hot functions. Profile before and after.
- `SmallVec` for small collections. Avoid heap allocation for N < 32.
- `thread_local!` for per-thread caches. No synchronization overhead.
- Arena allocation for short-lived objects. Reduces allocator contention.
- Bump allocator for phase-oriented workloads. Custom allocator via `#[global_allocator]`.
- `unsafe` indexing with `get_unchecked` for bounds-checked hot paths.
- SIMD with `std::simd` for parallel data processing.
- `io_uring` via `tokio-uring` for async IO at kernel level.
- `rayon` for CPU-bound parallel work. Work-stealing scheduler balances load.

## Security Considerations

- Memory safety: Rust prevents buffer overflows, use-after-free, double-free by default.
- `unsafe` audit: all unsafe blocks require documented safety invariants.
- Input validation: parse with `serde` deserialization. Validation via `validator` crate.
- Cryptography: use `ring` or `rustls`. Never implement crypto primitives yourself.
- SQL injection: `sqlx` parameterizes queries. Compile-time checked queries.
- Secrets: `secrecy` crate for `SecretString`. Zeroize on drop.
- Path traversal: `std::path::Path` canonicalize. Reject paths with `..`.
- Time-based attacks: constant-time comparison with `subtle` or `constant_time_eq`.
- Authentication: JWT with `jsonwebtoken` crate. Validate signature, expiry, issuer.
- TLS: `rustls` over `native-tls` for pure Rust, no OpenSSL dependency.
## Performance Optimization

### Caching Strategy
Cache hierarchy: L1 (in-memory local) → L2 (distributed Redis/Memcached) → L3 (CDN/Edge).
Cache invalidation: TTL-based (simple, stale), event-based (complex, fresh), write-through (consistent, higher write latency), write-behind (fast writes, eventual consistency).

### Resource Pooling
- Database connections: Pool of reusable connections (HikariCP, pgBouncer)
- HTTP connections: Keep-alive + connection pooling for external calls
- Thread pool: Bounded thread pools for async task execution

### Profiling Methodology
1. Establish baseline with production traffic profile
2. Profile CPU with sampling profiler (pprof, perf, async-profiler)
3. Profile memory with heap dumps and allocation tracking
4. Profile I/O with strace/perf trace for syscall analysis
5. Profile latency with distributed tracing (OpenTelemetry)
6. Identify bottleneck, formulate hypothesis, implement fix
7. Re-profile to verify improvement, repeat

## Security Considerations

### Threat Modeling (STRIDE)
- Spoofing: Identity validation, authentication
- Tampering: Integrity checks, digital signatures
- Repudiation: Audit logs, non-repudiation
- Information disclosure: Encryption, access control
- Denial of service: Rate limiting, resource quotas
- Elevation of privilege: Principle of least privilege

### Supply Chain Security
- Dependency scanning: Snyk, Dependabot, Trivy
- SBOM generation: CycloneDX or SPDX format
- Signed commits: GPG or SSH commit signing
- Artifact verification: Checksum validation, signature verification

### Secrets Management
- Secrets never in code — always in secrets manager (Vault, AWS Secrets Manager)
- Rotation policy: Rotate database credentials every 90 days
- Access audit: Log every secrets access, alert on anomalies
- Encryption at rest and in transit for all secrets
- Principle of least privilege: each service gets only its own secrets