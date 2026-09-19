---
title: Command Lists and Queues
description: Recording command lists, multi-threaded frontend record, queue family mapping and dedup for render graphs.
---

# Command Lists & Queues — Deep Reference

## 1. The Concepts

| Term | Meaning |
|------|---------|
| Command list | a recorded sequence of `draw` / `dispatch` / `copy` ops |
| Queue | a GPU execution lane: graphics, compute, copy (Vulkan queues; DX12 same queues concept) |
| Submission | placing a list (batch) on a queue, tied to semaphores/fences |

## 2. A Command List Is Cheap to Record

- First rate costs: 1μs–10μs for typical 1k draws (DX12/Vulkan). Under PIX/Nsight ~all show "Record" in CPU time, not GPU time.
- Target: record off the critical thread (frontend), submit as one big list or a small set.

## 3. Multi-Threaded Record

Split work *by pass* — not by draw. Each pass's record lambda runs on a worker thread:

```
Worker A: record [Transfers       → DepthPrimers   ]
Worker B: record [ShadowCast      → Lighting       ]
Main:     join; submit in topo order
```

Render graph gives you the DAG of passes → schedule record to free cores. Watch:
- A pass reading another pass's *CPU* data (e.g., per-frame constants) needs to wait on that pass's CPU-side completion — express via the graph's async task handles (not GPU sync).
- Two worker records must not touch the same Vulkan/DX12 command pool concurrently — use per-thread pools (still cheap).

## 4. The Per-Thread Pool & Reuse

Creating/destroying command pools is expensive. Pattern:

- A pool object per thread, tagged "graph-pass worker", reused for the lifetime.
- One `vkBeginCommandBuffer/End` per record; the GPU "lazily" reuses old buffers (the API doesn't need re-alloc each time).
- If you submit per frame and reset: `vkResetCommandPool` per thread *after* submission (not during) — never reset a pool containing in-flight lists.

```cpp
// frontend (per frame):
for each worker t:
    ThreadPool[t].Begin();
    pass lambda writes into pool[t];
End();
Submit(pools, queue);
// next frame: reset each pool. (only after submission fence passed)
```

## 5. One List vs Many

Trade-off between list granularity and submission overhead:

| Style | Pros | Cons |
|-------|------|------|
| One giant list all passes | lowest submits | single-thread record, no overlap |
| One list per queue | good | still serial record per queue |
| Per-pass lists on worker threads | parallel record | more submission fences |

Keep the total number of lists per frame modest (≤ ~8), and prefer one list per queue + per-async-lane.

## 6. Queue Selection & Layout

Typical mapping:
- **Graphics queue** (0): main scene.
- **Compute queue** (1): async compute/dispatch.
- **Copy queue** (2): uploads/texture downloads, streaming.

Render graph lanes map to these; only copy queue may run pure transfers in background (streaming throttle).

## 7. Async Lanes & Ownership Transitions

When a compute queue needs a texture the graphics queue wrote, you must insert:
1. Semaphore signaling graphics → compute (finish before start).
2. **Ownership transfer** for the resource (Vulkan `vkCmdPipelineBarrier` with `srcQueueFamily`/`dstQueueFamily`, or DX12 `AcquireResource/ReleaseResource`).

The render graph emits these when it sees a pass on a different lane touching the same resource.

## 8. Dispatch Heuristics

- Coalesce small dispatches into one list when alignment allows (compute tile optimizations, see `gpu-driven-rendering.md`).
- Dispatch footprint math: `(extent.x + groupSize.x - 1) / groupSize.x`.

## 9. Debugging

- Label each list (`BeginLabel("Main::Shadows")`) — visible in profilers; part of the frame dump.
- `--flush-per-pass` (dev): force flush after each pass to catch ordering bugs; slow, dev only.
- Track command-memory growth: reset pool each frame; a growing pool = leaked record memory (each `vkAllocateCommandBuffers` for a *new* pool per frame).

## 10. Pitfalls

| Pitfall | Fix |
|---------|-----|
| Record on main thread | worker-thread per pass |
| Pool reset while in-flight | fence-gated |
| New pool per frame | reuse |
| Two threads one pool | 1 pool/thread |
| Async pass without ownership transfer | graph inserts |
| One list per pass (100 lists) | coalesce per queue |

## 11. Checklist

- [ ] Record off-frame: per-pass on worker threads.
- [ ] 1 pool per thread, reset after fence.
- [ ] ≤ ~8 lists; per queue destination.
- [ ] Own-transfer for cross-queue resources.
- [ ] Labels + `--flush-per-pass` debug.