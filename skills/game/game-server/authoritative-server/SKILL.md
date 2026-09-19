---
name: authoritative-server
description: Expert authoritative game server architecture — tick loop, world state, client input authority, rollback, lag compensation and connection handling for online games.
---

# Authoritative Server — Deep Engineering Guide

The server is the single source of truth. Clients only *intend*; the server *decides*. This skill covers the server tick loop, world-state serialization, input authority, reconciliation/rollback, lag compensation and session/connection management that make online games correct, cheat-resistant and smooth under real network loss.

## 1. Why Authoritative

- Clients are untrusted: a modified client shouldn't teleport, duplicate items, or confirm kills it didn't earn.
- Server-authority = the only place where state can be validated + validated state is shared.

```
client sends INPUT (intent)        → net
server runs sim (authoritative)    → sim decides
server sends SNAPSHOT (state)      → net
client renders (interpolated)      → visual
```

### 1.1 The Trust Boundary

| Decided by | Where |
|------------|-------|
| Compile-time rules, rules engine (damage, physics) | server |
| Cosmetic-only (VFX transform, emote) | client |
| **Compromise (authoritative with client prediction)** | server + prediction |

Pick: **full authoritative** (server runs everything; client is dumb viewer) vs **client-predicted** (client predicts its own move; server reconciles) vs **client-side prediction + server rollback** (fast action games). All start from "server is truth".

## 2. Server-Side Simulation Can't Afford a Game-Loop Problem

### 2.1 Fixed Timestep

- **Server tick**: fixed 30–64 Hz (30 for strategy, 60 for aimful shooters; 128 for esports aimers).
- Do NOT `sleep(frame)`: use `deltaTime` accumulation (see `game-loop-and-timestep`). Server ticks at exact fixed dt regardless of wall clock.

```cpp
// server main loop:
tick = 0;
while (running) {
    dtFromWallClock = now - last;
    accumulator += dtFromWallClock;
    while (accumulator >= TICK_MS) {
        SimulateTick(tick);         // deterministic, fixed dt
        accumulator -= TICK_MS;
        tick++;
    }
    netOutputs[ticksToSend].Flush();
}
```

### 2.2 Deterministic Sim

The server sim must be **deterministic given a seed**: lockstep (see `game-engine/multiplayer-netcode` determinism refs) so replay, spec or tests reproduce identically. No `fast-math`, no wall-clock, no `rand()` global.

- RNG: per-entity/instance seeded, tick-advanced — reproducible.
- Physics stepping: fixed dt = stable.

## 3. Input Authority & The Input Pipeline

```
client: sample input → serialized command {tick, seq, buttons, aim} → UDP
server: collect per-tick input, run queued commands, apply at tick boundary, optionally re-sim (rollback)
```

Key properties:
- **Attack later**: authoritative server processes input *at the tick it was generated* (with a `commandTick`), not when it arrives.
- **Input history buffer** on server: replay recent inputs if a rolled-back tick needs them.
- **Client command throttling**: cap commands/second; server drops excess (anti-abuse).

### 3.1 Client Prediction ↔ Server Reconciliation

- Client predicts its own motion (renders its projection).
- Server reconciles the actual authoritative value each tick; client "rubber-bands" only if mismatch > tolerance (e.g., > 100 ms of error).
- Tolerance + extrapolation clipping prevent wild rubber-banding (see `rollback-and-reconciliation.md`).

## 4. World-State Snapshot Serialization

Server serializes **deltas**, not full state:

| Approach | Cost | Use |
|----------|------|-----|
| Full state | bloom | lobbies/tiny |
| Delta (since last ack) | efficient | standard |
| Interest-gated masks | minimal | open world (see interest-management skill) |

Snapshot minimal components:
- `matchId`, `tick`, `seq`, per-entity: `{entityId, flags, bits...}`.
- Compressed position: quantized int16 (glm-style fixed Q for flakeless determinism), deltas rather than absolute.
- Entities unchanged since last snapshot: omitted (per-entity dirty flags).

Standard formats: UE replicas, OSSNet Snapshot = "columns of bytes" per entity with `networked` mask; netcode in game-engine/multiplayer skill.

## 5. Reconciliation, Rollback & Lag Compensation

### 5.1 Rollback (Fighters, Fast Games)

Client predicts; server re-sims when input ran in the wrong order (delayed arrival). Server stores the last N-tick state frames; on late arrival re-runs tick with the corrected input:

```
server keeps history[40 ticks]
incoming input says "my tick 1000 shot"
if history[1000] exists → re-run 1000..now with that input
→ send diff to client (rollback) ≤ threshold
```

### 5.2 Lag Compensation (Hit Scan)

Server can't "aim at where client renders" — it rewinds to the client's requested timestamp to check the shot hit:

- Store per-tick entity transforms for the last ~100 ms.
- On shot incoming, `rewind to (arrivalTime - ping/2)`, run raycast vs stored poses.
- Crosshair hits what the shooter saw = fair for the shooter, deterministic to server.

### 5.3 The "Client is Right?" Test

The criterion: a valid shot = the server re-sim with client's inputs *would* have produced a hit. This is authoritative but *player-fair*. Cheat-resistant because "position" is server-side truth, not client-reported.

## 6. Connection & Session Handling

### 6.1 The Connection State Machine

```
UNRESPONSIVE → HANDSHAKE (challenge/response) → ESTABLISHED
   → RESYNC (after rejoin) → (periodic heartbeat) → TIMEDOUT (kicked)
```

- Handshake: server->client challenge (`nonce`) — client signs → avoids spoofed connects.
- Heartbeats: client `ping` every ~1 s; server drops idle > 5–10 s (configurable).
- Backfill: server assigns `sessionToken`; a client reconnecting with an old token resumes state (or is denied on match close).

### 6.2 The "Replay Value" Problem

If a client drops in a rank/match, on return server either:
1. **Fast-recovery**: restore to last ack'd snapshot + client resyncs from ticklet (simple, standard).
2. **Late-join backfill**: watch a spectator cam until slot opens (complex; for dedicated shows).

Pick 1 for most titles; 2 only for spectator/require.

## 7. Exploit & Cheat Resistance (Server Facts)

| Attack | Server counter |
|--------|----------------|
| Modded client teleport | server sim ignores client positions |
| Speed hack ("0 ping looks") | speed-check: max Δpos / tick |
| Input flood | cap commands/s + rate limit |
| Item duplication | every item change server-confirmed |
| Hit-scan "aim assist" | server ran the shot against stored poses |

Combined with validation hooks in `anti-cheat-server`.

## 8. Scalability & Cost (Server-Side Budgets)

| Per-player server budget | Target |
|--------------------------|--------|
| CPU / tick | < 0.1 ms |
| Bandwidth out | ≤ ~60 kB/s (deltas) |
| Memory | ≤ 2 MB (state) |
| Tick compute | ~50–200 us/player typical |

Under load: more than 60 players/tick ● split world (zones/chunks) or shard (interest-management). If a tick > budget, drop non-crucial systems (network simulation throttle — not gameplay).

## 9. Testing the Server

- **Determinism replay**: run a match twice with the same input stream → byte-identical state hash.
- **Network fault injection**: drop%, reorder, duplicate, delay 50–500 ms → assert no desync, no crash, bounded resync.
- **Load test**: N bots with synthetic input; assert tick under budget + no queue backlog.
- **Chaos**: kill a tick mid-sim, restart, restore last ack.

## 10. References

- `references/tick-loop.md` — fixed timestep, accumulator, tick queue, determinism under load
- `references/world-state-snapshot.md` — entity serialization, deltas, dirty flags, quantization, ack/gap detection
- `references/input-authority.md` — input command flow, server queues, anti-abuse caps
- `references/rollback-and-reconciliation.md` — client prediction, server reconcile, rubber-banding, rollback replay
- `references/lag-compensation.md` — hit-scan rewinding, stored poses, fair-shot verification
- `references/connection-and-session.md` — handshake, heartbeat, timeouts, resume, backfill