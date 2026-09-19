---
title: Dependency Graphs for Jobs
description: Completion counters, combine dependencies, join/fold, dynamic dispatch and DAG construction for game engine job systems.
---

# Dependency Graphs — Deep Reference

## 1. The Counter Model

```cpp
struct JobHandle {
    std::atomic<uint32_t> counter;
    bool isDone() const { return counter.load(std::memory_order_acquire) == 0; }
};
```

Every job's counter = (its own work) + (number of not-yet-satisfied dependencies).

```cpp
Job* schedule(Job* j, JobHandle* deps, uint32_t ndeps) {
    j->counter.store(ndeps, std::memory_order_relaxed);
    for (uint32_t i = 0; i < ndeps; ++i) {
        // register as dependent: when dep finishes (decrements its counter),
        // it wakes j's counter (decrement) — if it hits 0, push j to ready queue.
        registerDependency(deps[i], j);
    }
    return j;
}
```

The "decrement on completion→push to ready" is the core. Implementations vary:
- Parent-and-children model (Fork–Join): children decrement the parent's counter; parent "finishes" when children finish + no self work.
- GRAPH (DAG): each job tracks its own `inDegree` (dependencies); when 0 → ready.

## 2. Fork–Join (The Classic)

```
J0 ─┐
    ├── J_parent_counter = 2
J1 ─┘  → wait J0+J1 → parent counter 2→1→0 → parent's children run
```

The parent handle is a join: waiting calls `WaitAll` on all children simultaneously.

```cpp
void parallelFork(JobHandle* children, uint32_t n) {
    JobHandle parent; parent.counter = n;
    for (i<n) { children[i].addCompletionSink(&parent); }  // decrement parent when child done
    wait(parent);
}
```

## 3. Combining Dependencies

```cpp
JobHandle combine(JobHandle a, JobHandle b) {   // returns a handle done when both are
    JobHandle comb; comb.counter = 2;
    a.addSink(&comb); b.addSink(&comb);
    return comb;   // wait on this = wait(a) && wait(b)
}
// Unity: JobHandle.CombineDependencies(a, b, c)
// Unreal: FGraphEvent::Combine or CombineReadWrite
```

Combine is used wherever a system needs "physics+animation both done" before render-command gen.

## 4. Dynamic Dispatch — The `Main` Pattern

A job may spawn children at runtime (e.g., adaptive recursion, or a parent knows its child count only at run): parent job spawns children and *then* dispatches; the scheduler must track it as "active" until children finish (= its counter stays > 0).

```cpp
void parentJob(JobContext& ctx, void* data) {
    // don't touch ctx.handle once you spawn children — retain via sink pattern
    for (i < dynamicCount) { ctx.spawn(child, argsi); }   // children all decrement parent counter
    // parent returns; scheduler deferred-fires "parent complete" event on counter == 0
}
```

Limitation: a single job cannot both return a value *and* be waited within itself (deadlock). Resolve via an output slot the caller reads after wait.

## 5. Cycle Detection & Debug

A dependency cycle = never-0 counter = hang. Detect in debug:
- At dispatch, refcount topological sort over the DAG (cheap in debug: n<10k).
- Timeout watchdog: any handle not finished in >500 ms → dump the DAG + stack in the profiler.

Never call `Wait()` *inside* a job body for a job on the same queue → classic deadlock. If a job must wait on a group, it must be a fiber, or the group must be part of the outer join.

## 6. Fine-Grained vs Coarse — The Engineering Choice

| | Fine-grained DAG | Coarse system-layered |
|--|------------------|----------------------|
| Parallelism | max (every leaf busy) | bubbles at handoff |
| Dependency bugs | more | fewer |
| Determinism | harder | easier |
| Debug | complex | simple |
| Unreal | both (job graphs + eval phases) | |
| Unity | `JobHandle` chains + `SystemGroups` | |

Design rule: **fine-grained inside a phase, coarse between phases.** Between `PhysicsUpdate`, `AnimationUpdate`, `Camera`, `RenderCmdGen` — each waits only on what it truly needs.

## 7. Representing System-Level Dependencies

Keep the system order explicit and acyclic:

```
Input → PlayerMove → [Physics | Animation | AI] → Camera → RenderCmdGen → Submit
          └─────────────────────────────────────────┘─RenderState──┘
```

If the game's systems don't form a DAG (games do — they're acyclic per frame), you get a hang. Enforce `debug order` on the DAG for readability, not performance.

## 8. Fan-Out / Fan-In Counts

- Fan-out one job → 8 workers: fine (children are symmetric).
- Fan-in many → one: fine via combine.
- Watch "bubble at a join" when the number of jobs is small and a worker is idle — interleave small jobs.

## 9. Naming for Diagnosis

Give every job group a name (`physics-step`, `skin-update`, `ui-layout`) shown in the profiler's timeline. Rely on the counter history to answer "why did the frame wait here?" — the API should expose: `handle → {job-group, state, waiting-on}`.

## 10. Checklist

- [ ] Dependencies form a DAG (cycle-check in debug).
- [ ] No `Wait` inside a job on the same queue.
- [ ] Coarse between systems, fine inside.
- [ ] Combine used for multi-input systems.
- [ ] Every job group named for the profiler.
- [ ] Counters atomic, counters bound to job memory lifetime.