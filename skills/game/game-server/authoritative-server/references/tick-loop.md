---
title: Server Tick Loop
description: Fixed timestep server loop, accumulator, tick queue, scheduling and determinism under sustained load.
---

# Server Tick Loop — Deep Reference

## 1. Fixed vs Variable dt on the Server

- **Server MUST be fixed dt** (TICK_MS = 1000/hz) regardless of wall clock — determinism + reproducible sim.
- The client may render variable; the server sim must be fixed.

## 2. The Canonical Accumulator

```cpp
uint64_t lastWall, now;
float accumulator = 0;
constexpr float TICK_MS = 1000.0f / 60.0f;   // 60 Hz

while (running) {
    now = HighResClock();
    accumulator += min(now - lastWall, MAX_DT);   // clamp spiral of death
    lastWall = now;
    while (accumulator >= TICK_MS) {
        SimulateTick(tick);
        accumulator -= TICK_MS;
        tick++;
    }
    FlushPendingNet();
}
```

`MAX_DT` clamp: if the process stalls (GC, disk), don't run 500 accrued ticks — clamp to ~250 ms, run at most ~15 ticks, then drop.

## 3. The Tick Queue

Server may run multiple ticks per frame (CPU faster than net rate) — the queue:

- `pendingTicks` executes the required number each frame; surplus ticks coalesce (don't backlog).
- Net patch is sent when the *oldest* pending snapshot is due (send on tick boundary, not per frame).

```
CPU-engine schedule:
  while (pendingTicks > 0) SimulateTick()
  if (holdForNetReady.length >= queue) Flush()
```

## 4. SimulateTick Structure (Per Tick Order)

Run in *strictly the same order every tick* (determinism):

1. drain input queue (per-entity, in arrival order — deterministic tie-break by seq).
2. process input commands (move/attack at the tick they asked).
3. run physics step (fixed dt).
4. run gameplay systems (abilities, damage, spawn).
5. evaluate victory/loss (compare state → emit game events).
6. build snapshot (deltas).

A consistency contract: Systems MUST NOT use wall clock, global random, or per-tick nondeterministic order.

## 5. Deterministic RNG Inside the Tick

```cpp
// per entity seed:
uint64_t seed = fnv1a(matchSeed, entityId, tickBucket);
RNG rng(seed);
```
No shared global `rand()`; the same match replay gets identical bytes.

## 6. The "Spiral of Death" & Headless Mode

Server sim is *headless*: no renderer, no input device, no GPU. It just ticks. Test environment runs `SimulateTick` at whatever speed (headless = 60× faster than real-time for load tests).

## 7. Cost Control

| Per-tick budget | Guard |
|-----------------|-------|
| company-wide p90 tick CPU < 0.5 ms | rebalance systems |
| input queue never backlog > 40 ticks | cap commands/s |
| net send occurs ≤ TICK rate | batch |

If a tick overruns, don't skip — either shrink the world (interest) or give up some non-critical system (VFX aggregation) BEFORE gameplay correctness.

## 8. The Profiler View

- "Tick time" histogram; p99.
- "Accumulator depth" (should hover 0–1; spike = hang).
- "Tick rate achieved" vs configured.

## 9. Pitfalls

| Pitfall | Fix |
|---------|-----|
| Sleep(frame) on server | accumulator loop |
| Wall-clock in sim | fixed dt inputs only |
| Global rand | seeded per-instance |
| Unbounded accumulator | clamp MAX_DT |
| Skip ticks to keep up | rebalance rather than skip |
| Send per-frame not per-tick | flush at tick boundary |

## 10. Checklist

- [ ] Fixed dt = TICK_MS; accumulator with clamp.
- [ ] Strict tick system order; deterministic seed.
- [ ] Headless sim; no GPU/render.
- [ ] Net flush on tick boundary.
- [ ] No backlog spiral.
- [ ] Tick-time histogram p99 in dashboard.