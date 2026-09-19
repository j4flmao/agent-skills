---
name: job-system
description: Expert parallel job systems for game engines — task scheduler, work stealing, fiber/job primitives, dependency graphs, parallel-for and GPU/CPU pipelining under the frame budget.
---

# Parallel Job Systems — Deep Engineering Guide

Modern CPUs give you 8–32 cores; a single-threaded `Update()` leaves them idle. The job system is the backbone that spreads simulation, animation, physics, and render-command generation across cores — transparently, deterministically, and within the frame budget.

## 1. Why a Job System

### 1.1 The Multicore Reality

| Workload | Threads that help | Where it breaks |
|----------|-------------------|-----------------|
| Graphics (GPU) | Async compute helps | Raster work is GPU-bound |
| Simulation (physics, AI) | Many cores | Contention on shared state |
| Animation skel + pool | Many cores | Ordering (blend tree) |
| Render command gen | Medium parallel | Sorting at end |

Raw multicore won't help if every thread fights over one lock. Job systems give *structured* parallel workers: fixed worker threads, work queues, and dependencies.

### 1.2 One Worker per Core — No Oversubscription

```
CPU threads:    [render thread] [audio thread] [gameplay thread] [worker × N]
Job pool:       dependent jobs flushed to workers by the scheduler
```

Never create a thread per request (`std::thread` per job → oversubscription + thread-creation cost ~10k cycles). The scheduler owns N workers = hardware threads − 1 (one for the main/render thread).

## 2. Job Primitives

### 2.1 The Job

```cpp
struct Job {
    void (*fn)(JobContext&, void* data);   // context = arena, worker_id, frame_data
    void* data;
    JobHandle dependencies[MaxDeps];       // DAG edges
};
```

### 2.2 JobHandle

```cpp
struct JobHandle {
    uint32_t counter;   // atomic completion counter
    // wait(): busy-wait until counter == 0
};
```

A job is "done" when its counter drops to 0 (its own + all children). `Join` is the primitive: `JobSystem::Wait(handle)` blocks the caller until the group completes.

### 2.3 The Frame Pattern

```cpp
// Game frame: dispatch all systems, join at the end
JobHandle hPhysics = jq->dispatch(physicsJobs, kPhysicsJobs);
JobHandle hAnim    = jq->dispatch(animJobs,    animCount, &hPhysics);   // depends
JobHandle hRender  = jq->dispatch(renderCmds,  kRenderCmds, &hAnim);
jq->wait(&hRender);   // one join per frame, not per subsystem
```

The single join at frame end is what makes job systems cheap — workers run everything in parallel; the main thread only waits once.

## 3. Scheduling Models

### 3.1 Central Work Queue (Simple)

One global queue of runnable jobs; workers pop from it (mutex-protected). Works up to ~8 threads before contention. Simple, deterministic-ish.

```cpp
class WorkQueue {
    std::mutex m; std::deque<std::function<void()>> jobs_;
public:
    void push(job j) { lock; jobs_.push_back(j); }
    job tryPop()     { lock; if empty return {}; pop_front; }
};
```

### 3.2 Work Stealing (Production — Unreal, Unity, Naughty Dog)

Each worker owns a **deque** of jobs. When idle, it *steals* from a random peer's deque tail (LIFO → cache-locality; steal front → cache-cold).

```
Worker A deque: [j1, j2, j3]        ← A pops j3 (LIFO, hot cache)
Worker B idle:  steals j1 (front)   ← cache-cold, steal is rare so OK
```

Benefits: near-linear scaling for embarrassingly-parallel passes, minimal lock contention. Determinism caveat: steal order is random → iteration order varies run to run.

### 3.3 Level/Chunk Parallelism

Partition a job list into `k` chunks and dispatch `k` worker jobs; each handles `count/k` items. For-loop style:

```cpp
// parallel_for over [0, n)
void ForEach(uint32_t n, void(*fn)(uint32_t i, void* ctx), void* ctx) {
    ... dispatch chunk jobs ...
}
```

`parallel_for` is the single most-used job primitive (systems, ECS queries, mesh pools).

## 4. Dependencies & the DAG

### 4.1 Fine-Grained vs Coarse

| Style | Granularity | Pros | Cons |
|-------|-------------|------|------|
| Coarse (system-level) | whole systems depend on whole systems | super simple, near-deterministic | bubbles (waits) |
| Fine (job-level) | per-job deps | max parallelism | build DAG complexity |

Production engines do **both**: coarse system phases with fine dependencies inside the phase.

### 4.2 Diamond / Rectified Joins

```
AnimPose ──┬──> SkelUpdate ──> RenderNode
Player    ─┴──> Camera ──────> ...
```

Careful: a job with two parents waits for both → a fold/join. Most job systems represent via the atomic counter: parent dependencies *increment* the counter; children decrement on completion.

### 4.3 The Dependency Table

A "dependency counter" per job lets a scheduler run a job only when all inputs are ready. Unreal uses a similar `FGraphEvent`; Unity's `NativeArray` + `JobHandle.CombineDependencies`. This is the same shape as a graph-task system (Intel TBB, Rayon's `par_iter`).

## 5. Fiber / Job-as-Fiber

### 5.1 Why Fibers Appear

GPU-async workloads (async compute, DXR ray tracing, decompression) want a *stack* per job, but stacks cost memory (64 KB each). Fibers (cooperative threads) share one stack via `SwitchToFiber` — a job suspends, the scheduler switches to another, resuming later.

### 5.2 When Not to Use

Fibers are complex (your whole call path must be fiber-safe; stack size finite). Modern engines (UE5 2024+, many) prefer **job + async/await** semantics without fibers, or GPU semaphore-based async, because fiber + lock-free + callbacks is a bug factory. Rule of thumb: introduce fibers last, or only in the narrow job-graph where blocking is genuinely long (I/O, decompression).

## 6. Making It Deterministic

Determinism is the #1 pain of parallelism. Races in iteration = different results per boot = network desyncs, replay mismatch.

### 6.1 Deterministic Rules

1. **Fixed iteration order**: partition jobs in a stable order (`chunk(0)..chunk(k-1)`), even if they run on different cores.
2. **No shared mutable state**: a system may only write its own slices. Cross-slice reads must be snapshots (double-buffer).
3. **Deterministic reductions**: sum of `float` differs by order → use sorted/batch accumulation, or fix-point math.
4. **Stable sorts**: `std::sort` on equal keys is unstable — use stable sort or tiebreak on id.
5. **RNG**: seed per (frame, system), never global `rand()` shared across threads.

### 6.2 Double-Buffering for Parallel Readers/Writers

```cpp
// Physics reads positions (snapshot A), gameplay writes next (buffer B)
struct WorldState {
    RigidBodies bodies[2];    // flip per tick
    int read = 0, write = 1;
};
```

Different systems read different snapshots within a tick → genuinely parallel.

## 7. Worker Topology & Priorities

### 7.1 Threads per System

```
[t game thread]  →  simulation orchestrator (the frame driver)
[w0..w3]         →  physics/animation/AI workers
[w4..w6]         →  render-command generation
[audio thread]   →  mix + submit
[async I/O]      →  decompression, asset load
```

Priorities in the scheduler: render-command gen > animation > physics for latency of the critical path, but each frame has a global budget.

### 7.2 The Single Join, Per Phase

Too many joins = bubble. Pattern: gather all phase jobs → single join → next phase starts with the cold dependency-free heads.

## 8. GPU/CPU Pipelining

```cpp
// CPU submits frame N's commands while GPU executes frame N-1
// Double/triple buffered command buffers + fences.
gpu->BeginCommandList(frame);
workerJobs   →  RenderCmdGen (CPU)   →  [submit async]
gpu->StartFrame();   // CPU continues to build next frame's jobs
gpu->EndFrame();     // fence N
```

Job system + async compute = CPU never waits on the GPU except one fence at the end.

## 9. Profiling a Job System

Key metrics:
- **Worker utilization** % (busy time vs steal); target > 85%.
- **Bubble time** (waiting on dependencies); target < 10%.
- **Steal count** / worker (cache-cold thefts; a few is fine).
- **Frame join latency** — the one join at frame end is your pacing knob.
- Profile with a per-job "thread time + queue wait" view (e.g., Renderdoc/Perfetto custom timers).

## 10. Design Checklist (Lead-Level)

1. Workers = cores − 1; one central wait per frame.
2. Jobs not threads; no thread creation in gameplay.
3. Dependencies explicit, wait-free: atomic counters + work queues.
4. Deterministic iteration order + no shared mutable slices + double-buffered snapshots.
5. parallel_for everywhere; chunking tunable to L2 footprint.
6. Render-command gen + async compute overlap GPU.
7. Fiber/async only where truly blocking (I/O, decompress), and behind the job API.
8. Profiler: utilization > 85%, bubble < 10%, no mid-frame joins.

## 11. References

- `references/scheduler-impl.md` — central queue vs work stealing implementations, worker spin/wait, priorities
- `references/dependency-graph.md` — DAG counters, combine dependencies, join/fold, dynamic dispatch
- `references/parallel-for.md` — chunking, tile iteration, reductions, SIMD-friendly partition
- `references/determinism.md` — ordering, double buffering, stable sorts, RNG, replay & network rules
- `references/fibers-and-async.md` — fiber stacks, switch, async/await modelling, GPU async compute
- `references/job-profiling.md` — utilization, bubble, steal, counters, Perfetto/Tracy integration