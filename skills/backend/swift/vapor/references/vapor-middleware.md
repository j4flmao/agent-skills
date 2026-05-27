# Vapor Middleware Reference

## Middleware Lifecycle

Vapor middleware wraps request handling with pre and post processing hooks.

```swift
import Vapor

struct RequestLoggerMiddleware: Middleware {
    func respond(to request: Request, chainingTo next: Responder) -> EventLoopFuture<Response> {
        let start = Date()
        request.logger.info("\(request.method) \(request.url.path)")
        
        return next.respond(to: request).map { response in
            let duration = Date().timeIntervalSince(start) * 1000
            request.logger.info("\(response.status.code) \(request.method) \(request.url.path) - \(Int(duration))ms")
            return response
        }
    }
}
```

## Built-in Middleware

```swift
// App configuration with middleware
app.middleware.use(FileMiddleware(publicDirectory: app.directory.publicDirectory))
app.middleware.use(CORSMiddleware(configuration: corsConfig))
app.middleware.use(ErrorMiddleware.default(environment: app.environment))
app.middleware.use(SessionsMiddleware(session: app.sessions.driver))
app.middleware.use(UserJWTPayload.authenticator())
```

## Custom Authentication Middleware

```swift
struct APIKeyMiddleware: Middleware {
    private let validKeys: [String]
    
    init(validKeys: [String]) {
        self.validKeys = validKeys
    }
    
    func respond(to request: Request, chainingTo next: Responder) -> EventLoopFuture<Response> {
        guard let key = request.headers.first(name: "X-API-Key") else {
            return request.eventLoop.future(Response(status: .unauthorized))
        }
        
        guard validKeys.contains(key) else {
            return request.eventLoop.future(Response(status: .forbidden))
        }
        
        return next.respond(to: request)
    }
}

app.grouped(APIKeyMiddleware(validKeys: ["sk-..."]))
    .get("api", "webhooks", "stripe") { req in
        // Handle Stripe webhook
    }
```

## Rate Limiting Middleware

```swift
struct RateLimitingMiddleware: Middleware {
    private var cache: [String: (count: Int, resetAt: Date)]
    private let maxRequests: Int
    private let window: TimeInterval
    
    init(maxRequests: Int = 100, window: TimeInterval = 60) {
        self.maxRequests = maxRequests
        self.window = window
        self.cache = [:]
    }
    
    func respond(to request: Request, chainingTo next: Responder) -> EventLoopFuture<Response> {
        let ip = request.remoteAddress?.ipAddress ?? "unknown"
        let now = Date()
        
        if var entry = cache[ip] {
            if now > entry.resetAt {
                entry = (1, now.addingTimeInterval(window))
            } else if entry.count >= maxRequests {
                let response = Response(status: .tooManyRequests)
                try? response.content.encode(ErrorResponse(
                    code: "RATE_LIMIT",
                    message: "Too many requests"
                ))
                return request.eventLoop.future(response)
            } else {
                entry.count += 1
            }
            cache[ip] = entry
        } else {
            cache[ip] = (1, now.addingTimeInterval(window))
        }
        
        return next.respond(to: request)
    }
}
```

## Request Validation Middleware

```swift
struct RequestValidationMiddleware: Middleware {
    func respond(to request: Request, chainingTo next: Responder) -> EventLoopFuture<Response> {
        // Validate content type for POST/PUT/PATCH
        if request.method == .POST || request.method == .PUT || request.method == .PATCH {
            guard request.headers.contentType == .json else {
                return request.eventLoop.future(Response(status: .unsupportedMediaType))
            }
        }
        
        // Validate body size
        if let bodyLength = request.headers.first(name: "Content-Length").flatMap(Int.init) {
            guard bodyLength < 10_000_000 else {
                return request.eventLoop.future(Response(status: .payloadTooLarge))
            }
        }
        
        return next.respond(to: request)
    }
}
```

## Route-Specific Middleware

```swift
// Apply to specific route groups
let api = app.grouped(
    RequestLoggerMiddleware(),
    RateLimitingMiddleware(maxRequests: 50)
)

let admin = api.grouped(
    AdminAuthMiddleware(),
    RequestValidationMiddleware()
)

admin.get("users") { req in
    // Admin-only user listing
}
```

## Middleware Ordering

```swift
// Registration order matters in Vapor
app.middleware.use(FileMiddleware(publicDirectory: "Public"))     // 1. Static files
app.middleware.use(CORSMiddleware(configuration: corsConfig))      // 2. CORS
app.middleware.use(ErrorMiddleware())                             // 3. Error handling
app.middleware.use(SessionsMiddleware(session: app.sessions.driver)) // 4. Sessions
app.middleware.use(UserJWTPayload.authenticator())                // 5. Auth
```

## Key Points

- Middleware chain processes requests in registration order
- Pre-processing hooks modify or reject requests before handler
- Post-processing hooks modify responses after handler
- Route groups isolate middleware to specific endpoints
- Rate limiting prevents abuse at middleware level
- Request validation checks content type and body size
- Authentication middleware extracts and verifies credentials
- Error middleware catches and formats all unhandled errors
- Logger middleware captures request metrics
- Static file middleware serves public assets before route handlers
