---
name: rust-architecture
description: >
  Use this skill when the user says 'Rust project structure', 'Rust architecture', 'Rust workspace', 'Rust clean arch', 'Rust module layout', 'Rust crate design', 'Rust folder structure', or when structuring a Rust application. This skill enforces: Cargo workspace with separate crates for each layer (domain, application, infrastructure, api), domain crate with zero external dependencies, trait-based DI with Arc<dyn Trait>, and per-crate error types with thiserror. Requires Cargo.toml. Do NOT use for: Rust ownership patterns, async Tokio setup, or non-Rust stacks.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, rust, phase-2]
---

# Rust Architecture

## Purpose
Structure Rust applications with Cargo workspaces. Each architectural layer is a separate crate. Domain crate has zero external dependencies. Dependency inversion via trait objects.

## Agent Protocol

### Trigger
Exact user phrases: "Rust project structure", "Rust architecture", "Rust workspace", "Rust clean arch", "Rust module layout", "Rust crate design", "Rust folder structure", "Rust project layout".

### Input Context
Before activating, verify:
- Cargo.toml exists.
- The project type (library, binary, workspace) is known.

### Output Artifact
No file output. Produces folder structure and code examples as text.

### Response Format
Folder structure:
```
crates/
  domain/src/
  application/src/
  infrastructure/src/
  api/src/
```

Code: show trait definitions and struct implementations. No use declarations.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Domain crate has zero external dependencies (only std + optional uuid/chrono for types).
- [ ] Repository interfaces are traits with #[async_trait] and Send + Sync.
- [ ] DI uses Arc<dyn Trait>, not generics (for production code).
- [ ] Per-crate error types using thiserror.
- [ ] Application errors map infrastructure errors with ? operator.
- [ ] Workspace Cargo.toml lists all crate members.

### Max Response Length
Folder structure: unlimited. Code: 20 lines per example.

## Workflow

### Step 1: Create Workspace Structure
```
Cargo.toml              -- workspace root
crates/
  domain/               -- Pure domain. Zero external deps.
    Cargo.toml
    src/
      lib.rs
      entities/
      value_objects/
      events/
      repositories/     -- Traits only
  application/          -- Use cases.
    Cargo.toml          -- depends on domain
    src/
      use_cases/
      dtos/
  infrastructure/       -- Adapters.
    Cargo.toml          -- depends on domain + application
    src/
      persistence/
      messaging/
  api/                  -- Entry point.
    Cargo.toml          -- depends on application + infrastructure
    src/
      main.rs
      handlers/
      middleware/
tests/
```

### Step 2: Workspace Cargo.toml
```toml
[workspace]
members = ["crates/domain", "crates/application", "crates/infrastructure", "crates/api"]
resolver = "2"
```

### Step 3: Domain Crate (Zero External Dependencies)
```rust
// Cargo.toml — no external dependencies except std
[package]
name = "domain"
version = "0.1.0"
edition = "2021"

[dependencies]
uuid = { version = "1", features = ["v7", "serde"] }
chrono = { version = "0.4", features = ["serde"] }
```

```rust
// src/repositories.rs — trait, no implementation
#[async_trait]
pub trait UserRepository: Send + Sync {
    async fn find_by_id(&self, id: &UserId) -> Result<User, DomainError>;
    async fn save(&self, user: &User) -> Result<(), DomainError>;
}
```

### Step 4: Application Crate
```rust
// depends on domain only
pub struct CreateUserUseCase {
    repo: Arc<dyn UserRepository>,
}

impl CreateUserUseCase {
    pub fn new(repo: Arc<dyn UserRepository>) -> Self {
        Self { repo }
    }

    pub async fn execute(&self, dto: CreateUserDto) -> Result<User, ApplicationError> {
        let user = User::new(dto.email, dto.name).map_err(ApplicationError::Domain)?;
        self.repo.save(&user).await.map_err(ApplicationError::from)?;
        Ok(user)
    }
}
```

### Step 5: Infrastructure Crate (Implements Traits)
```rust
pub struct PostgresUserRepository {
    pool: PgPool,
}

#[async_trait]
impl UserRepository for PostgresUserRepository {
    async fn find_by_id(&self, id: &UserId) -> Result<User, DomainError> {
        let row = sqlx::query_as::<_, UserRow>("SELECT * FROM users WHERE id = $1")
            .bind(id.as_uuid())
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| DomainError::Infrastructure(e.into()))?;
        row.map(|r| r.into_domain()).ok_or(DomainError::NotFound("user".into(), id.to_string()))
    }
}
```

### Step 6: API Crate (DI Composition Root)
```rust
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let pool = PgPool::connect(&config.database_url).await?;
    let user_repo = Arc::new(PostgresUserRepository::new(pool)) as Arc<dyn UserRepository>;
    let create_user = Arc::new(CreateUserUseCase::new(user_repo));

    let app = Router::new()
        .route("/users", post(handlers::create_user::handler))
        .with_state(AppState { create_user });

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await?;
    axum::serve(listener, app).await?;
    Ok(())
}
```

## Rules
- Domain crate: ONLY std + uuid + chrono. No tokio, no axum, no sqlx, no serde_json.
- Repository interfaces are traits with #[async_trait] + Send + Sync bounds.
- DI: Arc<dyn Trait> for production. Generics only for library code that needs monomorphization.
- Error types: thiserror per crate. Never Box<dyn Error> in public APIs.
- Application maps infrastructure errors with ? — never leaks infrastructure error types upward.
- Workspace Cargo.toml lists all crate members explicitly.

## References
  - references/crate-strategy.md — Crate Strategy and Workspace Design
  - references/rust-async.md — Rust Async Programming
  - references/rust-concurrency.md — Rust Concurrency
  - references/rust-config.md — Rust Configuration Management
  - references/rust-di.md — Rust Dependency Injection Patterns
  - references/rust-memory-management.md — Rust Memory Management
  - references/rust-web-frameworks.md — Rust Web Frameworks
  - references/testing-benchmarking.md — Testing and Benchmarking Rust Applications
  - references/trait-design.md — Rust Trait Design
  - references/workspace-layout.md — Rust Workspace Layout
## Handoff
No artifact produced.
Next skill: rust-patterns — ownership, async Tokio, error handling.
Carry forward: workspace structure, trait definitions, crate dependency graph.
