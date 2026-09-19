---
title: State vs Event Replication
description: Latest-wins vs once-only channels, choosing the split, hybrid cases and client-side resolution.
---

# State vs Event Replication — Deep Reference

## 1. The Split Decision

Ask: **"If this update is lost, is the world still right?"**

| Data | Correct if lost? | Transport |
|------|------------------|-----------|
| position, hp, ammo (level) | yes (next snapshot updates) | state (latest-wins) |
| "picked up sword" | no — the item vanishes | event (reliable) |
| "spell cast" | no — match of the cast | event |
| "round ended" | no | event |
| "enemy approached" | yes (next tick) | state |

Always begin at "state" and escalate to "event" only where *transitions* matter (see §4).

## 2. State Channels (Latest-Wins)

- Unreliable transport (UDP), seq for order, no retransmit.
- Consumer uses the **latest value**; lost = stale until next send.
- Interpolation: client blends between last two received values (see `rollback-and-reconciliation`).

```cpp
// sender: sends value only if changed relative to last sent for that channel
if (!ChannelChanged(cxn, ch, value)) skip;
```

## 3. Event Channels (Once-Only, Reliable)

- Reliable + ACK; global seq; dedup; replay on reconnect (`event-queue`).
- A hint: events usually carry *state-changing* results — after an event, the entity's state jumps (the client re-syncs its view from the value).

## 4. The "Transition vs Level" Rule

A rigorous way to pick:

```
if you mutate a persistent variable that others read, and the mutation
must be visible exactly once → event (often in ADDITION to a level update).
if it's a continuously-changing measurement → state.
```

Example: "player gains 5 HP." The *level* (hp) is state (next snapshot fixes it). The *gain* itself (a +5 popup, assist trigger, feed event) is event. So both:
- state: hp latest (unreliable),
- event: "hp gained +5, id=.." (reliable, drives UI/logic).

This dual is the **correct** model — combining both solves the "hp never decays visually" mismatch (§ events vs snapshots).

## 5. Hybrid Defaults

| Scenario | State? | Event? |
|----------|--------|--------|
| Movement of NPC | yes, LOD rate | — |
| Pickup of a one-time item | no | yes |
| Damage tick to HP | yes (level) | optional "hit" event |
| AI spawn | no | yes (spawn event) |
| World/room transition | no | yes |

## 6. Determinism Interaction

Events must replay idempotently AND deterministically: the *same* event applied twice must produce the same state (for rollback/replay tests). Keep the event's payload the *intent* (e.g., "deal 5 dmg to ent 7"), not the outcome ("ent7 hp now 45"), so the result re-computes consistently.

## 7. Client Resolution (Once Again)

When state+event conflict arrive at different times: the client applies **state immediately** (authoritative current) and **queues events** for effects. A queued "smoke puff" for a dead entity: play the effect then the death (order by seq, then check current state — dead).

## 8. Pitfalls

| Pitfall | Fix |
|---------|-----|
| HP gains on unreliable | both: state level + reliable event |
| One-time loot on unreliable | never — reliably |
| Event without idempotency | won't survive replay |
| Everything reliable (bloat) | split by the transition rule |
| Event applied twice when ack wins race | dedup set |

## 9. Checklist

- [ ] Split decided by "world still correct if lost".
- [ ] State: latest-wins, no-retransmit, channeled.
- [ ] Events: reliable, idempotent, dedup.
- [ ] Dual model for level changes (+dmg/+hp/+loot).
- [ ] Event payload = intent (deterministic result).