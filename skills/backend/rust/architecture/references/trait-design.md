# Rust Trait Design

## Repository Trait
```rust
#[async_trait]
pub trait OrderRepository: Send + Sync {
    async fn find_by_id(&self, id: &OrderId) -> Result<Option<Order>, InfrastructureError>;
    async fn save(&self, order: &Order) -> Result<(), InfrastructureError>;
}
```

## Trait with Associated Types
```rust
pub trait Repository {
    type Entity;
    type Id;
    type Error;

    async fn find_by_id(&self, id: &Self::Id) -> Result<Option<Self::Entity>, Self::Error>;
    async fn save(&self, entity: &Self::Entity) -> Result<(), Self::Error>;
}

impl Repository for PostgresOrderRepo {
    type Entity = Order;
    type Id = OrderId;
    type Error = InfrastructureError;
    // ...
}
```

## Service Trait
```rust
#[async_trait]
pub trait OrderService: Send + Sync {
    async fn place_order(&self, cmd: PlaceOrderCommand) -> Result<Order, DomainError>;
    async fn get_order(&self, id: &OrderId) -> Result<Order, DomainError>;
}
```

## Trait Object Usage
```rust
pub struct PlaceOrderUseCase {
    repo: Arc<dyn OrderRepository>,
    event_bus: Arc<dyn EventBus>,
}

impl PlaceOrderUseCase {
    pub fn new(repo: Arc<dyn OrderRepository>, event_bus: Arc<dyn EventBus>) -> Self {
        Self { repo, event_bus }
    }
}
```
