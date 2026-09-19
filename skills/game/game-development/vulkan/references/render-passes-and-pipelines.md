---
title: Render Passes and Pipelines Reference
description: Subpasses, framebuffers, pipeline state, dynamic state, pipeline cache, and shader compilation pipelines.
---

# Render Passes & Pipelines — Deep Reference

## 1. Render Pass = Attachment + Subpass Graph

A render pass describes:
- Attachments (format, load/store, layout begin/end).
- Subpasses with color/depth/input attachment refs and a **dependency graph** between them.
- Implicit layout transitions executed by the driver at subpass boundaries.

```cpp
VkRenderPassCreateInfo rpci{};
rpci.attachmentCount = 3;    // albedo, normal, depth
rpci.pAttachments = attachments;      // GBuffer attachments
rpci.subpassCount = 2;       // geometry + lighting
rpci.pSubpasses = subpasses;
rpci.dependencyCount = 1;    // allow geometry->lighting
rpci.pDependencies = &dep;
```

Subpass 0 writes GBuffer (color attachments). Subpass 1 binds the same GBuffer as **input attachments**:

```cpp
VkAttachmentReference inputRef{ 0, VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL };
VkSubpassDescription light{};
light.pipelineBindPoint = PIPELINE_BIND_POINT_GRAPHICS;
light.inputAttachmentCount = 1;
light.pInputAttachments = &inputRef;   // reads subpass 0's output
```

Benefits: zero memory round-trip between passes, driver-fused. Costs: hard to do compute between subpasses; fine for classic forward+/deferred.

## 2. Load / Store / Clear Semantics

| Load | Store | Effect |
|------|-------|--------|
| LOAD_OP_CLEAR | STORE_OP_STORE | fresh target each pass |
| LOAD_OP_LOAD | STORE_OP_STORE | accumulate into existing |
| LOAD_OP_DONT_CARE | STORE_OP_DONT_CARE | transient/scratch |
| + fragment shader store | | portable alternative |

For transient (G-buffer, depth) use `VK_IMAGE_LAYOUT_TRANSIENT_ATTACHMENT` + DONT_CARE where possible (mobile).

## 3. Framebuffers (One per Swapchain Image)

```cpp
for (uint32_t i = 0; i < swapImageCount; ++i) {
    std::array<VkImageView,3> views = { swapViews[i], depthView, gbufferViews[i] };
    VkFramebufferCreateInfo fbi{};
    fbi.renderPass = rp; fbi.attachmentCount = views.size();
    fbi.pAttachments = views.data();
    fbi.width = w; fbi.height = h; fbi.layers = 1;
    vkCreateFramebuffer(device, &fbi, nullptr, &fbs[i]);
}
```

Heavy engine tip: reuse framebuffers for the whole frame; only re-create on swapchain recreation.

## 4. Graphics Pipeline — Full State Coverage

Missing state = undefined behavior. Cover: vertex input, input assembly, dynamic state, tess, viewport, raster, multisample, depth/stencil, color blend, shader stages, layout, render pass+subpass.

```cpp
VkGraphicsPipelineCreateInfo gp{};
gp.stageCount = 2;  // include TS/GS only if used
gp.pStages = stages;
gp.pVertexInputState = &vis;      // binding + attributes
gp.pInputAssemblyState = &ias;    // TOPOLOGY_TRIANGLE_LIST, primitiveRestart
gp.pRasterizationState = &ras;    // fill, cull back, frontFace CW
gp.pMultisampleState = &ms;       // sampleCount, alphaToCoverage
gp.pDepthStencilState = &ds;      // test+write, depth clamp
gp.pColorBlendState = &cbs;       // blend ops, constant factor
gp.layout = pipelineLayout;
gp.renderPass = rp; gp.subpass = 0;
```

### Vertex input for interleaved vs SoA

```cpp
// interleaved: one binding, stride sizeof(Vertex)
// SoA: one binding per attribute array, offset 0, stride sizeof(component)*count
```

SoA is cache-friendly for data-oriented rendering.

## 5. Dynamic State — Fewer Pipelines

Mark `viewport`/`scissor` as dynamic to set per-draw without re-baking:

```cpp
gp.dynamicStateCount = 2;
gp.pDynamicStates = { VK_DYNAMIC_STATE_VIEWPORT, VK_DYNAMIC_STATE_SCISSOR };

// per draw:
vkCmdSetViewport(cmd, 0, 1, &vp);
vkCmdSetScissor(cmd, 0, 1, &sc);
```

Push constants for tiny per-object data (mat4 view-projection):

```cpp
VkPushConstantRange pc{ VK_SHADER_STAGE_VERTEX_BIT | VK_SHADER_STAGE_FRAGMENT_BIT, 0, 128 };
// pre-recorded: vkCmdPushConstants(cmd, layout, stageFlags, 0, 128, &data);
```

## 6. Pipeline Cache — Loading & Persisting

```cpp
VkPipelineCacheCreateInfo pci{};
VkPipelineCache pipelineCache; vkCreatePipelineCache(device, &pci, nullptr, &pipelineCache);

// save on shutdown:
size_t sz; vkGetPipelineCacheData(device, pipelineCache, &sz, nullptr);
std::vector<uint8_t> blob(sz); vkGetPipelineCacheData(device, pipelineCache, &sz, blob.data());
// write blob to disk

// load on startup: pci.pInitialData = blob.data(); pci.initialDataSize = blob.size();
// consider VK_PIPELINE_CACHE_CREATE_READ_ONLY_BIT when shipping
```

Pipelines built via `vkCreateGraphicsPipelines(device, pipelineCache, 1, &gp, nullptr, &p)` reuse compiled kernels → big startup speedup.

## 7. Shader Compilation Strategy

Bake at asset-build time:
1. glslang → SPIR-V for Vulkan (`.spv`).
2. optimize with `spirv-opt` (and `spirv-cross` to convert when needed).
3. `VK_PIPELINE_CACHE` saves GPU kernel compile.
4. `VK_EXT_graphics_pipeline_library` splits pipelineless state into reusable chunks (faster dynamic state baking for runtime shaders).

## 8. Render Pass vs "Dynamic Rendering" (VK_KHR_dynamic_rendering)

Double-buffer render passes can't change attachment sets without re-creating render pass. Dynamic rendering lets you begin a pass inline with attachments + layout per sub-framebuffer, no render-pass object:

```cpp
VkRenderingInfo ri{};
ri.colorAttachmentCount = 1;
ri.pColorAttachments = &colorAttach;
vkCmdBeginRendering(cmd, &ri);
// draw
vkCmdEndRendering(cmd);
```

Great for many small shadow-map passes, multi-view, or when attachment sets vary.

## 9. Pipeline State Decision Rules

1. Bake only statistically common state; dynamic-state for viewport/scissor.
2. Prefer fewer pipelines + dynamic state over many static pipelines.
3. For runtime-generated shaders (modding), use pipeline-library ext.
4. Persist the cache; drop it when shader compilation pipeline changes.
5. Use `subpass` index to share one pipeline across subpasses if state matches.

## 10. Performance Pitfalls

| Pitfall | Impact |
|---------|--------|
| Too many pipeline switches | Re-bind stall per switch |
| Re-creation of pipelines at runtime | Cache misses |
| Full dynamic state (blend etc.) | driver may not optimize |
| Clear on imported/transient images | extra bandwidth |
| Huge G-buffer attachment (8 vs 4 RGBA) | bandwidth-bound deferred |