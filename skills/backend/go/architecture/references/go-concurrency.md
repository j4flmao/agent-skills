# Go Concurrency

## Goroutine Lifecycle

```go
// Every goroutine needs a stop condition
ctx, cancel := context.WithCancel(context.Background())
defer cancel()

go func() {
    for {
        select {
        case <-ctx.Done():
            return
        case job := <-jobCh:
            process(job)
        }
    }
}()
```

## Patterns Comparison

| Pattern | Use Case | Concurrency |
|---------|----------|-------------|
| **WaitGroup** | Fire-and-forget, no errors needed | Multiple goroutines |
| **errgroup** | Parallel work with error propagation | Collect errors |
| **Pipeline** | Sequential stages processing | Fan-out/fan-in |
| **Worker Pool** | Rate-limited task processing | Controlled parallelism |

## errgroup for Parallel Work

```go
import "golang.org/x/sync/errgroup"

g, ctx := errgroup.WithContext(context.Background())
results := make([]Result, len(items))

for i, item := range items {
    i, item := i, item // capture for closure
    g.Go(func() error {
        r, err := process(ctx, item)
        if err != nil {
            return fmt.Errorf("item %d: %w", i, err)
        }
        results[i] = r
        return nil
    })
}

if err := g.Wait(); err != nil {
    return nil, fmt.Errorf("batch failed: %w", err)
}
```

## Channel Ownership

```go
// Sender creates and closes the channel
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

// Receiver only reads
func consumer(ctx context.Context, in <-chan Work) <-chan Result {
    out := make(chan Result)
    go func() {
        defer close(out)
        for work := range in {
            select {
            case <-ctx.Done():
                return
            case out <- process(work):
            }
        }
    }()
    return out
}
```

## Worker Pool

```go
func workerPool(ctx context.Context, jobs []Job, workers int) []Result {
    jobCh := make(chan Job, len(jobs))
    resultCh := make(chan Result, len(jobs))

    // Start workers
    var wg sync.WaitGroup
    for range workers {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for job := range jobCh {
                select {
                case <-ctx.Done():
                    return
                case resultCh <- process(job):
                }
            }
        }()
    }

    // Send jobs
    for _, job := range jobs {
        jobCh <- job
    }
    close(jobCh)

    // Wait and collect
    go func() {
        wg.Wait()
        close(resultCh)
    }()

    var results []Result
    for r := range resultCh {
        results = append(results, r)
    }
    return results
}
```

## Fan-Out / Fan-In

```go
func fanOut(ctx context.Context, source <-chan Work, count int) []<-chan Result {
    workers := make([]<-chan Result, count)
    for i := range count {
        workers[i] = func() <-chan Result {
            out := make(chan Result)
            go func() {
                defer close(out)
                for work := range source {
                    select {
                    case <-ctx.Done():
                        return
                    case out <- process(work):
                    }
                }
            }()
            return out
        }()
    }
    return workers
}

func fanIn(ctx context.Context, channels ...<-chan Result) <-chan Result {
    out := make(chan Result)
    var wg sync.WaitGroup
    for _, ch := range channels {
        wg.Add(1)
        go func(c <-chan Result) {
            defer wg.Done()
            for r := range c {
                select {
                case <-ctx.Done():
                    return
                case out <- r:
                }
            }
        }(ch)
    }
    go func() {
        wg.Wait()
        close(out)
    }()
    return out
}
```

## Mutex vs RWMutex

```go
type Counter struct {
    mu    sync.RWMutex
    value int
}

func (c *Counter) Increment() {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.value++
}

func (c *Counter) Value() int {
    c.mu.RLock()
    defer c.mu.RUnlock()
    return c.value
}
```

## Select Patterns

```go
// Timeout
select {
case result := <-ch:
    return result
case <-time.After(5 * time.Second):
    return nil, ErrTimeout
}

// Non-blocking send
select {
case ch <- msg:
default:
    log.Println("channel full, dropping message")
}
```
