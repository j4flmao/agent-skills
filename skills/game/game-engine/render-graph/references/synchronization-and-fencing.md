---
title: Synchronization and Fencing
description: Semaphores, fences, queue ownership, in-flight synchronization model and ordering guarantees in render graphs.
---

# Synchronization & Fencing — Deep Reference

## 1. The Primitives

| Primitive | GPU waits | CPU inspects | Use |
|-----------|-----------|--------------|-----|
| Semaphore | on queue submit | no | GPU-to-GPU ordering |
| Fence | yes (N/A) | yes (`waitFence`) | CPU-GPU; multi-frame in-flight |
| Events | in-command | via GPU | intra-command-list (rare) |

Rules:
- **Semaphores = GPU-side**; **fences = CPU-side**. The fence signals when the whole command batch it was submitted with finishes; semaphores gate queue submissions.

## 2. The In-Flight Model

```
Frame N:  record → submit(queue, { .semaphores=..., .fences=fenceN })
          fenceN signals when the GPU finishes frame N
Frame N+1: can't reuse resources until fenceN signaled
```

`RingSize` frames in flight: you may have 3 frames recorded+submitted simultaneously — the GPU runs 3 frames behind if CPU is faster. This is the source of the deferred-free rule (see `resource-lifecycle.md`).

## 3. Cross-Queue / Async

async compute queue needs ordering against the graphics queue:

```
graphics submits shadow pass      → semaphore A (signaled when graphics done)
compute queue   submits computePass ) .semSignal=A, .semWait=doneOrder
```

Queue-resource hand-offs need **ownership transfer** (a barrier with queue-family bit + a semaphore or a `vkCmdPipelineBarrier` with srcFamily/dstFamily). Violations = random corruption on AMD/Intel, often crashes on Nvidia.

## 4. Coalescing & Event Splitting (Render-Graph Level)

A render graph knows all passes up front. It can:

- **Enqueue all submits of queue X** as a single submission (all passes one fence).
- **Split a pass** into an async-lane pass only if it doesn't consume presentable outputs.

Both remove the silly "submit per pass" (which is ~all layout overhead).

## 5. The "Missing Sync" Symptom Masks

| Symptom | Likely cause |
|---------|--------------|
| Random black frames (flip between 2) | present/graphics race — missing fence on swapchain acquire |
| Mesh flicker every other frame | semaphore on the wrong queue |
| Crash after N frames | freed resource not fence-gated (`resource-lifecycle`) |
| Compute corruption only on AMD | unsigned ownership transfer |
| Persistent black on all | null submit ordering |

## 6. The Profiler View

- **GPU timeline per queue** (PIX/Nsight/ROG). Fence wait slot the sign of over-sync: if the graphics queue waits >10% of frame on semaphore, reduce barrier/present sync.
- "In-flight frames" readout = fences signaled vs issued.

## 7. Swapchain Acquire/Release

```
acquire(swapchainImage)  → wait on acquireSemaphore (for the presentation engine)
submit graphics          → signal renderDone, wait presentReady
present(renderDone)      → only when not acquiring more than (swapchainCount-1) ahead
```
A common bug: acquire ahead by more than image count → GPU UI stalls/black-flash.

## 8. The `--validate-sync` Gate (CI)

- Ship a sync-validator in the render graph; in CI or dev it dumps per-resource barriers; test asserts:
  1. Every resource has an initial state.
  2. No pass reads a resource only written by a *later* pass (would be a hazard).
  3. Queue ownership transfers present for cross-lane.
- Run the same level 1000 frames under validation in each dev.

## 9. Determinism Note

Sync affects *visibility*, not determinism — same results even if barriers placed differently. But netcode's HTTP-analog: don't rely on GPU ordering for CPU-visible data (e.g., readback) without a fence before reading.

## 10. Pitfalls

| Pitfall | Fix |
|---------|-----|
| Submit per-pass | coalesce per queue |
| Trap on same-frame compute input | graph edge → order + fence |
| Acquire > swapchainCount | bound |
| Read CPU data post-GPU write w/o fence | fence before read (readback) |
| Cross-queue sharing w/o ownership | transfer + semaphore |
| Over-sync (redundant fences) | edges only |

## 11. Checklist

- [ ] Fences per frame (RingSize in flight).
- [ ] Semaphores for cross-pass on same queue? (not needed — ordering is implicit in queue) — only cross-queue + present.
- [ ] Async ownership transfers present.
- [ ] Acquire ≤ swapchainCount - 1.
- [ ] Readback fenced.
- [ ] `--validate-sync` passes in CI.