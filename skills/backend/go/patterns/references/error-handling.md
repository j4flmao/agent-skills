# Go Error Handling

## Error Wrapping
```go
if err != nil {
  return fmt.Errorf("reading user %s: %w", id, err)
}
```

## Sentinel Errors
```go
var ErrNotFound = errors.New("not found")
var ErrConflict = errors.New("already exists")

func GetUser(id string) (*User, error) {
  // ...
  if errors.Is(err, sql.ErrNoRows) {
    return nil, fmt.Errorf("user %s: %w", id, ErrNotFound)
  }
}
```

## Domain Error Types
```go
type DomainError struct {
  Code    string `json:"code"`
  Message string `json:"message"`
}

func (e *DomainError) Error() string { return e.Message }

var ErrInsufficientFunds = &DomainError{Code: "insufficient_funds", Message: "Insufficient funds"}
```

## Error Handling in HTTP Handlers
```go
func (h *OrderHandler) GetOrder(w http.ResponseWriter, r *http.Request) {
  order, err := h.service.GetOrder(r.Context(), id)
  if err != nil {
    switch {
    case errors.Is(err, ErrNotFound):
      http.Error(w, `{"error":"not_found"}`, http.StatusNotFound)
    case errors.Is(err, ErrForbidden):
      http.Error(w, `{"error":"forbidden"}`, http.StatusForbidden)
    default:
      http.Error(w, `{"error":"internal"}`, http.StatusInternalServerError)
    }
    return
  }
  json.NewEncoder(w).Encode(order)
}
```

## Panic Recovery
```go
func recoveryMiddleware(next http.Handler) http.Handler {
  return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    defer func() {
      if rec := recover(); rec != nil {
        log.Printf("panic recovered: %v", rec)
        http.Error(w, "internal server error", 500)
      }
    }()
    next.ServeHTTP(w, r)
  })
}
```
