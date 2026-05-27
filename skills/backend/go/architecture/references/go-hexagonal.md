# Hexagonal Architecture in Go

## Ports and Adapters

### Architecture Diagram
```
    ┌─────────────┐     ┌──────────────┐     ┌─────────────┐
    │   HTTP API  │     │   Commands   │     │   Database  │
    │  (adapter)  │────▶│   (ports)    │◀────│  (adapter)  │
    └─────────────┘     └──────┬───────┘     └─────────────┘
                              │
                         ┌────▼───────┐     ┌─────────────┐
                         │  Application│────▶│   Message   │
                         │   (domain)  │     │   Queue     │
                         └────────────┘     │  (adapter)  │
                                            └─────────────┘
```

### Port Definitions
```go
package domain

import "context"

// Repository ports (driven side)
type UserRepository interface {
    FindByID(ctx context.Context, id UserID) (*User, error)
    FindByEmail(ctx context.Context, email string) (*User, error)
    Save(ctx context.Context, user *User) error
    Delete(ctx context.Context, id UserID) error
}

type OrderRepository interface {
    FindByID(ctx context.Context, id OrderID) (*Order, error)
    FindByUserID(ctx context.Context, userID UserID) ([]*Order, error)
    Save(ctx context.Context, order *Order) error
}

// Service ports (driving side)
type UserService interface {
    Register(ctx context.Context, cmd RegisterUserCommand) (*User, error)
    Authenticate(ctx context.Context, email, password string) (*User, error)
    UpdateProfile(ctx context.Context, cmd UpdateProfileCommand) error
}
```

### Adapter Implementation
```go
package postgres

import (
    "context"
    "database/sql"
    "time"

    "project/internal/domain"
)

type UserRepository struct {
    db *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
    return &UserRepository{db: db}
}

func (r *UserRepository) FindByID(ctx context.Context, id domain.UserID) (*domain.User, error) {
    query := `SELECT id, email, name, created_at, updated_at FROM users WHERE id = $1 AND deleted_at IS NULL`
    row := r.db.QueryRowContext(ctx, query, id.String())

    var user domain.User
    var createdAt, updatedAt time.Time
    err := row.Scan(&user.ID, &user.Email, &user.Name, &createdAt, &updatedAt)
    if err == sql.ErrNoRows {
        return nil, domain.ErrUserNotFound
    }
    if err != nil {
        return nil, err
    }
    user.CreatedAt = createdAt
    user.UpdatedAt = updatedAt
    return &user, nil
}

func (r *UserRepository) Save(ctx context.Context, user *domain.User) error {
    query := `
        INSERT INTO users (id, email, name, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            name = EXCLUDED.name,
            updated_at = EXCLUDED.updated_at
    `
    _, err := r.db.ExecContext(ctx, query,
        user.ID.String(), user.Email, user.Name,
        time.Now(), time.Now(),
    )
    return err
}
```

## Application Service Layer

### Use Case Implementation
```go
package application

import (
    "context"
    "fmt"

    "project/internal/domain"
)

type RegisterUserUseCase struct {
    users    domain.UserRepository
    hasher   PasswordHasher
    events   domain.EventPublisher
}

func NewRegisterUserUseCase(
    users domain.UserRepository,
    hasher PasswordHasher,
    events domain.EventPublisher,
) *RegisterUserUseCase {
    return &RegisterUserUseCase{
        users:  users,
        hasher: hasher,
        events: events,
    }
}

type RegisterUserCommand struct {
    Email    string
    Password string
    Name     string
}

func (uc *RegisterUserUseCase) Execute(ctx context.Context, cmd RegisterUserCommand) (*domain.User, error) {
    // Validation
    if err := validateEmail(cmd.Email); err != nil {
        return nil, fmt.Errorf("invalid email: %w", err)
    }
    if len(cmd.Password) < 8 {
        return nil, fmt.Errorf("password must be at least 8 characters")
    }

    // Check uniqueness
    existing, err := uc.users.FindByEmail(ctx, cmd.Email)
    if err != nil && err != domain.ErrUserNotFound {
        return nil, err
    }
    if existing != nil {
        return nil, domain.ErrEmailAlreadyExists
    }

    // Hash password
    hashedPassword, err := uc.hasher.Hash(cmd.Password)
    if err != nil {
        return nil, err
    }

    // Create domain entity
    user, err := domain.NewUser(cmd.Email, hashedPassword, cmd.Name)
    if err != nil {
        return nil, err
    }

    // Persist
    if err := uc.users.Save(ctx, user); err != nil {
        return nil, err
    }

    // Publish event
    uc.events.Publish(ctx, domain.UserRegistered{
        UserID: user.ID,
        Email:  user.Email,
    })

    return user, nil
}
```

## Dependency Injection

### Wired Application
```go
package main

import (
    "database/sql"
    "log"

    "project/internal/application"
    "project/internal/domain"
    "project/internal/infrastructure/postgres"
    "project/internal/infrastructure/http"
    "project/internal/infrastructure/security"
)

func main() {
    db := connectDB()

    // Infrastructure layer
    userRepo := postgres.NewUserRepository(db)
    passwordHasher := security.NewBCryptHasher()
    eventPublisher := postgres.NewEventPublisher(db)

    // Application layer
    registerUserUseCase := application.NewRegisterUserUseCase(
        userRepo,
        passwordHasher,
        eventPublisher,
    )

    // HTTP layer (driving adapter)
    server := http.NewServer(registerUserUseCase)
    log.Fatal(server.ListenAndServe(":8080"))
}

func connectDB() *sql.DB {
    db, err := sql.Open("postgres", os.Getenv("DATABASE_URL"))
    if err != nil {
        log.Fatal(err)
    }
    return db
}
```

## HTTP Driving Adapter

### Handler Implementation
```go
package http

import (
    "encoding/json"
    "net/http"

    "project/internal/application"
)

type Server struct {
    registerUser *application.RegisterUserUseCase
}

func NewServer(registerUser *application.RegisterUserUseCase) *Server {
    mux := http.NewServeMux()
    s := &Server{registerUser: registerUser}

    mux.HandleFunc("POST /api/users", s.handleRegisterUser)
    mux.HandleFunc("GET /api/users/{id}", s.handleGetUser)

    return &Server{mux: mux}
}

func (s *Server) handleRegisterUser(w http.ResponseWriter, r *http.Request) {
    var req struct {
        Email    string `json:"email"`
        Password string `json:"password"`
        Name     string `json:"name"`
    }
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "invalid request body", http.StatusBadRequest)
        return
    }

    cmd := application.RegisterUserCommand{
        Email:    req.Email,
        Password: req.Password,
        Name:     req.Name,
    }

    user, err := s.registerUser.Execute(r.Context(), cmd)
    if err != nil {
        writeError(w, err)
        return
    }

    writeJSON(w, http.StatusCreated, map[string]interface{}{
        "id":    user.ID,
        "email": user.Email,
        "name":  user.Name,
    })
}
```

## Testing

### Repository Test
```go
package postgres_test

import (
    "context"
    "testing"

    "project/internal/domain"
    "project/internal/infrastructure/postgres"
)

func TestUserRepository(t *testing.T) {
    db := setupTestDB(t)

    repo := postgres.NewUserRepository(db)
    ctx := context.Background()

    user, err := domain.NewUser("test@example.com", "hashedpass", "Test")
    if err != nil {
        t.Fatal(err)
    }

    // Save
    if err := repo.Save(ctx, user); err != nil {
        t.Fatal(err)
    }

    // Find by ID
    found, err := repo.FindByID(ctx, user.ID)
    if err != nil {
        t.Fatal(err)
    }
    if found.Email != user.Email {
        t.Errorf("expected %s, got %s", user.Email, found.Email)
    }

    // Find by email
    found, err = repo.FindByEmail(ctx, "test@example.com")
    if err != nil {
        t.Fatal(err)
    }
    if found.ID != user.ID {
        t.Errorf("expected %s, got %s", user.ID, found.ID)
    }
}
```

### Use Case Test with Mock
```go
package application_test

import (
    "context"
    "testing"

    "project/internal/application"
    "project/internal/domain"
)

type mockUserRepo struct {
    users map[string]*domain.User
}

func (m *mockUserRepo) FindByID(_ context.Context, id domain.UserID) (*domain.User, error) {
    user, ok := m.users[id.String()]
    if !ok {
        return nil, domain.ErrUserNotFound
    }
    return user, nil
}

func (m *mockUserRepo) FindByEmail(_ context.Context, email string) (*domain.User, error) {
    for _, u := range m.users {
        if u.Email == email {
            return u, nil
        }
    }
    return nil, domain.ErrUserNotFound
}

func (m *mockUserRepo) Save(_ context.Context, user *domain.User) error {
    m.users[user.ID.String()] = user
    return nil
}

func (m *mockUserRepo) Delete(_ context.Context, id domain.UserID) error {
    delete(m.users, id.String())
    return nil
}

func TestRegisterUser(t *testing.T) {
    repo := &mockUserRepo{users: make(map[string]*domain.User)}
    hasher := &mockHasher{}
    events := &mockPublisher{}

    uc := application.NewRegisterUserUseCase(repo, hasher, events)

    user, err := uc.Execute(context.Background(), application.RegisterUserCommand{
        Email:    "new@example.com",
        Password: "securepassword123",
        Name:     "New User",
    })
    if err != nil {
        t.Fatal(err)
    }
    if user.Email != "new@example.com" {
        t.Errorf("expected new@example.com, got %s", user.Email)
    }
}
```

## Key Points
- Hexagonal architecture separates domain logic from infrastructure concerns
- Ports (interfaces) are defined in the domain layer, adapters implement them
- Dependency injection wires adapters to ports at the application entry point
- Use cases orchestrate domain logic, coordinating repositories and services
- Driving adapters (HTTP, gRPC, CLI) receive external input
- Driven adapters (DB, queue, external API) implement outbound ports
- Testing with mocks verifies use case logic without infrastructure
- Domain layer has zero external dependencies — pure Go only
- Adapters are swappable: postgres ↔ mysql, http ↔ grpc
