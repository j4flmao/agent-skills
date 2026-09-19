---
title: Memory & Pooling Patterns
description: Arena allocators, object pools, free lists, cache-friendly layout, GC avoidance, and allocator strategy for game engines.
---

# Memory & Pooling — Deep Reference

## 1. Why Memory Matters in Games

- **GC spikes**: Managed code (C#, Java, Unity) stops the world — a 15 ms GC pause destroys frame time.
- **Fragmentation**: Many small allocations over time fragment the heap; large chunks fail.
- **Cache misses**: Every pointer-chase costs ~100 cycles vs ~4 for a cache hit.
- **Allocator contention**: Concurrent allocs across threads serialize on the heap lock.

The fix: **bounded, reusable, contiguous memory** per subsystem.

## 2. The Allocator Hierarchy

```
System heap (malloc / new)
   ├── Stack allocator       (per-frame scratch — O(1) reset)
   ├── Arena/Pool allocator  (fixed block sizes, no fragmentation)
   ├── Free-list allocator   (variable sizes, defers dealloc)
   └── Object pools          (dedicated recycling for hot objects)
```

### Stack Allocator

```cpp
class StackAllocator {
    std::vector<char> buffer;
    size_t top = 0;
public:
    void* alloc(size_t n) {
        size_t aligned = (top + 15) & ~size_t(15);
        void* p = &buffer[aligned];
        top = aligned + n;
        return p;
    }
    void reset() { top = 0; }       // free everything at once
};
```

Perfect for per-frame scratch: collision pairs, render command lists, input events.

### Free-List

```cpp
// Nodes are carved from a pre-allocated block; popped in O(1)
struct FreeListNode { FreeListNode* next; };

class FreeList {
    void* start; FreeListNode* head;
public:
    explicit FreeList(size_t nodeSize, size_t count) {
        void* block = malloc(nodeSize * count);
        head = static_cast<FreeListNode*>(block);
        for (size_t i = 0; i < count - 1; ++i)
            ((FreeListNode*)block + i)->next = (FreeListNode*)block + i + 1;
        ((FreeListNode*)block + count - 1)->next = nullptr;
        start = block;
    }
    void* alloc() { auto* p = head; head = head->next; return p; }
    void  free(void* p) { auto* n = static_cast<FreeListNode*>(p); n->next = head; head = n; }
};
```

## 3. Object Pools in Depth

### Design Requirements

1. Pre-allocate capacity at startup.
2. `acquire()` returns a free slot; `release()` returns it.
3. No per-acquire heap allocations.
4. Optionally: zero initialization, re-init on acquire.

### Pool with Entity-style indices

```cpp
template<typename T>
class Pool {
    struct Slot { T value; uint8_t flags; };
    std::vector<Slot> slots;
    std::vector<uint32_t> freeQueue;      // indices of free slots
public:
    explicit Pool(size_t cap) : slots(cap) {
        for (size_t i = cap; i-- > 0;) freeQueue.push_back(i);
    }
    uint32_t acquire() {
        uint32_t idx = freeQueue.back(); freeQueue.pop_back();
        slots[idx].flags = 1;
        return idx;
    }
    T& get(uint32_t idx) { return slots[idx].value; }
    void release(uint32_t idx) { slots[idx].flags = 0; freeQueue.push_back(idx); }
};
```

### Unity: Avoid GC spikes

```csharp
public class SimplePool : MonoBehaviour {
    public GameObject prefab;
    readonly Stack<GameObject> inactive = new();

    public GameObject Get() {
        GameObject g = inactive.Count > 0 ? inactive.Pop() : Instantiate(prefab);
        g.SetActive(true);
        return g;
    }
    public void Release(GameObject g) {
        g.SetActive(false);
        inactive.Push(g);
    }
}
```

## 4. Cache-Friendly Data Layout

### Goal: iterate hot data sequentially

```
BAD:  vector<Enemy*>       → dereference each → scattered pages
GOOD: vector<Enemy>        → contiguous objects
BEST: SoA structs          → separate arrays per field
```

### Padding headaches

Pack structs: reorder fields by alignment.

```cpp
// 24 bytes (with padding) vs 16 bytes (packed)
struct DSLight { glm::vec3 pos; float radius; glm::vec3 color; float intensity; };
```

Use `#pragma pack(push, 1)` only in serialization boundaries; in hot arrays keep natural alignment but order fields to reduce padding waste.

### False sharing

Two threads touching different fields of the same cache line thrash. Pad per-thread accumulators to 64 B line boundaries.

```cpp
struct alignas(64) ThreadCounter { uint32_t count; uint8_t pad[56]; };
```

## 5. Managed Frameworks: The C#/Unity Lesson

- Prefer structs + `INativeArray` (DOTS) to managed classes.
- Pool everything transient.
- Avoid LINQ, string concat in hot loops (hidden allocation).
- Use `ObjectPool<T>` or custom pooling for bullets/particles.
- Unity ECS + Burst avoids GC entirely (managed heap only for editor).

## 6. Allocator Selection Decision Tree

```mermaid
%%{init: {"theme": "default", "flowchart": {"useMaxWidth": true}}}%%
flowchart TD
    A{Fixed size objects?} -->|Yes| B[Object Pool]
    A -->|No| C{Same size requests, many?} -->|Yes| D[Free-list]
    C -->|No| E{Per-frame scratch?} -->|Yes| F[Stack/Arena]
    E -->|No| G[System heap, but profile]
    B --> H[Reuse via acquire/release]
    D --> I[Pre-allocated blocks]
    F --> J[reset() each frame]
```

## 7. Memory Budgets (Console/Game Logic)

| Subsystem | Typical budget @ 60 FPS |
|-----------|------------------------|
| Simulation world state | 10–30 MB |
| Rendering (GPU upload) | 50–200 MB |
| Physics working set | 5–20 MB |
| Streaming (assets) | 100+ MB budgeted, per-scene |
| Scratch (per-frame) | < 1 MB (arena reset each frame) |

## 8. Leaks & Detection

- Always `AddressSanitizer`/`VTune`/`RenderDoc` leak checks in dev.
- Reference-count assets with a cache, not raw leaks.
- Track ownership: `unique_ptr` where relevant, pools own their storage.

## 9. Rules for Memory Work

1. No new/malloc in per-frame hot paths.
2. Preallocate pools at scene load.
3. Use arena for scratch; reset every frame.
4. Keep hot arrays contiguous & packed.
5. Profile allocation counts (not just time) — an allocator showing thousands of small allocs per second is a red flag.
6. Document ownership: who frees what, when.