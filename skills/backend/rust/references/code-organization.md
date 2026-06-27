# Rust Backend Code Organization

## 1. Modularity in Rust

Rust's module system (`mod`, `use`, `pub`) is explicit. Unlike languages where directory structure implicitly dictates namespaces, Rust requires explicit module declaration in `mod.rs` or `lib.rs`/`main.rs`.

A clean code organization is vital for compile times, team collaboration, and long-term maintainability.

## 2. Directory Structure

A standard, scalable Rust backend project should look like this:

```text
my_backend/
├── Cargo.toml          # Project dependencies and metadata
├── src/
│   ├── main.rs         # Entry point: Server initialization and DI wiring
│   ├── lib.rs          # Exposes internal modules (useful for integration tests)
│   ├── config.rs       # Application configuration loading (Env vars)
│   ├── error.rs        # Global error types and Axum IntoResponse impls
│   │
│   ├── domain/         # Core business logic and entities (No external dependencies)
│   │   ├── mod.rs
│   │   ├── user.rs
│   │   └── product.rs
│   │
│   ├── application/    # Use cases and business orchestrations
│   │   ├── mod.rs
│   │   └── user_service.rs
│   │
│   ├── ports/          # Interfaces (Traits) defining external dependencies
│   │   ├── mod.rs
│   │   └── repository.rs
│   │
│   └── infrastructure/ # External implementations (Axum, sqlx, Redis)
│       ├── mod.rs
│       ├── state.rs    # AppState struct passed to Axum handlers
│       ├── adapters/   # Implementations of 'ports'
│       │   ├── mod.rs
│       │   └── postgres_repo.rs
│       └── http/       # HTTP specific routing and handlers
│           ├── mod.rs
│           ├── router.rs
│           ├── handlers/
│           │   ├── mod.rs
│           │   └── user_handlers.rs
│           └── middleware/
│               ├── mod.rs
│               └── auth.rs
│
├── tests/              # Integration and E2E tests
│   ├── common/
│   └── api_tests.rs
│
├── migrations/         # SQLx database migrations
│   └── 20230101_init.sql
│
└── config/             # Configuration files (toml, yaml)
    ├── default.toml
    └── production.toml
```

## 3. Explaining the Layers

### 3.1 Domain Layer (`src/domain/`)
- Contains pure Rust types (`structs`, `enums`).
- No framework imports (no `axum`, no `sqlx`).
- Defines what the business objects are and how they mutate internally.

### 3.2 Ports Layer (`src/ports/`)
- Defines `async_trait` interfaces.
- The Domain and Application layers rely on these Traits to interact with the outside world.

### 3.3 Application Layer (`src/application/`)
- Contains Services (e.g., `UserService`).
- Orchestrates Domain models and Ports.
- Example: "Receive data, validate via Domain, save via Port."

### 3.4 Infrastructure Layer (`src/infrastructure/`)
- Contains the heavy frameworks.
- **Adapters**: Implements the Traits defined in `ports/` (e.g., executing actual SQL queries using `sqlx`).
- **HTTP**: Axum routers, middlewares, and handlers. Handlers receive HTTP requests, parse JSON, call the Application Layer, and return HTTP responses.

## 4. Workspace Architecture

For very large monoliths, placing everything in one crate can lead to slow compile times. Cargo Workspaces solve this by splitting code into multiple crates.

```text
large_project/
├── Cargo.toml          # Workspace root, defines members
├── api/                # Crate: HTTP layer (Axum)
│   ├── Cargo.toml
│   └── src/
├── core/               # Crate: Domain and Application logic
│   ├── Cargo.toml
│   └── src/
└── db/                 # Crate: Infrastructure, sqlx
    ├── Cargo.toml
    └── src/
```

Root `Cargo.toml`:
```toml
[workspace]
members = [
    "api",
    "core",
    "db"
]
```

**Benefits of Workspaces:**
- **Compilation Speed**: Changing HTTP code doesn't force recompilation of DB code.
- **Strict Boundaries**: Prevents accidental leakage of DB concepts into HTTP layers if dependencies aren't explicitly declared in the crate's `Cargo.toml`.

## 5. Handling Re-exports (Preludes)

If your project has standard types used everywhere (like `Result` types, standard models, etc.), consider creating a localized `prelude`.

```rust
// src/prelude.rs
pub use crate::error::ApplicationError;
pub use crate::domain::User;
pub type Result<T> = core::result::Result<T, ApplicationError>;

// In other files:
// use crate::prelude::*;
```

## 6. The Module File (`mod.rs`) Pattern

You have two choices for defining modules in Rust 2018+:

1. The `mod.rs` pattern: `domain/mod.rs` and `domain/user.rs`.
2. The directory-named file pattern: `domain.rs` and `domain/user.rs`.

**Best Practice**: Stick to the `mod.rs` pattern. It keeps all code for a module physically contained within its respective folder, making navigation and file tree management much cleaner.

```rust
// Inside src/domain/mod.rs
pub mod user;
pub mod product;

// Re-export for easier access from outside
pub use user::User;
pub use product::Product;
```

## 7. Configuration Structuring

Isolate environment reading to a single `config.rs` module. Do not sprinkle `std::env::var()` throughout your application. Construct a static `AppConfig` struct at startup and pass it down or load it into `AppState`.

## 8. Summary Rules
1. **Dependency Direction**: Infrastructure depends on Application; Application depends on Domain. Domain depends on nothing.
2. **Explicit Interfaces**: Use Traits in `ports` to decouple database implementations from business logic.
3. **Workspace for Scale**: If compile times exceed 10 seconds incrementally, split the project into a Cargo Workspace.
4. **Isolate HTTP**: Keep all Axum handlers and routers in `infrastructure/http`. The Application core should know nothing about JSON or HTTP Headers.
