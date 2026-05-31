# Vapor Async HTTP Reference

## Overview

Comprehensive reference for Vapor's async HTTP layer: routing, middleware, controllers, WebSocket, client, and testing.

## Table of Contents

1. Application Lifecycle
2. Routing
3. Route Parameters
4. Request and Response
5. Content Negotiation
6. Middleware
7. Controller Pattern
8. WebSocket
9. HTTP Client
10. File Handling
11. Error Handling
12. Testing HTTP
13. Performance Tuning
14. Common Patterns

---

## 1. Application Lifecycle

### Entry Point

```swift
// entrypoint.swift
import Vapor
import Logging

@main
enum Entrypoint {
    static func main() async throws {
        var env = try Environment.detect()
        try LoggingSystem.bootstrap(from: &env)

        let app = try await Application.make(env)
        defer { app.shutdown() }

        try await configure(app)
        try await app.execute()
    }
}
```

### Configuration

```swift
// configure.swift
public func configure(_ app: Application) async throws {
    // Server configuration
    app.http.server.configuration.hostname = "0.0.0.0"
    app.http.server.configuration.port = 8080
    app.http.server.configuration.requestDecompression = .enabled
    app.http.server.configuration.responseCompression = .enabled
    app.http.server.configuration.supportVersions = [.one, .two] // HTTP/1.1 and HTTP/2

    // Request body size limit
    app.routes.defaultMaxBodySize = "1mb"

    // Trust proxy for correct IP behind reverse proxy
    app.http.server.configuration.proxy = .trust(
        Environment.get("TRUSTED_PROXY").map { [$0] } ?? []
    )

    try routes(app)
}
```

### Application Environments

```swift
// Environment detection
app.environment == .development
app.environment == .testing
app.environment == .production

// Custom environment
let staging = Environment(name: "staging", command: "staging")
app.environment = staging

// Environment variable access
let dbURL = Environment.get("DATABASE_URL") ?? "localhost"
let port = Environment.get("PORT").flatMap(Int.init) ?? 8080
```

---

## 2. Routing

### Basic Routes

```swift
// GET request
app.get("hello") { req -> String in
    return "Hello, World!"
}

// POST request
app.post("api", "orders") { req -> HTTPStatus in
    return .ok
}

// With HTTP method
app.on(.PUT, "api", "orders", ":id") { req -> HTTPStatus in
    return .noContent
}
```

### Route Groups

```swift
// Path-based grouping
let api = app.grouped("api", "v1")
api.get("orders") { req in ... }
api.post("orders") { req in ... }

// Middleware-based grouping
let authGroup = api.grouped(AuthMiddleware())
authGroup.get("profile") { req in ... }

// Combined
let v1Auth = app.grouped("api", "v1").grouped(AuthMiddleware())
v1Auth.get("orders") { req in ... }
```

### Route Collection (Controller)

```swift
// Controllers/OrderController.swift
struct OrderController: RouteCollection {
    func boot(routes: RoutesBuilder) throws {
        let orders = routes.grouped("api", "orders")
        orders.get(use: list)
        orders.post(use: create)
        orders.group(":id") { order in
            order.get(use: getById)
            order.put(use: update)
            order.delete(use: delete)
        }
        orders.post(":id", "cancel", use: cancel)
    }

    func list(req: Request) async throws -> [OrderResponse] { ... }
    func create(req: Request) async throws -> OrderResponse { ... }
    func getById(req: Request) async throws -> OrderResponse { ... }
    func update(req: Request) async throws -> OrderResponse { ... }
    func delete(req: Request) async throws -> HTTPStatus { ... }
    func cancel(req: Request) async throws -> OrderResponse { ... }
}

// routes.swift
func registerRoutes(_ app: Application) throws {
    try app.register(collection: OrderController())
    try app.register(collection: AuthController())
}
```

### Route Parameters

```swift
// Path parameters
app.get("orders", ":id") { req -> String in
    let id = req.parameters.get("id")!
    return "Order \(id)"
}

// Type-safe path parameters
app.get("orders", ":id") { req -> String in
    guard let id = req.parameters.get("id", as: UUID.self) else {
        throw Abort(.badRequest, reason: "Invalid order ID")
    }
    return "Order \(id.uuidString)"
}

// Multiple parameters
app.get("orders", ":orderId", "items", ":itemId") { req -> String in
    let orderId = req.parameters.get("orderId")!
    let itemId = req.parameters.get("itemId")!
    return "Order: \(orderId), Item: \(itemId)"
}
```

### Query Parameters

```swift
// Simple query parameter
app.get("orders") { req -> String in
    let page = req.query[Int.self, at: "page"] ?? 1
    return "Page \(page)"
}

// Decodable query
struct ListQuery: Content {
    var page: Int?
    var perPage: Int?
    var status: String?
    var sortBy: String?
    var sortOrder: String?
}

app.get("orders") { req -> [OrderResponse] in
    let query = try req.query.decode(ListQuery.self)
    // Use query parameters
    return []
}

// Query parameter validation
app.get("orders") { req -> String in
    let page = try req.query.get(Int.self, at: "page")
    return "Page \(page)"
}
```

---

## 3. Route Parameters and Validation

### Parameter Validation

```swift
app.get("orders", ":id") { req -> OrderResponse in
    guard let id = req.parameters.get("id", as: UUID.self) else {
        throw Abort(.badRequest, reason: "Invalid UUID format for order ID")
    }
    // ...
}
```

### Request Body Validation

```swift
// Manual validation
app.post("orders") { req -> HTTPStatus in
    let data = try req.content.decode(CreateOrderRequest.self)

    guard !data.customerId.isEmpty else {
        throw Abort(.badRequest, reason: "Customer ID is required")
    }
    guard data.items.count >= 1 else {
        throw Abort(.badRequest, reason: "At least one item is required")
    }

    return .ok
}

// Using ValidationKit (if available)
import VaporValidation

struct CreateOrderRequest: Validatable, Content {
    let customerId: String
    let items: [CreateOrderItemRequest]

    static func validations(_ validations: inout Validations) {
        validations.add("customerId", as: String.self, is: !.empty)
        validations.add("items", as: [CreateOrderItemRequest].self, is: .count(1...))
    }
}
```

---

## 4. Request and Response

### Request Object

```swift
// Request properties
req.method       // HTTP method
req.url          // URL
req.headers      // HTTP headers
req.body         // Body (ByteBuffer)
req.remoteAddress // Client IP
req.logger       // Request-scoped logger

// Headers
let contentType = req.headers.contentType
let authHeader = req.headers[.authorization].first
let customHeader = req.headers["X-Custom-Header"].first

// Body handling
let raw = req.body.data  // Raw ByteBuffer
let string = req.body.string  // String
let json = try req.content.decode(MyType.self)  // Decodable
```

### Response Object

```swift
// Simple response
return "Hello"  // Text
return 123      // Integer
return true     // Boolean
return ["key": "value"]  // Dictionary (auto JSON)

// Typed response
return OrderResponse(id: "123", ...)
return [order1, order2]

// Custom status
return Response(status: .created, body: ...)
return Response(status: .noContent)

// Response with headers
let response = Response(status: .ok)
response.headers.contentType = .json
response.headers.add(name: "X-Custom", value: "value")
response.body = .init(string: "{\"key\":\"value\"}")
return response

// Redirect
return req.redirect(to: "/new-url")
return req.redirect(to: "/new-url", type: .permanent)

// Streaming response
return req.fileio.streamFile(at: "/path/to/file")
```

### Custom Response Encoding

```swift
// Custom response wrapper
struct ApiResponse<T: Content>: Content {
    let success: Bool
    let data: T?
    let error: String?

    static func success(_ data: T) -> ApiResponse {
        ApiResponse(success: true, data: data, error: nil)
    }

    static func error(_ message: String) -> ApiResponse {
        ApiResponse(success: false, data: nil, error: message)
    }
}

// Usage in controller
func list(req: Request) async throws -> ApiResponse<[OrderResponse]> {
    let orders = try await orderService.findAll(db: req.db)
    return ApiResponse.success(orders.map { $0.toResponse() })
}
```

---

## 5. Content Negotiation

### JSON Encoding/Decoding

```swift
// configure.swift
app.routes.defaultContentType = .json

// Custom JSON encoder
let encoder = JSONEncoder()
encoder.keyEncodingStrategy = .convertToSnakeCase
encoder.dateEncodingStrategy = .iso8601

let decoder = JSONDecoder()
decoder.keyDecodingStrategy = .convertFromSnakeCase
decoder.dateDecodingStrategy = .iso8601

app.content.configuration = .init(
    globalEncoder: encoder,
    globalDecoder: decoder
)

// Per-route encoding
app.get("orders") { req -> OrderResponse in
    let response = try await orderService.findAll(db: req.db)
    return response
}
// Content type negotiated based on Accept header
```

### Custom Content Types

```swift
// XML content type
struct XMLEncoder: ContentEncoder {
    func encode<E: Encodable>(_ encodable: E, to body: inout ByteBuffer, headers: inout HTTPHeaders) throws {
        // XML serialization
    }
}

app.content.encoder["application/xml"] = XMLEncoder()

// Custom response
return Response(
    status: .ok,
    headers: ["Content-Type": "application/xml"],
    body: .init(string: "<order><id>123</id></order>")
)
```

---

## 6. Middleware

### Built-in Middleware

```swift
// configure.swift
app.middleware.use(FileMiddleware(publicDirectory: app.directory.publicDirectory))
app.middleware.use(ErrorMiddleware.default(environment: app.environment))
app.middleware.use(CORSConfiguration())
app.middleware.use(SessionsMiddleware(session: app.sessions.driver))
```

### Custom Middleware

```swift
// Middleware/AuthMiddleware.swift
struct AuthMiddleware: AsyncMiddleware {
    func respond(to request: Request, chainingTo next: AsyncResponder) async throws -> Response {
        // Before handler
        let authHeader = request.headers[.authorization].first
        guard let token = authHeader?.replacingOccurrences(of: "Bearer ", with: "") else {
            throw Abort(.unauthorized, reason: "Missing auth token")
        }

        // Verify token and attach user to request
        let payload = try await verifyToken(token)
        request.storage[UserKey.self] = payload

        // Chain to next handler
        let response = try await next.respond(to: request)

        // After handler (add security headers)
        response.headers.add(name: "X-Request-ID", value: request.id)
        return response
    }
}

// Middleware/RequestLoggingMiddleware.swift
struct RequestLoggingMiddleware: AsyncMiddleware {
    func respond(to request: Request, chainingTo next: AsyncResponder) async throws -> Response {
        let start = Date()

        request.logger.info("\(request.method) \(request.url.path)")

        let response = try await next.respond(to: request)

        let duration = Date().timeIntervalSince(start) * 1000
        request.logger.info("\(request.method) \(request.url.path) -> \(response.status.code) (\(String(format: "%.1f", duration))ms)")

        return response
    }
}
```

### Route-Specific Middleware

```swift
// Apply to specific route group
let protected = app.grouped(AuthMiddleware())
protected.get("profile") { req in ... }

// Apply to single route
app.get("admin", "dashboard") { req in ... }
    .middleware(AdminMiddleware())
```

---

## 7. Controller Pattern

### Basic Controller

```swift
final class OrderController: RouteCollection {
    private let orderService: OrderService

    init(orderService: OrderService = OrderService()) {
        self.orderService = orderService
    }

    func boot(routes: RoutesBuilder) throws {
        let orders = routes.grouped("api", "orders")
        let protected = orders.grouped(AuthMiddleware())

        protected.get(use: list)
        protected.post(use: create)
        protected.group(":id") { order in
            order.get(use: getById)
            order.put(use: update)
            order.delete(use: delete)
        }
        protected.post(":id", "cancel", use: cancel)
    }

    func list(req: Request) async throws -> [OrderResponse] {
        let page = try req.query.get(Int.self, at: "page") ?? 1
        let perPage = try req.query.get(Int.self, at: "perPage") ?? 20
        let orders = try await orderService.findAll(page: page, perPage: perPage, db: req.db)
        return orders.map { $0.toResponse() }
    }

    func getById(req: Request) async throws -> OrderResponse {
        guard let id = req.parameters.get("id", as: UUID.self) else {
            throw Abort(.badRequest, reason: "Invalid ID")
        }
        let order = try await orderService.findById(id, db: req.db)
        return order.toResponse()
    }

    func create(req: Request) async throws -> OrderResponse {
        let dto = try req.content.decode(CreateOrderRequest.self)
        let order = try await orderService.create(dto: dto, db: req.db)
        return order.toResponse()
    }

    func update(req: Request) async throws -> OrderResponse {
        guard let id = req.parameters.get("id", as: UUID.self) else {
            throw Abort(.badRequest, reason: "Invalid ID")
        }
        let dto = try req.content.decode(CreateOrderRequest.self)
        let order = try await orderService.update(id: id, dto: dto, db: req.db)
        return order.toResponse()
    }

    func delete(req: Request) async throws -> HTTPStatus {
        guard let id = req.parameters.get("id", as: UUID.self) else {
            throw Abort(.badRequest, reason: "Invalid ID")
        }
        try await orderService.delete(id: id, db: req.db)
        return .noContent
    }

    func cancel(req: Request) async throws -> OrderResponse {
        guard let id = req.parameters.get("id", as: UUID.self) else {
            throw Abort(.badRequest, reason: "Invalid ID")
        }
        let order = try await orderService.cancel(id: id, db: req.db)
        return order.toResponse()
    }
}
```

---

## 8. WebSocket

### Basic WebSocket

```swift
// routes.swift
app.webSocket("ws", "orders", ":id", "status") { req, ws in
    guard let id = req.parameters.get("id", as: UUID.self) else {
        ws.close(code: .unacceptableData)
        return
    }

    ws.onText { ws, text in
        ws.send("Echo: \(text)")
    }

    ws.onBinary { ws, data in
        // Handle binary data
    }

    ws.onPing { ws in
        ws.sendPong()
    }

    ws.onClose.whenComplete { result in
        switch result {
        case .success:
            req.logger.info("WebSocket closed for order \(id)")
        case .failure(let error):
            req.logger.error("WebSocket error for order \(id): \(error)")
        }
    }
}
```

### WebSocket with Model

```swift
// WebSocket controller
final class OrderWebSocketHandler {
    private var connections: [UUID: [WebSocket]] = [:]
    private let lock = Lock()

    func onOpen(req: Request, ws: WebSocket) async throws {
        guard let orderId = req.parameters.get("id", as: UUID.self) else {
            ws.close(code: .unacceptableData)
            return
        }

        lock.withLock {
            connections[orderId, default: []].append(ws)
        }

        ws.onClose.whenComplete { [weak self] _ in
            self?.lock.withLock {
                self?.connections[orderId]?.removeAll { $0 === ws }
                if self?.connections[orderId]?.isEmpty == true {
                    self?.connections.removeValue(forKey: orderId)
                }
            }
        }

        // Send initial status
        if let order = try await Order.find(orderId, on: req.db) {
            ws.send(try JSONEncoder().encode(order.statusUpdate()))
        }
    }

    func broadcastStatus(orderId: UUID, status: OrderStatus) {
        let message = try? JSONEncoder().encode(["type": "status_update", "status": status.rawValue])
        lock.withLock {
            connections[orderId]?.forEach { ws in
                ws.send(message ?? Data())
            }
        }
    }
}
```

---

## 9. HTTP Client

### Basic Client Request

```swift
// Make HTTP request
let response = try await req.client.get("https://api.example.com/orders")

// With query parameters
var query = URLQuery()
query.items = [URLQueryItem(name: "page", value: "1")]
let response = try await req.client.get("https://api.example.com/orders", query: query)

// POST with body
let response = try await req.client.post("https://api.example.com/orders") { req in
    try req.content.encode(["customerId": "cust-1"])
}

// With headers
let response = try await req.client.get("https://api.example.com/orders") { req in
    req.headers.bearerAuthorization = BearerAuthorization(token: "token123")
}
```

### Application-Level Client

```swift
// Application-wide client (for background tasks)
let response = try await app.client.get("https://api.example.com/health")

// With configuration
let client = HTTPClient(
    eventLoopGroupProvider: .shared(app.eventLoopGroup),
    configuration: HTTPClient.Configuration(
        timeout: HTTPClient.Timeout(connect: .seconds(10), read: .seconds(30))
    )
)
defer { try? client.syncShutdown() }
```

### Response Handling

```swift
// Check status
let response = try await req.client.get("https://api.example.com/orders")
guard response.status == .ok else {
    throw Abort(.badGateway, reason: "Upstream service failed")
}

// Decode response
let orders = try response.content.decode([OrderResponse].self)

// Raw data
let data = response.body.data
let string = response.body.string
```

---

## 10. File Handling

### File Upload

```swift
// Upload handler
app.post("upload") { req -> HTTPStatus in
    let file = try req.content.decode(File.self)

    guard file.data.readableBytes < 10_000_000 else {
        throw Abort(.badRequest, reason: "File too large")
    }

    let path = app.directory.publicDirectory + "uploads/" + file.filename
    try await req.fileio.writeFile(file.data, at: path)

    return .created
}

// Multipart form data
struct UploadRequest: Content {
    var avatar: File
    var userId: String
}

app.post("avatar") { req -> HTTPStatus in
    let data = try req.content.decode(UploadRequest.self)
    // Process data.avatar and data.userId
    return .ok
}
```

### File Download

```swift
// Stream file
app.get("files", ":filename") { req -> Response in
    let filename = req.parameters.get("filename")!
    let path = app.directory.publicDirectory + filename
    return req.fileio.streamFile(at: path)
}

// Directory protection
let protected = app.grouped(AuthMiddleware())
protected.get("files", ":filename") { req -> Response in
    let filename = req.parameters.get("filename")!
    let path = app.directory.publicDirectory + filename
    return req.fileio.streamFile(at: path)
}
```

---

## 11. Error Handling

### Abort Errors

```swift
// Generic error
throw Abort(.notFound)
throw Abort(.badRequest, reason: "Invalid input")
throw Abort(.internalServerError)

// With custom reason
throw Abort(.conflict, reason: "Order already cancelled")

// With identifier for logging
throw Abort(.badRequest, reason: "Validation failed", identifier: "validation-001")
```

### Custom Error Types

```swift
// Custom error conforming to AbortError
enum OrderError: AbortError {
    case notFound(UUID)
    case alreadyCancelled(UUID)
    case invalidStatus(String)

    var status: HTTPResponseStatus {
        switch self {
        case .notFound:
            return .notFound
        case .alreadyCancelled:
            return .conflict
        case .invalidStatus:
            return .badRequest
        }
    }

    var reason: String {
        switch self {
        case .notFound(let id):
            return "Order \(id) not found"
        case .alreadyCancelled(let id):
            return "Order \(id) is already cancelled"
        case .invalidStatus(let status):
            return "Invalid order status: \(status)"
        }
    }
}

// Usage
func cancelOrder(id: UUID) async throws {
    guard let order = try await Order.find(id, on: db) else {
        throw OrderError.notFound(id)
    }
    guard order.status != "cancelled" else {
        throw OrderError.alreadyCancelled(id)
    }
}
```

### Global Error Middleware

```swift
// Custom error middleware
struct AppErrorMiddleware: AsyncMiddleware {
    func respond(to request: Request, chainingTo next: AsyncResponder) async throws -> Response {
        do {
            return try await next.respond(to: request)
        } catch let error as OrderError {
            request.logger.warning("Order error: \(error.reason)")
            return try await errorResponse(for: error, on: request)
        } catch let abort as AbortError {
            return try await errorResponse(for: abort, on: request)
        } catch {
            request.logger.error("Unhandled error: \(error)")
            return try await errorResponse(for: Abort(.internalServerError), on: request)
        }
    }

    private func errorResponse(for error: AbortError, on request: Request) async throws -> Response {
        let response = Response(status: error.status)
        try response.content.encode([
            "error": true,
            "status": error.status.code,
            "reason": error.reason,
        ])
        return response
    }
}
```

---

## 12. Testing HTTP

### XCTVapor Testing

```swift
import XCTVapor
@testable import App

final class OrderControllerTests: XCTestCase {
    var app: Application!

    override func setUp() async throws {
        app = try await Application.make(.testing)
        try await configure(app)
    }

    override func tearDown() async throws {
        app.shutdown()
    }

    // Test GET endpoint
    func testListOrders() async throws {
        try await app.test(.GET, "/api/orders", afterResponse: { res in
            XCTAssertEqual(res.status, .ok)
            let orders = try res.content.decode([OrderResponse].self)
            XCTAssertNotNil(orders)
        })
    }

    // Test POST endpoint
    func testCreateOrder() async throws {
        let request = CreateOrderRequest(customerId: "cust-1", items: [
            CreateOrderItemRequest(productId: "prod-1", quantity: 2, unitPrice: 19.99)
        ])

        try await app.test(.POST, "/api/orders", beforeRequest: { req in
            try req.content.encode(request)
        }, afterResponse: { res in
            XCTAssertEqual(res.status, .created)
            let order = try res.content.decode(OrderResponse.self)
            XCTAssertEqual(order.customerId, "cust-1")
        })
    }

    // Test with authentication
    func testAuthenticatedEndpoint() async throws {
        let token = try await generateTestToken(app: app)

        try await app.test(.GET, "/api/orders") { req in
            req.headers.bearerAuthorization = BearerAuthorization(token: token)
        } afterResponse: { res in
            XCTAssertEqual(res.status, .ok)
        }
    }

    // Test error response
    func testNotFound() async throws {
        try await app.test(.GET, "/api/orders/non-existent") { res in
            XCTAssertEqual(res.status, .notFound)
            let error = try res.content.decode(ErrorResponse.self)
            XCTAssertTrue(error.error)
        }
    }

    // Test WebSocket
    func testWebSocket() async throws {
        try await app.test(.GET, "/ws/orders/123/status") { req in
            // WebSocket upgrade
        } afterResponse: { res in
            XCTAssertEqual(res.status, .switchingProtocols)
        }
    }
}
```

### Test Helpers

```swift
// Custom test helpers
extension Application {
    static func createTestApp() async throws -> Application {
        let app = try await Application.make(.testing)
        app.databases.use(.sqlite(.memory), as: .sqlite)
        try await configure(app)
        try await app.autoMigrate()
        return app
    }
}

// Test fixtures
struct TestFixtures {
    static func createOrder(db: Database) async throws -> Order {
        let order = Order(customerId: "test-customer", status: "pending", totalAmount: 99.99)
        try await order.save(on: db)
        return order
    }
}
```

---

## 13. Performance Tuning

### Server Configuration

```swift
// configure.swift
// Increase event loop count
app.http.server.configuration.backlog = 256
app.http.server.configuration.pipelining = .enabled
app.http.server.configuration.supportVersions = [.one, .two]

// Timeouts
app.http.server.configuration.timeouts = .init(
    request: .seconds(10),
    read: .seconds(30),
    write: .seconds(30),
    idle: .seconds(60)
)

// Request decompression and response compression
app.http.server.configuration.requestDecompression = .enabled(limit: .size(10_000_000))
app.http.server.configuration.responseCompression = .enabled
```

### HTTP Client Performance

```swift
// Configure HTTP client pool
app.http.client.configuration.timeout = .init(
    connect: .seconds(5),
    read: .seconds(30)
)

// Connection pooling
app.http.client.configuration.connectionPool = .init(
    concurrentHTTP1Connections: 8
)

// Retry strategy
struct RetryClient {
    static func getWithRetry(url: String, maxRetries: Int = 3) async throws -> Response {
        var lastError: Error?
        for attempt in 0..<maxRetries {
            do {
                return try await app.client.get(url)
            } catch {
                lastError = error
                try await Task.sleep(nanoseconds: UInt64(pow(2.0, Double(attempt)) * 100_000_000))
            }
        }
        throw lastError!
    }
}
```

---

## 14. Common Patterns

### Request Context

```swift
// Custom storage key
struct UserKey: StorageKey {
    typealias Value = UserPayload
}

// Attach user to request middleware
struct UserMiddleware: AsyncMiddleware {
    func respond(to request: Request, chainingTo next: AsyncResponder) async throws -> Response {
        // Fetch user from token
        let user = try await authenticate(request)
        request.storage[UserKey.self] = user
        return try await next.respond(to: request)
    }
}

// Access user in handler
extension Request {
    var user: UserPayload {
        guard let user = storage[UserKey.self] else {
            fatalError("User not attached to request")
        }
        return user
    }
}

// Usage
app.get("profile") { req -> UserProfile in
    let user = req.user
    return UserProfile(id: user.id, name: user.name)
}
```

### Dependency Injection Pattern

```swift
// Service registration
extension Application {
    var orderService: OrderService {
        get {
            guard let service = storage[OrderServiceKey.self] else {
                fatalError("OrderService not configured")
            }
            return service
        }
        set {
            storage[OrderServiceKey.self] = newValue
        }
    }

    private struct OrderServiceKey: StorageKey {
        typealias Value = OrderService
    }
}

// configure.swift
app.orderService = OrderService(repository: OrderRepository())

// Access in controller
func list(req: Request) async throws -> [OrderResponse] {
    let service = req.application.orderService
    return try await service.findAll(db: req.db)
}
```

---

## References

- Vapor HTTP Documentation: https://docs.vapor.codes/basics/routes/
- Vapor Middleware: https://docs.vapor.codes/basics/middleware/
- Vapor WebSocket: https://docs.vapor.codes/advanced/websockets/
- Vapor Client: https://docs.vapor.codes/basics/client/
- Vapor Testing: https://docs.vapor.codes/testing/getting-started/
- Vapor GitHub: https://github.com/vapor/vapor
