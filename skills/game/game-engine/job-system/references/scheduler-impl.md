---
title: Scheduler Implementation
description: Central work queue vs work stealing, worker spin/wait policies, priorities and the per-thread deque design for game engine job systems.
---

# Scheduler Implementation — Deep Reference

## 1. Work Queue Models

### 1.1 Single Central Queue

```cpp
class CentralQueueJobSystem {
    std::mutex lock_;
    std::deque<Job> ready_;
    std::condition_variable cv_;
    std::vector<std::thread> workers_;

    void dispatch(const JobGroup& g) { scope_lock l(lock_); for(auto& j : g) ready_.push_back(j); cv_.notify_all(); }
public:
    void waitHandle(JobHandle h) { while (!h.done()) std::this_thread::yield(); }
};
```

Pros: trivial, deterministic dispatch order (LIFO notify → nice cache behavior for chunks). Cons: single lock hot at > 8 threads; workers all pull from the same pop.

### 1.2 Work Stealing

Each worker has its **own deque**; `try_pop_local` (LIFO) for hot jobs, `steal` (front, FIFO/cold) from victims when idle.

```cpp
struct WorkerThread {
    std::deque<Job> local_;
    Job stealFrom(WorkerThread& victim) {
        scoped_lock l(victim.lock_);
        if (victim.local_.empty()) return {};
        Job j = victim.local_.front();          // steal the coldest
        victim.local_.pop_front();
        return j;
    }
};
void WorkerMain(WorkerThread& me) {
    for (;;) {
        Job j;
        if (me.local_.tryPopLocal(j)) { /* warm */ }
        else {
            unsigned victim = randomPeer();      // avoid self
            if (!(j = me.stealFrom(g_workers[victim])).valid) { me.park(); }
        }
        j.run(WorkerContext{me.id});
    }
}
```

Steal is rare (maybe 1–2% of pops), so the cache-cold steal cost is amortized. The victim must still lock — a `try_pop_front` with null result falls through to parking.

### 1.3 Which to Start With

Start central-queue. Measure. If (worker > 8 utilization < 80%) → work stealing. Determinism / testing is simpler with central (dispatch order matches execution better).

## 2. Worker Spin / Wait Strategy

Workers must not busy-spin the CPU when idle (they'd eat cores the GPU needs).

| Wait | When | Cost |
|------|------|------|
| `yield()` | Now — retry immediately | cheap; burns? no |
| `nanosleep(1-200µs)` | short idle | fine |
| `futex` / `WaitOnAddress` (Win) | long idle, park until job appears | best for idle |

Production: **hybrid** — spin for `k` iterations (~20 µs), then park through a semaphore/CV; a `notify` wakes. GPU-bound frames want parked workers (GPU does the work), CPU-bound want spinning.

Windows `WaitOnAddress` (no kernel transition) beats `std::condition_variable` for this pattern.

## 3. Priorities & Scheduling

### 3.1 Priority Classes

{High: render-command gen, animation; Normal; Low: asset decode, streaming}. High jobs skip ahead and are rarely barged. Two practical schemes:

- **Priority queue per class** (3 deques).
- **Fiber-style "high lane"**: high jobs run inline on the dispatching thread when dispatched (called "inline scheduling" in some engines).

### 3.2 Inline Execution

If the caller is on the main thread and the job is trivially cheap, execute it inline rather than queueing:

```cpp
if (j.isInline() || workerCount == 0) { j.fn(ctx, j.data); return {}; }
```

Cuts latency for tiny jobs and removes overhead of a round-trip through the scheduler.

## 4. The JobPool (Job Memory)

Jobs are intrusive-linked-list nodes from a **fixed pool** (per job system). Avoids `new` per job; destruction is a no-op returning to the pool. Sizes: `sizeof(Job)` fits a cache line (≤64 B) if data is small; large data goes through a data pointer + refcount.

```cpp
Job* spawn(void(*fn)(JobContext&, void*), void* data) {
    Job* j = pool_.alloc();                 // O(1), fixed pool
    j->fn = fn; j->data = data; j->counter = 0; j->deps[0] = j->deps[1] = {};
    return j;
}
```

# IMPORTANT: fine-grained sleeps
Parking a worker too early costs latency (wake ~10 µs); parking too late burns CPU spinning. The general rule:
- CPU-bound frames: spin 200–500 µs before park.
- GPU-bound frames: park right away; the GPU throttles the instruction stream anyway.

## 5. Synchronization Primitives Sanity

| Primitive | Use | Pitfall |
|-----------|-----|---------|
| `std::atomic<int>` counters | job completion, refcounts | RMW on hot counter → contention |
| spinlock | short critical sections | spinning on many threads = waste |
| mutex/CV | queue locks, condition | long waits → park instead |
| semaphore | worker parking | signal per job → work queue refill |
| `relaxed`/`acquire`/`release` | correct fences | wrong ordering = races |

Never busy-lock a per-worker queue (steal path) — 2–4 threads simultaneously is realistic.

## 6. Tuning Knobs

| Knob | Effect | Default |
|------|--------|---------|
| workers = hwthreads − 1 | utilization vs oversubscription | hw−1 |
| chunk size for parallel_for | overhead vs balance | count/workers × (2–4) |
| steal window | latency vs cache-cold | 2–4% |
| spinMs pre-park | wake latency vs idle burn | ~200 µs |
| priority classes | latency of critical path | 3 |
| maximum deps per job | DAG complexity vs overhead | 4 (arrays beyond) |

## 7. Failure Modes

| Symptom | Cause | Fix |
|---------|-------|-----|
| 8 workers, 8 threads waiting | dependency cycle / join on self | detect cycles at dispatch; never `wait` inside a job |
| Workers < utilization spiking | stash spins | park earlier; measure idle vs busy |
| Lock contention on hot queue | central queue | work steal or per-class queues |
| Thread creation cost visible | per-request threads | one scheduler, one pool, reuse |
| Memory blowup per worker | stacks | shared worker stacks, job-local scratch arena instead |