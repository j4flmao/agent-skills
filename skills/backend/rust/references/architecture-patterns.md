# Rust Backend Architecture Patterns

## 1. Introduction

When building backend services in Rust, architectural decisions heavily impact maintainability, performance, and compile times. Rust's strict type system, ownership model, and zero-cost abstractions lend themselves well to layered architectures, specifically Clean Architecture and Hexagonal Architecture (Ports and Adapters).

This document details the architectural patterns best suited for Rust backends, incorporating Tokio for asynchronous runtime and Axum for web routing.

## 2. Hexagonal Architecture (Ports and Adapters)

### 2.1 Core Concepts

The core principle is separating the application core from external concerns (databases, web frameworks, external APIs).

- **Domain Model**: Pure Rust structs and enums. No external dependencies.
- **Ports (Traits)**: Traits defining interfaces for inbound (driving) and outbound (driven) operations.
- **Adapters**: Implementations of the ports using specific technologies (e.g., `sqlx` for Postgres, `axum` for HTTP).

### 2.2 ASCII Diagram: Hexagonal Architecture

```text
+---------------------------------------------------------+
|                      Infrastructure Layer               |
|                                                         |
|  +-------------+       +-------------------+            |
|  | HTTP (Axum) |       | Postgres (sqlx)   |            |
|  +------+------+       +--------+----------+            |
|         |                       |                       |
|         v (Inbound Port)        ^ (Outbound Port)       |
+---------|-----------------------|-----------------------+
          |                       |
+---------|-----------------------|-----------------------+
|         v                       |                       |
|  +------|-----------------------|------+                |
|  |      |      Application Core |      |                |
|  |  +---|-----------------------|---+  |                |
|  |  |   v                       |   |  |                |
|  |  |  Services (Use Cases)     |   |  |                |
|  |  +---------------------------+   |  |                |
|  |              |                   |  |                |
|  |              v                   |  |                |
|  |  +---------------------------+   |  |                |
|  |  |      Domain Entities      |   |  |                |
|  |  +---------------------------+   |  |                |
|  +-------------------------------------+                |
+---------------------------------------------------------+
```

### 2.3 Code Example: Domain and Ports

```rust
// domain/user.rs
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct User {
    pub id: uuid::Uuid,
    pub email: String,
    pub password_hash: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

impl User {
    pub fn new(email: String, password_hash: String) -> Self {
        Self {
            id: uuid::Uuid::new_v4(),
            email,
            password_hash,
            created_at: chrono::Utc::now(),
        }
    }
}

// ports/repository.rs
use async_trait::async_trait;
use crate::domain::user::User;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum RepositoryError {
    #[error("Database error: {0}")]
    Database(String),
    #[error("Entity not found")]
    NotFound,
}

#[async_trait]
pub trait UserRepository: Send + Sync {
    async fn save(&self, user: &User) -> Result<(), RepositoryError>;
    async fn find_by_id(&self, id: &uuid::Uuid) -> Result<Option<User>, RepositoryError>;
    async fn find_by_email(&self, email: &str) -> Result<Option<User>, RepositoryError>;
}
```

### 2.4 Code Example: Application Service

```rust
// application/user_service.rs
use crate::domain::user::User;
use crate::ports::repository::{UserRepository, RepositoryError};
use std::sync::Arc;

pub struct UserService {
    user_repo: Arc<dyn UserRepository>,
}

impl UserService {
    pub fn new(user_repo: Arc<dyn UserRepository>) -> Self {
        Self { user_repo }
    }

    pub async fn register_user(&self, email: String, password_hash: String) -> Result<User, RepositoryError> {
        let existing_user = self.user_repo.find_by_email(&email).await?;
        if existing_user.is_some() {
            return Err(RepositoryError::Database("User already exists".to_string()));
        }

        let new_user = User::new(email, password_hash);
        self.user_repo.save(&new_user).await?;
        
        Ok(new_user)
    }
}
```

## 3. The App State Pattern with Axum

In Axum, the application state is typically passed to handlers via the `State` extractor.

### 3.1 Constructing the State

```rust
// infrastructure/state.rs
use std::sync::Arc;
use crate::application::user_service::UserService;
use sqlx::PgPool;

#[derive(Clone)]
pub struct AppState {
    pub user_service: Arc<UserService>,
    pub db_pool: PgPool, // Sometimes needed for direct queries outside services
}

impl AppState {
    pub fn new(db_pool: PgPool, user_service: Arc<UserService>) -> Self {
        Self {
            db_pool,
            user_service,
        }
    }
}
```

### 3.2 Wiring it all together

```rust
// main.rs
use axum::{routing::post, Router};
use std::sync::Arc;
use sqlx::postgres::PgPoolOptions;

mod domain;
mod ports;
mod application;
mod infrastructure;

use infrastructure::adapters::postgres_user_repo::PostgresUserRepository;
use application::user_service::UserService;
use infrastructure::state::AppState;

#[tokio::main]
async fn main() {
    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to connect to Postgres");

    let user_repo = Arc::new(PostgresUserRepository::new(pool.clone()));
    let user_service = Arc::new(UserService::new(user_repo));
    
    let state = AppState::new(pool, user_service);

    let app = Router::new()
        .route("/users", post(infrastructure::http::handlers::register_user))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
```

## 4. CQRS Pattern (Command Query Responsibility Segregation)

For complex domains, separating reads and writes can optimize performance and clarify intent.

- **Commands**: Mutate state. Return no data (or just an ID/status).
- **Queries**: Do not mutate state. Return DTOs (Data Transfer Objects).

### 4.1 Example Command

```rust
// application/commands/create_user.rs
pub struct CreateUserCommand {
    pub email: String,
    pub password_hash: String,
}

pub async fn handle_create_user(
    state: &AppState,
    cmd: CreateUserCommand,
) -> Result<uuid::Uuid, ApplicationError> {
    // Write optimized logic
}
```

## 5. Middleware and Cross-Cutting Concerns

Use Axum's `layer` capabilities to handle cross-cutting concerns using `tower::Service`.

### 5.1 Request Tracing

```rust
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

// In main:
tracing_subscriber::registry()
    .with(tracing_subscriber::EnvFilter::new(
        std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
    ))
    .with(tracing_subscriber::fmt::layer())
    .init();

let app = Router::new()
    // ... routes
    .layer(TraceLayer::new_for_http());
```

## 6. Best Practices and Anti-patterns

### 6.1 Best Practices
1.  **Dependency Injection via Traits**: Always use traits for database access and external APIs to enable unit testing with mocks.
2.  **Explicit State Management**: Pass state explicitly via Axum's extractors. Do not use global mutable state (`lazy_static` with `Mutex`).
3.  **Domain-Driven Types**: Use Newtype patterns for IDs (e.g., `struct UserId(Uuid)`) to prevent accidental mixing of different IDs.

### 6.2 Anti-patterns
1.  **God Structs**: Avoid creating massive `App` structs that implement every trait.
2.  **Leaking Database Details**: Do not return `sqlx::Error` directly from your repository traits. Always map them to domain-specific errors.
3.  **Blocking the Async Runtime**: Never perform blocking I/O (e.g., `std::fs::read`) inside an async function. Use `tokio::fs` or `tokio::task::spawn_blocking`.

## 7. Configuration Management

Use crates like `figment` or `config` to manage environments.

```rust
use serde::Deserialize;

#[derive(Deserialize)]
pub struct AppConfig {
    pub database_url: String,
    pub port: u16,
    pub jwt_secret: String,
}

impl AppConfig {
    pub fn load() -> Result<Self, config::ConfigError> {
        let env = std::env::var("APP_ENV").unwrap_or_else(|_| "development".into());
        
        let settings = config::Config::builder()
            .add_source(config::File::with_name("config/default"))
            .add_source(config::File::with_name(&format!("config/{}", env)).required(false))
            .add_source(config::Environment::with_prefix("APP").separator("__"))
            .build()?;
            
        settings.try_deserialize()
    }
}
```

## 8. Summary
By adhering to Hexagonal Architecture, utilizing CQRS where appropriate, and leveraging Axum's powerful extraction and routing mechanisms, Rust backends can remain incredibly performant, entirely safe from data races, and exceptionally maintainable.
