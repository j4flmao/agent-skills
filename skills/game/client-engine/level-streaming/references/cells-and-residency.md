---
title: Cells and Residency States
description: Cell anatomy, residency state machine, refcounts, scope radius and unload discipline.
---

# Cells & Residency — Deep Reference

## 1. Cell Anatomy

```cpp
struct StreamCell {
    AABB    bounds;                 // world region
    ID      id;                     // stable (pak id)
    vector<AssetRef> deps;          // full closure refs
    Residency   res;
    int     refs = 0;               // shared by cameras/players/triggers
    uint16  priority;               // anti-starvation (predictive weight)
};
```

The cell is the unit of: coerce (one bounded read), refcount (subscriber-based), and validation.

## 2. The Residency State Machine

```
UNLOADED
   ↓ (request)
LOADING        ← reads/decode(s) in flight (async)
   ↓ (all deps resident)
RESIDENT       ← usable
   ↓ (refs == 0, "idle" elapsed)
UNLOAD_PENDING ← collector may reclaim (opportunistic)
   ↓
UNLOADED
```

Rules:
- Only `RESIDENT` cells are *activateable* (entities, nav, audio mount).
- `LOADING` cells render a shell/proxy (never a hole or a pop).
- A cell can be `REF_HELD` (a trigger claimed it) even at zero distance — priority above radius-drops.

## 3. The Refcount Model

```
refs += for each consumer:
  camera distance band (0–R1: 2, R1–R2: 1),
  active player footprint,
  scripted trigger hold,
  streaming anchor (net player).
if refs == 0 and residentTime > grace → UNLOAD_PENDING
```
- Unload only when refs==0 AND out of scope — never when a child (registry) still references an asset (see asset-dependencies: the cache holds separately).
- The "footprint" refs collapse: a player standing in a **shared** cell keeps it via their own ref (dedupe by consumer id).

## 4. Radius Discipline (Two Bands)

| Band | Radius | Behavior |
|------|--------|----------|
| Heavy (render + sim) | frustum ∩ near | regional load at 100% |
| Light (asset parks) | predict radius | high-priority preload |

Guard: near radius > predict radius → the predict band is meaningless; measure the *budget hit* of the near set and keep near radius calibrated to disk speed.

## 5. The Anti-Starvation Queue

Cell requests go through one priority queue (see asset-pipeline/streaming-throttle):
- Priority = `predictiveWeight × (starvationTimer)`. A cell starved (request in queue > budget window) escalates.
- An *in-view* cell (render would pop) must preempt P2/P3 — hard gate (critical).

## 6. Unload Discipline (The Resident-Set Growth Bug)

- Resident set **must shrink** when the player withdraws: a "walked away, cell stays" = unload bug (native profiler: `stream.resident_bytes_trend`).
- Collector: opportunistic every N ms when IO idle (doesn't add frames).
- Never unload the *player's own* cell (very visible).

## 7. Tests

- **Turning test**: stand at a radius boundary, spin 360° → assert every visible cell resident before the mask.
- **Teleport test**: jump 3 cells → hard-load path → no crash, mask fade.
- **Load loop**: 100× cycle the same cells → no leak (`resident_bytes` flat).
- **Refcount test**: two players share → one leaves → nothing unloaded until both gone.

## 8. Pitfalls

| Pitfall | Fix |
|---------|-----|
| Unload with pending child refs | cache+registry hold |
| Near radius > predict | shrink near |
| Cell request starved in-view | hard gate |
| Resident set grows under normal play | collector + trend metric |
| Load on the frame inside | predict-ahead + teleport mask |

## 9. Checklist

- [ ] Cell as one bounded unit + closure refs.
- [ ] Residency SM with proxy at LOADING.
- [ ] Refcounts with consumer dedupe.
- [ ] Two-band radius discipline.
- [ ] Priority queue with hard in-view gate.
- [ ] Tests: turning / teleport / load-loop / refcount.