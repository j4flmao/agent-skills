---
title: Vulkan Initialization Reference
description: Instance creation, physical device selection, queue families, logical device, validation layers, and platform surfaces.
---

# Vulkan Initialization — Deep Reference

## 1. The Instance

Everything is opt-in. First gather available extensions/layers, then create:

```cpp
uint32_t extCount;
vkEnumerateInstanceExtensionProperties(nullptr, &extCount, nullptr);
std::vector<VkExtensionProperties> exts(extCount);
vkEnumerateInstanceExtensionProperties(nullptr, &extCount, exts.data());
// track: VK_KHR_surface, VK_EXT_debug_utils
// renderer-specific: VK_EXT_descriptor_indexing lives on device, not instance
```

### Portability extensions (macOS/iOS, MoltenVK)

- `VK_KHR_portability_enumeration`.
- On Apple, must enable `VK_KHR_swapchain` mounted via MoltenVK.

## 2. Physical & Logical Device Selection

Scoring function used by real engines:

```cpp
int scoreDevice(VkPhysicalDevice dev, VkSurfaceKHR surface, QueueCaps& caps) {
    VkPhysicalDeviceProperties props;
    vkGetPhysicalDeviceProperties(dev, &props);
    VkPhysicalDeviceFeatures feat;
    vkGetPhysicalDeviceFeatures(dev, &feat);
    int score = 0;
    if (props.deviceType == VK_PHYSICAL_DEVICE_TYPE_DISCRETE_GPU) score += 1000;
    if (props.deviceType == VK_PHYSICAL_DEVICE_TYPE_INTEGRATED_GPU) score += 100;

    // required features
    if (!feat.samplerAnisotropy) return -1;
    if (!feat.geometryShader) return -1;

    // queue families
    Query queue families; if (!caps.complete) return -1;
    // present support
    VkBool32 ok; vkGetPhysicalDeviceSurfaceSupportKHR(dev, caps.gfxQueue, surface, &ok);
    if (!ok) return -1;
    return score;
}
```

Take the highest-scoring device; fall back to the first that passes.

## 3. Queue Family Discovery

```cpp
struct QueueFamilyCaps { complete; gfx; compute; transfer; present; };

// Prefer a graphics family that is the SAME as compute + transfer
// (avoid cross-queue sync). 'complete' if gfx + present on one family.
```

Engine policy:
- Prefer combined `GRAPHICS | COMPUTE | TRANSFER` family → simple single-queue engine.
- Split for max perf: graphics + a dedicated transfer (DMA) queue for asset streaming.
- Async compute optional; only if the GPU reports 2+ compute families.

## 4. Logical Device & Features

Require only features you actually use:

```cpp
VkPhysicalDeviceFeatures2 features2{};
features2.sType = VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_FEATURES_2;
features2.features.samplerAnisotropy = VK_TRUE;
VkPhysicalDeviceFeatures2 queried;
vkGetPhysicalDeviceFeatures2(dev, &queried);   // fill before create

VkDeviceCreateInfo dci{};
dci.pNext = &features2;                          // enable as needed
```

Enable extensions conservatively — each one costs validation + driver complexity.

## 5. Platform Surface (Win32 / XCB / Wayland / macOS / Android)

Window-system glue converts the OS window into a `VkSurfaceKHR`:

```cpp
VkWin32SurfaceCreateInfoKHR wsci{};
wsci.hinstance = GetModuleHandle(nullptr);
wsci.hwnd = hwnd;
vkCreateWin32SurfaceKHR(instance, &wsci, nullptr, &surface);
```

Keep the surface alive; destroy AFTER swapchain, BEFORE device.

## 6. Validation & Debug Utils

```cpp
VkDebugUtilsMessengerCreateInfoEXT dbg{};
dbg.messageSeverity =
    VK_DEBUG_UTILS_MESSAGE_SEVERITY_ERROR_BIT_EXT |
    VK_DEBUG_UTILS_MESSAGE_SEVERITY_WARNING_BIT_EXT;
dbg.messageType = VK_DEBUG_UTILS_MESSAGE_TYPE_VALIDATION_BIT_EXT |
                  VK_DEBUG_UTILS_MESSAGE_TYPE_PERFORMANCE_BIT_EXT;
dbg.pfnUserCallback = [](
    VkDebugUtilsMessageSeverityFlagBitsEXT sev,
    VkDebugUtilsMessageTypeFlagsEXT type,
    const VkDebugUtilsMessengerCallbackDataEXT* data, void*) -> VkBool32 {
    // log to debug, capture stack
    return VK_FALSE;  // < 0 => abort
};
vkCreateDebugUtilsMessengerEXT(instance, &dbg, nullptr, &messenger);
```

Attach the same callback struct to the device-create `pNext` chain (via `VkDebugUtilsMessengerCreateInfoEXT` inside `VkInstanceCreateInfo`).

## 7. Multi-GPU & Advanced Setup

- `VK_KHR_device_group` for AFR / MGPU (rarely worth it).
- VR: nothing special at init; swapchain presents head-locked.
- Headless / compute-only: still need a surface for display; use `VK_PRESENT_MODE_IMMEDIATE`.

## 8. Init Failure Table

| Failure | Likely cause |
|---------|--------------|
| `VK_ERROR_LAYER_NOT_PRESENT` | Enabled a layer that's not installed |
| `VK_ERROR_EXTENSION_NOT_PRESENT` | Requested an ext the driver lacks; query first |
| `VK_ERROR_INCOMPATIBLE_DRIVER` | Old driver, missing Vulkan 1.x |
| hang at present | driver/swapchain combo: try different present mode |
| black screen + device lost | Command buffer bug or mis-sync (see sync reference) |

## 9. Init Checklist

1. Enumerate and log available extensions/layers.
2. Score physical devices; pick discrete GPU.
3. Require features via `VkPhysicalDeviceFeatures2`.
4. Prefer a single combined queue family for correctness; add compute/transfer for perf.
5. Create instance with surface + debug ext.
6. Create surface; ensure device supports present on chosen family.
7. Enable validation in debug; define a release path that strips them.
8. Load functions via `vkGetInstanceProcAddr` (no link dependency needed).