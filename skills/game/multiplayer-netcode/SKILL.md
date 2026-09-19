---
name: multiplayer-netcode
description: Expert multiplayer netcode - transport, client prediction, server reconciliation, interpolation, lag compensation, rollback, lobbies, and replication architecture.
---

# Multiplayer Netcode — Deep Guide

Building robust multiplayer requires understanding latency, jitter, bandwidth, and how to hide them. This guide covers the full stack: transport, protocol design, client-server architecture, prediction, reconciliation, interpolation, lag compensation, rollback, and scalability.

## 1. The Problem: The Network Is the Enemy

```
Unity of correctness over the wire is bounded by RTT (round-trip time).
Local:  editorial latency
LAN:    1-10ms       -> near-identical
Wifi/regional: 20-80ms
Internet worst: 150-250ms
```

Netcode turns "what happened at t" into "what each client believes happened at t".

## 2. Transport Layer

### 2.1 UDP vs TCP

| Aspect | TCP | UDP |
|--------|-----|-----|
| Delivery | guaranteed, ordered | best-effort |
| Use | HTTP auth, file sync, chat | game state every frame |
| Problem | head-of-line blocking, retransmit stalls | reordering, loss |

**Rule**: game-critical state on UDP (custom reliable layer or RakNet-like reliable-UDP).

### 2.2 Reliable & Unreliable Channels

Split messages into channels:

- **Unreliable** (most important): position snapshots, input (recent is enough).
- **Reliable ordered**: login, join, inventory, item drop events.
- **Reliable unordered**: individual events with own ordering (per-entity).

Reliable-UDP uses ACKs + retransmit with sequence numbers; ack a byte range, not one packet.

### 2.3 Packet Layout

```
[Magic][Seq#][Ack#][AckBits][MessageCount][Message0][Message1]...
```

Header + per-message headers with bitpacking. Aim <1200B (Ethernet MTU 1500 minus IP/UDP headers); fragment bigger messages.

## 3. Architectures

### 3.1 Server-Authoritative (Mostly Standard)

```
Client ----inputs----> Server ----authoritative state----> Clients
        <----snapshots (30-60Hz)----
```

- Server owns physics/gameplay. Clients send inputs and predict locally.
- Fair, cheat-resistant. Used by FPS (Valve, Overwatch, Fortnite).

### 3.2 P2P with Host Migration

- One peer is host with authority; migrating host on disconnect.
- Simpler for small games (party-based). Risk: host advantages.

### 3.3 P2P Lockstep (RTS)

- Every peer runs the SAME deterministic sim; inputs are exchanged and executed in lockstep with a fixed delay.
- Determinism is mandatory (fixed-point float discipline). Tiny bandwidth, perfect determinism → replays trivial.
- Problem: waits for the slowest peer per tick.

### 3.4 Client/Server vs P2P decision

| Game | Type |
|------|------|
| Competitive FPS/MOBA | server-authoritative + prediction |
| Top-down RTS/co-op | lockstep deterministic |
| Small co-op party | listen server with a client |
| Battle royale (40+ players) | dedicated server clusters |

## 4. Core Algorithms

### 4.1 Client-Side Prediction (Input-Based)

Client runs a local simulation of its controlled entity:

```cpp
struct InputState { bool forward, back, left, right, fire; uint16_t seq; };

void ClientFrame() {
    InputState in = CaptureInput();
    pending.push_back({in, localTick});
    ApplyToLocalSimulation(in);            // PREDICT immediately
    SendInputToServer(in);                 // UNRELIABLE channel
}
```

### 4.2 Server Reconciliation

Authoritative snapshots from server; client compares against its own *predicted saved state at that point in time*:

```
Server sends: tick, position, velocity, HP
Client: find the local state saved under same tick (input seq)
        if position differs by > threshold -> snap BACK correction,
        then re-apply all pending inputs up to now (fast-forward)
```

```cpp
void OnSnapshot(tick, serverState) {
    Saved& saved = history[tick];
    if (distance(saved.pos, serverState.pos) > tolerance) {
        world.state = serverState;                    // correct
        for (pending input after tick) ApplyToLocalSimulation(input); // re-simulate
    }
}
```

### 4.3 Interpolation (Visual Smoothing for Remote Entities)

Render other players via **interpolation**, not prediction:

- Keep a buffer of the last ~100ms of received snapshots.
- Render at `serverTime - interpolationDelay` (e.g., 100ms = RTT) → smooth motion.
- For jitter: Jitter Buffer (smoothly delay) + lag offset.

Never mix interpolation with prediction on the same entity without buffers — jerky or doubled.

## 5. Lag Compensation (Hit Detection Fairness)

Server-hit detection at the *shooter's* perceived time:

1. Client fires; sends fire + player's view (aim) + timestamp (in server time).
2. Server **rewinds** the world state back to the client's send time (revert positions of all dynamic objects).
3. Raycast/sweep against rewound state → decide hit.
4. Allow even if the target moved already since then (client was seeing the past).

Implementation notes:
- Keep history of positions for all *dynamic* entities each server tick.
- Rewind only to the max allowed (e.g., 250ms) to prevent cheating.
- Expensive; cache/limit to the firing client at a time.

## 6. Bandwidth & Snapshot Compression

### 6.1 Delta Compression

- Each snapshot references the last ACKed snapshot per client (or common base).
- Send only **changed** fields (bitpacked).
- Absolute (full) snapshot every N ticks (key frame) for resync.

### 6.2 Optimizations

| Technique | Gain |
|-----------|------|
| Bitpack to minimum bits (position into quantized grid) | ~50% |
| Skip unchanged actors (only send those changed) | huge |
| Aggregate movement (encode relative to previous) | ~30% |
| Interleave (send each entity at 15-30Hz instead of 60) | bandwidth/priority control |
| Contact-rate based interest management | scalability |

### 6.3 Interest Management

Don't send everything to everyone. Send only what's "interesting":

- **Spatial**: send entities within a radius / viewcone.
- **Relevance**: prioritization (combat events high, ambient low).
- **Priority queues**: sort by `(relevance/changeLevel)`, flush in remaining bandwidth.

## 7. RTT / Clock Synchronization

Client needs a server-relative clock:

```
Client sends: t_client (its clock at send)
Server replies with t_server + server timestamp
RTT ≈ (t_nowClient - t_client)
Clock offset ≈ t_server - ((t_nowClient + t_client)/2)
```

Use smoothed RTT (EWMA) so snapshots' timestamps convert into client time reliably. Sync at load + periodically.

## 8. Rollback (Fighting / Racing Games)

Opposite of prediction-with-snapshots: keep a rolling buffer of the last N ticks of world state. When input arrives for a past tick:

1. Rewind world to that tick.
2. Apply the new input.
3. Re-simulate forward to the current tick.
4. Show the corrected result (gameplay rewinds visibly).

Deterministic sim highly recommended for exact rollback.

## 9. Replication & Ownership (LAZ)

- **Ownership**: the client that owns an actor sends its transforms; others interpolate.
- Server **replicates**: owns authoritative state, sends to clients with policies (reliable vs unreliable).
- **Replication manager** on server: tracks which clients have which actors ("awareness"), sends deltas.

## 10. Anti-Cheat Considerations (Practical)

- Validate all server-side: never trust client positions for combat/loot.
- Server-authoritative entity states: clients can only *request* movement, not teleport.
- Detect: speed-hacks, teleport-hacks, aim-hacks — via server-side movement validation + plausibility checks.
- Note: this guide focuses on a working architecture, not a full anti-cheat SDK.

## 11. Load & Scaling

- Dedicated server: tick 30-60Hz simulation; physics fixed-step locked with network delta.
- Interest management + snapshot priority queue keep bandwidth linear in visible actors, not in total world.
- Sharding: split into lobbies / regions; each server is a simulation cell (shared-world uses zones/streaming).

## 12. Project Plan: Steps to a Working Prototype

1. UDP transport with reliable/unreliable channels + seq/ack.
2. Server-authoritative simulation at fixed tick; client prediction for the local player.
3. Snapshot stream (unreliable, prioritized) + interpolation buffer on client.
4. Reconciliation: history buffers + correction when mismatch.
5. Lag compensation for hit detection.
6. Delta compression + interest management for scaling.
7. Lobby/matching, NAT traversal (STUN/TURN), spectator mode.

## 13. Named Damage / Quality Checklist

- Predictability: interpolation delay ≤ 100ms; no visible jitter.
- Fairness: lag-compensated shots; ping displayed.
- Robustness: server owns state; clients reconnect + resync quickly.
- Bandwidth: ≤ 100-200 kB/s per player at 30Hz typical.
- Determinism: lockstep replays reproducible.

## 14. References

- `skills/game/game-engine/multiplayer-netcode/SKILL.md` — engine-level netcode architecture
- `skills/game/game-engine/ecs-pattern/references/ecs-netcode.md` — deterministic simulation patterns
- `skills/game/game-development/physics-engine/SKILL.md` — authoritative physics step
- `skills/game/unity/SKILL.md` (§9), `skills/game/unreal/SKILL.md` (§7), `skills/game/godot/SKILL.md` (§8) — engine netcode APIs