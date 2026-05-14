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

## Rules
- Never start a goroutine without knowing how it will stop. context cancellation is the standard mechanism.
- Use sync.WaitGroup or errgroup for synchronization. Never time.Sleep to wait for goroutines.
- The creator of a channel is responsible for closing it. Not the consumer.
- Always wrap errors with context: fmt.Errorf("load config: %w", err). "file not found" is useless without context.
- context.Background() is used only at the entry point (main, request handler). Use context.TODO() during migration.
- Never copy a sync.Mutex. Always pass as pointer.

## References
- `references/concurrency-patterns.md` — goroutines, worker pools, fan-out/fan-in
- `references/error-handling.md` — error wrapping, sentinel errors, domain errors
- `references/http-server.md` — server setup, middleware chain, response envelope

## Handoff
No artifact produced.
Next skill: backend-testing — test Go patterns.
Carry forward: concurrency model, HTTP handler DI pattern, graceful shutdown.
