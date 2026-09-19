---
title: GPU-Driven Rendering
description: Indirect draw lists, visibility buffers, GPU culling passes, compaction and performance tradeoffs in a render graph.
---

# GPU-Driven Rendering — Deep Reference

## 1. The Idea

Push the entire "what is visible & in what order" decision to the GPU: CPU uploads an array of draw args (constant buffers), GPU runs culling (vs frustum/occlusion) in a compute pass that emits an **indirect draw list**, and graphics passes bind that list.

The render graph is the natural home: a compute pass (culling) → produces an indirect buffer → graphics passes read it.

## 2. Indirect Draw Plumbing

```cpp
// CPU-side: upload AllDraws[]
struct DrawArgs { Transform tf; MeshId mesh; MaterialId mat; AABB worldBounds; };
// staging → shader input (storage buffer)

// GPU pass "Cull":
layout(..., set=0, binding=1) readonly buffer AllDraws;
layout(..., set=0, binding=2) buffer VisibleDraws;   // compacted ids
layout(..., set=0, binding=3) buffer DrawIndirect;  // struct per visible

// cull: for each instance, frustum + occlusion, if visible append id to VisibleDraws + count++
// emit indirect: VkDrawIndexedIndirectCommand { indexCount, instanceCount, firstIndex, idxOffset, firstInstance }

// graphics pass:
cmd.drawIndexedIndirect(bind(VisibleDraws), 0, 1);
```

GPU does the selection; the CPU cost is O(1) per frame (no per-draw CPU loop).

## 3. The Occlusion Pipeline (Two-Depth)

Classic GPU-driven occlusion: 
1. **Depth prepass** writes a coarse depth buffer (or the previous frame's depth is reused for the *cull* pass — the "HZB" or hierarchical-Z).
2. **HZB culling** in the cull pass: test AABB against the downsampled depth; drop hidden ones.
3. Visible id list feeds `drawIndexedIndirect`.

Needs care: first-frame/streaming dependencies (the read of a previous-frame depth must not race the current frame's write — an edge the render graph enforces.)

## 4. Fragmentation & Compaction

Two granularity failures that hurt:
- The indirect list has *gaps* (skipped instances); keep it dense: append visible ids in the same pass (compaction). If you leave holes, the (smaller) cost of `firstInstance` strides is worst-case O(n²).
- Uses a per-frame scratch buffer reused between frames (transient — see `passes-and-attachments`).

## 5. What to GPU-Cull vs CPU-Cull

| Work | GPU-driven (good) | CPU-driven (fine) |
|------|-------------------|-------------------|
| Frustum cull of 50k static meshes | yes (one dispatch) | no |
| Occlusion of a level | yes (HZB) | ray budget only |
| Animation state / LOD switching | GPU (dispatch) | maybe |
| Objects the *gameplay* code needs (interactions, physics) | no — physics/audio need CPU answers | yes |

Balance: cull *state* (behaviour) on CPU; cull *rendering* (drawability) on GPU.

## 6. The Async-Compute Split

If the cull pass only reads `AllDraws` + HZB and writes `VisibleDraws`/`Indirect`, it can run **asynchronously on a compute queue** alongside the graphics queue — the graph inserts the ownership/fence (§ sync). But `AllDraws` (constant from CPU) must finish uploading first: that's a CPU→GPU semaphore dependency the graph orders.

## 7. Performance Footprint

| Metric | GPU-driven target |
|--------|-------------------|
| CPU time / frame (draw loop) | < 0.1 ms |
| Draw call count | up to ~200k indirect |
| Cull pass cost | a fraction of the raster cost |
| Compaction waste | 0 (dense list) |
| VRAM extra | mostly the `AllDraws` + Visibility buffers (~ a few MB) |

Watch out: indirect binding reads a *storage buffer* — keep it in VRAM (device-local), not system memory.

## 8. The "AllDraws" Upload & Streaming

Per-frame constants buffer is small; `AllDraws` for 50k entities = ~ 5 MB; upload once and update changed entities' slots (a persistent upload ring — `resource-lifecycle`), don't rewrite whole buffer every frame.

## 9. Debug & Validation

- `--frame-dump` includes the indirect buffer content — cross-check count vs what a software frustum cull would say.
- Highlight "GPU-culled" vs "CPU-culled" in an editor overlay; mismatches are culling bugs.

## 10. Pitfalls

| Pitfall | Fix |
|---------|-----|
| CPU loops over 50k draws | let GPU cull |
| Indirect params in wrong memory | VRAM storage buffer |
| Occlusion read-after-write race | render-graph edge + fence |
| Gapped indirect list (compaction lost) | dense visible-id array |
| HZB from stale depth | version-tag; regenerate when camera moves |

## 11. Checklist

- [ ] AllDraws uploaded incrementally, not per-frame full rewrite.
- [ ] Cull pass dispatches and compacts dense.
- [ ] HZB loop correct + edge-ordered.
- [ ] Indirect draw bound from VRAM storage.
- [ ] GPU culling only for render state; gameplay stays CPU.
- [ ] Debug overlay compares GPU vs CPU cull.
- [ ] Async split handled with ownership transfers.