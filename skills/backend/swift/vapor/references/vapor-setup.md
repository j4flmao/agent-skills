# Vapor Setup Guide

## Prerequisites
- Swift 5.9+ (Xcode 15+ on macOS)
- macOS: `brew install vapor`
- Linux: `apt install vapor` or build from source

## Project Initialization
```bash
vapor new OrderService --template web
cd OrderService
vapor xcode   # Open Xcode project
```

## Package.swift Dependencies

| Package | Version | Purpose |
|---|---|---|
| `vapor/vapor` | 4.90+ | HTTP server, routing, middleware |
| `vapor/fluent` | 4.9+ | ORM framework |
| `vapor/fluent-postgres-driver` | 2.8+ | PostgreSQL driver |
| `vapor/fluent-mysql-driver` | 2.8+ | MySQL driver |
| `vapor/leaf` | 4.3+ | Template engine |
| `vapor/redis` | 4.6+ | Redis caching |
| `vapor/jwt` | 4.2+ | JWT auth |
| `vapor/apns` | 4.0+ | Apple Push Notifications |

## Environment Configuration
```swift
// configure.swift
// .env file in project root
DATABASE_URL=postgres://user:pass@localhost:5432/orders
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
PORT=8080
```

```swift
// Reading config
let dbUrl = Environment.get("DATABASE_URL") ?? "postgres://localhost:5432/orders"
let port = Environment.get("PORT").flatMap(Int.init) ?? 8080
```

## Configure.swift
```swift
import Vapor
import FluentPostgresDriver
import Leaf

public func configure(_ app: Application) throws {
  // Database
  if let dbUrl = Environment.get("DATABASE_URL") {
    try app.databases.use(.postgres(url: dbUrl), as: .psql)
  } else {
    app.databases.use(.postgres(
      hostname: Environment.get("DB_HOST") ?? "localhost",
      port: Environment.get("DB_PORT").flatMap(Int.init) ?? 5432,
      username: Environment.get("DB_USER") ?? "vapor",
      password: Environment.get("DB_PASS") ?? "",
      database: Environment.get("DB_NAME") ?? "orders"
    ), as: .psql)
  }

  // Migrations
  app.migrations.add(CreateOrder())
  app.migrations.add(CreateUser())

  // Middleware
  app.middleware.use(ErrorMiddleware.default(environment: app.environment))
  app.middleware.use(FileMiddleware(publicDirectory: app.directory.publicDirectory))

  // Routes
  try registerRoutes(app)

  // Leaf (if using templates)
  app.views.use(.leaf)
}
```

## Entrypoint (main.swift)
```swift
import Vapor

var env = try Environment.detect()
try LoggingSystem.bootstrap(from: &env)
let app = Application(env)
defer { app.shutdown() }
try configure(app)
try app.run()
```

## Running
```bash
# Development
vapor run
swift run

# Production
swift run --configuration release

# With environment
DATABASE_URL=postgres://... swift run
```

## Dockerfile
```dockerfile
FROM swift:5.9 as builder
WORKDIR /app
COPY . .
RUN swift build --configuration release

FROM ubuntu:jammy
RUN apt-get update && apt-get install -y libpq5 ca-certificates
COPY --from=builder /app/.build/release/Run /app/Run
EXPOSE 8080
CMD ["/app/Run"]
```
