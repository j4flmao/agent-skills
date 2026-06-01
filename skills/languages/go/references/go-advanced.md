# Advanced Go Patterns

## Generics (Go 1.18+)

### Generic Functions
```go
// Type-parameterized function with constraint
func Map[T any, U any](input []T, transform func(T) U) []U {
    result := make([]U, len(input))
    for i, v := range input {
        result[i] = transform(v)
    }
    return result
}

// Usage
numbers := []int{1, 2, 3}
doubled := Map(numbers, func(n int) int { return n * 2 })
```

### Generic Types
```go
type Stack[T any] struct {
    items []T
}

func (s *Stack[T]) Push(item T) {
    s.items = append(s.items, item)
}

func (s *Stack[T]) Pop() (T, bool) {
    if len(s.items) == 0 {
        var zero T
        return zero, false
    }
    item := s.items[len(s.items)-1]
    s.items = s.items[:len(s.items)-1]
    return item, true
}
```

### Constraint Interfaces
```go
type Number interface {
    ~int | ~float64 | ~int64
}

func Sum[T Number](values []T) T {
    var sum T
    for _, v := range values {
        sum += v
    }
    return sum
}
```

## Reflection & Code Generation

### reflect Package
```go
func Inspect(v any) {
    t := reflect.TypeOf(v)
    fmt.Printf("Type: %s\n", t.Name())

    if t.Kind() == reflect.Struct {
        for i := range t.NumField() {
            field := t.Field(i)
            fmt.Printf("  %s (%s)\n", field.Name, field.Type)
        }
    }
}
```

### go:generate
```go
//go:generate stringer -type=Status

type Status int

const (
    Active Status = iota
    Inactive
    Banned
)
```
Run `go generate ./...` to generate `status_string.go`.

## Context Advanced Patterns

### Custom Context Values
```go
type contextKey string

const userIDKey contextKey = "user_id"

func WithUserID(ctx context.Context, id string) context.Context {
    return context.WithValue(ctx, userIDKey, id)
}

func UserIDFromContext(ctx context.Context) (string, bool) {
    id, ok := ctx.Value(userIDKey).(string)
    return id, ok
}
```

### Graceful Propagation
```go
func handler(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    ctx = WithUserID(ctx, "user_123")

    result, err := processWithContext(ctx)
    if errors.Is(err, context.Canceled) {
        return // Client disconnected
    }
}

func processWithContext(ctx context.Context) (Result, error) {
    resultCh := make(chan Result, 1)

    go func() {
        resultCh <- expensiveOperation()
    }()

    select {
    case result := <-resultCh:
        return result, nil
    case <-ctx.Done():
        return Result{}, ctx.Err()
    }
}
```

## Testing Advanced

### Test Helpers
```go
func TestMain(m *testing.M) {
    // Setup
    db := setupTestDatabase()
    code := m.Run()
    // Teardown
    db.Close()
    os.Exit(code)
}

func setupTestDatabase() *sql.DB {
    // Create test DB, run migrations
    return testDB
}
```

### Golden Files
```go
func TestHandlerResponse(t *testing.T) {
    resp := makeRequest()
    got := fmt.Sprintf("%+v", resp)
    golden := filepath.Join("testdata", t.Name()+".golden")

    if *update {
        os.WriteFile(golden, []byte(got), 0644)
    }

    want, _ := os.ReadFile(golden)
    if diff := cmp.Diff(string(want), got); diff != "" {
        t.Errorf("mismatch (-want +got):\n%s", diff)
    }
}
```

### Mock Generation with mockgen
```go
//go:generate mockgen -source=interfaces.go -destination=mocks/mock_store.go -package=mocks

type Store interface {
    Get(ctx context.Context, id string) (Item, error)
    Save(ctx context.Context, item Item) error
}

// In test:
ctrl := gomock.NewController(t)
mockStore := mocks.NewMockStore(ctrl)
mockStore.EXPECT().Get(gomock.Any(), "123").Return(Item{Name: "test"}, nil)
```

## Profiling & Optimization

### pprof Integration
```go
import (
    "net/http/pprof"
    "runtime"
)

func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("/debug/pprof/", pprof.Index)

    // Profile CPU
    // go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30

    // Profile heap
    // go tool pprof http://localhost:6060/debug/pprof/heap

    // Trace execution
    // curl http://localhost:6060/debug/pprof/trace?seconds=5 > trace.out
    // go tool trace trace.out
}
```

### Escape Analysis
```go
// Stays on stack (fast)
func sum(a, b int) int {
    return a + b
}

// Escapes to heap (requires GC)
func newUser(name string) *User {
    return &User{Name: name}
}
```

### sync.Pool for Reuse
```go
var bufferPool = sync.Pool{
    New: func() any {
        return new(bytes.Buffer)
    },
}

func process() {
    buf := bufferPool.Get().(*bytes.Buffer)
    defer bufferPool.Put(buf)
    buf.Reset()
    // Use buf...
}
```

## Wire Dependency Injection

### Provider Functions
```go
// wire.go
//go:build wireinject
// +build wireinject

func InitializeApp() (*App, error) {
    wire.Build(
        NewConfig,
        NewDatabase,
        NewUserService,
        NewHandler,
        NewApp,
    )
    return nil, nil
}

// Generated: wire_gen.go
func InitializeApp() (*App, error) {
    config := NewConfig()
    db := NewDatabase(config)
    userService := NewUserService(db)
    handler := NewHandler(userService)
    app := NewApp(handler)
    return app, nil
}
```
