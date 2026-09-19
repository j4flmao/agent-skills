---
title: Memory Tracking and Debugging
description: Per-subsystem tags and budgets, leak detection, fill patterns, use-after-free tracking, and profiler integration for game engines.
---

# Memory Tracking & Debugging — Deep Reference

## 1. Why Track Memory

Frameless engines hide memory drift: RSS grows 1 MB/frame and you don't know whose fault. Consoles have **hard cert budgets** — a title that exceeds the firmware cap fails certification. Tracking per subsystem is the difference between "some build leaks" and "physics leaked 4 MB this level".

## 2. Tagged Allocation

### 2.1 The Tag Enum

```cpp
enum class MemoryTag : uint8_t {
    AI, Animation, Audio, Asset, Collision, Font, Gameplay, GPUResources,
    JobSystem, Network, Physics, Render, Scripting, Streaming, UI, Voxel, Count
};
```

Every `Allocate` carries a tag. The allocator stamps it into the block header (`MemoryHeader`):

```cpp
struct MemoryHeader {
    uint32_t size;
    MemoryTag tag;
    uint32_t alignment;
    uint32_t magic;        // 0xA11C for alloc, 0xF0C1 for free
    uint64_t callstack;    // capture in dev builds
};
```

### 2.2 Cost Attribution

Tag → per-frame accounting:

```cpp
struct TagStats {
    size_t bytes; size_t peakBytes; size_t highWater;
    size_t allocs, frees; float costMs;   // cost = bytes/cacheline-loss estimate
};
TagStats g_stats[underlying(MemoryTag::Count)];
```

## 3. Budgets & Certification

### 3.1 Budget Planning

At engine load: every subsystem declares `MemoryTag::Render maximum : 1.5 GB`, `MemoryTag::Assets : 4 GB`, operating against the platform ceiling (`consoleFirmwareLimit - OSReserve - FreeHeadroom`). Budgets are **enforced** in dev (assert) and checked at cert time.

### 3.2 Budget Exceeded Protocol

1. Dev: hard assert at 100%, warn at 90% ("Physics at 94% of budget").
2. Automated: CI loads a full level, runs an AI stress loop 10 min, asserts tag peaks under budget.
3. Ship: the dashboard shows per-tag used vs budget on every nightly build.

## 4. Leak Detection

### 4.1 Shutdown Report

At exit, each allocator prints:

```
[MemoryReport] Physics      : 245 MB peak, 1,204 allocs, 1,190 frees  →  LEAK 14 allocs
[MemoryReport] Render       : 1,820 MB peak, 5,221 allocs, 5,221 frees →  clean
```

`allocs - frees != 0` = leak; walk per-allocation callstacks to find origin.

### 4.2 Fill Patterns

| Value | Meaning |
|-------|---------|
| `0xCDCDCDCD` | newly allocated, never written |
| `0xDDDDDDDD` | on free (freed memory) |
| `0xCCCCCCCC` | stack space (MSVC) |
| `0xFDFDFDFD` | guard bytes past allocation |
| `0xDEADBEEF` | freed + poisoned |

Reading `0xCDCDCDCD` → uninitialized read. Reading `0xDDDDDDDD` → use-after-free. Guard bytes past the end → overrun (the guard is checked on free).

### 4.3 Use-After-Free with Generations

As covered in `allocator-hierarchy.md`: each slot stores `gen`; a freed slot's `gen` bumps. Handles store `(index, gen)`; a stale handle's gen mismatches → `IsValid` false. Intrusive versioning per object type can also trap early.

### 4.4 Guard Pages

For rare super-aggressive cases: allocate near a guard page so an overrun or use-after-free faults instantly (used in debug builds for streaming buffers).

## 5. Profiler Integration

### 5.1 The Memory View

Per-frame widget shows:

```
Memory   Used 1.86 GB / peak 1.94 GB
  Physics    245 MB   ████████░░   84%  +2 MB/frame
  Assets     1.20 GB  ██████████░  92%
  GPU        820 MB   ███████░░░░  63%
```

Color-coded growth alerts flag the +2 MB/frame physics before it eats the budget.

### 5.2 Allocation Heatmap

Bucket the heap into 4 KB pages, color by allocator tag; visual inspection reveals "hot" pages (many tags interleaved) = helper to spot page thrash.

### 5.3 Callstack Capture (Dev Only)

Capture all but the hottest allocations' callstacks; a "leak" report resolves to 4 functions instead of "you're leaking somewhere". Cost: ~100 ns/alloc — Dev builds only.

## 6. Common Bugs & Detection Cues

| Bug | Tell | Check |
|-----|------|-------|
| One-frame leak | RSS +K/frame constant | shutdown diff or peak drift |
| Overrun | Corrupts neighbor data | guard bytes, `-fsanitize=address` |
| Underrun | Corrupts header | header magic check |
| Use-after-free | `0xDD` reads, random crash | fill patterns, generations |
| Double-free | Heap-crash on second `Free` | magic check on `Free` |
| Cross-thread free | Races, intermittent | per-thread slab + ownership assert |

## 7. Tooling Matrix (Native)

| Tool | Catches | Cost |
|------|---------|------|
| ASan (`-fsanitize=address`) | OOB, use-after-free, leaks | ~2x slow, Dev only |
| Valgrind memcheck | Same, plus uninitialized | ~20x slow, CI-only spot checks |
| DRD / helgrind | Data races on memory | sluggish, occasional |
| Built-in fill patterns | Cheap, always-on Dev | near zero |
| Custom leak report | Per-tag at exit | near zero |

## 8. Managed-Runtime Memory Tracking

For C# (Unity/Godot) / Java / Lua scripts:
- Track allocations that *pass through the engine boundary* (all script `new` pooled).
- Per-frame GC time as a metric (Unity `GC.GetTotalMemory(false)` delta + profiler).
- Track "script allocations per alloca" — the classic `new Vector2` in `Update` for 10k entities.

## 9. Making It a Habit

1. `ALLOCATOR_LOG` in Dev logs every subsystem's peak on level unload.
2. Nightly CI asserts: `peak(Physics) < budget(Physics)`, `leaks == 0`.
3. Console cert checklist includes a memory "budget table" sign-off.
4. Frame profiler memory view must be *always green* in a normal run.