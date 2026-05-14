# Rust Workspace Layout

```
Cargo.toml  [workspace]
├── crates/
│   ├── domain/
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── entity/
│   │       ├── value_object/
│   │       └── repository.rs  (trait)
│   ├── application/
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       └── use_case/
│   ├── infrastructure/
│   │   ├── persistence/
│   │   │   ├── Cargo.toml
│   │   │   └── src/
│   │   │       └── postgres_order_repo.rs
│   │   ├── web/
│   │   │   ├── Cargo.toml
│   │   │   └── src/
│   │   │       └── handlers/
│   │   └── auth/
│   │       ├── Cargo.toml
│   │       └── src/
│   └── api/
│       ├── Cargo.toml
│       └── src/
│           └── routes.rs
└── tests/
    └── integration/
```

## Cargo.toml
```toml
[workspace]
members = [
  "crates/domain",
  "crates/application",
  "crates/infrastructure/persistence",
  "crates/infrastructure/web",
  "crates/infrastructure/auth",
  "crates/api",
]
resolver = "2"
```

## Dependency Direction
```
api → application → domain
                   → infrastructure (via trait impls)
```
- `domain` crate: zero external dependencies
- `application` crate: depends only on domain
- `infrastructure` crates: depend on domain + external libs
