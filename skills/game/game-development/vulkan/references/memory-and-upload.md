---
title: Vulkan Memory & Upload
description: Allocators, memory types, staging uploads, descriptor sets, images, textures, and buffer residency management.
---

# Vulkan Memory & Upload — Deep Reference

## 1. Memory Types Revisited

Enable `VK_KHR_get_memory_properties2` to enumerate precise memory heaps:

| Heap flag | Location | Typical use |
|-----------|----------|-------------|
| `DEVICE_LOCAL` | VRAM | Textures, render targets, vertex buffers |
| `HOST_VISIBLE` | System RAM | uniforms, staging, persistent mapping |
| `HOST_COHERENT` | System RAM | no explicit flush needed |
| `HOST_CACHED` | System RAM (read-cached) | CPU reads back |
| `DEVICE_COHERENT/UNCACHED` (AMD ext) | | vendor-specific |

### Selecting a memory type

```cpp
uint32_t findMemoryType(VkPhysicalDevice dev, uint32_t typeBits,
                        VkMemoryPropertyFlags wanted) {
    VkPhysicalDeviceMemoryProperties props;
    vkGetPhysicalDeviceMemoryProperties(dev, &props);
    for (uint32_t i = 0; i < props.memoryTypeCount; ++i) {
        if ((typeBits & (1u << i)) &&
            (props.memoryTypes[i].propertyFlags & wanted) == wanted)
            return i;
    }
    return UINT32_MAX;
}
```

## 2. Real Driver Behavior

**Crucial caveat**: GPUs don't literally have separate "system RAM" and "VRAM" buffers in a low-level sense — different drivers may treat `HOST_VISIBLE | DEVICE_LOCAL` as real or fake. Always:

- Probe with `vkGetPhysicalDeviceMemoryProperties`.
- Enumerate which combinations a driver reports (see device memory heaps in RenderDoc).
- If a memory type is not marked `DEVICE_LOCAL`, uploading there is a slow PCIe round-trip.

Typical GPUs:
- NVIDIA consumer: 1 heap VRAM (device local), 1 heap system (host visible+coherent).
- Integrated (Intel/AMD APU): single heap, everything device-local + host-visible.
- ReBAR GPUs: heap is device-local AND host-visible.

## 3. Allocation Strategy — VMA (Vulkan Memory Allocator)

Never use `vkAllocateMemory` per buffer. Use VMA (or your own pool):

```cpp
#include <vk_mem_alloc.h>
VmaAllocator allocator;
VmaAllocatorCreateInfo aci{};
aci.instance = instance;
aci.device = device;
aci.physicalDevice = physDev;
vmaCreateAllocator(&aci, &allocator);

VkBufferCreateInfo bci = {};
bci.size = size;
bci.usage = VK_BUFFER_USAGE_UNIFORM_BUFFER_BIT;
VmaAllocationCreateInfo vci{};
vci.usage = VMA_MEMORY_USAGE_CPU_ONLY;   // host-visible + coherent
vci.flags = VMA_ALLOCATION_CREATE_MAPPED_BIT; // persistent mapping

VkBuffer buffer;
VmaAllocation alloc;
vmaCreateBuffer(allocator, &bci, &vci, &buffer, &alloc, nullptr);
float* mapped = (float*)alloc->GetMappedData();  // direct write
```

VMA features to use:
- `VMA_ALLOCATION_CREATE_MAPPED_BIT` (persistently mapped).
- Defragmentation API.
- Memory-budget queries (`vmaGetHeapBudgets`).

## 4. Staging Upload Pattern

Data that changes rarely (static geometry, textures) is uploaded once via staging:

```
CPU: memcpy into host-visible staging buffer
GPU: (transfer queue or graphics) vkCmdCopyBuffer / vkCmdCopyBufferToImage staging -> device-local
     pipeline barrier making copy visible to the consumer
Fence wait → staging can be recycled
```

```cpp
VkBuffer staging, deviceBuffer;
// create staging (HOST_VISIBLE|HOST_COHERENT), buffer (DEVICE_LOCAL, usage=...)
void* data; vkMapMemory(device, stageMem, 0, size, 0, &data);
memcpy(data, src, size); vkUnmapMemory(device, stageMem);

VkCommandBuffer cmd; beginOneTime(cmd);
vkCmdCopyBuffer(cmd, staging, deviceBuffer, 1, &region);
endOneTimeAndSubmit(cmd, fence);   // with a fence
vkWaitForFences(device, 1, &fence, VK_TRUE, UINT64_MAX);
```

### Staging with the "one big staging ring" pattern

Allocate one big host-visible buffer; carve sub-ranges for uploads each frame. This avoids allocation churn and respects PCIe write-combining.

## 5. Images & Textures

```cpp
VkImageCreateInfo ici{};
ici.imageType = VK_IMAGE_TYPE_2D;
ici.extent = { width, height, 1 };
ici.mipLevels = mipCount;             // generate mips
ici.arrayLayers = arrayLayers;        // for cubemaps: 6
ici.format = VK_FORMAT_R8G8B8A8_SRGB;
ici.samples = VK_SAMPLE_COUNT_1_BIT;
ici.usage = VK_IMAGE_USAGE_TRANSFER_DST_BIT | VK_IMAGE_USAGE_SAMPLED_BIT;
ici.tiling = VK_IMAGE_TILING_OPTIMAL;

VkImage texture;
vkCreateImage(device, &ici, nullptr, &texture);
VkMemoryRequirements req;
vkGetImageMemoryRequirements(device, texture, &req);
// allocate DEVICE_LOCAL + bind

VkImageViewCreateInfo ivci{};
ivci.image = texture;                  // view for sampling
ivci.viewType = VK_IMAGE_VIEW_TYPE_2D;
ivci.format = VK_FORMAT_R8G8B8A8_SRGB;
ivci.subresourceRange.aspectMask = VK_IMAGE_ASPECT_COLOR_BIT;
ivci.subresourceRange.levelCount = 1;
vkCreateImageView(device, &ivci, nullptr, &view);
```

### Uploading a texture

```
transition UNDEFINED -> TRANSFER_DST_OPTIMAL
vkCmdCopyBufferToImage(staging, image, VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL, ...)
generate mips via blit copies (srcdst swap)
transition TRANSFER_DST -> SHADER_READ_ONLY_OPTIMAL
```

## 6. Descriptor Sets

### Layouts & Pools

| Binding | DescriptorType | Typical |
|---------|----------------|---------|
| 0 | UNIFORM_BUFFER | per-frame camera UBO |
| 1 | UNIFORM_BUFFER_DYNAMIC | per-object model UBO (offset per draw) |
| 2 | COMBINED_IMAGE_SAMPLER | texture atlas |
| 3 | STORAGE_BUFFER | instance data, particles |
| 4 | SAMPLED_IMAGE | bindless texture |

### Dynamic UBO for Per-Object

Instead of one descriptor set per object, use a single UBO + dynamic offset:

```cpp
VkDescriptorBufferInfo info{ buffer, 0, sizeof(ObjectUBO) };
VkWriteDescriptorSet wds{};
wds.dstSet = set; wds.descriptorType = VK_DESCRIPTOR_TYPE_UNIFORM_BUFFER_DYNAMIC;
wds.pBufferInfo = &info;
vkUpdateDescriptorSets(device, 1, &wds, 0, nullptr);

// per draw:
uint32_t offset = objIndex * sizeof(ObjectUBO);
vkCmdBindDescriptorSets(cmd, PIPELINE_BIND_POINT_GRAPHICS, layout,
    0, 1, &set, 1, &offset);      // dynamic offset per call
```

This gives ~1 draw call per object at tiny descriptor cost.

### Bindless (Descriptor Indexing)

Enable `VK_EXT_descriptor_indexing`, make a huge descriptor array, reference textures by index from the shader:

```glsl
layout(set = 0, binding = 0) uniform sampler2D textures[];
// select by material id at runtime
```

Binds automatically = massive draw-call savings.

## 7. Ring Buffer / Frame-Scoped Uploads

Uniforms that change every frame: allocate once (mapped, host-visible), keep `frameIndex` offset; write this frame's data at `offset[frameIndex]`. No per-frame allocations, no fence sync needed for the current slot.

## 8. Texture Compression

Always compress for GPU residency:

| Format | Compression | Bits/texel | Use |
|--------|-------------|-----------|-----|
| BC1 / DXT1 | 4×4 block | 4 | opaque color |
| BC3 / DXT5 | 4×4 block | 8 | opaque+alpha |
| BC7 | 4×4 block | 8 | high-quality RGBA, PBR |
| ASTC 4×4 | variable | 8 | mobile (Mali/Adreno) |
| ASTC 6×6 | variable | 3.5 | mobile low-mem |

Upload compressed: still via staging; set `imageCreate` with `blocksTexels` from `vkGetImageSubresourceLayout`.

## 9. Memory Budget Tips (Console/PC)

- Vertex/Index buffers: device-local, built once (or streamed via ring).
- Uniforms: host-visible, one ring buffer per frame.
- Textures: compressed BC7/ASTC, mips, don't upload full-res unless needed.
- Depth: `VK_FORMAT_D32_SFLOAT` (or D24_UNORM_S8_UINT for stencil), reuse via render pass views.
- Use `VK_KHR_maintenance4` / `VK_KHR_16bit_storage` for smaller bindings.

## 10. Rules for Memory Code

1. One allocator; no raw `vkAllocateMemory` outside test code.
2. Prefer persistently mapped host-visible for uniforms.
3. Batch staging uploads; don't build pipelines/memcpy per-draw.
4. Track memory budgets (`vmaGetHeapBudgets`) in dev overlay.
5. Compress textures at build time, never at runtime.
6. Use dynamic UBO offsets or bindless to avoid descriptor-set explosion.

## References

- VMA docs: https://gpuopen-librariesandsdks.github.io/VulkanMemoryAllocator/html/
- Khronos memory chapter: Vulkan spec 11.2
- NV "Memory and Upload" whitepaper (GDC)