---
title: Rollback and Reconciliation
description: Client prediction, server reconcile, rollback replay of late inputs, rubber-banding and resync rules for fast games.
---

# Rollback & Reconciliation — Deep Reference

## 1. The Dance

- Client **predicts** its own movement: on input, it runs its local sim immediately, renders instantly.
- Server is **authoritative**: it re-runs its sim each tick and sends authoritative snapshots.
- Client **reconciles**: it compares its prediction to server state; if off, it corrects (cheaply).

## 2. Client Prediction Details

- Client keeps its own `CommandHistory[40 ticks]` + a local predicted body.
- It *always* renders prediction (never freezes on server lag).
- It must stay *within tolerance* of server state or it rubber-bands — the whole game = keep that tolerance small.

## 3. Reconciliation on the Client

```cpp
// each server tick snapshot arrives:
expected = local simulation of (serverTickHistory[tick]);
actual   = snapshot state;
deltaE = distance(actual, expected);
if (deltaE > tolerance) {
    // jump toward actual (lerp/smooth), clamp magnitude to avoid visual teleport
    body.position += (actual - expected) * saturate(smoothing);
}
```
Rubber-band prevention: smooth the correction over a few frames (`lerp(t, 0.3)`), and cap the *magnitude* (`<= 2 units/frame`) so a big desync resolves as a quick glide, not a snap.

## 4. Rollback (Server Side) for Fast Input

When a command's `commandTick` arrives *after* the server already ticked past it, the server has two choices:

**A. Process "as late as possible"** (no rollback; gameplay uses latest) — simpler; false results when the early input was order-critical.

**B. Rollback + replay:**

```cpp
void Server::ReceiveLateInput(Conn c, InputCommand cmd) {
    if (cmd.commandTick < currentTick - rollbackWindow) return; // too old, drop
    if (cmd.commandTick < currentTick && history.has(cmd.commandTick)) {
        // rewind world to history[cmd.commandTick]
        RewindTo(cmd.commandTick);
        ApplyCommand(c, cmd);
        ReplayForward(history[tick .. currentTick-1], currentTick);   // re-sim
    }
}
```

The server keeps `history[kTick]` = saved world state per tick (only the *rolling window + a bit*). Replay cost: window ticks × world size — bounded, cheap for 32 players.

Rules:
- Rollback window: `rollbackWindow = maxLatency + maxPacketJitter` (e.g., 100 ms → 6 ticks @60).
- Replay must be **deterministic** (seeded, fixed order) — else re-sim diverges.
- A late command *kills* its later-replayed siblings if they conflict (they re-sim consistently).

## 5. Rubber-Banding Causes & Fixes

| Cause | Fix |
|-------|-----|
| Tolerance too tight | widen to engine movement speed (per tick distance) |
| Reconcile snaps full | smooth over frames + clamp |
| Big desync (respawn) | teleport (no smoothing) to snapshot + clear prediction |
| Late rollback feedback loop | bounded window; don't re-sim beyond it |
| Extrapolation overshoot | clamp extrapolation to a few ticks |

## 6. The Client "Replay" (Optional, for High-Fidelity)

For very fast action (fighting games), the *client* also rollbacks: it buffers the last inputs, and when a corrected command arrives (server says the sim differed), it re-simulates quickly from the rewind point. This keeps animation/vfx true.

## 7. Determinism Requirements (Tighten Again)

Replay/sim must produce *identical* results for the same input stream — else:
- Server re-sim diverges → churn.
- Client caches its math *against* server (rubber-band).

Reinforce every determinism rule from `numerical-stability`: fixed-point positions, seeded RNG, no fast-math, eval ordering stable.

## 8. Testing Reconciliation

- Fault inject: reorder/drop/delay the input stream by up to 100 ms; assert:
  - no state divergence > tolerance
  - no message resent > `resyncThreshold`.
- Deterministic: replay the same input file twice → identical final hashes.
- Visual: a debug "prediction error" overlay; should hover near zero in normal play.

## 9. Pitfalls

| Pitfall | Fix |
|---------|-----|
| Reconcile by full snap every time | delta only; smooth |
| Rollback window too small | covers max RTT + jitter |
| Rollback world bigger than memory | rolling window storage |
| Client confidence = server trust | prediction ≠ authority |
| Teleport on any error | clamp + smooth |

## 10. Checklist

- [ ] Client predicts & renders instantly.
- [ ] Reconciliation with smoothing + magnitude clamp.
- [ ] Server rollback window sized to RTT+jitter.
- [ ] Deterministic re-sim everywhere.
- [ ] Large desync → teleport to snapshot only.
- [ ] Fault-inject tests green.