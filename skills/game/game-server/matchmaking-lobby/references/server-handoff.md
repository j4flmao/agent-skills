---
title: Server Handoff from Lobby
description: Matchmaker-to-server assignment, single-use tokens, join validation, staged join, and failure recovery on handoff.
---

# Server Handoff — Deep Reference

## 1. The Critical Moments

The lobby→server transfer is where "inches from playing" goes wrong (longest UX queues, can't-resume state). Four moments: pick server, offer, allocate hosts, join.

## 2. Choosing the Host

Matchmaker maintains a **server pool** (per region):
```
server = pool.Pick(region, mode, map);
if none → wait/backfill (pool signals MATCHMAKER_WAIT)
```
Picking logic: least-loaded pod with the map cached / fastest spin-up. Status coming from `UpdateMetrics` per pod (see scaling-architecture). Short pool → queue echo back "waiting for server" (honest, not silent).

## 3. The Token (Single-Use)

```cpp
token = { matchId, serverId, playerId, nonce, expiry }
```
- **One serve per player**: the client presents the token in `JOIN`; server validates:
  - token unexpired,
  - matchId matches its own,
  - nonce unused (dedupe on retry),
  - playerId in the match roster.
- Server replies `JOIN_OK + sessionToken` (authoritative token — see connection-and-session).
- Matchmaker consumes the offer (state `OFFER → CONFIRMED → SERVED`) when the first `JOIN_OK` returns; if a player never shows in `acceptWindow`, the slot is released (bot or re-search).

## 4. The Join Protocol (Staged)

```
matchOffered (each player)      
accept (all)                    
  leader confirm → matchmaker allocates host (see above)
serverInit{ map, seed } → all join in order (staged 2s apart)
joinOK{ sessionToken, worldSnap }
```

- Staged join prevents the stampede (§ queue-engineering).
- The **seed** is authored by the matchmaker (deterministic replay possible: same seed + input file → same match).

## 5. Handling the Failure Cases

| Failure | Recovery |
|---------|----------|
| Server down before start | return lobby → re-queue, waits preserved |
| Player never arrives | grace 15 s → bot / penalty |
| Token expired mid-join | re-issue once (within resend) |
| Client reconnect into existing match | re-auth via session token (see connection-and-session resume) |
| Matchmaker crash between offer & allocate | re-run formation idempotently (state in KV) |

All transitions are **idempotent events** — exactly-once delivery matters (see `event-queue`).

## 6. The "Server Pool Gas" — Backfill

- Prewarm at least one idle pod per region so "match made" → "server up" is instant.
- Choose a pod *before* the offer window (reserve), and only release if the offer fails.
- Under load: skew spin-up to the matchmaker's queue growth (predictive).

## 7. Metrics

| Metric | Alarm |
|--------|-------|
| offer→joinOK latency p50 | > 5 s |
| handoff failure % | > 0.5% |
| reserve-wasted (offer fail then release) | tune |
| pool empty (waiting on server) | capacity planning |

## 8. Pitfalls

| Pitfall | Fix |
|---------|-----|
| Token reusable | single-use nonce |
| Join without roster check | roster gate |
| Stampede of joins | staged |
| Pool empty = silent queue | expose "waiting for server" + metric |
| Offer consumed twice | consume-by-ID atomic |

## 9. Checklist

- [ ] Server picked pre-offer; pool metrics live.
- [ ] Single-use tokens validated (matchId, nonce, expiry).
- [ ] Staged join; joinOK + session token flow.
- [ ] Failure recovery idempotent (lobby restore, slots).
- [ ] Offer→join p50 metric on dashboard.