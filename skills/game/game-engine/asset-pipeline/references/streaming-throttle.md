---
title: Streaming Throttle and Hitch Prevention
description: Priorities, budgets, adaptive streaming, read scheduling and hitch prevention for game asset streaming.
---

# Streaming Throttle & Hitch Prevention — Deep Reference

## 1. The Goal

A level streams gigabytes while the player runs. Any stutter = a hitch. The streaming system must deliver assets in the right order, adapt to available bandwidth/disk, and never spike a frame.

## 2. The Two Axis: Priority + Budget

### 2.1 Priority Model

```
Priority 0: critical (already visible / used this frame)  → MUST be ready
Priority 1: predicted (likely used next ~10 s)
Priority 2: opportunistic (audible region, precache)
Priority 3: background (cold, whole-level)
```

A visible asset at P0 is "forced"; requests downgrade as usage drops.

### 2.2 Request for the Future

The key insight: **request ahead of visible**. The level's streaming system (see `client-engine/level-streaming.md`) computes "what will I need 5–20 s from now" from camera prediction + occlusion data, and requests P1/P2 before the player reaches it.

## 3. Budgets

| Resource | Streaming budget |
|----------|------------------|
| in-flight reads | ≤ 8 |
| in-flight bytes | ≤ 128 MB |
| decode (decompress/transcode) worker | ≤ 4 |
| upload queue (GPU) | ≤ 64 MB |
| total async byte-rate | disk μs + cache-line rate |

Overshoot → reads pile up, decode waits, frame hitch. Throttle: when queue depth reaches cap, drop new P2/P3 requests until slots free; P0 always admitted (pre-empts).

## 4. Adaptive Rate Control

Disk speed varies wildly (HHD 80 MB/s, NVMe 3.5 GB/s, wifi download). Adaptive:
- Sample achieved throughput over a window.
- Scale request sizes so you finish 100% of the needed set before the player arrives.
- When starved (slow disk), **do less geometry, more audio** (audio is small) — drop the "last 5% detail" (LOD0 → LOD1 pre-empt) so you never hitch.

### 4.1 The "Good Enough" Priority

If you can't load all P3 assets before the gate, the system "settles" for P1-only + 4 LODs — visibly identical to the player, no hitch.

## 5. Scheduling

- Requests via a single priority queue (worker-consumed by the read/decode pipeline).
- Read sizes natural (max 4 MB/chunk for fairness).
- Same-asset dedup (a read for id already in flight = no second read).
- Upload happens after decode; the upload is throttled to not overlap more than ~2 uploads/frame.

## 6. Avoiding Mid-Frame Upload

Uploads are frame-deferred (frame-end staging ring), so:

```
decode done → staging ring slot → upload at frame end (fence-cycled)
                   → asset marked Ready next frame
```

## 7. Preload / Prefetch Strategies

- **Level preload**: at level load, request P0+P1 for the entry chamber; P2/P3 stream in the first 20 s.
- **Region prefetch**: as the player walks into a room, request its static meshes+textures+anims.
- **Audio prefetch**: ambient/rooms ahead.
- **Combat prefetch**: enemies' anims + VFX pre-cheted during approach.

## 8. Monitoring in the Profiler

| Metric | Alarm |
|--------|-------|
| P0 miss (visible asset not ready) | 0 |
| queue depth > 8 reads | throttle |
| downloads wait> 2 s hidden | planned |
| upload > 2/frame | throttle |
| per-frame streaming time | < 1 ms |

A P0 miss (a visible wall popping in) is a bug — log it with the actor + why it was P1/P0-late.

## 9. Pitfalls

| Pitfall | Fix |
|---------|-----|
| `fread` 100 MB on main thread | async + pool |
| Requests only "current screen" | predict-ahead |
| Streaming at disk cap | adaptive chunk sizes |
| No dedup | second read for same id |
| Mid-frame upload | frame-deferred ring |
| Cold disk + all P3 | adaptable degradation to P1|

## 10. Checklist

- [ ] Priority classes enforced (P0 pre-empts).
- [ ] Requesting ahead of visible geometry/audio.
- [ ] Budgets for in-flight reads/bytes/decode.
- [ ] Adaptive to disk/wifi (throughput window).
- [ ] Frame-deferred uploads.
- [ ] P0-miss logged; CI catches visible pop-in.
- [ ] Dedup + single centralized queue.