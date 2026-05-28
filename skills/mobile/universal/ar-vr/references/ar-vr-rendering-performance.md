# AR/VR Rendering Performance

## Overview

Mobile AR/VR rendering operates under severe hardware constraints. Mobile GPUs share thermal envelopes with CPUs, have limited memory bandwidth, and must sustain high frame rates (60fps for AR, 72-90fps for VR) to prevent user discomfort. This reference covers rendering pipelines, optimization strategies, profiling tools, and platform-specific tuning for ARKit and ARCore.

## Rendering Pipeline Basics

### AR/VR Pipeline Phases

```
Application → CPU (tracking update, anchor processing, physics)
  → Geometry Setup (vertex buffers, index buffers, instance data)
  → GPU (vertex shader → tessellation → geometry shader → rasterization → fragment shader)
  → Frame Buffer (color, depth, stencil)
  → Presentation (display link, vsync, HDR tone mapping)
```

### CPU & GPU Parallelism

The AR/VR loop is double-buffered (or triple-buffered):

- **Frame N**: CPU processes tracking data, updates anchors, submits draw calls
- **Frame N-1**: GPU renders previously submitted commands
- **Frame N-2**: GPU post-processing, display output (triple-buffered)

CPU time should be <8ms per frame for 120fps, <16ms for 60fps. GPU time similarly bounded. If either exceeds the budget, frame drops occur.

## Performance Budgets

### Target Metrics

| Metric | AR Target | VR Target | Warning Threshold |
|---|---|---|---|
| Frame rate | 60 fps | 72-90 fps | <30 fps |
| Frame time | <16ms | <11-14ms | >33ms |
| Draw calls | <100 | <150 | >200 |
| Triangles | <300k/frame | <500k/frame | >1M/frame |
| GPU memory | <200MB | <350MB | >500MB |
| System memory | <500MB | <800MB | >1GB |
| Battery draw | <400mW | <600mW | >800mW |
| Thermal | No throttling | No throttling | Throttle triggered |

### Budget Allocation

```
Total Frame Budget (16ms at 60fps)
├── CPU (8ms max)
│   ├── Tracking update: 2ms
│   ├── Anchor processing: 1ms
│   ├── Physics/AI: 2ms
│   ├── Render thread submission: 2ms
│   └── Other: 1ms
├── GPU (8ms max)
│   ├── Vertex processing: 2ms
│   ├── Rasterization: 1ms
│   ├── Fragment processing: 3ms
│   ├── Post-processing: 1ms
│   └── Frame buffer resolve: 1ms
└── Safety margin: 2ms
```

## GPU Architecture for Mobile

### Tile-Based Deferred Rendering (TBDR)

Mobile GPUs (Apple A-series, Qualcomm Adreno, ARM Mali) use TBDR:

1. **Tiling**: Frame is split into small tiles (16x16 or 32x32 pixels)
2. **Geometry pass**: Triangle transformation, binning into tiles (vertex shader)
3. **Rasterization per tile**: On-chip memory, no VRAM bandwidth for depth/color
4. **Fragment processing**: Per-tile with early-Z and hidden surface removal
5. **Tile resolve**: Write final tile colors to framebuffer

### Implications for AR/VR

- **Overdraw is expensive**: Hidden surface removal happens after binning, but pixel shader execution on fragments that will be discarded wastes ALU
- **On-chip memory limited**: Excessive render targets cause spill to system memory
- **Depth complexity**: High depth complexity reduces TBDR efficiency
- **Frame buffer memory bandwidth**: The resolve step is the most bandwidth-intensive operation
- **Multiple render targets (MRT)**: Limit to 2-4 simultaneous render targets

### Memory Bandwidth Considerations

| Operation | Bandwidth Cost |
|---|---|
| Single texture read (1024x1024 RGBA8) | 4 MB |
| Frame buffer resolve (1440x1080) | 6 MB |
| Shadow map generation | 2-4 MB per cascade |
| Post-processing bloom (3 passes) | 18 MB |
| Environment map capture | 12-24 MB |

Total bandwidth should stay under 8 GB/s on most mobile GPUs. Each frame buffer resolve or expensive post-processing effect consumes significant bandwidth.

## Geometry Optimization

### Polygon Reduction

Polygon counts directly impact vertex processing. For mobile AR/VR:

| Category | Max Polygons | Example |
|---|---|---|
| Hero object (player, focal model) | 50k-100k | Character, car |
| Mid-detail object | 10k-30k | Furniture, prop |
| Low-detail object | 1k-5k | Distant objects |
| Environment | <50k total | Room, landscape |
| UI elements | <500 each | Button, panel |

### Vertex Buffer Optimization

- Interleave vertex data: position, normal, UV, tangent in one buffer
- Use 16-bit indices (uint16) instead of 32-bit when <65536 vertices
- Pre-transform skinned vertices on CPU or use compute shaders
- Share vertex buffers across instances when possible
- Use buffer update regions (glBufferSubData / MTLBuffer with offset) instead of recreating buffers
- Vertex cache: optimize index buffers for post-transform cache (FIFO ~16-32 vertices)

### Index Buffer Optimization

- Stripped indexed triangles reduce vertex processing by ~33%
- Use triangle strips for meshes with regular topology
- Cache-friendly indexing: use D3DX or NVGPUTool to reorder indices

## LOD (Level of Detail) System

### LOD Strategy

```
PhysicallyBasedLODStrategy:
├── LOD 0 (Full detail): 0-2m camera distance, 100% vertices
├── LOD 1 (Medium): 2-5m, 50-60% vertices
├── LOD 2 (Low): 5-15m, 25-30% vertices
└── LOD 3 (Culled): >15m, remove object

Transition blending:
├── Cross-fade over 0.2s at LOD boundary
├── Dither cross-fade (cheaper than alpha blending)
└── No pop — use continuous LOD when possible
```

### LOD Generation

- Use mesh decimation tools: Blender decimate modifier, Simplygon, MeshLab, or gltf-transform
- Preserve silhouette edges in lower LODs
- Collapse planar regions first, maintain edges with high curvature
- Remove internal geometry that is not visible from outside
- Billboards for very distant objects: render object to texture, display as quad

### Texture LOD (Mipmapping)

- Generate mipmaps for all textures. This is mandatory, not optional.
- Mipmap levels: from full resolution down to 1x1 pixel
- Use trilinear filtering for smooth transitions
- Anisotropic filtering: max 4x on mobile (8x+ is expensive)
- Without mipmaps, textures shimmer in the distance and waste bandwidth

## Texture Optimization

### Texture Compression Formats

| Format | Bits/Pixel | Quality | Platform | Use Case |
|---|---|---|---|---|
| ASTC 4x4 | 8 bpp | High | iOS (A8+), Android (Mali, Adreno 6XX+) | Best quality |
| ASTC 6x6 | 3.56 bpp | Medium | Same as above | General purpose |
| ASTC 8x8 | 2 bpp | Low | Same as above | Diffuse only |
| ETC2 RGBA | 8 bpp | Medium | Android (all OpenGL ES 3.0+) | Fallback |
| PVRTC 4bpp | 4 bpp | Medium | iOS (legacy) | Legacy devices |
| BC3/DXT5 | 8 bpp | Good | Desktop, not mobile | Editor only |

### Texture Atlas

Combine multiple textures into one atlas texture:

- Atlas size: 2048x2048 max (512x512 for small object sets)
- Padding: 4-8 pixels between atlas elements to prevent bleeding
- Region tracking: maintain free-space list for dynamic additions
- Coordinate mapping: store UV offset and scale per object

### Limits

- Texture dimensions: powers of two (NPOT allowed but may cause padding or performance issues on older GPUs)
- Max resolution 2048x2048 for most mobile AR/VR content
- Maximum 16 textures bound simultaneously for AR (fewer if VR needs them for multipass)
- Reduce color depth: RGB565 instead of RGBA8888 when alpha not needed

## Shader Optimization

### Shader Complexity Budget

- Total instructions per fragment shader: <64 ALU instructions
- Texture samples per fragment: <4
- Varying (interpolator) count: <8 vec4
- Uniform buffers: combine per-frame data (model-view-projection, light data)

### Expensive Operations to Avoid

- `pow(x, y)` with non-constant exponent (use `exp2(y * log2(x))` which is hardware-accelerated)
- `sqrt` / `inversesqrt`: use only when necessary (normalization)
- `sin` / `cos`: avoid in fragment shaders
- `texCUBE` (cube map lookups): expensive on mobile GPUs
- `tex2DLOD`: avoid explicit LOD in fragment shaders
- Dynamic branching with diverging warp/threads: move constant conditions out
- Derivative instructions (`ddx`, `ddy`): cause warp-wide synchronization

### Mobile-Friendly Lighting

```
Preferred: Baked lighting + simple directional + IBL (image-based lighting)

Avoid:
├── Per-pixel specular with complex BRDF
├── Multiple dynamic lights (max 1 directional + 1 ambient)
├── Area lights (requires complex integration)
├── Volumetric lighting
├── Screen-space reflections
└── Subsurface scattering

Simple mobile BRDF:
├── Lambertian diffuse: NdotL * albedo
├── Simple specular: Blinn-Phong (NdotH^shininess)
├── IBL: single-bounce cubemap lookup (no split-sum approximation needed on modern hardware)
└── Ambient occlusion: baked AO texture
```

### Shader Variants

Minimize shader permutation count:

- Use uniforms instead of `#ifdef` for toggleable features
- Pack material properties into a single uniform struct
- Limit variants to 10-20 compiled versions
- Precompile at build time, not runtime
- Vulkan and Metal: use shader libraries with explicit function specialization

## Occlusion Culling

### AR-Specific Occlusion

In AR, real-world objects can occlude virtual content:

- **LiDAR depth (iOS)**: Use ARKit's scene reconstruction mesh + depth API
  - `ARFrame.smoothedSceneDepth` for per-pixel depth
  - Use depth-aware shader: compare fragment depth with scene depth buffer
  - Alpha blend virtual object edges that intersect real surfaces
- **ARCore Depth API (Android)**: `Frame.acquireDepthImage()` for depth data
  - Lower resolution (160x120 on many devices)
  - Bilateral filter for temporal smoothing
  - Use depth as occlusion mask, not precise geometry
- **Visual hull**: For devices without depth sensor, compute occlusion from person segmentation masks
  - ARKit: `ARFrame.segmentationBuffer` (person segmentation)
  - ARCore: `AugmentedFace` or ML Kit person segmentation

### Frustum Culling

- Test all objects against view frustum each frame
- Use bounding sphere test first (cheaper), then AABB test for precision
- Hierarchical frustum culling: test parent nodes, skip children if parent out of view
- Maintain CPU-side scene graph for culling queries
- Update culling data when objects move (not every frame for static objects)

### Hierarchical Z-Buffer (Hi-Z)

- Build mipmapped depth pyramid
- Test object bounding box against appropriate mip level
- Skip rendering entirely if bounding box is fully occluded by depth
- Update Hi-Z after opaque pass (do not include transparent objects)
- Resolution: 1/4 of screen dimensions per mip level (e.g., 512x384 for 1080p)

### Hardware Occlusion Queries

- Use conditional rendering: `glBeginConditionalRender` / `MTLCounterSampleBuffer`
- Query is asynchronous: issue query, continue, check result next frame
- Avoid stalling the pipeline by reading query results too soon
- Batch multiple queries into one query buffer

## Rendering Passes

### Pass Structure

```
Frame
├── Depth pre-pass (optional, improves TBDR efficiency)
│   ├── Render opaque geometry with simple depth-only shader
│   └── No color writes, no lighting
├── Opaque pass
│   ├── Render all opaque geometry with full shading
│   ├── Front-to-back order (improves early-Z rejection)
│   └── Enable depth test, write depth
├── Transparent pass
│   ├── Back-to-front order
│   ├── Disable depth write, enable depth test
│   └── Alpha blending (premultiplied alpha preferred)
├── Particle pass
│   ├── Billboarding with view-aligned quads
│   ├── Batch all particles (same texture, same shader)
│   └── Additive blending
├── Post-processing
│   ├── Tone mapping (HDR → LDR)
│   ├── Simple vignette (optional)
│   ├── Anti-aliasing (FXAA or MSAA 2x)
│   └── Avoid: bloom, motion blur, SSAO, SSR
└── AR compositing
    ├── Composite virtual content with camera feed
    └── Depth-aware blending at virtual/real boundaries
```

### Lighting Pass Configurations

```
Forward rendering (recommended for mobile AR/VR):
├── Single pass, single directional light
├── Ambient occlusion from baked AO map
├── IBL from single environment cubemap
├── No shadow maps (or single 512x512 shadow map)
└── Lower fill rate requirements

Deferred rendering (only for high-end mobile, 2020+ devices):
├── G-buffer: albedo (RGB), normal (RG), depth (R), material (R)
├── Light accumulation pass
├── High memory bandwidth (3-4 render targets)
├── MSAA harder to implement
└── Avoid on devices with <4GB RAM
```

## Frame Timing Analysis

### Measuring Frame Times

```
CPU Frame Time = Tracking + Anchor Update + Scene Update + Render Submission
GPU Frame Time = Vertex Processing + Rasterization + Fragment + Post-Processing

Profiling tools:
├── Xcode GPU Frame Capture (iOS)
│   ├── Instruments: Metal System Trace
│   ├── ARKit Performance section
│   └── GPU counters: in-flight command buffers, renderer utilization
├── Android GPU Inspector (Android)
│   ├── Vulkan/OpenGL ES trace
│   ├── ARCore frame breakdown
│   └── GPU counters: shader ALU utilization, bandwidth, stall cycles
├── Unity Profiler (cross-platform)
│   ├── Rendering statistics
│   ├── GPU profiler
│   └── Memory profiler
└── Unreal Insights (cross-platform)
    ├── Frame timing chart
    ├── GPU hardware counters
    └── Render thread vs game thread breakdown
```

### Frame Time Budgets (60fps Target)

| Phase | Budget | Optimization If Exceeded |
|---|---|---|
| Tracking | 2ms | Reduce tracking feature count, lower update frequency |
| Anchor processing | 1ms | Remove unused anchors, batch updates |
| Physics/AI | 2ms | Simplify collision meshes, lower update frequency |
| Render submission | 2ms | Reduce draw calls, batch by material/shader |
| GPU vertex | 2ms | Reduce polygon count, LOD, instancing |
| GPU fragment | 3ms | Reduce shader complexity, texture resolution |
| Post-processing | 1ms | Simplify or skip effects |

## Memory Management

### Asset Streaming

```
Loading strategy for AR/VR scenes:
├── Scene load: show loading screen, load all assets
├── On-demand: stream assets based on proximity/camera focus
└── Progressive: load LOD 0 first (low-res), then stream higher

Memory pool approach:
├── Model pool: pre-allocate 100MB, evict LRU models
├── Texture pool: pre-allocate 80MB, evict LRU textures
└── Animation pool: pre-allocate 20MB, evict LRU animations

Eviction policy:
├── Distance > 20m from camera → candidate for eviction
├── Not visible in last 30 frames → evict
└── Priority: active interaction > visible > nearby > far
```

### Texture Memory

```
Full Resolution → Mipmapped → Compressed → VRAM
1024x1024 RGBA8 = 4 MB → with mipmaps ~5.3 MB → ASTC 4x4 = 1 MB

Budget for textures:
├── Environment cubemap: 512x512 ASTC = 512 KB
├── Diffuse maps: 1024x1024 ASTC 8x8 = 256 KB each
├── Normal maps: 512x512 ASTC 6x6 = 128 KB each
├── AO maps: 512x512 ASTC 8x8 = 64 KB each
└── Total: ~20MB for typical AR scene
```

### GPU Buffer Management

- Pool buffers: reuse `MTLBuffer` / `VkBuffer` instead of allocating per frame
- Use dynamic buffer rings: 2 or 3 buffers cycled per frame
- Staging buffers: upload from CPU → staging → GPU, then release staging
- Persistent mapping: for frequently updated data (per-frame transforms)
- Object pools: pre-allocate buffer memory for max expected objects

## Advanced Rendering Techniques

### Instancing

```
Draw call reduction via GPU instancing:

Without instancing:
└── 1000 chairs → 1000 draw calls → 1000 state changes → 10ms CPU

With instancing:
└── 1000 chairs → 1 draw call → 1 state change → 0.1ms CPU

Requirements:
├── Same mesh
├── Same material/shader
└── Same texture

Implementation:
├── Metal: [[instancing]] attribute on vertex function
├── Vulkan: vkCmdDrawIndexed with instanceCount
└── OpenGL ES: glDrawElementsInstanced

Per-instance data:
├── Model matrix (4x4)
├── Color tint (vec4)
├── Custom properties (float4)
└── Maximum 128 bytes per instance
```

### GPU-Driven Rendering

For high-end devices (iPhone 12 Pro+ or equivalent Android):

```
CPU → Prepare indirect draw commands on GPU
GPU compute → Frustum culling on GPU
GPU compute → LOD selection on GPU
GPU → Execute indirect draws

Benefits:
├── CPU no longer iterates all objects
├── Scalable to 10,000+ objects
└── Less CPU-GPU synchronization

Implementation:
├── Metal: indirect command buffers (ICB)
├── Vulkan: vkCmdDrawIndexedIndirect with indirect buffer
└── Unity: GPU instancing + GPU culling
```

## Platform-Specific Optimization

### iOS / ARKit (Metal)

```
Preferred API: Metal (not OpenGL ES)

ARKit-specific performance:
├── ARFrame.capturedImage → already GPU-resident, no upload needed
├── Scene reconstruction mesh: update frequency adjusted automatically
├── Depth data: ARFrame.smoothedSceneDepth at 30fps, reproject to frame rate
├── Person segmentation: S means lower resolution than full frame
└── LiDAR: adds ~1ms CPU + 2ms GPU per frame for scene mesh

Metal optimizations:
├── Use MTLHeap for sub-allocating from large allocations
├── MTLArgumentEncoder for reducing CPU overhead of binding
├── Memoryless render targets for depth/stencil
├── ASTC texture compression (hardware-decoded on A8+)
├── GPU-driven rendering via indirect command buffers
└── Use rasterizationOrderGroups for programmable blending
```

### Android / ARCore (Vulkan / OpenGL ES)

```
Preferred API: Vulkan (Android 7+, all modern devices)
Fallback: OpenGL ES 3.0+

ARCore-specific performance:
├── Depth API at variable resolution (160x120 - 640x480)
├── Cloud Anchor state sync at 10Hz max
├── Augmented Images: 20 max, update every frame
├── Plane detection: can be disabled when not needed
└── Light estimation: add ~0.5ms CPU per frame

Vulkan optimizations:
├── Pre-allocate descriptor pools
├── Use pipeline cache for faster shader compilation
├── Subpasses for tile-local rendering
├── Separate opaque/transparent render passes
├── Multi-buffered command buffers
└── Use VK_EXT_astc_decode_mode for ASTC decompression

OpenGL ES optimizations (if Vulkan unavailable):
├── Vertex Buffer Objects (VBO) for all geometry
├── Framebuffer Objects (FBO) for offscreen rendering
├── Instanced rendering via glDrawElementsInstanced
└── ETC2 texture compression for broad Android compatibility
```

## VR-Specific Optimization

### Dual-Eye Rendering

```
VR renders two views (left eye, right eye) per frame:

Single-pass rendering (recommended):
├── Render both eyes in one pass
├── Use instanced stereo or multi-view extension
├── Double vertex processing throughput
├── Doubled geometry (two viewpoints)
└── Metal: MTLMultiviewPassDescriptor
    ├── viewCount = 2
    ├── viewMask = [0x1, 0x2]
    └── Instance ID → view index mapping

Multi-view (Vulkan / OpenGL ES):
├── VK_KHR_multiview / GL_OVR_multiview2
├── Shader uses gl_ViewID to determine eye
├── Geometry processed once per eye
├── Texture arrays per eye
└── Reduces CPU draw calls by ~40-50% compared to two pass
```

### VR Frame Timing

```
72fps target: 13.9ms per frame
├── CPU: 6ms
├── GPU: 6ms
└── Safety: 1.9ms

90fps target: 11.1ms per frame
├── CPU: 5ms
├── GPU: 5ms
└── Safety: 1.1ms

Late latching: update head pose within 1ms of display refresh
├── Reduces motion-to-photon latency
├── Asynchronous timewarp: reproject last frame based on latest head pose
└── Available in: Apple Vision Pro, Meta Quest SDK
```

### Render Resolution

```
VR typically renders at higher resolution than display due to lens distortion:

├── Panel resolution: 1920x1080 per eye (Quest 2)
├── Render resolution: 2048x1536 per eye (Quest 2, 1.3x scale)
├── Lens correction: barrel distortion in post-process
├── Fixed foveated rendering: lower resolution at periphery
├── Eye-tracked foveated rendering: lower resolution away from gaze point
└── Avoid: MSAA 4x. Use MSAA 2x or temporal anti-aliasing (TAA)
```

## Profiling and Debugging

### Xcode Instruments (iOS)

```
Use the following instrument set for AR/VR profiling:

1. Metal System Trace
   ├── CPU utilization per core
   ├── GPU utilization
   ├── Command buffer scheduling
   └── Frame time breakdown

2. Core Animation
   ├── Frame rate
   ├── Commit time
   └── Render server time

3. ARKit Trace
   ├── Tracking state
   ├── Anchor count
   └── Frame processing time

4. Energy Log
   ├── Battery drain per component
   ├── Average power (mW)
   └── Thermal state
```

### Android GPU Inspector (Android)

```
1. System Profile
   ├── CPU frequency and utilization
   ├── GPU frequency and utilization
   ├── Memory bandwidth
   └── Thermal throttling

2. Frame Analysis
   ├── Per-frame breakdown
   ├── Shader execution time
   ├── Vertex processing time
   └── Render pass timing

3. Vulkan API Trace
   ├── Pipeline barriers
   ├── Descriptor set binding
   ├── Command buffer submission
   └── Memory allocation
```

### Unity Profiler (Cross-Platform)

```
1. Rendering Profiler
   ├── Batches (target <100)
   ├── SetPass calls (target <20)
   ├── Triangles (target <300k)
   ├── Vertices (target <200k)
   └── Texture memory (target <200MB)

2. CPU Profiler
   ├── Scripts
   ├── Physics
   ├── Animation
   ├── Rendering
   └── VSync

3. Memory Profiler
   ├── Total allocated
   ├── Texture memory
   ├── Mesh memory
   ├── Animation memory
   └── Audio memory
```

### Manual Performance Checks

```
Quick performance checklist:

1. Visual check: Is frame rate smooth? Any stutter?
2. Device temperature: Hot to touch? → thermal throttle
3. Battery drain: >10% in 10 minutes? → excessive
4. Frame timing: >16ms per frame? → budget overflow
5. Draw calls: >100? → batch more aggressively
6. Texture memory: >200MB? → compress or reduce resolution
7. Polygon counts: >300k total? → LOD or cull
8. Shader complexity: >64 ALU ops? → simplify
9. Overdraw: >3x average? → order or cull
10. Memory: >500MB total? → stream or evict
```

## Common Performance Issues

### Issue 1: Frame Stutter on Session Start

**Cause**: Loading and decompressing 3D models synchronously
**Fix**: Load models asynchronously with loading screen, use progressive loading

### Issue 2: Frame Drops When Anchors Are Added

**Cause**: ARKit/ARCore reprocesses environmental understanding
**Fix**: Add anchors after a short delay (0.5-1s between additions), limit to 50 active anchors

### Issue 3: High GPU Utilization in Lighting

**Cause**: Per-pixel dynamic lighting with multiple lights
**Fix**: Single directional light with baked ambient + IBL (cubemap) instead of multiple dynamic lights

### Issue 4: Long Load Times

**Cause**: Uncompressed 3D models, no streaming, blocking main thread
**Fix**: Draco-compressed glTF, asset bundle streaming, loading on background threads

### Issue 5: Battery Overheating

**Cause**: Sustained high GPU/CPU usage without thermal management
**Fix**: Reduce graphics quality after 10 minutes, lower render scale when battery <20%, cap frame rate

### Issue 6: Memory Warning / Crash

**Cause**: All assets loaded at once, textures never unloaded
**Fix**: Implement LRU cache for models/textures, streaming asset manager

## Performance Testing

### Test Conditions

```
Run performance tests under these conditions:

Lighting conditions:
├── Bright sunlight (outdoor): camera gain high, tracking may degrade
├── Dim interior: lower light → more camera noise → tracking artifacts
└── Dark room: tracking failure likely, test recovery flow

Surface conditions:
├── Textured surfaces (carpet, wood): best tracking
├── Plain surfaces (white wall): tracking may drift
├── Reflective surfaces (glass, mirror): phantom plane detections
└── Moving surfaces (water, grass): ignore, track solid surfaces

Motion conditions:
├── Slow walk: typical AR usage
├── Fast movement / rotation: stress test for tracking smoothness
└── Static: device on tripod, minimal motion → best performance baseline

Device conditions:
├── Battery 100%: full performance
├── Battery 20%: thermal management may reduce performance
└── After 30 minutes of usage: thermal throttle likely active
```

### Automated Performance Testing

```
Suggested metrics to capture per test run:

Metric data:
├── FPS: min, max, average, P1, P5, P50, P95, P99
├── Frame time: min, max, average
├── CPU time: average per frame
├── GPU time: average per frame
├── Memory: peak, average, min free
├── Draw calls: average per frame
├── Triangles: average per frame
├── Battery drain: percentage per 10 minutes
└── Temperature: peak device temperature

Reporting format:
[Test: ARCore Plane Detection - Outdoor]
Performance Summary:
  P50 FPS: 58.2 | P95 FPS: 54.1 | P99 FPS: 48.3
  Avg frame time: 17.2ms
  Avg CPU: 8.1ms | Avg GPU: 7.9ms
  Peak memory: 412MB | Avg memory: 389MB
  Avg draw calls: 87
  Battery drain: 4.2% per 10 min
  Peak temp: 39.2°C
Status: PASS (all metrics within budget)
```

## Conclusion

AR/VR rendering performance depends on tight budget management across CPU, GPU, memory, and thermal domains. Key takeaways:

1. Always set explicit performance budgets before development
2. Use compressed 3D formats (glTF Draco or USDZ) in production
3. Generate LODs for all models (minimum 3 levels)
4. Implement occlusion culling (frustum + Hi-Z)
5. Prefer forward rendering with a single dynamic light
6. Use ASTC compression for all textures
7. Batch draw calls via GPU instancing
8. Profile on real devices under realistic conditions
9. Implement thermal-aware quality reduction
10. Use single-pass rendering for VR dual eyes

## References

- Apple ARKit Performance Guide: `developer.apple.com/documentation/arkit/arframe`
- Android ARCore Performance: `developers.google.com/ar/develop/fundamentals`
- Metal Performance Optimization: `developer.apple.com/metal/performance`
- Vulkan Mobile Best Practices: `arm-software.github.io/vulkan_best_practice_for_mobile_developers`
- Unity AR Foundation Optimization: `docs.unity3d.com/Manual/ARPerformance`
- GPU Gems: Mobile Rendering: `developer.nvidia.com/gpugems/gpugems3`
