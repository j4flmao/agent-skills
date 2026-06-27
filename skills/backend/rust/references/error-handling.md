# Rust Backend Error Handling

## 1. Core Philosophy

In Rust, there are no exceptions. Errors are handled as normal return values using the `Result<T, E>` enum. 

- **Recoverable Errors**: Represented by `Result`. E.g., Database connection failure, File not found.
- **Unrecoverable Errors**: Triggered by `panic!`. E.g., Array out of bounds, Mutex poisoning. In a web server, a thread panicking shouldn't crash the server (Tokio catches it), but it instantly terminates the request. Panicking should be avoided in backend logic.

## 2. The `thiserror` Crate

The `thiserror` crate provides a macro to easily implement the `std::error::Error` trait for your custom error enums. It is the standard for defining library or application-level errors.

```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ApplicationError {
    #[error("Database query failed: {0}")]
    Database(#[from] sqlx::Error),
    
    #[error("Authentication failed: {0}")]
    Auth(String),
    
    #[error("Resource not found: {0}")]
    NotFound(String),
    
    #[error("Internal server error")]
    Internal(#[from] anyhow::Error),
}
```

The `#[from]` attribute automatically implements `From<sqlx::Error> for ApplicationError`, allowing you to use the `?` operator cleanly.

## 3. The `anyhow` Crate

While `thiserror` is great for defining specific, matchable errors, `anyhow` is used in application binaries to capture any error type easily, attaching context along the way.

```rust
use anyhow::{Context, Result};

fn read_config() -> Result<String> {
    let content = std::fs::read_to_string("config.toml")
        .context("Failed to read the config file located at config.toml")?;
    Ok(content)
}
```

**Rule of Thumb:**
- Use `thiserror` for Libraries and Core Domain logic.
- Use `anyhow` for top-level Application routing or internal scripts where precise enum matching isn't required.

## 4. Error Handling in Axum (Web Layer)

To return a custom error from an Axum handler, the error must implement `axum::response::IntoResponse`.

### 4.1 Structuring API Errors

```rust
use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

// We use the previously defined ApplicationError
impl IntoResponse for ApplicationError {
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            ApplicationError::Database(err) => {
                tracing::error!("Database Error: {:?}", err); // Log internally
                (StatusCode::INTERNAL_SERVER_ERROR, "Internal Server Error".to_string())
            }
            ApplicationError::Auth(msg) => {
                (StatusCode::UNAUTHORIZED, msg)
            }
            ApplicationError::NotFound(msg) => {
                (StatusCode::NOT_FOUND, msg)
            }
            ApplicationError::Internal(err) => {
                tracing::error!("Internal Error: {:?}", err);
                (StatusCode::INTERNAL_SERVER_ERROR, "Internal Server Error".to_string())
            }
        };

        let body = Json(json!({
            "error": error_message,
        }));

        (status, body).into_response()
    }
}
```

### 4.2 Using the Error in a Handler

Now you can use `?` directly in handlers.

```rust
async fn get_user(
    axum::extract::Path(id): axum::extract::Path<uuid::Uuid>,
) -> Result<Json<User>, ApplicationError> {
    let user = db_layer::fetch_user(id).await?; // ? converts sqlx::Error to ApplicationError::Database
    
    if let Some(user) = user {
        Ok(Json(user))
    } else {
        Err(ApplicationError::NotFound(format!("User {} not found", id)))
    }
}
```

## 5. Tracing and Logging Errors

Errors should be logged systematically. Use the `tracing` crate.

- **ERROR**: Critical failures needing attention.
- **WARN**: Unexpected but recoverable issues.
- **INFO**: General system state changes.
- **DEBUG/TRACE**: Detailed diagnostics.

```rust
use tracing::{error, info, instrument};

#[instrument] // Automatically logs entry/exit and arguments
async fn process_payment(amount: f64) -> Result<(), ApplicationError> {
    info!("Processing payment of {}", amount);
    if amount <= 0.0 {
        let err = ApplicationError::Internal(anyhow::anyhow!("Invalid amount"));
        error!(?err, "Payment failed validation");
        return Err(err);
    }
    Ok(())
}
```

## 6. Avoiding `.unwrap()` and `.expect()`

In a production backend, `unwrap()` and `expect()` cause panics and should be completely eliminated. 

Instead of:
```rust
let config = read_config().unwrap(); // Panics if config is missing
```
Use:
```rust
let config = read_config().context("Missing config")?; // Propagates safely
```

## 7. Diagram: Error Propagation Flow

```text
Database (sqlx)
      |
      | Returns Result<T, sqlx::Error>
      v
Repository / DAO
      |
      | Uses '?' operator
      | Converts sqlx::Error -> AppError::Database(sqlx::Error) via #[from]
      v
Application Service
      |
      | Uses '?' operator
      | Evaluates Business Logic, might return AppError::NotFound
      v
Axum Handler
      |
      | Returns Result<Json<User>, AppError>
      | Axum invokes .into_response() on the Err variant
      v
AppError::into_response()
      |
      | Logs the actual sqlx::Error to the console via tracing
      | Maps AppError to HTTP 500 or 404 Status Code
      | Formats JSON response: { "error": "Internal Server Error" }
      v
HTTP Client (Secure, non-leaking response)
```

## 8. Summary Checklist
- [ ] Use `thiserror` for strongly typed error enums.
- [ ] Implement `IntoResponse` to map custom errors to HTTP Status Codes.
- [ ] Never leak raw database errors or stack traces to HTTP clients.
- [ ] Use `tracing` to log errors internally before mapping them to generic HTTP responses.
- [ ] Ban `.unwrap()` and `.expect()` in production code.
