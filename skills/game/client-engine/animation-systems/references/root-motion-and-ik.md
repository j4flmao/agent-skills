---
title: Root Motion and Inverse Kinematics
description: Root displacement extraction, foot IK, 2-bone and CCD solving, IK budgets and interaction.
---

# Root Motion & IK — Deep Reference

## 1. Root Motion Basics

- The **root bone** is the actor's root placement (`Anchor`). Root motion = displacement/rotation authored *into* the clip on that bone.
- Extract vs ignore:
  - **Extract** (for tight platforming / combat): the root delta drives the character controller (matching animations).
  - **Ignore** (for locomotion with a controller): velocity comes from input; cat the root bake.
- Deterministic: the root delta = `pose[root].pos - prevRoot` (fixed dt).

## 2. Extracting the Root Delta

```cpp
// within an eval frame (dt fixed):
Vec3 rootDelta = poseEval(root).pos - prevPose[bone].pos;
Rota rootRot   = quatDelta(prevPose[root].rot, poseEval(root).rot);
// apply to the actor (or blend with controller velocity for hybrids)
```

- Blend weight must be the *same* weight that blended the clip (else sliding).
- Store root channels separately (often `root` bone has its own clip track).

## 3. Foot IK (Grounded Contact)

Goal: plantar ankle on the ground + plausible knee.

```
1. sample ground height under ankle + ground normal
2. rotate the hip→knee→ankle chain (2-bone analytic) to plant the foot
3. weight 0 (air) → 1 (planted) by contact state (ankle velocity ≈ 0 at contact)
```

### 3.1 2-Bone Analytic Solver

```cpp
void Solve2Bone(Vec3 hip, Vec3 ankle, Vec3 target, float lenUp, float lenLow) {
    Vec3 h2t = target - hip;
    float len = lenUp + lenLow;
    if (lenH2T >= len) { /* stretch — plant fully */ }
    float cosA = (lenUp*lenUp + lenH2T*lenH2T - lenLow*lenLow) / (2*lenUp*lenH2T);
    // knee bend = rotate hip→upper so that lower lands on target (choose bend dir from slope)
    // ankle rotation from knee→ankle to knee→target
}
```
Cheap, branch-light, stable; used for foot + hand reach.

## 4. General IK (CCD / FABRIK)

For spine/neck/arms when target not trivially 2-bone:
- **FABRIK** — iterative forward/backward reaching; stable, easy heuristic (5–10 iterations).
- **CCD** — rotate each bone toward target by absorbed angle; simpler, can favor proximal wobble.

Budgets: run only on *interacting* characters (grabbing a bar, door, world furniture), not every puppet. 8–16 iterations × a handful of bones is nothing *per interacting char*.

## 5. IK vs Animation Layer Order

```
ASM pose → (blend/layer) → IK (feet/head/hand) → skin
```
IK runs *after* blending (it sees the final), and must be *quantitatively weak* at runtime (weights cached per bone) — full-body IK every frame is the wrong default.

## 6. Interaction (Hand/Heads Up)

- Hand-hold: target = grabbed object's anchor; solve arm; blend 0-100 depending on grip.
- Look-at (head/eyes): solve neck chain toward a target with a max look angle (limb happy droop).
- Keep the solver output *stable*: smooth step the weight, never telegraph snapping.

## 7. Pitfalls

| Pitfall | Fix |
|---------|-----|
| Root bake while controller runs | extract or ignore (pick per game) |
| Foot IK weight jumps | contact-smoothed |
| 2-bone stretch at flat ground | stretch allowed only within budget |
| Full-body CCD on crowds | interaction-only |
| IK before blend | after |
| Non-deterministic solve on neural net | analytic/iterative only |

## 8. Checklist

- [ ] Root extracted with same blend weight (or explicitly ignored).
- [ ] Foot IK with contact-smoothed weights + ground sampling.
- [ ] 2-bone analytic for contact; CCD/FABRIK for full-body only.
- [ ] IK after blend; interaction-only by default.
- [ ] Deterministic solvers (analytic/iterative).