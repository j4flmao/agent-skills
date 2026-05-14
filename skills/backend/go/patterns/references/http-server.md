# Go HTTP Server

## Standard Server Setup
```go
func main() {
  mux := http.NewServeMux()
  mux.HandleFunc("GET /api/orders", h.ListOrders)
  mux.HandleFunc("POST /api/orders", h.PlaceOrder)
  mux.HandleFunc("GET /api/orders/{id}", h.GetOrder)

  server := &http.Server{
    Addr:         ":8080",
    Handler:      middlewareStack(mux),
    ReadTimeout:  10 * time.Second,
    WriteTimeout: 30 * time.Second,
    IdleTimeout:  120 * time.Second,
  }

  if err := server.ListenAndServe(); err != http.ErrServerClosed {
    log.Fatalf("server error: %v", err)
  }
}
```

## Middleware Chain
```go
func middlewareStack(next http.Handler) http.Handler {
  return recoveryMiddleware(loggingMiddleware(corsMiddleware(next)))
}

func loggingMiddleware(next http.Handler) http.Handler {
  return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    start := time.Now()
    next.ServeHTTP(w, r)
    log.Printf("%s %s %s", r.Method, r.URL.Path, time.Since(start))
  })
}
```

## Response Envelope
```go
type Envelope struct {
  Data      any    `json:"data,omitempty"`
  Error     string `json:"error,omitempty"`
  Timestamp string `json:"timestamp"`
}

func writeJSON(w http.ResponseWriter, status int, data any) {
  w.Header().Set("Content-Type", "application/json")
  w.WriteHeader(status)
  json.NewEncoder(w).Encode(Envelope{Data: data, Timestamp: time.Now().UTC().Format(time.RFC3339)})
}
```
