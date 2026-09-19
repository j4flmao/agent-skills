---
title: Queue Engineering
description: Queue as a service, push vs polling, accept windows, join races, dodging/cooldowns and scale.
---

# Queue Engineering — Deep Reference

## 1. The Queue Is a Service

Matchmaking queue must be its **own service** (scaled nodes), not a DB table polled per second. Model: a persistent stream (Redis list / Kafka topic) that the matchmaker *consumes*, not a shared `SELECT`.

- Enqueue: player pusher writes `{playerId, mode, payload}` (idempotent key = playerId).
- Matchmaker: consumes in batches every ~1 s; formation logic runs off the pool snapshot.

## 2. Push, Not Poll (Client UX)

State pushes to the client over the same socket channel:
```
queueUpdate { queuePos, estWaitRange, mode }   → every ~2–5 s
matchOffered { matchId }                       → the big moment
```
Only two push events, nothing chatty. Polls = wasted traffic + jank.

## 3. The Accept Window (Critical UX)

When the matchmaker forms a match:
1. **Offer** all candidates (10–30 s window).
2. Whichever accept → provisional booking.
3. On window end: confirmed members + fill (bots or re-search) for missing.
4. Everyone **not** accepting → back in pool, wait-clock preserved (no restart penalty).

Accept UI: blocking modal countdown that can't be dismissed into doom.

## 4. The Join Race (Stampede)

All players wave "ready" at once → don't let everyone into the match server simultaneously:
- Matchmaker hands off to a **single designated match server** (see `server-handoff`) with a staged join: staggered `joinStart` in offer (players 1–5 join t=0, 6–12 t=+2s). Prevents the DB/server thundering herd.
- Staged join also backfills spectators: spectator stream connects early.

## 5. Dodging & Cooldowns

| Pattern | Response |
|---------|----------|
| Declined offer | queue again, wait preserved |
| Accept then disconnect pre-match | MMR loss (small) + cooldown 60 s |
| Serial dodges (3+) | escalating cooldown + rating penalty |
| Queue-mismatch (party leader changes mode) | leave → re-enqueue, wait reset |

Distinguish from "accidental disconnect": disconnect ≠ dodge if the player was still in pool unharmed — fine.

## 6. Scale Shapes

| Scale | Architecture |
|-------|--------------|
| < 5k concurrent | single queue service node |
| < 100k | sharded by mode/region + 1 queue per shard |
| MMO-scale | per-shard queue + matchmaker pool of servers (see scaling-architecture) |

The queue service must scale horizontally: stateless consumers (formation state in a KV: `playerId → {state, waitStart}`).

## 7. Fairness Under Load

- When pool is thin, mercy triggers earlier (fail-fast, don't idle-queue).
- **Prioritized modes**: ranked first (people paid for ranked? or it's a promise), casual queue flexible.
- Never queue a player in two modes at once (one active search key).

## 8. Crash & Recovery

- Player may.players + enqueue on a reconnecting client: idempotent key re-insert if state says "queued"; offer → "already in a match" (reject cleanly).
- Matchmaker crash: re-run formation from the shard's stream (after idempotency check: formation state in KV, re-form safe).

## 9. Metrics

| Metric | Use |
|--------|-----|
| enqueue→offer latency | the core wait time |
| offer→accept rate | UX friction |
| queue abandonment (leave voluntarily) | wait feel |
| staged-join success | travels |

## 10. Pitfalls

| Pitfall | Fix |
|---------|-----|
| DB poll loop | stream consume batched |
| Client poll for updates | push/socket |
| No accept window → instant jump | offer window |
| All join at once | staged join |
| Queue restart on decline | preserved wait |
| Double-enqueue on retry | idempotent key |

## 11. Checklist

- [ ] Queue = dedicated service on a stream.
- [ ] Push-state updates (pos, est).
- [ ] Offer window + staged join.
- [ ] Dodge penalties escalating.
- [ ] Idempotent enqueue + crash recovery.
- [ ] Latency/accept/abandon metrics.