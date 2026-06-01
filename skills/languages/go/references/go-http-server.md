# Go HTTP Server Patterns

## Standard Library (net/http)

### Basic Server
```go
package main

import (
    "encoding/json"
    "log"
    "net/http"
    "time"
)

type User struct {
    ID   int    `json:"id"`
    Name string `json:"name"`
}

func handleGetUser(w http.ResponseWriter, r *http.Request) {
    // Path param extraction (Go 1.22+)
    id := r.PathValue("id")

    user := User{ID: 123, Name: "Alice"}
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(user)
}

func handleCreateUser(w http.ResponseWriter, r *http.Request) {
    var user User
    if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
        http.Error(w, `{"error":"invalid JSON"}`, http.StatusBadRequest)
        return
    }
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(map[string]string{"id": "456"})
}

func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("GET /api/users/{id}", handleGetUser)
    mux.HandleFunc("POST /api/users", handleCreateUser)

    server := &http.Server{
        Addr:         ":8080",
        Handler:      mux,
        ReadTimeout:  10 * time.Second,
        WriteTimeout: 10 * time.Second,
        IdleTimeout:  60 * time.Second,
    }

    log.Printf("Server starting on :8080")
    if err := server.ListenAndServe(); err != nil {
        log.Fatal(err)
    }
}
```

### Middleware Chain
```go
func middlewareChain(handler http.Handler, middlewares ...func(http.Handler) http.Handler) http.Handler {
    for i := len(middlewares) - 1; i >= 0; i-- {
        handler = middlewares[i](handler)
    }
    return handler
}

// Usage
handler := middlewareChain(
    myHandler,
    recoverMiddleware,
    loggingMiddleware,
    authMiddleware,
    corsMiddleware,
)
```

## Chi Router

```go
import "github.com/go-chi/chi/v5"

func chiRouter() http.Handler {
    r := chi.NewRouter()

    // Middleware
    r.Use(middleware.Logger)
    r.Use(middleware.Recoverer)
    r.Use(middleware.RequestID)
    r.Use(middleware.RealIP)
    r.Use(middleware.Timeout(30 * time.Second))

    // Routes
    r.Route("/api", func(r chi.Router) {
        r.Get("/users/{id}", getUser)
        r.Post("/users", createUser)

        r.Route("/users/{id}/orders", func(r chi.Router) {
            r.Get("/", listOrders)
            r.Post("/", createOrder)
        })
    })

    // Subrouter with middleware
    r.Group(func(r chi.Router) {
        r.Use(authRequired)
        r.Get("/account", getAccount)
        r.Put("/account", updateAccount)
    })

    r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
        w.Write([]byte("ok"))
    })

    return r
}
```

## Gin Framework

```go
import "github.com/gin-gonic/gin"

func ginRouter() *gin.Engine {
    r := gin.Default()

    // Global middleware
    r.Use(gin.Recovery())
    r.Use(corsMiddleware())

    // Routes
    v1 := r.Group("/api/v1")
    {
        users := v1.Group("/users")
        {
            users.GET("/:id", getUser)
            users.POST("", createUser)
            users.PUT("/:id", updateUser)
            users.DELETE("/:id", deleteUser)
        }

        orders := v1.Group("/orders")
        orders.Use(authRequired())
        {
            orders.GET("", listOrders)
            orders.POST("", createOrder)
        }
    }

    r.GET("/health", func(c *gin.Context) {
        c.JSON(200, gin.H{"status": "ok"})
    })

    return r
}
```

## Graceful Shutdown

```go
func gracefulServer(handler http.Handler) {
    server := &http.Server{
        Addr:    ":8080",
        Handler: handler,
    }

    // Start in goroutine
    go func() {
        log.Printf("Server starting")
        if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            log.Fatalf("Server error: %v", err)
        }
    }()

    // Wait for interrupt
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit
    log.Printf("Shutting down...")

    // Graceful shutdown with timeout
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    if err := server.Shutdown(ctx); err != nil {
        log.Fatalf("Forced shutdown: %v", err)
    }
    log.Printf("Server stopped")
}
```

## HTTP Client Patterns

### Timeout & Retry
```go
type Client struct {
    httpClient *http.Client
    maxRetries int
    baseURL    string
}

func NewClient(baseURL string) *Client {
    return &Client{
        httpClient: &http.Client{
            Timeout: 10 * time.Second,
            Transport: &http.Transport{
                MaxIdleConns:        100,
                MaxIdleConnsPerHost: 10,
                IdleConnTimeout:     90 * time.Second,
            },
        },
        maxRetries: 3,
        baseURL:    baseURL,
    }
}

func (c *Client) Get(path string) (*http.Response, error) {
    var resp *http.Response
    var err error

    for attempt := 0; attempt <= c.maxRetries; attempt++ {
        resp, err = c.httpClient.Get(c.baseURL + path)
        if err == nil && resp.StatusCode < 500 {
            return resp, nil
        }
        if err != nil {
            // Exponential backoff
            time.Sleep(time.Duration(math.Pow(2, float64(attempt))) * 100 * time.Millisecond)
        }
    }
    return resp, err
}
```

### Request with Context
```go
func fetchWithTimeout(ctx context.Context, url string) ([]byte, error) {
    req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
    if err != nil {
        return nil, err
    }

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    return io.ReadAll(resp.Body)
}
```

## Response Helpers

```go
func writeJSON(w http.ResponseWriter, status int, data any) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, message string) {
    writeJSON(w, status, map[string]string{"error": message})
}

func writeValidationErrors(w http.ResponseWriter, errors map[string]string) {
    writeJSON(w, http.StatusUnprocessableEntity, map[string]any{
        "error":  "validation_failed",
        "fields": errors,
    })
}
```
