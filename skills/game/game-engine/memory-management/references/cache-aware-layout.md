---
title: Cache-Aware Data Layout
description: AoS vs SoA, hot/cold splitting, false sharing, prefetching, branch prediction and SIMD-friendly layouts for game engines.
---

# Cache-Aware Data Layout — Deep Reference

## 1. The Memory Wall

```
L1:       ~1 ns    (32–64 KB/core)
L2:       ~4 ns    (256–512 KB/core)
L3:       ~12–40 ns (2–32 MB shared)
RAM:      ~80 ns    (page miss ~10x)
NVMe:     ~10 µs    (partially paged in via mmap)
```

A game running at 60 FPS has 16.6 ms per frame ≈ 100–200 million cycles. Every proportional cache miss that's off the critical path is fine; every *cache-miss chain* in a hot loop is a stop-the-world.

## 2. AoS vs SoA — Rules of Engagement

### 2.1 When AoS Wins

When a loop touches most fields of each element (e.g., rigid-body: apply force → integrate → update bounds), AoS packs the data so each element is loaded once.

```cpp
struct RigidBody { Vec3 pos; Vec3 vel; Quat rot; float invMass; float sleepTimer; };
// AoS: 64 bytes/elem — one cache line per body, all touched.
```

### 2.2 When SoA Wins

When a system reads or writes a *narrow* slice across many elements (physics broad-phase reads only `pos`; renderer reads only `transform`; ECS archetype queries a single component).

```cpp
struct RigidBodiesSOA {
    std::vector<Vec3>    pos;      // 12 B/elem → 5 elems/cache line
    std::vector<Vec3>    vel;
    std::vector<float>   invMass;  // 4 B/elem → 16 elems/cache line
    std::vector<uint8_t> flags;
};
```

Iterating `pos` alone touches 1/5th the cache lines of the AoS version.

### 2.3 The Hybrid (AoSoA / SoA-within-chunk)

ECS archetypes don't force a choice — store components **per-archetype in SoA slices**, but keep the hot entity "hot tier" fields consecutive. Vectorization (SIMD) also prefers SoA: a `float4` load of 4 positions beats gathering.

### 2.4 The Cost Heuristic

```
cost ≈ sum over touched fields' cache-lines-per-element × total elements
AoS  works when  fields-per-element × element-size ≤ ~1 cache line per element and all fields used
SoA  wins when  < 50% of fields used per element, or the used ones are few and tight
```

## 3. Hot / Cold Splitting

### 3.1 The Pattern

```cpp
// Cold — rarely touched, heavy
struct MeshCold { MeshData* data; uint32_t materialId; std::string name; };

// Hot — touched every frame by the render path
struct MeshLOD { float distance; uint32_t meshId; uint8_t enabled; };
```

Engine sees: cache-miss potential drops because the hot structure is a handful of bytes.

### 3.2 Guideline Numbers

- Keep hot structs ≤ 64 bytes (one cache line) where possible; ≥ 2 hot lines per element is a red flag.
- Cold fields move out; cold access goes through an index or a `std::unique_ptr` to cold storage.
- Same trick in assembly-adjacent engines: the `AEntity` hot tier vs `AEntityRuntimeDetails`.

## 4. False Sharing (Multi-Thread)

### 4.1 The Trap

```cpp
// Two threads increment DIFFERENT elements of the same int array:
int counters[8];                       // 32 bytes = half a cache line... 
// T1 writes counters[0], T2 writes counters[1] → same 64-byte line → coherence ping-pong
// Both "independent" writes serialize on the cache line ownership.
```

Cost: up to 1000x slowdown versus adjacent-line writes. Detect via profiler "cache lines contended" or VTune/Linux `perf c2c`.

### 4.2 The Fix

Pad per-thread data to its own 64-byte line:

```cpp
struct alignas(64) PerThreadStats { uint64_t allocs; uint64_t frames; uint64_t pad[6]; };
PerThreadStats g_stats[kMaxThreads];
```

If on a line with >64 byte fill — the padding creates the isolation. Prefer `std::hardware_destructive_interference_size` (C++17) to be platform-correct.

## 5. Prefetching

### 5.1 Software Prefetch

```cpp
// Iterating a big array, read ahead by k elements:
for (size_t i = 0; i < n; ++i) {
    optional;                              // prefetch data[i + k]
    __builtin_prefetch(src + i + k);
    result[i] = Process(src[i]);
}
```

`k` ≈ (memory latency) / (per-element processing time). Too small = data still coming; too big = wasted bandwidth.

### 5.2 When Prefetch Helps

- Framed, predictable access (streaming arrays, path marching, texture atlases with linear access).
- Multi-pass algorithms where pass 2 consumes pass-1 output — prefetch the future read.

### 5.3 When It Hurts

Random access (hash maps, pointer chains) — prefetch guesses never hit. GPUs handle their own prefetch; don't sprinkle `prefetch` in shader code.

## 6. Branch Prediction & Layout

### 6.1 Branch-Friendliness

Modern CPUs predict per-branch; hot loops with stable patterns run ~0 overhead, but a 50/50 unpredictable branch costs ~15 cycles each. Reduces when you:
- Sort by branchy key before iteration (partition hot path).
- Use lookup tables / small jump tables instead of if-chains.
- Mark hot paths `[[likely]]`/`__builtin_expect`.

### 6.2 Branch-Less SIMD

```cpp
// Instead of:  if (x > 0) y = x; else y = 0;
y = x & (x > 0 ? -1 : 0);        // or select/max on SIMD
y = max(x, 0);                    // branchless clamp
```

On AVX2 the "select" runs as a lane-select, no branch.

## 7. Per-Frame Cache Budgets

Lead engineers reason in **bytes per frame of cache**:

| Metric | Target |
|--------|--------|
| L1 working-set of a hot system | ≤ 32 KB |
| L2 footprint of one full system pass | ≤ 256 KB |
| L3 footprint of the whole update phase | ≤ 4 MB |
| Streamed prefetch ahead distance | ≤ 1–2 needs |

Under a target = data probably fits; over = measure, split (system batching), or SoA-ize.

## 8. False Sharing / RMW Pitfalls Checklist

1. Per-thread global counters padded to line size.
2. Job-system work queues — per-thread deques, not one global.
3. ECS command buffers written per-thread then merged.
4. x86 `LOCK`/`cmpxchg` collisions show up as cache-line contention in `perf`.
5. Watch container growth (realloc moves the whole block to a new cache-distant region).

## 9. Data Layout Decisions Cheat Sheet

| Scenario | Layout |
|----------|--------|
| Bullet list (pos,vel,mass,timer) — all used | AoS, 1 line/elem |
| 10k transforms where only worldPos used | SoA `worldPos` |
| ECS archetype query one component | SoA slice per archetype |
| Mesh render batches | AoS per-vertex (GPU wants it) |
| Per-thread accumulators | padded to 64 B (no false sharing) |
| Big static read-only | mmap + OS page cache, sequential |

## 10. Measuring Layout Impact

`perf stat -e cache-misses`, VTune Memory Access, or a simple frame-time A/B:
- Flip an array from AoS→SoA; if the profiler's "sim time" drops >10%, the layout was the cost.
- Add L1/L2 miss count per frame to the engine's frame stats (a cheap `rdtsc`-based gauge).