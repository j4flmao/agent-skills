---
title: Observer Sets and Scope Caches
description: Relevance masks, channel interests, per-observer interest sets, caching and trigger rules.
---

# Observer Sets — Deep Reference

## 1. Who Observes What

Each observer (connection) has an **interest set** — the exact entity list + channel mask it will receive. Building and caching it correctly is the whole job.

## 2. The Relevance Mask (Entity Capabilities)

```cpp
enum Channel : uint32 {
    CH_MOVEMENT  = 1<<0,   // transforms
    CH_HP        = 1<<1,
    CH_ITEMS     = 1<<2,
    CH_EMOTE     = 1<<3,
    CH_ABILITY   = 1<<4,   // spell/cast states
    CH_INTERACT  = 1<<5,   // loot, doors
};
struct EntityRel { uint32 channelsOwned; uint32 channelsShareable; };
```

Observer subscribes to a `wanted = CH_MOVEMENT | CH_HP | ...`. The shareable intersection gates replication.

## 3. Per-Observer Interest Compute

```cpp
void ComputeInterest(Cxn& O) {
    O.interest.clear();
    ScopeQuery(O.pos, O.relevanceRadius, candidates);
    for (EntityId id : candidates) {
        Entity& e = entities[id];
        if (!e.alive) continue;
        uint32 shared = e.rel.channelsShareable & O.wanted;
        if (shared == 0) continue;
        // applies to spatial gating per channel (anim/emote distance rules)
        O.interest.emplace(id, Interest{ shared, nextSendTick });
    }
}
```
Cost: O(relevance candidates) — cheap when spatial hash pre-filters.

## 4. The Scope Cache

`O.interest` rebuild only when:
- moved > threshold (see `visibility-and-spatial`),
- the O's `wanted` mask changed (config change),
- periodic interval (per N ticks) for drift,
- on forced events (aggro/nearby fire/quest) — rarely.

Static scopes (a room membership set) are *precomputed*; recompute on transition.

## 5. Interest as a Per-Tick Filter

Per tick send:

```
for each (id, Interest) in O.interest:
    if !ReplicatedSince(e.version, O.lastSent) → put in send set
```

Track `O.lastSentVersion[id]` per channel so a channel change re-sends. Deltas per channel (not whole entity) — see state replication.

## 6. Interest Overlap & Budget

Multiple observers sharing most entities → builds can be shared: one packet template per "group of overlapping scopes" is a future optimization. Start with per-observer builds (correctness first).

## 7. Rules for "Must Have" Entities

Some entities bypass interest (a tight script):
- The observer's own avatar (always).
- Objective-critical actors (bomb carrier, flag) — replicate even if out of radius (minimal state).
- Team/world announcements (the whole-premise entities).

Mark with `alwaysReplicated` flag; budget their bytes.

## 8. Pitfalls

| Pitfall | Fix |
|---------|-----|
| Shareable/channel confusion (send items you don't own) | mask on both sides |
| Recompute interest per tick | thresholds + events |
| Forgot observer's own avatar | always-include |
| Interest with no byte budget | § budgeting |
| Cache invalidated by movement only | also mask-change/interval |

## 9. Checklist

- [ ] `channelsShareable & wanted` gate.
- [ ] Interest cached via thresholds; rebuilt on mask/event.
- [ ] Per-observer lastSent per channel.
- [ ] Always-replicated set small & budgeted.
- [ ] Static scope precomputed on transition.