# Vulkan Rendering API

## 1. Skill Context
**Focus**: Low-level GPU programming. Unlike OpenGL (which hides complexity in the driver), Vulkan forces the developer to manually manage memory and GPU synchronization to achieve maximum performance.
**Triggers**: vulkan, graphics-api, directx-12, command-buffers, shaders, ray-tracing.

## 2. Core Architecture vs OpenGL
- **OpenGL**: Has a massive, hidden state machine in the GPU driver. When you call `glDrawArrays`, the CPU burns cycles guessing what state the GPU needs.
- **Vulkan**: Explicit. You pre-bake the entire GPU state (Shaders, Blending, Depth Testing) into a monolithic **Graphics Pipeline Object**. Switching pipelines is fast and predictable.

## 3. The Command Buffer Model
Vulkan is designed for Multi-Core CPUs (unlike OpenGL which is heavily single-threaded).
- Threads on the CPU can independently record rendering commands into **Command Buffers**.
- Once recorded, these buffers are submitted to a **Command Queue** on the GPU in a single batch.

## 4. Hardware Ray Tracing (Vulkan RT)
Vulkan natively supports hardware-accelerated Ray Tracing via extensions.
- **BVH (Bounding Volume Hierarchy)**: The data structure sent to the GPU to calculate light intersections.
- **Shaders**: Requires specialized shader stages: `RayGen` (fires the rays), `ClosestHit` (what color to paint when it hits), and `Miss` (skybox).
