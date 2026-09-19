---
title: Client Input Authority
description: Input command flow, server input queues, command validation, caps and the trust boundary for online games.
---

# Input Authority — Deep Reference

## 1. The Principle

Server **accepts input**, never state. Whatever the client reports about the world is only *intent* — the server computes the result.

```
client: { seq, commandTick, buttons, aimVector, cameraAxis } → UDP (reliable for crit)
server: decodes → validates → queue → applies at commandTick
```

## 2. The Input Command Format

```cpp
struct InputCommand {
    uint32 seq;         // monotonic, per-client
    uint32 commandTick; // the tick this input targets
    uint16 buttons;     // bitmask: move/attack/jump...
    int16  aimDeltaXQ;  // quantized aim
    int16  aimDeltaYQ;
    uint8  crc;         // cheap validity check
};
```

- The `commandTick` keys the server's replay (it may run it against an earlier tick in rollback).
- Buttons bitmask + quantized aim = small, loss-tolerant.

## 3. The Server Input Pipeline

```
recv → decode (per-connection) → validate (seq monotonic, rate caps)
     → enqueue to Connection.commandQueue
onSimulateTick:
  for each connection:
    take commands with commandTick == currentTick (in seq order)
    execute deterministically
```

### 3.1 Ordering

Execute by **seq within the tick** — never by arrival time (arrivals are nondeterministic under loss). This is the single biggest determinism rule in the input pipeline.

## 4. Validation & Anti-Abuse

| Check | Action |
|-------|--------|
| seq dead (older than ack window) | drop |
| commandTick > currentTick + buffer | drop false-future |
| commandTick < currentTick - rollback window | drop stale |
| > maxCmdsPerSec | ratelimit (cap, log) |
| buttons up; unexpected bits | mask allowed bits |
| aimDelta out of bound | clamp; no skew |

The "future" guard matters: a client claiming `commandTick = now+100` is either a cheat or a desync — the server must not rewind the world for it.

## 5. Client Prediction & Server Authority

The client renders its own prediction; the server only reconciles:

- Client predicts command execution (fast, its own input).
- Server runs the *authoritative* version each tick.
- Client adjusts if the actual result differs (see `rollback-and-reconciliation`).
- "Command budget" per player (e.g., 60 cmd/s) is enforced server-side; exceeding = the client is sanitized (`clamp`, not a ban).

## 6. The Trust Boundary Refined

| Client CAN do | Server ALWAYS decides |
|---------------|----------------------|
| Predict its own movement | actual position |
| Render its own VFX | collision outcome |
| Show "hit!" feedback | whether the hit counted |
| Optimize story pacing | state transitions (match start/end) |

Even "client predicts" can't produce authoritative state the server later approves of — the client's visible input *is* the prediction; the server's result is truth.

## 7. Connection-Level Batching

- Don't send one UDP per mouse move — batch: client sends at input rate (e.g., every frame for 60 Hz) into a net queue; any given packet may hold several commands (small).
- Server reads the whole batch but applies commands at their `commandTick`, not at receipt.

## 8. Failure & Degradation

- Loss: server drops commands; the FPS game "loses the tick" — client prediction continues; reconcile bounds it (no teleport).
- Lag: higher RTT → the server gives the client a larger `commandTick` window (`NOW - ping`) to hit; the aimfairness follows (lag compensation).

## 9. Pitfalls

| Pitfall | Fix |
|---------|-----|
| Apply inputs at arrival time | commandTick |
| Order by arrival | seq order |
| Trust client state | never; only intent |
| Unbounded command queue | cap + ratelimit |
| No crc/validation | cheap frame checks |
| Per-packet-per-input spam | batch |

## 10. Checklist

- [ ] Input carries seq + commandTick + quantized fields.
- [ ] Server executes at commandTick, seq-order.
- [ ] Validation caps (rate, future guard, bounds).
- [ ] Client predicts; server reconciles.
- [ ] Batching, not per-event packets.
- [ ] Window for latency + hit fairness.