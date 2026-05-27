# Crate Strategy and Workspace Design

## Overview
Well-structured Rust projects use Cargo workspaces to organize code into focused crates. Each architectural layer is a separate crate with explicit dependencies, enabling compilation parallelism, clear ownership boundaries, and faster incremental builds.

## Workspace Structure

### Standard Layout
```
myproject/
  Cargo.toml              -- workspace root
  crates/
    domain/               -- pure domain, zero external deps
      Cargo.toml
      src/
        lib.rs
        entities/
          mod.rs
          user.rs
          order.rs
        value_objects/
          mod.rs
          email.rs
          money.rs
        events/
          mod.rs
          domain_event.rs
        repositories/
          mod.rs
          traits.rs
    application/          -- use cases, DTOs
      Cargo.toml
      src/
        lib.rs
        use_cases/
          mod.rs
          create_user.rs
          process_order.rs
        dtos/
          mod.rs
          user_dto.rs
          order_dto.rs
        errors.rs
    infrastructure/       -- adapters, persistence, messaging
      Cargo.toml
      src/
        lib.rs
        persistence/
          mod.rs
          postgres_user_repo.rs
          postgres_order_repo.rs
        messaging/
          mod.rs
          rabbitmq_event_bus.rs
        config.rs
    api/                  -- entry point, handlers, middleware
      Cargo.toml
      src/
        main.rs
        handlers/
          mod.rs
          user_handler.rs
          order_handler.rs
        middleware/
          mod.rs
          auth.rs
          logging.rs
        server.rs
  tests/                  -- integration tests
    common/
      mod.rs
    user_tests.rs
```

### Workspace Cargo.toml
```toml
[workspace]
members = [
    "crates/domain",
    "crates/application",
    "crates/infrastructure",
    "crates/api",
]
resolver = "2"

[workspace.package]
version = "0.1.0"
edition = "2021"
license = "MIT"

[workspace.dependencies]
serde = { version = "1", features = ["derive"] }
thiserror = "1"
tokio = { version = "1", features = ["full"] }
uuid = { version = "1", features = ["v7", "serde"] }
chrono = { version = "0.4", features = ["serde"] }
sqlx = { version = "0.7", features = ["runtime-tokio", "postgres"] }
```

## Crate Dependency Rules

### Dependency Graph
```
domain (no external deps)
  ^
  |
application (depends on domain only)
  ^
  |
infrastructure (depends on domain + application)
  ^
  |
api (depends on application + infrastructure)
```

### Crate Dependencies
```toml
# crates/domain/Cargo.toml
[package]
name = "domain"
version.workspace = true
edition.workspace = true

[dependencies]
uuid.workspace = true
chrono.workspace = true
serde.workspace = true
thiserror.workspace = true

# crates/application/Cargo.toml
[dependencies]
domain = { path = "../domain" }
thiserror.workspace = true
serde.workspace = true
async-trait = "0.1"

# crates/infrastructure/Cargo.toml
[dependencies]
domain = { path = "../domain" }
application = { path = "../application" }
sqlx.workspace = true
tokio.workspace = true
async-trait = "0.1"

# crates/api/Cargo.toml
[dependencies]
application = { path = "../application" }
infrastructure = { path = "../infrastructure" }
axum = "0.7"
tokio.workspace = true
tower-http = { version = "0.5", features = ["cors", "trace"] }
```

## Domain Crate Design

### Zero External Dependencies
```rust
// crates/domain/src/entities/user.rs
use crate::value_objects::Email;
use chrono::{DateTime, Utc};
use uuid::Uuid;

pub struct User {
    pub id: UserId,
    pub email: Email,
    pub name: String,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
}

impl User {
    pub fn new(email: Email, name: String) -> Result<Self, DomainError> {
        if name.trim().is_empty() {
            return Err(DomainError::Validation("Name cannot be empty".into()));
        }
        Ok(Self {
            id: UserId::new(),
            email,
            name,
            is_active: true,
            created_at: Utc::now(),
        })
    }

    pub fn deactivate(&mut self) {
        self.is_active = false;
    }
}
```

### Value Objects
```rust
// crates/domain/src/value_objects/email.rs
use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Email(String);

impl Email {
    pub fn new(value: String) -> Result<Self, DomainError> {
        let trimmed = value.trim().to_lowercase();
        if !trimmed.contains('@') || !trimmed.contains('.') {
            return Err(DomainError::Validation("Invalid email format".into()));
        }
        Ok(Self(trimmed))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for Email {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}
```

### Error Types
```rust
// crates/domain/src/errors.rs
use thiserror::Error;

#[derive(Debug, Error)]
pub enum DomainError {
    #[error("Validation error: {0}")]
    Validation(String),

    #[error("Entity not found: {entity}::{id}")]
    NotFound { entity: String, id: String },

    #[error("Conflict: {0}")]
    Conflict(String),

    #[error("Unauthorized: {0}")]
    Unauthorized(String),
}
```

## Application Crate

### Use Case Pattern
```rust
// crates/application/src/use_cases/create_user.rs
use crate::dtos::user_dto::{CreateUserRequest, UserResponse};
use domain::entities::User;
use domain::repositories::UserRepository;
use domain::value_objects::Email;
use std::sync::Arc;

pub struct CreateUserUseCase {
    user_repo: Arc<dyn UserRepository>,
}

impl CreateUserUseCase {
    pub fn new(user_repo: Arc<dyn UserRepository>) -> Self {
        Self { user_repo }
    }

    pub async fn execute(&self, request: CreateUserRequest) -> Result<UserResponse, ApplicationError> {
        let email = Email::new(request.email.clone())
            .map_err(|e| ApplicationError::Validation(e.to_string()))?;

        let user = User::new(email, request.name.clone())
            .map_err(ApplicationError::from)?;

        self.user_repo
            .save(&user)
            .await
            .map_err(ApplicationError::from)?;

        Ok(UserResponse::from(user))
    }
}
```

## Infrastructure Crate

### Repository Implementation
```rust
// crates/infrastructure/src/persistence/postgres_user_repo.rs
use async_trait::async_trait;
use domain::entities::User;
use domain::repositories::UserRepository;
use sqlx::PgPool;

pub struct PostgresUserRepository {
    pool: PgPool,
}

impl PostgresUserRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl UserRepository for PostgresUserRepository {
    async fn find_by_id(&self, id: &UserId) -> Result<Option<User>, DomainError> {
        let row = sqlx::query_as::<_, UserRow>(
            "SELECT id, email, name, is_active, created_at FROM users WHERE id = $1",
        )
        .bind(id.as_uuid())
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| DomainError::Infrastructure(e.into()))?;

        Ok(row.map(UserRow::into_domain))
    }

    async fn save(&self, user: &User) -> Result<(), DomainError> {
        sqlx::query(
            "INSERT INTO users (id, email, name, is_active, created_at) VALUES ($1, $2, $3, $4, $5) \
             ON CONFLICT (id) DO UPDATE SET email = $2, name = $3, is_active = $4",
        )
        .bind(user.id.as_uuid())
        .bind(user.email.as_str())
        .bind(&user.name)
        .bind(user.is_active)
        .bind(user.created_at)
        .execute(&self.pool)
        .await
        .map_err(|e| DomainError::Infrastructure(e.into()))?;

        Ok(())
    }
}
```

## API Crate (Composition Root)

### Dependency Injection
```rust
// crates/api/src/server.rs
use std::sync::Arc;

pub async fn build_server(config: Config) -> Result<(), Box<dyn std::error::Error>> {
    let pool = PgPool::connect(&config.database_url).await?;

    let user_repo = Arc::new(PostgresUserRepository::new(pool.clone()))
        as Arc<dyn UserRepository>;
    let order_repo = Arc::new(PostgresOrderRepository::new(pool))
        as Arc<dyn OrderRepository>;

    let create_user = Arc::new(CreateUserUseCase::new(user_repo.clone()));
    let get_user = Arc::new(GetUserUseCase::new(user_repo.clone()));
    let process_order = Arc::new(ProcessOrderUseCase::new(order_repo, user_repo));

    let state = AppState {
        create_user,
        get_user,
        process_order,
    };

    let app = Router::new()
        .route("/api/v1/users", post(handlers::create_user))
        .route("/api/v1/users/{id}", get(handlers::get_user))
        .route("/api/v1/orders", post(handlers::create_order))
        .layer(TraceLayer::new_for_http())
        .layer(CorsLayer::permissive())
        .with_state(Arc::new(state));

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await?;
    axum::serve(listener, app).await?;

    Ok(())
}
```

## Build Optimization

### Profile Settings
```toml
# Cargo.toml
[profile.dev]
opt-level = 1
incremental = true

[profile.release]
opt-level = 3
lto = "fat"
codegen-units = 1
strip = "symbols"
```

### Feature Flags
```toml
[features]
default = ["postgres"]
postgres = ["sqlx/postgres"]
sqlite = ["sqlx/sqlite"]
mock = []

[package.metadata.docs.rs]
features = ["postgres"]
```

## Key Points
- Workspace organizes crates for compilation parallelism and separation
- Domain crate has zero external dependencies for purity
- Each layer depends only on layers below it in the stack
- Application crate bridges domain and infrastructure
- Infrastructure implements domain interfaces with concrete frameworks
- API crate is the composition root that wires everything together
- Feature flags enable different backend implementations
- Use workspace dependencies for consistent versions across crates
- Profile settings optimize for development speed or production size
- The dependency graph enforces architectural boundaries at compile time
