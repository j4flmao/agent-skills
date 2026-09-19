---
title: Vulkan Compute and Ray Tracing Reference
description: Compute shader pipelines, workgroup sizing, GPU-driven rendering, async compute, and ray tracing acceleration structures.
---

# Compute & Ray Tracing — Deep Reference

## 1. Compute Pipeline Basics

```
BindComputePipeline -> bind descriptors -> vkCmdDispatch(x, y, z)
```

```glsl
#version 450
layout(local_size_x = 64) in;    // workgroup size
layout(local_size_y = 64) in;    // 2D/3D support
layout(local_size_z = 1) in;
layout(set = 0, binding = 0, r32f) uniform image2D outImg;
layout(std430, set = 0, binding = 1) buffer DataBuffer { vec4 data[]; } db;

void main() {
    ivec2 pixel = ivec2(gl_GlobalInvocationID.xy);
    vec2 uv = (vec2(pixel) + 0.5) / imageSize(outImg);
    // ... work
    imageStore(outImg, pixel, vec4(uv, 0, 1));
}
```

- Dispatch count = ceil(workItems / localSize).
- grid dims are capped (`maxComputeWorkGroupCount`); split into batches for huge grids.

## 2. Occupancy & Wave Sizing

| Vendor | Wave/Warp size | Notes |
|--------|----------------|-------|
| NVIDIA | 32 | full warps benefit from 32-aligned memory |
| AMD RDNA | 64 | 2×32 apparently; RDNA2+ uses 32 or 64 configurable |
| Intel | 8/16/32 | Xe varies |

Rules:
- local_size 64–128 is a good default; profile both.
- Avoid divergence; prefer branches `if (perWorkgroup uniform)`.
- Watch barrier cost (`barrier()`/`groupMemoryBarrier`) inside local groups.
- Use specialized groups for slower ops (atomic-heavy systems).

## 3. Storage Buffers (SSBO) vs Uniform Buffer

| | UBO | SSBO |
|---|-----|------|
| Size | 16 KB / descriptor (or dynamic) | up to GBs |
| Layout | std140 | std430 / scalar |
| Random-access writes | no | yes |
| Per-frame | yes (ring) | yes (ring / persistence) |

Use SSBO for particles, instance arrays, path tracing accumulation, mesh culling output lists.

## 4. Async Compute

Two queues: graphics + compute. Submit compute work with its own semaphores so it overlaps graphics gaps:

```cpp
// graphics submit signals gfxDone
// compute submit waits gfxDone at COMPUTE stage, signals computeDone
// graphics waits computeDone at COMPUTE stage before reading output
```

Only useful when the GPU has idle compute capacity (e.g., while fragment-heavy).

## 5. GPU-Driven Rendering (Indirect with Compute)

1. Compute pass frustum-culls every instance → writes `VkDrawIndexedIndirectCommand` array.
2. Graphics pass does ONE `vkCmdDrawIndexedIndirect`.

```cpp
struct VkDrawIndexedIndirectCommand { indexCount, instanceCount, firstIndex, vertexOffset, firstInstance; };

// compute writes drawCommands[i] = { indexCount, visible ? 1 : 0, firstIndex, 0, lod };

vkCmdBindPipeline(cmd, PIPELINE_BIND_POINT_GRAPHICS, meshPipeline);
VkDeviceSize offset = 0;
vkCmdDrawIndexedIndirect(cmd, indirectBuffer, offset, maxCommands, stride);
```

Culling passed via device index buffer so no CPU round-trip.

### Meshlets & Nanite-style pipelines

With `VK_EXT_mesh_shader`:
- Task shader clusters geometry into meshlets on GPU.
- Mesh shader outputs primitives directly (no fixed geometry stage).
- Combined with compute culling indices → massive triangle counts.

PRM: keep LOD cutoffs constant, avoid variable clustering.

## 6. Ray Tracing With VK_KHR_ray_tracing_pipeline

### Acceleration structures

```
BLAS (bottom level)  = geometry (position + index + transform). Build once per mesh.
TLAS (top level)     = instances (BLAS refs + transform + instanceId). Rebuild per frame / on change.
```

```cpp
// BLAS
VkAccelerationStructureBuildGeometryInfoKHR build{};
build.type = VK_ACCELERATION_STRUCTURE_TYPE_BOTTOM_LEVEL_KHR;
build.geometryCount = 1;
VkAccelerationStructureGeometryKHR geo{};
geo.geometryType = VK_GEOMETRY_TYPE_TRIANGLES_KHR;
geo.geometry.triangles.vertexData = deviceBuffer(vertices);
geo.geometry.triangles.indexData  = deviceBuffer(indices);
geo.geometry.triangles.maxVertex  = vertexCount;
build.pGeometries = &geo;

// query size: vkGetAccelerationStructureBuildSizesKHR -> sizes.accelerationStructureSize
// allocate scratch + result buffer from scratch heap
// vkCmdBuildAccelerationStructuresKHR(cmd, 1, &build, &buildOffsets);

// TLAS
VkAccelerationStructureBuildGeometryInfoKHR tbuild{};
tbuild.type = VK_ACCELERATION_STRUCTURE_TYPE_TOP_LEVEL_KHR;
tbuild.geometryCount = 1;
// VkAccelerationStructureInstanceKHR* instances (transform, accelerationStructureReference, instanceId)
```

### RT pipeline

```cpp
VkRayTracingPipelineCreateInfoKHR rtp{};        // via ext functions
// stages: RayGen (binding 0), Miss, ClosestHit, AnyHit, Intersection
// groups: general group or tri-hit group
standard stages: vkCmdTraceRaysKHR(cmd, &raygen, &miss, &hit, &callable, w, h, 1);
```

Shader example:

```glsl
#version 460
#extension GL_EXT_ray_tracing : require
layout(location = 0) rayPayloadEXT vec3 hitColor;
void main() {
    hitColor = vec3(1.0, 0.0, 1.0);
    traceRayEXT(topLevelAS, gl_RayFlagsOpaqueEXT, 0xFF, 0,0, 0,
                rayOrigin, tmin, rayDir, tmax, 0);
    imageStore(outImg, gl_LaunchIDEXT.xy, vec4(hitColor, 1));
}
```

### RT performance rules

- Build BLAS once; reuse via TLAS instances.
- Update TLAS with `VK_BUILD_ACCELERATION_STRUCTURE_PREFER_FAST_TRACE_BIT`.
- Batch instance updates (avoid per-frame re-build of static BLAS).
- Use `anyHit` sparingly; flip to opaque when no alpha.
- Keep scene tight: box culling, instancing of identical meshes.
- Hybrid: RT for reflections/shadows at low res + upscale; raster for opaque.

## 7. Compute vs RT: When to Use Which

| Problem | Primary tool |
|---------|--------------|
| Particle sim / fluid | compute (SSBO, atomic counters) |
| Frustum culling, indirect draws | compute |
| Soft shadow / AO (screen-space) | compute or fragment |
| Pixel-perfect reflections | RT closest-hit |
| Giant triangle counts (Nanite) | mesh shaders + compute |
| Volumetrics | compute + full-res upsampling |
| GI / path tracing | RT pipeline |

## 8. Debugging Compute

1. Validate: `vkCmdDispatch` inside render pass = validation error.
2. RenderDoc: inspect outputs image-by-image; enable uninitialized-access checks.
3. Race check: write barriers around compute outputs before sampling.
4. Nsight/AMD Perf: check wave occupancy, memory coalescing, barriers.
5. Sanity: write a trivial `imageStore(inputDebugIdx, ...)` to verify data flow.

## References

- Khronos spec ch 9 (compute), ch 40 (ray tracing)
- NVIDIA vk_raytracing_tutorial
- GDC "GPU-Driven Rendering" Wihlidal (Doom/general pattern)