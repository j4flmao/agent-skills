---
name: vulkan
description: >
  Use this skill when the user says 'vulkan', 'vkQueueSubmit', 'swapchain', 'render pass', 'dynamic rendering', 'pipeline barrier', 'synchronization2', 'descriptor sets', 'VMA', 'vulkan validation'. Guides explicit Vulkan rendering: instance/device setup, swapchain, dynamic rendering and render passes, pipelines, command buffers, synchronization, memory and compute/ray tracing. Do NOT use for: engine-agnostic frame-graph design (use render-graph), DirectX 12 or Metal specifics, shader art.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [game, vulkan, gpu, rendering, graphics]
---

# Vulkan Deep Engineering Guide

## Purpose
Vulkan is a low-overhead, explicit GPU API. It gives fine control over every GPU step: no hidden state, no driver magic, no automatic synchronization. Performance is yours to manage - and so is every bug that comes with it.

## Agent Protocol

### Trigger
"vulkan", "vkQueueSubmit", "swapchain", "render pass", "dynamic rendering", "pipeline barrier", "synchronization2", "descriptor sets", "VMA", "vulkan validation".

### Input Context
- Vulkan API version and required extensions
- Target GPUs/platforms (desktop, Android, MoltenVK)
- Validation layer output if debugging

### Output Artifact
C/C++ Vulkan code and a synchronization explanation. No file unless requested.

### Response Format
```
API: Vulkan {1.x} + {extensions}
Stage: {setup | swapchain | record | sync | memory}
Code: {snippet}
Sync: {src stage/access -> dst stage/access}
Validation: {clean | messages}
```

## 1. Vulkan & The Explicit Model

### 1.1 Explicit vs Implicit (OpenGL/WebGL)

| Aspect | OpenGL | Vulkan |
|--------|--------|--------|
| State | Hidden global state machine | Everything explicit (pipeline state objects) |
| Threads | Single-threaded context | Record command buffers on any thread |
| Synchronization | Driver syncs | **You** place barriers/fences/semaphores |
| Memory | Driver allocates VRAM | **You** allocate `VkDeviceMemory` |
| Validation | Undefined behavior | Validation layers in debug builds |
| Errors | Some checks | `vkGetDeviceProcAddr` + validation callbacks |

### 1.2 The GPU Pipeline (Conceptual)

```
CommandBuffer (CPU records) -> Submit to Queue -> GPU executes -> Swapchain present
```

### 1.3 When to Use Vulkan

- Building a custom engine or renderer where OpenGL/WebGL abstraction is too slow.
- You need access to compute shaders, mesh shaders, ray tracing, async compute.
- Target PC/console/mobile where very low overhead matters.
- Portability across Windows/Linux/Android/macOS via the same API.

## 2. Initialization: Instance -> Device -> Queue

### 2.1 Instance

```cpp
VkApplicationInfo app{};
app.sType = VK_STRUCTURE_TYPE_APPLICATION_INFO;
app.apiVersion = VK_API_VERSION_1_3;   // highest version you use; 1.4 where available

VkInstanceCreateInfo ci{};
ci.sType = VK_STRUCTURE_TYPE_INSTANCE_CREATE_INFO;
ci.pApplicationInfo = &app;
ci.enabledLayerCount = (uint32_t)debugLayers.size();      // "VK_LAYER_KHRONOS_validation"
ci.ppEnabledLayerNames = debugLayers.data();
ci.enabledExtensionCount = (uint32_t)instanceExtensions.size();
ci.ppEnabledExtensionNames = instanceExtensions.data();

VkInstance instance;
vkCreateInstance(&ci, nullptr, &instance);
```

Required instance extensions: `VK_KHR_surface` (swapchain present), `VK_EXT_debug_utils` (debug callbacks). For windowing you also need the platform surface extension (`VK_KHR_win32_surface`, `VK_KHR_xcb_surface`, etc.).

### 2.2 Physical Device (GPU Selection)

```cpp
uint32_t count = 0;
vkEnumeratePhysicalDevices(instance, &count, nullptr);
std::vector<VkPhysicalDevice> devices(count);
vkEnumeratePhysicalDevices(instance, &count, devices.data());

for (VkPhysicalDevice dev : devices) {
    VkPhysicalDeviceProperties props;
    vkGetPhysicalDeviceProperties(dev, &props);
    // score by: VK_PHYSICAL_DEVICE_TYPE_DISCRETE_GPU, queue family support,
    // feature support (geometryShader, tessellationShader, rayTracingPipeline)
}
```

### 2.3 Queue Families

A GPU exposes queue families (graphics, compute, transfer, present):

```cpp
uint32_t familyCount = 0;
vkGetPhysicalDeviceQueueFamilyProperties(physDev, &familyCount, nullptr);
std::vector<VkQueueFamilyProperties> families(familyCount);
vkGetPhysicalDeviceQueueFamilyProperties(physDev, &familyCount, families.data());

int gfxFamily = -1, computeFamily = -1, presentFamily = -1;
for (uint32_t i = 0; i < families.size(); ++i) {
    if (families[i].queueFlags & VK_QUEUE_GRAPHICS_BIT) gfxFamily = i;
    if (families[i].queueFlags & VK_QUEUE_COMPUTE_BIT)  computeFamily = i;
    // presentFamily: vkGetPhysicalDeviceSurfaceSupportKHR(dev, i, surface, &supported)
}
```

### 2.4 Logical Device

```cpp
VkDeviceCreateInfo dci{};
dci.sType = VK_STRUCTURE_TYPE_DEVICE_CREATE_INFO;
dci.queueCreateInfoCount = 1;
dci.pQueueCreateInfos = &queueCreateInfo;   // { familyIndex = gfxFamily, queueCount = 1 }
dci.enabledExtensionCount = (uint32_t)deviceExtensions.size();
dci.ppEnabledExtensionNames = deviceExtensions.data();
// deviceExtensions: VK_KHR_swapchain, optional: VK_KHR_ray_tracing_pipeline,
// VK_EXT_descriptor_indexing, VK_KHR_buffer_device_address

VkDevice device;
vkCreateDevice(physDev, &dci, nullptr, &device);
vkGetDeviceQueue(device, gfxFamily, 0, &graphicsQueue);
```

### 2.5 Validation Layers

```cpp
if (enableValidation) {
    layers.emplace_back("VK_LAYER_KHRONOS_validation");
    VkDebugUtilsMessengerCreateInfoEXT msgCI{};
    msgCI.messageSeverity = VK_DEBUG_UTILS_MESSAGE_SEVERITY_ERROR_BIT_EXT
                          | VK_DEBUG_UTILS_MESSAGE_SEVERITY_WARNING_BIT_EXT;
    msgCI.pfnUserCallback = debugCallback;
    // chain msgCI into VkInstanceCreateInfo::pNext to also catch create/destroy messages,
    // then create the persistent messenger with vkCreateDebugUtilsMessengerEXT.
    // Device layers are deprecated: enable layers on the instance only.
}
```

## 3. The Swapchain

### 3.1 Create

```cpp
VkSwapchainCreateInfoKHR sci{};
sci.sType = VK_STRUCTURE_TYPE_SWAPCHAIN_CREATE_INFO_KHR;
sci.surface = surface;
sci.minImageCount = std::min(caps.minImageCount + 1,                 // caps from
    caps.maxImageCount ? caps.maxImageCount : UINT32_MAX);           // vkGetPhysicalDeviceSurfaceCapabilitiesKHR
sci.imageFormat = VK_FORMAT_B8G8R8A8_SRGB;      // pick from vkGetPhysicalDeviceSurfaceFormatsKHR
sci.imageColorSpace = VK_COLOR_SPACE_SRGB_NONLINEAR_KHR;
sci.imageExtent = caps.currentExtent;            // or clamp the window size if currentExtent is 0xFFFFFFFF
sci.imageArrayLayers = 1;
sci.imageUsage = VK_IMAGE_USAGE_COLOR_ATTACHMENT_BIT;
sci.preTransform = caps.currentTransform;        // on Android, handle rotation yourself for best performance
sci.compositeAlpha = VK_COMPOSITE_ALPHA_OPAQUE_BIT_KHR;
sci.presentMode = VK_PRESENT_MODE_FIFO_KHR;    // vsync
sci.clipped = VK_TRUE;

VkSwapchainKHR swapchain;
vkCreateSwapchainKHR(device, &sci, nullptr, &swapchain);
// Get images: vkGetSwapchainImagesKHR(device, swapchain, &count, nullptr);
```

### 3.2 Present Modes

| Mode | Description | Use case |
|------|-------------|----------|
| `FIFO` | Vsync queue; the only mode every implementation must support | Default, mobile (power) |
| `MAILBOX` | Vsync, newest frame replaces the queued one; no tearing, lower latency, renders unthrottled | Desktop games when supported |
| `IMMEDIATE` | No vsync, tearing possible | Benchmarks, competitive "vsync off" option |
| `FIFO_RELAXED` | Vsync, but a late frame is presented immediately (may tear) | Games that occasionally miss vblank |

VR does not present through a window swapchain at all — use OpenXR's swapchains.

### 3.3 Image Acquire -> Render -> Present Flow

```cpp
uint32_t imageIndex;
vkAcquireNextImageKHR(device, swapchain, UINT64_MAX,       // wait forever
                      imageAvailableSemaphore,             // signalled when image ready
                      VK_NULL_HANDLE, &imageIndex);

// record + submit: wait on imageAvailableSemaphore, signal renderFinished[imageIndex]
vkQueueSubmit(graphicsQueue, 1, &submitInfo, frameFence);

// present waits on renderFinished[imageIndex]
vkQueuePresentKHR(presentQueue, &presentInfo);  // { swapchain, imageIndex }
```

### 3.4 Swapchain Recreation

Recreate the swapchain (and its image views/framebuffers) when acquire or present returns `VK_ERROR_OUT_OF_DATE_KHR`, after `VK_SUBOPTIMAL_KHR` at a convenient point, and on window resize. Skip rendering while the window is minimized (extent 0x0). Pass the old swapchain in `oldSwapchain` and destroy it only after its images are no longer in use.

## 4. Render Passes & Framebuffers

### 4.0 Prefer Dynamic Rendering for New Code

`vkCmdBeginRendering` (core in Vulkan 1.3, `VK_KHR_dynamic_rendering` before) removes `VkRenderPass`/`VkFramebuffer` objects: attachments are passed at record time and the pipeline declares formats via `VkPipelineRenderingCreateInfo`. Vulkan 1.4 adds dynamic-rendering local reads, which covers the main remaining use of subpasses (tile-local G-buffer reads). Layout transitions are then explicit barriers. Classic render passes (below) still work and are what older Android drivers support best.

```cpp
VkRenderingAttachmentInfo color{VK_STRUCTURE_TYPE_RENDERING_ATTACHMENT_INFO};
color.imageView   = swapchainViews[imageIndex];
color.imageLayout = VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL;
color.loadOp      = VK_ATTACHMENT_LOAD_OP_CLEAR;
color.storeOp     = VK_ATTACHMENT_STORE_OP_STORE;
color.clearValue.color = {{0.1f, 0.2f, 0.3f, 1.0f}};

VkRenderingInfo ri{VK_STRUCTURE_TYPE_RENDERING_INFO};
ri.renderArea = {{0, 0}, extent};
ri.layerCount = 1;
ri.colorAttachmentCount = 1;
ri.pColorAttachments = &color;
vkCmdBeginRendering(cmd, &ri);
// bind pipeline, draw ...
vkCmdEndRendering(cmd);
```

### 4.1 Render Pass

```cpp
VkAttachmentDescription color{};
color.format = swapchainFormat;
color.samples = VK_SAMPLE_COUNT_1_BIT;
color.loadOp  = VK_ATTACHMENT_LOAD_OP_CLEAR;
color.storeOp = VK_ATTACHMENT_STORE_OP_STORE;
color.initialLayout = VK_IMAGE_LAYOUT_UNDEFINED;
color.finalLayout   = VK_IMAGE_LAYOUT_PRESENT_SRC_KHR;

VkAttachmentReference colorRef{ 0, VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL };

VkSubpassDescription subpass{};
subpass.pipelineBindPoint = VK_PIPELINE_BIND_POINT_GRAPHICS;
subpass.colorAttachmentCount = 1;
subpass.pColorAttachments = &colorRef;

VkRenderPassCreateInfo rpci{};
rpci.attachmentCount = 1;
rpci.pAttachments = &color;
rpci.subpassCount = 1;
rpci.pSubpasses = &subpass;

VkRenderPass renderPass;
vkCreateRenderPass(device, &rpci, nullptr, &renderPass);
```

### 4.2 Subpasses & Input Attachments

A render pass can hold multiple subpasses. Output of one subpass can be consumed by the next as an input attachment — this avoids intermediate memory round-trips:

```
Subpass 0:  draw geometry -> GBuffer (Color + Depth)
Subpass 1:  lighting pass reads GBuffer via input attachment
```

```cpp
VkSubpassDependency dep{};
dep.srcSubpass = 0;  dep.dstSubpass = 1;
dep.srcStageMask  = VK_PIPELINE_STAGE_COLOR_ATTACHMENT_OUTPUT_BIT;
dep.dstStageMask  = VK_PIPELINE_STAGE_FRAGMENT_SHADER_BIT;
dep.srcAccessMask = VK_ACCESS_COLOR_ATTACHMENT_WRITE_BIT;
dep.dstAccessMask = VK_ACCESS_INPUT_ATTACHMENT_READ_BIT;
dep.dependencyFlags = VK_DEPENDENCY_BY_REGION_BIT;   // lets tilers keep data on-chip
// Layout changes between subpasses follow the VkAttachmentReference layouts;
// the execution/memory dependency must still be declared like this.
```

### 4.3 Framebuffer (one per swapchain image)

```cpp
VkFramebufferCreateInfo fci{};
fci.renderPass = renderPass;
fci.attachmentCount = 1;
fci.pAttachments = &swapchainImageView[i];   // image view for image i
fci.width = windowWidth; fci.height = windowHeight; fci.layers = 1;
vkCreateFramebuffer(device, &fci, nullptr, &framebuffers[i]);
```

## 5. Pipelines

### 5.1 The Graphics Pipeline - Monolithic Bake

Vulkan pre-bakes all state into a `VkPipeline`:

- Shader stages (VS + FS, optionally TS/GS/MS)
- Vertex input layout
- Input assembly
- Viewport + Scissor
- Rasterization
- Multisampling
- Depth/stencil
- Color blending
- Dynamic state (viewport/scissor if dynamic)

```cpp
VkGraphicsPipelineCreateInfo gpci{};
gpci.stageCount = 2;               // VS + FS
gpci.pStages = shaderStages;       // VkPipelineShaderStageCreateInfo
gpci.pVertexInputState = &vertexInput;
gpci.pInputAssemblyState = &inputAssembly;
gpci.pViewportState = &viewportState;
gpci.pRasterizationState = &rasterState;
gpci.pMultisampleState = &msState;
gpci.pDepthStencilState = &depthState;
gpci.pColorBlendState = &blendState;
gpci.layout = pipelineLayout;
gpci.renderPass = renderPass;
gpci.subpass = 0;

vkCreateGraphicsPipelines(device, pipelineCache, 1, &gpci, nullptr, &pipeline);
```

**Key insight**: pipelines are immutable once created, so switching between a small set of pre-baked pipelines is cheap. Cache pipelines per unique state set.

### 5.2 Pipeline Layout & Descriptor Set Layout

```cpp
VkDescriptorSetLayoutBinding binding{};
binding.binding = 0;
binding.descriptorType = VK_DESCRIPTOR_TYPE_UNIFORM_BUFFER;
binding.stageFlags = VK_SHADER_STAGE_VERTEX_BIT;
binding.descriptorCount = 1;

VkDescriptorSetLayoutCreateInfo dslci{};
dslci.bindingCount = 1;
dslci.pBindings = &binding;
vkCreateDescriptorSetLayout(device, &dslci, nullptr, &dslSetLayout);

VkPipelineLayoutCreateInfo plci{};
plci.setLayoutCount = 1;
plci.pSetLayouts = &dslSetLayout;
// push constants: plci.pushConstantRangeCount = 1; plci.pPushConstantRanges = &pcRange;
vkCreatePipelineLayout(device, &plci, nullptr, &pipelineLayout);
```

### 5.3 Dynamic State

Mark viewport/scissor as `VK_DYNAMIC_STATE_VIEWPORT` + `VK_DYNAMIC_STATE_SCISSOR` to change them per draw without a new pipeline. Vulkan 1.3 also made cull mode, depth test/write, primitive topology and more dynamic (extended dynamic state), which shrinks the number of pipeline permutations. `VK_EXT_graphics_pipeline_library` and `VK_EXT_shader_object` further reduce compile hitches where supported.

## 6. Command Buffers & Recording

```cpp
VkCommandPoolCreateInfo poolCI{};
poolCI.queueFamilyIndex = gfxFamily;
poolCI.flags = VK_COMMAND_POOL_CREATE_RESET_COMMAND_BUFFER_BIT;
vkCreateCommandPool(device, &poolCI, nullptr, &cmdPool);

VkCommandBufferAllocateInfo cbai{};
cbai.commandPool = cmdPool;
cbai.level = VK_COMMAND_BUFFER_LEVEL_PRIMARY;
cbai.commandBufferCount = 1;
vkAllocateCommandBuffers(device, &cbai, &cmdBuffer);
```

Record per frame:

```cpp
vkResetCommandBuffer(cmdBuffer, 0);
VkCommandBufferBeginInfo begin{};
begin.flags = VK_COMMAND_BUFFER_USAGE_ONE_TIME_SUBMIT_BIT;
vkBeginCommandBuffer(cmdBuffer, &begin);

VkRenderPassBeginInfo rpbi{};
rpbi.renderPass = renderPass;
rpbi.framebuffer = framebuffers[imageIndex];
rpbi.renderArea.extent = { width, height };
VkClearValue clear = {{{0.1f, 0.2f, 0.3f, 1.f}}};
rpbi.clearValueCount = 1; rpbi.pClearValues = &clear;
vkCmdBeginRenderPass(cmdBuffer, &rpbi, VK_SUBPASS_CONTENTS_INLINE);

vkCmdBindPipeline(cmdBuffer, VK_PIPELINE_BIND_POINT_GRAPHICS, pipeline);
vkCmdBindDescriptorSets(cmdBuffer, VK_PIPELINE_BIND_POINT_GRAPHICS, pipelineLayout, 0, 1, &ds, 0, nullptr);
VkDeviceSize offset = 0;
vkCmdBindVertexBuffers(cmdBuffer, 0, 1, &vertexBuffer, &offset);
vkCmdBindIndexBuffer(cmdBuffer, indexBuffer, 0, VK_INDEX_TYPE_UINT32);
vkCmdDrawIndexed(cmdBuffer, indexCount, 1, 0, 0, 0);

vkCmdEndRenderPass(cmdBuffer);
vkEndCommandBuffer(cmdBuffer);
```

### Why Command Buffers Are Powerful

- Recorded once, submitted many times (cached geometry draws).
- Recorded from multiple threads and submitted to one queue.
- Secondary command buffers nest inside render passes to render in parallel chunks.

## 7. Synchronization - The Hardest Part

Vulkan never syncs for you. Five primitives:

| Primitive | Scope | Purpose |
|-----------|-------|---------|
| **Fence** | CPU<->GPU | CPU waits for GPU work completion |
| **Semaphore** | GPU->GPU | Order queue submissions on different queues |
| **Timeline Semaphore** | GPU<->GPU and CPU | 64-bit counter; wait/signal values from GPU or CPU (core 1.2) |
| **Event** | In-batch | GPU-internal stage-to-stage wait |
| **Pipeline Barrier** | Memory | Image/buffer layout + flush/invalidate |

### 7.1 The Classic Frame Skeleton

```cpp
// MAX_FRAMES_IN_FLIGHT (usually 2) is independent of the swapchain image count.
// frame = CPU-side slot; imageIndex = which swapchain image we got. Do not mix them.
uint32_t frame = frameCounter % MAX_FRAMES_IN_FLIGHT;

vkWaitForFences(device, 1, &inFlight[frame], VK_TRUE, UINT64_MAX);   // slot reusable?

uint32_t imageIndex;
VkResult acq = vkAcquireNextImageKHR(device, swapchain, UINT64_MAX,
                                     imageAvailable[frame], VK_NULL_HANDLE, &imageIndex);
if (acq == VK_ERROR_OUT_OF_DATE_KHR) { recreateSwapchain(); return; }

vkResetFences(device, 1, &inFlight[frame]);           // reset only when we will submit
recordCommandBuffer(cmd[frame], imageIndex);

VkPipelineStageFlags waitStage = VK_PIPELINE_STAGE_COLOR_ATTACHMENT_OUTPUT_BIT;
VkSubmitInfo si{VK_STRUCTURE_TYPE_SUBMIT_INFO};
si.waitSemaphoreCount = 1;   si.pWaitSemaphores = &imageAvailable[frame];
si.pWaitDstStageMask = &waitStage;
si.commandBufferCount = 1;   si.pCommandBuffers = &cmd[frame];
si.signalSemaphoreCount = 1; si.pSignalSemaphores = &renderFinished[imageIndex]; // one per image
vkQueueSubmit(graphicsQueue, 1, &si, inFlight[frame]);

VkPresentInfoKHR pi{VK_STRUCTURE_TYPE_PRESENT_INFO_KHR};
pi.waitSemaphoreCount = 1; pi.pWaitSemaphores = &renderFinished[imageIndex];
pi.swapchainCount = 1; pi.pSwapchains = &swapchain; pi.pImageIndices = &imageIndex;
VkResult pr = vkQueuePresentKHR(presentQueue, &pi);
if (pr == VK_ERROR_OUT_OF_DATE_KHR || pr == VK_SUBOPTIMAL_KHR) recreateSwapchain();
++frameCounter;
```

### 7.2 Pipeline Barriers

Barriers order execution, make writes visible, and transition image layouts. Use synchronization2 (core 1.3): stages and access masks live in each barrier.

```cpp
// swapchain image: "don't care about old contents" -> color attachment
VkImageMemoryBarrier2 b{VK_STRUCTURE_TYPE_IMAGE_MEMORY_BARRIER_2};
b.srcStageMask  = VK_PIPELINE_STAGE_2_COLOR_ATTACHMENT_OUTPUT_BIT; // matches acquire wait stage
b.srcAccessMask = 0;
b.dstStageMask  = VK_PIPELINE_STAGE_2_COLOR_ATTACHMENT_OUTPUT_BIT;
b.dstAccessMask = VK_ACCESS_2_COLOR_ATTACHMENT_WRITE_BIT;
b.oldLayout = VK_IMAGE_LAYOUT_UNDEFINED;
b.newLayout = VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL;
b.srcQueueFamilyIndex = b.dstQueueFamilyIndex = VK_QUEUE_FAMILY_IGNORED;
b.image = swapchainImages[imageIndex];
b.subresourceRange = {VK_IMAGE_ASPECT_COLOR_BIT, 0, 1, 0, 1};

VkDependencyInfo dep{VK_STRUCTURE_TYPE_DEPENDENCY_INFO};
dep.imageMemoryBarrierCount = 1;
dep.pImageMemoryBarriers = &b;
vkCmdPipelineBarrier2(cmd, &dep);
// after rendering: COLOR_ATTACHMENT_OPTIMAL -> PRESENT_SRC_KHR
// (src = COLOR_ATTACHMENT_OUTPUT/WRITE, dst = NONE/0)
```

## 8. Memory Management

### 8.1 Allocating Device Memory

```cpp
VkMemoryRequirements req;
vkGetBufferMemoryRequirements(device, buffer, &req);

VkMemoryAllocateInfo mai{};
mai.allocationSize = req.size;
mai.memoryTypeIndex = findMemoryType(req.memoryTypeBits,
    VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT);

VkDeviceMemory mem;
vkAllocateMemory(device, &mai, nullptr, &mem);
vkBindBufferMemory(device, buffer, mem, 0);
```

### 8.2 Memory Types

| Flag | Location | Usage |
|------|----------|-------|
| `DEVICE_LOCAL` | VRAM | GPU-only buffers/textures |
| `HOST_VISIBLE | HOST_COHERENT` | System RAM mapped | staging, uniform upload |
| `DEVICE_LOCAL | HOST_VISIBLE` | CPU-mappable VRAM (a 256 MB window on most discrete GPUs; all of VRAM with Resizable BAR; everything on integrated/mobile GPUs) | per-frame uniform/dynamic data written directly |

In practice use the Vulkan Memory Allocator (VMA): `vmaCreateBuffer` with `VMA_MEMORY_USAGE_AUTO` and `VMA_ALLOCATION_CREATE_HOST_ACCESS_SEQUENTIAL_WRITE_BIT` picks a suitable type and suballocates for you.

### 8.3 Upload Pattern (Staging)

1. Allocate host-visible staging buffer.
2. `memcpy` CPU data into mapped pointer.
3. `vkCmdCopyBuffer` staging -> device-local buffer inside a command buffer.
4. Insert a memory barrier so GPU reads the copy before using it.

```cpp
// Host-visible buffer
VkBuffer staging;
vkMapMemory(device, stagingMem, 0, size, 0, &ptr);
memcpy(ptr, cpuData, size);
vkUnmapMemory(device, stagingMem);

// Copy in a one-time command buffer + fence
vkCmdCopyBuffer(cmd, staging, deviceBuffer, 1, &region);
// run fence + wait before first device use
```

### 8.4 Descriptor Pools & Sets

```cpp
VkDescriptorPoolCreateInfo dpci{};
dpci.maxSets = 256;
VkDescriptorPoolSize poolSize{ VK_DESCRIPTOR_TYPE_UNIFORM_BUFFER, 256 };
dpci.poolSizeCount = 1; dpci.pPoolSizes = &poolSize;
vkCreateDescriptorPool(device, &dpci, nullptr, &descPool);

VkDescriptorSetAllocateInfo dsai{};
dsai.descriptorPool = descPool;
dsai.descriptorSetCount = 1;
dsai.pSetLayouts = &dslSetLayout;
vkAllocateDescriptorSets(device, &dsai, &descriptorSet);

VkWriteDescriptorSet wds{};
wds.dstSet = descriptorSet;
wds.descriptorCount = 1;
wds.descriptorType = VK_DESCRIPTOR_TYPE_UNIFORM_BUFFER;
wds.pBufferInfo = &bufferInfo;   // { buffer, offset, size }
vkUpdateDescriptorSets(device, 1, &wds, 0, nullptr);
```

## 9. Compute Shaders

Compute is Vulkan's workhorse for GPU-driven rendering, particles, physics, image processing.

```cpp
// Pipeline: pipelineBindPoint = VK_PIPELINE_BIND_POINT_COMPUTE
// shaderStages = { compute shader }
VkComputePipelineCreateInfo cpci{};
cpci.stage = computeStage;         // VkPipelineShaderStageCreateInfo
cpci.layout = computePipelineLayout;
vkCreateComputePipelines(device, pipelineCache, 1, &cpci, nullptr, &computePipeline);

// Dispatch
vkCmdBindPipeline(cmd, VK_PIPELINE_BIND_POINT_COMPUTE, computePipeline);
vkCmdBindDescriptorSets(cmd, VK_PIPELINE_BIND_POINT_COMPUTE, computeLayout, 0, 1, &ds, 0, nullptr);
vkCmdDispatch(cmd, (particleCount + 255) / 256, 1, 1);   // round up to whole workgroups
```

```glsl
#version 450
layout(local_size_x = 256) in;              // workgroup = 256 threads
layout(std430, binding = 0) buffer Particles { vec4 pos[]; } p;
layout(push_constant) uniform PC { uint count; } pc;

void main() {
    uint i = gl_GlobalInvocationID.x;
    if (i >= pc.count) return;                // last workgroup may be partial
    p.pos[i].xyz += vec3(0.01, 0.0, 0.0);
}
```

### 9.1 Compute Workgroup Sizing

- Local size 64-256 threads is the sweet spot (GPUs schedule in warps/wavefronts).
- Total workgroup count should exceed SM/WGP count for full occupancy.
- Use a multiple of the subgroup size (`VkPhysicalDeviceSubgroupProperties::subgroupSize`: 32 on NVIDIA, 32 or 64 on AMD RDNA, varies on mobile).

## 10. Render to Texture (Offscreen)

1. Create color + depth images with `VK_IMAGE_USAGE_COLOR_ATTACHMENT_BIT | VK_IMAGE_USAGE_SAMPLED_BIT`.
2. Create a render pass with matching attachments; framebuffer uses these images.
3. After render pass, transition color layout to `VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL`.
4. Sample it in the main pass via a `VK_DESCRIPTOR_TYPE_COMBINED_IMAGE_SAMPLER`.

## 11. Vulkan Ray Tracing

### 11.1 The Ray Tracing Pipeline

Rays are traced against an acceleration structure built from BLAS (Bottom-Level, geometry) and TLAS (Top-Level, instances):

```
Build BLAS per mesh  ->  Instance refers BLAS  ->  Build TLAS from instances
```

### 11.2 Shaders

| Stage | Purpose |
|-------|---------|
| **RayGen** | Fires the rays, writes the output |
| **ClosestHit** | Closest intersection -> shade |
| **Miss** | Rays that hit nothing (skybox) |
| **AnyHit** | Alpha-testing / transparency |
| **Intersection** | Custom primitive intersection |

Use `VK_KHR_ray_tracing_pipeline` + `VK_KHR_acceleration_structure`. Building TLAS per frame is a well-known cost; batch instance updates.

## 12. Architecture Decision Trees

### 12.1 "Which present mode?"

```mermaid
flowchart TD
    A{Benchmark or user chose vsync off?} -->|Yes| B[IMMEDIATE if supported]
    A -->|No| C{Mobile / battery-bound?} -->|Yes| D[FIFO]
    C -->|No| E{MAILBOX supported?} -->|Yes| F[MAILBOX]
    E -->|No| G[FIFO]
```

### 12.2 "Which memory type for my buffer?"

```mermaid
flowchart TD
    A{Accessed by CPU every frame?} -->|Yes| B{HOST_VISIBLE}
    A -->|No| C{Accessed only by GPU?} -->|Yes| D{DEVICE_LOCAL}
    C -->|No| E[Staging + DEVICE_LOCAL]
    D --> F[Upload once via staging]
    B --> G[Map + memcpy per frame]
```

## 13. Anti-Patterns

| Anti-pattern | Why it hurts | Fix |
|--------------|--------------|-----|
| `vkDeviceWaitIdle()` per frame | Stalls the GPU, kills pipelining | Use fences/semaphores per frame index |
| One big uniform buffer for everything | Driver stumbles, redundant uploads | Split UBOs by update frequency |
| Allocating device memory per object | Thousands of `vkAllocateMemory` | Suballocate from big pools |
| Ignoring image layout transitions | Garbage / artifacts / validation errors | Always place barriers |
| Synchronizing too much | Everything serialized | Use async queues, minimal barriers |
| Creating pipelines at runtime per material | Pipeline cache misses, stalls | Bake upfront; use pipeline cache |
| Mapping/unmapping every frame | Mapping cost + driver sync | Keep persistent mappings |
| Single global command buffer | No multi-thread recording | Per-thread pools + secondary buffers |
| Foregoing validation layers in dev | Silent corruption, hard bugs | Always enable in debug |

## 14. Debugging & Validation

- **Validation layers**: the #1 tool. Fix every VUID it reports.
- **RenderDoc**: frame captures, shader inspection, GPU timing.
- **NVIDIA Nsight Graphics / AMD Radeon GPU Profiler / Arm Performance Studio / Snapdragon Profiler**: pass timings, occupancy, bandwidth.
- **GPU crashes**: `VK_EXT_device_fault` where supported, NVIDIA Nsight Aftermath, AMD Radeon GPU Detective; add `VK_EXT_debug_utils` labels so dumps name the pass.
- Check `VkResult` from every call in debug builds.

## 15. Production Checklist (Lead-Level Vulkan)

1. Pipeline cache persisted across runs (`vkGetPipelineCacheData`; discard it if the header's vendorID/deviceID/pipelineCacheUUID no longer match).
2. Descriptor pools sized properly; descriptor set caching.
3. Single allocation strategy: block allocator over `vkAllocateMemory`.
4. Command buffers per thread; secondary buffers for huge scenes.
5. Frame-in-flight synchronization with fences + semaphores (no `waitIdle`).
6. Staging uploads batched at start of frame.
7. Feature detection before enabling extensions.
8. Swapchain recreation path tested on resize / minimize.
9. Offscreen passes double-buffered, reused across frames.
10. Ray tracing BLAS built once, TLAS per frame, instances updated in place.

## 16. References

- `references/vulkan-initialization.md` - instance, device, queue, validation detail
- `references/swapchain-and-present.md` - swapchain creation, present modes, recreation
- `references/render-passes-and-pipelines.md` - subpasses, dynamic state, pipeline caching
- `references/synchronization-deep-dive.md` - barriers, fences, semaphores, timeline semaphores
- `references/memory-and-upload.md` - allocators, staging, image/buffer resources
- `references/compute-and-ray-tracing.md` - compute dispatch, RT pipelines, TLAS/BLAS
