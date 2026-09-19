---
title: Connection and Session Handling
description: Connection state machine, handshake challenge, heartbeat, timeouts, resume/backfill and server lifecycle for online games.
---

# Connection & Session — Deep Reference

## 1. The Connection State Machine

```
NOT_CONNECTED
   └─(connect request)→ HANDSHAKE     ← nonce challenge/response
        └─(auth ok)→ ESTABLISHED
             ├─(packet loss → reconnect)→ RESYNC (re-auth + resync)
             ├─(idle)→ (timeout)→ CLOSED
             └─(player quit)→ CLEANUP (save state) → CLOSED
```

Each state has a timeout; server enforces idempotent (a stale retry doesn't double-join).

## 2. The Handshake (Challenge/Response)

```
server → client: {nonce, sessionId}
client → server: {signMe(nonce, clientVersion, platformToken)}
server: verify nonce unspent + signature → issue sessionToken
```
Why: prevents spoofed connects (an attacker can't sign the nonce), ties the role to a validated identity, and lets the server throttle (rate-limit handshakes per IP).

Session token: `{matchId, playerId, salt, expiry}` — presented in every subsequent message (cheap to verify).

## 3. Heartbeat & Timeout

- Client sends `ping` every heartbeat (1 s typical).
- Server marks idle; if no packet for `timeoutBase` (5–10 s), it drops the session (frees state) after notifying match.

```
if (now - lastRecv > IDLE)       move to DROPPING (send "timeout in 2s")
if (now - lastRecv > REAP)       CLOSED + free resources
```

## 4. Resume / Rejoin (Fast Recovery)

On reconnect of an *existing* session token (within a soft window):

1. Validate token unexpired + match still running.
2. Restore client from **last acked snapshot** (the server kept it for 1–2 s anyway).
3. Client resyncs from that tick (delta-to-full anchor if behind).

For fight/comp rules: a reconnect mid-match either (a) resumes at last ack (ranked — count result), or (b) is treated as quit + the slot opens (casual). Decide per-game; document.

## 5. Backfill / Late-Join

Different from resume: a *different* player joins a live match.
- Strategymmo (long matches): server stores a **spectator stream** (deterministic replay of ticks); late joiner watches a "how we got here" replay at high speed OR joins fresh into the current state.
- FPS/BR (short): no backfill; spectator cam until round end.

## 6. Server Lifecycle (Session Plane)

```
SessionManager:
  lobby → matchId → actorGroup (players, bots)
  match state: waiting, init, active, ended
  on end → serialize final result → archive
```

The connection layer is *deliberately separate* from the simulation: a connection can be detached from its simulation slot (spectate), moved (backfill rejection), or destroyed without touching the world (except cleanup).

## 7. Rate Limits & Security

| Threat | Control |
|--------|---------|
| Connect flood (DDoS) | handshake cap + token quota per IP |
| Spam join/leave | cooldown per playerId |
| Replay stale token | expiry + single-use nonce |
| Spoofed source | server sees only its sessions; NAT friendly |

Keep the handshake *cheap* to validate but *expensive to fake* (signature not needed per-frame, just at connect).

## 8. Save/Archive (Optional Persistent State)

For games with saves: a `SessionSaver` writes a deterministic `match state as-of tick N` compactly (see world-state-snapshot) so a match can be archived or a save restored. Only if the game has meta-progression.

## 9. Pitfalls

| Pitfall | Fix |
|---------|-----|
| Idempotent handshake not enforced | double-join |
| Timeout too short | config base + grace |
| Resume writing into a *new* match | token binds matchId |
| Connect flood = unbounded memory | caps per IP |
| No heartbeat monitoring | stale zombie sessions leak |

## 10. Checklist

- [ ] Challenge/response handshake + single-use nonce.
- [ ] Session token {matchId, playerId, expiry}.
- [ ] Heartbeats + idle timeout with grace.
- [ ] Resume to last-acked snapshot on reconnect.
- [ ] Backfill policy explicit per match type.
- [ ] Rate caps per IP/player.
- [ ] Idempotency on all state transitions.