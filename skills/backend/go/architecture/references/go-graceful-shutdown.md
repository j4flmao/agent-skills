# Graceful Shutdown Patterns in Go

## Basic Shutdown Pattern

### Signal Handling
```go
package main

import (
    "context"
    "log"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"
)

func main() {
    srv := &http.Server{Addr: ":8080"}

    // Start server in goroutine
    go func() {
        log.Println("Server starting on :8080")
        if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            log.Fatalf("Server error: %v", err)
        }
    }()

    // Wait for shutdown signal
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    sig := <-quit
    log.Printf("Received signal: %v", sig)

    // Initiate graceful shutdown
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    if err := srv.Shutdown(ctx); err != nil {
        log.Fatalf("Server forced shutdown: %v", err)
    }
    log.Println("Server stopped gracefully")
}
```

## Advanced Shutdown Manager

### Shutdown Manager
```go
package graceful

import (
    "context"
    "log"
    "os"
    "os/signal"
    "sync"
    "syscall"
    "time"
)

type ShutdownManager struct {
    mu        sync.Mutex
    wg        sync.WaitGroup
    tasks     []Task
    shutdown  chan struct{}
    completed chan struct{}
    timeout   time.Duration
}

type Task struct {
    Name     string
    Shutdown func(ctx context.Context) error
}

func NewShutdownManager(timeout time.Duration) *ShutdownManager {
    return &ShutdownManager{
        shutdown:  make(chan struct{}),
        completed: make(chan struct{}),
        timeout:   timeout,
    }
}

func (m *ShutdownManager) AddTask(name string, shutdownFn func(ctx context.Context) error) {
    m.mu.Lock()
    defer m.mu.Unlock()
    m.tasks = append(m.tasks, Task{Name: name, Shutdown: shutdownFn})
}

func (m *ShutdownManager) WaitForSignal() {
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM, syscall.SIGQUIT)
    sig := <-quit
    log.Printf("Received signal: %v, initiating shutdown", sig)
    close(m.shutdown)
}

func (m *ShutdownManager) Shutdown() {
    <-m.shutdown

    ctx, cancel := context.WithTimeout(context.Background(), m.timeout)
    defer cancel()

    m.mu.Lock()
    tasks := make([]Task, len(m.tasks))
    copy(tasks, m.tasks)
    m.mu.Unlock()

    var wg sync.WaitGroup
    for _, task := range tasks {
        wg.Add(1)
        go func(t Task) {
            defer wg.Done()
            log.Printf("Shutting down: %s", t.Name)
            done := make(chan struct{})
            go func() {
                if err := t.Shutdown(ctx); err != nil {
                    log.Printf("Error shutting down %s: %v", t.Name, err)
                }
                close(done)
            }()
            select {
            case <-done:
                log.Printf("Completed shutdown: %s", t.Name)
            case <-ctx.Done():
                log.Printf("Timeout shutting down: %s", t.Name)
            }
        }(task)
    }
    wg.Wait()
    close(m.completed)
}

func (m *ShutdownManager) Wait() {
    <-m.completed
}
```

## HTTP Server Shutdown

### Server with Connection Draining
```go
package main

import (
    "context"
    "log"
    "net/http"
    "time"
)

type Server struct {
    httpServer *http.Server
    closeCh    chan struct{}
}

func NewServer(addr string, handler http.Handler) *Server {
    return &Server{
        httpServer: &http.Server{
            Addr:         addr,
            Handler:      handler,
            ReadTimeout:  15 * time.Second,
            WriteTimeout: 15 * time.Second,
            IdleTimeout:  60 * time.Second,
        },
        closeCh: make(chan struct{}),
    }
}

func (s *Server) Start() error {
    go func() {
        <-s.closeCh
        ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
        defer cancel()

        log.Println("Draining HTTP connections...")
        if err := s.httpServer.Shutdown(ctx); err != nil {
            log.Printf("HTTP server shutdown error: %v", err)
        }
    }()

    return s.httpServer.ListenAndServe()
}

func (s *Server) Shutdown() {
    close(s.closeCh)
}
```

## Database Connection Pool Shutdown

### Graceful DB Shutdown
```go
package database

import (
    "context"
    "database/sql"
    "log"
    "time"
)

type Database struct {
    db *sql.DB
}

func New(dsn string) (*Database, error) {
    db, err := sql.Open("postgres", dsn)
    if err != nil {
        return nil, err
    }

    db.SetMaxOpenConns(25)
    db.SetMaxIdleConns(5)
    db.SetConnMaxLifetime(5 * time.Minute)
    db.SetConnMaxIdleTime(1 * time.Minute)

    if err := db.Ping(); err != nil {
        return nil, err
    }

    return &Database{db: db}, nil
}

func (d *Database) GetDB() *sql.DB {
    return d.db
}

func (d *Database) Shutdown(ctx context.Context) error {
    log.Println("Closing database connections...")
    done := make(chan struct{})

    go func() {
        // Wait for in-flight queries
        d.db.SetMaxOpenConns(0)    // Prevent new connections
        d.db.SetMaxIdleConns(0)    // Close idle connections

        // Close all connections
        err := d.db.Close()
        if err != nil {
            log.Printf("Database close error: %v", err)
        }
        close(done)
    }()

    select {
    case <-done:
        log.Println("Database connections closed")
        return nil
    case <-ctx.Done():
        log.Println("Database shutdown timed out, forcing close")
        d.db.Close()
        return ctx.Err()
    }
}
```

## Worker Pool Shutdown

### Graceful Worker Shutdown
```go
package worker

import (
    "context"
    "log"
    "sync"
)

type WorkerPool struct {
    workers    int
    jobCh      chan Job
    stopCh     chan struct{}
    wg         sync.WaitGroup
    activeJobs sync.WaitGroup
}

type Job struct {
    ID      string
    Process func(ctx context.Context) error
}

func NewWorkerPool(workers int, bufferSize int) *WorkerPool {
    return &WorkerPool{
        workers: workers,
        jobCh:   make(chan Job, bufferSize),
        stopCh:  make(chan struct{}),
    }
}

func (p *WorkerPool) Start() {
    for i := 0; i < p.workers; i++ {
        p.wg.Add(1)
        go p.worker(i)
    }
}

func (p *WorkerPool) worker(id int) {
    defer p.wg.Done()
    log.Printf("Worker %d started", id)

    for {
        select {
        case job := <-p.jobCh:
            p.activeJobs.Add(1)
            p.processJob(id, job)
            p.activeJobs.Done()

        case <-p.stopCh:
            log.Printf("Worker %d stopping", id)
            return
        }
    }
}

func (p *WorkerPool) processJob(workerID int, job Job) {
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    if err := job.Process(ctx); err != nil {
        log.Printf("Worker %d: job %s failed: %v", workerID, job.ID, err)
    }
}

func (p *WorkerPool) Submit(job Job) {
    p.jobCh <- job
}

func (p *WorkerPool) Shutdown(ctx context.Context) error {
    log.Println("Stopping worker pool...")
    close(p.stopCh)

    // Wait for workers to stop
    done := make(chan struct{})
    go func() {
        p.wg.Wait()
        close(done)
    }()

    select {
    case <-done:
        log.Println("All workers stopped")

        // Wait for active jobs with timeout
        jobsDone := make(chan struct{})
        go func() {
            p.activeJobs.Wait()
            close(jobsDone)
        }()

        select {
        case <-jobsDone:
            log.Println("All active jobs completed")
        case <-ctx.Done():
            log.Println("Warning: active jobs did not complete in time")
        }

    case <-ctx.Done():
        log.Println("Worker pool shutdown timed out")
        return ctx.Err()
    }

    return nil
}
```

## Kafka Consumer Shutdown

### Graceful Consumer
```go
package messaging

import (
    "context"
    "log"
    "sync"
    "time"

    "github.com/segmentio/kafka-go"
)

type Consumer struct {
    reader   *kafka.Reader
    mu       sync.Mutex
    inFlight int
    stopped  bool
}

func NewConsumer(brokers []string, topic string, groupID string) *Consumer {
    return &Consumer{
        reader: kafka.NewReader(kafka.ReaderConfig{
            Brokers:     brokers,
            Topic:       topic,
            GroupID:     groupID,
            MinBytes:    10e3,
            MaxBytes:    10e6,
            MaxWait:     1 * time.Second,
        }),
    }
}

func (c *Consumer) Consume(ctx context.Context, handler func(ctx context.Context, msg kafka.Message) error) {
    for {
        select {
        case <-ctx.Done():
            log.Println("Consumer context cancelled, stopping")
            return
        default:
        }

        msg, err := c.reader.FetchMessage(ctx)
        if err != nil {
            if ctx.Err() != nil {
                return
            }
            log.Printf("Fetch error: %v", err)
            continue
        }

        c.mu.Lock()
        if c.stopped {
            c.mu.Unlock()
            return
        }
        c.inFlight++
        c.mu.Unlock()

        go func(m kafka.Message) {
            defer func() {
                c.mu.Lock()
                c.inFlight--
                c.mu.Unlock()
            }()

            if err := handler(ctx, m); err != nil {
                log.Printf("Handler error: %v", err)
            } else {
                c.reader.CommitMessages(ctx, m)
            }
        }(msg)
    }
}

func (c *Consumer) Shutdown(ctx context.Context) error {
    c.mu.Lock()
    c.stopped = true
    c.mu.Unlock()

    // Wait for in-flight messages
    ticker := time.NewTicker(100 * time.Millisecond)
    defer ticker.Stop()

    for {
        c.mu.Lock()
        inflight := c.inFlight
        c.mu.Unlock()

        if inflight == 0 {
            break
        }

        select {
        case <-ctx.Done():
            log.Printf("%d in-flight messages abandoned", inflight)
            return c.reader.Close()
        case <-ticker.C:
        }
    }

    return c.reader.Close()
}
```

## Full Application Example

### Integrating All Components
```go
package main

import (
    "context"
    "log"
    "time"

    "project/internal/database"
    "project/internal/graceful"
    "project/internal/http"
    "project/internal/messaging"
    "project/internal/worker"
)

func main() {
    shutdown := graceful.NewShutdownManager(60 * time.Second)

    // Database
    db, err := database.New(os.Getenv("DATABASE_URL"))
    if err != nil {
        log.Fatal(err)
    }
    shutdown.AddTask("database", db.Shutdown)

    // HTTP Server
    srv := http.NewServer(":8080", db)
    go func() {
        if err := srv.Start(); err != nil {
            log.Printf("HTTP server error: %v", err)
        }
    }()
    shutdown.AddTask("http-server", srv.Shutdown)

    // Worker Pool
    pool := worker.NewWorkerPool(10, 100)
    pool.Start()
    shutdown.AddTask("worker-pool", pool.Shutdown)

    // Kafka Consumer
    consumer := messaging.NewConsumer(
        []string{"localhost:9092"},
        "orders",
        "order-processor",
    )
    ctx, cancel := context.WithCancel(context.Background())
    go consumer.Consume(ctx, handleMessage)
    shutdown.AddTask("kafka-consumer", func(ctx context.Context) error {
        defer cancel()
        return consumer.Shutdown(ctx)
    })

    // Wait for signal
    shutdown.WaitForSignal()

    // Graceful shutdown
    shutdown.Shutdown()
    shutdown.Wait()
    log.Println("Application shutdown complete")
}

func handleMessage(ctx context.Context, msg kafka.Message) error {
    log.Printf("Processing message: %s", string(msg.Value))
    return nil
}
```

## Key Points
- Always handle SIGINT and SIGTERM for proper shutdown
- Use a ShutdownManager to coordinate multiple component shutdowns
- HTTP servers need idle timeout and connection draining
- Database pools should prevent new connections and drain in-flight queries
- Worker pools must stop accepting jobs and wait for active jobs to complete
- Message consumers should commit in-flight messages before closing
- Set a timeout on total shutdown to prevent hanging indefinitely
- Log each shutdown phase for debugging slow shutdowns
- Use context cancellation to propagate shutdown signal to goroutines
