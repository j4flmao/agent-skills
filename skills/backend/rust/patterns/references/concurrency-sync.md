# Concurrency and Synchronization in Rust

## Overview
Rust's ownership model makes concurrency safer than most languages. The type system enforces Send and Sync traits at compile time, preventing data races. This reference covers channels, mutexes, RwLocks, atomics, and async concurrency patterns.

## Ownership and Send/Sync

### Send and Sync Traits
```rust
// Send: types that can be transferred across thread boundaries
// Sync: types that can be shared across threads via reference

fn is_send<T: Send>() {}
fn is_sync<T: Sync>() {}

// Most types are Send + Sync automatically
is_send::<String>();
is_sync::<String>();

// Rc is NOT Send (not thread-safe)
// let rc = Rc::new(42);
// is_send::<Rc<i32>>();  // ERROR: Rc<i32> is not Send

// Arc IS Send + Sync
is_send::<Arc<i32>>();
is_sync::<Arc<i32>>();
```

### Raw Pointers and Unsafe
```rust
// Raw pointers are neither Send nor Sync
// *const T and *mut T are !Send and !Sync

struct MySendType(*const i32);
// Error: *const i32 is not Send

// SAFETY: This pointer is only used in specific thread-safe ways
unsafe impl Send for MySendType {}
unsafe impl Sync for MySendType {}
```

## Thread Spawning

### Basic Threads
```rust
use std::thread;
use std::time::Duration;

fn main() {
    let handle = thread::spawn(|| {
        for i in 1..10 {
            println!("Thread: {}", i);
            thread::sleep(Duration::from_millis(100));
        }
    });

    for i in 1..5 {
        println!("Main: {}", i);
        thread::sleep(Duration::from_millis(100));
    }

    handle.join().unwrap();
}
```

### Threads with Move Closures
```rust
use std::thread;

fn main() {
    let data = vec![1, 2, 3, 4, 5];

    let handle = thread::spawn(move || {
        println!("Data: {:?}", data);
        // data is moved into the closure
    });

    handle.join().unwrap();
    // println!("{:?}", data); // ERROR: data was moved
}
```

## Message Passing with Channels

### mpsc Channels
```rust
use std::sync::mpsc;
use std::thread;

fn main() {
    let (tx, rx) = mpsc::channel();

    thread::spawn(move || {
        tx.send("Hello from thread".to_string()).unwrap();
        tx.send("Second message".to_string()).unwrap();
    });

    for received in rx {
        println!("Got: {}", received);
    }
}
```

### Multiple Producers
```rust
use std::sync::mpsc;
use std::thread;

fn main() {
    let (tx, rx) = mpsc::channel();

    let tx1 = tx.clone();
    thread::spawn(move || {
        tx1.send("Producer 1".to_string()).unwrap();
    });

    let tx2 = tx.clone();
    thread::spawn(move || {
        tx2.send("Producer 2".to_string()).unwrap();
    });

    drop(tx);

    for msg in rx {
        println!("Received: {}", msg);
    }
}
```

## Shared State with Mutex

### Single-threaded Mutex
```rust
use std::sync::Mutex;

fn main() {
    let counter = Mutex::new(0);

    {
        let mut num = counter.lock().unwrap();
        *num += 1;
    }

    println!("Counter: {}", counter.lock().unwrap());
}
```

### Arc<Mutex<T>> Pattern
```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let counter = Arc::new(Mutex::new(0));
    let mut handles = vec![];

    for _ in 0..10 {
        let counter = Arc::clone(&counter);
        let handle = thread::spawn(move || {
            let mut num = counter.lock().unwrap();
            *num += 1;
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("Result: {}", *counter.lock().unwrap());
}
```

### Poisoned Mutex
```rust
use std::sync::Mutex;

let mutex = Mutex::new(42);

// If a thread panics while holding the lock, the mutex is poisoned
let handle = std::thread::spawn(move || {
    let guard = mutex.lock().unwrap();
    panic!("Panic while holding lock");
});

// Attempting to lock a poisoned mutex
// let guard = mutex.lock().unwrap(); // Panics
if let Ok(guard) = handle.join() {
    // Work with guard
}

// Recover from poison
let mutex = Mutex::new(42);
let result = mutex.clear_poison();  // Clears poisoned state
```

## RwLock for Read-Heavy Workloads

### Read-Write Lock
```rust
use std::sync::RwLock;

fn main() {
    let data = RwLock::new(vec![1, 2, 3, 4, 5]);

    // Multiple readers can access simultaneously
    {
        let read = data.read().unwrap();
        println!("Read: {:?}", *read);
    }

    // Writer blocks all readers and writers
    {
        let mut write = data.write().unwrap();
        write.push(6);
    }

    // Read again after write
    {
        let read = data.read().unwrap();
        println!("After write: {:?}", *read);
    }
}
```

### RwLock with Arc
```rust
use std::sync::{Arc, RwLock};
use std::thread;

fn main() {
    let data = Arc::new(RwLock::new(String::from("Hello")));
    let mut handles = vec![];

    // Reader threads
    for _ in 0..5 {
        let data = Arc::clone(&data);
        handles.push(thread::spawn(move || {
            let read = data.read().unwrap();
            println!("Read: {}", *read);
        }));
    }

    // Writer thread
    let data_writer = Arc::clone(&data);
    handles.push(thread::spawn(move || {
        let mut write = data_writer.write().unwrap();
        write.push_str(", World!");
    }));

    for handle in handles {
        handle.join().unwrap();
    }
}
```

## Atomics

### Atomic Operations
```rust
use std::sync::atomic::{AtomicBool, AtomicU64, AtomicI32, Ordering};
use std::sync::Arc;
use std::thread;

fn main() {
    let counter = Arc::new(AtomicU64::new(0));
    let mut handles = vec![];

    for _ in 0..10 {
        let counter = Arc::clone(&counter);
        handles.push(thread::spawn(move || {
            // Relaxed ordering: no synchronization guarantees
            counter.fetch_add(1, Ordering::Relaxed);
        }));
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("Counter: {}", counter.load(Ordering::SeqCst));

    // AtomicBool for flags
    let flag = Arc::new(AtomicBool::new(false));
    let flag_clone = Arc::clone(&flag);

    thread::spawn(move || {
        thread::sleep(std::time::Duration::from_secs(1));
        flag_clone.store(true, Ordering::Release);
    });

    // Spin until flag is set
    while !flag.load(Ordering::Acquire) {
        thread::yield_now();
    }
    println!("Flag was set");
}
```

## Async Concurrency with Tokio

### Tokio Tasks
```rust
use tokio::task;

#[tokio::main]
async fn main() {
    let mut handles = vec![];

    for i in 0..10 {
        handles.push(task::spawn(async move {
            process_item(i).await
        }));
    }

    for handle in handles {
        handle.await.unwrap();
    }
}
```

### Channels for Task Communication
```rust
use tokio::sync::mpsc;

#[tokio::main]
async fn main() {
    let (tx, mut rx) = mpsc::channel(32);

    // Producer
    let producer = tokio::spawn(async move {
        for i in 0..10 {
            tx.send(i).await.unwrap();
        }
    });

    // Consumer
    let consumer = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            println!("Received: {}", msg);
        }
    });

    producer.await.unwrap();
    consumer.await.unwrap();
}
```

### Broadcast Channel
```rust
use tokio::sync::broadcast;

#[tokio::main]
async fn main() {
    let (tx, _) = broadcast::channel(16);

    // Multiple subscribers
    let mut rx1 = tx.subscribe();
    let mut rx2 = tx.subscribe();

    tokio::spawn(async move {
        loop {
            let msg = rx1.recv().await.unwrap();
            println!("Subscriber 1: {}", msg);
        }
    });

    tokio::spawn(async move {
        loop {
            let msg = rx2.recv().await.unwrap();
            println!("Subscriber 2: {}", msg);
        }
    });

    tx.send("Broadcast message".to_string()).unwrap();
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
}
```

### Oneshot Channel
```rust
use tokio::sync::oneshot;

#[tokio::main]
async fn main() {
    let (tx, rx) = oneshot::channel();

    tokio::spawn(async move {
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        tx.send("Task complete".to_string()).unwrap();
    });

    let result = rx.await.unwrap();
    println!("{}", result);
}
```

## Select Macro

### Race Multiple Futures
```rust
use tokio::time::{sleep, Duration};

#[tokio::main]
async fn main() {
    tokio::select! {
        result = task_a() => println!("Task A completed: {}", result),
        result = task_b() => println!("Task B completed: {}", result),
        _ = sleep(Duration::from_secs(5)) => println!("Timeout exceeded"),
    }
}
```

### Graceful Shutdown
```rust
use tokio::signal;
use tokio::sync::watch;

#[tokio::main]
async fn main() {
    let (tx, mut rx) = watch::channel(false);

    // Worker
    let worker = tokio::spawn(async move {
        loop {
            tokio::select! {
                _ = rx.changed() => {
                    if *rx.borrow() {
                        println!("Shutting down worker");
                        break;
                    }
                }
                _ = tokio::time::sleep(Duration::from_secs(1)) => {
                    println!("Working...");
                }
            }
        }
    });

    // Wait for Ctrl+C
    signal::ctrl_c().await.unwrap();
    tx.send(true).unwrap();
    worker.await.unwrap();
}
```

## Parallelism with Rayon

### Parallel Iterators
```rust
use rayon::prelude::*;

fn main() {
    let numbers: Vec<i64> = (0..1_000_000).collect();

    // Sequential
    let sum: i64 = numbers.iter().sum();

    // Parallel
    let parallel_sum: i64 = numbers.par_iter().sum();

    // Parallel map
    let processed: Vec<i64> = numbers
        .par_iter()
        .map(|&x| x * x)
        .filter(|&x| x % 2 == 0)
        .collect();
}
```

## Key Points
- Send types can be transferred across threads, Sync types can be shared
- Arc provides thread-safe reference counting
- Mutex protects shared state with mutual exclusion
- RwLock allows concurrent reads with exclusive writes
- Channels (mpsc, oneshot, broadcast) enable message passing
- Atomics provide lock-free synchronization for simple types
- Tokio select! races multiple async operations
- Rayon provides easy data parallelism
- Prefer channels over shared state for task communication
- Mutex poisoning provides safety guarantees when threads panic
