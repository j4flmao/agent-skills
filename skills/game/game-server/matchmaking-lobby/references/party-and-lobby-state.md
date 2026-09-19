---
title: Party and Lobby State
description: Party/lobby lifecycle, ownership, member state, invites, ready-checks and handoff transitions.
---

# Party & Lobby State — Deep Reference

## 1. Party vs Lobby

- **Party**: persistent group across matches (friends). Lives outside any queue.
- **Lobby**: party + currently-joined players, pre-match (search/fillers). Ephemeral; becomes a match on handoff.

```
PARTY (persistent, owner)
   └─ [Party enters lobby] → LOBBY (sync group, filling)
        └─ [search] → QUEUEING (read-only lock)
             └─ [match found] → MATCH_HANDOFF (transfer)
```

## 2. Ownership & Leadership

- Party leader: creates the party; can kick/promote/invite.
- Lobby leader = party leader (default) or last-owner-on-rejoin.
- **Ownership transfer** on leader leave: promote highest tenure member (deterministic), notify all.

State that must follow ownership: `mode`, `region`, `invite list`, `ready flags` (see §5).

## 3. Member State Machine

```
JOINING → ACTIVE (in lobby/party)
        → READY (declared ready)
        → KICKED | LEFT | OWNER_CHANGED
        → OFFLINE (heartbeat lost)
```
- Kicked → server revokes membership immediately (revokes invites + auth).
- LEFT → membership revoked; if party, re-invite allowed (by owner).
- OFFLINE (heartbeat missed, 30 s) → marked; on return, auto-restore if lobby still open.

## 4. Invites

- Invite = `{fromId, toId, lobbyId, expiry=60s}`.
- Deny/expire → invite revoked. A player may hold ≤ N pending invites.
- Invite acceptance joins the lobby if slots < party cap; else "Lobby full — create your own party" (section: no merge).

## 5. Ready-State & The Lock

Immediately before matchmaking, the lobby **locks**:
```
locks = all(READY)  or  leader forced-start
locked → no member changes (except leader kick)
```
- Ready = explicit click; locked lobby = the queue phase. Unready = lobby drops out of the search (queue-pause) — that's the "I'm waiting for my friend" UX.
- A lock with a stuck unready member → timeout (60 s) → leader can force.

## 6. The Queue Phases Inside the Lobby

```cpp
enum LobbyPhase {
    OPEN,            // invites welcome
    LOCKED_QUEUING,  // search running; ready flags frozen
    MATCH_OFFERED,   // offer pending (accept window)
    MATCH_CONFIRMED, // server assigned; all join
    CLOSED,          // late join rejected / left
};
```
Transitions are events (idempotent) — see `event-queue` for the reliable pattern.

## 7. Handoff to a Match (Atomic)

```
matchmaker picks host server → ensure locks → assign {matchId, serverIp, tokens}
lobby announces CLOSED + matchReady → clients connect with token
server validates token (single-use) → ACK to matchmaking
on ACK (or timeout) → matchmaker consumes the slot
```
Never re-offer the same matchId to a second server; tokens one-time. If the whole match fails (server crash pre-start), the lobby returns to `LOCKED_QUEUING` with preserved waits (idempotent re-formation).

## 8. Consistency & Consistency-Errors

- All lobby state is **authoritative** (server-side); the client reflects. A client that shows "I'm in lobby" when server closed it: the next heartbeat/transition tells the truth (reconcile).
- VCard: the lobby number is authoritative — "12 in lobby" vs leader-efficiency UI text discrepancies alert sync bug.

## 9. Metrics

| Metric | Use |
|--------|-----|
| lobby fill time (players→ready) | barriers |
| lock→handoff latency | queue+server slow? |
| kick/leave rate pre-match | churn |
| restore-on-reconnect rate | infra |

## 10. Pitfalls

| Pitfall | Fix |
|---------|-----|
| Owner leave orphans | deterministic promote |
| Invite join mid-lock | lock enforced |
| Ready check stuck | leader force + timeout |
| Two matches offered (RPC race) | single-use token |
| Client diverges from lobby truth | authoritative hooks |

## 11. Checklist

- [ ] Party persistent; lobby ephemeral.
- [ ] Ownership promote on leader leave.
- [ ] Ready-state lock before queue.
- [ ] Invite expiry + cap.
- [ ] Atomic handoff (token single-use).
- [ ] Queue-resume idempotent after failures.