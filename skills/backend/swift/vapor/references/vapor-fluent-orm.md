# Vapor Fluent ORM Reference

## Overview

Comprehensive reference for Vapor's Fluent ORM: model definitions, migrations, relations, query building, transactions, and advanced patterns.

## Table of Contents

1. Model Definition
2. Field Types and Properties
3. Migrations
4. Relations
5. Query Building
6. Transactions
7. Pagination
8. Soft Deletes and Timestamps
9. Enum Support
10. Custom SQL
11. Testing with Fluent
12. Performance Optimization
13. Common Patterns

---

## 1. Model Definition

### Basic Model

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

    @Timestamp(key: "deleted_at", on: .delete)
    var deletedAt: Date?

    init() { }

    init(id: UUID? = nil, customerId: String, status: String, totalAmount: Double) {
        self.id = id
        self.customerId = customerId
        self.status = status
        self.totalAmount = totalAmount
    }
}
```

### Optional Fields

```swift
final class User: Model, Content {
    static let schema = "users"

    @ID(key: .id)
    var id: UUID?

    @Field(key: "email")
    var email: String

    @OptionalField(key: "phone")
    var phone: String?

    @OptionalField(key: "avatar_url")
    var avatarUrl: String?

    @Field(key: "is_active")
    var isActive: Bool

    init() { }
}
```

### Enum Field (String-backed)

```swift
enum OrderStatus: String, Codable, CaseIterable {
    case pending = "pending"
    case confirmed = "confirmed"
    case shipped = "shipped"
    case delivered = "delivered"
    case cancelled = "cancelled"
}

final class Order: Model, Content {
    static let schema = "orders"

    @ID(key: .id)
    var id: UUID?

    @Enum(key: "status")
    var status: OrderStatus

    init() { }
}
```

### Composite Primary Keys

```swift
final class OrderItem: Model, Content {
    static let schema = "order_items"

    @ID(custom: "order_id", generatedBy: .user)
    var orderId: UUID?

    @ID(custom: "product_id", generatedBy: .user)
    var productId: String?

    @Field(key: "quantity")
    var quantity: Int

    init() { }
}
```

---

## 2. Field Types and Properties

### Property Wrappers

| Wrapper | Purpose | Database Type |
|---|---|---|
| `@ID` | Primary key | UUID, Int |
| `@Field` | Required field | Per type |
| `@OptionalField` | Optional field | Nullable |
| `@Enum` | String enum | String |
| `@OptionalEnum` | Optional string enum | Nullable string |
| `@Timestamp` | Date/time field | DateTime |
| `@Parent` | Foreign key relationship | UUID |
| `@OptionalParent` | Optional foreign key | Nullable UUID |
| `@Children` | One-to-many relation | N/A (computed) |
| `@Siblings` | Many-to-many relation | N/A (computed) |
| `@Group` | Embedded fields | N/A |
| `@CompositeID` | Composite primary key | Multiple columns |

### Custom Field Keys

```swift
// Custom ID field name
@ID(custom: "order_uuid", generatedBy: .user)
var id: UUID?

// UUID generation
init() {
    self.id = UUID()
}
```

---

## 3. Migrations

### Basic Migration

```swift
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
    }

    func revert(on database: Database) async throws {
        try await database.schema("orders").delete()
    }
}
```

### Migration with Constraints

```swift
struct CreateUser: AsyncMigration {
    func prepare(on database: Database) async throws {
        try await database.schema("users")
            .id()
            .field("email", .string, .required)
            .unique(on: "email")
            .field("password_hash", .string, .required)
            .field("role", .string, .required, .sql(.default("user")))
            .field("is_active", .bool, .required, .sql(.default(true)))
            .field("created_at", .datetime)
            .field("updated_at", .datetime)
            .create()
    }

    func revert(on database: Database) async throws {
        try await database.schema("users").delete()
    }
}
```

### Foreign Key Constraints

```swift
struct CreateOrderItem: AsyncMigration {
    func prepare(on database: Database) async throws {
        try await database.schema("order_items")
            .id()
            .field("order_id", .uuid, .required,
                .references("orders", "id", onDelete: .cascade))
            .field("product_id", .string, .required)
            .field("quantity", .int, .required)
            .field("unit_price", .double, .required)
            .field("created_at", .datetime)
            .create()
    }

    func revert(on database: Database) async throws {
        try await database.schema("order_items").delete()
    }
}
```

### Migration with Index

```swift
struct AddOrderIndexes: AsyncMigration {
    func prepare(on database: Database) async throws {
        try await database.schema("orders")
            .field("customer_id", .string)
            .update()

        try await database.schema("orders")
            .unique(on: "customer_id", "status")
            .update()
    }

    func revert(on database: Database) async throws {
        try await database.schema("orders")
            .deleteUnique(on: "customer_id", "status")
            .update()
    }
}
```

### Altering Existing Tables

```swift
struct AddCurrencyToOrder: AsyncMigration {
    func prepare(on database: Database) async throws {
        try await database.schema("orders")
            .field("currency", .string, .required, .sql(.default("USD")))
            .update()
    }

    func revert(on database: Database) async throws {
        try await database.schema("orders")
            .deleteField("currency")
            .update()
    }
}
```

### Seeding Data

```swift
struct SeedOrderStatuses: AsyncMigration {
    func prepare(on database: Database) async throws {
        let statuses = ["pending", "confirmed", "shipped", "delivered", "cancelled"]
        for status in statuses {
            try await OrderStatusModel(name: status).save(on: database)
        }
    }

    func revert(on database: Database) async throws {
        try await OrderStatusModel.query(on: database).delete()
    }
}
```

---

## 4. Relations

### One-to-Many (Parent/Children)

```swift
final class Order: Model, Content {
    static let schema = "orders"

    @ID(key: .id)
    var id: UUID?

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

    init() { }
}

// Eager loading
let orders = try await Order.query(on: db)
    .with(\.$items)
    .all()

for order in orders {
    for item in order.items {
        print(item.productId)
    }
}

// Nested eager loading
let orders = try await Order.query(on: db)
    .with(\.$items)
    .with(\.$customer) { customer in
        customer.with(\.$address)
    }
    .all()
```

### Many-to-Many (Siblings)

```swift
final class Product: Model, Content {
    static let schema = "products"

    @ID(key: .id)
    var id: UUID?

    @Siblings(through: OrderProductPivot.self, from: \.$product, to: \.$order)
    var orders: [Order]

    init() { }
}

final class OrderProductPivot: Model, Content {
    static let schema = "order_product"

    @ID(key: .id)
    var id: UUID?

    @Parent(key: "order_id")
    var order: Order

    @Parent(key: "product_id")
    var product: Product

    @Field(key: "quantity")
    var quantity: Int

    init() { }
}

// Query with pivot data
let products = try await product.$orders.query(on: db)
    .with(\.$items) // pivot eager load
    .all()
```

### Custom Relation Keys

```swift
final class Order: Model, Content {
    static let schema = "orders"

    @ID(key: .id)
    var id: UUID?

    @Children(for: \.$order)
    var items: [OrderItem]

    // Custom foreign key field
    @Parent(key: "assigned_to")
    var assignee: User
}
```

---

## 5. Query Building

### Basic Queries

```swift
// All records
let all = try await Order.query(on: db).all()

// First match
let first = try await Order.query(on: db).first()

// Count
let count = try await Order.query(on: db).count()

// Find by ID
if let order = try await Order.find(id, on: db) {
    print(order)
}
```

### Filters

```swift
// Simple equality
let orders = try await Order.query(on: db)
    .filter(\.$status == "confirmed")
    .all()

// Multiple conditions
let orders = try await Order.query(on: db)
    .filter(\.$status == "pending")
    .filter(\.$totalAmount > 100)
    .all()

// OR conditions
let orders = try await Order.query(on: db)
    .group(.or) { group in
        group.filter(\.$status == "pending")
             .filter(\.$status == "confirmed")
    }
    .all()

// IN clause
let orders = try await Order.query(on: db)
    .filter(\.$status ~~ ["pending", "confirmed"])
    .all()

// NOT IN
let orders = try await Order.query(on: db)
    .filter(\.$status !~ ["cancelled", "delivered"])
    .all()

// Range filters
let orders = try await Order.query(on: db)
    .filter(\.$totalAmount >= 50)
    .filter(\.$totalAmount <= 500)
    .all()

// Date range
let recent = try await Order.query(on: db)
    .filter(\.$createdAt >= Date().addingTimeInterval(-86400 * 7))
    .all()

// Substring (case insensitive)
let orders = try await Order.query(on: db)
    .filter(\.$customerId, .contains, "cust")
    .all()

let orders = try await Order.query(on: db)
    .filter(\.$customerId, .custom("ILIKE"), "%CUST%")
    .all()
```

### Sorting

```swift
// Single sort
let sorted = try await Order.query(on: db)
    .sort(\.$createdAt, .descending)
    .all()

// Multiple sorts
let sorted = try await Order.query(on: db)
    .sort(\.$status, .ascending)
    .sort(\.$createdAt, .descending)
    .all()

// Sort by relation field
let sorted = try await Order.query(on: db)
    .join(\.$customer)
    .sort(Customer.self, \.$name, .ascending)
    .all()
```

### Aggregates

```swift
// Sum
let total = try await Order.query(on: db)
    .filter(\.$status == "confirmed")
    .sum(\.$totalAmount)

// Average
let average = try await Order.query(on: db)
    .average(\.$totalAmount)

// Min/Max
let minOrder = try await Order.query(on: db)
    .min(\.$totalAmount)

let maxOrder = try await Order.query(on: db)
    .max(\.$totalAmount)
```

### Raw SQL Queries

```swift
// Raw query with parameters
struct OrderRow: Codable {
    var id: UUID
    var customerId: String
    var totalAmount: Double
}

let rows = try await db.raw("""
    SELECT id, customer_id, total_amount
    FROM orders
    WHERE status = $1 AND total_amount > $2
    ORDER BY created_at DESC
    LIMIT $3
""")
.bind("confirmed")
.bind(100.0)
.bind(20)
.all(decoding: OrderRow.self)

// Raw query with model
let orders = try await db.raw("SELECT * FROM orders WHERE status = 'confirmed'")
    .all(decoding: Order.self)
```

---

## 6. Transactions

### Basic Transaction

```swift
try await db.transaction { transaction in
    let order = Order(customerId: "cust-1", status: "pending", totalAmount: 0)
    try await order.save(on: transaction)

    let item = OrderItem()
    item.orderId = try order.requireID()
    item.productId = "prod-1"
    item.quantity = 2
    item.unitPrice = 19.99
    try await item.save(on: transaction)

    // If any save fails above, all changes are rolled back
}
```

### Transaction with Rollback

```swift
try await db.transaction { transaction in
    let order = Order(customerId: "cust-1", status: "pending", totalAmount: 0)
    try await order.save(on: transaction)

    guard try await inventoryService.checkStock(on: transaction) else {
        // This will trigger the catch block and rollback
        throw Abort(.badRequest, reason: "Insufficient inventory")
    }

    try await order.$items.query(on: transaction).all()
}
```

### Nested Transactions

```swift
// SQLite does not support nested transactions
// PostgreSQL supports savepoints within transactions

try await db.transaction { outer in
    try await outer.transaction { inner in
        // Inner transaction creates a savepoint
        try await performWork(on: inner)
    }
}
```

---

## 7. Pagination

### Manual Pagination

```swift
let page = 1
let perPage = 20

let orders = try await Order.query(on: db)
    .sort(\.$createdAt, .descending)
    .range((page - 1) * perPage..<page * perPage)
    .all()

let total = try await Order.query(on: db).count()
```

### Fluent Pagination (with Page struct)

```swift
struct PaginatedOrders: Content {
    let items: [Order]
    let metadata: PageMetadata
}

struct PageMetadata: Content {
    let page: Int
    let per: Int
    let total: Int
    let pageCount: Int
}

extension Array where Element == Order {
    func paginate(page: Int, perPage: Int, total: Int) -> PaginatedOrders {
        PaginatedOrders(
            items: self,
            metadata: PageMetadata(
                page: page,
                per: perPage,
                total: total,
                pageCount: Int(ceil(Double(total) / Double(perPage)))
            )
        )
    }
}

// Route handler
func list(req: Request) async throws -> PaginatedOrders {
    let page = try req.query.get(Int.self, at: "page") ?? 1
    let perPage = try req.query.get(Int.self, at: "perPage") ?? 20

    let items = try await Order.query(on: req.db)
        .sort(\.$createdAt, .descending)
        .range((page - 1) * perPage..<page * perPage)
        .all()

    let total = try await Order.query(on: req.db).count()

    return items.paginate(page: page, perPage: perPage, total: total)
}
```

---

## 8. Soft Deletes and Timestamps

### Soft Deletable

```swift
final class Order: Model, Content {
    static let schema = "orders"

    @ID(key: .id)
    var id: UUID?

    @Timestamp(key: "deleted_at", on: .delete)
    var deletedAt: Date?

    init() { }
}

// Query without soft-deleted records (default)
let active = try await Order.query(on: db).all()

// Query including soft-deleted
let all = try await Order.query(on: db)
    .withDeleted()
    .all()

// Query only deleted
let deleted = try await Order.query(on: db)
    .onlyDeleted()
    .all()

// Force delete (permanent)
try await order.delete(force: true, on: db)

// Restore deleted
try await order.restore(on: db)
```

### Custom Timestamps

```swift
final class Order: Model, Content {
    static let schema = "orders"

    @Timestamp(key: "ordered_at", on: .create, format: .iso8601)
    var orderedAt: Date?

    @Timestamp(key: "processed_at", on: .none) // Manual management
    var processedAt: Date?

    init() { }
}

// Manual timestamp update
order.processedAt = Date()
try await order.update(on: db)
```

---

## 9. Enum Support

### String Enums

```swift
enum OrderStatus: String, Codable, CaseIterable, ReflectionDecodable {
    case pending = "pending"
    case confirmed = "confirmed"
    case shipped = "shipped"
    case delivered = "delivered"
    case cancelled = "cancelled"

    static func reflectDecoded() -> (Self, Self) {
        (.pending, .cancelled)
    }
}

final class Order: Model, Content {
    static let schema = "orders"

    @Enum(key: "status")
    var status: OrderStatus

    init() { }
}
```

### Migration for Enum

```swift
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

---

## 10. Custom SQL

### Raw SQL with Fluent

```swift
// Execute raw query
let rows = try await db.raw("SELECT NOW() as current_time").all()

// Raw with model decoding
let orders = try await db.raw("""
    SELECT o.*, COUNT(oi.id) as item_count
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    GROUP BY o.id
    HAVING COUNT(oi.id) > 0
""").all(decoding: OrderWithCount.self)
```

### Custom SQL Functions

```swift
// PostgreSQL-specific
let result = try await db.raw("""
    SELECT json_agg(
        json_build_object(
            'id', o.id,
            'customer_id', o.customer_id,
            'items', (SELECT json_agg(oi.*) FROM order_items oi WHERE oi.order_id = o.id)
        )
    )
    FROM orders o
    WHERE o.status = 'confirmed'
""").all()
```

---

## 11. Testing with Fluent

### In-Memory SQLite Testing

```swift
import XCTVapor
@testable import App

final class OrderRepositoryTests: XCTestCase {
    var app: Application!

    override func setUp() async throws {
        app = try await Application.make(.testing)
        app.databases.use(.sqlite(.memory), as: .sqlite)
        try await configure(app)
        try await app.autoMigrate()
    }

    override func tearDown() async throws {
        try await app.autoRevert()
        app.shutdown()
    }

    func testSaveAndFindOrder() async throws {
        try await app.test(.POST, "/api/orders", beforeRequest: { req in
            try req.content.encode(CreateOrderRequest(
                customerId: "cust-1",
                items: [CreateOrderItemRequest(productId: "prod-1", quantity: 2, unitPrice: 19.99)]
            ))
        }, afterResponse: { res in
            XCTAssertEqual(res.status, .created)
            let order = try res.content.decode(OrderResponse.self)
            XCTAssertEqual(order.customerId, "cust-1")
        })
    }

    func testQueryByStatus() async throws {
        // Seed data
        let order1 = Order(customerId: "cust-1", status: "pending", totalAmount: 50)
        let order2 = Order(customerId: "cust-2", status: "confirmed", totalAmount: 100)
        try await order1.save(on: app.db)
        try await order2.save(on: app.db)

        let pending = try await Order.query(on: app.db)
            .filter(\.$status == "pending")
            .all()

        XCTAssertEqual(pending.count, 1)
    }
}
```

### Database Transaction Testing

```swift
func testTransactionRollback() async throws {
    try await app.db.transaction { db in
        let order = Order(customerId: "cust-1", status: "pending", totalAmount: 50)
        try await order.save(on: db)

        // Force an error to test rollback
        throw Abort(.badRequest, reason: "Test rollback")
    }

    // Transaction should have been rolled back
    let count = try await Order.query(on: app.db).count()
    XCTAssertEqual(count, 0)
}
```

---

## 12. Performance Optimization

### Connection Pooling

```swift
// configure.swift
app.databases.use(.postgres(
    hostname: Environment.get("DB_HOST") ?? "localhost",
    port: Environment.get("DB_PORT").flatMap(Int.init) ?? 5432,
    username: Environment.get("DB_USER") ?? "vapor",
    password: Environment.get("DB_PASS") ?? "vapor",
    database: Environment.get("DB_NAME") ?? "orders",
    maxConnectionsPerEventLoop: 2, // Increase for high throughput
    connectionPoolTimeout: .seconds(10)
), as: .psql)
```

### Query Optimization

```swift
// Bad: N+1 queries
let orders = try await Order.query(on: db).all()
for order in orders {
    let items = try await order.$items.query(on: db).all()
}

// Good: Eager loading
let orders = try await Order.query(on: db)
    .with(\.$items)
    .all()

// Use select only needed fields
let ids = try await Order.query(on: db)
    .all(\.$id)

// Batch operations
var orders: [Order] = []
for i in 0..<100 {
    orders.append(Order(customerId: "cust-\(i)", status: "pending", totalAmount: Double(i)))
}
try await orders.create(on: db) // Batch insert
```

### Indexing

```swift
struct AddPerformanceIndexes: AsyncMigration {
    func prepare(on database: Database) async throws {
        try await database.schema("orders")
            .field("customer_id", .string)
            .field("status", .string)
            .field("created_at", .datetime)
            .update()

        // Compound index for common query pattern
        try await database.schema("orders")
            .unique(on: "customer_id", "status")
            .update()

        // Individual indexes
        try await database.schema("orders")
            .index(on: "created_at")
            .update()
    }

    func revert(on database: Database) async throws {
        // Drop indexes
    }
}
```

---

## 13. Common Patterns

### Repository Pattern with Fluent

```swift
protocol OrderRepositoryProtocol {
    func findById(_ id: UUID, db: Database) async throws -> Order?
    func findByCustomer(_ customerId: String, db: Database) async throws -> [Order]
    func save(_ order: Order, db: Database) async throws -> Order
    func delete(_ id: UUID, db: Database) async throws
}

struct OrderRepository: OrderRepositoryProtocol {
    func findById(_ id: UUID, db: Database) async throws -> Order? {
        try await Order.query(on: db)
            .with(\.$items)
            .filter(\.$id == id)
            .first()
    }

    func findByCustomer(_ customerId: String, db: Database) async throws -> [Order] {
        try await Order.query(on: db)
            .with(\.$items)
            .filter(\.$customerId == customerId)
            .sort(\.$createdAt, .descending)
            .all()
    }

    func save(_ order: Order, db: Database) async throws -> Order {
        try await order.save(on: db)
        return order
    }

    func delete(_ id: UUID, db: Database) async throws {
        guard let order = try await Order.find(id, on: db) else {
            throw Abort(.notFound)
        }
        try await order.delete(on: db)
    }
}
```

### Service with Fluent

```swift
struct OrderService {
    let repository: OrderRepositoryProtocol

    func placeOrder(dto: CreateOrderRequest, db: Database) async throws -> Order {
        try await db.transaction { transaction in
            let order = Order(customerId: dto.customerId, status: "pending", totalAmount: 0)
            try await order.save(on: transaction)

            var total: Double = 0
            for itemDto in dto.items {
                let item = OrderItem()
                item.orderId = try order.requireID()
                item.productId = itemDto.productId
                item.quantity = itemDto.quantity
                item.unitPrice = itemDto.unitPrice
                try await item.save(on: transaction)
                total += Double(itemDto.quantity) * itemDto.unitPrice
            }

            order.totalAmount = total
            try await order.update(on: transaction)

            return order
        }
    }
}
```

---

## References

- Fluent Documentation: https://docs.vapor.codes/fluent/overview/
- Fluent GitHub: https://github.com/vapor/fluent
- Fluent Kit GitHub: https://github.com/vapor/fluent-kit
- Database Drivers: https://docs.vapor.codes/fluent/database/
- Advanced Fluent: https://docs.vapor.codes/fluent/advanced/
