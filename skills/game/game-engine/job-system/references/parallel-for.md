---
title: Parallel For Loops
description: Chunking, tile iteration, reductions, SIMD-friendly partitioning and load-balancing strategies for parallel_for in game engines.
---

# parallel_for — Deep Reference

## 1. The Core Primitive

```cpp
// fn(i, ctx) runs for all i in [0, n), parallel across workers
void parallel_for(uint32_t n, WorkerFn fn, void* ctx, const ForOptions& opt = {});
```

Systems call this everywhere: ECS queries, animation pools, mesh gen, pathfinding updates. It's the workhorse — its cost must be minimal: dispatch cost ~200 ns + per-fiber queue push.

## 2. Chunking

### 2.1 Straight Partition

```
n = 1000, workers = 8 → chunk = 125
worker0: [0..125), worker1: [125..250), ...
```

`contiguous ranges` → cache-friendly, no false sharing at boundaries, max per-linear-write.

### 2.2 Dynamic / Adaptive Chunking

When work is uneven (e.g., AI think time varies), use smaller chunks (e.g., `ceil(n / (workers*4))`) and let idle workers steal — the "grab next chunk" scheduler. Budget: chunk steal/second cost = lock per grab, amortized over 100s of items → negligible for chunky work.

### 2.3 Empirical Tuning

| Chunk size | Effect |
|-----------|--------|
| `n / workers` | min overhead; bad if unbalanced |
| `n / (workers * 4)` | balanced with modest steal |
| `n / (workers * 16)` | very balanced; more queue churn |

Rule: keep per-chunk work ≥ ~1 µs so the steal overhead doesn't dominate.

## 3. Vectorized (SIMD) Partitioning

Pass 2 hardware threads + SIMD registers per element; partition **aligned** ranges so each chunk starts on a cache line. For SoA arrays:

```cpp
// float4x positions in SoA → each worker processes a contiguous region
// aligned to 16 bytes so AVX2 loads never straddle cache lines.
```

## 4. Reductions

Reducing across workers (sum, min, max, count) needs care with floats (non-associative → different results per order) and atomics (contention):

```cpp
// Safe accumulator: per-worker local, then merge once
float local[kWorkers][kSIMDLanes];
for (i in chunk) local[worker][lane] += v[i];
// after join: reduce local into single in fixed order → deterministic
```

Deterministic = **fixed order merge** (worker 0..k) with batch accumulation. For min/max tie-breaks, add a stable tiebreak key.

## 5. Load-Balancing Strategies

| Strategy | Use | Overhead |
|----------|-----|----------|
| Static chunk | uniform work | zero |
| Dynamic chunk | uneven work | +lock per chunk grab |
| Work stealing | generic | +steal on idle |
| Coarse partition + inner `for` | memory-bound systems | zero |

Memory-bound systems (wide arrays, mesh data) are usually fine with static chunk — the bottleneck is bandwidth, not imbalance.

## 6. Data-Race Safety Still Applies

parallel_for is NOT a data-race-free guarantee:
- Each worker writes **its own** slice — the partition must be disjoint.
- Shared reads OK if immutable during the pass (double-buffer for cross-system reads).
- Shared writes need per-slot atomic operations or a per-worker output then merge.

## 7. Determinism

See `determinism.md` for the full rules — here's the parallel-for-specific set:
- Iterate in the same partition order every run (chunk index asc).
- Reductions merged in fixed order.
- RNG: per-(worker, chunk) or per-item seed from a fixed sequence, never a global shared `rand()`.
- Sorting only with stable comparator + explicit tiebreak.

## 8. Costs & Budgets

parallel_for benchmarks on a 16-thread desktop, 10 M ints:
- Straight chunk: ~1.2 ms, near-linear.
- Dynamic chunk (×4): ~1.3 ms.
- Reduction merge: +20 µs.
- Single-thread: ~9 ms.

## 9. Common Function Signatures

| Need | Form |
|------|------|
| Transform each element | `transform(fn, n)` |
| Filter & count | `for_each + atomic counter` |
| Reduce sum | `reduce(func, init)` deterministic |
| Scan (prefix) | `parallel_scan` (rare — games use barrier pass) |
| Building uncommitted output | per-worker `OutputSlice[]` then join |

## 10. Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| parallel_for slower than serial | overhead dominates | chunk bigger / fewer dispatches |
| Bandwidth cap (all workers same speed) | memory bound | measure misses; SoA-ize |
| Nondeterministic results | reduction order / race | fixed-order merge, immutable reads |
| Idle workers with unbalanced work | static chunk | dynamic chunk / steal |
| Lock contention in `grab_next` | too-small chunks | raise chunk work |