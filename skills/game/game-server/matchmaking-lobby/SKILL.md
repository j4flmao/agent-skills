---
name: matchmaking-lobby
description: Expert matchmaking and lobby engineering — skill rating, match formation, queue fairness, region/ping routing, party state and lobby session sync.
---

# Matchmaking & Lobby — Deep Engineering Guide

Matchmaking turns "players waiting" into "a fair game started fast." The lobby keeps a group of players synced until the match host is assigned. This skill covers skill rating, match formation, queue design, region/ping routing, party/lobby state and the mechanics that make wait times feel fair.

## 1. The Two Problems

1. **Matchmaking**: pick the *right* set of players given skill, region, party, prio.
2. **Lobby state**: keep that group's state consistent while waiting (routing to a match server is the handoff).

They're separate services with separate state, but one UX.

## 2. Skill Rating

| System | Model | Notes |
|--------|-------|-------|
| Elo | points, k-factor | simple, moody on big deltas |
| Glicko-2 | `(mu, phi, sigma)` | uncertainty-aware → used by most modern |
| TrueSkill | Gaussian per player | popular, parametrized |

Pick based on *match structure* (1v1 vs team). Key trick: **uncertainty (phi)** — new players search wider; established pros narrow. Do NOT shrink phi to 0 (a swinger's streak becomes untrustworthy).

### 2.1 Rating Updates

Update *after* the match (asynchronously, event-driven). Rules:
- Team matches: update by team aggregate (or per-player with team-corrected delta).
- Smurfing: high variance in `phi` catches a fresh account; correlated accounts (same IP) — flag not ban.

## 3. Match Formation (The Searcher)

### 3.1 The Search Expands Over Time

```
t = 0: strict window  (skill sigma = 100, region local)
t = 15s: widen sigma (200) + relax region
t = 60s: widen further + allow higher ping
t = 120s: "mercy" — worst match still better than no match (queue guard)
```

The **widen over time** is what makes wait times fair: a 3:00 min queue gives up skill to start faster. Config per title (ranked mode: stricter always).

### 3.2 The Match-Size Problem

- Team games: gather party → slots filled from solo/small parties → fill subteams fairly (**fairness across both sides** = minimize `|teamA_avgRating - teamB_avgRating|`, not just pooled).
- BR / large: any exactly-sized shard; rating only a soft guard.

### 3.3 The Scoring Function

A match quality score (m) combined from: skill variance, party-fulfillment, region/ping cost, queue-wait penalty. Choose the *configuration* with the best score via **search over candidates** (not greedy). Data-driven tune (see `match-formation.md`).

## 4. Queue Engineering

- **Queue as a service**: a queueing stream (Redis/Kafka-style) beats DB polling. Push model: server announces "you're being matched" via push (websocket) when a match forms.
- **Queue priority**: solos vs parties (a solo shouldn't wait longer for a small party's sake — policy by title).
- **Leave/jank**: matched but didn't accept → back to queue with cooldown.

### 4.1 The Join Race

Many players join at once → avoid stampede by *offering* the match slot (accept window 10–30 s) then confirming server.

## 5. Region & Ping Routing

- The matchmaker must place players into a **region** (east, west, eu, ...) early: ping to candidate regions measured at queue-time; punish cross-region placement (high ping) in the score.
- Prefer colo-multihost: players in the same region; a player far from all → mercy.

## 6. Party & Lobby States

A **party** = a persistent group (friends). A **lobby** = a party + pending invitees, pre-match.

```
PARTY_IDLE → (search) → QUEUEING → (match formed) → MATCH_HANDOFF
                └─ (leave) → PARTY_IDLE          (handoff owner = leader)
```

- Lobby owner (leader) decides region/mode; others echo.
- State flags: `ready`, `left`, `kicked`, `ownerChanged`.
- Invites expire 60 s; a denial kicks the invite out of the lobby.

## 7. Lobby ↔ Server Handoff

```
matchmaker picks a free server as matchHost
  → sends {matchId, playerList, region, mode, seed} to lobby service
lobby announces to all members: "match ready → join {serverIp}"
members connect to the authoritative server with their session token
server validates token + sends ACK to matchmaker (consumption)
```

Atomicity: the token single-use prevents double-join. If a member never arrives, the server holds a short grace and starts with a bot/penalty.

## 8. The Anti-Abuse Angle

| Cheat | Counter |
|-------|---------|
| Queue-dodge | cooldown + MMR loss after N dodges |
| Smurf (new account) | uncertainty phi catches outliers |
| Stack-smurf (4 pros with 1 new) | average-teaming guard + region/ping still apply |
| Long-wait exploit | merciless auto-start out of mercy |
| Fake region (VPN) | ping measured, not claimed |

## 9. Observability

| Metric | Watch |
|--------|-------|
| P50/P95 queue wait | compare per mode/bucket |
| Match quality score distribution | mean rising = bad |
| Abandon rate post-match-made | dodge tool |
| Avg rating delta per side | fairness guard |
| Region hops | cross-region rate |

## 10. References

- `references/skill-rating.md` — Elo/Glicko-2/TrueSkill math, phi, team updates, smurf detection
- `references/match-formation.md` — search window, widening, score function, fairness across teams
- `references/queue-engineering.md` — push queue, accept windows, join race, dodging/cooldowns
- `references/regions-and-ping.md` — ping measurement, region routing, cross-region penalties
- `references/party-and-lobby-state.md` — party/lobby lifecycle, ownership, invites, ready checks
- `references/server-handoff.md` — matchmaker→server assignment, single-use tokens, join validation