# Rust Ownership Patterns

## Ownership Transfer
```rust
fn process(order: Order) -> OrderStatus {
    // order is moved into this function
    let status = calculate_status(&order);
    // order is dropped here
    status
}
```

## Borrowing
```rust
fn calculate_total(items: &[OrderItem]) -> Money {
    items.iter().map(|i| i.price).sum()
}
```

## Interior Mutability
```rust
use std::cell::RefCell;

struct Cache {
    data: RefCell<HashMap<String, String>>,
}

impl Cache {
    fn get(&self, key: &str) -> Option<String> {
        self.data.borrow().get(key).cloned()
    }
    fn set(&self, key: String, value: String) {
        self.data.borrow_mut().insert(key, value);
    }
}
```

## Arc for Shared Ownership
```rust
use std::sync::Arc;

struct AppState {
    repo: Arc<dyn OrderRepository>,
    bus: Arc<dyn EventBus>,
}

fn main() {
    let state = Arc::new(AppState { repo: Arc::new(PostgresRepo::new()), bus: Arc::new(RabbitBus::new()) });
    let state_clone = state.clone();
    tokio::spawn(async move { run_worker(state_clone) });
}
```

## Builder Pattern (instead of constructors with many params)
```rust
pub struct OrderBuilder {
    user_id: Option<UserId>,
    items: Vec<OrderItem>,
}

impl OrderBuilder {
    pub fn new() -> Self { Self { user_id: None, items: vec![] } }
    pub fn user_id(mut self, id: UserId) -> Self { self.user_id = Some(id); self }
    pub fn add_item(mut self, item: OrderItem) -> Self { self.items.push(item); self }
    pub fn build(self) -> Result<Order, ValidationError> {
        let user_id = self.user_id.ok_or(ValidationError::MissingUserId)?;
        Ok(Order::new(user_id, self.items))
    }
}
```
