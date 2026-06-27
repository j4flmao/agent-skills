---
name: rust-architecture
description: >
  Use this skill when structuring Rust backend applications — workspace layout, crate organization, feature-based modules, error handling architecture, async runtime selection, and type-driven design. This skill enforces: Cargo workspace for multi-crate projects, Result/Option for error handling, trait-based abstraction, async with tokio, and feature flags for conditional compilation. Requires Rust (Cargo.toml). Do NOT use for: Go/Java/.NET architecture, frontend Rust, or embedded Rust.
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

# Rust Architecture

## Purpose
Structure Rust backend applications with workspace layout, type-driven design, error handling architecture, async runtime patterns, and trait-based abstraction.

## Agent Protocol

### Trigger
User request includes: `Rust project structure`, `Rust workspace`, `Rust crate layout`, `Rust error handling`, `Rust async`, `Rust traits`, `Rust architecture`, `Cargo workspace`.

### Input Context
- Rust edition (2021)
- Async runtime (tokio, async-std, smol)
- Web framework (Actix-web, Axum, Rocket, Warp)
- Database (sqlx, diesel, sea-orm, tokio-postgres)
- Build target (Linux server, Lambda, WASM)

### Output Artifact
Workspace layout, crate structure, error type definitions, trait definitions, async main.

### Response Format
Produce artifact directly. No preamble, no postamble, no explanations.

### Completion Criteria
- Workspace with binary + library crates
- Error type implementing std::error::Error
- Trait-based repository abstraction
- Async main with tokio runtime
- Configuration via environment or config file

### Max Response Length
4096 tokens

## Architecture Decision Trees

### Async Runtime: tokio vs async-std vs smol

| Criterion | tokio | async-std | smol |
|-----------|-------|-----------|------|
| Ecosystem | Largest (axum, sqlx, tonic) | Medium | Small |
| Runtime model | Multi-threaded work-stealing | Multi-threaded | Single-threaded or custom |
| Feature set | Full (fs, net, process, time) | Full | Minimal |
| Compile time | Moderate | Fast | Fast |
| Production readiness | Mature, widely used | Less used | Niche |

Decision: Web backend → tokio (axum, sqlx, tonic). Simple async → smol. WASM target → smol or wasm-bindgen-futures.

### Web Framework: Axum vs Actix-web vs Rocket vs Warp

| Criterion | Axum | Actix-web | Rocket | Warp |
|-----------|------|-----------|--------|------|
| Async runtime | tokio | tokio | tokio | tokio |
| Type safety | High (extractors) | High | Medium | High (filters) |
| Community | Fastest growing | Mature | Declining | Stable |
| Learning curve | Moderate | Moderate | Low | High (combinators) |
| Performance | High | Highest | High | High |

Decision: Modern Rust + type safety → Axum (recommended for new projects). Maximum throughput → Actix-web. Simplicity → Rocket. Functional composable → Warp.

## Workflow

### Step 1: Workspace Layout

```
my-api/
  Cargo.toml              # Workspace definition
  Cargo.lock
  crates/
    api/                  # Binary entry point
      Cargo.toml
      src/
        main.rs
        config.rs
        startup.rs
    domain/               # Domain types, traits, errors
      Cargo.toml
      src/
        mod.rs
        models/
          mod.rs
          user.rs
          order.rs
        errors.rs
        repository.rs     # Repository traits
        services.rs       # Domain services
    infrastructure/        # Database, HTTP client implementations
      Cargo.toml
      src/
        mod.rs
        postgres/
          mod.rs
          user_repository.rs
        http/
          mod.rs
          handlers/
            mod.rs
            user_handler.rs
    application/           # Use cases, DTOs
      Cargo.toml
      src/
        mod.rs
        use_cases/
          mod.rs
          create_user.rs
        dto.rs
```

### Step 2: Domain Crate

```rust
// crates/domain/Cargo.toml
[package]
name = "domain"
version = "0.1.0"
edition = "2021"

[dependencies]
serde = { version = "1", features = ["derive"] }
uuid = { version = "1", features = ["v4", "serde"] }
chrono = { version = "0.4", features = ["serde"] }
thiserror = "1"

// crates/domain/src/models/user.rs
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    pub name: String,
    pub role: UserRole,
    pub active: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum UserRole {
    Admin,
    User,
    Moderator,
}

impl User {
    pub fn new(email: String, name: String) -> Self {
        Self {
            id: Uuid::new_v4(),
            email: email.to_lowercase(),
            name,
            role: UserRole::User,
            active: true,
            created_at: Utc::now(),
        }
    }

    pub fn deactivate(&mut self) {
        self.active = false;
    }

    pub fn is_admin(&self) -> bool {
        self.role == UserRole::Admin
    }
}

// crates/domain/src/errors.rs
use thiserror::Error;

#[derive(Error, Debug)]
pub enum DomainError {
    #[error("resource not found: {0}")]
    NotFound(String),
    #[error("validation error: {0}")]
    Validation(String),
    #[error("conflict: {0}")]
    Conflict(String),
    #[error("unauthorized")]
    Unauthorized,
    #[error("unexpected error: {0}")]
    Unexpected(String),
}

impl From<sqlx::Error> for DomainError {
    fn from(err: sqlx::Error) -> Self {
        match err {
            sqlx::Error::RowNotFound => DomainError::NotFound("Resource".into()),
            _ => DomainError::Unexpected(err.to_string()),
        }
    }
}

// crates/domain/src/repository.rs
use crate::models::user::{User, UserRole};
use crate::errors::DomainError;

#[async_trait::async_trait]
pub trait UserRepository: Send + Sync {
    async fn find_by_id(&self, id: Uuid) -> Result<Option<User>, DomainError>;
    async fn find_by_email(&self, email: &str) -> Result<Option<User>, DomainError>;
    async fn save(&self, user: &User) -> Result<(), DomainError>;
    async fn find_all(&self, page: u32, per_page: u32) -> Result<(Vec<User>, u64), DomainError>;
    async fn update(&self, user: &User) -> Result<(), DomainError>;
    async fn delete(&self, id: Uuid) -> Result<(), DomainError>;
}
```

### Step 3: Infrastructure Crate (Implementations)

```rust
// crates/infrastructure/src/postgres/user_repository.rs
use async_trait::async_trait;
use domain::models::user::{User, UserRole};
use domain::errors::DomainError;
use domain::repository::UserRepository;
use sqlx::PgPool;
use uuid::Uuid;

pub struct PgUserRepository {
    pool: PgPool,
}

impl PgUserRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl UserRepository for PgUserRepository {
    async fn find_by_id(&self, id: Uuid) -> Result<Option<User>, DomainError> {
        let user = sqlx::query_as!(
            User,
            "SELECT id, email, name, role as 'role: _', active, created_at FROM users WHERE id = $1",
            id
        )
        .fetch_optional(&self.pool)
        .await?;
        Ok(user)
    }

    async fn save(&self, user: &User) -> Result<(), DomainError> {
        sqlx::query!(
            "INSERT INTO users (id, email, name, role, active, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
            user.id, user.email, user.name, user.role as UserRole, user.active, user.created_at
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    async fn find_all(&self, page: u32, per_page: u32) -> Result<(Vec<User>, u64), DomainError> {
        let offset = ((page - 1) * per_page) as i64;
        let limit = per_page as i64;
        let users = sqlx::query_as!(
            User,
            "SELECT id, email, name, role as 'role: _', active, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2",
            limit, offset
        )
        .fetch_all(&self.pool)
        .await?;
        let total: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM users")
            .fetch_one(&self.pool)
            .await?;
        Ok((users, total.0 as u64))
    }
    // ... other methods
}
```

### Step 4: Application Crate (Use Cases)

```rust
// crates/application/src/use_cases/create_user.rs
use domain::errors::DomainError;
use domain::models::user::User;
use domain::repository::UserRepository;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct CreateUserInput {
    pub email: String,
    pub name: String,
}

pub struct CreateUserUseCase<R: UserRepository> {
    repository: R,
}

impl<R: UserRepository> CreateUserUseCase<R> {
    pub fn new(repository: R) -> Self {
        Self { repository }
    }

    pub async fn execute(&self, input: CreateUserInput) -> Result<User, DomainError> {
        if !input.email.contains('@') {
            return Err(DomainError::Validation("Invalid email".into()));
        }
        if input.name.len() < 2 {
            return Err(DomainError::Validation("Name too short".into()));
        }
        if self.repository.find_by_email(&input.email).await?.is_some() {
            return Err(DomainError::Conflict("Email already exists".into()));
        }
        let user = User::new(input.email, input.name);
        self.repository.save(&user).await?;
        Ok(user)
    }
}
```

### Step 5: API Crate (Entry Point)

```rust
// crates/api/src/main.rs
use axum::{Router, Server};
use std::net::SocketAddr;

mod config;
mod startup;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt::init();
    let config = config::load()?;
    let app = startup::create_app(config.clone()).await?;
    let addr = SocketAddr::from(([0, 0, 0, 0], config.port));
    tracing::info!("Server starting on {}", addr);
    Server::bind(&addr)
        .serve(app.into_make_service())
        .with_graceful_shutdown(shutdown_signal())
        .await?;
    Ok(())
}

async fn shutdown_signal() {
    tokio::signal::ctrl_c().await.expect("Failed to listen for shutdown");
    tracing::info!("Shutting down...");
}

// crates/api/src/startup.rs
use axum::{routing::post, Router};
use infrastructure::postgres::user_repository::PgUserRepository;
use sqlx::PgPool;
use std::sync::Arc;

pub async fn create_app(config: Config) -> Result<Router, sqlx::Error> {
    let pool = PgPool::connect(&config.database_url).await?;
    let user_repo = Arc::new(PgUserRepository::new(pool));
    let app = Router::new()
        .route("/api/v1/users", post(handlers::create_user))
        .with_state(user_repo);
    Ok(app)
}
```

### Step 6: Configuration

```rust
// crates/api/src/config.rs
use serde::Deserialize;

#[derive(Debug, Deserialize, Clone)]
pub struct Config {
    pub port: u16,
    pub database_url: String,
    pub log_level: String,
    pub jwt_secret: String,
}

impl Config {
    pub fn load() -> Result<Self, config::ConfigError> {
        let c = config::Config::builder()
            .add_source(config::Environment::default())
            .build()?;
        c.try_deserialize()
    }
}
```

## Production Considerations

### Error Handling
- `thiserror` for library errors (domain, application)
- `anyhow::Error` or `eyre::Report` for application-level (main.rs, handlers)
- Never `unwrap()` or `expect()` in production code — use `?` propagation
- Implement `IntoResponse` for `DomainError` to return consistent HTTP responses

### Performance
- Use `--release` for production builds (enables all optimizations)
- Enable LTO: `lto = "fat"` in `Cargo.toml` for binary crate
- Profile-guided optimization for latency-critical services
- Connection pooling with `deadpool` or `sqlx::PgPool` (built-in)

## Anti-Patterns

| Anti-Pattern | Why | Fix |
|-------------|-----|-----|
| `unwrap()`/`expect()` in library code | Panics on error | `?` operator with proper error types |
| Single crate monolith | Long compile times, poor modularity | Cargo workspace |
| `Box<dyn Error>` for domain errors | Loses type info | `thiserror`/`derive_more` |
| Async trait without `async-trait` | Nightly-only | Use `#[async_trait]` |
| `Rc<RefCell<T>>` in async code | Not Send, can't cross await | `Arc<Mutex<T>>` or `Arc<RwLock<T>>` |
| No feature flags for optional deps | Unnecessary compile time | `cfg(feature = "...")` for platform-specific code |

## Security Considerations
- Use `secrecy` crate for sensitive strings (password, tokens) — `Zeroize` on drop
- SQL injection: `sqlx` uses prepared statements by default — never raw string formatting
- JWT: `jsonwebtoken` crate with validation of `alg`, `exp`, `iss`
- Input validation at handler boundary with `validator` crate derive macros
- CORS: `tower-http` cors middleware with explicit origins
- Rate limiting: `tower` middleware with `governor` crate
- Security headers: `tower-http` `SetResponseHeaderLayer`

## Testing Strategies

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use domain::models::user::User;

    struct MockUserRepository;

    #[async_trait]
    impl UserRepository for MockUserRepository {
        async fn find_by_id(&self, _id: Uuid) -> Result<Option<User>, DomainError> {
            Ok(None)
        }
        async fn find_by_email(&self, email: &str) -> Result<Option<User>, DomainError> {
            if email == "existing@test.com" {
                Ok(Some(User::new("existing@test.com".into(), "Existing".into())))
            } else {
                Ok(None)
            }
        }
        async fn save(&self, _user: &User) -> Result<(), DomainError> {
            Ok(())
        }
        // ... other methods
    }

    #[tokio::test]
    async fn test_create_user_duplicate_email() {
        let use_case = CreateUserUseCase::new(MockUserRepository);
        let input = CreateUserInput {
            email: "existing@test.com".into(),
            name: "Test".into(),
        };
        let result = use_case.execute(input).await;
        assert!(matches!(result, Err(DomainError::Conflict(_))));
    }
}
```

Use `#[tokio::test]` for async tests. Use `mockall` or manual mock traits for repository mocking. Use `sqlx::test` for DB integration tests. Use `cargo test` with `--test-threads=1` for DB tests.

## Rules
- Cargo workspace for multi-crate projects — one binary crate + library crates.
- Domain crate has zero dependencies on infrastructure (database, HTTP).
- `thiserror` for error types — `#[derive(Error)]` with `#[error("...")]` format strings.
- Traits are `#[async_trait]` for async and `Send + Sync` bound for thread safety.
- `sqlx::query!` macro for compile-time SQL verification — never raw string queries.
- Feature flags for conditional compilation — `cfg(feature = "postgres")`.
- `tokio::main` for async entry point with multi-threaded runtime.
- Configuration via environment variables with `config` or `envy` crate.

## References
  - references/crate-strategy.md — Crate Strategy
  - references/rust-async.md — Async Rust
  - references/rust-concurrency.md — Rust Concurrency
  - references/rust-config.md — Configuration
  - references/rust-di.md — Dependency Injection
  - references/rust-memory-management.md — Memory Management
  - references/rust-web-frameworks.md — Web Framework Comparison
  - references/testing-benchmarking.md — Testing and Benchmarking
  - references/trait-design.md — Trait Design Patterns
  - references/workspace-layout.md — Workspace Layout
## Handoff
Hand off to `backend/rust/patterns/SKILL.md` for Rust-specific patterns or `backend/universal/api-response/SKILL.md` for API response formatting.
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