# Vapor Testing

## Test Setup

```swift
import XCTVapor
@testable import App

final class OrderTests: XCTestCase {
    var app: Application!

    override func setUp() async throws {
        self.app = try await Application.make(.testing)
        try await configure(app)
        try await app.autoMigrate()
    }

    override func tearDown() async throws {
        try await app.autoRevert()
        try await self.app.asyncShutdown()
        self.app = nil
    }
}
```

## HTTP Tests

```swift
func testCreateOrder() throws {
    let payload = """
    {
        "customer_id": "cust-1",
        "items": [{"sku": "SKU-1", "quantity": 2, "price": 50.0}]
    }
    """

    try app.test(.POST, "/api/orders", beforeRequest: { req in
        try req.content.encode(payload)
        req.headers.contentType = .json
    }, afterResponse: { res in
        XCTAssertEqual(res.status, .created)
        let order = try res.content.decode(OrderResponse.self)
        XCTAssertEqual(order.customerId, "cust-1")
        XCTAssertFalse(order.id.isEmpty)
    })
}

func testGetOrderNotFound() throws {
    try app.test(.GET, "/api/orders/non-existent-id") { res in
        XCTAssertEqual(res.status, .notFound)
    }
}

func testListOrdersWithPagination() throws {
    try app.test(.GET, "/api/orders?page=1&per=20") { res in
        XCTAssertEqual(res.status, .ok)
        let page = try res.content.decode(Page<OrderResponse>.self)
        XCTAssertGreaterThanOrEqual(page.items.count, 0)
    }
}
```

## In-Memory Database

```swift
// configure.swift — use .sqlite memory for tests
if app.environment == .testing {
    app.databases.use(.sqlite(.memory), as: .psql)
    app.migrations.add(CreateOrder())
} else {
    app.databases.use(.postgres(url: dbUrl), as: .psql)
}

// Test
func testDatabasePersistence() throws {
    try app.test(.POST, "/api/orders", ...)
    try app.test(.GET, "/api/orders") { res in
        let orders = try res.content.decode([OrderResponse].self)
        XCTAssertEqual(orders.count, 1)
    }
}
```

## Middleware Tests

```swift
func testAuthMiddlewareRejectsUnauthenticated() throws {
    try app.test(.GET, "/api/admin/orders") { res in
        XCTAssertEqual(res.status, .unauthorized)
    }
}

func testAuthMiddlewareAcceptsValidToken() throws {
    let token = generateTestToken()
    try app.test(.GET, "/api/admin/orders", beforeRequest: { req in
        req.headers.bearerAuthorization = .init(token: token)
    }, afterResponse: { res in
        XCTAssertEqual(res.status, .ok)
    })
}
```

## WebSocket Tests

```swift
func testWebSocketOrderUpdate() throws {
    let order = try createTestOrder()

    try app.test(.GET, "/ws/orders/\(order.id)") { req in
        req.webSocket { ws in
            ws.send("subscribe")
            ws.onText { ws, text in
                XCTAssertTrue(text.contains(order.id))
            }
        }
    }
}
```

## Test Helpers

```swift
extension XCTestCase {
    func createTestOrder() throws -> Order {
        let payload = """
        {"customer_id": "test", "items": [{"sku": "T", "quantity": 1, "price": 10.0}]}
        """
        var orderId = ""

        try app.test(.POST, "/api/orders",
            beforeRequest: { try $0.content.encode(payload) },
            afterResponse: { orderId = try $0.content.decode(OrderResponse.self).id }
        )
        return try XCTUnwrap(try? Order.find(.init(orderId), on: app.db).wait())
    }
}
```

## Best Practices

| Practice | Why |
|----------|-----|
| Auto-migrate in setUp | Fresh DB per test |
| Auto-revert in tearDown | Clean isolation |
| In-memory SQLite | Fast, isolated tests |
| Test response status + body | Full contract validation |
| Use test helpers | DRY, maintainable |
| Test error cases | Edge coverage |
