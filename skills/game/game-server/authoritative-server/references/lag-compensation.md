---
title: Lag Compensation for Hit-Scan
description: Server rewinding hit-scan bullets to client-consistent timestamps, stored poses, fair-shot verification and tradeoffs.
---

# Lag Compensation — Deep Reference

## 1. The Problem

A client sees a target where the *client*'s state says it is. If the server raycasts against the *current* server state, the bullet always misses (server is "in the future"). The fix: hit detection happens against a *rewound* state consistent with the shooter's view.

```
t (shooter's render time = now - (RTT/2))
server stores world poses per tick for last RTT
on shot: rewind to t, raycast vs stored poses
```

## 2. The Poses Buffer

Server keeps per-tick per-entity transforms (`historyBuf`):

```cpp
struct RewindPose { uint32 tick; Transform tf; bool alive; };
sweep buffer: last N ticks (N ≈ RTT_MS/TICK_MS + slack) × entities
```
Memory: 100 ms × 64 players × 48 B ≈ 0.3 MB — cheap.

Maintain it *off the hot path*: written by the sim, read by the hit check; use double-buffer + a fence to avoid torn reads.

## 3. The Rewind Algorithm

```cpp
bool VerifyHit(HitQuery q, float shootClockMs) {
    uint32 targetTick = toTick(now - shootClockMs/2);   // shooter's sim time
    RewindPose* pose = historyBuf.lookup(q.targetId, targetTick);
    if (!pose || !pose->alive) return false;            // deadly at that time
    ray = Ray(q.origin, q.direction);
    return RayOBB(ray, OBB(pose->tf));                  // vs stored pose
}
```

- `shootClockMs = now - ping(client)`; ping measured server-side (RTT×0.5 approx).
- If the tick isn't in the buffer (beyond RTT), clamp to the edge — the check is "as fair as we can");

## 4. Fairness Decoupling

The hit *may* be granted by the rewind check even though in the *current* state it'd miss; the server then **applies damage as of the rewind state** — and resolves the delta (the target may have moved off). This is authoritative because:
- The result follows from the stored truth at that time.
- The shooter always gets what they *saw* (never penalized for latency).
- The victim's death is decided by server state, not client claim.

## 5. Tradeoffs & Caps

| Concern | Cap |
|---------|-----|
| How far back can the server honor shots? | rewind window = max(RTT, 100 ms) — else clients abuse |
| Replay volumes on shot | one ray per shot, bounded |
| Stored poses staleness | refresh per tick; write fences |

Anti-abuse: cap the rewind so "prefire" beyond the window doesn't count; shots need a server tick *in the window* to be valid.

## 6. Interaction With Rollback

- If the shot target *also* has a rollback difference (their late move), prefer the rewind pose buffer (simpler + matches shooter view).
- Never combine both paths ad hoc — pick a single "hit test truth" = rewind poses at shot-clock.

## 7. Aim Assists & Validation

The server validates even good clients (their pose buffer still authoritative). "Aim assist" on the *server* is unusual (it would benefit more than the client) — keep assistals client-side cosmetic, never server-granted.

## 8. Debug & Metrics

| Metric | Meaning |
|--------|---------|
| hit-miss rate for shot (rewind vs now) | if huge, rewind window wrong |
| rewind buffer coverage | percent ticks found |
| out-of-window shots | anti-abuse noise |

Label in profiler: `lagcomp.rewind_hits`, `lagcomp.buffer_hitrate`.

## 9. Pitfalls

| Pitfall | Fix |
|---------|-----|
| Raycast against current state | rewind to shot-clock |
| Rewind window unbounded | cap at RTT |
| Poses read during write (torn) | double-buffer + fence |
| Dead target in rewind "alive" | store alive flag in pose |
| OBB precision | stored as all 15 axes? just OBB from tf |

## 10. Checklist

- [ ] Poses buffer sized = RTT + slack.
- [ ] Rewind to `now - ping/2`.
- [ ] Hit applied vs rewind state; damage from that state.
- [ ] Caps: window, ray count.
- [ ] Double-buffer + fence for few reads.
- [ ] Metrics on coverage + out-of-window.