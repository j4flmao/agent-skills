---
title: State Persistence and Durability
description: Golden player state, write-behind, optimistic concurrency, durability tiers, and what a game server must and must never persist.
---

# State & Persistence — Deep Reference

## 1. What's Durable (and What Isn't)

| Data | Durable? | Store |
|------|----------|-------|
| Player account (MMR, unlocks, inventory) | YES | KV + snapshot |
| Match outcomes | YES | append-only timeseries |
| Cheat ledgers | YES | append-only |
| Match leaderboards | YES | timeseries/OLAP |
| **The live world state** | **NO** | pod memory (ephemeral) |

A crash mid-match loses the *match* (players replay), never the *progression*. That's the entire persistence philosophy.

## 2. The Golden-Player-State Row

```cpp
struct PlayerState {
    PlayerId id;
    uint64 version;             // optimistic concurrency
    float   mmr;  float phi; float sigma;
    Inventory inv;              // immutable items (list + hashes)
    Unlocks  flags;
    Progress pg;                // story/quest
    Instant lastUpdate;         // monotonic (see rating)
};
```
Central store (KV with snapshot → durable). **The game pod never owns the only copy**: it reads, plays, writes-back on end/milestone/pulse.

## 3. Write-Behind (The Pattern)

```cpp
// game pod at matchEnd:
async SaveProgress(playerId, newState)   → KV put (CAS version) 
// and at heartbeat (every N min) for long matches.
```
- Write-behind (async flush) + **idempotent put** = no lost updates, no double-pay.
- Optimistic lock: CAS on `version`; conflict → re-read + retry (the latest wins; treat the DB as truth).
- **Rule: a player's currency/items/no 'teleport back' can never depend on a pod being alive at the right moment.**

## 4. Durability Tiers

| Tier | Use | Sync pattern |
|------|-----|--------------|
| hot   | MMR, currency deltas | write-behind + CAS |
| warm  | match outcomes, stats | append-only batch every 30 s |
| cold  | wire logs, demos, evidence | object store async |

Never put *each tick* of the world into a DB. World = ephemeral; deltas that matter = the endpoints (match end, milestones).

## 5. The Transactional Truth (Bounded)

The only "transaction" worth having: **player progress update** (MMR + inventory + unlock atomically, versioned). Everything else (match state) is idempotent-event (see stateless-services).

```
begin: read player row (version) 
  apply match outcomes + inventory deltas
commit: CAS(version) — retry if conflict
```

## 6. Consistency in a Distributed Aftermath

- Rating updates arrive from many pods — the CAS loop + monotonic `lastUpdate` (never rewind).
- Divergent duplicates (a pod dies after writing outcome but before returning) → idempotency key `opId = {matchId, playerId}` dedupes.
- Two player rows updated by two services → put both in ONE row document (avoid cross-row transactions).

## 7. Storage Failure Semantics

- Fail-to-write → don't block the match; queue the flush, retry with backoff, alert if the queue sick.
- The world state *never* waits on the DB; the DB catches up on its own.

## 8. Metrics

| Metric | Watch |
|--------|-------|
| CAS conflict rate | > 5% → hot row of a famous player |
| flush-queue age | retry health |
| DB write p95 | latency gating |
| durability loss (never > 0) | disaster drill |

## 9. Pitfalls

| Pitfall | Fix |
|---------|-----|
| Pod owns progression copy | golden state in DB |
| Sync-write per tick | write-behind endpoints |
| Non-CAS overrides | version gate |
| Two rows one logical update | single doc |
| Duplicate outcome writes | opId dedupe |
| DB stall blocks play | non-blocking queued flush |

## 10. Checklist

- [ ] Progression = DB golden row (CAS).
- [ ] Match world = ephemeral; flush at end/milestones.
- [ ] Write-behind + idempotency keys.
- [ ] Durability tiers (hot/warm/cold).
- [ ] CAS conflict + flush-age metrics.