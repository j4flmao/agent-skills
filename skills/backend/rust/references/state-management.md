# Rust Backend State Management

## 1. Concurrency and Ownership Basics

In Rust, the compiler enforces memory safety through ownership and borrowing. When dealing with web servers like Axum running on Tokio, requests are handled concurrently across multiple threads. Therefore, any state shared across requests must be thread-safe (`Send` + `Sync`) and carefully managed to avoid race conditions and deadlocks.

## 2. The `Arc` (Atomic Reference Counted) Pointer

To share data across multiple threads, wrap it in an `Arc`. `Arc` allows multiple owners of the same data, but only provides shared (read-only) access.

```rust
use std::sync::Arc;

struct ReadOnlyConfig {
    api_key: String,
    timeout_seconds: u64,
}

let config = Arc::new(ReadOnlyConfig {
    api_key: "secret".to_string(),
    timeout_seconds: 30,
});

// Clone the Arc to share ownership, not the underlying data
let shared_config = config.clone(); 
```

## 3. Interior Mutability (`Mutex` and `RwLock`)

If shared state must be mutated, you need interior mutability.

### 3.1 `std::sync::Mutex` vs `tokio::sync::Mutex`

- **`std::sync::Mutex`**: Blocking. Fast for very short, non-yielding operations.
- **`tokio::sync::Mutex`**: Async. Slower, but essential if you need to hold the lock across an `.await` point.

**Rule of Thumb:**
Never hold a `std::sync::Mutex` lock across an `.await` point, as this will block the underlying Tokio worker thread, severely degrading performance and potentially causing deadlocks.

### 3.2 Using `RwLock` for Read-Heavy Workloads

If your state is read frequently but updated rarely, use an `RwLock` (Read-Write Lock).

```rust
use std::sync::Arc;
use tokio::sync::RwLock;
use std::collections::HashMap;

#[derive(Clone)]
struct Cache {
    data: Arc<RwLock<HashMap<String, String>>>,
}

impl Cache {
    async fn get(&self, key: &str) -> Option<String> {
        let read_lock = self.data.read().await;
        read_lock.get(key).cloned()
    }

    async fn set(&self, key: String, value: String) {
        let mut write_lock = self.data.write().await;
        write_lock.insert(key, value);
    }
}
```

## 4. Axum State Management

Axum provides the `State` extractor for type-safe state injection.

### 4.1 Sub-states with `FromRef`

For large applications, components only need a subset of the global state. Axum's `FromRef` trait allows extracting sub-states cleanly.

```rust
use axum::{extract::{State, FromRef}, routing::get, Router};
use std::sync::Arc;
use sqlx::PgPool;

#[derive(Clone)]
struct AppState {
    db_pool: PgPool,
    redis_client: Arc<redis::Client>,
}

// Allow extraction of just the PgPool
impl FromRef<AppState> for PgPool {
    fn from_ref(state: &AppState) -> Self {
        state.db_pool.clone() // PgPool is internally an Arc
    }
}

async fn get_users(State(pool): State<PgPool>) -> &'static str {
    // Handlers only require what they need!
    "Users"
}

fn app(state: AppState) -> Router {
    Router::new()
        .route("/users", get(get_users))
        .with_state(state)
}
```

## 5. Actor Pattern with Channels

For complex state machines or systems requiring strict sequential execution, the Actor pattern via message passing (MPSC channels) is superior to Mutexes.

```rust
use tokio::sync::{mpsc, oneshot};

// The messages the Actor understands
enum Command {
    GetCount {
        resp: oneshot::Sender<u64>,
    },
    Increment,
}

// The Actor
struct CounterActor {
    receiver: mpsc::Receiver<Command>,
    count: u64,
}

impl CounterActor {
    async fn run(mut self) {
        while let Some(cmd) = self.receiver.recv().await {
            match cmd {
                Command::GetCount { resp } => {
                    let _ = resp.send(self.count);
                }
                Command::Increment => {
                    self.count += 1;
                }
            }
        }
    }
}

// The Handle used to communicate with the Actor
#[derive(Clone)]
struct CounterHandle {
    sender: mpsc::Sender<Command>,
}

impl CounterHandle {
    pub async fn increment(&self) {
        let _ = self.sender.send(Command::Increment).await;
    }

    pub async fn get_count(&self) -> u64 {
        let (send, recv) = oneshot::channel();
        let _ = self.sender.send(Command::GetCount { resp: send }).await;
        recv.await.expect("Actor task has been killed")
    }
}
```

## 6. Avoiding State Where Possible

The best state management is no state.
- Prefer passing configurations as environment variables injected at startup.
- Utilize databases (Postgres, Redis) to handle shared, persistent state instead of in-memory maps.

## 7. Diagram: State Resolution

```text
Request Lifecycle
+---------------------------------------------------------+
| Axum Router                                             |
|   |                                                     |
|   v (Receives HTTP Request)                             |
|   |                                                     |
|   +-- State Extractor                                   |
|   |     |                                               |
|   |     v                                               |
|   |   FromRef Trait Resolution                          |
|   |     |                                               |
|   |     +-- Pulls Arc<DbPool> from Global AppState      |
|   |                                                     |
|   v (Passes extracted State to Handler)                 |
| Handler(State(db))                                      |
+---------------------------------------------------------+
```

## 8. Summary
Use `Arc` for sharing, `tokio::sync::Mutex` when mutations across `.await` points are strictly necessary, and MPSC channels (Actor pattern) for complex synchronization to avoid deadlocks entirely. Use Axum's `FromRef` to keep handler signatures decoupled from the global application state struct.
