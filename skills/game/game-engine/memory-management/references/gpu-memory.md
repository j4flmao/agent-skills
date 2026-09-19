---
title: GPU Memory Management
description: Device-local vs host-visible vs unified memory, staging rings, suballocation, deferred frees and budget tracking for modern renderers.
---

# GPU Memory Management — Deep Reference

## 1. The GPU Memory Landscape

| Category | Where | Characteristics |
|----------|-------|-----------------|
| Device-local | VRAM on discrete GPU | Fastest access from GPU, CPU can't touch (directly) |
| Host-visible | GTT / "system" on Windows, mapped VRAM | CPU can map/write; may be slower for GPU reads |
| Host-cached / readback | system memory read path | For occlusion queries, screenshots, CPU results |
| Unified | console/APU/mobile (shared) | Same pool; carve device-local vs host-visible regions |

### 1.1 The Two World Orders

- **Discrete (PC)**: separate device-local VRAM + host-visible heap. CPU uploads via staging.
- **Unified (console/mobile/APUs)**: one physical pool; the driver decides placement. Strategy: still treat device-local as a budget, use staging for big writes (avoids round-trips and cache pollution).

## 2. The 3 Memory Pools Every Renderer Has

### 2.1 Staging (Upload) Ring

CPU→GPU upload path. A persistent mapped buffer, cycled by frames with fences:

```cpp
class UploadRing {
    void* mapped_; size_t capacity_; size_t cursor_;
    // fence per frame: keeps CPU k frames ahead of GPU
    size_t frameStart_[kInFlight];     // ring offsets per in-flight frame
public:
    UploadRing(size_t cap) : mapped_(cpuMap(allocate(DEFAULT_DEVICE_MEM))), ...
    void* acquire(size_t n, size_t align) {
        // wrap around; if crossing into a still-in-flight window, wait fence
    }
    void endFrame();   // record cursor per frame, fence+signal
};
```

Window = `kInFlight` frames. If the ring wraps into a frame the GPU hasn't finished, the CPU must wait — that's the only stall.

### 2.2 Device-Local Pool

Bucketed budget like CPU memory:

```
gpu-textures   : 1.8 GB
gpu-render     : 512 MB   (RTV/DSV, constant buffers)
gpu-streaming  : 512 MB
gpu-transient  : 256 MB   (per-frame, recycled)
```

### 2.3 Transient (Frame-Scratch) Pool

Resources that live one frame (temp render targets, shadow maps). Suballocate out of a device-local arena; free via deferred queue after `k` frames.

## 3. Suballocation

### 3.1 Why

`vkAllocateMemory`/`CreateCommittedResource` are slow (driver work + potential fragmentation). Suballocate many logical resources from a few large `VkDeviceMemory`/`ID3D12Heap`.

### 3.2 The Pattern

```
VkDeviceMemory (1 GB)
  ├── BlockAllocator → sub-allocs {vertex, index, texture, buffer} regions
  ├── Staging block (mapped, ring)
  └── alignment per type (4096 for buffers; per-device minimum)
```

Implementation `VulkanMemoryAllocator` (VMA) does exactly this; D3D12's `ID3D12Device::CreatePlacedResource` + a custom heap manager is the native path.

### 3.3 Rules

- 64 KB or 4 KB granularity by driver; round sub-allocs up to the granularity.
- Types that need dedicated memory (placed resources w/ special alignments) escape the block.
- Track sub-allocs per tag for stats.

## 4. Deferred Free Queue

Freeing GPU memory while the GPU still reads it = use-after-free. Rule: **defer by k frames** (the in-flight window):

```cpp
struct DeferredFree { ID3D12Resource* res; uint64_t fenceValue; };
std::deque<DeferredFree> queue;   // on frame end, pop entries whose fence passed
```

Same for descriptor heaps, pipelines, and shader modules — anything bound on the GPU queue lives until `k` frames after last use.

## 5. Readback Path (GPU→CPU)

For: occlusion query results, screenshots, CPU-side HUD data.

- Use a host-cached buffer with a **fence** (GPU signals when the write is visible).
- Double-buffer: while CPU reads buffer A, GPU writes buffer B.
- Host-cached reads are slow; aggregate results into a tiny struct and read once/frame.

## 6. Persistent Mapped Buffers

If you map a permanent upload region once ("persistent mapped"), CPU writes never pay map/unmap per frame:

```cpp
uint8_t* map = g_staging.map();       // one time
// per frame: memcpy(map + offset, src, n);  → flush as needed
```

Cache-coherent writes on PCIe are weak; `TUAL`/driver handles it via `vkFlushMappedMemoryRanges` on the region you wrote (usually optional on modern GPUs).

## 7. Budgeting & Certification

Same discipline as CPU:

```
GPU memory report (per tag)
  gpu-textures   : 1.80/1.8 GB  ██████████  peak
  gpu-render     : 480/512 MB
  staging        : 64/128 MB    ← keep small-ish, it's duplicated
```

Consoles tie a higher value on unified memory: dev + target consoles share a firmware cap; the dashboard must stay under it in all stores.

## 8. Pitfalls

1. **Per-frame `CreateCommittedResource`** — the classic D3D12 mistake; pool/suballocate.
2. **Freeing while GPU in flight** → device-removed / corruption → deferred queue.
3. **Staging ring overrun** — holding the CPU hostage inside a 4K upload; widen the ring and prefetch.
4. **Forgetting `vkFlushMappedMemoryRanges`** on some drivers → stale upload data.
5. **Assuming unified means "just allocate"** — mobile GPU memory is shared with OS; going over budget drops you out of process.
6. **Alignment granularity surprises** — 4 KB vs 64 KB minimum for placed resources; suballoc only across compatible granularities.
7. **Host-visible slow read** — reading GPU→CPU per frame for an every-frame value kills the frame (use cached staging + per-frame batching).