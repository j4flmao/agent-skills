# Rust Web Frameworks

## Framework Comparison

| Framework | Style | Async | Features | When |
|-----------|-------|-------|----------|------|
| **Axum** | Tower-based, extractors | Tokio | Full ecosystem | Production APIs |
| **Actix-web** | Actor-inspired, handler | Tokio | Mature, fast | High throughput |
| **Rocket** | Attribute macros | Custom | Ergonomics | Rapid prototyping |
| **Warp** | Filter-based, combinators | Tokio | Composable | Unique patterns |
| **Salvo** | Middleware-oriented | Tokio | Chinese docs | Alternative |

## Axum — Recommended

```rust
use axum::{
    Router,
    routing::{get, post},
    extract::{Path, Query, State},
    Json,
    response::Json,
};
use std::sync::Arc;

#[derive(Clone)]
struct AppState {
    db: Arc<dyn OrderRepository>,
}

async fn get_order(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Order>, StatusCode> {
    state.db.find_by_id(id)
        .await
        .map(Json)
        .map_err(|_| StatusCode::NOT_FOUND)
}

async fn create_order(
    State(state): State<AppState>,
    Json(payload): Json<CreateOrderRequest>,
) -> Result<(StatusCode, Json<Order>), StatusCode> {
    let order = state.db.save(payload.into()).await.map_err(|_| StatusCode::BAD_REQUEST)?;
    Ok((StatusCode::CREATED, Json(order)))
}

#[tokio::main]
async fn main() {
    let state = AppState { db: Arc::new(PostgresRepo::new().await) };

    let app = Router::new()
        .route("/orders", post(create_order))
        .route("/orders/{id}", get(get_order))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
```

## Actix-web

```rust
use actix_web::{get, post, web, App, HttpServer, Responder};

#[derive(serde::Deserialize)]
struct CreateOrder {
    customer_id: String,
    items: Vec<OrderItem>,
}

#[get("/orders/{id}")]
async fn get_order(path: web::Path<Uuid>) -> impl Responder {
    web::Json(order)
}

#[post("/orders")]
async fn create_order(body: web::Json<CreateOrder>) -> impl Responder {
    web::HttpResponse::Created().json(order)
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new()
            .service(get_order)
            .service(create_order)
    })
    .bind("0.0.0.0:3000")?
    .run()
    .await
}
```

## Shared State

```rust
// Axum — State extractor
let state = AppState { db: Arc::new(repo) };
Router::new().with_state(state);

// Actix — web::Data
let state = web::Data::new(AppState::new());
App::new().app_data(state.clone());
```

## Middleware

```rust
// Axum middleware
use tower_http::{
    cors::CorsLayer,
    compression::CompressionLayer,
    trace::TraceLayer,
    request_id::RequestId,
};

Router::new()
    .layer(TraceLayer::new_for_http())
    .layer(CompressionLayer::new())
    .layer(CorsLayer::permissive());

// Custom middleware
use axum::middleware::{self, Next};
use http::Request;

async fn auth_middleware<B>(mut req: Request<B>, next: Next<B>) -> Result<Response, StatusCode> {
    let token = req.headers().get("authorization").and_then(|v| v.to_str().ok());
    match token {
        Some(t) if valid(t) => {
            req.extensions_mut().insert(User { id: "abc".into() });
            Ok(next.run(req).await)
        }
        _ => Err(StatusCode::UNAUTHORIZED),
    }
}
```

## Error Handling

```rust
// Axum — IntoResponse for errors
#[derive(Debug)]
enum ApiError {
    NotFound(String),
    BadRequest(String),
    Internal(String),
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            ApiError::NotFound(m) => (StatusCode::NOT_FOUND, m),
            ApiError::BadRequest(m) => (StatusCode::BAD_REQUEST, m),
            ApiError::Internal(m) => (StatusCode::INTERNAL_SERVER_ERROR, m),
        };
        (status, Json(serde_json::json!({ "error": message }))).into_response()
    }
}
```
