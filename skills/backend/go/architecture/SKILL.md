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
}

// internal/application/usecase.go -- Uses domain interface
type CreateUserUseCase struct {
  repo UserRepository  // Depends on interface, not implementation
}

// internal/infrastructure/postgres/repository.go -- Implements domain interface
type PostgresUserRepository struct {
  db *sql.DB
}

func (r *PostgresUserRepository) FindByID(ctx context.Context, id uuid.UUID) (*User, error) {
  row := r.db.QueryRowContext(ctx, "SELECT id, email, name FROM users WHERE id = $1", id)
  // scan and return
}
```

### Step 3: Wire Dependencies in main.go
```go
func main() {
  cfg := config.Load()
  db := connectDB(cfg.DatabaseURL)
  userRepo := postgres.NewUserRepository(db)
  createUser := application.NewCreateUserUseCase(userRepo)
  handler := http.NewUserHandler(createUser)

  server := &http.Server{Addr: ":" + cfg.Port, Handler: handler}
  // graceful shutdown
}
```

### Step 4: Package Naming Rules
- Short, lowercase, no underscores: user, order, payment.
- Single-word names preferred. If multi-word: userrepo not user_repository.
- No utility packages named utils/ or common/. Find a specific name.
- internal/ packages cannot be imported by external modules (enforced by Go compiler).

### Step 5: Error Handling
```go
// internal/domain -- sentinel errors
var ErrUserNotFound = errors.New("user not found")

// internal/application -- wrap with context
func (uc *CreateUserUseCase) Execute(ctx context.Context, dto CreateUserDTO) error {
  if err := dto.Validate(); err != nil {
    return fmt.Errorf("create user: %w", ErrValidation)
  }
  // ...
}

// internal/infrastructure/http -- map to HTTP
if errors.Is(err, domain.ErrUserNotFound) {
  w.WriteHeader(http.StatusNotFound)
  json.NewEncoder(w).Encode(errorResponse("NOT_FOUND", err.Error()))
}
```

## Rules
- internal/ is the default location for ALL application code. pkg/ is for libraries designed for external consumption only.
- Interfaces are defined by the consumer (domain/application), not by the implementer (infrastructure). This is the most important Go rule.
- Accept interfaces, return concrete types.
- context.Context is the FIRST parameter in every function that does I/O (database, HTTP, file system).
- No naked error strings. Always wrap: fmt.Errorf("context: %w", err).
- No init() functions. Use explicit initialization in main().
- Package names are part of the import path. A package named "userrepo" is imported as "project/internal/infrastructure/userrepo".

## References
- `references/project-layout.md` — Go project structure and package organization
- `references/interface-design.md` — interface at consumer, repository pattern
- `references/go-concurrency.md` — Goroutines, channels, worker pools, errgroup patterns
- `references/go-testing.md` — Table-driven tests, mocking, integration tests, HTTP tests

## Handoff
No artifact produced.
Next skill: golang-patterns — concurrency, HTTP servers, error handling.
Carry forward: package structure, interface definitions, DI wiring approach.
