---
name: backend-concurrency-mechanics
description: >
  Use this skill when the user says 'race condition', 'data race', 'goroutine vs thread', 'event loop blocking', 'memory barrier', 'memory model', 'mutex vs atomic', 'deadlock', 'thread pool sizing', 'virtual threads', 'async vs threads'. Explains how OS threads, M:N schedulers (Go goroutines, Java virtual threads), and event loops (Node.js, Python asyncio) actually execute work, and gives correct synchronization patterns for backend services. Do NOT use for: cross-process locks (backend-distributed-locking), job queues (backend-background-jobs), database isolation levels (backend-database-patterns).
version: "1.1.0"
author: "j4flmao"
license: "MIT"
tags: [backend, concurrency, threads, goroutines, event-loop, memory-model, race-condition]
---

# Concurrency Mechanics

## Purpose
Pick the right concurrency model for a workload and write shared-state code that is correct under the language's memory model. Most production concurrency bugs come from unsynchronized shared state, blocking an event loop, or unbounded parallelism; this skill targets those.

## Agent Protocol

### Trigger
Exact user phrases: "race condition", "data race", "goroutine vs thread", "event loop blocking", "memory barrier", "memory model", "mutex vs atomic", "deadlock", "thread pool sizing", "virtual threads", "async vs threads".

### Input Context
- Language/runtime and version (Go, Java 21+, Node.js, Python, Rust, .NET).
- Workload type: I/O-bound, CPU-bound, or mixed.
- The shared state or code path that misbehaves; any race detector output.

### Output Artifact
Explanation of the execution model plus corrected code. No files unless requested.

### Response Format
```
Model: {OS threads | M:N (goroutines/virtual threads) | event loop}
Workload: {I/O-bound | CPU-bound}
Shared state: {what} -> {mutex | atomic | channel/actor | immutable copy}
Bound: {pool size / semaphore N}
Verify: {go test -race | jcstress | stress test}
```

## Execution Models

| Model | Examples | Scheduling | Cost per unit | Blocking call behaviour |
|---|---|---|---|---|
| 1:1 OS threads | Java platform threads, C++ std::thread, Python threads | Kernel scheduler | Each thread reserves a stack (commonly 1 MB on Windows, 8 MB virtual on Linux glibc, committed lazily) plus kernel structures | Blocks only that thread |
| M:N user-space | Go goroutines, Java 21 virtual threads, Erlang processes | Runtime multiplexes many tasks onto a few OS threads | Small growable stacks (Go starts at 2 KB) | Runtime parks the task; blocking syscalls may pin a carrier thread |
| Event loop | Node.js (libuv), Python asyncio, Netty, Redis command execution | Single thread runs callbacks/coroutines when I/O is ready (epoll, kqueue, IOCP) | Very cheap per connection | Any CPU-heavy or synchronous call stalls every request |

### Go scheduler (G-M-P)
- **G** goroutine, **M** OS thread, **P** logical processor holding a local run queue; `GOMAXPROCS` sets the number of Ps (defaults to CPU count; since Go 1.25 it also respects cgroup CPU limits on Linux).
- An idle P steals half of another P's local queue (work stealing) and also polls the global queue and network poller.
- When a goroutine enters a blocking syscall, its M is detached from the P so another M can keep running goroutines.

### Java virtual threads (Java 21+)
- Mounted on a small ForkJoinPool of carrier threads; blocking I/O unmounts them.
- Pinning: in Java 21-23, blocking inside `synchronized` pins the carrier; JDK 24 (JEP 491) removed that for `synchronized`. Native calls still pin.
- Do not pool virtual threads; limit concurrency to downstream resources with a `Semaphore`.

### Node.js event loop
- JavaScript runs on one thread; network I/O is non-blocking via the OS; file system, DNS `lookup`, crypto and zlib use the libuv thread pool (default 4, `UV_THREADPOOL_SIZE`).
- Microtasks (resolved promises, `queueMicrotask`) drain fully after each macrotask, so a promise loop can starve I/O.
- CPU-bound work goes to `worker_threads` or another service.

## Memory Models in Practice
Compilers and CPUs reorder memory operations. x86 (TSO) only allows a later load to pass an earlier store; ARM and POWER allow much more reordering. You do not write fences by hand in application code: the language memory model guarantees visibility when you use its synchronization primitives.

| Language | Happens-before established by |
|---|---|
| Go | channel send/receive, `sync.Mutex`, `sync.WaitGroup`, `sync/atomic` (sequentially consistent) |
| Java | `synchronized`, `volatile`, `java.util.concurrent` locks/atomics, `Thread.start/join` |
| C++/Rust | `std::atomic` with acquire/release or seq_cst ordering, mutexes |
| JS | Single-threaded; `SharedArrayBuffer` + `Atomics` between workers |

A **data race** is two concurrent accesses to the same memory, at least one a write, without happens-before ordering. In Go and C++ the result is undefined behaviour territory (torn reads, stale values); do not reason about "benign" races.

## Correct Patterns (Go)

```go
package counter

import (
	"context"
	"sync"
	"sync/atomic"

	"golang.org/x/sync/errgroup"
)

// Single integer: atomic is enough.
type Hits struct{ n atomic.Int64 }

func (h *Hits) Inc()         { h.n.Add(1) }
func (h *Hits) Load() int64  { return h.n.Load() }

// Compound invariant (map + total) needs a mutex: atomics cannot make
// two updates appear as one.
type Stats struct {
	mu     sync.Mutex
	byPath map[string]int
	total  int
}

func NewStats() *Stats { return &Stats{byPath: make(map[string]int)} }

func (s *Stats) Record(path string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.byPath[path]++
	s.total++
}

// Bounded fan-out: never start one goroutine per item without a limit.
func FetchAll(ctx context.Context, urls []string, fetch func(context.Context, string) error) error {
	g, ctx := errgroup.WithContext(ctx)
	g.SetLimit(16) // bound concurrency to protect downstreams
	for _, u := range urls {
		g.Go(func() error { return fetch(ctx, u) }) // Go 1.22+: loop var is per-iteration
	}
	return g.Wait() // first error cancels ctx for the rest
}
```

Verify with `go test -race ./...` in CI; the race detector only finds races on executed paths, so run it with concurrent tests.

## Choosing a Primitive

| Situation | Use |
|---|---|
| Single counter/flag | Atomic |
| Several fields that must change together | Mutex (RWMutex only if reads dominate and critical sections are long enough to matter) |
| Ownership transfer / pipeline stages | Channels or queues |
| Read-mostly config | Immutable snapshot swapped via atomic pointer (`atomic.Pointer[T]`, `AtomicReference`) |
| Limit concurrent calls to a dependency | Semaphore / bounded pool |
| Per-key serialization | Shard locks by hash of key, or an actor/queue per key |

## Pool Sizing
- CPU-bound: about the number of cores; more threads only add context switches.
- I/O-bound with threads: Little's law, `concurrency = throughput x latency` (e.g. 200 req/s x 0.05 s = 10 in flight), then cap at what the downstream (DB pool, API rate limit) accepts.
- The DB connection pool is usually the real limit; size app concurrency to it, not the other way round.

## Deadlocks and Liveness
- Acquire multiple locks in one global order.
- Never hold a lock while doing I/O or calling unknown callbacks.
- Always pass deadlines (`context.Context`, `CompletableFuture.orTimeout`, `AbortSignal.timeout`).
- Goroutine leaks: every goroutine needs an exit path (closed channel or cancelled context); monitor `runtime.NumGoroutine()`.

## Anti-Patterns

| Anti-pattern | Fix |
|---|---|
| `sync.WaitGroup` + shared slice append without lock | Pre-size slice and write by index, or collect via channel |
| `JSON.parse` of 50 MB or bcrypt sync calls in Node request path | Stream/parse in worker thread; use async APIs |
| `time.Sleep`/polling for coordination | Channels, condition variables, or `context` |
| Check-then-act on shared map (`if !exists { insert }`) | Single critical section or `LoadOrStore` |
| Unbounded goroutines/threads per request | errgroup limit, semaphore, worker pool |

## Checklist
- [ ] Execution model and workload type identified.
- [ ] Every shared mutable value has one documented synchronization mechanism.
- [ ] Concurrency bounded per downstream dependency.
- [ ] Event loop free of CPU-heavy or synchronous calls.
- [ ] Race detector / stress tests in CI; goroutine or thread counts monitored.

## References
- Related skills: `skills/backend/universal/distributed-locking/SKILL.md`, `skills/backend/universal/background-jobs/SKILL.md`, `skills/backend/universal/resilience-patterns/SKILL.md`.
