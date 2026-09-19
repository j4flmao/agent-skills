---
title: Budgeting and Prioritization
description: Per-observer byte budgets, priority drop order, aggregation, quantization fallbacks and envelope management.
---

# Budgeting & Prioritization — Deep Reference

## 1. The Endgame Metric

Every per-observer send must fit in a budget (`bytesPerSecond`). When over, we don't exceed the budget — we *drop the least important thing*. Interest management + budgeting = the two halves of scalable servers.

## 2. The Per-Observer Byte Budget

```cpp
struct CxnBudget {
    int   bytesPerSecond;      // 5–60 kB/s depending on title + tier
    int   bytesThisTick;
    int   bytesPerTickRefresh; // every 1000/maxSendHz
};
```
Typical per-title budget (match game type):
```
strategy: 2–8 kB/s ; shooter: 16–60 kB/s ; MMO: 4–40 kB/s (plus events)
```
Actual budget derived from the *hardware* measure (test under real player density).

## 3. Prioritized Sending

Per tick, assemble the per-observer packet in priority order:

1. mandatory (events, critical).
2. state channels by **interest order**: movement (gameplay) > HP > ability > items > emote.
3. stop when `bytesThisTick >= budget`.

Use a **priority bucket** (ordered list of (id,channel,priority)) built in the interest pass.

## 4. Degradation Ladder (When Over Budget)

| Priority | Drop |
|----------|------|
| 1 | coarsen quantization (int16→int8) |
| 2 | drop cosmetics channels (emote/items) |
| 3 | reduce send rate (see network-lod) |
| 4 | drop whole *entities* furthest first |
| 5 | (never) drop movement below floor |

Each tier trades visible fidelity for a byte saving, never correctness.

## 5. Aggregation

- Combine multiple channels of one entity into one packet segment (one header).
- Buffer bytes per entity; flush in size buckets.
- **Pipe coalescing**: only one packet per tick per observer (not per entity) — packet header amortized.

## 6. The Envelope Model (QC/priority bits)

Optional per-packet:
```
[SYNC | 1] [priority: 3 bits] [seq: 16] [changelist: (16 bits dirty) | ...]
```
The envelope lets the receiver discard low-priority parts under its own drain — though normally the sender respects the budget.

## 7. Metrics

| Metric | Meaning |
|--------|---------|
| actual bytes/s vs budget | hit-rate |
| priority-4 drops | furthest-entity drops (ok if rare) |
| queue depth | send spikes |
| % of ticks at/or minus budget | under-control |

Watch: a title where "everyone maxes budget every tick" = design overshoot; the interest model should give slack typical play.

## 8. Pitfalls

| Pitfall | Fix |
|---------|-----|
| Budget = hard cap violated | no — degraded, not dropped |
| Priorities immutable | per-channel + per-distance |
| Per-entity packet (N packets/frame) | aggregate per tick |
| Under-budget = over-send | send deficit stays in sink (prevents burst) |
| No byte meter | budget counters in profiler |

## 9. Testing

- Sim: 100 players in a zone → assert sender never exceeds budget; packets stay under `MTU-ish` and p99 latency stable.
- Verify the degradation ladder: kill a player's internet briefly → tier-4 drops only, gameplay floor intact.

## 10. Checklist

- [ ] Per-observer bytes/see budget.
- [ ] Priority-order send + early-stop.
- [ ] Degradation ladder (quantize → channels → rate → entities).
- [ ] Per-tick aggregation, one packet/observer.
- [ ] Budget + hit-rate metrics dashboarded.
- [ ] Under-pressure test green.