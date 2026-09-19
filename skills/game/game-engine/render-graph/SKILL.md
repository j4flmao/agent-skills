---
name: render-graph
description: Expert render graph architecture — command lists and queues, resource lifecycle, passes, barriers, synchronization and GPU-driven rendering for real-time engines.
---

# Render Graph — Deep Engineering Guide

A modern renderer records a *graph* of dependencies between passes each frame, allocates transient resources, orders passes topologically, and emits command lists. Skill covers the scheduling, allocation, synchronization and GPU-driven patterns that make it fast and safe on Vulkan/DX12/Metal.

## 1. The Core Idea

**Declare → Resolve → Record.**

```cpp
// 1. Record phase: passes declare their resources + what they access.
graph.AddPass<Shadows>([&](RenderPassBuilder& b){
    input(b, "depth", attDepth);
    output(b, "shadowMap", attColor, usageDepthStencil);
    setExecLambdaShadows(b);   // recorded later
});

// 2. Resolve phase: pick graph decides ordering (topological by edge),
//    assigns transient memory, decides barriers between passes.

// 3. Execute phase: for pass in order: emit barriers + record commands from lambdas.
```

Passes are *declared* one frame in advance (or same-frame with deferred record), and the graph replays a cached schedule for the common case.

## 2. Why Not Direct Recording (Raw VK/DX12)

- Raw submission requires manual barrier planning per pass → bugs (missing sync = corruption).
- Raw resource lifetimes are error-prone (use-after-free of transient attachments).
- Single-threaded record is a bottleneck: render graph enables **frontend/backend** split — multiple CPUs record pass lambdas in parallel.

| | Raw | RenderGraph |
|-|-----|-------------|
| Barriers | manual | derived from edges |
| Transient alloc | manual rings | graph-managed |
| Reuse across frames | hand | implicit |
| Multi-thread record | DIY | supported |
| Debug attach labels | DIY | automatic per-pass |

## 3. The Pass & Resource Model

### 3.1 Pass Types

- Graphics pass (VS/PS from PSO, draw commands).
- Compute pass (Dispached).
- Copy pass (blit, upload).
- Async compute (with ownership / queue transfer, see §7).

### 3.2 Resource Handles & Transiency

```cpp
struct ResourceID { uint32 index; Generation gen; };   // opaque, non-nullable
int graph.CreateTexture(width, height, format, Usage::RenderTarget);
// Where the graph sees a texture created + destroyed within the frame → transient:
// it aliases memory with other transients (offline vsr-rpt).
```

A transient attachment lives through exactly the passes that read/write it; the allocator proves it's safe to alias at different points of the graph (the "frame-scoped arena").

### 3.3 Reference Counting Applies to the GPU Lifetime, Not CPU

The resource must stay alive while in-flight frames still reference it. Render graph handles: each texture carries a **reference** that jumps when a pass reads it; the free happens after the frame that last used it completes (see `resource-lifecycle.md`).

## 4. Scheduling Passes

1. **Topological order** by edges (output → input taint).
2. **Early-out merges**: adjacent passes with compatible states can merge draws (no intermediate attachment fetch) — the graph detects "read after write within same raw area" and fuses.
3. **Caching**: a stable frame-id → cached schedule reused for subsequent identical frames (only dynamic parts reflatlive).
4. Compute/shadow passes that don't write the final target placed off the main thread (frontend).

Reordering goals: maximize temporal locality (attach reuse), minimize barrier count and transitions (see `barriers.md`).

## 5. Barriers: Graph-Derived, Not Hand-Edited

Edges define transitions:

```
read  (PresentableTarget) → SHADER_READ
write (depth)             → DEPTH_WRITE (after previous prevent)
```

The graph inserts the *minimal* set of barriers between passes. It also merges: a transition needed by N passes emitted once, not per-pass.

```
{ pass A writes tex } → barrier (UNDEFINED→GENERAL/write) → pass B reads tex → barrier (GENERAL→READ)
```

Layout transitions (Vulkan) / ResourceState changes (DX12) are emitted in the execute phase. Async compute inserts **queue-fence split** automatically (ownership transfer) — records extra slides by design (see `sync.md`).

## 6. Rendering Pattern: GPU-Driven

GPU-driven calls: culling happens on GPU (see `gpu-driven-rendering.md`). The render graph awards:
- compute-pass emits indirect draw lists from CPU-fed *constant* buffers only.
- main lighting/depth passes dispatch the same thread-group SIR kernel.
- visibility all composed from `DrawArgs` in the indirect index.

Graph treats these indirect draws just like regular passes — no extra edges, no barriers hand-written.

## 7. Async Compute / Queue Synchronization

- Multi-queue devices (copy-compute-graphics) map to parallel graph lanes.
- Graph schedules compute, async queue, and graphics queue and inserts the required semaphores/fences automatically.
- Rule: only passes that *don't* read presentable targets may run async; ownership transitions handled by the graph.
- Debug tag: "async lane" label shows in the profiler as `>` bar.

## 8. Performance Footprint

| Metric | Target |
|--------|--------|
| Graph resolve time | < 0.2 ms silent |
| Barrier count per frame | minimized; no duplicates |
| Command-list count | ≤ queues; coalesced |
| Transient memory aliased | ~2x vs dedicated |
| Record threads | all cores available to frontend |

Watch: cratering if frontend record is single-threaded or the resolve does full recursion each frame.

## 9. Debug & Validation

- Draw the graph as a DAG with per-pass attributes (a graphviz export or a built-in "graph view").
- `--validate-sync` shows the barrier dump; assert: every resource has a defined initial state; no pass reads a resource not yet written (undefined → #error).
- Debug labels per pass (`BeginLabel`/`EndLabel`).
- On frame dump (`--capture-frame`): include the resolved schedule + all barriers, useful for NVIDIA Nsight / PIX.

## 10. References

- `references/command-lists-and-queues.md` — record lists, queues, dedup, multi-thread record
- `references/passes-and-attachments.md` — pass definition, attachments, transient aliasing, framebuffer reuse
- `references/resource-lifecycle.md` — lifetimes, in-flight frames, free after last use, refcounting
- `references/barriers-and-transitions.md` — layout/state transitions, merges, accidental sync
- `references/synchronization-and-fencing.md` — semaphores, fences, async queue ownership, GPU sync model
- `references/gpu-driven-rendering.md` — indirect args, visibility buffers, GPU culling passes, perf tailoring