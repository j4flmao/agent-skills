---
title: ECS in networking
description: Architecting deterministic multiplayer using ECS — snapshot replication, rollback, lockstep, input buffers, and sync techniques.
---

# ECS for Multiplayer Networking

## Overview

Networked games need *determinism* across machines. ECS's data-oriented nature makes it ideal:

- Component snapshots are just contiguous arrays — trivial to serialize.
- Systems are deterministic if iteration is ordered.
- Rollback/replay is state-capture from chunk arrays.

## Two Main Networking Models

### Lockstep (Deterministic Simulation)

All clients run the *same* simulation with the *same* inputs. Only inputs are transmitted.

```
Client A ---input[cmd]---> Server ---input[cmd]---> Client B
   └────────── synchronized simulation ──────────┘
```

**Requires:**
- Exact same ECS scheduler ordering on every machine.
- Fixed timestep (never variable).
- Deterministic math (fixed-point or same libm).
- Same entity spawn order.
- Identical system set & component set (version-locked).

**Advantages:** Minimal bandwidth (just inputs), cheap to host.
**Disadvantages:** One platform float difference breaks sync; playback/rollback complexity.

### Server Authoritative (Snapshot)

Server runs simulation; sends component snapshots to clients.

```
Server simulation ──► snapshot(Position, Rotation, Health) ──► Client (interpolated)
```

**Requires:**
- Snapshot encoding of component arrays (delta compression).
- Interpolation for smooth rendering (blend between last two snapshots).
- Client prediction with rollback for responsiveness.

## Snapshot Serialization of ECS

### Basic Snapshot

```cpp
struct SnapshotHeader {
    uint32_t entityCount;
    uint32_t archetypeCount;
    uint32_t frame;
};

struct ComponentSnapshot {
    ArchetypeKey key;
    uint32_t      count;
    byte*         rawComponentData;  // POD memcpy-able
    Entity*       entities;
};
```

### Delta Compression

Transmit only changed entities:

```cpp
// Change tracking via component dirty bits
bitset entityDirty;   // world-level
bitmap componentDirty[MaxComponentTypes]; // which components changed per archetype
```

Only include entities with `entityDirty[i] == true` in the snapshot.

### Photon / UNet pattern

Unity DOTS + Netcode for Entities uses a `GhostComponent` — every networked component has a `[GhostField]`:

```csharp
[GhostComponent]
public struct NetworkedPosition : IComponentData {
    [GhostField] public float3 Value;
}
```

## Interpolation (Client-side)

```csharp
// Client renders interpolated value between last 2 server snapshots
public static float3 Interpolate(float3 prev, float3 next, float t) {
    return prev + (next - prev) * t;
}

// On each rendered frame:
float interp = (localTime - prevSnapshotTime) / dt;
renderPosition = Interpolate(prevSnapshot.Pos, nextSnapshot.Pos, interp);
```

## Rollback / Time Splicing (Prediction)

When client predicts and server corrects:

```
Frame N:  client predicts Player moves to [10, 5]
Frame N+1: server authoritative [10, 4.95]  (slight mismatch)
→ Rollback simulation to frame N-2 state
→ Re-simulate frames N-1..N with corrected states
→ Resolve visual mesh to [10, 4.95]
```

### Implementation with ECS:

1. Store per-frame component snapshots in a ring buffer.
2. On correction: restore `registry` to past frame state from ring buffer.
3. Re-run a fixed number of `SimulationSystems`.
4. Continue.

```cpp
const int ROLLBACK_WINDOW = 8;  // frames
struct FrameState { std::array<ComponentSnapshot, ROLLBACK_WINDOW> states; };

void OnCorrection(Registry& reg, FrameState& ring) {
    int restoreFrame = latestConfirmedFrame;
    reg.resetFrom(ring.states[restoreFrame % ROLLBACK_WINDOW]);
    for (f = restoreFrame; f < currentFrame; ++f) {
        reg.applyCommands(ring.inputs[f]);
        runSimulationOneStep(reg);
    }
}
```

## Bandwidth Budget Guidelines

| Entities/snapshot | 60 players | Bitrate @ 60Hz |
|-------------------|-----------|----------------|
| 1,000 entities × 64 B (Position, Rot, Health) | 40 KB/frame | **~2.4 Mbps** |
| With delta compression (10% changed) | 4 KB/frame | 240 Kbps |
| With camera-cornering (cull far entities) | 2 KB/frame | 120 Kbps |

Target < 100 Kbps per client for 60 FPS on mobile.

## Networking in DOTS (Netcode for Entities)

```csharp
[GhostComponent]
public struct NetworkVelocity : IComponentData {
    [GhostField] public float3 Value;
}

// Define system to sync
public partial class GhostSendSystem : SystemBase {
    protected override void OnUpdate() {
        // All [GhostField] components automatically snapshotted
    }
}
```

## Deterministic Networking Gotchas (Notable)

- `f32` on different compilers rounds differently → use fixed-point.
- `sin/cos` implementation differences → use same libm.
- Hash-map iteration with arbitrary insertion order → sort keys.
- Parallel system execution can reorder state mutation → force deterministic scheduling via `.after()` deps.
- Job systems spawn worker threads — non-deterministic completion order → design systems independent per entity.

## References

- Unity Netcode for Entities: https://docs.unity3d.com/Packages/com.unity.netcode@1.0/
- Mirror (for Unity): https://github.com/MirrorNetworking/Mirror
- Bevy replication crate: `bevy_replicon`