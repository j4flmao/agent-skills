---
title: Allocator Hierarchy Implementations
description: Stack, arena/bump, pool, free-list, segregated-fit and block allocator implementations with alignment math and real usage in game engines.
---

# Allocator Hierarchy — Deep Reference

## 1. Core Mechanics

### 1.1 Alignment Math

A pointer returned by any allocator must satisfy `(uintptr_t)p % alignment == 0`. To align an offset `n` up to `a`:

```cpp
size_t AlignUp(size_t n, size_t a)   { return (n + a - 1) & ~(a - 1); }
size_t AlignDown(size_t n, size_t a) { return n & ~(a - 1); }
```

If you must return an aligned pointer from a raw allocation, overallocate by `a` and store the true base before the aligned pointer:

```cpp
void* base = malloc(n + a);
uintptr_t aligned = AlignUp((uintptr_t)base + a, a);   // room for the header
((void**)aligned)[-1] = base;                          // header behind aligned p
// free(base) when done
```

### 1.2 The Allocator Interface

Real engines define a single interface every allocator implements:

```cpp
struct IAllocator {
    virtual void* Allocate(size_t bytes, size_t align = 16) = 0;
    virtual void  Free(void* ptr) = 0;
    virtual size_t AllocatedBytes() const = 0;   // stats
    virtual const char* Name() const = 0;        // allocation tag
    virtual ~IAllocator() = default;
};
```

The interface lets the engine swap a frame allocator for a leak-checking allocator in debug builds (an `IAllocator*` in a global `gMemory`). The Dev-build wraps every `Allocate` with full callstack capture for profiling.

## 2. Stack / Frame Allocator

```cpp
class StackAllocator final : public IAllocator {
    uint8_t* base_; size_t capacity_; size_t top_ = 0;
public:
    StackAllocator(size_t cap) : base_((uint8_t*)aligned_alloc(64, cap)), capacity_(cap) {}
    void* Allocate(size_t n, size_t a) override {
        size_t p = AlignUp(top_, a);
        if (p + n > capacity_) return nullptr;      // no growth by design
        top_ = p + n; return base_ + p;
    }
    void Free(void*) override { /* no-op — reset() only */ }
    size_t AllocatedBytes() const override { return AlignUp(top_, 64); }
    void reset() { top_ = 0; }
    ~StackAllocator() { std::free(base_); }
};
```

Key point: **Free is a no-op**. Memory is reclaimed all at once with `reset()` at the end of a frame (or scope). Any code holding a pointer past the reset is using freed memory — hence arena ownership rules.

### Nesting

Because frees are no-ops, a stack allocator naturally supports LIFO scoping:

```cpp
void Scope() {
    auto* mark = scratch.mark();        // top_
    drawVertices = scratch.Allocate(...);
    { auto* mark2 = scratch.mark(); }   // inner scope
    scratch.unmark(mark);               // pop back
}
```

## 3. Arena / Bump Allocator

Monotonic — used once, never freed until reset. Differentiated from stack by intent: stack = scratch, arena = a whole region built once. Implementations often add double-buffering:

```cpp
class DoubleBufferedArena {
    StackAllocator arenas[2]; int write_ = 0;
public:
    void* Allocate(size_t n, size_t a) { return arenas[write_].Allocate(n, a); }
    void swap() { arenas[write_].reset(); write_ ^= 1; }  // old becomes scratch, new becomes target
};
```

Classic use: the renderer builds a command list into arena A while the GPU still reads arena B; swap per frame.

## 4. Pool Allocator

### 4.1 First-Principles Pool

Fixed-size slots, bitmap `inUse`, free stack of indices:

```cpp
class PoolAllocator {
    uint8_t* storage_; size_t slotSize_, slotCount_;
    std::vector<uint32_t> freeList_; std::vector<uint8_t> inUse_;
public:
    void* Allocate(size_t n, size_t a) override {
        ASSERT(n <= slotSize_ && a <= slotSize_);
        if (freeList_.empty()) Extend();               // grow linearly
        uint32_t i = freeList_.back(); freeList_.pop_back();
        inUse_[i] = 1; return storage_ + i * slotSize_;
    }
    void Free(void* p) override {
        uint32_t i = IndexOf(p); inUse_[i] = 0; freeList_.push_back(i);
    }
    void Extend() { /* grow storage_ by slab; push new indices to freeList_ */ }
};
```

### 4.2 Growing Pools

Pools grow by **slabs** (arrays of slots) to keep storage contiguous. Growth is transactional (never mid-frame); the pool records a `growMutex` for cross-thread safety if needed.

### 4.3 Empties & Stale Handles

Pools are the classic place where "use after free" becomes an alias. Add a **generation counter** if the pool returns handles:

```cpp
struct PoolHandle { uint32_t index : 22; uint32_t gen : 10; };
// slot: { void* data; uint32_t gen; }
PoolHandle Allocate();  // slot.gen = (slot.gen + 1) & 0x3FF
bool IsValid(PoolHandle h) const { return slots_[h.index].gen == h.gen; }
```

A stale handle carries the old generation → `IsValid` fails. 10 bits → 1024 reuses before wrap-around, tuned to the pool's churn rate.

## 5. Free-List Allocator

### 5.1 Block-Split Free List

```cpp
struct FreeBlock { size_t size; FreeBlock* next; };
class FreeListAllocator {
    FreeBlock* head_;
public:
    void* Allocate(size_t n, size_t a) {
        size_t need = n + alignAdjust; 
        FreeBlock** pp = &head_;
        while (*pp) {
            FreeBlock* b = *pp;
            if (b->size >= need) {
                // split if enough room for a new block
                if (b->size >= need + sizeof(FreeBlock) + 16) {
                    FreeBlock* rest = (FreeBlock*)((char*)b + need);
                    rest->size = b->size - need; rest->next = b->next;
                    *pp = rest;
                } else { *pp = b->next; }   // take whole block
                return (char*)b + alignAdjust;
            }
            pp = &b->next;
        }
        return nullptr;   // grow from system-through-more-blocks in practice
    }
    void Free(void* p) {
        FreeBlock* b = (FreeBlock*)((char*)p - alignAdjust);
        b->next = head_; head_ = b;         // push-front: coalesce later
    }
};
```

### 5.2 Coalescing

Adjacent free blocks should merge on free (prev/next neighbors) to avoid fragmentation. Embedded-lists only coalesce if you can find the neighbor — real free-lists keep a doubly-linked block header with a sorted "free by address" structure, or defer coalescing to a `compact()` pass.

### 5.3 Segregated-Fit

The performance killer is walking a long free list. Segregated fit buckets by size class:

```
size class 0:  [0, 8)       -> bucket[0]
size class 1:  [8, 16)      -> bucket[1]
...
size class k:  [2^k, 2^(k+1)) -> bucket[k]
```

Alloc: round request up to class, pop free slot from that bucket (O(1) if any). No buckets available → grow from a larger class or the system. Powers-of-two classes waste up to 2x; use size classes like `[16,24,32,48,64,...]` (as used by Linux SLAB / jemalloc) to trade waste vs speed.

## 6. jemalloc / tcmalloc-style

Production engines on PC often route "rare, big, cross-thread" allocations through **jemalloc** (Firefox, Rust default) or **tcmalloc** (Chrome) rather than glibc malloc:
- Per-thread caches (tcache / thread cache) → no lock contention on common path.
- Size-class bins + bin mutex per class.
- Arenas for NUMA.

If the engine is mostly pooled/arena anyway, these only matter for the tail of allocations.

## 7. Thread-Safety of Allocators

| Allocator | Thread-safe? | Strategy |
|-----------|--------------|----------|
| Stack/arena | No (per-thread only) | One scratch per worker thread (`thread_local`) |
| Pool | Optional | Per-thread slot caches + global slabs |
| Free-list | Optional | Lock per bucket; thread_cache |
| System heap | Yes | — but slow, fragmented |

Pattern: **per-thread scratch arena + shared global pools**. The job system hands each worker its own `ScratchAllocator` (16 KB stack) for transient job data.

## 8. Allocation Statistics & Nagging

Each allocator reports: `allocBytes`, `peakBytes`, `allocCount`, `freeCount`, `growthEvents`. The evaluator/CI flags:
- Any growth mid-frame (login: pool `reserve()` at startup, not in gameplay).
- `allocBytes/capacity` under 60% = wasted platform memory.
- Alloc/free churn per frame ticked in the profiler timeline.

## 9. Real-World Layout Cheat Sheet

| Engine | Front-line allocators |
|--------|----------------------|
| Unreal | `FMemory`, `FMallocBinned` (segmented bins), `FMemory::Malloc` tagged by `FMalloc` |
| Unity (Native) | Internally pooled + `MemoryManager`; C# goes through IL2CPP GC |
| Godot (C++) | `memnew`→`Memory::alloc_static` (default O/S alloc; pools for Servers) |
| OGRE/Doom-era | arena per subsystem + frame-back of `FrameAllocator` |

## 10. Pitfalls to Avoid

1. **Returning raw `new` from an allocator-**breaking the interface means you can't count/tag.
2. **Pooling everything with large sizes** — pools waste on big allocations; route big ones to free-list/mmap.
3. **Forgetting alignment on SIMD types** — `float4` needs 16 B, `mmap` page 4 KB; the allocator must know.
4. **Growing pools mid-frame** — a 10 MB slab alloc during a gameplay tick = a frame spike. Pre-reserve.
5. **Cross-thread pool without guards** — index races corrupt the pool. Per-thread slots or lock.