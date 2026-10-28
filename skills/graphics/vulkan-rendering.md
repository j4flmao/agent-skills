# Vulkan Rendering API

## 1. Skill Context
**Focus**: Explicit, low-overhead GPU programming. In OpenGL the driver tracks state, validates, and synchronizes implicitly. In Vulkan the application manages pipelines, memory, and synchronization itself.
**Triggers**: vulkan, graphics-api, directx-12, command-buffers, shaders, ray-tracing.
**Deep dive**: `skills/game/game-development/vulkan/SKILL.md`, `skills/game/game-engine/render-graph/SKILL.md`.

## 2. Core Architecture vs OpenGL
- **OpenGL**: A global state machine. The driver validates state and may compile shader variants lazily at draw time, which costs CPU time and causes hitches.
- **Vulkan**: Shaders and most fixed-function state (blend, depth, raster, vertex layout) are baked into **pipeline objects** created up front.
  - Pipeline creation is expensive: build pipelines at load time and keep a `VkPipelineCache`.
  - Binding a pipeline is cheap but not free: sort draws to minimize switches.
  - Dynamic state (and `VK_EXT_extended_dynamic_state`) reduces the number of pipeline permutations.
- **Validation**: The driver does almost no error checking. Always develop with the Khronos validation layer enabled.

## 3. The Command Buffer Model
- Multiple CPU threads record **command buffers** in parallel. Each thread uses its own `VkCommandPool` (pools are not thread-safe).
- Recorded buffers are submitted to a `VkQueue` (`vkQueueSubmit2` with Vulkan 1.3 synchronization2). Submission is relatively costly, so batch several command buffers per submit.
- **Synchronization is your job**:
  - Pipeline barriers order work and transition image layouts within a queue.
  - Semaphores order work between queues and the swapchain.
  - Fences let the CPU wait on the GPU.
  - Use frames-in-flight (typically 2) with one fence per frame.
- Use these Vulkan 1.3 core features by default: dynamic rendering (no `VkRenderPass`/framebuffer objects), synchronization2, timeline semaphores.

## 4. Memory
- Allocate a few large `VkDeviceMemory` blocks and sub-allocate from them; use Vulkan Memory Allocator (VMA) instead of one allocation per resource. `maxMemoryAllocationCount` can be as low as 4096.
- Upload through staging buffers into device-local memory, or use host-visible device-local memory (ReBAR) where available.

## 5. Hardware Ray Tracing (`VK_KHR_acceleration_structure`, `VK_KHR_ray_tracing_pipeline`)
- **Acceleration structures**: Bottom-level (BLAS, geometry) and top-level (TLAS, instances) structures are built **on the GPU** with `vkCmdBuildAccelerationStructuresKHR`. Their internal layout (typically a BVH) is implementation-defined.
- **Shader stages**: ray generation, closest-hit, any-hit (alpha testing), miss, intersection (custom primitives), and callable. A shader binding table wires them together.
- **Simpler path**: `VK_KHR_ray_query` lets ordinary fragment/compute shaders trace rays (shadows, ambient occlusion) without a full ray-tracing pipeline.
