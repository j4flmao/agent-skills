---
title: Animation Blending and State Machines
description: Blend spaces, masks, state machine transitions, continuous blends and transition evaluation.
---

# Animation Blending & State Machines — Deep Reference

## 1. The Units

- **Clip**: a single named motion (walk_f, attack_1).
- **Pose**: an instantaneous per-bone local pose (the actual blend result).
- **State**: a node in the ASM — maps a *pose source* + parameters.

Blends are between *poses*, exactly like quat/vector lerp (see `math-foundation` curves/interp).

## 2. Pose Interpolation

```cpp
// pose = Σ_i w_i * clipPose_i  (per bone)
// translations: lerp
// rotations: nlerp (cheap) or slerp (exact, sign-correct!) — see quaternion.md
// scale: lerp (rare; keep uniform by convention)
```
The sign-correct slerp/nlerp rule applies per-bone: dot<0 → flip, else the rotation takes the long way.

## 3. The Blend Space (Parameter-Driven)

A 2D blend space: inputs `(moveSpeed, direction)`, samples 4–8 clips at the corners, weights by bilinear distance → one pose.

```
speed: Idle(0) — Walk(1.4) — Jog(3.2) — Run(5.5)
direction: 4 directional clips per speed tier
blend weight = gaussian/bilinear of the sample in the 2D space
```
Use for movement/locomotion mainly — the standard "walk ↔ run" feel.

## 4. State Machine (The ASM)

```cpp
struct Transition { State from,to; Trigger t; float blendTime; Condition cond; };
struct AnimStateMachine {
    const State* current;
    float curTime;            // deterministic, advanced by sim/fixed dt
    params;                   // {moveSpeed, aimPitch, ...}
};
```
Per tick:
1. evaluate triggers → pick transition (highest priority enabled condition).
2. if transitioning: `w = ramp(curTimeSinceTrans / blendTime)`.
3. pose = lerp(fromPose, toPose, w); alpha = blend mask.

## 5. Transition Discipline

| Rule | Reason |
|------|--------|
| symmetric transitions (A→B, B→A both defined) | no falling gum |
| `blendTime` in ms, not frames | FPS-independent |
| priority: Attack > Land > Walk (exclusive) | stab shouldn't cancel into a run mid-anim |
| Start the clip at its entry pose | no pop at start |
| Override duration for critical (dodge) | snappy gameplay > average feel |

## 6. Layer & Mask Mixing

```
base:     whole-body locomotion                       (mask = all-1)
upper:    aim, weapon draw, minor buffs               (mask = torso/arms ~1, legs ~0.2)
final = base.pose ⊕ maskedBlend(upper, mask)
```
- Per-bone mask weights are authoring-time (a "mask curve" per state).
- Compose weighted: `final[i] = nlerp(base[i], upper[i], mask[i]*wUpper)`.
- IK applies after layers (so it sees the final).

## 7. Continuous Parameter Blends (Anti-Pop)

A jump in a parameter (speed 0→5) shouldn't snap the pose: blend over `paramSmoothSec`. Same trick as the transition ramp — this is *the* tool for "walk/run crosswind", aim-pitch, etc.

## 8. Determinism (The Rule That Just Costs Nothing)

- `curTime` advanced by **fixed/sim dt**, never wall-clock.
- weights are pure functions of (state, time, params) — replay reconstruction is identical.
- Serialize `{stateId, curTime, params}` for netcode/replay; never the pose.

## 9. Pitfalls

| Pitfall | Fix |
|---------|-----|
| Clip blend instead of pose blend | blend after state composition |
| Unsigned slerp (spin) | sign-correct flip |
| Wall-clock time | fixed/sim dt |
| 1 frame pop on transition | ramp over blendTime |
| Full-body mask always 1 | layer by mask |
| Param jumps snapping | smooth param ramp |

## 10. Checklist

- [ ] Blends are pose-level (nlerp/slerp, sign-correct).
- [ ] ASM with symmetric transitions + priorities.
- [ ] Frames → duration (blendTime ms).
- [ ] Layer masks for upper-body.
- [ ] Param smoothing for continuous inputs.
- [ ] State-serialization (deterministic replay).