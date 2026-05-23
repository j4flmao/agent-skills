# Vapor Fluent ORM Guide

## Model Definition
```swift
import Fluent
import Vapor

final class Order: Model, Content {
  static let schema = "orders"

  @ID(key: .id)
  var id: UUID?

  @Field(key: "customer_id")
  var customerId: String

  @Enum(key: "status")
  var status: OrderStatus

  @Field(key: "total_amount")
  var totalAmount: Double

  @Field(key: "currency")
  var currency: String

  @Timestamp(key: "created_at", on: .create)
  var createdAt: Date?

  @Timestamp(key: "updated_at", on: .update)
  var updatedAt: Date?

  @Children(for: \.$order)
  var items: [OrderItem]

  init() { }
}

enum OrderStatus: String, Codable, CaseIterable {
  case pending, confirmed, shipped, delivered, cancelled
}
```

## Migrations
```swift
struct CreateOrder: AsyncMigration {
  func prepare(on database: Database) async throws {
    try await database.schema("orders")
      .id()
      .field("customer_id", .string, .required)
      .field("status", .string, .required)
      .field("total_amount", .double, .required)
      .field("currency", .string, .required)
      .field("created_at", .datetime)
      .field("updated_at", .datetime)
      .create()
  }

  func revert(on database: Database) async throws {
    try await database.schema("orders").delete()
  }
}

// Register in configure.swift
app.migrations.add(CreateOrder())
try app.autoMigrate().wait()   // auto on startup
```

## Relationships
```swift
// Parent relationship
final class OrderItem: Model, Content {
  static let schema = "order_items"

  @ID(key: .id) var id: UUID?
  @Field(key: "sku") var sku: String
  @Field(key: "quantity") var quantity: Int
  @Field(key: "unit_price") var unitPrice: Double
  @Parent(key: "order_id") var order: Order
}

// Sibling (many-to-many) via pivot
final class ProductCategory: Model {
  static let schema = "product_categories"
  @ID(key: .id) var id: UUID?
  @Parent(key: "product_id") var product: Product
  @Parent(key: "category_id") var category: Category
}
```

## Querying
```swift
// Basic queries
let orders = try await Order.query(on: req.db)
  .filter(\.$status == .pending)
  .filter(\.$totalAmount >= 100)
  .sort(\.$createdAt, .descending)
  .range(0..<20)
  .all()

// Aggregation
let total = try await Order.query(on: req.db)
  .filter(\.$status == .shipped)
  .sum(\.$totalAmount)

// Eager loading
let ordersWithItems = try await Order.query(on: req.db)
  .with(\.$items)
  .all()

// Transaction
try await req.db.transaction { db in
  let order = try await order.save(on: db)
  for item in items {
    try await item.save(on: db)
  }
}
```

## Raw SQL
```swift
let rows = try await req.db.sql().raw("SELECT * FROM orders WHERE status = $1", bind: ["pending"]).all()
```

## DTO Mapping
```swift
struct OrderResponse: Content {
  let id: String
  let customerId: String
  let status: String
  let totalAmount: Double
}

extension Order {
  func toResponse() -> OrderResponse {
    OrderResponse(
      id: id!.uuidString,
      customerId: customerId,
      status: status.rawValue,
      totalAmount: totalAmount
    )
  }
}
```
