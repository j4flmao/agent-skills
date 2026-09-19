---
name: animation-systems
description: Expert character animation systems — skeletons, skinning, state machines, blending, root motion, IK, retargeting and animation performance budgeting.
---

# Animation Systems — Deep Engineering Guide

Animation makes characters feel alive. This skill covers the skeleton/skinning pipeline, animation state machines and blending, root motion, IK, retargeting and the performance budgets that keep hundreds of characters animating on 16 ms budgets.

## 1. The Animation Pipeline

```
AnimClip (per-bone keyframes)
  → AnimInstance (time, pose)
  → blending (state machine, layers)
  → skeleton-relative posed bones
  → skinning (GPU: vertex skin via bone matrices)
  → render
```

The hot path is **per-bone matrix generation + skinning** — the two budget walls for crowds (see §8).

## 2. Skeleton & Bone Hierarchy

```cpp
struct Bone { int parent; Mat4 bindPoseInv; /* inverse bind */ const char* name; };
struct Skeleton { vector<Bone> bones; /* sorted so parent < child */ };
```
- Bones store **inverse bind pose** (bindPoseInv): skinning needs model→bone *in the bind pose* (constant per skeleton).
- Precompute per-bone `bindPoseInv * worldParent` can vectorize.
- Bone order: sorted parents-first so the loop is sequential (cache-friendly; see job/memory skills).

## 3. The Animation Clip & Compressed Storage

| Representation | Size/frame | Quality |
|----------------|-----------|---------|
| Raw (Vec3 quats float) | ~ 52 B/bone | exact |
| Compressed quats (16-bit + smallest-three) | ~ 10 B/bone | great |
| Keyframe-Lerp (only on change) | keys compressed | tuned |

- Store *local* pose (per-bone, parent-relative) — the evaluator blends local, then multiplies down the chain once.
- Interleave: a clip = array of bone channels; load once to cache.
- **Keyframe dedup**: stationary bones (fingers) hold 1–2 keys; explode memory by 10×.
- 16-bit compression (quantized quats) is the standard; S18Q8-style for gross.
- Deterministic: same clip + same t → same pose (see `compression` ref).

## 4. Blending & The State Machine

### 4.1 The AnimStateMachine (ASM)

```
states: Idle, Walk, Run, Jump, Attack_A...
transitions: {from, to, triggers, blendTime, condition}
```

- Blend *parameters* (e.g., MoveSpeed → Walk/Run weight) or *trigger* transitions (Attack).
- Blend **atomic poses**, not clips: a "Walk" state is a *pose* (after clips/layers), blended toward Run via `lerp(pose)` or `quat nlerp`.
- Transition evaluator: `blend w` ramps 0→1 over `blendTime` (frame-rate independent — `state.time/transition.duration`).

### 4.2 Layer Mixing (Upper Body)

```
base layer:  whole-body locomotion
masked layer: upper-body (aim, pickup, minor)
combine: mix per-bone by mask weights (blend-by-mask)
```
The mask = per-bone weights (torso 1.0, hips 0.2...) — cache offsets.

## 5. Root Motion & Movement

- Root bone = the actor transform. **Root motion** = the clip's translation/rotation on the root:
  - extracted, applied to the actor position, or
  - ignored (locomotion only; velocity comes from the controller).
- Extract carefully: a walk clip with root displacement = 0.8 m/tick; the animator drives the placement.
- Blend root motion through the same blend weights (else foot-slide).

## 6. IK (Inverse Kinematics)

| IK use | Method | Cost |
|--------|--------|------|
| Foot placement | 2-bone (leg) analytic | cheap |
| Head/hand target | 2-bone + reach | cheap |
| Full-body align (grippers) | CCD/FABRIK | heavier |

- Solve *after* the ASM, on a few bones; keep the rest from ASM.
- Foot IK: sample ground height under the ankle, rotate the leg→IK chain, blend 0–50%.
- Never run full-body IK per character when not needed (only interacting/grounded-anim).

## 7. Retargeting (One Skeleton, Many Rigs)

- The state machine + clips authored on a *reference* skeleton; each character maps *bones by semantic name* (hips, spine_01...).
- **Inverse retarget** (author once, apply to all): a mapper table `{referenceBone → actorBone, weight}` + scale handling.
- Root/bone *lengths* differ: retarget applies local pose, not world (keep proportions in the rigs).

## 8. Performance Budgeting (The Crowd Wall)

Per-character cost budget (skinned):

| Metric | Target/char (100 chars) |
|--------|-------------------------|
| CPU pose eval (LOD0) | ~0.1–0.3 ms |
| Skinning GPU | ~0.05–0.2 ms |
| skin vertices | 3–8k quads LOD0 |
| animation memory (decompressed) | LOD0 ~1 MB/char-anim-set |

- **LOD**: distant characters → half poses (24 bones) → single-skin → no-ASM (a "idle texture" / impostor).
- Skin on GPU (vertex shader matrices), pose on CPU (cheap per-bone); lifting skinned verts to GPU = your budget lever.
- Histogram "bones skinned / second" in profiler is the first tuning hand crank.

## 9. Determinism (Netcode & Replay)

- The ASM must be **deterministic**: `state.time` advances by fixed or sim-driven dt; blends use the same polygon (no wall-clock).
- Serialize the *state* (currentState, time, parameters), not the pose — replay reconstructs.

## 10. References

- `references/skeleton-and-skinning.md` — bone chain, bind pose, local evaluation, GPU skin matrix math
- `references/animation-blending.md` — blend spaces, masks, state machine transitions, continuous blends
- `references/clip-compression.md` — keyframe dedup, quantization, streaming clips, deterministic decode
- `references/root-motion-and-ik.md` — root extraction, foot IK, 2-bone/CCD solving, budgets
- `references/retargeting.md` — bone maps, scale handles, pose-local rules, merchant/furry-safe rules
- `references/performance-budgeting.md` — bone counts, LOD ladder, impostors, profiler histogram