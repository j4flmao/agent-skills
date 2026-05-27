# Rust API Patterns

## Axum Router

```rust
use axum::{
    Router, routing::{get, post, put, delete},
    extract::{Path, Query, State},
    Json, response::IntoResponse,
    http::StatusCode,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

#[derive(Serialize, Deserialize, Clone)]
struct User {
    id: String,
    name: String,
    email: String,
}

#[derive(Deserialize)]
struct Pagination {
    page: Option<u32>,
    per_page: Option<u32>,
}

struct AppState {
    db: Arc<dyn UserRepository>,
}

async fn list_users(
    State(state): State<Arc<AppState>>,
    Query(pagination): Query<Pagination>,
) -> impl IntoResponse {
    let page = pagination.page.unwrap_or(1);
    let per_page = pagination.per_page.unwrap_or(20);
    let users = state.db.find_all(page, per_page).await;
    (StatusCode::OK, Json(users))
}

async fn create_user(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateUserDto>,
) -> impl IntoResponse {
    let user = state.db.create(payload).await.unwrap();
    (StatusCode::CREATED, Json(user))
}

fn build_router() -> Router {
    let state = Arc::new(AppState {
        db: Arc::new(PostgresUserRepository::new()),
    });

    Router::new()
        .route("/users", get(list_users).post(create_user))
        .route("/users/:id", get(get_user).put(update_user).delete(delete_user))
        .with_state(state)
}
```

## Middleware

```rust
use axum::{
    middleware::{self, Next},
    response::Response,
    http::Request,
};
use std::time::Instant;
use tracing::info;

async fn logging_middleware<B>(
    req: Request<B>,
    next: Next<B>,
) -> Response {
    let start = Instant::now();
    let method = req.method().clone();
    let uri = req.uri().clone();

    let response = next.run(req).await;

    let duration = start.elapsed();
    info!("{} {} {} {:?}", method, uri, response.status(), duration);

    response
}

async fn auth_middleware<B>(
    mut req: Request<B>,
    next: Next<B>,
) -> Result<Response, StatusCode> {
    let token = req.headers()
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "));

    match token {
        Some(token) => {
            let user = verify_token(token).await.map_err(|_| StatusCode::UNAUTHORIZED)?;
            req.extensions_mut().insert(user);
            Ok(next.run(req).await)
        }
        None => Err(StatusCode::UNAUTHORIZED),
    }
}

fn apply_middleware(router: Router) -> Router {
    router
        .route_layer(middleware::from_fn(auth_middleware))
        .layer(middleware::from_fn(logging_middleware))
}
```

## Error Handling

```rust
use axum::{
    response::{IntoResponse, Response},
    Json,
};
use http::StatusCode;

#[derive(Debug)]
enum ApiError {
    NotFound(String),
    Unauthorized,
    Validation(String),
    Internal(anyhow::Error),
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            ApiError::NotFound(msg) => (StatusCode::NOT_FOUND, msg),
            ApiError::Unauthorized => (StatusCode::UNAUTHORIZED, "Unauthorized".into()),
            ApiError::Validation(msg) => (StatusCode::BAD_REQUEST, msg),
            ApiError::Internal(err) => {
                tracing::error!("Internal error: {:?}", err);
                (StatusCode::INTERNAL_SERVER_ERROR, "Internal error".into())
            }
        };

        (status, Json(serde_json::json!({
            "error": { "message": message }
        }))).into_response()
    }
}
```

## Key Points

- Use Axum for ergonomic async routing
- Use extractors (State, Path, Query, Json) for request data
- Implement middleware for cross-cutting concerns
- Use tower's Service trait for custom middleware
- Handle errors with IntoResponse trait implementations
- Use dependency injection through shared state
- Implement proper HTTP status codes for responses
- Use Serde for serialization and deserialization
- Validate input data with validator crate
- Implement pagination with query parameters
- Use tracing for structured logging
- Test routes with tower's test helpers
