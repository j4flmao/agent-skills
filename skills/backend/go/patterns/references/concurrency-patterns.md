# Go Concurrency Patterns

## Goroutine + WaitGroup
```go
var wg sync.WaitGroup
for _, item := range items {
  wg.Add(1)
  go func(i Item) {
    defer wg.Done()
    process(i)
  }(item)
}
wg.Wait()
```

## Worker Pool
```go
func worker(id int, jobs <-chan Job, results chan<- Result) {
  for job := range jobs {
    results <- process(job)
  }
}

func main() {
  jobs := make(chan Job, 100)
  results := make(chan Result, 100)
  for w := 0; w < 5; w++ { go worker(w, jobs, results) }
  for _, j := range allJobs { jobs <- j }
  close(jobs)
  for r := 0; r < len(allJobs); r++ { <-results }
}
```

## Fan-Out / Fan-In
```go
func fanOut(input <-chan int, workers int) []<-chan int {
  channels := make([]<-chan int, workers)
  for i := 0; i < workers; i++ {
    channels[i] = worker(input)
  }
  return channels
}

func fanIn(channels []<-chan int) <-chan int {
  var wg sync.WaitGroup
  out := make(chan int)
  for _, ch := range channels {
    wg.Add(1)
    go func(c <-chan int) { defer wg.Done(); for v := range c { out <- v } }(ch)
  }
  go func() { wg.Wait(); close(out) }()
  return out
}
```

## Context for Cancellation
```go
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()
result, err := doSomething(ctx)
```

## Mutex vs Channel
- Use mutex for protecting shared state
- Use channels for communicating between goroutines
