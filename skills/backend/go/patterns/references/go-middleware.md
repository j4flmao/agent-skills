# Go HTTP Middleware Patterns

## Middleware Chain

### Standard Pattern
```go
package middleware

import "net/http"

type Middleware func(http.Handler) http.Handler

func Chain(handler http.Handler, middlewares ...Middleware) http.Handler {
    for i := len(middlewares) - 1; i >= 0; i-- {
        handler = middlewares[i](handler)
    }
    return handler
}

// Usage
handler := middleware.Chain(
    myHandler,
    middleware.Logger,
    middleware.Recovery,
    middleware.CORS,
    middleware.RateLimit(100),
)
```

### With Standard Library
```go
package main

import (
    "net/http"
)

func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("GET /api/users", handleUsers)
    mux.HandleFunc("POST /api/users", createUser)

    wrapped := middleware.Chain(mux,
        middleware.RequestID,
        middleware.Logger,
        middleware.Recovery,
        middleware.CORS,
        middleware.RateLimit(100),
        middleware.Auth,
    )

    http.ListenAndServe(":8080", wrapped)
}
```

### With Go 1.22 Routing
```go
mux := http.NewServeMux()

// Apply middleware to specific route
mux.Handle("GET /api/users", middleware.Auth(middleware.Logger(http.HandlerFunc(handleUsers))))

// Apply middleware to all routes via wrapping
admin := http.NewServeMux()
admin.Handle("GET /dashboard", handleDashboard)
admin.Handle("GET /settings", handleSettings)
mux.Handle("/admin/", middleware.Chain(admin, middleware.Auth, middleware.AdminOnly))
```

## Request ID Middleware

### Generate and Propagate
```go
package middleware

import (
    "context"
    "crypto/rand"
    "encoding/hex"
    "net/http"
)

type contextKey string

const RequestIDKey contextKey = "request_id"

func RequestID(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        id := r.Header.Get("X-Request-ID")
        if id == "" {
            id = generateRequestID()
        }

        ctx := context.WithValue(r.Context(), RequestIDKey, id)
        w.Header().Set("X-Request-ID", id)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

func generateRequestID() string {
    bytes := make([]byte, 16)
    rand.Read(bytes)
    return hex.EncodeToString(bytes)
}

func GetRequestID(ctx context.Context) string {
    if id, ok := ctx.Value(RequestIDKey).(string); ok {
        return id
    }
    return ""
}
```

## Logging Middleware

### Structured Logging
```go
package middleware

import (
    "log/slog"
    "net/http"
    "time"
)

type responseWriter struct {
    http.ResponseWriter
    status int
    bytes  int
}

func (rw *responseWriter) WriteHeader(code int) {
    rw.status = code
    rw.ResponseWriter.WriteHeader(code)
}

func (rw *responseWriter) Write(b []byte) (int, error) {
    n, err := rw.ResponseWriter.Write(b)
    rw.bytes += n
    return n, err
}

func Logger(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        rw := &responseWriter{ResponseWriter: w, status: http.StatusOK}

        next.ServeHTTP(rw, r)

        duration := time.Since(start)
        attrs := []slog.Attr{
            slog.String("method", r.Method),
            slog.String("path", r.URL.Path),
            slog.Int("status", rw.status),
            slog.Duration("duration", duration),
            slog.Int("bytes", rw.bytes),
            slog.String("remote", r.RemoteAddr),
            slog.String("request_id", GetRequestID(r.Context())),
        }

        if rw.status >= 500 {
            slog.Error("request failed", attrs...)
        } else if rw.status >= 400 {
            slog.Warn("request warning", attrs...)
        } else {
            slog.Info("request completed", attrs...)
        }
    })
}
```

## Recovery Middleware

### Panic Recovery
```go
package middleware

import (
    "log"
    "net/http"
    "runtime/debug"
)

func Recovery(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        defer func() {
            if err := recover(); err != nil {
                log.Printf("PANIC: %v\n%s", err, debug.Stack())
                http.Error(w, "Internal Server Error", http.StatusInternalServerError)
            }
        }()
        next.ServeHTTP(w, r)
    })
}
```

## Authentication Middleware

### JWT Auth
```go
package middleware

import (
    "context"
    "net/http"
    "strings"

    "github.com/golang-jwt/jwt/v5"
)

type Claims struct {
    UserID string   `json:"user_id"`
    Roles  []string `json:"roles"`
    jwt.RegisteredClaims
}

func Auth(jwtSecret string) Middleware {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            header := r.Header.Get("Authorization")
            if header == "" {
                http.Error(w, "missing authorization header", http.StatusUnauthorized)
                return
            }

            tokenString := strings.TrimPrefix(header, "Bearer ")
            if tokenString == header {
                http.Error(w, "invalid authorization format", http.StatusUnauthorized)
                return
            }

            claims := &Claims{}
            token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
                return []byte(jwtSecret), nil
            })

            if err != nil || !token.Valid {
                http.Error(w, "invalid token", http.StatusUnauthorized)
                return
            }

            ctx := context.WithValue(r.Context(), "user_id", claims.UserID)
            ctx = context.WithValue(ctx, "roles", claims.Roles)
            next.ServeHTTP(w, r.WithContext(ctx))
        })
    }
}
```

## CORS Middleware

### Configurable CORS
```go
package middleware

import "net/http"

type CORSConfig struct {
    AllowedOrigins   []string
    AllowedMethods   []string
    AllowedHeaders   []string
    AllowCredentials bool
    MaxAge           int
}

func DefaultCORSConfig() CORSConfig {
    return CORSConfig{
        AllowedOrigins:   []string{"*"},
        AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "PATCH"},
        AllowedHeaders:   []string{"Content-Type", "Authorization", "X-Request-ID"},
        AllowCredentials: false,
        MaxAge:           3600,
    }
}

func CORS(config CORSConfig) Middleware {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            origin := r.Header.Get("Origin")
            if origin == "" {
                next.ServeHTTP(w, r)
                return
            }

            if !isOriginAllowed(origin, config.AllowedOrigins) {
                next.ServeHTTP(w, r)
                return
            }

            w.Header().Set("Access-Control-Allow-Origin", origin)
            w.Header().Set("Access-Control-Allow-Methods", join(config.AllowedMethods))
            w.Header().Set("Access-Control-Allow-Headers", join(config.AllowedHeaders))

            if config.AllowCredentials {
                w.Header().Set("Access-Control-Allow-Credentials", "true")
            }
            if config.MaxAge > 0 {
                w.Header().Set("Access-Control-Max-Age", itoa(config.MaxAge))
            }

            if r.Method == http.MethodOptions {
                w.WriteHeader(http.StatusNoContent)
                return
            }

            next.ServeHTTP(w, r)
        })
    }
}

func isOriginAllowed(origin string, allowed []string) bool {
    for _, a := range allowed {
        if a == "*" || a == origin {
            return true
        }
    }
    return false
}
```

## Rate Limiting Middleware

### Token Bucket
```go
package middleware

import (
    "net/http"
    "sync"
    "time"
)

type RateLimiter struct {
    mu       sync.Mutex
    visitors map[string]*visitor
    rate     int
    burst    int
}

type visitor struct {
    tokens    int
    lastSeen  time.Time
}

func NewRateLimiter(rate, burst int) *RateLimiter {
    rl := &RateLimiter{
        visitors: make(map[string]*visitor),
        rate:     rate,
        burst:    burst,
    }
    go rl.cleanup()
    return rl
}

func (rl *RateLimiter) Allow(key string) bool {
    rl.mu.Lock()
    defer rl.mu.Unlock()

    v, exists := rl.visitors[key]
    if !exists {
        rl.visitors[key] = &visitor{tokens: rl.burst - 1, lastSeen: time.Now()}
        return true
    }

    // Refill tokens based on elapsed time
    elapsed := time.Since(v.lastSeen)
    v.tokens += int(elapsed.Seconds() * float64(rl.rate))
    if v.tokens > rl.burst {
        v.tokens = rl.burst
    }
    v.lastSeen = time.Now()

    if v.tokens <= 0 {
        return false
    }

    v.tokens--
    return true
}

func (rl *RateLimiter) cleanup() {
    ticker := time.NewTicker(5 * time.Minute)
    for range ticker.C {
        rl.mu.Lock()
        for ip, v := range rl.visitors {
            if time.Since(v.lastSeen) > 10*time.Minute {
                delete(rl.visitors, ip)
            }
        }
        rl.mu.Unlock()
    }
}

func RateLimit(rate, burst int) Middleware {
    limiter := NewRateLimiter(rate, burst)
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            key := r.RemoteAddr
            if !limiter.Allow(key) {
                w.Header().Set("Retry-After", "1")
                http.Error(w, "rate limit exceeded", http.StatusTooManyRequests)
                return
            }
            next.ServeHTTP(w, r)
        })
    }
}
```

## Timeout Middleware

### Request Timeout
```go
package middleware

import (
    "context"
    "net/http"
    "time"
)

func Timeout(duration time.Duration) Middleware {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            ctx, cancel := context.WithTimeout(r.Context(), duration)
            defer cancel()

            r = r.WithContext(ctx)
            done := make(chan struct{})

            go func() {
                next.ServeHTTP(w, r)
                close(done)
            }()

            select {
            case <-done:
                return
            case <-ctx.Done():
                w.WriteHeader(http.StatusGatewayTimeout)
            }
        })
    }
}
```

## Compression Middleware

### Gzip Compression
```go
package middleware

import (
    "compress/gzip"
    "io"
    "net/http"
    "strings"
)

type gzipWriter struct {
    http.ResponseWriter
    writer *gzip.Writer
}

func (gw *gzipWriter) Write(b []byte) (int, error) {
    return gw.writer.Write(b)
}

func Gzip(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        if !strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
            next.ServeHTTP(w, r)
            return
        }

        gw := &gzipWriter{
            ResponseWriter: w,
            writer:         gzip.NewWriter(w),
        }
        defer gw.writer.Close()

        w.Header().Set("Content-Encoding", "gzip")
        w.Header().Set("Vary", "Accept-Encoding")
        next.ServeHTTP(gw, r)
    })
}
```

## Key Points
- Middleware chains wrap handlers in nested order (last applied = first executed)
- Go 1.22 routing supports method-based patterns and path parameters
- Request ID middleware enables distributed tracing across services
- Structured logging captures method, path, status, duration for every request
- Panic recovery prevents server crashes from unexpected errors
- JWT auth middleware validates tokens and injects user context
- CORS middleware handles preflight requests and origin validation
- Token bucket rate limiter prevents abuse per client IP
- Timeout middleware prevents long-running requests from blocking workers
- Gzip compression reduces response size for text-heavy APIs
