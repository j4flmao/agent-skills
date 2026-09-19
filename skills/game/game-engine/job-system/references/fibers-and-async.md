---
title: Fibers, Async and GPU Compute Overlap
description: Fiber stacks, cooperative switching, async/await modeling, GPU async compute and CPU/GPU pipelining in game engines.
---

# Fibers, Async & GPU Pipelining — Deep Reference

## 1. Fibers: The Cooperative Threads

A fiber is a lightweight scheduling unit with its **own stack** but sharing the thread's registers between switch points. `SwitchToFiber` in Windows; `makecontext/swapcontext`, or library `Boost.Context`/`libco`.

```cpp
// Windows
void* fiber = ConvertThreadToFiber(nullptr);
void* newF = CreateFiber(64*1024, fiberFn, arg);
SwitchToFiber(newF);
```

### 1.1 What They Buy

- **Blocking without a blocked OS thread**: an I/O job can `uv_fs_read` and yield; the thread continues other fibers. Useful for decompression, async asset loads, network sends.
- **Job-graph naturalness**: `PhysicsJobs.Wait();` inside a job body becomes a switch, not a deadlock — the waiting fiber suspends, scheduler runs others.

### 1.2 What They Cost

- Each fiber = one stack (64 KB default) in RAM.
- **Call path must be fiber-safe**: a fiber that calls into OS APIs that block (locks, `wait`, `std::mutex`) blocks the thread — defeating the purpose, or deadlocks the scheduler (a fiber waiting on a lock held by another fiber on the *same* thread = deadlock).
- Debugger / profiler confusion: stacks nest via fibers.

### 1.3 Where They Make Sense (final answer)

- **Only where blocking is real and short**: async asset decompression, network I/O submit.
- **Not** as a general parallelism mechanism (job+job_graph is simpler and debugger-friendly).
- Modern production (UE5, Unity 2022+) lean: **async/await (C#), fibers for specific blocking I/O**, everything else = jobs + counters.

## 2. Async/Await Modeling in a Job System

C# `async/await`, C++ coroutines, Rust `async` — model "suspension" directly:

```cpp
// C++20 coroutines as jobs
JobHandle UpdateAsync() {
    co_await physics;           // = scheduler suspends the coroutine
    auto state = snapshot();    // runs once physics done
    co_await renderer.Submit(state);
}
```

The job system's `await` = schedule a continuation on the dependency; the coroutine frame becomes the job's continuation. Handles the "fine-grained DAG reads naturally" cases without manual child spawning.

## 3. GPU Async Compute — Overlap CPU and GPU

Async compute queues let the GPU run compute (particle sim, skinning, culling, decompression on GPU) *while* the graphics queue renders — using idle GPU compute units.

```
Graphics queue:  [ Forward   ] [ Post    ] [ Present ]
Compute queue:   [    Particle sim     ]  [ GPU skinning ]
```

### 3.1 The Engineering

- **Batches**: each async work is a small command list submitted to the compute queue, aligned with a fence to the graphics queue.
- **Memory barriers**: the compute output must be a transient resource, transitioned with `VkPipelineBarrier`/`Barrier(UAV)` before the graphics queue reads it — one fence per transition.
- **Dedicated HW**: many GPUs have separate compute units; async compute is nearly free.

### 3.2 CPU/GPU Pipelining

```
Frame N:  CPU builds job graph → renders command list for N → submit
Frame N+1: CPU builds N+1 jobs while GPU executes N
Submit order + fences guarantee N+1 draws never see N's state mid-flight.
```

Double/triple-buffered command buffers (a few in flight). The single `WaitForFence` at frame end paces the pipeline.

## 4. Integrating I/O Jobs

Async I/O wins big on physics-heavy games (streaming audio, world assets). Pattern:

```
Job: asynchrone file read → decoded on a worker → texture/dmesh uploaded on GPU thread/queue
Scheduler: I/O completions post to the job graph via completion callback → next jobs run
```

Implementations: `OVERLAPPED` + IO completion ports (Windows), `uv_`/`io_uring` (Linux). Avoid `fread` (blocks); always async for > 4 KB reads.

## 5. The Stack & Memory Footprint of Fibers

| Layout | Per-fiber | Notes |
|--------|-----------|-------|
| OS thread stack | 1 MB (Windows default) — wasteful | shrink via `CreateThread(…, stackSize=256KB)` |
| Fiber stack | 64 KB typical | set per type (I/O fiber 64 KB, sim fiber 128 KB) |
| Job continuation (coroutine) | dynamic, heap | C++ coroutines = just a frame |

Budget: 10k fibers × 64 KB = 640 MB — no. Reserve a small fiber pool (256 fibers), reuse stacks.

## 6. Pitfalls

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| Fiber calls OS block | deadlock | only async APIs inside fibers |
| Fiber waiting on lock held by its thread | deadlock | never sync inside fiber with thread-on-same locks |
| SwitchToFiber without saving FPU regs | SIMD corruption | use fiber APIs that save full context |
| Async compute missing barrier | visual glitch / unsorted results | transition + fence per batch |
| CPU too far ahead of GPU | ring overflow / fence stall | triple-buffer + one fence per frame |
| Many fibers → memory | RAM blowup | pooled fiber stacks, cap count |

## 7. Checklist

- [ ] Fibers only in blocking I/O paths (or not at all).
- [ ] Fiber-safe call paths (async APIs, no thread-on-same locks).
- [ ] Fiber stack pool capped + reused.
- [ ] Async compute has explicit transitions + fences per batch.
- [ ] CPU/GPU: triple-buffered cmd buffers + one end-of-frame fence.
- [ ] Async I/O for reads > 4 KB.