---
title: Visibility and Spatial Queries
description: Spatial hash grids, query caching, frustum pre-step and recompute thresholds for network interest.
---

# Visibility & Spatial — Deep Reference

## 1. Why Spatial First

The cheap filter: "out of range → not interested" kills most of the O(N²) cost before any per-entity logic runs. Implement as a spatial structure so each observer's query is O(density), not O(world).

## 2. The Spatial Hash Grid

```cpp
struct SpatHash {
    static constexpr float CELL = 32.0f;            // meters
    flat_hash_map<CellKey, vector<EntityId>> cells;
    void Insert(EntityId id, Vec3 min, Vec3 max) {
        for cells covered: cells[key(min)].push(id);
    }
    void Remove(EntityId id);                        // per-entity cell list
    void Query(EntityIdIds& out, Vec3 min, Vec3 max, float radius);
};
```

- Fixed-cell grid, not dynamic tree — moving entities keep a const table.
- Rebuild when an entity moves > 1 cell (update key on move; else reuse).
- Query: gather candidate ids from covered cells + radius-bounded cells, filter by true distance.

## 3. The Distance Filter First

```cpp
bool InRadius(X, Y, r) {
    float dx = ...; if (dx > r) return false;
    float dy = ...; if (dy > r) return false;   // cheap bound
    return dx*dx+dy*dy ... <= r*r;
}
```
Two compares → one multiply. Always cheaper than a full sphere test per candidate.

## 4. The Frustum Pre-Step (Renderer-Derived)

When a server mirrors a real camera (FPS), add the *cheap sphere-vs-frustum* test (math-foundation) as a second filter:
```
candidates → InRadius → SphereInFrustum(camera of O)
```
This excludes "in range but behind the player" — critical for shooters (a teammate behind you doesn't need your HP replicated every frame).

## 5. Recompute Threshold (Not Every Tick)

The spatial query need NOT run every tick:
- Recompute interest when: moved > `recomputeDist` (e.g., 5 m) OR tickSlop (every Nth tick) OR on a forced event (aggro/gather).
- Otherwise serve the *cached* scope.

```cpp
struct ScopeCache { uint32 lastTick; Vec3 lastPos; vector<EntityId> ids; };
bool ShouldRecompute(ScopeCache& c, Vec3 nowPos, uint32 tick) {
    return distSq(c.lastPos, nowPos) > THRESH² || tick - c.lastTick > INTERVAL;
}
```
Static scopes (room membership) recompute only on explicit room-change.

## 6. Dynamic vs Static Scope

- **Static**: players/npcs in a room, matches zone — computed once, updated on transition.
- **Dynamic**: everyone within N meters regardless of barriers (open fields), or frustum-gated (shooters).
- Both reuse the same hash; static has *no per-tick recompute*.

## 7. The Cell-Size Tradeoff (Tune T)

| Cell size | Pros | Cons |
|-----------|------|------|
| Too small (8 m) | fewer bogus candidates | more cell lookups |
| Too big (64 m) | fewer hash ops | lazy filtering inside |
| Typical | 32 m with 16–64 m relevance | match game scale |

Measure the query cost in the profiler (`scope.query_us`); tune so p99 < 50 μs for your density.

## 8. Memory & Rebuild Costs

| Item | Cost |
|------|------|
| cell bucket (flat_hash_map) | amortized O(1) |
| per-entity cell-backlist | 4 slots |
| scope cache per observer | ≤ 2 KB |

No per-frame allocs in the query path (arena-allocated vectors).

## 9. Pitfalls

| Pitfall | Fix |
|---------|-----|
| Query every tick | thresholds |
| Rebuild whole hash per frame | incremental entity-level |
| Distance test after coordinates unpack | filter before unpack |
| Forgot frustum gating | SphereInFrustum filter on advance |
| Cell buckets that blow up | fixed 32 m + arena |

## 10. Checklist

- [ ] Spatial hash 32 m; incremental moves.
- [ ] InRadius bound (2 compare) then exact.
- [ ] Frustum pre-step for camera-like observers.
- [ ] Recompute thresholds + scope cache.
- [ ] Static scopes cached at room-change.
- [ ] No per-frame allocs; p99 < 50 μs.