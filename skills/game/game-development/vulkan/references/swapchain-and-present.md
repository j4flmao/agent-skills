---
title: Swapchain and Present Reference
description: Swapchain creation, image format selection, present modes, surface capabilities, and swapchain recreation.
---

# Swapchain & Present — Deep Reference

## 1. Surface Capabilities

```cpp
VkSurfaceCapabilitiesKHR caps;
vkGetPhysicalDeviceSurfaceCapabilitiesKHR(dev, surface, &caps);
```

- `minImageCount`/`maxImageCount`, `currentExtent`, `supportedUsageFlags`.
- `supportedTransforms` — we force IDENTITY.
- `supportedCompositeAlpha`.

## 2. Select Format & Present Mode

```cpp
std::vector<VkSurfaceFormatKHR> fmts;
vkGetPhysicalDeviceSurfaceFormatsKHR(dev, surface, &count, nullptr);
// prefer B8G8R8A8_SRGB (or A8B8G8R8_UNORM_PACK32 for compute chains)

std::vector<VkPresentModeKHR> modes;
vkGetPhysicalDeviceSurfacePresentModesKHR(dev, surface, &count, nullptr);
bool mailbox = contains(VK_PRESENT_MODE_MAILBOX_KHR);
// engine:  FIFO default; mailbox if present & want low latency
```

Present-mode mapping:
| Engine mode | Vk present | Typical |
|-------------|-----------|---------|
| Vsync | FIFO | default, no tearing |
| Adaptive | FIFO_RELAXED | mobile |
| Low-latency | MAILBOX | desktop fast |
| Unlocked | IMMEDIATE | benchmarking |
| VRR | VK_EXT_swapchain_maintenance1 | monitor sync |

## 3. Create Swapchain

```cpp
VkSwapchainKHR swap;
VkSwapchainCreateInfoKHR sci{};
sci.sType = VK_STRUCTURE_TYPE_SWAPCHAIN_CREATE_INFO_KHR;
sci.surface = surface;
sci.minImageCount = std::clamp(caps.minImageCount + 1, 2u, 3u); // double/triple buffer
sci.imageFormat = format.format;
sci.imageColorSpace = format.colorSpace;
sci.imageExtent = chooseExtent(caps, width, height);   // clamp to currentExtent
sci.imageArrayLayers = 1;
sci.imageUsage = VK_IMAGE_USAGE_COLOR_ATTACHMENT_BIT;
    // add | VK_IMAGE_USAGE_TRANSFER_SRC_BIT if you blit/copy out (screenshot)
sci.imageSharingMode = VK_SHARING_MODE_EXCLUSIVE;
sci.preTransform = VK_SURFACE_TRANSFORM_IDENTITY_BIT_KHR;
sci.compositeAlpha = VK_COMPOSITE_ALPHA_OPAQUE_BIT_KHR;
sci.presentMode = mode;
sci.clipped = VK_TRUE;
sci.oldSwapchain = oldSwap;   // for recreation
vkCreateSwapchainKHR(device, &sci, nullptr, &swap);
```

## 4. Fetch Images + Create Views

```cpp
uint32_t n; vkGetSwapchainImagesKHR(device, swap, &n, nullptr);
std::vector<VkImage> swapImages(n); vkGetSwapchainImagesKHR(device, swap, &n, swapImages.data());
for (i) create VkImageView from swapImages[i];
```

Views are mandatory for render pass attachment access. Create one color view + optionally a depth view (not from swapchain).

## 5. The Present Flow End-to-End

```cpp
// per swapchain image: 1 semaphore available + 1 finished + 1 fence
uint32_t img;
VkResult aq = vkAcquireNextImageKHR(device, swap, UINT64_MAX,
                                    availSem[frame], VK_NULL_HANDLE, &img);
if (aq == VK_ERROR_OUT_OF_DATE_KHR || aq == VK_SUBOPTIMAL_KHR) { recreate(); }

// record passes into cmd[img] (uses framebuffers[img], renderpass, etc)
// submit: wait availSem, signal renderFinishedSem, fence = fence[frame]
VkResult pr = vkQueuePresentKHR(graphicsQueue, &present{ swap, img, &renderFinishedSem[frame] });
if (pr == VK_ERROR_OUT_OF_DATE_KHR || pr == VK_SUBOPTIMAL_KHR) recreateSwapchain();
```

Mark the fence BEFORE submit; always `vkResetFences` then `vkQueueSubmit`.

## 6. Swapchain Recreation

Trigger on window resize, `VK_ERROR_OUT_OF_DATE_KHR`, maximize/minimize, DPI change:

```cpp
void recreateSwapchain() {
    vkDeviceWaitIdle(device);                 // safe only during recreation
    for (view) vkDestroyImageView;  for (fb) vkDestroyFramebuffer;
    vkDestroySwapchainKHR(device, oldSwap, nullptr);

    uint32_t w = clamp(width, 1u, caps.maxImageExtent...) // avoid 0-sized extents when minimized
    create swapchain with oldSwapchain = oldSwap;
    fetch images + re-make views + re-make framebuffers;
}
```

Do NOT re-init instance/device. `oldSwapchain` lets the driver reuse resources.

### Minimize / Occluded Case

When the window is minimized, swapchain extent is (0,0) → clamp to (1,1) and skip rendering (present with nothing, or return early).

## 7. HDR & Wide Gamut

- Presenting HDR: `VK_SURFACE_FORMAT_A2B10G10R10_UNORM_PACK32` or `R16G16B16A16_SFLOAT` on capable displays.
- Enable `VK_KHR_surface_protected_capabilities` rarely needed.
- On HDR: write linear or PQ-encoded color, set `VK_COLOR_SPACE_HDR10_ST2084_EXT`.

## 8. Common Present Bugs

| Bug | Symptom | Fix |
|-----|---------|-----|
| Image count = 1 on some drivers | Flicker, stalls | min + 1 (>= 2) |
| Presenting before wait on render semaphore | Tearing / undefined | wait renderFinishedSem |
| Forgot fence per frame | Command buffer reused while in flight | fence per FRAMES_IN_FLIGHT |
| extent (0,0) minimized | Device lost / exceptions | clamp to (1,1), skip draw |
| Not recreating on OUT_OF_DATE | Permanent black after resize | recreate + reacquire |
| oldSwapchain null on recreate | Driver works but memory leaks | pass old |