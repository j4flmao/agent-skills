---
title: Animation Retargeting
description: Bone maps, pose-local rules, scale handling and cross-rig animation reuse.
---

# Retargeting — Deep Reference

## 1. The Problem

Clips are authored on a **reference skeleton** (e.g., "humanoid_fbx"). Characters differ (arms longer/shorter, bone names differ, no fingers). Retargeting makes one clip library drive every rig.

## 2. The Bone Map

```cpp
struct RetargetMap {
    hash_map<ReferenceBoneId, ActorBoneId> chain;      // semantic→actor
    vector<pair<RefBone, ActorBone>> paired;           // stable direct mapping
    float scale;                                        // root/limb scale
};
```
- Map *by semantic name* (hips, spine_01→spine_01, left_foot...) on authoring; missing bones → hold-to-parent.
- Validate: map coverage ≥ required bones; a missing critical bone = authoring error at import.

## 3. Pose-Local Rule (The Critical One)

Retarget in **local pose**, never world pose. Application:

```
for mapped bone pairs:
    actorLocal[actorBone] = mapLocal(referencePose[refBone])
       ∘ actor chain scale handling
```
Why: world-pose retarget bakes proportions illogically (long-armed actor's hand sm decorates walls); local keeps the *relative* motion shape (knee raises stay knee-height).

## 4. Scale & Proportion Handles

| Handle | Where |
|--------|-------|
| global skeleton scale | root multiplier |
| per-chain scale (arms, legs) | proportional rescale of local translations |
| rotation cancel (foot angle) | per-bone rotation offset |

Standard practice: 
- translate local by chainScale × reference delta,
- rotate local preserve (rotations don't scale),
- mutation-safe: offsets authored functionally not by magic per-actor constants.

## 5. Mapping the State Machine, Not Just Clips

- The ASM config, masks, blend spaces are *also* retargetable because they only reference clip names + bone names.
- A character using the same ASM + mask set needs only: skeleton + bind + a valid RetargetMap → ready.

## 6. Morph & Face (Separate Concern)

Face rigs usually retarget by *morph-targets* (skinned expression sets), not bones. Map facial semantics (jaw, eyes, blink source) separately; blend via weights.

## 7. Validation

- **T-pose round-trip**: reference→retarget→reference within pose tolerance.
- Combo test: all transitions work on every character (no missing bone → pop).
- Cinematic: retarget check on the asym limb cases (biped/quad).

## 8. Pitfalls

| Pitfall | Fix |
|---------|-----|
| World-pose retarget | local-pose only |
| No bone map coverage validation | import assert |
| Scale baked per-actor constant | handled offsets |
| Fingers lost in map | optional grip-preserving rule |
| Quadratic animation flashes | mask + target validation |

## 9. Checklist

- [ ] Semantic bone map at author; coverage validated at import.
- [ ] Local-pose application + chain scale handling.
- [ ] ASM/mask sharing across rigs (names + clips only).
- [ ] T-pose + transition round-trip validation.
- [ ] Face via morph mapping separate.