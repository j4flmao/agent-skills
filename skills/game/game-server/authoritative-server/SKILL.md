---
name: authoritative-server
description: >
  Use this skill when the user says 'authoritative server', 'server tick loop', 'server reconciliation', 'lag compensation', 'dedicated server', 'input authority'. Designs authoritative game servers: tick loop, world state and snapshots, input authority, reconciliation/rollback, lag compensation and session handling. Do NOT use for: client-side prediction details (use multiplayer-netcode), fleet scaling (use scaling-architecture).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [game, server, authoritative, netcode]
---

# Authoritative Server — Deep Engineering Guide

## Purpose
The server is the single source of truth. Clients only *intend*; the server *decides*. This skill covers the server tick loop, world-state serialization, input authority, reconciliation/rollback, lag compensation and session/connection management that make online games correct, cheat-resistant and smooth under real network loss.

## Agent Protocol

### Trigger
"authoritative server", "server tick loop", "server reconciliation", "lag compensation", "dedicated server", "input authority".

### Input Context
- Genre, player count, tick rate target
- Engine/language of server
- Hosting model

### Output Artifact
Server loop design and code. No file unless requested.

### Response Format
```
Tick: {Hz}
Loop: {receive -> simulate -> snapshot -> send}
Authority: {what server validates}
Code: {snippet}
```

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
- Derive the tick count from an accumulator over a monotonic clock (see `game-loop-and-timestep`), then sleep until the next tick deadline instead of spinning; never scale gameplay by the measured frame time.

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
- **Tick-stamped commands**: each command carries the client tick it was generated for; the server buffers a small amount (a jitter buffer of 1-3 ticks) and applies it at that tick, dropping commands that arrive too late.
- **Input history buffer** on server: replay recent inputs if a rolled-back tick needs them.
- **Client command throttling**: cap commands/second; server drops excess (anti-abuse).

### 3.1 Client Prediction ↔ Server Reconciliation

- Client predicts its own motion (renders its projection).
- Server reconciles the actual authoritative value each tick; client corrects only if the mismatch exceeds a tolerance (e.g. a few cm of position error), and smooths small corrections over several frames.
- Tolerance + extrapolation clipping prevent wild rubber-banding (see `rollback-and-reconciliation.md`).

## 4. World-State Snapshot Serialization

Server serializes **deltas**, not full state:

| Approach | Cost | Use |
|----------|------|-----|
| Full state | large | lobbies, tiny games, keyframes |
| Delta (since last ack) | efficient | standard |
| Interest-gated masks | minimal | open world (see interest-management skill) |

Snapshot minimal components:
- `matchId`, `tick`, `seq`, per-entity: `{entityId, flags, bits...}`.
- Compressed position: quantized to a fixed grid (e.g. int16/int32 at 1 cm), sent as deltas against the acked baseline.
- Entities unchanged since last snapshot: omitted (per-entity dirty flags).

See `game-engine-multiplayer-netcode` for engine-level replication formats.

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

- Store per-tick hitbox poses for the maximum rewind window (commonly 200-300 ms, capped and configurable).
- The shot command names the tick (plus interpolation fraction) the shooter was rendering; the server rewinds other players to that time — clamped to the window — and raycasts against the stored poses.
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
1. **Fast-recovery**: client reconnects with its session token and receives a full keyframe snapshot, then deltas (simple, standard).
2. **Late-join backfill**: watch a spectator cam until slot opens (complex; for dedicated shows).

Pick 1 for most titles; 2 only when the design requires drop-in spectators.

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
| Bandwidth out | ≤ ~60 kB/s (deltas) |
| Memory | ≤ 2 MB (state) |
| Tick compute | ~50–200 us/player typical |

When a single process cannot hold the tick budget, split the world (zones) or reduce per-player cost (interest management) — never split one match's simulation across processes. If a tick > budget, drop non-crucial systems (network simulation throttle — not gameplay).

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