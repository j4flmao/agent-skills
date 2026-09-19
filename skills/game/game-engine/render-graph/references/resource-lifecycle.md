---
title: Resource Lifecycle Management
description: GPU resource lifetimes, in-flight frame ring, deferred free, refcounting sources for render graph resources.
---

# Resource Lifecycle — Deep Reference

## 1. The In-Flight Frame Problem

GPU runs 2–3 frames *behind* the CPU. If you free a texture right after the CPU finished recording its last use, the GPU may still read it → use-after-free corruption.

Rule: **a resource that was used by frame N is safe to free only when the fence for frame N+NFRAMES (in-flight) has signaled.**

## 2. The Ring Buffer (Frame Management)

```cpp
constexpr int RingSize = 3;             // matches max frames in flight
FrameCache frames[RingSize];
// per frame:
submission = queue.Submit(...);         // returns Fence
frames[cur].fence = submission;
// next frame: cur = (cur + 1) % RingSize
// allocate resources with frame tag = cur; free when (cur == frames[slot].frameTagUsed + RingSize) pass
```

Free decision = `(currentFrame - lastUsedFrame > RingSize)` → the GPU fence guarantees the ring slot's finish.

## 3. The Two Lifetimes (CPU vs GPU)

| Object | CPU lifetime | GPU lifetime |
|--------|--------------|--------------|
| Descriptor set / cbuffer | stage→upload per frame | 3 frames (deferred) |
| Texture | kept if reused | same / +1 frame on last user |
| Pipeline state | cached forever | same |
| Staging ring | per-frame slot | 3 frames |

The render graph *publishes* a resource's kill only after `lastUseFrame + RingSize`.

## 4. Refcounting Sources of Reads

Each resource tracks:
- `views` (descriptors still referencing it from unsubmitted lists).
- `activePasses` that hold it as input/output this frame.
- permanent holders (render targets, buffers reused across frames).

Free = `activePasses == 0 && views == 0 && lastUseFrame + RingSize <= current`.

## 5. Patterns

### 5.1 The Staging Ring

Upload CPU→GPU:

```
uploadRing (per thread when multi-upload):
  alloc slot (16 KiB-aligned)
  memcpy into slot
  record copy link
  fence on slot: after submission, slot's memory is free
```
The ring holds `RingSize` slots; a slot isn't overwritten until its fence signals.

### 5.2 The Transient Arena

Graph-managed within frame: transient textures allocated from one device-memory heap (`VK_MEMORY_PROPERTY_DEVICE_LOCAL`); aliased (§ passes). Lifecycle:
```
arena.alloc(texDesc, {fromPass, toPass}) → free after toPass completes (a frame-later free).
```
For threaded resources the arenas per-lane.

### 5.3 The Free Queue (Deferred)

```
deferredFree: when a resource passes its last use, push {resource, frameToFree}.
frame advance loop: if (frameToFree == currentFrame) devFree(resource).
```
One list, O(1). This is the single mechanism that prevents in-flight use-after-free.

## 6. The "Missing Fence" Bug Class

- Freeing at frame N immediately, without +RingSize → intermittent corruption only on slow GPUs or with 3+ frames in flight. Classic.
- Growing a command pool per-frame without Reset → memory leak (~MB/hour in render-heavy titles).
- Double-initialize transient attached memory (alias conflict) → black-frame glitches.

## 7. Profiling Signals

| Metric | Means problem |
|--------|---------------|
| In-flight fence wait > 0.1 ms | too few frames; GPU starved |
| Transient memory > 2x | aliasing broken |
| Texture created+freed per frame | never-reused graphics; also lifetime leak |
| Growing VRAM across 10k frames | a per-frame leak |

## 8. The Contract With Tools/Capture

- On `--capture-frame` or when a profiler is attached, the renderer keeps the ring at `RingSize=1` (simpler, deterministic) — some capture tools need that.
- Free-not-until-fence rules identical; but capture may stall to make states inspectable.

## 9. Checklist

- [ ] Ring of `RingSize` frames in flight = 3 (PC), 2 (console).
- [ ] All frees deferred via `frameToFree`.
- [ ] Transient aliasing respects graph life.
- [ ] Staging ring slots fence-gated.
- [ ] No new per-frame GPU objects (leak check).
- [ ] Capture mode: ring=1, inspectable.