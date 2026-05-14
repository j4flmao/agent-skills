# Rust Error Handling

## Custom Error Type
```rust
#[derive(Debug, thiserror::Error)]
pub enum DomainError {
    #[error("order {0} not found")]
    NotFound(String),

    #[error("invalid state transition: {from} -> {to}")]
    InvalidTransition { from: OrderStatus, to: OrderStatus },

    #[error("validation error: {0}")]
    Validation(String),

    #[error("insufficient funds")]
    InsufficientFunds,
}
```

## Result Type Aliases
```rust
pub type DomainResult<T> = Result<T, DomainError>;
pub type InfrastructureResult<T> = Result<T, InfrastructureError>;
pub type UseCaseResult<T> = Result<T, UseCaseError>;

pub enum UseCaseError {
    Domain(DomainError),
    Infrastructure(InfrastructureError),
    Validation(String),
}
```

## Error Propagation
```rust
async fn place_order(cmd: PlaceOrderCommand) -> Result<Order, AppError> {
    let user = user_repo.find_by_id(&cmd.user_id)
        .await
        .map_err(|e| AppError::Infrastructure(e))?;

    let order = Order::create(user, cmd.items)
        .map_err(|e| AppError::Domain(e))?;

    order_repo.save(&order)
        .await
        .map_err(|e| AppError::Infrastructure(e))?;

    Ok(order)
}
```

## Error in HTTP Responses
```rust
impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, body) = match self {
            AppError::Domain(DomainError::NotFound(id)) => {
                (StatusCode::NOT_FOUND, json!({ "error": "not_found", "id": id }))
            }
            AppError::Domain(e) => {
                (StatusCode::BAD_REQUEST, json!({ "error": e.to_string() }))
            }
            AppError::Infrastructure(_) => {
                (StatusCode::INTERNAL_SERVER_ERROR, json!({ "error": "internal" }))
            }
        };
        (status, Json(body)).into_response()
    }
}
```
