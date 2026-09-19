---
title: Vulkan Synchronization Deep Dive
description: The complete guide to Vulkan synchronization - barriers, fences, semaphores, timeline semaphores, events, and common pitfalls.
---

# Vulkan Synchronization — Deep Reference

## 1. The Four Synchronization Domains

| Concept | Syncs | Example |
|---------|-------|---------|
| **Execution dependency** | Ordering of GPU work | draw A before draw B |
| **Memory dependency** | Visibility of writes | image written then read |
| **Queue submission** | Cross-queue ordering | graphics -> present |
| **Host<->Device** | CPU waits / signals | frame completion |

## 2. Fences (Host <-> GPU)

Used to know when GPU work *finished* from the CPU side:

```cpp
VkFenceCreateInfo fci{}; fci.sType = VK_STRUCTURE_TYPE_FENCE_CREATE_INFO;
vkCreateFence(device, &fci, nullptr, &fence);

// submit with a fence
vkQueueSubmit(queue, 1, &submitInfo, fence);
// wait for completion on CPU
vkWaitForFences(device, 1, &fence, VK_TRUE, UINT64_MAX);
```

### Fence Rules

- **Fences signal** when *all* work of that submit completes.
- **Reset before each reuse**: `vkResetFences`.
- Fences are NOT needed if you write the same buffer every frame and know previous frame is done via ring index.
- Use one fence (or one per swapchain image) in the classic frame loop.

## 3. Semaphores (GPU <-> GPU)

Order execution between different queue submissions *on the same timeline on GPU*:

```cpp
// Wait: any work on graphicsQueue will not start until acquire is done
VkSubmitInfo si{};
VkPipelineStageFlags waitStage = VK_PIPELINE_STAGE_COLOR_ATTACHMENT_OUTPUT_BIT;
si.pWaitSemaphores = &imageAvailable;     // acquired image ready
si.pWaitDstStageMask = &waitStage;
si.pSignalSemaphores = &renderFinished;   // rendering done before present

vkQueueSubmit(graphicsQueue, 1, &si, VK_NULL_HANDLE);
vkQueuePresentKHR(graphicsQueue, &presentInfo);   // waits renderFinished
```

### Semaphore Scopes

| Type | Use |
|------|-----|
| Binary semaphore | signal once per submit, 0/1 state |
| Timeline semaphore | monotonic counter, cross-frame ordering, no per-frame realloc |

Timeline semaphores (core in Vulkan 1.2) replace the "one semaphore per frame" juggling:

```cpp
VkSemaphoreTypeCreateInfo tci{ VK_SEMAPHORE_TYPE_TIMELINE };
// signal at value N on the GPU; CPU can waitValue on it
```

## 4. Pipeline Barriers (Memory + Execution)

A barrier inserts an execution + memory dependency between stages *within a command buffer*:

```cpp
vkCmdPipelineBarrier(cmd,
    VK_PIPELINE_STAGE_FRAGMENT_SHADER_BIT,   // srcStageMask (producer)
    VK_PIPELINE_STAGE_VERTEX_SHADER_BIT,     // dstStageMask (consumer)
    0,
    0, nullptr,               // memory barriers
    0, nullptr,               // buffer memory barriers
    1, &imageBarrier);        // image memory barriers
```

`srcAccessMask`/`dstAccessMask` must encircle the actual access. A common failure is a "half-barrier": ordering execution but forgetting the memory (`HOST_WRITE | HOST_READ`) availability/visibility, causing stale reads.

### Image Layout Transition Halftable

| From \ To | Undefined | Transfer | Shader Read | Color Attach | Present |
|-----------|-----------|----------|-------------|--------------|---------|
| Undefined | - | (discard) | use `SRC_ACCESS_NONE` | clear, then `COLOR_ATTACHMENT_WRITE` | (not valid) |
| Transfer | (discard) | - | `TRANSFER_WRITE -> SHADER_READ` | `TRANSFER_WRITE -> COLOR_WRITE` | - |
| Shader Read | - | `SHADER_READ -> TRANSFER_WRITE` | - | `SHADER_READ -> COLOR_WRITE` | - |
| Color Attach | - | `COLOR_WRITE -> TRANSFER_READ` | `COLOR_WRITE -> SHADER_READ` | - | `COLOR_WRITE -> present` |

**Full->Empty** rule: use `VK_IMAGE_LAYOUT_UNDEFINED` as oldLayout for a fresh overwrite (skips the expensive barrier's memory dependency).

## 5. Events (In-Batch, GPU-Only)

For coarse synchronization within one command buffer (e.g., wait for an entire pass to a certain stage):

```cpp
vkCmdSetEvent(cmd, event, VK_PIPELINE_STAGE_COMPUTE_SHADER_BIT);
// ... many draws ...
vkCmdWaitEvents(cmd, 1, &event,
    VK_PIPELINE_STAGE_COMPUTE_SHADER_BIT,
    VK_PIPELINE_STAGE_FRAGMENT_SHADER_BIT,
    ...);
```

Usually barriers suffice; events buy flexibility when you must wait *only if* the producer actually ran.

## 6. Frame-in-Flight (Double/Triple Buffering)

```cpp
constexpr uint32_t FRAMES_IN_FLIGHT = 2;
struct FrameResources {
    VkCommandBuffer cmd;
    VkSemaphore imageAvailable, renderFinished;
    VkFence fence;
};
FrameResources frames[FRAMES_IN_FLIGHT];
uint32_t frameIndex = 0;

// per frame:
FrameResources& fr = frames[frameIndex];
vkWaitForFences(device, 1, &fr.fence, VK_TRUE, UINT64_MAX);
vkResetFences(device, 1, &fr.fence);
vkAcquireNextImageKHR(device, swapchain, UINT64_MAX, fr.imageAvailable, VK_NULL_HANDLE, &imageIdx);
// record + submit with fr.imageAvailable / fr.renderFinished
// present
frameIndex = (frameIndex + 1) % FRAMES_IN_FLIGHT;
```

The fence ensures the previous use of this frame's command buffer / uniform buffers is done before re-record.

## 7. Multi-Queue Synchronization

Different queues overlap freely; you must connect them with semaphores:

```
Graphics queue writes an offscreen image.
Transfer/compute queue reads it -> wait with semaphore signaled by graphics.
```

```cpp
// graphics queue submit signals computeReady
// compute queue submit waits computeReady before dispatching
```

Rule: never rely on queue submission order; always use explicit semaphores across queues.

## 8. Common Synchronization Bugs

| Bug | Symptom | Cause |
|-----|---------|-------|
| Missing memory barrier | Random artifacts (sometimes) | synchronization of access masks |
| Barrier on wrong stage | Black screen / flicker | dstStageMask too late |
| Content stored but never available | Input claimed ready, but read garbage | Half-barrier |
| `waitIdle` every frame | Massive CPU-GPU stalls | Over-sync |
| Reusing command buffer while GPU active | Corruption / validation error | Forgot fence wait |
| Semaphore reused before signal | Deadlock | Multiple signals on same binary semaphore |
| Present queue not same as graphics | Present before draw done | signalled semaphore between queues |

## 9. Debugging Sync

1. Enable validation layers — Khronos validator catches most ordering bugs.
2. Use RenderDoc to inspect GPU timeline and detect bubbles.
3. Use `vk_sync` / VMA's synchronization helpers to model dependencies.
4. Profiling: look for pipeline bubbles in GPU timeline (idle gaps between passes).

## 10. Rules for Sync Code

1. One "frame resources" struct per swapchain image; fields documented.
2. Name semaphores descriptively (`imageAvailable`, `renderFinished`, `computeReady`).
3. Document every barrier: source, destination, layout, access.
4. Never submit work that depends on prior work without a dependency.
5. In debug, assert every `vkQueueSubmit`'s wait stages are before the destination stage.

## References

- Khronos Vulkan spec: ch 7.2 (queue operation), 7.7 (synchronization and caches)
- Vulkan Tutorial (vulkan-tutorial.com) synchronization chapter
- Sauermann "Vulkan synchronization" (GDC talk)