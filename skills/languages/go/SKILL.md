---
name: go
description: >
  Use this skill when the user asks about Go build tools, module management,
  goroutines, channels, interfaces, error handling, testing, or production
  deployment. Focus on tooling, concurrency, and ecosystem — not syntax.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [go, golang, language, build, concurrency]
---

# Go

## Purpose
Guide for Go build tools, module management, concurrency patterns, interface design, error handling, testing, and production deployment.

## Agent Protocol

### Trigger
Keywords: `go build`, `go mod`, `goroutine`, `channel`, `interface go`, `error handling go`, `testing go`, `go generate`, `go tool`, `context`, `go concurrency`.

### Input Context
- Project type (CLI tool, web API, microservice, library)
- Go version
- Module organization (monorepo vs multi-module)
- Deployment target

## Decision Trees

### Project Structure
```
What kind of project?
├── CLI tool → Single main.go + internal packages, cmd/ layout
├── Web API / microservice → cmd/ (entrypoints) + internal/ (private) + pkg/ (shared)
├── Library → Exported API surface minimal, no internal, flat or by feature
├── Monorepo → go.work file, multiple modules, shared tooling
└── gRPC service → protobuf codegen in separate package, buf tool
```

### Concurrency Strategy
```
Workload type?
├── I/O bound (HTTP, DB, file) → Goroutines + channels / errgroup
├── CPU bound (compute, transform) → goroutines capped at runtime.NumCPU()
├── Fan-out / fan-in → worker pool with channel, sync.WaitGroup
├── Pipeline (producer → transform → consumer) → channels for each stage
├── Timeout / cancellation → context.Context with deadline/timeout
└── Once-only init → sync.Once for thread-safe lazy init
```

### Error Handling
```
Error strategy?
├── Expected errors (validation, not found) → return error type, callers handle
├── Unexpected errors (network, IO) → wrap with fmt.Errorf("%w: %v", sentinel, err)
├── Retryable errors → errors.Is + retry with backoff
├── Panic → only for programmer errors (nil deref, bounds); recover in goroutine top
└── Deferred cleanup → defer mu.Unlock(), defer file.Close(), defer db.Rollback()
```

## Build & Module Management

### Module Initialization
```bash
go mod init github.com/org/myproject
go mod tidy                # Clean dependencies
go mod verify              # Verify checksums
go mod download            # Pre-download for Docker
go work init ./cmd ./pkg   # Monorepo workspace
```

### go.mod Conventions
```
module github.com/org/myproject

go 1.22

require (
    github.com/gin-gonic/gin v1.9.1
    go.uber.org/zap v1.27.0
    golang.org/x/sync v0.7.0
)

// replace directive for local development
replace github.com/org/internal => ../internal
```

### Build Commands
```bash
go build -o bin/server ./cmd/server
go build -ldflags="-X main.Version=v1.0.0" ./cmd/server
go test -race -count=1 ./...
go vet ./...
go generate ./...
```

## Language-Specific Patterns

### Interface Design (Accept Interfaces, Return Structs)
```go
// Define small interfaces (1-3 methods)
type Storer interface {
    Store(ctx context.Context, key string, value []byte) error
    Load(ctx context.Context, key string) ([]byte, error)
}

// Implement with concrete struct
type S3Storer struct {
    bucket string
    client *s3.Client
}

// Accept interface, return struct
func NewHandler(s Storer) *Handler {
    return &Handler{store: s}
}
```

### Context Cancellation
```go
func FetchWithTimeout(ctx context.Context, url string) ([]byte, error) {
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()

    req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return nil, fmt.Errorf("fetch %s: %w", url, err)
    }
    defer resp.Body.Close()
    return io.ReadAll(resp.Body)
}
```

### Worker Pool Pattern
```go
func WorkerPool(ctx context.Context, jobs <-chan Job, results chan<- Result, workers int) {
    var wg sync.WaitGroup
    for range workers {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for job := range jobs {
                select {
                case <-ctx.Done():
                    return
                case results <- process(job):
                }
            }
        }()
    }
    wg.Wait()
    close(results)
}
```

### Graceful Shutdown
```go
func main() {
    srv := &http.Server{Addr: ":8080", Handler: router}
    go func() {
        if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            log.Fatal(err)
        }
    }()

    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit

    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()
    srv.Shutdown(ctx)
}
```

### Error Wrapping and Inspection
```go
import "errors"

// Sentinel errors
var ErrNotFound = errors.New("not found")

// Wrap with context
func GetUser(id int) (*User, error) {
    user, err := db.QueryUser(id)
    if errors.Is(err, sql.ErrNoRows) {
        return nil, fmt.Errorf("get user %d: %w", id, ErrNotFound)
    }
    return user, fmt.Errorf("get user %d: %w", id, err)
}

// Inspect
if errors.Is(err, ErrNotFound) {
    http.NotFound(w, r)
}
```

## Testing & Tooling

### Test Patterns
```go
import (
    "testing"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestHandler(t *testing.T) {
    t.Parallel()
    tests := []struct {
        name   string
        input  string
        want   int
        errMsg string
    }{
        {name: "valid input", input: "hello", want: 5, errMsg: ""},
        {name: "empty string", input: "", want: 0, errMsg: "cannot be empty"},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := Handler(tt.input)
            if tt.errMsg != "" {
                assert.ErrorContains(t, err, tt.errMsg)
            } else {
                require.NoError(t, err)
                assert.Equal(t, tt.want, got)
            }
        })
    }
}
```

### Benchmarks
```go
func BenchmarkParse(b *testing.B) {
    input := []byte(`{"name": "test", "value": 42}`)
    for b.Loop() {  // Go 1.24+; use b.N for older
        var v Value
        json.Unmarshal(input, &v)
    }
}

// go test -bench=. -benchmem -count=5
```

### Fuzzing
```go
func FuzzParse(f *testing.F) {
    f.Add([]byte(`{"name": "test"}`))
    f.Fuzz(func(t *testing.T, data []byte) {
        var v Value
        json.Unmarshal(data, &v)
        // No panic expected
    })
}
```

### Tooling
```bash
# Linting
golangci-lint run --fast          # Parallel linters
staticcheck ./...                 # Go-specific static analysis

# Coverage
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out  # HTML report

# Race detection
go test -race ./...               # Always in CI

# Profiling
pprof for CPU/memory
trace for goroutine scheduling
```

## Anti-Patterns
- **Global state (init(), var registry)**: Untestable, breaks at scale. Use dependency injection
- **Channels for everything**: Channels are for signaling/coordination, not data transfer. Mutex may be simpler
- **Context stored in struct**: Context must be first param to functions. Never `ctx context.Context` in struct field
- **Deep if-else error handling**: Each `if err != nil` is a check, but nested = unreadable. Return early
- **Interface pollution**: Define interfaces where they're used, not where they're implemented. Small interfaces > big
- **Goroutine leaks**: Goroutine blocked on channel never closed. Use errgroup with context for lifecycle management
- **`recover()` outside deferred function**: Only works in deferred call. Always `defer func() { recover() }()`
- **`go run` in production**: Compile binary with `go build`, deploy binary. Never run from source
- **No `-race` in CI**: Data races undetected until production. Always run with race detector
- **`any` / interface{} everywhere**: Defeats type safety. Use generics (Go 1.18+) or specific interfaces

## Performance Patterns
- Use `sync.Pool` for frequently allocated temporary objects
- Pre-allocate slices with `make([]T, 0, capacity)` to avoid reallocation
- `encoding/json` vs `jsoniter` — stdlib is fast enough for most uses
- Profile before optimizing: `pprof` CPU, `trace` for scheduling, `pprof` heap for memory
- Use `strings.Builder` over `bytes.Buffer` for string concatenation
- `runtime.NumCPU()` capped goroutines for CPU-bound work
- Escape analysis: keep small values on stack (pass by value)
- `atomic` operations over mutex for simple counters/flags

## Middleware & HTTP Handler Patterns

Go's `net/http` handler signature `func(w http.ResponseWriter, r *http.Request)` enables composable middleware via the decorator pattern. Middleware chain: recover → logging → auth → requestID → rateLimit → handler. Each middleware wraps the next and calls `next.ServeHTTP(w, r)`. Use `httpsnoop` to capture response status and duration for logging. Common middleware: (a) request logging with duration and status, (b) panic recovery that logs stack trace and returns 500, (c) CORS headers for browser apps, (d) request ID injection via context, (e) authentication (JWT validation, API key check), (f) rate limiting (token bucket or sliding window), (g) gzip compression for responses. Use `alice` or `chi` for middleware chaining, or just compose manually. Always recover panics in HTTP handlers to avoid crashing the server.

## Dependency Injection & Wire

Go convention is manual dependency injection in `main()`, not frameworks. Pattern: `main()` creates all dependencies (config, DB connection, logger, service), injects them into handlers, starts the server. For large projects, use Google Wire for codegen-based DI: define providers and injectors, `wire generate` produces the `wire_gen.go` file. Wire catches missing dependencies at codegen time (not runtime). Manual DI is simpler for <10 dependencies. Anti-pattern: global `var` registry or `init()` for wiring — makes testing impossible. Example: `handler := NewUserHandler(logger, userService, authService)`.

## Database Migration Strategy

Go databases need explicit migration management. Tools: `golang-migrate/migrate` (CLI + library), `pressly/goose` (Go-based), `bytebase/bytebase` (GUI). Migration files: `000001_create_users.up.sql` and `000001_create_users.down.sql`. Run in CI/CD as a separate step before deploying new binary. Safety: (a) write both up and down migrations, (b) always add columns (don't remove or rename in same deployment), (c) use `NOT NULL` with defaults to avoid null-in-new-column issues, (d) test down migrations work before production. For zero-downtime: migrate schema first, deploy new binary second. Use `WithInstance` for programmatic migration in `main()`: `migrate.Up()`.

## Structured Logging

Use `slog` (Go 1.21+ standard library) or `zap` for structured logging with levels, fields, and sampling. Pattern: create a logger with service name and version, add request-scoped fields (requestID, userID) via context, log errors with stack traces. Log levels: Debug (development), Info (production operations), Warn (unexpected but handled), Error (failures requiring investigation). Never log PII or secrets. Sampling in high-throughput services: log first N errors per interval, then every Nth. Slog example: `slog.Info("user created", "user_id", id, "duration_ms", elapsed)`. For zap: `logger.Info("user created", zap.String("user_id", id), zap.Duration("elapsed", elapsed))`.

## Production Decision Trees

```
Observability needs?
├── Simple logging → slog (stdlib, no external deps)
├── Metrics + logging → slog + prometheus client (otel/otel)
├── Full observability (traces, metrics, logs) → OpenTelemetry Go SDK
│   Exporter: OTLP to collector → Tempo (traces), Mimir (metrics), Loki (logs)
└── Error tracking only → Sentry Go SDK
```

```
Deployment target?
├── Docker compose / bare metal → Binary on host + systemd
│   Build: CGO_ENABLED=0 go build -ldflags="-s -w" -o bin/server
├── Kubernetes → Distroless Docker image
│   Health: /healthz and /readyz endpoints
│   Graceful shutdown with signal handling
├── Serverless → AWS Lambda (aws-lambda-go) / Cloud Functions
│   Stateless handlers, no long-running goroutines
└── Edge → WASM target or tinygo for WebAssembly
```

```
Module organization for monorepo?
├── Single module → Simple, works for <100k LOC
├── Multi-module with go.work → Shared libraries, separate binaries
│   go.work: use for local development only (not committed to CI)
├── Multi-module without go.work → Each module independent
│   CI builds each module separately
└── Replace directives → For local development only
    Never commit replace directives to main branch
```

## Code Examples — HTTP Server with Middleware
```go
package main

import (
    "log/slog"
    "net/http"
    "time"
)

type wrappedWriter struct {
    http.ResponseWriter
    statusCode int
}

func (w *wrappedWriter) WriteHeader(statusCode int) {
    w.statusCode = statusCode
    w.ResponseWriter.WriteHeader(statusCode)
}

func loggingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        wrapped := &wrappedWriter{ResponseWriter: w, statusCode: http.StatusOK}
        next.ServeHTTP(wrapped, r)
        slog.Info("request",
            "method", r.Method,
            "path", r.URL.Path,
            "status", wrapped.statusCode,
            "duration_ms", time.Since(start).Milliseconds(),
        )
    })
}

func recoverMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        defer func() {
            if rec := recover(); rec != nil {
                slog.Error("panic recovered", "error", rec)
                http.Error(w, "Internal Server Error", http.StatusInternalServerError)
            }
        }()
        next.ServeHTTP(w, r)
    })
}

func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("GET /api/users", listUsers)
    mux.HandleFunc("POST /api/users", createUser)

    handler := recoverMiddleware(loggingMiddleware(mux))
    server := &http.Server{
        Addr:         ":8080",
        Handler:      handler,
        ReadTimeout:  10 * time.Second,
        WriteTimeout: 10 * time.Second,
        IdleTimeout:  60 * time.Second,
    }

    slog.Info("server starting", "addr", server.Addr)
    if err := server.ListenAndServe(); err != nil {
        slog.Error("server error", "error", err)
    }
}
```

## Concurrency Patterns — Pipeline
```go
// Pipeline: generator -> stage1 -> stage2 -> consumer
func gen(nums ...int) <-chan int {
    out := make(chan int)
    go func() {
        for _, n := range nums {
            out <- n
        }
        close(out)
    }()
    return out
}

func sq(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        for n := range in {
            out <- n * n
        }
        close(out)
    }()
    return out
}

func main() {
    c := gen(2, 3, 4)
    out := sq(c)
    for n := range out {
        fmt.Println(n) // 4, 9, 16
    }
}
```

## Testing — Table-Driven with Subtests
```go
func TestParseDuration(t *testing.T) {
    tests := []struct {
        name  string
        input string
        want  time.Duration
        err   bool
    }{
        {name: "seconds", input: "30s", want: 30 * time.Second},
        {name: "minutes", input: "5m", want: 5 * time.Minute},
        {name: "invalid", input: "xyz", err: true},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := parseDuration(tt.input)
            if tt.err {
                assert.Error(t, err)
            } else {
                assert.NoError(t, err)
                assert.Equal(t, tt.want, got)
            }
        })
    }
}
```

## References
- `references/context-cancellation.md` — Context propagation, timeout, cancellation patterns
- `references/testing-benchmarking.md` — Testing, benchmarking, fuzzing, coverage
- `references/go-fundamentals.md` — Go Fundamentals
- `references/go-advanced.md` — Advanced Go Patterns
- `references/go-http-server.md` — Go HTTP Server Patterns

## Implementation Patterns

### Pattern: Resilient HTTP Client with Retry and Circuit Breaker

```go
package client

import (
    "context"
    "fmt"
    "math/rand"
    "net/http"
    "time"
)

type CircuitBreaker struct {
    failures    int
    threshold   int
    resetAfter  time.Duration
    lastFailure time.Time
    halfOpen    bool
}

func (cb *CircuitBreaker) Call(ctx context.Context, fn func(context.Context) error) error {
    if cb.failures >= cb.threshold && time.Since(cb.lastFailure) < cb.resetAfter {
        return fmt.Errorf("circuit open")
    }
    err := fn(ctx)
    if err != nil {
        cb.failures++
        cb.lastFailure = time.Now()
        return err
    }
    cb.failures = 0
    return nil
}

func RetryBackoff(ctx context.Context, maxRetries int, fn func(context.Context) error) error {
    for i := range maxRetries {
        err := fn(ctx)
        if err == nil {
            return nil
        }
        if i == maxRetries-1 {
            return err
        }
        delay := time.Duration(100*(1<<i)+rand.Intn(100)) * time.Millisecond
        select {
        case <-ctx.Done():
            return ctx.Err()
        case <-time.After(delay):
        }
    }
    return nil
}
```

### Pattern: Middleware Chain with Context Values

```go
package middleware

import (
    "context"
    "log/slog"
    "net/http"
    "time"
)

type ctxKey string
const RequestIDKey ctxKey = "request_id"

func RequestID(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        id := r.Header.Get("X-Request-ID")
        if id == "" {
            id = fmt.Sprintf("%d", time.Now().UnixNano())
        }
        ctx := context.WithValue(r.Context(), RequestIDKey, id)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

func Logger(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        wrapped := &responseWriter{ResponseWriter: w, status: 200}
        next.ServeHTTP(wrapped, r)
        slog.InfoContext(r.Context(), "request",
            "method", r.Method, "path", r.URL.Path,
            "status", wrapped.status, "duration", time.Since(start).Milliseconds(),
        )
    })
}
```

## Production Considerations

### Graceful Shutdown with Context Propagation
- `http.Server.Shutdown()` with `context.WithTimeout(ctx, 30s)` — wait for in-flight requests.
- Signal handling: SIGTERM → stop listener → wait for active requests → close connections.
- Worker pools: close input channel → `sync.WaitGroup.Wait()` → close output channel.
- Database connections: `sql.DB.Close()` blocks until pool drained. Call in shutdown defer.

### Observability
- pprof endpoints: only on internal port (not exposed publicly). Restricted to admin network.
- slog structured logging with `slog.HandlerOptions{Level: slog.LevelInfo}` in prod, `LevelDebug` in dev.
- Metrics: Prometheus `promhttp.Handler()` at `/metrics`. Histogram for request duration, counter for errors.
- Tracing: OpenTelemetry Go SDK with OTLP exporter. Propagate trace context via HTTP headers.

## Anti-Patterns

| Anti-Pattern | Why It Hurts | Fix |
|---|---|---|
| `context.Background()` in library code | Never cancelled. Leaks goroutines on caller shutdown. | Accept `context.Context` as first param. Propagate. |
| `init()` for registration | Implicit side effect. Can't test registration. | Register in main() or use `go:generate`. |
| Embedding `sync.Mutex` publicly | Exposes Lock/Unlock. Breaks encapsulation. | `type safeMap struct { mu sync.Mutex; m map[string]T }` |
| `io.ReadAll` without limit | OOM on large response. | `io.LimitReader(r, maxSize)` |
| `defer db.Close()` in function | DB connection stays open until function returns. | Return DB connection to pool explicitly. |
| Writing to `http.ResponseWriter` after handler return | Panic. | Check `wroteHeader` flag. |

## Performance Optimization

- `sync.Pool` for temporary structs in high-throughput handlers. Reduces GC pressure by 30-50%.
- Pre-allocate slices: `make([]T, 0, expectedCap)` avoids multiple reallocations.
- String concatenation: `strings.Builder` for many concatenations. Single `+` for 2-3 strings.
- `encoding/json` vs `jsoniter`: stdlib is fine for most. Use `jsoniter` only under profiling evidence.
- `runtime.GOMAXPROCS(N)` set to CPU quota in containerized environments (prevents over-subscription).
- Memory pooling with `sync.Pool` for buffer reuse in HTTP response parsing.
- Goroutine pool with errgroup for fan-out operations. Cap at `runtime.NumCPU() * 2`.

## Security Considerations

- SQL injection: parameterized queries only. `db.QueryContext(ctx, "SELECT * FROM users WHERE id = $1", id)`.
- XSS: `html/template` auto-escapes. React/Next.js also handle. Raw `text/template` does NOT.
- CSRF: `gorilla/csrf` or `nosurf`. Token in cookie + form header.
- JWT validation: `golang-jwt/jwt/v5`. Verify `alg`, `exp`, `iss`. Reject `alg: none`.
- Rate limiting: `golang.org/x/time/rate` per-IP limiter. Per-user in authenticated routes.
- CORS: `rs/cors` with explicit origins. Never `*` for authenticated endpoints.
- TLS: `http.Server{TLSConfig: &tls.Config{MinVersion: tls.VersionTLS12}}`.
- Secrets: read from env vars at startup. Never in source code or binary.
- Dependency scanning: `govulncheck ./...` in CI. Block on critical vulnerabilities.
