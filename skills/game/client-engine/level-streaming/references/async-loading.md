---
title: Async Loading and Thread Model
description: IO threads, deferred activation, shell proxies, profiler gates and never-loading-on-frame rules.
---

# Async Loading — Deep Reference

## 1. The Iron Rule

**The main/game frame never does synchronous file IO or decompression.** A `>` 8 ms main-thread load is a streaming bug, not a "we're loading level" excuse.

## 2. Thread Participation

| Thread | Role |
|--------|------|
| frame | requests cells; never reads disk |
| IO threads (2–4) | `fread` from pak (raw reads) |
| worker pool | decompress/decode, parse headers |
| load dispatcher | collects completed, publishes `RESIDENT`, schedules activation |

Bound (see asset-pipeline/streaming-throttle): in-flight reads ≤ 8, in-flight bytes ≤ budget, workers ≤ 4.

## 3. The Handoff (Deferred Activation)

```
IO: read cell bytes (async)
decoder: parse → assets materialize in cache
completion: mark RESIDENT (deferred to frame boundary, not mid-frame)
activation: entities/nav/audio mount next frame
```
Splitting "resident" (data present) from "active" (world uses it) is the key anti-pop tool: **activation happens on a frame boundary**, never mid-frame (the entity "wakes" cleanly at a tick boundary → deterministic).

## 4. Web of Consumers (No Main-Thread Wait)

- A cell is *consumer-blocked*? No — cells are pull-cooperative: the game requests, the load dispatcher asynchronously fills. A script that *requires* a loaded cell just before using it → a "door gate" (the transition mask waits for RESIDENT, delivered via a coroutine/callback).
- Never `while(!resident){}` on the frame (spin-deadlock theater).

## 5. The Shell Proxy (Visible Placeholder)

```
state=LOADING → an occluder mesh / low-poly shell / fade-sky proxy renders
state=RESIDENT → swap in the real mesh (near-instant swap, no pop)
```
The proxy is **pre-generated** (cook-time "shell" per cell: a box + silhouette) — not created at runtime (per-blocking).

## 6. Profiler Gates (Streaming-Specific)

Instrument and alarm:
```
stream.load_main_ms  > 8 ms   → bug
stream.activate_count/frame   → burst alarm
stream.inflight_bytes         → throttle field
stream.resident_bytes         → trend (unload discipline)
stream.decode_cpu             → worker headroom
```

## 7. Multi-Player Streaming (Local Co-op)

- Two player views → two scope sets → cells shared with refcount 2 (see cells-and-residency).
- The load queue dedupes same-cell reads (never double-read a shared cell — waste).

## 8. Pitfalls

| Pitfall | Fix |
|---------|-----|
| `fread` on frame | IO threads |
| Main-thread spin-wait | async completion + gates |
| Activation mid-frame | frame-boundary only |
| No proxy (hole when loading) | cook-time shell |
| Shared cell read twice | dedupe |
| Unbounded workers | pool cap (2–4) |

## 9. Checklist

- [ ] Frame does no sync IO/decode.
- [ ] In-flight caps on reads/bytes/workers.
- [ ] Deferred activation at frame boundary.
- [ ] Shell proxies at LOADING.
- [ ] Streaming profiler gates with alarms.
- [ ] Dedupe shared-cell requests.