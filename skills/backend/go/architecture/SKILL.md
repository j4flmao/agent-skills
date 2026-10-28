---
name: golang-architecture
description: >
  Use this skill when the user says 'Go project structure', 'Golang architecture', 'Go package layout', 'Go clean arch', 'Go folder structure', 'Go module design', 'Go interface design', or when structuring a Go application. This skill enforces: standard Go project layout (cmd/internal/pkg), Clean Architecture with interfaces defined at the consumer side, internal package enforcement, package naming rules, and error handling architecture. Requires go.mod. Do NOT use for: Go concurrency patterns, HTTP handler implementation, or non-Go stacks.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, golang, phase-2]
---

# Golang Architecture

## Purpose
Structure Go applications with standard project layout. Interfaces defined by consumers. Dependencies flow inward. Internal packages enforced by compiler.

## Agent Protocol

### Trigger
Exact user phrases: "Go project structure", "Golang architecture", "Go package layout", "Go clean arch", "Go folder structure", "Go module design", "Go interface design", "Go project layout".

### Input Context
Before activating, verify:
- go.mod exists at project root.
- The module name is known.

### Output Artifact
No file output. Produces folder structure and code examples as text.

### Response Format
Folder structure:
```
{project}/
  cmd/{service}/main.go
  internal/
    domain/
    application/
    infrastructure/
    config/
  pkg/
  api/
```

Code: show relevant package and types only. No imports lines.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] cmd/ contains only entry points (parse flags, build deps, start server).
- [ ] internal/ contains all application code (compiler-enforced).
- [ ] Domain has zero imports from infrastructure.
- [ ] Interfaces defined by consumers (domain/application), not implementers (infrastructure).
- [ ] Package names are short, lowercase, no underscores.
- [ ] No init() functions used.
- [ ] context.Context is first parameter in all I/O functions.

### Max Response Length
Folder structure: unlimited. Code: 15 lines per example.

## Architecture Decision Trees

### Project Layout: Standard vs Flat vs Hexagonal

| Criterion | Standard (cmd/internal/pkg) | Flat | Hexagonal (ports/adapters) |
|-----------|----------------------------|------|---------------------------|
| Package count | 10+ packages | 1-5 packages | 15+ packages |
| Dependency clarity | Internal enforces boundaries | Manual discipline | Explicit port/adapter |
| Team size | 3+ developers | 1-2 developers | 5+ developers |
| Testing | Unit per package, integration per infra | Package-level | Port-mockable |
| Build time | Slightly slower (many packages) | Fastest | Slower |

Decision: Multi-developer project with clear boundaries → Standard. Small tool/CLI → Flat. Large system with multiple adapters → Hexagonal.

### Interface Definition Placement

| Approach | Consumer | Implementer | Best For |
|----------|----------|-------------|----------|
| Consumer-side | Domain defines repo interface | Infrastructure implements | Clean Architecture |
| Implementer-side | Infrastructure exposes interface | Inferface next to impl | Simple CRUD, libraries |
| Shared | Separate `domain` package | Separate `impl` package | Large microservices |

Decision: Business logic depends on interface → Consumer-side. Library/external-facade → Implementer-side.

## Workflow

### Step 1: Create Standard Layout
```
cmd/
  server/
    main.go                    -- Entry point. Parse flags, build deps, start server. No logic.
internal/
  domain/
    entity.go                  -- Domain entities
    repository.go              -- Repository interfaces (ports)
    service.go                 -- Domain services
  application/
    usecase.go                 -- Use case interfaces + implementations
    dto.go                     -- Data transfer objects
  infrastructure/
    postgres/
      repository.go            -- Repository implementations
    http/
      handler.go               -- HTTP handlers
  config/
    config.go                  -- Configuration
pkg/                           -- Shared libraries (importable by external modules)
api/                           -- API definitions (OpenAPI, protobuf)
migrations/
```

### Step 2: Define Interfaces at Consumer Side
```go
// internal/domain/repository.go -- Interface defined by domain
type UserRepository interface {
  FindByID(ctx context.Context, id uuid.UUID) (*User, error)
  Save(ctx context.Context, user *User) error
  FindByEmail(ctx context.Context, email string) (*User, error)
  List(ctx context.Context, offset, limit int) ([]User, int, error)
}

// internal/domain/service.go -- Domain service
type UserService struct {
  repo UserRepository
}

func NewUserService(repo UserRepository) *UserService {
  return &UserService{repo: repo}
}

func (s *UserService) Register(ctx context.Context, email, name string) (*User, error) {
  id, err := uuid.NewV7() // time-ordered IDs keep B-tree inserts sequential
  if err != nil {
    return nil, fmt.Errorf("register user: generate id: %w", err)
  }
  user := User{ID: id, Email: email, Name: name, Active: true}
  // No "find then insert": the UNIQUE(email) constraint decides. The repository
  // translates the unique-violation error into ErrEmailAlreadyExists.
  if err := s.repo.Save(ctx, &user); err != nil {
    return nil, fmt.Errorf("register user %s: %w", email, err)
  }
  return &user, nil
}

// internal/infrastructure/postgres/repository.go -- Implements domain interface
type PostgresUserRepository struct {
  db *sql.DB
}

func NewPostgresUserRepository(db *sql.DB) *PostgresUserRepository {
  return &PostgresUserRepository{db: db}
}

func (r *PostgresUserRepository) FindByID(ctx context.Context, id uuid.UUID) (*User, error) {
  row := r.db.QueryRowContext(ctx, "SELECT id, email, name, active, created_at FROM users WHERE id = $1", id)
  user := &User{}
  err := row.Scan(&user.ID, &user.Email, &user.Name, &user.Active, &user.CreatedAt)
  if errors.Is(err, sql.ErrNoRows) {
    return nil, fmt.Errorf("find user %s: %w", id, ErrUserNotFound)
  }
  if err != nil {
    return nil, fmt.Errorf("find user %s: %w", id, err)
  }
  return user, nil
}
```

### Step 3: Wire Dependencies in main.go
```go
// import httpapi ".../internal/infrastructure/http" -- alias avoids clashing with net/http
func main() {
  cfg, err := config.Load()
  if err != nil {
    log.Fatalf("config: %v", err)
  }
  db, err := sql.Open("pgx", cfg.DatabaseURL) // driver: github.com/jackc/pgx/v5/stdlib
  if err != nil {
    log.Fatalf("open db: %v", err)
  }
  defer db.Close()

  userRepo := postgres.NewPostgresUserRepository(db)
  userService := domain.NewUserService(userRepo)
  createUserUC := application.NewCreateUserUseCase(userService)
  handler := httpapi.NewUserHandler(createUserUC)

  server := &http.Server{
    Addr:              ":" + cfg.Port,
    Handler:           handler,
    ReadHeaderTimeout: 5 * time.Second, // mitigates slowloris
  }

  // Graceful shutdown
  ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
  defer stop()
  go func() {
    if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
      log.Fatalf("server error: %v", err)
    }
  }()
  <-ctx.Done()
  shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
  defer cancel()
  if err := server.Shutdown(shutdownCtx); err != nil {
    log.Printf("graceful shutdown failed: %v", err)
  }
}
```

### Step 4: Package Naming Rules
- Short, lowercase, no underscores: user, order, payment.
- Single-word names preferred. If multi-word: userrepo not user_repository.
- No utility packages named utils/ or common/. Find a specific name.
- internal/ packages cannot be imported by external modules (enforced by Go compiler).
- Package name matches directory name — no exceptions.

### Step 5: Error Handling Architecture
```go
// internal/domain/errors.go -- sentinel errors
var (
  ErrUserNotFound      = errors.New("user not found")
  ErrEmailAlreadyExists = errors.New("email already exists")
  ErrValidation         = errors.New("validation error")
)

// internal/application -- wrap with context
func (uc *CreateUserUseCase) Execute(ctx context.Context, dto CreateUserDTO) (*UserDTO, error) {
  if err := dto.Validate(); err != nil {
    return nil, fmt.Errorf("create user: %w", domain.ErrValidation)
  }
  user, err := uc.userService.Register(ctx, dto.Email, dto.Name)
  if err != nil {
    return nil, fmt.Errorf("create user: %w", err)
  }
  return toDTO(user), nil
}

// internal/infrastructure/http -- map to HTTP
func errorResponse(w http.ResponseWriter, err error) {
  switch {
  case errors.Is(err, domain.ErrUserNotFound):
    writeJSON(w, http.StatusNotFound, ErrorResponse{Code: "NOT_FOUND", Message: err.Error()})
  case errors.Is(err, domain.ErrEmailAlreadyExists):
    writeJSON(w, http.StatusConflict, ErrorResponse{Code: "CONFLICT", Message: err.Error()})
  case errors.Is(err, domain.ErrValidation):
    writeJSON(w, http.StatusBadRequest, ErrorResponse{Code: "VALIDATION_ERROR", Message: err.Error()})
  default:
    log.Printf("unhandled error: %v", err)
    writeJSON(w, http.StatusInternalServerError, ErrorResponse{Code: "INTERNAL", Message: "An error occurred"})
  }
}
```

## Implementation Patterns

### Pattern: Config with envconfig

```go
// internal/config/config.go
type Config struct {
  Port        string `envconfig:"PORT" default:"8080"`
  DatabaseURL string `envconfig:"DATABASE_URL" required:"true"`
  LogLevel    string `envconfig:"LOG_LEVEL" default:"info"`
  JWTSecret   string `envconfig:"JWT_SECRET" required:"true"`
  RedisURL    string `envconfig:"REDIS_URL"`
}

func Load() (*Config, error) {
  var cfg Config
  if err := envconfig.Process("", &cfg); err != nil {
    return nil, fmt.Errorf("load config: %w", err)
  }
  return &cfg, nil
}
```

### Pattern: Health Check Endpoint

```go
// internal/infrastructure/http/health.go
type HealthHandler struct {
	db *sql.DB
}

func (h *HealthHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if err := h.db.PingContext(r.Context()); err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"status": "unhealthy", "error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "healthy"})
}
```

### Pattern: Repository with Transaction Support

```go
// internal/infrastructure/postgres/tx.go
// DBTX is satisfied by both *sql.DB and *sql.Tx (same shape sqlc generates).
type DBTX interface {
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
	QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error)
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
}

type Store struct{ db *sql.DB }

// WithTx runs fn inside one transaction; repositories built from q share it.
func (s *Store) WithTx(ctx context.Context, fn func(q DBTX) error) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	if err := fn(tx); err != nil {
		if rbErr := tx.Rollback(); rbErr != nil {
			return errors.Join(err, fmt.Errorf("rollback: %w", rbErr))
		}
		return err
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit tx: %w", err)
	}
	return nil
}

// Usage: the application layer depends on a TxRunner interface, not on *sql.Tx.
func (s *Store) CreateUserWithAudit(ctx context.Context, u *User) error {
	return s.WithTx(ctx, func(q DBTX) error {
		if _, err := q.ExecContext(ctx,
			`INSERT INTO users (id, email, name) VALUES ($1, $2, $3)`, u.ID, u.Email, u.Name); err != nil {
			return fmt.Errorf("insert user %s: %w", u.ID, err)
		}
		_, err := q.ExecContext(ctx,
			`INSERT INTO audit_log (entity_id, action) VALUES ($1, 'created')`, u.ID)
		return err
	})
}
```

### Pattern: Structured Logging Middleware

```go
// internal/infrastructure/http/middleware.go
type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

func LoggingMiddleware(log *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			rw := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
			next.ServeHTTP(rw, r)
			log.InfoContext(r.Context(), "HTTP request",
				"method", r.Method,
				"path", r.URL.Path,
				"status", rw.statusCode,
				"duration", time.Since(start).String(),
				"ip", r.RemoteAddr,
			)
		})
	}
}
```

## Production Considerations

### Graceful Shutdown Checklist
- Close database connections
- Flush pending logs
- Complete in-flight requests (shutdownCtx timeout)
- Close message queue consumers
- Release file locks

### Performance
- Use `pgx` (native `pgxpool`, or `pgx/v5/stdlib` with `database/sql`) for PostgreSQL; consider `sqlc` to generate type-safe query code
- Prefer `sync.Pool` for frequently allocated objects
- Profile with `pprof` — import `net/http/pprof` behind a build tag
- Connection pool settings: `SetMaxOpenConns(25)`, `SetMaxIdleConns(10)`, `SetConnMaxLifetime(5*time.Minute)`

## Anti-Patterns

| Anti-Pattern | Why | Fix |
|-------------|-----|-----|
| `init()` functions | Unclear execution order, hard to test | Explicit initialization in `main()` |
| `utils`/`common` packages | Dependency magnet, unclear purpose | Specific package names |
| Package names != dir name | Confusing imports | Match package name to directory |
| Interface on implementer side | Extra indirection, violates DI principle | Interface at consumer side |
| `context.Background` in libs | Never cancelled | Accept `context.Context` from caller |
| Global variables | Hidden dependencies, race conditions | Pass via struct fields or parameters |

## Security Considerations
- Validate all inputs at HTTP boundary before passing to domain
- Hash passwords with Argon2id (`golang.org/x/crypto/argon2`) or bcrypt (`golang.org/x/crypto/bcrypt`), never SHA/MD5
- SQL injection: always parameterized queries, never string concatenation
- JWT: use `golang-jwt/jwt/v5`, validate `alg` header to avoid alg confusion
- CORS: use `rs/cors` middleware with explicit origins
- Rate limiting: use `ulule/limiter` or middleware
- Secrets: environment variables or vault, never committed to repo

## Testing Strategies

### Unit Tests
```go
func TestUserService_Register_DuplicateEmail(t *testing.T) {
  mockRepo := new(MockUserRepository)
  mockRepo.On("FindByEmail", mock.Anything, "test@test.com").
    Return(&User{Email: "test@test.com"}, nil)
  svc := domain.NewUserService(mockRepo)
  _, err := svc.Register(context.Background(), "test@test.com", "Test")
  assert.ErrorIs(t, err, domain.ErrEmailAlreadyExists)
}
```

### Integration Tests
Use `testcontainers-go` for PostgreSQL. Each test creates its own DB. Use `txdb` for transaction-based test isolation. Run with `go test -tags=integration ./...`

### Architecture Tests
```go
// Uses `go list` to get the transitive dependencies of the domain package.
func TestDomainDoesNotImportInfrastructure(t *testing.T) {
  out, err := exec.Command("go", "list", "-deps", "./internal/domain/...").Output()
  require.NoError(t, err)
  for _, dep := range strings.Split(string(out), "\n") {
    if strings.Contains(dep, "/internal/infrastructure") {
      t.Fatalf("domain must not depend on infrastructure, found %s", dep)
    }
  }
}
```
Alternatively enforce import rules in CI with golangci-lint's `depguard` linter.

## Rules
- internal/ is the default location for ALL application code. pkg/ is for libraries designed for external consumption only.
- Interfaces are defined by the consumer (domain/application), not by the implementer (infrastructure). This is the most important Go rule.
- Accept interfaces, return concrete types.
- context.Context is the FIRST parameter in every function that does I/O (database, HTTP, file system).
- No naked error strings. Always wrap: fmt.Errorf("context: %w", err).
- No init() functions. Use explicit initialization in main().
- Package names are part of the import path. A package named "userrepo" is imported as "project/internal/infrastructure/userrepo".
- Wire dependencies explicitly in main.go (or with a DI generator). Avoid hidden lazy globals (`sync.Once` singletons) for application dependencies.

## References
  - references/go-concurrency.md — Go Concurrency
  - references/go-graceful-shutdown.md — Graceful Shutdown Patterns in Go
  - references/go-hexagonal.md — Hexagonal Architecture in Go
  - references/go-testing.md — Go Testing
  - references/interface-design.md — Go Interface Design
  - references/project-layout.md — Go Project Layout
## Handoff
No artifact produced.
Next skill: golang-patterns — concurrency, HTTP servers, error handling.
Carry forward: package structure, interface definitions, DI wiring approach.
