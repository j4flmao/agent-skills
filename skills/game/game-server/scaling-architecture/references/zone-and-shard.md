---
title: Zone and Shard Partitioning
description: World zone partitioning, boundary-crossing migration, edge-band exchange, and region capacity.
---

# Zone & Shard — Deep Reference

## 1. Why Split at All

A single authoritative sim supports ~200–1000 players before CPU/bandwidth make ticks unhealthy. An open world needs *more*: **split the world into zones, each with its own pod**. The split is *geographical*, not sim-level (never split a match's sim).

## 2. The Zone Grid

- Map divided into zones sized ~200–500 players peak (tune by activity — dense cities need smaller cells).
- Zone = its own pod running authoritative sim + IM.
- Each zone knows its **boundary band** (`edgeWidth` ≈ interest radius): entities within are *also* replicated to the neighbor zone(s).

```
      zone A (pod A)          zone B (pod B)
   ┌─────────────────┐    ┌─────────────────┐
   │  interior        │ ▒▒▒│ edge band (shared) │
   └──────────┬──────┘    └──┬─────────────┘
              │  boundary   of shared state
```

## 3. The Edge-Band Exchange (Consistency Proposition)

Entities in the band are *shared*: zone A sims them, sending positions to zone B's relay-only replicas (for B's clients to see) and vice versa. Lane:

```
pod A: for e in band(A): replicate e.pos to pod B (at interest rate) ✓
pod B: for e in band(B): replicate to A (same)
clients in either zone see a *stale-but-consistent* version of the neighbor's band.
```

- Consistency: eventual (a shot fired from B at an A-band entity resolves in B against B's copy — the "fair shooter" rule is intact because the *shooter's* zone is authoritative for the shot).
- Conflict: if the boundary is crossed *and* a shot crosses too — resolve by "the zone that initially owns the victim adjudicates any cross-zone hit" (document the rule once).

## 4. Crossing Migration

```
player: A → B
1. detect crossing (A: entity past boundary + no longer in A's interior workload)
2. freeze A copy (serialize entity + active VCambits + inputs)
3. B adopt: send handoff {entity state, connectionMap} to B
4. B spawns the entity as authoritative; notify clients (re-route interest)
5. A drops its copy after a grace (unless the player turns around - A keeps a stale ghost for the band)
```

Migration must be **atomic-ish and idempotent**: retries safe (crossing twice = ghost cleanup).

## 5. Load-Balancing Zones

- Move zone boundaries adaptively (a busy city migrates its edge outward) — or split a hot zone (sub-zone); merging happens on idle.
- The *shared* boundary makes moves/migration the *costliest* op — batch migrations per tick, cap concurrent.

## 6. Partitions of the Problem Space

| Partition | At | Granularity |
|-----------|----|-------------|
| Zones (open world) | world geometry | 200–500 players |
| Matches (session game) | match | 12–64 players |
| Shards (economy/wardrobe) | logical region | per-population |

Shards = same world image, different populations — no boundary math, just routing.

## 7. Region Capacity & Pod Budget

| Pod | Peak load |
|-----|-----------|
| CPU/tick per player | < 0.1 ms (see authoritative) |
| snapshot bytes per player | ≤ 60 kB/s |
| zone cap (peak) | 200–500 (tunable alert) |

## 8. Pitfalls

| Pitfall | Fix |
|---------|-----|
| Split a match sim (desync) | never; zone only |
| No edge band (hole at seams) | shared band |
| Migration not idempotent (ghosts) | grace + cleanup |
| Cross-zone shot ambiguity | adjudication rule |
| Hot zone ≠ capped | boundary-moving / sub-split |

## 9. Checklist

- [ ] Zone grid sized to peak activity.
- [ ] Shared edge band between neighbors.
- [ ] Migration atomic/idempotent, capped per tick.
- [ ] Cross-zone hit adjudication documented.
- [ ] Hot-zone splitting + boundary movement.
- [ ] Zone pod peak-load alerting.