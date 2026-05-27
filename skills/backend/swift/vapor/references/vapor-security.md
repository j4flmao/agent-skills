# Vapor Security Reference

## Authentication with JWT

```swift
import Vapor
import JWT

struct UserJWTPayload: JWTPayload, Authenticatable {
    var subject: SubjectClaim
    var email: String
    var roles: [String]
    var expiration: ExpirationClaim
    
    func verify(using signer: JWTSigner) throws {
        try expiration.verifyNotExpired()
    }
}

struct UserAuthenticator: AsyncJWTAuthenticator {
    typealias Payload = UserJWTPayload
    
    func authenticate(jwt: UserJWTPayload, for request: Request) async throws {
        request.auth.login(jwt)
    }
}
```

### Token Generation

```swift
func generateToken(for user: User) async throws -> String {
    let payload = UserJWTPayload(
        subject: SubjectClaim(value: user.id!.uuidString),
        email: user.email,
        roles: user.roles.map { $0.name },
        expiration: ExpirationClaim(value: Date().addingTimeInterval(3600))
    )
    return try await req.jwt.sign(payload)
}

// Login endpoint
app.post("api", "login") { req async throws -> LoginResponse in
    let credentials = try req.content.decode(LoginRequest.self)
    guard let user = try await User.query(on: req.db)
        .filter(\.$email == credentials.email)
        .first() else {
        throw Abort(.unauthorized, reason: "Invalid credentials")
    }
    guard try Bcrypt.verify(credentials.password, against: user.passwordHash) else {
        throw Abort(.unauthorized, reason: "Invalid credentials")
    }
    
    let token = try await generateToken(for: user)
    return LoginResponse(token: token, expiresIn: 3600)
}
```

## Route Protection

```swift
// Authenticated routes
let protected = app.grouped(UserJWTPayload.authenticator())
    .grouped(UserJWTPayload.guardMiddleware())

protected.get("api", "orders") { req async throws -> [OrderResponse] in
    let user = try req.auth.require(UserJWTPayload.self)
    let orders = try await Order.query(on: req.db)
        .filter(\.$customerId == user.subject.value)
        .all()
    return orders.map { $0.toResponse() }
}

// Admin-only routes
func requireAdmin(_ req: Request) async throws {
    let user = try req.auth.require(UserJWTPayload.self)
    guard user.roles.contains("admin") else {
        throw Abort(.forbidden, reason: "Admin access required")
    }
}

app.get("api", "admin", "dashboard") { req async throws -> Dashboard in
    try await requireAdmin(req)
    return try await DashboardService.generate()
}
```

## Middleware

```swift
// CORS Middleware
let corsConfiguration = CORSMiddleware.Configuration(
    allowedOrigin: .originBased,
    allowedMethods: [.GET, .POST, .PUT, .DELETE, .OPTIONS],
    allowedHeaders: [.contentType, .authorization, .xRequestedWith],
    exposeHeaders: ["X-Total-Count"]
)
let corsMiddleware = CORSMiddleware(configuration: corsConfiguration)
app.middleware.use(corsMiddleware)

// Error Middleware
struct ErrorMiddleware: Middleware {
    func respond(to request: Request, chainingTo next: Responder) -> EventLoopFuture<Response> {
        next.respond(to: request).flatMapError { error in
            let response: Response
            switch error {
            case let abort as Abort:
                response = Response(status: abort.status)
                try? response.content.encode(ErrorResponse(
                    code: abort.status.code.description,
                    message: abort.reason
                ))
            default:
                request.logger.error("Unhandled: \(error.localizedDescription)")
                response = Response(status: .internalServerError)
                try? response.content.encode(ErrorResponse(
                    code: "INTERNAL_ERROR",
                    message: "An unexpected error occurred"
                ))
            }
            response.headers.contentType = .json
            return request.eventLoop.future(response)
        }
    }
}
app.middleware.use(ErrorMiddleware())
```

## Password Hashing

```swift
import Vapor

// Registration
app.post("api", "register") { req async throws -> UserResponse in
    let data = try req.content.decode(RegisterRequest.self)
    let hash = try await req.password.async.hash(data.password)
    
    let user = User(email: data.email, passwordHash: hash)
    try await user.save(on: req.db)
    return UserResponse(id: user.id!, email: user.email)
}
```

## Security Headers

```swift
struct SecurityHeadersMiddleware: Middleware {
    func respond(to request: Request, chainingTo next: Responder) -> EventLoopFuture<Response> {
        next.respond(to: request).map { response in
            response.headers.add(name: "X-Content-Type-Options", value: "nosniff")
            response.headers.add(name: "X-Frame-Options", value: "DENY")
            response.headers.add(name: "X-XSS-Protection", value: "1; mode=block")
            response.headers.add(name: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains")
            response.headers.add(name: "Referrer-Policy", value: "strict-origin-when-cross-origin")
            return response
        }
    }
}
app.middleware.use(SecurityHeadersMiddleware())
```

## Key Points

- JWT payloads conform to JWTPayload and Authenticatable protocols
- Route groups protect multiple endpoints with auth middleware
- Bcrypt hashes passwords with async API
- CORS middleware configures allowed origins and headers
- Error middleware catches and formats all errors
- Security headers middleware sets response headers
- Guard middleware ensures authentication is present
- Role-based checks verify admin privileges
- Token expiration prevents replay attacks
- Environment variables configure secrets and origins
