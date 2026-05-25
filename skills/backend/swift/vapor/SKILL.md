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
- Middleware pipeline ordered (auth → logging → error)
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
  ],
  targets: [
    .executableTarget(
      name: "App",
      dependencies: [
        .product(name: "Vapor", package: "vapor"),
        .product(name: "Fluent", package: "fluent"),
        .product(name: "FluentPostgresDriver", package: "fluent-postgres-driver"),
        .product(name: "Leaf", package: "leaf"),
      ]
    ),
    .testTarget(name: "AppTests", dependencies: [.target(name: "App")]),
  ]
)
```

### Step 3: Project Structure
```
Sources/App/
├── configure.swift
├── routes.swift
├── entrypoint.swift
├── Controllers/
│   └── OrderController.swift
├── Models/
│   ├── Order.swift
│   └── OrderItem.swift
├── Migrations/
│   └── CreateOrder.swift
├── Middleware/
│   ├── AuthMiddleware.swift
│   └── ErrorMiddleware.swift
├── DTOs/
│   ├── CreateOrderRequest.swift
│   └── OrderResponse.swift
└── Services/
    └── OrderService.swift
```

### Step 4: Model & Migration
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
      .create()
  }

  func revert(on database: Database) async throws {
    try await database.schema("orders").delete()
  }
}
```

### Step 5: Controller & Routes
```swift
// Controllers/OrderController.swift
struct OrderController: RouteCollection {
  func boot(routes: RoutesBuilder) throws {
    let orders = routes.grouped("api", "orders")
    orders.get(use: list)
    orders.post(use: create)
    orders.group(":id") { order in
      order.get(use: get)
      order.delete(use: delete)
    }
  }

  func list(req: Request) async throws -> [OrderResponse] {
    let orders = try await Order.query(on: req.db).all()
    return orders.map { $0.toResponse() }
  }

  func create(req: Request) async throws -> OrderResponse {
    let dto = try req.content.decode(CreateOrderRequest.self)
    let order = try await orderService.create(dto, db: req.db)
    return order.toResponse()
  }
}

// routes.swift
func registerRoutes(_ app: Application) throws {
  try app.register(collection: OrderController())
}
```

## Rules
- All routes async/await — never use EventLoopFuture directly.
- Fluent migrations for every schema change — never raw SQL.
- Environment configuration via .env — never hardcoded values.
- Middleware order: auth → error → logging.
- Controllers implement RouteCollection — never free-floating route handlers.
- DTOs separate from Models — use toResponse() mapping.

## References

### Reference Files
- `references/vapor-setup.md` — Vapor project setup, configuration, deployment
- `references/vapor-fluent-guide.md` — Fluent ORM models, migrations, queries
- `references/vapor-deployment.md` — Docker, systemd, Nginx, CI/CD, Vapor Cloud
- `references/vapor-testing.md` — XCTVapor, HTTP tests, in-memory DB, WebSocket tests

### Related Skills
- `backend/universal/api-response/SKILL.md` — API response envelope
- `backend/universal/oop-principles/SKILL.md` — SOLID for Swift

## Handoff
Hand off to `backend/universal/api-response/SKILL.md` for API response standards.
