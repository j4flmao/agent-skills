# Rust Async Programming

## Async Runtime Comparison

| Runtime | Style | Features | When |
|---------|-------|----------|------|
| **Tokio** | Multi-threaded | Full ecosystem | Production web servers |
| **async-std** | Stdlib-like | Smaller scope | Learning, simple apps |
| **smol** | Minimal, no macros | Lightweight | Embedded, minimal deps |

## Tokio Runtime

```rust
use tokio::net::TcpListener;
use tokio::time::{sleep, timeout, Duration};

// Multi-threaded runtime (default)
#[tokio::main]
async fn main() -> Result<()> {
    let listener = TcpListener::bind("0.0.0.0:3000").await?;
    loop {
        let (socket, _) = listener.accept().await?;
        tokio::spawn(async move {
            handle_connection(socket).await;
        });
    }
}

// Single-threaded runtime
#[tokio::main(flavor = "current_thread")]
async fn main() {}
```

## Concurrent Tasks

```rust
use tokio::task::JoinSet;

async fn process_batch(items: Vec<Item>) -> Result<Vec<Output>> {
    let mut set = JoinSet::new();

    for item in items {
        set.spawn(async move { process_item(item).await });
    }

    let mut results = Vec::new();
    while let Some(result) = set.join_next().await {
        results.push(result??);
    }
    Ok(results)
}

// Select between tasks
tokio::select! {
    result = task1 => println!("task1: {:?}", result),
    result = task2 => println!("task2: {:?}", result),
    _ = sleep(Duration::from_secs(5)) => println!("timeout"),
}
```

## Async Channels

```rust
use tokio::sync::{mpsc, oneshot, broadcast};

// Oneshot — single value, one receiver
let (tx, rx) = oneshot::channel::<Response>();
tokio::spawn(async move {
    let result = compute().await;
    tx.send(result).unwrap();
});
let response = rx.await.unwrap();

// MPSC — multiple producers, single consumer
let (tx, mut rx) = mpsc::channel::<Job>(100);
for _ in 0..4 {
    let tx = tx.clone();
    tokio::spawn(async move {
        loop {
            if let Some(job) = rx.recv().await {
                process(job).await;
            }
        }
    });
}

// Broadcast — multiple consumers
let (tx, _) = broadcast::channel::<Event>(16);
let mut rx1 = tx.subscribe();
let mut rx2 = tx.subscribe();
```

## Async Synchronization

```rust
use tokio::sync::{Mutex, RwLock, Semaphore};

// Async Mutex — hold across .await points
struct SharedState {
    counter: Mutex<u64>,
}

async fn increment(state: &SharedState) {
    let mut guard = state.counter.lock().await;
    *guard += 1;
    // guard released on drop
}

// RwLock — read-heavy workloads
struct Cache {
    data: RwLock<HashMap<String, Value>>,
}

async fn get_or_compute(cache: &Cache, key: &str) -> Value {
    if let Some(val) = cache.data.read().await.get(key) {
        return val.clone();
    }
    let val = compute(key).await;
    cache.data.write().await.insert(key.to_string(), val.clone());
    val
}

// Semaphore — rate limiting
let semaphore = Arc::new(Semaphore::new(10)); // max 10 concurrent
let permit = semaphore.acquire().await.unwrap();
do_work().await;
drop(permit);
```

## Streaming

```rust
use tokio_stream::StreamExt;
use futures::stream::{Stream, StreamExt};

// Async iterator
let mut stream = tokio_stream::iter(vec![1, 2, 3]);
while let Some(value) = stream.next().await {
    println!("{value}");
}

// Transform stream
let doubled = stream.map(|x| x * 2);

// Buffered processing (n concurrent)
let results: Vec<_> = stream
    .map(|item| process(item))
    .buffered(10) // max 10 concurrent
    .collect()
    .await;
```

## Cancellation

```rust
use tokio_util::sync::CancellationToken;

async fn main() {
    let token = CancellationToken::new();
    let token_clone = token.clone();

    tokio::spawn(async move {
        loop {
            tokio::select! {
                _ = token_clone.cancelled() => {
                    println!("Task cancelled");
                    return;
                }
                _ = do_work() => {}
            }
        }
    });

    // Cancel after timeout
    sleep(Duration::from_secs(5)).await;
    token.cancel();
}
```

## Graceful Shutdown

```rust
use tokio::signal;

async fn shutdown_signal() {
    signal::ctrl_c().await.unwrap();
    println!("Shutdown signal received");
}
```
