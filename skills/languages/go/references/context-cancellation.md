# Go Context and Cancellation

## Overview
The context package provides cancellation, deadlines, and request-scoped values across API boundaries and goroutines. Context is the standard mechanism for propagating cancellation signals through Go programs.

## Context Basics

### Creating Contexts
```go
import "context"

// Background context - root of all contexts
ctx := context.Background()

// TODO context - when unsure which context to use
ctx := context.TODO()

// WithCancel - context with manual cancellation
ctx, cancel := context.WithCancel(context.Background())
defer cancel() // Always call cancel to release resources

// WithDeadline - context that cancels at a specific time
ctx, cancel := context.WithDeadline(
    context.Background(),
    time.Now().Add(5*time.Second),
)
defer cancel()

// WithTimeout - context that cancels after duration
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()
```

## Cancellation Patterns

### Checking Cancellation
```go
func longRunningOperation(ctx context.Context) error {
    select {
    case <-ctx.Done():
        return ctx.Err()
    default:
    }

    // Periodically check for cancellation
    for i := 0; i < 100; i++ {
        select {
        case <-ctx.Done():
            return ctx.Err()
        default:
            // Continue processing
        }

        result, err := doWork(i)
        if err != nil {
            return err
        }
        _ = result
    }

    return nil
}
```

### Graceful Shutdown
```go
func main() {
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    // Handle interrupt signal
    sigCh := make(chan os.Signal, 1)
    signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

    go func() {
        <-sigCh
        fmt.Println("Shutting down...")
        cancel()
    }()

    // Start server with cancellation context
    if err := runServer(ctx); err != nil {
        log.Fatalf("Server error: %v", err)
    }
}

func runServer(ctx context.Context) error {
    srv := &http.Server{Addr: ":8080"}

    go func() {
        <-ctx.Done()
        shutdownCtx, cancel := context.WithTimeout(
            context.Background(),
            30*time.Second,
        )
        defer cancel()
        srv.Shutdown(shutdownCtx)
    }()

    return srv.ListenAndServe()
}
```

### Timeout Pattern
```go
func fetchWithTimeout(ctx context.Context, url string) (*http.Response, error) {
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()

    req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
    if err != nil {
        return nil, err
    }

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return nil, fmt.Errorf("request failed: %w", err)
    }

    return resp, nil
}

func queryDatabase(ctx context.Context, query string) ([]Result, error) {
    ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
    defer cancel()

    rows, err := db.QueryContext(ctx, query)
    if err != nil {
        return nil, fmt.Errorf("query failed: %w", err)
    }
    defer rows.Close()

    var results []Result
    for rows.Next() {
        var r Result
        if err := rows.Scan(&r.ID, &r.Name); err != nil {
            return nil, err
        }
        results = append(results, r)
    }

    return results, nil
}
```

## Propagation

### Passing Context
```go
// Context flows from caller to callee
func handleRequest(ctx context.Context, req Request) (*Response, error) {
    // Add request-specific timeout
    ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
    defer cancel()

    // Pass context downstream
    user, err := fetchUser(ctx, req.UserID)
    if err != nil {
        return nil, err
    }

    data, err := fetchData(ctx, req.DataID)
    if err != nil {
        return nil, err
    }

    return &Response{User: user, Data: data}, nil
}

// Downstream functions must accept context
func fetchUser(ctx context.Context, id string) (*User, error) {
    // Check context before making API call
    if err := ctx.Err(); err != nil {
        return nil, err
    }

    user, err := db.FindUserByID(ctx, id)
    if err != nil {
        return nil, fmt.Errorf("fetch user: %w", err)
    }

    return user, nil
}
```

## Context Values

### Request-Scoped Values
```go
type contextKey string

const (
    UserIDKey    contextKey = "user_id"
    RequestIDKey contextKey = "request_id"
    AuthTokenKey contextKey = "auth_token"
)

func WithUserID(ctx context.Context, userID string) context.Context {
    return context.WithValue(ctx, UserIDKey, userID)
}

func UserIDFromContext(ctx context.Context) (string, bool) {
    id, ok := ctx.Value(UserIDKey).(string)
    return id, ok
}

func WithRequestID(ctx context.Context, requestID string) context.Context {
    return context.WithValue(ctx, RequestIDKey, requestID)
}

func RequestIDFromContext(ctx context.Context) (string, bool) {
    id, ok := ctx.Value(RequestIDKey).(string)
    return id, ok
}

// Usage in middleware
func Middleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        ctx := r.Context()
        ctx = WithRequestID(ctx, uuid.New().String())
        ctx = WithUserID(ctx, r.Header.Get("X-User-ID"))
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

## Fan-Out Patterns

### Parallel Operations with Context
```go
func fanOut(ctx context.Context, urls []string) []Result {
    type result struct {
        url  string
        data []byte
        err  error
    }

    results := make([]Result, 0, len(urls))
    ch := make(chan result, len(urls))

    // Fan out - start all goroutines
    for _, url := range urls {
        url := url // Capture loop variable
        go func() {
            data, err := fetchURL(ctx, url)
            ch <- result{url: url, data: data, err: err}
        }()
    }

    // Fan in - collect results
    for i := 0; i < len(urls); i++ {
        select {
        case r := <-ch:
            if r.err != nil {
                return nil, r.err
            }
            results = append(results, Result{URL: r.url, Data: r.data})
        case <-ctx.Done():
            return nil, ctx.Err()
        }
    }

    return results, nil
}
```

## HTTP Server Patterns

### Context in HTTP Handlers
```go
func handler(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()

    result, err := processRequest(ctx)
    if err != nil {
        switch {
        case errors.Is(err, context.Canceled):
            // Client disconnected
            return
        case errors.Is(err, context.DeadlineExceeded):
            http.Error(w, "Request timeout", http.StatusGatewayTimeout)
            return
        default:
            http.Error(w, err.Error(), http.StatusInternalServerError)
            return
        }
    }

    json.NewEncoder(w).Encode(result)
}

func processRequest(ctx context.Context) (*Result, error) {
    // Create derived context with shorter timeout
    dbCtx, cancel := context.WithTimeout(ctx, 100*time.Millisecond)
    defer cancel()

    data, err := db.QueryContext(dbCtx, "SELECT ...")
    if err != nil {
        return nil, err
    }

    return &Result{Data: data}, nil
}
```

## Key Points
- context.Background() creates the root context
- context.WithCancel() enables manual cancellation
- context.WithTimeout() adds time-based cancellation
- context.WithValue() stores request-scoped values
- ctx.Done() returns a channel closed on cancellation
- ctx.Err() returns the cancellation reason
- Always defer cancel() to release resources
- Values are stored with unexported key types for safety
- Context flows from caller to callee, never stored
- HTTP requests carry context via r.Context()
- context.Canceled and DeadlineExceeded are sentinel errors
- Database/sql and net/http natively support context
- Fan-out patterns propagate cancellation to all goroutines
- Timeout composition creates layered deadlines
- Middleware adds authentication and tracing values
- Context values should be few and well-defined
- Background context should not carry values
- TODO context marks migration points
- Avoid storing context in structs - pass explicitly
- Signal handling integrates with context cancellation
