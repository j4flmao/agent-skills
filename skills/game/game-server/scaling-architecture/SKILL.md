---
name: scaling-architecture
description: Expert game server scaling — zone sharding, stateless services, state persistence, region/edge routing, observability and capacity/autoscaling orchestration.
---

# Scaling Architecture — Deep Engineering Guide

From "hundreds playing" to "a million in a weekend": how the server fleet grows without breaking determinism, latency or cost. Skill covers zone/sharding, stateless matchmaking + stateful game pods, persistence, region/edge, observability and capacity/autoscaling.

## 1. The Scale Model (Start Simple, Grow Recursively)

```
Tier 1: one game server process + one lobby = 10–200 players
Tier 2: many per-region pods; lobby → matchmaker → pod (stateful), stateless elsewhere
Tier 3: zone-sharded (an open world is units of zones), state in DB, edge relay
```

The rule: **stateful = the game pod only; everything else stateless + horizontally scalable.**

## 2. Stateless vs Stateful

| Service | State? | Scale |
|---------|--------|-------|
| login / auth | token-cache only | stateless, autoscale |
| matchmaker / queue | KV session state | stateless, replica |
| lobby | KV per lobby | stateless, replica |
| **game pod** (sim + authoritative) | **in-memory world** | stateful, region pods |
| anti-cheat ledger | append-only store | stateless readers |

Stateless services scale by adding replicas (a load balancer + key reconciliation). The *game pod* can't split mid-match — the world is one authority. Match *size* and *zones* bound it.

## 3. Zone Sharding (The Open-World Pattern)

A huge world is divided into **zones** (usually map regions, ~200–1000 players each):

```
world = zone_A (pod A) | zone_B (pod B) | ... 
zone boundary: players crossing migrate (state transfer + connection handoff)
```

Each zone runs : authoritative sim + interest management (the IM skill) + a **boundary service** that exchanges the *edge band* (entities within N m of the boundary) so players see across seamlessly.

Migration protocol:
```
detect crossing → freeze at zone, hand serialized entity+connections
  → zone B takes over → client reconnects to zone B pod (token re-issue)
```
Use interest gating to keep the handshake *small* (only edge entities travel, not the world).

## 4. Region Routing & the Edge Band

- Region = a cloud region with its own pod pool (see `regions-and-ping`).
- Player → nearest region (measured, not claimed).
- **Edge relay** for bandwidth: a CDN/relay that terminates the client UDP, forwards to the pod — absorbs jitter, reduces pod load, lets the pod be anywhere.

```
client → edge relay (region-local) → game pod
```

### 4.1 The Two Bandwidth Paths

| Path | Purpose | Cost |
|------|---------|------|
| client → relay → pod | gameplay traffic | region-local, low |
| pod → relay → client | snapshots (interest-gated) | proportional to interest |

Keep the relay *stateless* (it forwards, doesn't decode) — a fleet of relays autoscale like any stateless tier.

## 5. State Persistence (The Durable Truth)

- **The world is ephemeral** (a match dies at end). Persist only: player account state (MMR, unlocks, inventory), match outcomes, cheat ledger.
- DB by shape:
  - MMR/inventory (per-player small) — KV/cache with snapshots.
  - Match outcomes (append) — timeseries/append.
  - Blob/demo archives (wire logs) — object store.
- **Golden player state** = DB row; the game pod holds a working copy, writes back on end/milestone (write-behind).
- Never have a pod *own the only copy* of a player's progression (pod dies → lose MMR).

```cpp
// end of match: worker flushes:
SaveProgress(playerId, {mmrDelta, unlocks, inventory})
// idempotent, versioned (optimistic lock per player)
```

## 6. Observability (See Everything)

Every service emits red metrics: requests/s, latency, errors, queue depth. Adoption:

| Layer | Tool shape |
|-------|-----------|
| logs | structured JSON, sampled at 1% (heavy paths) |
| metrics | counters + histograms (p50/p95/p99) per service |
| traces | distributed spans: matchmaker→lobby→pod→relay |
| profilers | tick-time histograms per pod (§ tick-loop) |

SLOs (examples):
- queue→match < 90s p95
- pod tick p99 < 5 ms
- relay drop < 0.5%

## 7. Capacity & Autoscaling

- Pods are **ephemeral**; capacity = "pods per region" decided by predicted DAU × match rate.
- Autoscale signals: queue→match latency rising, pod CPU/bandwidth, relay capacity.
- Predictive: pre-warm pods for big events (launch, sale, weekend) from telemetry — *never* first-tick to scale.

```
capacity planner: 
  DAU → ccu curve → avg concurrent matches → pods(region)
  + headroom 20% + burst pod-provision latency scaled in
```

- **The "cheaper than a player-rush-DDOS" rule**: oversized headroom is cheaper than losing a launch.

## 8. Stateless/LB Patterns

- Load balancer routes by *region affinity* (sticky) + health checks.
- A stateless service must be **idempotent** (retry-safe): matchmaker formation, lobby ops, rating updates (see the matchmaking-lobby refs).

## 9. The Determinism + Scale Conflict

Scaling tempts you to split *within* a match (sub-sim). That breaks determinism (two pods disagree → desync). **Never split a match's sim.** Split matches (more pods) and (for open worlds) split the world into zones — but a single match = a single pod's sim, forever.

## 10. References

- `references/zone-and-shard.md` — zone partition, boundary migration, edge-band exchange, region-capacity
- `references/stateless-services.md` — stateless design, idempotency, replica scaling, LB affinity
- `references/state-and-persistence.md` — golden-state DB, write-behind, optimistic concurrency, durability
- `references/region-and-edge.md` — region routing, edge relays, bandwidth throttling, jitter absorb
- `references/observability.md` — metrics, traces, logs, SLOs, dashboards, cost of telemetry
- `references/capacity-and-autoscaling.md` — capacity math, predictive prewarm, autoscale signals, pods