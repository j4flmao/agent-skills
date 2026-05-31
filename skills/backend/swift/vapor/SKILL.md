---
name: vapor-backend
description: >
  Use this skill when building Vapor Swift backend applications — async HTTP server, Fluent ORM, WebSocket support, middleware pipeline. This skill enforces: structured concurrency with async/await, proper route grouping, Fluent migration patterns, environment-based configuration. Do NOT use for: iOS apps, macOS desktop apps, Kitura or Hummingbird projects.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, swift, phase-4]
---

# Vapor Backend

## Purpose
Define Vapor backend application architecture: async routes, Fluent ORM, middleware pipeline, and Swift Package Manager project structure.

## Agent Protocol

### Trigger
User request includes: `vapor`, `vapor backend`, `vapor swift`, `fluent`, `vapor async`, `swift server`, `vapor route`, `vapor middleware`, `vapor websocket`.

### Input Context
- Swift version (5.9+)
- Vapor version (4.x)
- Database driver (Fluent — PostgreSQL, MySQL, SQLite, MongoDB)
- Hosting (Vapor Cloud, Docker, bare metal)
- Features (REST, WebSocket, APNs, Leaf templates)

### Output Artifact
A markdown document containing:
- Project structure (SPM layout)
- Route registration conventions
- Controller pattern
- Fluent model and migration setup
- Middleware pipeline ordering
- Environment-based configuration
- Testing (XCTest, XCTVapor)
- WebSocket endpoint setup

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging. Compress output.

### Completion Criteria
- SPM Package.swift correctly declares dependencies
- Routes registered with route groups
- Fluent models with proper migrations
- Middleware pipeline ordered (auth -> logging -> error)
- Environment configuration via .env files
- Tests cover request lifecycle

### Max Response Length
4096 tokens

## Workflow

### Step 1: Project Setup
```bash
# Install Vapor toolbox
brew install vapor

# Create project
vapor new OrderService --template web

# Or manually
mkdir OrderService && cd OrderService
swift package init --type executable

# Add Vapor and Fluent
swift package add https://github.com/vapor/vapor
swift package add https://github.com/vapor/fluent
swift package add https://github.com/vapor/fluent-postgres-driver
```

### Step 2: Package.swift
```swift
// swift-tools-version:5.9
import PackageDescription

let package = Package(
  name: "OrderService",
  platforms: [.macOS(.v13)],
  dependencies: [
    .package(url: "https://github.com/vapor/vapor", from: "4.90.0"),
    .package(url: "https://github.com/vapor/fluent", from: "4.9.0"),
    .package(url: "https://github.com/vapor/fluent-postgres-driver", from: "2.8.0"),
    .package(url: "https://github.com/vapor/leaf", from: "4.3.0"),
    .package(url: "https://github.com/vapor/jwt", from: "4.3.0"),
  ],
  targets: [
    .executableTarget(
      name: "App",
      dependencies: [
        .product(name: "Vapor", package: "vapor"),
        .product(name: "Fluent", package: "fluent"),
        .product(name: "FluentPostgresDriver", package: "fluent-postgres-driver"),
        .product(name: "Leaf", package: "leaf"),
        .product(name: "JWT", package: "jwt"),
      ]
    ),
    .testTarget(name: "AppTests", dependencies: [.target(name: "App")]),
  ]
)
```

### Step 3: Project Structure
```
Sources/App/
+-- configure.swift
+-- routes.swift
+-- entrypoint.swift
+-- Controllers/
|   +-- OrderController.swift
|   +-- AuthController.swift
+-- Models/
|   +-- Order.swift
|   +-- OrderItem.swift
|   +-- User.swift
+-- Migrations/
|   +-- CreateOrder.swift
|   +-- CreateUser.swift
+-- Middleware/
|   +-- AuthMiddleware.swift
|   +-- ErrorMiddleware.swift
|   +-- RequestLoggingMiddleware.swift
+-- DTOs/
|   +-- CreateOrderRequest.swift
|   +-- OrderResponse.swift
|   +-- LoginRequest.swift
|   +-- TokenResponse.swift
+-- Services/
|   +-- OrderService.swift
|   +-- AuthService.swift
+-- Config/
    +-- EnvironmentConfig.swift
Tests/
+-- AppTests/
    +-- OrderControllerTests.swift
    +-- OrderServiceTests.swift
```

### Step 4: Model and Migration
```swift
import Fluent
import Vapor

final class Order: Model, Content {
  static let schema = "orders"

  @ID(key: .id)
  var id: UUID?

  @Field(key: "customer_id")
  var customerId: String

  @Field(key: "status")
  var status: String

  @Field(key: "total_amount")
  var totalAmount: Double

  @Timestamp(key: "created_at", on: .create)
  var createdAt: Date?

  @Timestamp(key: "updated_at", on: .update)
  var updatedAt: Date?

  @Children(for: \.$order)
  var items: [OrderItem]

  init() { }
}

final class OrderItem: Model, Content {
  static let schema = "order_items"

  @ID(key: .id)
  var id: UUID?

  @Parent(key: "order_id")
  var order: Order

  @Field(key: "product_id")
  var productId: String

  @Field(key: "quantity")
  var quantity: Int

  @Field(key: "unit_price")
  var unitPrice: Double

  init() { }
}

struct CreateOrder: AsyncMigration {
  func prepare(on database: Database) async throws {
    try await database.schema("orders")
      .id()
      .field("customer_id", .string, .required)
      .field("status", .string, .required)
      .field("total_amount", .double, .required)
      .field("created_at", .datetime)
      .field("updated_at", .datetime)
      .create()

    try await database.schema("order_items")
      .id()
      .field("order_id", .uuid, .required, .references("orders", "id", onDelete: .cascade))
      .field("product_id", .string, .required)
      .field("quantity", .int, .required)
      .field("unit_price", .double, .required)
      .create()
  }

  func revert(on database: Database) async throws {
    try await database.schema("order_items").delete()
    try await database.schema("orders").delete()
  }
}
```

### Step 5: DTO Mapping
```swift
// DTOs/CreateOrderRequest.swift
import Vapor

struct CreateOrderRequest: Content {
  let customerId: String
  let items: [CreateOrderItemRequest]
}

struct CreateOrderItemRequest: Content {
  let productId: String
  let quantity: Int
  let unitPrice: Double
}

// DTOs/OrderResponse.swift
import Vapor

struct OrderResponse: Content {
  let id: String
  let customerId: String
  let status: String
  let totalAmount: Double
  let items: [OrderItemResponse]
  let createdAt: String
}

struct OrderItemResponse: Content {
  let id: String
  let productId: String
  let quantity: Int
  let unitPrice: Double
}

// Model extension for mapping
extension Order {
  func toResponse() -> OrderResponse {
    OrderResponse(
      id: id?.uuidString ?? "",
      customerId: customerId,
      status: status,
      totalAmount: totalAmount,
      items: items.map { $0.toResponse() },
      createdAt: createdAt?.ISO8601Format() ?? ""
    )
  }
}

extension OrderItem {
  func toResponse() -> OrderItemResponse {
    OrderItemResponse(
      id: id?.uuidString ?? "",
      productId: productId,
      quantity: quantity,
      unitPrice: unitPrice
    )
  }
}
```

### Step 6: Controller and RouteCollection
```swift
// Controllers/OrderController.swift
import Vapor

final class OrderController: RouteCollection {
  private let orderService: OrderService

  init(orderService: OrderService = OrderService()) {
    self.orderService = orderService
  }

  func boot(routes: RoutesBuilder) throws {
    let orders = routes.grouped("api", "orders")
    orders.get(use: list)
    orders.post(use: create)
    orders.group(":id") { order in
      order.get(use: get)
      order.put(use: update)
      order.delete(use: delete)
    }
  }

  func list(req: Request) async throws -> [OrderResponse] {
    let orders = try await orderService.findAll(db: req.db)
    return orders.map { $0.toResponse() }
  }

  func create(req: Request) async throws -> OrderResponse {
    let dto = try req.content.decode(CreateOrderRequest.self)
    let order = try await orderService.create(dto: dto, db: req.db)
    return order.toResponse()
  }

  func get(req: Request) async throws -> OrderResponse {
    let id = try req.parameters.require("id", as: UUID.self)
    let order = try await orderService.findById(id, db: req.db)
    return order.toResponse()
  }

  func update(req: Request) async throws -> OrderResponse {
    let id = try req.parameters.require("id", as: UUID.self)
    let dto = try req.content.decode(CreateOrderRequest.self)
    let order = try await orderService.update(id: id, dto: dto, db: req.db)
    return order.toResponse()
  }

  func delete(req: Request) async throws -> HTTPStatus {
    let id = try req.parameters.require("id", as: UUID.self)
    try await orderService.delete(id: id, db: req.db)
    return .noContent
  }
}
```

### Step 7: Service Layer
```swift
// Services/OrderService.swift
import Vapor
import Fluent

final class OrderService {
  func findAll(db: Database) async throws -> [Order] {
    try await Order.query(on: db)
      .with(\.$items)
      .all()
  }

  func findById(_ id: UUID, db: Database) async throws -> Order {
    guard let order = try await Order.query(on: db)
      .with(\.$items)
      .filter(\.$id == id)
      .first() else {
      throw Abort(.notFound, reason: "Order \(id) not found")
    }
    return order
  }

  func create(dto: CreateOrderRequest, db: Database) async throws -> Order {
    let order = Order()
    order.customerId = dto.customerId
    order.status = "pending"
    order.totalAmount = dto.items.reduce(0) { $0 + Double($1.quantity) * $1.unitPrice }

    try await db.transaction { transaction in
      try await order.save(on: transaction)
      for itemDto in dto.items {
        let item = OrderItem()
        item.orderId = try order.requireID()
        item.productId = itemDto.productId
        item.quantity = itemDto.quantity
        item.unitPrice = itemDto.unitPrice
        try await item.save(on: transaction)
      }
    }

    return order
  }

  func delete(id: UUID, db: Database) async throws {
    guard let order = try await Order.find(id, on: db) else {
      throw Abort(.notFound, reason: "Order \(id) not found")
    }
    try await order.delete(on: db)
  }
}
```

### Step 8: Middleware Pipeline
```swift
// configure.swift
public func configure(_ app: Application) async throws {
  // Database
  app.databases.use(.postgres(
    hostname: Environment.get("DB_HOST") ?? "localhost",
    port: Environment.get("DB_PORT").flatMap(Int.init) ?? 5432,
    username: Environment.get("DB_USER") ?? "vapor",
    password: Environment.get("DB_PASS") ?? "vapor",
    database: Environment.get("DB_NAME") ?? "orders"
  ), as: .psql)

  // Migrations
  app.migrations.add(CreateOrder())
  app.migrations.add(CreateUser())
  try await app.autoMigrate()

  // Middleware order: auth -> error -> logging
  app.middleware.use(AuthMiddleware())
  app.middleware.use(ErrorMiddleware.default(environment: app.environment))
  app.middleware.use(RequestLoggingMiddleware())

  // JWT
  guard let jwtSecret = Environment.get("JWT_SECRET") else {
    fatalError("JWT_SECRET environment variable required")
  }
  await app.jwt.keys.add(hmac: .init(stringLiteral: jwtSecret), digestAlgorithm: .sha256)

  // Routes
  try registerRoutes(app)
}
```

### Step 9: WebSocket Endpoint
```swift
// routes.swift
func registerRoutes(_ app: Application) throws {
  try app.register(collection: OrderController())
  try app.register(collection: AuthController())

  // WebSocket
  app.webSocket("ws", "orders", ":id", "status") { req, ws in
    let id = try req.parameters.require("id", as: UUID.self)
    ws.onText { ws, text in
      app.logger.info("Received: \(text)")
    }
    ws.onClose.whenComplete { _ in
      app.logger.info("WebSocket closed for order \(id)")
    }
  }
}
```

### Step 10: Testing
```swift
import XCTVapor
@testable import App

final class OrderControllerTests: XCTestCase {
  var app: Application!

  override func setUp() async throws {
    app = try await Application.make(.testing)
    try await configure(app)
    try await app.autoMigrate()
  }

  override func tearDown() async throws {
    try await app.autoRevert()
    app.shutdown()
  }

  func testCreateOrder() async throws {
    try await app.test(.POST, "/api/orders", beforeRequest: { req in
      try req.content.encode(CreateOrderRequest(
        customerId: "cust-1",
        items: [
          CreateOrderItemRequest(productId: "prod-1", quantity: 2, unitPrice: 19.99)
        ]
      ))
    }, afterResponse: { res in
      XCTAssertEqual(res.status, .created)
      let order = try res.content.decode(OrderResponse.self)
      XCTAssertEqual(order.customerId, "cust-1")
      XCTAssertEqual(order.totalAmount, 39.98)
    })
  }

  func testGetNonExistentOrder() async throws {
    let id = UUID()
    try await app.test(.GET, "/api/orders/\(id.uuidString)", afterResponse: { res in
      XCTAssertEqual(res.status, .notFound)
    })
  }
}
```

## Architecture Decision Trees

### Database Selection
```
Need production-grade relational DB?
  +-- Yes -> PostgreSQL (FluentPostgresDriver)
  +-- No  -> Need embedded/simple?
      +-- Yes -> SQLite (FluentSQLiteDriver)
      +-- No  -> MySQL or MongoDB
```

### Project Structure
```
Multiple aggregate roots?
  +-- Yes -> One controller per aggregate, grouped by feature
  +-- No  -> Single controller, clear method separation
```

### Auth Strategy
```
First-party mobile/web app?
  +-- Yes -> JWT with refresh tokens, JWKS for public keys
  +-- No  -> OAuth2 with third-party provider, session tokens
```

## Common Pitfalls

1. **Forgetting `async/await` on Fluent queries**: Vapor 4 uses async/await. Calling synchronous methods on database operations crashes at runtime.

2. **Not using `@Timestamp` for date fields**: Manually managing `createdAt`/`updatedAt` leads to inconsistent timestamps. Use `@Timestamp` with appropriate triggers.

3. **Abort without custom error code**: Using generic `Abort(.badRequest)` without a reason string makes debugging impossible. Always include `reason:` parameter.

4. **N+1 queries on relations**: Accessing `$order.items` without eager loading results in N+1. Use `with(\.$items)` in queries.

5. **Hardcoded environment values**: Database URLs, API keys, JWT secrets must come from environment variables. Use `Environment.get()`.

6. **Missing migration for schema changes**: Adding fields to a model without a corresponding migration causes runtime crashes.

7. **Blocking the event loop**: Using synchronous APIs (URLSession.shared, FileManager) on the Vapor event loop. Wrap in `req.eventLoop.submit {}` or use async APIs.

8. **Not closing database connections in tests**: Tests leak connections unless `autoRevert()` is called in `tearDown`.

9. **DTOs coupled to models**: Using `@Field` properties directly in responses. Always map to dedicated response DTOs.

10. **Missing `Sendable` conformance**: Vapor 4.90+ enforces Sendable for concurrent access. Mark controllers and services as `Sendable` when needed.

## Best Practices

1. **Use `RouteCollection` protocol** for all controllers. Provides clean separation and testability.

2. **DTO layer between HTTP and domain models**. Request DTOs for input, Response DTOs for output. Never expose model internals.

3. **Transaction wrapping for multi-table writes**. Use `db.transaction {}` to ensure atomicity.

4. **Environment-specific configuration files**. `.env.development`, `.env.production`, `.env.testing` with `.env` as default.

5. **Structured logging with metadata**. Use `req.logger` instead of `app.logger` to attach request context.

6. **Migration idempotency**. Write migrations that can be run multiple times safely. Use `.update()` instead of `.delete().create()` where possible.

7. **Proper error mapping**. Map domain errors to HTTP status codes in middleware. Never leak internal error details.

8. **Use `@OptionalField`** for nullable model properties instead of wrapping in `Optional`.

## Compared With

| Feature | Vapor | Hummingbird | Kitura |
|---|---|---|---|
| Async support | async/await | async/await | Callbacks |
| ORM | Fluent | None (raw SQL) | SwiftKuery |
| Template engine | Leaf | None | Stencil |
| WebSocket | Built-in | Via plugin | Built-in |
| Community size | Large | Small | Deprecated |
| macOS deployment | First-class | First-class | First-class |
| Linux support | Full | Full | Full |
| Learning curve | Moderate | Steep | Moderate |

## Performance

- Vapor 4 achieves ~80k req/s on modern hardware with PostgreSQL (simple queries).
- Connection pooling: Configure `maxConnectionsPerEventLoop` (default 2). Increase for high-throughput workloads.
- Keep-alive reduces latency by 40% for repeated requests.
- Leaf template caching in production: set `app.leaf.cache = .enabled`.
- Database indexing on frequently queried columns: `customer_id`, `status`, `created_at`.
- Use `req.eventLoop.submit {}` for CPU-intensive computations to avoid blocking.

## Tooling

| Tool | Purpose |
|---|---|
| **Vapor Toolbox** | CLI for project creation, Xcode integration |
| **XCTVapor** | HTTP testing framework |
| **Leaf** | Server-side template engine |
| **AsyncHTTPClient** | HTTP client for service-to-service calls |
| **JWT** | JWT signing and verification |
| **APNS** | Apple Push Notification service |
| **Queues** | Background job processing (Redis, DB) |
| **Redis** | Caching and session storage |
| **Docker** | Containerized deployment |
| **SwiftLint** | Code style enforcement |
| **swift-format** | Code formatting |

## Rules

- All routes async/await — never use EventLoopFuture directly.
- Fluent migrations for every schema change — never raw SQL.
- Environment configuration via .env — never hardcoded values.
- Middleware order: auth -> error -> logging.
- Controllers implement RouteCollection — never free-floating route handlers.
- DTOs separate from Models — use toResponse() mapping.
- Database access via service layer — never in controllers directly.
- Generic Abort calls include a descriptive reason string.
- Tests use in-memory SQLite database for speed.
- Relations eager-loaded with `with()` to avoid N+1.
- `@Timestamp` for all date fields, never manual Date initialization.
- Jobs and async processing via Queues library, not in request handlers.
- Sendable conformance for types shared across concurrent boundaries.
- Fail fast at startup for missing required environment variables.

## References
  - references/vapor-fluent-orm.md — Vapor Fluent ORM Reference
  - references/vapor-async-http.md — Vapor Async HTTP Reference
  - references/vapor-deployment.md — Vapor Deployment
  - references/vapor-fluent-guide.md — Vapor Fluent ORM Guide
  - references/vapor-middleware.md — Vapor Middleware Reference
  - references/vapor-security.md — Vapor Security Reference
  - references/vapor-setup.md — Vapor Setup Guide
  - references/vapor-testing.md — Vapor Testing

## Handoff
Hand off to `backend/universal/api-response/SKILL.md` for API response standards.
