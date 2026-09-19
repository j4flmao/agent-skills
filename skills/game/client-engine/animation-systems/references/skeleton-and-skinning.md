---
title: Skeleton and Skinning
description: Skeleton data, bind pose, local-pose evaluation, matrix math for GPU skinning and cache-friendly bone chains.
---

# Skeleton & Skinning — Deep Reference

## 1. Skeleton Data Layout

```cpp
struct Bone { uint16 parent; Mat3x4 bindPoseInv; /* inverse bind */ };
struct Skeleton {
    const Bone* bones; uint16 count;
    // parent < child order guaranteed → sequential loops are cache-friendly
};
```

- Sort bones so parents precede children (always the same layout once built).
- `bindPoseInv` = inverse of the bind-time WorldMatrix of the bone (precomputed, constant).
- Skeleton is shared per rig type — evaluate once per rig, reuse across actors with the same skeleton.

## 2. The Evaluation (Local-Pose First)

Blend produces a **local pose** (per-bone local to parent). Then global-ize in one chain walk:

```cpp
for (i : 0..count) {
    // dstGlob[i] = dstLoc[i] * dstGlob[parent[i]]   (row-vector)
    dstGlob[i] = Mul(local[i], dstGlob[bones[i].parent]);
}
```
Cost: ~count×(4×4 matrix mul) — the hot part of pose eval. Vectorize with SIMD (`simd.md`) — the 4 rows as lanes.

## 3. Skinning Math (Model → Bone Space)

Vertex skinning:
```
skinnedPos = Σ (w_j · (bindPoseInv_j · ModelMatrix · boneGlob_j · v))
```
Since model matrices + bind are constant per pose, precompute the **skin matrix** per bone:

```cpp
// per bone: skinMat[j] = bindInv[j] * ModelWorld * boneGlob[j]
// per vertex: pos = Σ_j w_j * (skinMat[j] * v⃗)     //   (when Matrix applied to vert)
```
For 4 weights: 4× matrix-vector + sum — cheap in the vertex shader.

## 4. GPU Skinning: The Two Uploads

| Data | Cost | Path |
|------|------|------|
| skin matrices (per-bone) | bones×64 B | uniform/cbuffer (re-upload per pose) |
| skinned vertex buffers | verts×float3 | staging or index-retexture |

- Batch per *skeleton*, not per mesh: upload once per rig for all uses.
- Alternative: **GPU-friendly skinning** — feed bone matrices as a structured buffer; vertex shader indexes `idx.x/y/z/w`.

## 5. Hierarchical Problems

| Pitfall | Result | Fix |
|---------|--------|-----|
| Child before parent order | garbage global pose | parent-first order |
| Bind pose computed wrong | skin "explodes" | validate bindInv → identity test |
| Two skeletons sharing clips | wrong retarget | rig map (see retargeting) |
| Non-normalized skin verts weights | shafts | normalize at import |
| Whole-body recompute for trivial clip | CPU waste | cache per (skeleton, pose) |

## 6. Validation (Unit Test Level)

- Bind test: `bindInv * bindWorld = Identity` per bone (import-time assert).
- Identity pose → mesh matches T-pose in render (a smoke test).
- Parent chain: every bone's world pose equals `local_local ∘ parent` (unit check).

## 7. The Numbers

| Rig type | Bones | Bind cost |
|----------|-------|-----------|
| low-poly humanoid | 24–50 | trivial |
| AAA humanoid + face | 60–120 | ~musical hundreds |
| quad/varied | 8–30 | trivial |

## 8. Checklist

- [ ] Bones parent-first ordered; skeleton shared per rig.
- [ ] local-pose cache; global via SIMD chain.
- [ ] Skin matrices precomputed per bone, batched upload per skeleton.
- [ ] 4-weight vertex shader skinning from structured buffer.
- [ ] Bind identity + T-pose validation tests.