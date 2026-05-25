# Go Microservices Patterns

## Service Layout

```
orders-service/
├── cmd/
│   └── server/
│       └── main.go
├── internal/
│   ├── domain/
│   │   ├── order.go
│   │   └── order_test.go
│   ├── application/
│   │   └── order_service.go
│   ├── infrastructure/
│   │   ├── postgres/
│   │   │   └── order_repo.go
│   │   └── kafka/
│   │       └── publisher.go
│   └── api/
│       ├── handler.go
│       └── middleware.go
├── go.mod
└── go.sum
```

## Graceful Shutdown

```go
func main() {
    ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
    defer stop()

    db := connectDB(ctx)
    defer db.Close()

    server := api.NewServer(db)
    go server.Start(":8080")

    <-ctx.Done()
    log.Println("shutting down...")

    shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()
    server.Shutdown(shutdownCtx)
}
```

## HTTP Handler with Structured Response

```go
type Handler struct {
    orderService *application.OrderService
}

func (h *Handler) CreateOrder(w http.ResponseWriter, r *http.Request) {
    var req CreateOrderRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        writeError(w, http.StatusBadRequest, "invalid request body")
        return
    }

    order, err := h.orderService.CreateOrder(r.Context(), req)
    if err != nil {
        writeError(w, http.StatusInternalServerError, err.Error())
        return
    }

    writeJSON(w, http.StatusCreated, order)
}
```

## Client-Side Service Discovery

```go
type InventoryClient struct {
    baseURL    string
    httpClient *http.Client
}

func NewInventoryClient(consulAddr string) *InventoryClient {
    // Discover service from Consul
    baseURL := discoverService(consulAddr, "inventory-service")
    return &InventoryClient{
        baseURL:    baseURL,
        httpClient: &http.Client{Timeout: 5 * time.Second},
    }
}

func (c *InventoryClient) CheckAvailability(ctx context.Context, sku string) (bool, error) {
    url := fmt.Sprintf("%s/api/v1/inventory/%s/available", c.baseURL, sku)
    req, _ := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
    resp, err := c.httpClient.Do(req)
    if err != nil {
        return false, fmt.Errorf("inventory check: %w", err)
    }
    defer resp.Body.Close()
    // parse response...
}
```

## Circuit Breaker

```go
import "github.com/sony/gobreaker"

var inventoryCB = gobreaker.NewCircuitBreaker(gobreaker.Settings{
    Name:        "inventory",
    MaxRequests: 3,
    Interval:    10 * time.Second,
    Timeout:     30 * time.Second,
    ReadyToTrip: func(counts gobreaker.Counts) bool {
        failureRatio := float64(counts.TotalFailures) / float64(counts.Requests)
        return counts.Requests >= 5 && failureRatio >= 0.6
    },
})

func (c *InventoryClient) CheckWithCircuitBreaker(ctx context.Context, sku string) (bool, error) {
    result, err := inventoryCB.Execute(func() (interface{}, error) {
        return c.CheckAvailability(ctx, sku)
    })
    if err != nil {
        return false, err
    }
    return result.(bool), nil
}
```

## Structured Logging

```go
import "log/slog"

func main() {
    logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
        Level: slog.LevelInfo,
    }))
    slog.SetDefault(logger)
}

func handler(w http.ResponseWriter, r *http.Request) {
    slog.Info("creating order",
        "customer_id", r.Context().Value("user_id"),
        "request_id", r.Header.Get("X-Request-ID"),
    )
}
```

## Health Checks

```go
func healthHandler(db *sql.DB) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        if err := db.PingContext(r.Context()); err != nil {
            writeJSON(w, http.StatusServiceUnavailable, map[string]string{
                "status": "unhealthy",
            })
            return
        }
        writeJSON(w, http.StatusOK, map[string]string{
            "status": "healthy",
        })
    }
}
```
