---
title: Determinism in Parallel Systems
description: Fixed iteration order, double buffering, stable sorts, RNG isolation, replay and network determinism rules for parallel game engines.
---

# Determinism — Deep Reference

## 1. Why Determinism Matters

- **Replay**: replays must be byte-identical between sessions.
- **Multiplayer**: authoritative server expects replays of game ticks from clients.
- **Testing**: a deterministic sim means a bug reproduces on the first run of the test.
- **Tooling**: level bake, determinism checks in CI.

Parallelism breaks determinism when iteration order, float math order, or RNG diverge across runs.

## 2. The Rules

### 2.1 Fixed Iteration Order

Even if jobs run on different cores, the **partition** must be deterministic:

```
chunk 0 → system processes items [0..k)
chunk 1 → items [k..2k)
...
```

Never allow workers to process *their own* chunk pulled from a counter that varies with steal order.

### 2.2 No Shared Mutable State Between Jobs

- Each system writes only its own slices.
- Cross-system reads happen via **double-buffered snapshots** (read A while write B).
- Command buffers per worker, merged in fixed order at the end.

### 2.3 Float Math — Order Matters

`a+b+c` vs `(a+b)+c` differ. Rules:
- Reductions accumulate in **fixed order**: sum `s[0]`, then `s[0]+s[1]`, etc.
- Never rely on `float`-reassociation of parallel lanes.
- For lockstep netcode, prefer **fixed-point integer math** (see `multiplayer-netcode`).

### 2.4 Stable Sorts

`std::sort` swaps equal keys → nondeterministic across runs. Use `std::stable_sort` or add a deterministic tiebreak (`key, then id`). This matters for render-order, physics wide-phase order, particle spawn order.

### 2.5 RNG Isolation

- Global shared `rand()` in parallel = different draws per boot.
- Each (frame, system, worker) gets a **deterministic seed sequence**: `seed = fnv(frame, systemId, workerId, itemIdx)`.
- Randomness for simulation must be seedable for replay: `simSeed` fixed per game version.

## 3. Double Buffering Detail

```cpp
struct SimState {
    RigidBodies bodies[2];
    uint32 readIdx = 0, writeIdx = 1;
};
// physics writes bodies[writeIdx] while gameplay reads bodies[readIdx]
// at tick end: swap read/write; enforce via a tick-boundary fence
```

Without double-buffering, a system reading while another writes = data race + nondeterminism.

## 4. Atomicity & Consistency

| Op | Deterministic? | Note |
|----|----------------|------|
| Atomic counter increment | yes (value independent) | but *order* of increments not defined |
| `fetch_add` for accumulation | yes value | sum order varies — use local+merge |
| CAS loop | yes final value | intermediate reads may vary |
| Mutex order | YES if acquisition order is consistent | not guaranteed — use ordered pipelines |

When accumulating (e.g., "damage dealt this frame"), use per-worker locals merged in fixed order, not `fetch_add`.

## 5. Replay-Friendly State

Design sim components to be **snapshot-able + deterministic replays**:
- Store full state (positions, velocities, timers, RNG state) — replay replays the sim, not just inputs.
- Record inputs (`InputQueue` per player) + `seed`; replay = same inputs, same seed → same state.
- Never record GPU-dependent results in a determinism-critical sim (async results differ).

## 6. Lockstep Networking (Determinism Corner Cases)

- All clients run the **same sim with the same inputs and ticks** — any float/nondeterminism = desync.
- Integer math when possible; else `std::round` twice, never rely on x87 80-bit vs SSE 32-bit.
- Serialize state **into a canonical order** (sorted entity id) regardless of thread.

## 7. Debug Aid: The Diary

- Record `(frame, hash(state))` per tick; a desync replay pinpoints the first differframe.
- Hash the whole world state at end-of-frame (dev builds) = cheap desync canary.

## 8. Anti-Determinism Anti-Patterns

| Pattern | Breaks | Fix |
|---------|--------|-----|
| `unordered_map` iteration | order varies | sort keys / ordered map |
| `std::sort` unstable | equal-key order | stable sort + tiebreak |
| Global RNG in parallel | seed shared | per-(frame,worker,item) seed |
| Pipe through system memory | allocator returns different layouts | arena order preserved |
| Float reduction merge | order varies | fixed-order merge |
| GPU result readback timing | async timing | synchronize at a tick boundary |

## 9. Checklist

- [ ] Chunk partition order fixed.
- [ ] Worker slices disjoint writes.
- [ ] Cross-system reads via double-buffer snapshot.
- [ ] Reductions merge in fixed order.
- [ ] Sorts stable with tiebreak.
- [ ] RNG deterministic seed per context.
- [ ] World hash canary in dev builds.