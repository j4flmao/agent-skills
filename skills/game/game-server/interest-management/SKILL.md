---
name: interest-management
description: Expert network interest management — visibility graphs, observer sets, replicated-state throttling, event queues and scope control for scalable multiplayer servers.
---

# Interest Management — Deep Engineering Guide

Nobody needs everything. A 100-player battle server could broadcast 6 MB/s to everyone — unviable. Interest management (IM) decides **who gets what**, at what rate, with the least CPU — turning O(players²) broadcast into near-O(visible) traffic.

## 1. The Two Sides of the Problem

1. **State replication** — entity position/hp/anim may repeat at different rates.
2. **Event delivery** — spell casts, deaths, pickups happen once, must be reliable.

IM solves *state* (per-entity rate, per-observer mask). Events live in a separate **reliable queue** (see `event-queue`).

## 2. The Interest Model

```
observer O (a client)
interest(O) = { entities E : dist(O,E) <= radius && comesFrom(visibility(O,E)) && O.state needs }
```

Two classic models:

| Model | Idea | Cost |
|-------|------|------|
| **Spatial (distance/relevance)** | entities within radius get replicated | cheap; dumb (sees through walls) |
| **Visibility/occlusion** | only what O's camera/query can see | accurate; more compute |
| **Hybrid (recommended)** | spatial first, then per-entity relevance mask | standard |

### 2.1 The Relevance Mask

Each entity has a bitmask of *actor channels* (movement, HP, items, emotes). Each observer subscribes to channels; IM intersects: `interest = entitiesNear(O) ∩ channels(O) ∩ channels(E)`.

Per-channel update rates may differ (see §5), so a snapshot packet = union of per-channel deltas.

## 3. Spatial Messaging (Quad/Grid/Hash)

- Use a **spatial hash** of entity AABBs for O(1) per-observer "who's near me":
  - grid cell 32–64 m; rebuild chunk when movement > 1 cell.
- Query = O's cell + neighbors (radius-dependent).
- Add a cheap occlusion pre-step: sphere-vs-frustum first when cameras matter (see `game-engine/math-foundation` collision refs).

## 4. Observer Sets & Recompute Caching

Recomputing all interests every frame is wasteful. Cache:

- **Static scopes** (the room/level a player is in) — compute once at join; update only on teleport/room-change.
- **Dynamic scopes**: recompute on movement threshold (moved > N units or tick recency) + on cast/aggro events.

```
scopeCache[O] = {lastRecomputeTick, recomputeThreshold}
if E moved out of O's radius → remove
if E entered radius and channel matches → add
```

## 5. Per-Channel Rate Limiting (Detail LOD)

Different data needs different frequencies:

| Channel | Rate | Why |
|---------|------|-----|
| movement | 30–60 Hz | smoothness |
| HP/mana | 10–20 Hz | low change |
| items/emote | 4–10 Hz | occasional |
| spell effects (critical) | reliable + on-event | must-arrive |

Cost trick: **detail reduces with distance** (network LOD): entity at 200 m → movement 10 Hz, no HP, no inventory; at 10 m → full rate. This is the network analog of render LOD (see `scaling-architecture`).

## 6. The Entity Queue & Dirty Flags

Server per-observer maintains:
- `dirtyIds` (entities changed since last send to that observer).
- `replicated` map (entityId → last sent tick or channel version).

Send loop per observer (draw FPS cost):
```
for id in valueSet(interestedIntersection dirty):
    send delta bytes for changed channels (quantized)
```
Complexity ≈ O(|interest(O)|) per observer, per tick — a *per-observer packet builder* that stops early on a byte budget (see `world-state-snapshot` budgets).

## 7. Reliability Split (State vs Events)

| Type | Transport | Policy |
|------|-----------|--------|
| replicated state (transform, hp) | **unreliable** (UDP) | latest wins; loss = just staler |
| events (kill, spawn, loot) | **reliable** (UDP+ACK) | must arrive once, in order |

Never put rare-events on the lossy channel (missed "you won" = rage). Events go through the event queue with an ACK list; on disconnect, replay the unACKed.

## 8. Fizzling & Aggregation Under Budget

If a snapshot would exceed the per-observer byte budget:
- Drop lowest-priority channels first (emote → items → HP).
- Coarsen quantization (sposition → 8-bit).
- Never drop movement below minimum playable (lag fairness).

## 9. Interest vs Server Tick Cost Model

| Metric | Budget |
|--------|--------|
| interest recompute | amortized per movement, not per tick |
| per-observer send loop | < 0.05 ms |
| memory for scope cache | ≤ a few MB |
| packet bytes/clients | the real cost — [interest solves the multiplier] |

If the world is huge (open MMO), **shard by region** rather than interest-only (a view range cap). IM keeps each node's traffic sane; region sharding adds node splitting (see `scaling-architecture`).

## 10. References

- `references/visibility-and-spatial.md` — grids, spatial hashes, frustum pre-step, recompute thresholds
- `references/observer-sets.md` — scope cache, relevance masks, channel interests
- `references/network-lod.md` — per-channel rates, distance LOD, quantization coarsening
- `references/event-queue.md` — reliable event queue, ordering, ACK, replay on disconnect
- `references/state-vs-event-replication.md` — latest-wins vs once-only channels, the split decision
- `references/budgeting-and-prioritization.md` — byte budgets, priority drop lists, aggregation