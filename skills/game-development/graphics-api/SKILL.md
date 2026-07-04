---
name: graphics-api
description: >
  Comprehensive guide to modern Graphics Pipelines and APIs.
  Covers Vulkan, DirectX 12, Metal, and advanced GPU compute integration.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags:
  - graphics
  - vulkan
  - dx12
  - rendering
---

# Graphics API Engineering

## Purpose
The primary purpose of this skill is to provide comprehensive, production-grade architectural and implementation guidance for modern explicit graphics APIs (Vulkan, DirectX 12, Metal, OpenGL). This encompasses explicit state management, multithreaded command recording, explicit synchronization (barriers, fences, semaphores), pipeline state object (PSO) compilation, memory aliasing, bindless resources, and advanced shader development (HLSL, GLSL, MSL). By standardizing the approach to low-level GPU programming, this skill enables highly performant rendering engines, mitigating driver overhead and reducing API abstraction costs across desktop, console, and mobile ecosystems. We prioritize architectures that minimize CPU wait states and maximize GPU saturation.

## Core Principles
1. **Explicit Synchronization and Dependencies**: Never rely on implicit driver magic for memory hazard tracking. Use pipeline barriers, memory barriers, render passes, and subpass dependencies to ensure cache coherency and execution ordering.
2. **Precompiled State Validation**: Treat all GPU pipeline states (PSO) as immutable, monolithic objects that must be hashed, precompiled, and cached offline or during early load stages to prevent runtime stuttering.
3. **Data-Oriented Memory Management**: Utilize explicit memory allocators (like VMA or D3D12MA). Pool allocations, utilize memory aliasing for transient render targets, and manage defragmentation manually. Avoid creating resources on-the-fly during active rendering.
4. **Bindless Resource Architecture**: Rely on descriptor indexing, dynamic resource indexing, and array-of-textures to decouple CPU-side descriptor binding from GPU-side shader execution, maximizing command buffer reusability and reducing CPU overhead.
5. **Multithreaded Command Generation**: Submit work from multiple CPU cores simultaneously by distributing scene traversal and command buffer recording across worker threads, utilizing secondary command buffers or bundled commands.

## Agent Protocol

**Triggers**: 
- `init_graphics_backend`: When tasked with bootstrapping a renderer.
- `optimize_pso_cache`: When tasked with resolving stuttering.
- `debug_gpu_hang`: When diagnosing TDRs or device lost events.
- `implement_bindless`: When restructuring resource binding arrays.
- `profile_gpu_memory`: When investigating video memory leaks or bloat.

**Input Context Required**:
- Backend Target: [Vulkan | DX12 | Metal]
- Shader Language: [GLSL | HLSL | MSL | Slang]
- Platform constraints (Memory size, Mobile vs Desktop).
- Existing Pipeline Configuration.

**Output Artifact**:
- Refactored C++ rendering structures.
- Optimized Shader pipelines.
- FrameGraph configurations.
- Memory allocation schemas.

**Response Formats**:
```json
{
  "api": "Vulkan",
  "operation": "PipelineCreation",
  "result": {
    "psoHash": "0xDEADBEEF12345678",
    "status": "SUCCESS",
    "compilationTimeMs": 14.5
  },
  "warnings": [
    "Derivative operations may be unstable in control flow"
  ]
}
```

## Decision Matrix

```text
Are you targeting multiple modern platforms?
       |
       +--> [Yes] --> Is team experienced with explicit APIs?
       |                 |
       |                 +--> [Yes] --> Choose Vulkan / WebGPU
       |                 |                 (Maximum Control)
       |                 |
       |                 +--> [No] --> Choose Abstraction (BGFX / Diligent)
       |                                   (Faster Time to Market)
       |
       +--> [No] --> Platform?
                     |
                     +--> [Windows/Xbox] --> Choose DirectX 12
                     |                       (Direct Storage, Ultimate)
                     |
                     +--> [Apple Ecosystem] --> Choose Metal
                     |                          (Unified Memory Architecture)
                     |
                     +--> [Legacy] --> Choose OpenGL
                                       (Maximum Compatibility)
```

## Detailed Architectural Overview

### FrameGraph Architecture Diagram
```text
+-------------------------------------------------------------+
|                     Frame Definition                        |
|  +-----------------+  +-----------------+  +-------------+  |
|  | Geometry Pass   |  | Lighting Pass   |  | Post Process|  |
|  | Inputs: VBs,IBs |->| Inputs: GBuffer |->| Inputs: HDR |  |
|  | Outputs: GBuffer|  | Outputs: HDR Tex|  | Outputs: LDR|  |
|  +-----------------+  +-----------------+  +-------------+  |
+-------------------------------------------------------------+
                            |
                     (Compilation)
                            v
+-------------------------------------------------------------+
|                Transient Memory Allocator                   |
| Allocates aliased memory for GBuffer, HDR, LDR buffers      |
| Maps overlapping lifespans to identical VRAM pages          |
+-------------------------------------------------------------+
                            |
                     (Execution)
                            v
+-------------------------------------------------------------+
|                Command List Submission                      |
| (Graphics Queue, Compute Queue, Copy/Transfer Queue)        |
+-------------------------------------------------------------+
                            |
                     (Presentation)
                            v
+-------------------------------------------------------------+
|                Swapchain Display Engine                     |
+-------------------------------------------------------------+
```

### Lifecycle Diagram
```text
[Engine Init] -> [Device/Instance Creation] -> [Memory Allocator Init]
                                                        |
                                                        v
[Shutdown] <- [Device Teardown] <- [Swapchain Present] <- [Frame Render]
```

## Workflow Steps

### Phase 1: Instance and Device Bootstrapping
1. Enable Validation Layers (Vulkan) or Debug Layer (DX12) in debug builds.
2. Query physical devices for required extensions (e.g., ray tracing, bindless).
3. Create logical device and establish command queues (Graphics, Compute, Transfer).
4. Initialize the Swapchain and surface presentation capabilities.

### Phase 2: Memory and Resource Management
1. Initialize the Memory Allocator (VMA/D3D12MA).
2. Create staging buffers for CPU-to-GPU uploads.
3. Pre-allocate descriptor heaps and layout structures.
4. Establish a bindless index registry.

### Phase 3: Pipeline and Shader Compilation
1. Compile shader source (GLSL/HLSL) to intermediate representation (SPIR-V/DXIL) via offline compilers (glslang, DXC).
2. Reflect shader metadata to generate pipeline layouts automatically.
3. Hash rasterization, blend, and depth-stencil states.
4. Compile Pipeline State Objects (PSOs) asynchronously.

### Phase 4: Frame Graph Construction
1. Declare render passes and their input/output resource dependencies.
2. Calculate lifetime scopes for transient resources.
3. Inject automatic Resource Barriers / Pipeline Barriers at pass boundaries.
4. Compile the Frame Graph into an executable task list.

### Phase 5: Command Recording and Submission
1. Acquire the next Swapchain image.
2. Dispatch render passes across CPU worker threads (Secondary Command Buffers).
3. Gather and execute command buffers on the primary Graphics Queue.
4. Submit with proper Semaphore dependencies (Wait on Image Available, Signal Render Finished).

### Phase 6: Presentation and Teardown
1. Submit Present request to the presentation engine.
2. Ensure CPU is not getting too far ahead by waiting on Fences (max frames in flight).
3. Handle window resizing and swapchain recreation events gracefully.
4. Ensure GPU is idle before destroying any resources during teardown.

## Extended Troubleshooting Guide

| Symptom | Primary Cause | Mitigation Action |
|---------|---------------|-------------------|
| Validation Layer Spam | Incorrect image layout transition | Fix subpass dependencies or insert explicit pipeline barrier. |
| GPU Hang / TDR | Infinite shader loop or uninitialized memory read | Use Nsight / PIX to trace shader execution; add timeout detection. |
| Stuttering on first frame | Runtime PSO compilation | Implement PSO caching; compile heavily used pipelines during loading. |
| Memory leak | Failure to free VMA allocations or descriptor pools | Profile memory with VMA dumps; ensure garbage collection on frame completion. |
| Flickering geometry | Z-fighting or missing depth buffer barrier | Check projection matrix near/far planes; verify depth write/read barriers. |
| Black screen | Swapchain format mismatch or missing present semaphore | Verify format (sRGB vs UNORM); check semaphore wait masks on present queue. |
| Access Violation (CPU) | Mapping unmapped GPU memory | Ensure staging buffers are created with HOST_VISIBLE and HOST_COHERENT flags. |
| Artifacts / Corrupted Tex | Memory aliasing overlap without barriers | Ensure aliased resources have proper transition barriers before reuse. |
| Low GPU Utilization | CPU bottleneck in command recording | Move to multithreaded command recording and secondary command buffers. |

## Complete Execution Scenario

```text
[Start Frame]
      |
      v
(Acquire Image) ---> WAIT_FENCE(Frame In Flight)
      |
      v
(Update Uniforms) -> Copy camera matrices to mapped buffer.
                     Update per-frame descriptor arrays.
      |
      v
(Record Commands)
  |-> Set PSO
  |-> Bind Bindless Descriptor Set
  |-> Set Viewport / Scissor
  |-> Push Constants (Local Model Matrix)
  |-> Draw Indexed (1000s of objects via indirect draw)
      |
      v
(Submit) ----------> Signal Render Semaphore
      |
      v
(Present) ---------> Wait on Render Semaphore -> Show on Screen
```

## Rules and Guidelines
1. Always validate your code using the backend-specific debug tools (RenderDoc, PIX, Nsight) before pushing.
2. Treat the GPU as an asynchronous coprocessor; minimize synchronization points that stall the CPU.
3. Structure your rendering code in a data-oriented way to optimize cache hits for uniform/instance updates.
4. Fail fast on Device Lost events: implement robust recovery mechanisms or cleanly crash and log the breadcrumbs.
5. Abstract the backend APIs (Vulkan/DX12) behind a unified Render Hardware Interface (RHI) to prevent logic bleeding into gameplay code.

## Reference Guides
- [Architecture Patterns](references/architecture-patterns.md)
- [State Management](references/state-management.md)
- [Performance Optimization](references/performance-optimization.md)
- [Security Best Practices](references/security-best-practices.md)
- [Testing Strategies](references/testing-strategies.md)
- [Deployment Pipelines](references/deployment-pipelines.md)
- [Error Handling](references/error-handling.md)
- [Code Organization](references/code-organization.md)

## Handoff
- When writing shader code, hand off to the [shader-programming](../shader-programming/SKILL.md) skill.
- When organizing massive worlds, refer to the [scene-graph](../scene-graph/SKILL.md) skill.
- For profiling and optimization across multiple cores, consult the [cpu-multithreading](../../performance/multithreading/SKILL.md) skill.
- For memory allocation issues, refer to the [memory-management](../../performance/memory-management/SKILL.md) skill.

<!-- COMPRESSION_FOOTER: {"skill":"graphics-api","validated":true,"references_linked":8,"version":"2.0.0"} -->
