# gRPC Interceptors

## Overview
Interceptors are gRPC middleware that wrap RPC calls. They handle cross-cutting concerns without modifying the service implementation.

## Types

### Unary Interceptor
Wraps a single request-response call.

```go
func unaryInterceptor(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
    // pre-processing
    resp, err := handler(ctx, req)
    // post-processing
    return resp, err
}
```

### Stream Interceptor
Wraps a streaming RPC. Intercepts stream creation.

```go
func streamInterceptor(srv interface{}, ss grpc.ServerStream, info *grpc.StreamServerInfo, handler grpc.StreamHandler) error {
    // pre-processing
    err := handler(srv, ss)
    // post-processing
    return err
}
```

### Client Interceptor
Same pattern but on the client side — wraps outgoing calls.

## Common Interceptors

### Logging
```go
func LoggingInterceptor(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
    start := time.Now()
    resp, err := handler(ctx, req)
    duration := time.Since(start)
    log.Printf("method=%s duration=%s error=%v", info.FullMethod, duration, err)
    return resp, err
}
```

### Auth / Authz
```go
func AuthInterceptor(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
    token, err := extractToken(ctx)
    if err != nil {
        return nil, status.Errorf(codes.Unauthenticated, "missing token")
    }
    claims, err := validateToken(token)
    if err != nil {
        return nil, status.Errorf(codes.Unauthenticated, "invalid token")
    }
    ctx = context.WithValue(ctx, "claims", claims)
    return handler(ctx, req)
}
```

### Rate Limiting
```go
func RateLimitInterceptor(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
    if !rateLimiter.Allow() {
        return nil, status.Errorf(codes.ResourceExhausted, "rate limit exceeded")
    }
    return handler(ctx, req)
}
```

### Recovery (Panic Safety)
```go
func RecoveryInterceptor(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
    defer func() {
        if r := recover(); r != nil {
            log.Printf("panic recovered: %v", r)
        }
    }()
    return handler(ctx, req)
}
```

### Tracing / Metadata Propagation
```go
func TracingInterceptor(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
    md, ok := metadata.FromIncomingContext(ctx)
    if ok {
        // extract trace ID from metadata
        traceID := extractTraceID(md)
        ctx = context.WithValue(ctx, "trace_id", traceID)
    }
    return handler(ctx, req)
}
```

### Request Validation
```go
func ValidationInterceptor(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
    if v, ok := req.(interface{ Validate() error }); ok {
        if err := v.Validate(); err != nil {
            return nil, status.Errorf(codes.InvalidArgument, err.Error())
        }
    }
    return handler(ctx, req)
}
```

## Interceptor Chain Order
```
Incoming request:
  1. Recovery (outermost — catches panics from all inner interceptors)
  2. Tracing
  3. Logging (captures full request context)
  4. Auth (reject early if unauthenticated)
  5. Rate limiting
  6. Request validation
  7. Service handler (innermost)

Outgoing response:
  7 → 6 → 5 → 4 → 3 → 2 → 1
```

## Client-Side Interceptors
```go
conn, err := grpc.Dial(
    target,
    grpc.WithUnaryInterceptor(clientLoggingInterceptor),
    grpc.WithStreamInterceptor(clientStreamInterceptor),
)
```

Common uses: retry logic, request tracing header injection, metrics collection, circuit breaking.

## Best Practices
- Order matters — put auth before rate limiting to count only authenticated requests.
- Keep interceptors pure — no side effects that affect request handling (unless logging/tracing).
- Use `grpc.UnaryServerInfo.FullMethod` to skip certain methods (e.g., health check).
- Chain interceptors with `grpc_middleware.ChainUnaryServer(...)` for readability.
- Client interceptors should implement retry with exponential backoff for transient failures.
