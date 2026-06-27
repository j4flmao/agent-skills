---
name: golang-patterns
description: >
  Use this skill when the user says 'Go goroutine', 'Go concurrency', 'Go channel', 'Go error handling', 'Go HTTP', 'Go middleware', 'Go context', 'Go worker pool', 'Go mutex', 'Go select', or when implementing Go-specific patterns. This skill enforces: goroutine lifecycle (every goroutine has a stop condition), errgroup for parallel work, error wrapping, HTTP handler DI via struct/closure, and graceful shutdown. Requires Go (go.mod). Do NOT use for: Go project structure, interface design, or non-Go patterns.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, golang, phase-2, concurrency]
---

# Golang Patterns

## Purpose
Implement Go concurrency, error handling, and HTTP server patterns correctly. Every goroutine has a stop condition. Every error is wrapped. Every server shuts down gracefully.

## Agent Protocol

### Trigger
Exact user phrases: "Go goroutine", "Go concurrency", "Go channel", "Go error handling", "Go HTTP", "Go middleware", "Go context", "Go worker pool", "Go mutex", "Go select", "Go graceful shutdown".

### Input Context
Before activating, verify:
- The pattern being implemented is known (worker pool, graceful shutdown, fan-out, etc.).
- go.mod exists.

### Output Artifact
No file output. Produces code examples as text.

### Response Format
```
Pattern: {name}
Problem: {what this solves}
Code:
{implementation}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Every goroutine has a context-based stop condition.
- [ ] errgroup used for parallel work with error propagation.
- [ ] Errors wrapped with context using fmt.Errorf("...%w").
- [ ] HTTP handlers receive dependencies via struct or closure.
- [ ] Graceful shutdown implemented with signal.NotifyContext.
- [ ] Channels have clear ownership (creator closes, receiver reads).
- [ ] No time.Sleep() for synchronization.

### Max Response Length
Per pattern: 20 lines of code + 2 lines explanation.

## Architecture Decision Trees

### Concurrency Pattern Selection

| Pattern | Use Case | Channel Type | Goroutine Count |
|---------|----------|-------------|-----------------|
| Worker Pool | Fixed-size task processing | Buffered | Fixed (N workers) |
| Fan-Out | Distribute work to parallel consumers | Unbuffered | Dynamic |
| Fan-In | Merge results from multiple sources | Buffered merge | 1 merger + N producers |
| Pipeline | Sequential processing stages | Unbuffered | 1 per stage |
| Pub/Sub | Broadcast to multiple consumers | Buffered per sub | 1 per subscriber |

Decision: Fixed rate-limited processing → Worker Pool. Parallel independent tasks → Fan-Out/Fan-In. Sequential transformations → Pipeline. Event broadcast → Pub/Sub.

### Error Propagation Strategy

| Strategy | Mechanism | Best For |
|----------|-----------|----------|
| errgroup | First error cancels group | Parallel independent tasks |
| Result channel | Errors sent alongside results | Fan-In patterns |
| Custom error aggregator | Collect all errors | Batch validation |
| panic/recover | Fatal unexpected errors | Library boundaries only |

Decision: Fail-fast parallel work → errgroup. Continue-on-error collection → Result channel.

## Workflow

### Step 1: Goroutine Lifecycle
Every goroutine must have a mechanism to stop. Never start a goroutine without a done/cancel signal.
```go
ctx, cancel := context.WithCancel(context.Background())
defer cancel()

go func() {
  for {
    select {
    case <-ctx.Done():
      return
    case job := <-jobChan:
      process(job)
    }
  }
}()
```

### Step 2: errgroup for Parallel Work
```go
g, ctx := errgroup.WithContext(context.Background())

for _, item := range items {
  item := item
  g.Go(func() error {
    result, err := processItem(ctx, item)
    if err != nil {
      return fmt.Errorf("process item %d: %w", item.ID, err)
    }
    results = append(results, result)
    return nil
  })
}

if err := g.Wait(); err != nil {
  return fmt.Errorf("batch processing failed: %w", err)
}
```

### Step 3: Channel Ownership
- The sender creates and closes the channel.
- The receiver only reads from the channel.
- Never close a channel on the receiver side.
- Never write to a closed channel (panics).

```go
func producer(ctx context.Context, items []Work) <-chan Work {
  out := make(chan Work)
  go func() {
    defer close(out)
    for _, item := range items {
      select {
      case <-ctx.Done():
        return
      case out <- item:
      }
    }
  }()
  return out
}
```

### Step 4: HTTP Handler DI
```go
// Struct-based DI
type UserHandler struct {
  createUser *application.CreateUserUseCase
  getUser    *application.GetUserUseCase
}

func NewUserHandler(createUser *application.CreateUserUseCase, getUser *application.GetUserUseCase) *UserHandler {
  return &UserHandler{createUser, getUser}
}

func (h *UserHandler) Create(w http.ResponseWriter, r *http.Request) {
  var dto application.CreateUserDTO
  if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
    writeError(w, http.StatusBadRequest, "INVALID_JSON", err.Error())
    return
  }
  user, err := h.createUser.Execute(r.Context(), dto)
  if err != nil {
    writeError(w, http.StatusInternalServerError, "INTERNAL", err.Error())
    return
  }
  writeJSON(w, http.StatusCreated, user)
}

// Closure-based DI (simpler)
func NewCreateHandler(uc *application.CreateUserUseCase) http.HandlerFunc {
  return func(w http.ResponseWriter, r *http.Request) {
    var dto application.CreateUserDTO
    if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
      writeError(w, http.StatusBadRequest, "INVALID_JSON", err.Error())
      return
    }
    user, err := uc.Execute(r.Context(), dto)
    if err != nil {
      writeError(w, http.StatusInternalServerError, "INTERNAL", err.Error())
      return
    }
    writeJSON(w, http.StatusCreated, user)
  }
}
```

### Step 5: Graceful Shutdown
```go
ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
defer stop()

server := &http.Server{Addr: ":8080", Handler: mux}
go func() {
  if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
    log.Fatalf("server error: %v", err)
  }
}()

<-ctx.Done()

shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
defer cancel()

if err := server.Shutdown(shutdownCtx); err != nil {
  log.Fatalf("shutdown error: %v", err)
}
```

### Step 6: Worker Pool Pattern

```go
type WorkerPool struct {
  jobs    chan Job
  results chan Result
  workers int
}

func NewWorkerPool(workers int) *WorkerPool {
  return &WorkerPool{
    jobs:    make(chan Job, 100),
    results: make(chan Result, 100),
    workers: workers,
  }
}

func (wp *WorkerPool) Start(ctx context.Context) {
  for i := 0; i < wp.workers; i++ {
    go func(id int) {
      for {
        select {
        case <-ctx.Done():
          return
        case job, ok := <-wp.jobs:
          if !ok {
            return
          }
          wp.results <- processJob(job)
        }
      }
    }(i)
  }
}

func (wp *WorkerPool) Submit(job Job) {
  wp.jobs <- job
}

func (wp *WorkerPool) Results() <-chan Result {
  return wp.results
}

func (wp *WorkerPool) Stop() {
  close(wp.jobs)
}
```

### Step 7: Fan-Out/Fan-In Pattern

```go
func fanOut(ctx context.Context, source <-chan Work, n int) []<-chan Work {
  workers := make([]<-chan Work, n)
  for i := 0; i < n; i++ {
    workers[i] = worker(ctx, source)
  }
  return workers
}

func worker(ctx context.Context, jobs <-chan Work) <-chan Work {
  results := make(chan Work)
  go func() {
    defer close(results)
    for j := range jobs {
      select {
      case <-ctx.Done():
        return
      case results <- process(j):
      }
    }
  }()
  return results
}

func fanIn(ctx context.Context, channels []<-chan Work) <-chan Work {
  out := make(chan Work)
  var wg sync.WaitGroup
  for _, ch := range channels {
    wg.Add(1)
    go func(c <-chan Work) {
      defer wg.Done()
      for v := range c {
        select {
        case <-ctx.Done():
          return
        case out <- v:
        }
      }
    }(ch)
  }
  go func() {
    wg.Wait()
    close(out)
  }()
  return out
}
```

## Implementation Patterns

### Pattern: Middleware Chain

```go
type Middleware func(http.Handler) http.Handler

func Chain(h http.Handler, middleware ...Middleware) http.Handler {
  for i := len(middleware) - 1; i >= 0; i-- {
    h = middleware[i](h)
  }
  return h
}

// Usage
handler := Chain(
  userHandler,
  LoggerMiddleware,
  AuthMiddleware("admin"),
  RateLimitMiddleware(100),
)
```

### Pattern: Context Values for Request Scope

```go
type contextKey string

const UserIDKey contextKey = "user_id"

func WithUserID(ctx context.Context, id string) context.Context {
  return context.WithValue(ctx, UserIDKey, id)
}

func UserIDFromContext(ctx context.Context) (string, bool) {
  id, ok := ctx.Value(UserIDKey).(string)
  return id, ok
}
```

## Production Considerations

### Memory Management
- `sync.Pool` for frequently allocated, short-lived objects (request contexts, buffers)
- Pre-allocate slices with `make([]T, 0, capacity)` when capacity is known
- Use `runtime.GC()` only after known allocations (unit tests), never in production
- Profile with `pprof` — CPU, heap, goroutine, mutex profiles

### Logging
```go
// Structured logging with slog (Go 1.21+)
log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
  Level: slog.LevelInfo,
}))
log.Info("request completed", "method", r.Method, "path", r.URL.Path, "status", 200, "duration", time.Since(start))
```

## Anti-Patterns

| Anti-Pattern | Why | Fix |
|-------------|-----|-----|
| `time.Sleep` for synchronization | Flaky tests, wasted time | Use channels, WaitGroup, errgroup |
| `context.Background()` in library code | Never cancellable | Pass context from caller |
| Closing channel from receiver | Panics sender | Creator closes, receiver reads |
| `panic` in non-recoverable position | Crashes process | Return error instead |
| Global `sync.WaitGroup` | Unclear ownership | Scoped to function/call |
| `select` without default on single channel | Blocks forever | Use `for range` or single `<-ch` |

## Security Considerations
- Timeouts on all external calls: `context.WithTimeout` for database and HTTP requests
- HTTP handler: set `ReadHeaderTimeout`, `ReadTimeout`, `WriteTimeout`, `IdleTimeout` on server
- Validate and sanitize all handler inputs before passing to domain
- Rate limit at HTTP middleware level, not per-goroutine

## Testing Strategies

### Testing Concurrency
```go
func TestWorkerPool_ProcessesAllJobs(t *testing.T) {
  pool := NewWorkerPool(3)
  ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
  defer cancel()
  pool.Start(ctx)

  for i := 0; i < 10; i++ {
    pool.Submit(Job{ID: i})
  }

  results := make([]Result, 0, 10)
  for i := 0; i < 10; i++ {
    select {
    case r := <-pool.Results():
      results = append(results, r)
    case <-ctx.Done():
      t.Fatal("timeout waiting for results")
    }
  }
  assert.Len(t, results, 10)
}
```

### Race Detection
Always run with `-race` flag: `go test -race ./...`. Use `sync.WaitGroup` or `errgroup` for coordination. Never use `atomic` as a substitute for proper synchronization design.

## Rules
- Never start a goroutine without knowing how it will stop. context cancellation is the standard mechanism.
- Use sync.WaitGroup or errgroup for synchronization. Never time.Sleep to wait for goroutines.
- The creator of a channel is responsible for closing it. Not the consumer.
- Always wrap errors with context: fmt.Errorf("load config: %w", err). "file not found" is useless without context.
- context.Background() is used only at the entry point (main, request handler). Use context.TODO() during migration.
- Never copy a sync.Mutex. Always pass as pointer.
- Run `go vet` and `-race` in CI — catch deadlocks and data races before they reach production.

## References
  - references/concurrency-patterns.md — Go Concurrency Patterns
  - references/error-handling.md — Go Error Handling
  - references/go-cli-patterns.md — Go CLI Application Patterns
  - references/go-microservices.md — Go Microservices Patterns
  - references/go-middleware.md — Go HTTP Middleware Patterns
  - references/http-server.md — Go HTTP Server
## Handoff
No artifact produced.
Next skill: backend-testing — test Go patterns.
Carry forward: concurrency model, HTTP handler DI pattern, graceful shutdown.
## Implementation Patterns

### Factory Pattern for Module Creation
`
function createModule<T>(config: ModuleConfig): T {
  const dependencies = initializeDependencies(config);
  const module = new Module(dependencies);
  module.hooks.onInit();
  return module as T;
}
`

### Builder Pattern for Complex Configuration
`
class ConfigBuilder {
  private config: AppConfig = new AppConfig();
  withDatabase(url: string): ConfigBuilder { ... }
  withCache(ttl: number): ConfigBuilder { ... }
  withLogging(level: string): ConfigBuilder { ... }
  build(): AppConfig { return this.config; }
}
`

## Production Considerations

### Deployment Checklist
- [ ] Production build with optimizations enabled
- [ ] Environment variables configured per environment
- [ ] Health check endpoint responds correctly
- [ ] Error tracking and monitoring integrated
- [ ] Logging level configured (not debug in production)
- [ ] Resource limits configured
- [ ] Database migrations applied
- [ ] Static assets built and served from CDN or cache
- [ ] Feature flags toggled appropriately
- [ ] Rollback plan documented and tested

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% | Critical | Rollback or fix |
| p95 latency | > 500ms | Warning | Profile and optimize |
| Uptime | < 99.9% | Critical | Investigate infrastructure |
| Memory usage | > 80% | Warning | Check for leaks |
| CPU usage | > 80% | Warning | Scale up or optimize |

## Rules
- Prefer composition over inheritance
- Favor immutable data structures
- Use dependency injection for testability
- Keep functions pure when possible — no side effects
- Fail fast with clear error messages
- Don't repeat yourself (DRY) — extract shared logic
- Keep it simple (KISS) — avoid unnecessary complexity
- You aren't gonna need it (YAGNI) — build what's required
- Separate concerns — single responsibility per module
- Code to interfaces, not implementations
- Write self-documenting code — clear names over comments
- Prefer standard library over third-party dependencies
- Handle errors explicitly — no silent failures
- Validate inputs at boundaries
- Log at appropriate levels (debug, info, warn, error)

## Implementation Patterns

### Pattern: Options Function

```go
type ServerOption func(*Server)

func WithPort(port int) ServerOption {
    return func(s *Server) {
        s.port = port
    }
}

func WithTimeout(d time.Duration) ServerOption {
    return func(s *Server) {
        s.timeout = d
    }
}

func NewServer(opts ...ServerOption) *Server {
    s := &Server{port: 8080, timeout: 30 * time.Second}
    for _, opt := range opts {
        opt(s)
    }
    return s
}
```

### Pattern: Worker Pool

```go
type Pool struct {
    jobs    chan Job
    results chan Result
    done    chan struct{}
}

func NewPool(numWorkers int) *Pool {
    p := &Pool{
        jobs:    make(chan Job, 100),
        results: make(chan Result, 100),
        done:    make(chan struct{}),
    }
    for i := 0; i < numWorkers; i++ {
        go p.worker()
    }
    return p
}

func (p *Pool) worker() {
    for job := range p.jobs {
        result := job.Execute()
        p.results <- result
    }
}
```

## Production Considerations

- Graceful shutdown: `signal.NotifyContext` for SIGINT/SIGTERM. Drain connections before exit.
- Panic recovery: middleware recovers panics. Log stack trace. Return 500.
- Resource limits: `GOMAXPROCS` set to CPU limit in container. `ulimit -n` for file descriptors.
- Memory: Go runtime GC triggered by heap growth. Monitor `go_memstats_alloc_bytes`.
- Goroutine leaks: ensure goroutines exit. Use `context.Context` for cancellation.
- Profiling: `pprof` endpoints behind admin guard. CPU and heap profiles on demand.
- Build: `-ldflags="-s -w"` for smaller binaries. `-trimpath` for reproducible builds.

## Anti-Patterns

| Anti-Pattern | Why It Hurts | Fix |
|---|---|---|
| Global state | Race conditions. Untestable. | Dependency injection. Pass dependencies explicitly. |
| Background goroutines without cleanup | Leaked goroutines. | `errgroup.WithContext` for lifecycle management. |
| `context.Background()` everywhere | No cancellation propagation. | Derive context from request. Pass through call chain. |
| Interface pollution | Many single-method interfaces. | Define interfaces where they're consumed, not produced. |
| `recover()` outside deferred func | Panic not caught. | Always use `defer recover()` in goroutine entry points. |
| Deep package nesting | Import cycles. Hard to navigate. | Flat or shallow package layout. `internal/` for private code. |

## Performance Optimization

- `json.Marshal` / `json.Unmarshal` with `json.Encoder`/`json.Decoder` for streams.
- `sync.Pool` for frequently allocated objects. Reduces GC pressure.
- `strings.Builder` over bytes.Buffer for string concatenation.
- Pre-allocate slices with `make([]T, 0, capacity)` when size is known.
- Use `map` with struct keys over string keys for structured lookups.
- `io.Copy` with `io.Pipe` for streaming transformations.
- Escape analysis: prefer value receivers. Check with `-gcflags="-m"`.
- `runtime.GOMAXPROCS(0)` matches CPU quota. No oversubscription.
- Profile-guided optimization with `-PGO` flag in Go 1.21+.

## Security Considerations

- Input validation: `validator` package for struct tags. Always validate at boundaries.
- SQL injection: parameterized queries with `database/sql`. Never string concatenation.
- XSS: `html/template` auto-escapes. Never use `template.HTML` with user input.
- CSRF: token-based protection for web apps. Double-submit cookie pattern.
- Secrets: environment variables or vault. Never hardcode. `os.Getenv` with defaults.
- TLS: `http.Server` with `TLSConfig`. Minimum TLS 1.2. Strong cipher suites.
- Rate limiting: token bucket per client IP. Sliding window for authenticated users.
- CORS: `rs/cors` middleware. Allow specific origins only.
- Authentication: JWT with `golang-jwt/jwt`. Short expiry. Refresh token rotation.
## Performance Optimization

### Caching Strategy
Cache hierarchy: L1 (in-memory local) → L2 (distributed Redis/Memcached) → L3 (CDN/Edge).
Cache invalidation: TTL-based (simple, stale), event-based (complex, fresh), write-through (consistent, higher write latency), write-behind (fast writes, eventual consistency).

### Resource Pooling
- Database connections: Pool of reusable connections (HikariCP, pgBouncer)
- HTTP connections: Keep-alive + connection pooling for external calls
- Thread pool: Bounded thread pools for async task execution

### Profiling Methodology
1. Establish baseline with production traffic profile
2. Profile CPU with sampling profiler (pprof, perf, async-profiler)
3. Profile memory with heap dumps and allocation tracking
4. Profile I/O with strace/perf trace for syscall analysis
5. Profile latency with distributed tracing (OpenTelemetry)
6. Identify bottleneck, formulate hypothesis, implement fix
7. Re-profile to verify improvement, repeat

## Security Considerations

### Threat Modeling (STRIDE)
- Spoofing: Identity validation, authentication
- Tampering: Integrity checks, digital signatures
- Repudiation: Audit logs, non-repudiation
- Information disclosure: Encryption, access control
- Denial of service: Rate limiting, resource quotas
- Elevation of privilege: Principle of least privilege

### Supply Chain Security
- Dependency scanning: Snyk, Dependabot, Trivy
- SBOM generation: CycloneDX or SPDX format
- Signed commits: GPG or SSH commit signing
- Artifact verification: Checksum validation, signature verification

### Secrets Management
- Secrets never in code — always in secrets manager (Vault, AWS Secrets Manager)
- Rotation policy: Rotate database credentials every 90 days
- Access audit: Log every secrets access, alert on anomalies
- Encryption at rest and in transit for all secrets
- Principle of least privilege: each service gets only its own secrets