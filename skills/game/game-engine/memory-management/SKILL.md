---
name: memory-management
description: Expert game engine memory management — allocator hierarchy (stack/arena/pool/free-list), cache-aware data layout, memory tracking, virtual memory, GPU memory, and zero-GC-pause strategies.
---

# Game Engine Memory Management — Deep Engineering Guide

Memory is the #1 source of frame-time jank in shipped games. A 15 ms GC stop-the-world, a cache miss chain, or a fragmented heap turns a 60 FPS target into slideshow. This skill covers the full memory stack of a production game engine: from the raw allocator hierarchy, through cache-aware data layout, to memory tracking and GPU memory management.

## 1. The Memory Model of a Game

### 1.1 Where Memory Goes

| Region | Owner | Budget (typical PC AAA) |
|--------|-------|--------------------------|
| Code + read-only data | OS loader | 50–200 MB |
| Simulation (ECS archetypes) | World/systems | 200–800 MB |
| Assets (textures, meshes, audio) | Asset manager | 1–4 GB |
| Render resources (VB/IB/UBO, RT) | Rendering backend | 1–3 GB |
| Per-frame scratch | Frame allocators | 32–256 MB (transient) |
| Streaming pools | Streaming system | 256–1024 MB |

The point is not the absolute numbers — it's that every subsystem owns its memory. **Never** let subsystems walk the same heap.

### 1.2 The Allocation Spectrum

```
owned     <— deterministic, hot, performance-critical —>      shared
arena / pool / stack           free-list / slabs             system heap / GC
```

### 1.3 Golden Rules

1. **No allocation in the hot loop.** Capability, not preference: all physics, gameplay, and render-command generation run in pre-allocated arenas.
2. **Ownership is explicit.** Every subsystem declares its memory regions at init: size, allocator, budget.
3. **Transient is transient.** Per-frame scratch dies at frame end; nothing holds a pointer past `Present()`.
4. **Measure.** If memory isn't tracked per subsystem, you're flying blind on console cert (memory budget is a *certification* criterion on consoles).

## 2. The Allocator Hierarchy

```
System heap (malloc / new)      — last resort, slow, fragmented
   ├── Stack allocator           per-frame scratch, O(1) reset, no free
   ├── Arena / Bump allocator    monotonic one-shot regions, O(1) alloc
   ├── Free-list allocator       variable sizes, defers dealloc, O(1) alloc+free (best-fit/first-fit)
   ├── Pool allocator            fixed block size, no fragmentation, O(1)
   └── Object pools              dedicated recycling for hot objects, type-safe
```

| Allocator | Alloc | Free | Fragment | Usu |
|-----------|-------|------|----------|-----|
| Stack | O(1) | O(1) reset | none | frame scratch |
| Arena | O(1) | — (reset) | none | one-shot regions |
| Pool | O(1) | O(1) | none | fixed-size objects |
| Free-list | O(1) | O(1) | low | mixed sizes |
| System heap | variable | variable | high | rare |

### 2.1 Stack Allocator (Frame Scratch)

```cpp
class StackAllocator {
    uint8_t* buffer; size_t size; size_t top = 0;
public:
    explicit StackAllocator(size_t n) : size(n) {
        buffer = static_cast<uint8_t*>(aligned_alloc(16, n));
    }
    void* alloc(size_t n, size_t align = 16) {
        size_t p = (top + align - 1) & ~(align - 1);
        void* r = buffer + p; top = p + n;
        ASSERT(top <= size);
        return r;
    }
    void reset() { top = 0; }          // whole frame's scratch freed at once
    ~StackAllocator() { std::free(buffer); }
};
```

Perfect for: collision pair lists, render command batches, input events, pathfinding open sets.

### 2.2 Arena / Linear Allocator

Identical mechanics to a stack without free — for one-shot regions built once (a level's static geometry, an audio bank). Some arenas support "double buffering": write region A while system reads region B, swap every frame.

### 2.3 Pool Allocator

```cpp
template <typename T>
class ObjectPool {
    std::vector<T> storage;                      // contiguous! cache-friendly
    std::vector<uint32_t> freeList;              // indices of free slots
    bit-vector inUse;                             // O(1) "is this handle alive?"
public:
    template <typename... Args> Handle<T> emplace(Args&&...);
    void release(Handle<T> h);
    T* get(Handle<T> h);                          // bounds-checked, generation-tagged
};
```

Keys: **contiguous storage** (iteration caches), **generation counter** in handle (`index:gen`) so a stale handle can't alias a reused slot, and O(1) alloc/free.

### 2.4 Free-List Allocator

Block-based: carve a big block into chunks; free nodes link as linked list. Variants: **first-fit** (find first chunk >= n), **best-fit** (smallest sufficient), segregated fits (size-class buckets to keep free-list traversal short). Used when you must free individually and can't pool.

### 2.5 Allocator Tagging & Bounds

Every allocator is 64-byte aligned, tags each block with a `MemoryTag` (bucketed cost attribution), and (in debug) fills freed memory with `0xDEADBEEF` and allocations with `0xCDCDCDCD` to catch use-after-free / uninitialized reads.

## 3. Cache-Aware Data Layout

### 3.1 The Cost Table

| Operation | ~cycles |
|-----------|---------|
| L1 cache hit | 4 |
| L2 hit | 14 |
| RAM (main memory) | ~200–400 |
| Cache miss chain (pointer chase) | 1000+ |

Layout beats algorithm at this scale: an O(n log n) with a perfect data layout will beat an O(n) with scattered pointers.

### 3.2 AoS vs SoA

```cpp
// AoS — bad for "iterate over all positions"
struct Entity { Vec3 pos; Vec3 vel; uint8_t hp; float score[8]; };
std::vector<Entity> entities;

// SoA — grepping a single attribute means touching 1/n of cache lines
struct EntityData {
    std::vector<Vec3> pos, vel;
    std::vector<uint8_t> hp;
    std::vector<float> score;   // [n][8]
};
```

Rules:
- Systems that read one field across many entities → SoA.
- Systems that touch the whole entity → AoS (or SoA within ECS archetypes where hot fields come first).
- **Hot fields first**: fight for the first 64 bytes of each struct.

### 3.3 Hot/Cold Splitting

Split the rarely-touched data out of the hot struct: `Transform` (hot: position/quaternion, 32 B) vs `TransformRuntime` (cold: parents, dirty flags). You halve cache pressure on the hottest path.

### 3.4 Cache Line Padding & False Sharing

Two threads writing different fields of the same cache line thrash the coherence protocol (~1000x cost). Fix: pad hot per-thread data to 64 bytes:

```cpp
struct alignas(64) PerThreadScratch {   // one per worker thread
    uint8_t data[4096];
};
```

### 3.5 Prefetching

`__builtin_prefetch` / `_mm_prefetch` reads ahead of the iteration cursor. Use off-by-N prefetch for streaming arrays. Prefetch distance ≈ `cacheLatency / perElementTime`, else you waste bandwidth pulling data you skip.

## 4. Memory Tracking & Debugging

### 4.1 Per-Subsystem Budgets

```cpp
struct MemoryTag {
    const char* name;
    size_t allocated, peak, highWater;
    size_t budget;                    // console certification target
    size_t allocCount, freeCount;     // leak = allocCount - freeCount != 0 at shutdown
};
MemoryTags[MemoryTag::COUNT];         // indexed by enum
```

### 4.2 Leak Detection

- At shutdown: every allocator reports `allocCount - freeCount`. Non-zero = leak with tag name + bytes.
- Debug fill patterns catch use-after-free early.
- **Advanced**: arena-level "impossible pointer" checks (`if (p < arena.start || p >= arena.end) trap()`).

### 4.3 Profiling Memory

Per-frame RSS, per-tag deltas, and an "allocation heatmap" (per-KB bytes) shown in the profiler's memory view. Flag: allocations in the render/input/update hot paths on a histogram.

### 4.4 Common FOAFs

| Bug | Symptom | Detection |
|-----|---------|-----------|
| Use-after-free | Random corruption, crash on unrelated code | Fill patterns + handle generation tags |
| Double free | Heap corruption | Canter allocators, guard bytes |
| Leak | RSS grows monotonically | Shutdown leak report |
| Fragmentation | Big allocs fail while free memory exists | Free-list stats, pool everything |

## 5. Virtual Memory & Huge Pages

### 5.1 vm/Virtual Reserve

Reserve a large virtual region (e.g., 64 GB) and commit lazily as touched. Console "reserve/commit" pattern gives the illusion of huge arrays without physical backing; commit only the working set.

```cpp
void* p = VirtualAlloc(region, 64GB, RESERVE, PAGE_READWRITE);  // Win32
// commit on demand: VirtualAlloc(p, size, COMMIT, ...) when a page is first written
```

### 5.2 Huge / Large Pages

Set `SetProcessWorkingSetSize` + memory manager flags, and `madvise(MADV_HUGEPAGE)` (Linux). 2 MB pages slash TLB misses for big streaming pools (texture streaming, voxel worlds). Watch: huge pages can't be swapped — don't give them a whole level's streaming.

### 5.3 Memory-Mapped Files

Map asset files directly (`mmap` / `CreateFileMapping`). OS lazily pages in the parts you touch. Perfect for read-only data that's streamed online (audio banks, streaming textures) — page-in on demand beats explicit `fread` of a 2 GB file.

## 6. GPU Memory Management

### 6.1 The GPU Memory World

| Type | Owner | Examples |
|------|-------|----------|
| Device-local | GPU VRAM | frames buffers, textures, RT acceleration |
| Host-visible | Reclaimable by driver | staging buffers, UBOs |
| Host cached | Readback path | occlusion queries, screenshot |

Two families: **dedicated VRAM** (discrete) and **unified** (console/mobile/APUs — carve device-local vs host-visible, don't bang the same region).

### 6.2 The 3 Memory Pools

1. **Staging** — CPU→GPU upload ring (persistent mapped + fence-cycled).
2. **Device-local** — the real resources; budgeted like CPU tags (`gpu-textures`, `gpu-render`.
3. **Transient** — per-frame GPU scratch grown against the frame's fence (`VK_MEMORY_PROPERTY_DEVICE_LOCAL`, suballocated by an arena inside the ring).

### 6.3 suballocation

Wrapping a large `VkDeviceMemory`/`D3D12Heap` in a block allocator (like `VulkanMemoryAllocator`): sub-allocate vs large contiguous allocations. Driver-level `vkAllocateMemory` calls are slow and fragment; a suballocator makes it O(1).

### 6.4 Persistent-Mapped Upload Ring

```cpp
// CPU writes frame N's vertices into a ring buffer; GPU reads up to frame N-2.
// Fences keep CPU ahead of GPU by exactly k frames.
struct UploadRing {
    void* mapped; size_t capacity; size_t frameOffsets[kInFlight];
    void* acquire(size_t n);   // bump, wrap around, wait fence if needed
    void  flush(Frame fence);  // record end offset for frame
};
```

### 6.5 Pooling & Resurrection

Create heavy GPU resources (pipelines, swapchains, descriptor heaps) once and bind — never per frame. Recycle transient resources after `k` frames through a "deferred free" queue.

## 7. Zero-GC-Pause Strategies

### 7.1 For Managed Runtimes (Unity C#/Mono/IL2CPP, Godot C#)

- Zero allocations in `Update`/`FixedUpdate` — cap at one per subsystem per 100 ms.
- Object pools for everything hot: bullets, particles, damage numbers.
- Avoid LINQ, allocations from boxing, and per-frame `string` building.
- Use `MemoryMarshal`/`unsafe` fast paths for hot arrays.
- Godot: the `Godot.Collections` types allocate; use C# arrays + `struct`s.

### 7.2 For Native (C++/Rust)

- No `new`/`malloc` after bootstrap except asset/streaming subsystems that already flow through arenas.
- Resize big buffers geometrically; never `realloc` mid-frame.
- Rust: `Vec`/`box` go through your allocator trait or a global allocator wrapper so stats stay accurate.

### 7.3 Generational GC vs Pooled

If you must keep a GC runtime, the strategy is to make the *live set tiny*: pool everything, keep zero refs to transient data, and let the GC collect a near-empty heap. GC pause scales with reachable objects, not with allocated-this-frame.

## 8. Allocator Selection Cheat Sheet

| Need | Choice |
|------|--------|
| Per-frame scratch, throwaway | Stack/bump allocator |
| Fixed-size hot objects (bullets, particles) | Object pool |
| One-shot region, built once | Arena |
| Mixed sizes, individual frees | Free-list / segregated fits |
| Big read-only assets | Memory-mapped files |
| CPU→GPU upload | Persistent mapped ring |
| Console/firm memory cert | Tagged budgets + leak report |

## 9. Design Checklist (Lead-Level)

Before merging, verify:

1. **Hot loops**: zero allocations, all through pools/arenas.
2. **Layout**: hot fields first, SoA where a system greps one column, cache-line padding on per-thread data.
3. **Budget**: every subsystem has a `MemoryTag` budget under the platform cap.
4. **Leaks**: shutdown report clean; debug fill patterns on.
5. **GPU**: staging ring + suballocator; no per-frame `vkAllocateMemory`/`CreateCommittedResource`.
6. **Managed runtimes**: pooling everywhere; GC pressure measured per frame (ms of GC time) and glued under 0.5 ms.

## 10. References

- `references/allocator-hierarchy.md` — stack/arena/pool/free-list implementations, block allocators, alignment math
- `references/cache-aware-layout.md` — AoS↔SoA, hot/cold splitting, false sharing, prefetch, brunch predictors
- `references/memory-tracking.md` — tags, budgets, leak detection, fill patterns, profiler integration
- `references/virtual-memory.md` — reserve/commit, huge pages, mmap, NUMA awareness
- `references/gpu-memory.md` — device-local vs host vs unified, staging rings, suballocation, deferred frees
- `references/gc-avoidance.md` — zero-GC patterns for C#/C++/Rust, pooling, strings, LINQ traps