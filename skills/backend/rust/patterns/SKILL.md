---
name: rust-patterns
description: >
  Use this skill when the user says 'Rust ownership', 'Rust borrow checker', 'Rust async', 'Tokio', 'Rust error', 'Rust Result', 'Rust Option', 'Rust lifetime', 'Rust trait object', 'Rust Send Sync', 'Rust Arc Mutex', or when writing Rust code. This skill enforces: ownership decision rules (clone vs borrow vs Arc), thiserror for library errors vs anyhow for application errors, type-state pattern, and async/await patterns with Tokio. Requires Rust (Cargo.toml). Do NOT use for: Rust project structure, crate design, or non-Rust patterns.
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

# Rust Patterns

## Purpose
Write idiomatic Rust with correct ownership, error handling, and async patterns. thiserror for library errors. anyhow for application errors. Type-state for compile-time correctness.

## Agent Protocol

### Trigger
Exact user phrases: "Rust ownership", "Rust borrow checker", "Rust async", "Tokio", "Rust error", "Rust Result", "Rust Option", "Rust lifetime", "Rust trait object", "Rust Send Sync", "Rust Arc Mutex", "thiserror", "anyhow".

### Input Context
Before activating, verify:
- The pattern or problem is known (ownership question, error handling approach, async pattern).
- Cargo.toml exists.

### Output Artifact
No file output. Produces code examples as text.

### Response Format
```
Pattern: {name}
Decision: {when to use this approach}
Code: {implementation}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Ownership strategy matches the decision table below.
- [ ] Error types use thiserror for library crates, anyhow for application crates.
- [ ] Async code manages goroutine lifecycle with JoinHandle or select!.
- [ ] No unwrap() or expect() in production code.
- [ ] Type-state used for compile-time correctness where applicable.
- [ ] Builder pattern used for complex struct construction.

### Max Response Length
Per pattern: 20 lines of code + 2 lines explanation.

## Workflow

### Step 1: Ownership Decision
| Situation | Approach |
|-----------|----------|
| Function reads data temporarily | &T (borrow) |
| Function needs owned data (async, thread) | T (move) |
| Multiple owners, read-only | Arc<T> |
| Multiple owners, mutating | Arc<Mutex<T>> or Arc<RwLock<T>> |
| Temporary mutation | &mut T |
| Optional (maybe exists) | Option<T> |

### Step 2: Error Handling
```rust
// Library crate (domain, infrastructure) — use thiserror
#[derive(Debug, thiserror::Error)]
pub enum RepositoryError {
    #[error("entity not found: {entity}::{id}")]
    NotFound { entity: String, id: String },
    #[error("database error: {0}")]
    Database(#[from] sqlx::Error),
}

// Application binary — use anyhow
use anyhow::{Context, Result};
fn process_order(order_id: Uuid) -> Result<Order> {
    let order = repository
        .find_by_id(order_id)
        .context(format!("failed to fetch order {order_id}"))?;
    Ok(order)
}
```

### Step 3: Async with Tokio
```go
#[tokio::main]
async fn main() -> Result<()> {
    let handle1 = tokio::spawn(async { process_batch(1..100).await });
    let handle2 = tokio::spawn(async { process_batch(100..200).await });

    // Select: wait for whichever finishes first
    tokio::select! {
        result = handle1 => println!("batch 1: {:?}", result),
        result = handle2 => println!("batch 2: {:?}", result),
    }

    Ok(())
}
```

### Step 4: Type-State Pattern
Encode state machine in the type system. Invalid states are unrepresentable.
```rust
pub struct Empty;
pub struct Validated;
pub struct Submitted;

pub struct Order<State = Empty> {
    items: Vec<OrderItem>,
    _state: PhantomData<State>,
}

impl Order<Empty> {
    pub fn new() -> Self {
        Self { items: vec![], _state: PhantomData }
    }

    pub fn add_item(mut self, item: OrderItem) -> Order<Validated> {
        self.items.push(item);
        Order { items: self.items, _state: PhantomData }
    }
}

impl Order<Validated> {
    pub fn submit(self) -> Result<Order<Submitted>, DomainError> {
        // Can only submit a validated order
        Ok(Order { items: self.items, _state: PhantomData })
    }
}
```

### Step 5: Builder Pattern
```rust
pub struct CreateUserRequest {
    pub email: String,
    pub name: String,
    pub role: UserRole,
}

pub struct CreateUserBuilder {
    email: Option<String>,
    name: Option<String>,
    role: UserRole,
}

impl CreateUserBuilder {
    pub fn new() -> Self {
        Self { email: None, name: None, role: UserRole::User }
    }
    pub fn with_email(mut self, email: impl Into<String>) -> Self {
        self.email = Some(email.into());
        self
    }
    pub fn build(self) -> Result<CreateUserRequest, ValidationError> {
        Ok(CreateUserRequest {
            email: self.email.ok_or(ValidationError::MissingField("email"))?,
            name: self.name.ok_or(ValidationError::MissingField("name"))?,
            role: self.role,
        })
    }
}
```

## Rules
- Clone is not a solution to ownership problems. Understand borrowing first.
- async is not zero-cost. Only make functions async if they do I/O.
- Arc<Mutex<T>> is a last resort. Prefer message passing (channels) or RwLock for read-heavy workloads.
- Use ? for error propagation. Never unwrap() or expect() in production code. Use them only in tests and examples.
- thiserror in libraries (domain, infrastructure crates). anyhow in applications (binary crates).
- Implement Send + Sync on types that cross .await points.

## References
- `references/ownership-patterns.md` — ownership, borrowing, interior mutability, builder pattern
- `references/async-tokio.md` — Tokio runtime, concurrent tasks, channels, graceful shutdown
- `references/error-handling.md` — custom error types, Result aliases, error propagation
- `references/rust-testing.md` — unit tests, async tests, mockall, proptest, fixtures

## Handoff
No artifact produced.
Next skill: backend-testing — test Rust code.
Carry forward: error handling strategy, async architecture.
