---
title: Rendering Pipeline Patterns
description: Frame graphs, forward vs deferred rendering, instancing, LOD, GPU-driven rendering, culling, and batching for modern engines.
---

# Rendering Pipeline Patterns — Deep Reference

## 1. The Render Pipeline (CPU → GPU)

```
Gameplay (component update) → Command list / render graph
  → Pass scheduling → GPU execution (geometry, shading, post) → present
```

## 2. Frame Graphs — The Modern Architecture

A frame graph is a declarative description of passes and their resource dependencies:

```rust
// Conceptual:
GBuffer ← (FillGbufferPass writes Gbuffer, uses Geometry)
LightingPass ← reads GBuffer, writes SceneColor
SSRPass ← reads SceneColor, writes reflections
CompositingPass ← reads SceneColor + reflections, writes FinalColor
PostProcess ← reads FinalColor, writes backbuffer
```

### Steps to build a frame graph

1. Declare resources (textures, buffers) as **virtual edges**.
2. Build dependency DAG at runtime.
3. Allocate physical resources only for alive spans (lifetime analysis).
4. Order passes topologically; where no edge, execute on async queue.

### Benefits

- Resource aliasing (share memory between temporaries).
- Explicit async compute / copy queues.
- Deterministic, debuggable pass ordering.
- Portability across API backends.

### Engines using it

- Unreal (RDG — Render Dependency Graph)
- Unity (SRP — HDRP/URP Scriptable Render Pipeline)
- Frostbite, Forza, many first-party AAA engines

## 3. Forward vs Deferred

### Forward

```
For each object: draw with all active lights
```

- Cost: O(drawCalls × lights hitting object).
- Great for: scenes with few lights, MSAA-heavy, mobile/VR.

### Deferred

```
Pass1: GBuffer (Albedo, Normal, PBR params, depth)
Pass2: Light pass: for each light, shade the GBuffer in screen/light space
```

- Cost: light shading independent of geometry.
- Great for: many dynamic lights, complex scenes, static geometry.
- Trade-off: no natural MSAA (render-res scaled or TAA), GBuffer bandwidth + memory, harder transparent lighting.

## 4. Instancing

Draw many objects with one call:

```cpp
// One ~MeshBuffer contains N transforms
// Shader reads instance index
struct InstanceData { mat4 model; vec4 tint; int materialIdx; uint flags; };
```

- **Standard draw instancing**: `vkCmdDrawIndexed(..., instanceCount=10000)`.
- **GPU-driven**: GPU culls instances and emits an indirect draw (IndirectDraw/Callable).

### LOD (Level of Detail)

3–4 mesh variants per asset; pick by distance/size:

```cpp
int pickLOD(float distance, int maxLOD) {
    const float distLods[] = {5.f, 20.f, 60.f};   // switch distances
    int lod = 0;
    while (lod < maxLOD && distance > distLods[lod]) lod++;
    return lod;
}
```

Cache LOD per frame per object to avoid repeated math.

## 5. Culling Hierarchy

1. **Frustum culling**: skip objects outside camera frustum (AABB vs plane test).
2. **Occlusion culling**: skip objects behind blockers (hardware occluders, Hi-Z).
3. **LOD culling**: far objects use simpler meshes/material/lighting.
4. **Distance culling**: cull beyond max draw distance entirely.

```cpp
bool inFrustum(const AABB& box, const Plane frustum[6]) {
    for (int i = 0; i < 6; ++i)
        if (box.min.dot(frustum[i].normal) + frustum[i].d < 0) return false;
    return true;
}
```

## 6. Batching

Group draw calls by state (shader + material + mesh):

```
Sort key = { shaderId, materialId, meshId, depthBucket }
After sort: batch identical keys into one draw.
```

- **Static batching**: merge static meshes into larger buffers at load.
- **Dynamic batching**: only for small objects (few vertices).
- **SRP Batcher** (Unity): caches Unity `MaterialPropertyBlock` to reduce state switching.

## 7. Transparency Sorting

- Sort transparent objects **back-to-front** (seq. blend).
- Common failure: z-fighting between transparents → use per-object sorting by centroid depth; big transparents (particles) drawn after Opaque set.

## 8. Post-Process Chain

```
Tone mapping (HDR → LDR) → Vignette → Bloom → DOF → Color Grding → FXAA/TAA → Sharpen → Present
```

Order matters: TAA before post? TAA after bloom? Lower res depth-of-field for perf.

## 9. Common Optimization Table

| Optimize | If you see | Do |
|----------|-----------|-----|
| Draw calls high (>3k on mobile) | Batcher shows many small draws | Static batch, instancing, merge materials |
| Vertex-bound | model too complex for distance | Better LOD + frustum cull more |
| Fragment-bound | overdraw rate high | Deferred lighting's GBuffer or reduce fragment rate |
| Transfer-bound | loading stalls on asset I/O | Async streaming, DDS/BCn compressed textures |
| GPU idle | frame present stalls | Async compute, shader warmup, not blocking on queue |

## 10. Rules for Rendering Work

1. Establish draw call budget per platform first, then optimize within it.
2. Never allocate GPU resources in the render loop.
3. Use GPU timelines: CPU submits a frame, GPU executes async — don't `waitIdle` per frame.
4. Frame graph for resource lifetime + aliasing in modern engines.
5. Profile with RenderDoc/PIX; know each pass's time and memory.
6. Keep shader complexity budgeted: instructions & register pressure for mobile.