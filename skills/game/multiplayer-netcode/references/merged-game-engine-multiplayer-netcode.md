# Engine-Level Multiplayer Netcode — Supplementary Notes

Folded in from the former `game/game-engine/multiplayer-netcode` skill. Prediction, reconciliation, interpolation, lag compensation, rollback, delta compression and interest management are covered in `../SKILL.md`; this file keeps the engine-integration material that is not repeated there.

## 1. Pipeline at a Glance

```
Client                                Server
  Input sampler (fixed rate)      ->  Input validator
      |  (unreliable channel)         Simulation (authoritative, fixed tick)
  Local prediction (client sim)       Snapshot builder (delta vs ack)
  Interpolation buffer                Priority queue (interest management)
  Reconciliation (rebase on snap) <-  Unreliable snapshots (20-60 Hz)
```

Rule of three: the server owns truth (movement, damage, loot, spawns); the client predicts only its own entity; clients interpolate every remote entity.

## 2. Transport Choices Including the Web

| Protocol | Native use | Web use |
|----------|-----------|---------|
| UDP | Game state | Not available in browsers |
| TCP | Reliable control, telemetry | -- |
| WebSocket | Rarely | Reliable and ordered only; head-of-line blocking under loss |
| WebRTC data channel | -- | Can be configured unordered with no retransmits (`ordered: false, maxRetransmits: 0`) |
| WebTransport (HTTP/3) | -- | Unreliable datagrams plus reliable streams in supporting browsers; check current browser support |

Native: multiplex reliable and unreliable channels over UDP (custom layer or a library such as ENet, GameNetworkingSockets, Yojimbo).

## 3. Server Input Validation
- Process each client's inputs per tick in sequence order; drop inputs older than the last processed sequence.
- Clamp the number of inputs accepted per tick (prevents speed-up by input flooding).
- Require client tick numbers to be monotonic and inside an allowed window.
- Check plausibility (max speed, teleport distance over time) before applying.

## 4. Reconciliation Detail: Dropping Acknowledged Inputs

```cpp
void Client::OnSnapshot(const Snapshot& s) {
    pending_.dropUpTo(s.lastProcessedInputSeq);    // server has applied these
    const State& predicted = history_.at(s.tick);
    if (dist(predicted.pos, s.state.pos) > kTolerance) {
        state_ = s.state;                          // rebase on authority
        for (const auto& p : pending_)             // replay unacknowledged inputs
            state_ = Simulate(state_, p.input);
    }
}
```

The snapshot must carry the last input sequence the server processed for that client; without it the client cannot tell which pending inputs to replay. Smooth small corrections visually over a few frames instead of snapping the rendered position.

## 5. Snapshot Size Rules of Thumb
- A position is three 32-bit floats (12 bytes). Quantizing each axis to 16 bits within the map bounds gives 6 bytes; fewer bits work for small maps or values relative to a known origin.
- Rotations: smallest-three quaternion encoding (drop the largest component, send its index plus three quantized components).
- Set a byte budget per client per send tick and let a priority accumulator choose which entities fit; starved entities gain priority each tick so nothing is skipped forever.

## 6. Replication Conditions
- World objects are server-owned and replicated with conditions such as owner-only or initial-only.
- Player transforms go through unreliable snapshots; one-off gameplay events (spawn, death, item pickup) go through reliable messages.
- Replicated properties (`UPROPERTY(Replicated)`, `NetworkVariable`, `MultiplayerSynchronizer`) update only on change and can be throttled by frequency.

## 7. Mapping to Engines

| Feature | Unity (Netcode for GameObjects) | Unreal | Godot 4 (high-level multiplayer) |
|---------|-------------|--------|----------------|
| Network tick | `NetworkManager` tick rate | `UNetDriver` tick / `NetUpdateFrequency` per actor | `SceneMultiplayer` polling |
| RPC | `[Rpc(SendTo.Server)]` (older: `[ServerRpc]`) | `UFUNCTION(Server, Reliable)` | `@rpc` + `method.rpc()` |
| Sync | `NetworkVariable` | Replicated properties + conditions | `MultiplayerSynchronizer` |
| Prediction | Custom (no built-in for GameObjects) | Built-in for `CharacterMovementComponent` | Manual |
| Interpolation | `NetworkTransform` interpolation option | Built-in smoothing for characters | Manual or add-ons |
| Rollback | Netcode for Entities predicts and rolls back ghosts | No general rollback; the Mover and Network Prediction plugins are experimental | Custom or add-ons (e.g. netfox) |

Unity: MLAPI became Netcode for GameObjects; Netcode for Entities adds built-in prediction and lag compensation for DOTS projects.

## 8. Connection Lifecycle
- Connect → handshake (protocol version, content checksum) → spawn into match → full snapshot baseline → deltas.
- On disconnect keep the session slot for a grace period; on rejoin send a fresh full snapshot.

## 9. Quality Gates Before Shipping
- Playable at 0 ms and at 150 ms simulated RTT.
- 2% random packet loss produces no visible jitter on remote actors.
- Bandwidth inside the per-client budget you set (measure up and down separately).
- Deterministic replay: same inputs give the same result (rollback and lockstep games).
- Reconnect after a transient drop completes within a few seconds.

Test with a network conditioner (clumsy on Windows, `tc netem` on Linux, Network Link Conditioner on macOS) rather than only on LAN.
