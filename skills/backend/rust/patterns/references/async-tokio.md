# Rust Async with Tokio

## Basic Async
```rust
#[tokio::main]
async fn main() -> Result<()> {
    let order = get_order("order-123").await?;
    Ok(())
}

async fn get_order(id: &str) -> Result<Order, Error> {
    let client = reqwest::Client::new();
    let resp = client.get(format!("http://api/orders/{id}")).send().await?;
    Ok(resp.json::<Order>().await?)
}
```

## Concurrent Tasks
```rust
use tokio::try_join;

let (order, user, inventory) = try_join!(
    order_service.get_order(id),
    user_service.get_user(uid),
    inventory_service.check_stock(sku),
)?;
```

## Channels (mpsc)
```rust
let (tx, mut rx) = tokio::sync::mpsc::channel(100);
tokio::spawn(async move {
    while let Some(event) = rx.recv().await {
        process_event(event).await;
    }
});
tx.send(OrderPlaced { order_id: "123".into() }).await?;
```

## Graceful Shutdown
```rust
#[tokio::main]
async fn main() {
    let listener = TcpListener::bind("0.0.0.0:8080").await.unwrap();
    axum::serve(listener, app())
        .with_graceful_shutdown(shutdown_signal())
        .await
        .unwrap();
}

async fn shutdown_signal() {
    tokio::signal::ctrl_c().await.unwrap();
}
```
