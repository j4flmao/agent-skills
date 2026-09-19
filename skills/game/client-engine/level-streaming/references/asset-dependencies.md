---
title: Asset Dependencies and Closure
description: Transitive closure resolution, global asset cache, dedupe/refcounts, cook-generated dependency graphs.
---

# Asset Dependencies — Deep Reference

## 1. The Closure

A cell references `mesh → material → textures → samplers → ...` and audio/spawn data. Its **closure** = the full transitive dependency set. Resolving it *per-request* is slow; it must be **cook-generated** and persisted:

```
close_closure(cell):  {mesh, mat, texA, texB, audio, nav, voice...}
```

## 2. The Cook-Generated Graph

At cook time:
1. Every referenced asset forks its deps (material → textures, sampler...).
2. The transitive closure is computed once, per asset and per cell.
3. Ships in the manifest; `cell.deps` = the extended set (not the hand-authors' "mesh + mat" only).

The cook **fails** if a closure is incomplete (an unlisted dep → missing asset at runtime → crash) — that's the point: validity at build, not in the player's frame.

## 3. The Global Asset Cache (Dedupe Ground)

Two cells sharing `texB` must load `texB` **once**:

```cpp
class AssetCache {
    hash_map<AssetId, AssetRef> assets;      // resident refs
    int AddRef(AssetId);   // returns cached slot if present
    int DecRef(AssetId);   // 0 → unload candidate (collector)
};
```
- Cells request assets via the cache; the cache dedupes, increments, and the unload path pays off only when *every* holder is gone (no double-free).
- This is the boundary of "cell refs 0" and "asset refs 0" — unload only when BOTH are 0 (false-asset unload = torn mesh).

## 4. Async Dependency Grouping

A cell's *request* is forwarded as one async group:
```
load(cell) → for each dep: cache.Request(dep) (async, deduped by cache)
completion callback fires when every dep RESIDENT (a "barrier").
```
The dispatcher orders by priority (see cells/residency) — never per-asset order (that races other cells).

## 5. The Deadlock Trap (Dependency Too Deep)

A circlular dependency (A→B→A) deadlocks the barrier. Guards:
- Cook refuses cycles (validate).
- Runtime: a request timeout → log + abort the cell (retry after X).

## 6. The "Over-Eager Loading" Cost

Loading a cell's closure that *nothing uses* (author reads a mesh the game never spawns) = wasted bytes. The closure should match *usage*: cook-time usage analysis drops dead refs (import-time: see asset-pipeline).

## 7. Metrics

| Metric | Watch |
|--------|-------|
| closure size / cell | > ~2× predicted = leak |
| cache hit rate | dedupe efficiency |
| unload-with-refs events | refcount bug |
| circular deps (0 allowed) | cook gate |

## 8. Pitfalls

| Pitfall | Fix |
|---------|-----|
| Load per-cell (not global) | global cache |
| Author-listed deps incomplete | cook closure |
| Cycle = barrier deadlock | validation + timeout |
| Unload with holders | cache refcounts |
| Non-closure refs in code | usage-analysis |

## 9. Checklist

- [ ] Closure cook-generated + persisted.
- [ ] Global cache with AddRef/DecRef dedupe.
- [ ] Async barrier on cell completion.
- [ ] No cycles (validate + timeout).
- [ ] Usage-analysis prunes dead deps.
- [ ] Cache hit + unload-with-refs metrics.