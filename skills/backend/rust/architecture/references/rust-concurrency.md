# Rust Concurrency

## Async/Await Patterns

```rust
use tokio::task;
use std::time::Duration;

async fn fetch_user(user_id: &str) -> Result<User, Error> {
    let client = reqwest::Client::new();
    let response = client
        .get(&format!("https://api.example.com/users/{}", user_id))
        .send()
        .await?;
    Ok(response.json().await?)
}

async fn fetch_multiple_users(user_ids: &[&str]) -> Vec<Result<User, Error>> {
    let futures: Vec<_> = user_ids
        .iter()
        .map(|id| fetch_user(id))
        .collect();
    futures::future::join_all(futures).await
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    let users = fetch_multiple_users(&["1", "2", "3"]).await;

    for result in users {
        match result {
            Ok(user) => println!("User: {}", user.name),
            Err(e) => eprintln!("Error: {}", e),
        }
    }
    Ok(())
}
```

## Channels

```rust
use tokio::sync::mpsc;
use tokio::sync::oneshot;

async fn producer(tx: mpsc::Sender<String>) {
    for i in 0..10 {
        tx.send(format!("Message {}", i)).await.unwrap();
        tokio::time::sleep(Duration::from_millis(100)).await;
    }
}

async fn consumer(mut rx: mpsc::Receiver<String>) {
    while let Some(message) = rx.recv().await {
        println!("Received: {}", message);
    }
}

// Request-response pattern
async fn process_request(
    data: String,
    respond_to: oneshot::Sender<Result<String, Error>>,
) {
    let result = do_work(data).await;
    let _ = respond_to.send(result);
}
```

## Shared State with Tokio

```rust
use tokio::sync::{RwLock, Semaphore};
use std::sync::Arc;

#[derive(Clone)]
struct AppState {
    db: Arc<RwLock<Database>>,
    rate_limiter: Arc<Semaphore>,
    config: Arc<Config>,
}

impl AppState {
    fn new(config: Config) -> Self {
        Self {
            db: Arc::new(RwLock::new(Database::new())),
            rate_limiter: Arc::new(Semaphore::new(100)),
            config: Arc::new(config),
        }
    }

    async fn read_user(&self, user_id: &str) -> Result<User, Error> {
        let _permit = self.rate_limiter.acquire().await?;
        let db = self.db.read().await;
        db.find_user(user_id)
    }

    async fn update_user(&self, user_id: &str, data: UpdateUser) -> Result<User, Error> {
        let _permit = self.rate_limiter.acquire().await?;
        let mut db = self.db.write().await;
        db.update_user(user_id, data)
    }
}
```

## Key Points

- Use tokio for async runtime with work-stealing scheduler
- Use mpsc channels for one-to-many communication
- Use oneshot channels for request-response patterns
- Use broadcast channels for many-to-many communication
- Use RwLock for read-heavy concurrent access
- Use Semaphore for rate limiting and resource control
- Use JoinSet for structured concurrency
- Use select! macro for racing futures
- Use tokio::spawn for CPU-independent tasks
- Use spawn_blocking for CPU-intensive operations
- Handle cancellation with cancellation tokens
- Use graceful shutdown with signal handling
