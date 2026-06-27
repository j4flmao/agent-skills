# Rust Backend Security Best Practices

## 1. Rust's Built-in Security

Rust natively prevents many common vulnerabilities:
- **Buffer Overflows**: Array access is bounds-checked.
- **Use-After-Free & Double-Free**: Prevented at compile time by the Borrow Checker.
- **Data Races**: Prevented by the `Send` and `Sync` traits.

However, business logic flaws, injection attacks, and cryptographic misuse are still possible.

## 2. Preventing Injection Attacks

### 2.1 SQL Injection

Never use string formatting for SQL queries. Always use parameterized queries. `sqlx` makes this easy and safe.

```rust
// DANGEROUS - SQL Injection Risk
// let query = format!("SELECT * FROM users WHERE email = '{}'", input_email);

// SAFE - Parameterized
use sqlx::query;

let result = query!("SELECT * FROM users WHERE email = $1", input_email)
    .fetch_optional(&pool)
    .await?;
```

### 2.2 Command Injection

If executing shell commands, never pass user input to a shell (like `sh -c`). Pass arguments directly to the binary.

```rust
use std::process::Command;

// SAFE
let output = Command::new("ls")
    .arg("-l")
    .arg(user_provided_directory) // Treated safely as a single argument
    .output()
    .expect("Failed to execute process");
```

## 3. Cryptography and Password Hashing

Do not write your own crypto. Use audited crates like `argon2` for passwords and `ring` or `rustls` for general cryptography.

### 3.1 Password Hashing with Argon2

```rust
use argon2::{
    password_hash::{
        rand_core::OsRng,
        PasswordHash, PasswordHasher, PasswordVerifier, SaltString
    },
    Argon2
};

fn hash_password(password: &str) -> Result<String, argon2::password_hash::Error> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    
    let password_hash = argon2.hash_password(password.as_bytes(), &salt)?.to_string();
    Ok(password_hash)
}

fn verify_password(hash: &str, password: &str) -> bool {
    let parsed_hash = match PasswordHash::new(hash) {
        Ok(h) => h,
        Err(_) => return false,
    };
    
    Argon2::default().verify_password(password.as_bytes(), &parsed_hash).is_ok()
}
```

## 4. Web Security (Axum)

### 4.1 CORS (Cross-Origin Resource Sharing)

Configure CORS strictly using `tower-http`.

```rust
use tower_http::cors::{CorsLayer, Any, Method};
use axum::http::HeaderValue;

let cors = CorsLayer::new()
    .allow_methods([Method::GET, Method::POST])
    .allow_origin([
        "https://myapp.com".parse::<HeaderValue>().unwrap(),
    ])
    .allow_credentials(true);

let app = axum::Router::new()
    // ... routes ...
    .layer(cors);
```

### 4.2 Security Headers

Add HTTP security headers using `tower-http`.

```rust
use tower_http::set_header::SetResponseHeaderLayer;
use axum::http::{header, HeaderValue};

let app = axum::Router::new()
    .layer(SetResponseHeaderLayer::overriding(
        header::X_FRAME_OPTIONS,
        HeaderValue::from_static("DENY"),
    ))
    .layer(SetResponseHeaderLayer::overriding(
        header::STRICT_TRANSPORT_SECURITY,
        HeaderValue::from_static("max-age=31536000; includeSubDomains"),
    ));
```

## 5. Dependency Supply Chain

### 5.1 Cargo Audit

Regularly audit dependencies for known vulnerabilities.

```bash
cargo install cargo-audit
cargo audit
```

### 5.2 Supply Chain Security Practices
- Pin dependencies using `Cargo.lock`.
- Use Dependabot or Renovate.
- Minimize dependencies to reduce the attack surface.

## 6. Denial of Service (DoS) Mitigation

### 6.1 Body Size Limits

Prevent memory exhaustion by limiting request body sizes. Axum handles this gracefully with `DefaultBodyLimit`.

```rust
use axum::extract::DefaultBodyLimit;

let app = axum::Router::new()
    .route("/upload", axum::routing::post(handle_upload))
    // Limit payload to 2MB
    .layer(DefaultBodyLimit::max(1024 * 1024 * 2));
```

### 6.2 Rate Limiting

Implement rate limiting, typically at the reverse proxy layer (Nginx, Traefik, Cloudflare), or using a crate like `governor` at the Axum layer.

## 7. Error Handling Information Leakage

Never expose internal errors (stack traces, SQL errors) to the client.

```rust
use axum::response::{IntoResponse, Response};
use axum::http::StatusCode;

pub enum AppError {
    DatabaseError(sqlx::Error),
    NotFound,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        match self {
            // Log the error internally, but return generic 500 to user
            AppError::DatabaseError(err) => {
                tracing::error!("Database error: {:?}", err);
                (StatusCode::INTERNAL_SERVER_ERROR, "Internal Server Error").into_response()
            }
            AppError::NotFound => {
                (StatusCode::NOT_FOUND, "Resource Not Found").into_response()
            }
        }
    }
}
```

## 8. Diagram: Defense in Depth

```text
[ Attacker ]
     |
     v
+-------------------------------+
|  WAF / Reverse Proxy (HTTPS,  | <-- Rate Limiting, IP Bans
|  Cloudflare, Nginx)           |
+-------------------------------+
     |
     v
+-------------------------------+
|  Rust Axum Server             | <-- TLS (rustls)
|   - Request Routing           | <-- CORS, Security Headers
|   - Payload Limits (2MB)      | <-- DefaultBodyLimit
|   - Auth Middleware (JWT)     | <-- Authentication & Authorization
+-------------------------------+
     |
     v
+-------------------------------+
|  Application Logic            | <-- Argon2 Hashing
|  (Clean Architecture Core)    | <-- Type Safety (No ID manipulation)
+-------------------------------+
     |
     v
+-------------------------------+
|  Database Layer (sqlx)        | <-- Parameterized Queries (No SQLi)
|                               | <-- Least Privilege DB User
+-------------------------------+
```

## 9. Best Practices Checklist
- [ ] Run `cargo audit` in CI/CD.
- [ ] Use `sqlx` prepared statements exclusively.
- [ ] Implement `Argon2` for password hashing.
- [ ] Enforce rigid CORS policies.
- [ ] Mask internal errors in API responses.
- [ ] Configure payload size limits.
