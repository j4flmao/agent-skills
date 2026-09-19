---
name: multiplayer-netcode
description: Engine-level multiplayer netcode engineering - transport protocols, replication, latency hiding (prediction/interpolation), lag compensation, rollback, and scalability for game engines.
---

# Engine-Level Multiplayer Netcode

Building netcode that is fast, fair, and stable requires decisions at the transport, protocol, simulation, and presentation layers. This skill gives the full architecture used by modern FPS/MOBA engines, independent of any specific engine — then shows how each engine (Unity/Unreal/Godot) maps onto it.

## 1. Core Architecture

```
Client                                Server
  Input sampler (fixed rate)      ->  Input validator
      |  (unreliable channel)         Simulation (authoritative, fixed tick)
  Local Prediction (client sim)       Snapshot builder (delta vs ack)
  Interpolation buffer               Priority queue (interest management)
  Reconciliation (rebase on snap) <-  Unreliable snapshots (30-60Hz)
```

### The Rule of Three

1. **Server owns truth** (movement, damage, loot, spawns).
2. **Client predicts** its own entity to hide latency.
3. **Clients interpolate** remote entities to hide jitter.

## 2. Transport Choices

### 2.1 UDP vs TCP vs WebSocket

| Protocol | Native use | Web use |
|----------|-----------|---------|
| UDP | game state (fast) | not in browsers (use WebRTC) |
| TCP | reliable control, telemetry | -- |
| WebSocket | web game both | byte framing, reliable only |
| WebRTC | -- | unreliable + datachannel for web |

Rule: use an unreliable+reliable multiplexed channel on UDP (RakNet/uNet-like, custom). Web fallback: WebRTC datachannel or WebSocket with its own reliable/unreliable split.

### 2.2 Reliable-UDP Basics

- Sequence numbers per message.
- ACK every N ms or per packet; retransmit only lost ranges.
- Keep a send/receive window; message priorities.
- Fragmentation for >MTU messages.

## 3. Client Frame (Prediction)

```cpp
struct ClientInput { uint32_t seq; float forward, right; bool jump, fire; };

Client::Frame() {
    auto in = Input::sample();                 // fixed rate (e.g., 60Hz)
    pending_.push({ in, localTick_, state_ }); // store for reconciliation
    Simulate(in);                              // LOCAL prediction
    transport_.send(unreliable, in);           // to server
}
```

## 4. Server Loop

```cpp
Server::Tick(tick) {
    processInputs();       // apply each client's input in arrival order
    simulate();            // physics, AI, combat (fixed step)
    buildSnapshot();       // delta against client acks
}
```

- Deterministic timestepping: align server to 30-60Hz fixed; physics substeps fixed.
- Client auth validation: reject out-of-order old inputs, clamp count, verify plausibility.

## 5. Reconciliation & Correction

- Client keeps history `tick -> state`.
- A server snapshot carries `tick`, positions, velocities, HP.
- On mismatch beyond tolerance: correct from server state, then **replay pending inputs** (fast forward).

```cpp
void Client::OnSnapshot(const Snapshot& s) {
    auto& predicted = history_[s.tick];
    if (dist(predicted.pos, s.pos) > kTolerance) {
        state_ = s.state;                      // rebase
        for (auto& p : pendingAfter(tick))     // replay
             Simulate(p.input);
    }
}
```

## 6. Interpolation for Remote Entities

- Buffer 100-150ms of snapshots per remote actor.
- Render at `serverTime - interpDelay` -> smooth between two snapshots.
- For fast, small, time-critical entities (projectiles) combine with extrapolation if necessary.
- Jitter smoothing: average buffered RTT/delay; adjust.

## 7. Lag Compensation (FPS Hit Detection)

1. Fire event: client sends `t_client` + hit params.
2. Server rewinds dynamic actor positions to `t_client` (using 100-250ms history).
3. Test hit against rewound world; apply damage.
4. Limit rewind window; validate.

## 8. Rollback (Fighters / RTS)

- Keep a history window of last N ticks of full world state; on late input: rewind, apply, resimulate, render.
- Requires deterministic simulation and fixed ticks.
- Null-space for exact replay of "same inputs -> same state".

## 9. Bandwidth & Interest Management

- Delta-compress snapshots vs the last ACK (reference frame).
- Per-entity priority: `f(relevance)` — high for your combat, low for ambient.
- Interest: only send what's in the player's area/interest (spatial relevance).
- Interleave: send far/ambient entities at 5-15Hz; nearby at 30-60Hz.

### Snapshot size rules of thumb

- Position: 3×12 bytes → quantize to 3×12 bits (or 8-10 bits/axis) → ~4 bytes.
- Include only deltas.
- Entities per player budget: ~32 per second target, total ~200B-1KB per frame.

## 10. Replication & Object Authority

- World objects owned by server; replicated with conditions (owner-only, initial-only).
- Player transforms replicated via unreliable snapshots.
- Latency-sensitive (bullets) started with reliable order-enforced message.
- State via `RepProps`/`SyncVar` patterns; update only when changed, throttle by frequency.

## 11. Mapping to Engines

| Feature | Unity (NGO) | Unreal | Godot (HLLAPI) |
|---------|-------------|--------|----------------|
| Main loop | `NetworkManager` tick | `NetTick` | `SceneMultiplayer` |
| RPC | `[ServerRpc]/[ClientRpc]` | `UFUNCTION(Server)` | `rpc()` |
| Sync | NetworkVariables | ReplicatedProps+conditions | MultiplayerSynchronizer |
| Prediction | custom (no built-in) | built-in move | manual |
| Interpolation | NetworkTransform (lerp) | built-in | MultiplayerSynchronizer |
| Rollback | custom | built-in (fighter support) | custom |

Old Unity `MLAPI` migrated to Netcode for GameObjects (2023.1+). Unreal has the strongest built-in for prediction. Godot's is minimal — you implement buffers yourself.

## 12. Connection Lifecycle

- Connect → handshake (version/checksum) → spawn match + entities → snapshot baseline → deltas.
- Disconnect: last-ack persisted; rejoin with authoritative baseline.
- Reconnect/resync: fast snapshot with key frame.

## 13. Anti-Cheat Practical Checks (server-side)

- Velocity plausibility: clamp max speed, direction constraints.
- Teleport detection: distance vs time.
- Command flooding: rate-limit inputs/sec.
- Verified input: `client tick` monotonic and within window.

## 14. Scaling

- Shard per region/lobby; matchmaking external.
- Interest management reduces broadcast to O(visible).
- Dedicated servers: heavy simulation per world cell; stream content per region.
- For 100+ players: reduce snapshot rate for distant entities drastically.

## 15. Quality Gates (before shipping netcode)

- RTT test: 0ms and 150ms both playable.
- Loss test: 2% random loss no jitter for remote actors.
- Bandwidth: < 1 Mbit/s down, < 200 Kbit/s up typical FPS.
- Determinism replay: same inputs → same result (rollback/RTS).
- Reconnection within 2s after transient drop.

## 16. References

- CPU-side full skill: `skills/game/multiplayer-netcode/SKILL.md`
- Deterministic sim: `skills/game/game-engine/ecs-pattern/references/ecs-netcode.md`
- Engine mapping: `skills/game/unity/SKILL.md` (§9), `skills/game/unreal/SKILL.md` (§7), `skills/game/godot/SKILL.md` (§8)
- Physics step: `skills/game/game-development/physics-engine/SKILL.md`