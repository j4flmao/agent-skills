---
title: Virtual Memory and OS Memory Strategies
description: Reserve/commit, huge pages, memory-mapped files, NUMA awareness and OS memory APIs for game engines.
---

# Virtual Memory & OS Memory — Deep Reference

## 1. Virtual Memory Basics for Engines

The OS gives each process a 64-bit virtual space; physical RAM backs pages on demand. Two operations that matter to engines:

```cpp
// Windows
void* p = VirtualAlloc(nullptr, 64GB, MEM_RESERVE, PAGE_READWRITE);  // virtual only
VirtualAlloc(p, 16KB, MEM_COMMIT, PAGE_READWRITE);                   // back with physical pages

// POSIX
mmap(nullptr, 64GB, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_ANONYMOUS, -1, 0);  // reserve
mprotect/read-touch commits                                     // commit on touch
```

The **reserve/commit** split means a huge virtual buffer costs nothing until touched.

## 2. Reserve/Commit Patterns

### 2.1 The Ring Grows in Virtual Space

Reserve 64 GB virtual; commit pages as the working set grows. The engine's streaming pools, level arenas, and voxel worlds use this — virtual reserve gives "free" growth, physical pages only for live data.

```cpp
class VirtualRing {
    void* base_; size_t reserved_;
    size_t committed_ = 0;
    void* acquire(size_t n, size_t align) {
        // grow committed_ when crossing into unwritten pages
    }
};
```

### 2.2 Commit Paging Throttle

Committing a page is a system call; heavy commit churn mid-frame spikes. Strategy: pre-commit a 16 MB runway when the ascending watermark approaches the committed boundary, and decommit lazily (postpone to frame end).

## 3. Huge / Large Pages

- Windows: `VirtualAlloc` with `MEM_LARGE_PAGES` (+ `SeLockMemoryPrivilege`).
- Linux: `mmap` + `madvise(MADV_HUGEPAGE)` or `MAP_HUGETLB`.
- Default pages 4 KB; huge pages 2 MB (x86).

Gains: fewer TLB entries for large contiguous working sets → fewer TLB misses → big win for:
- Texture/asset streaming pools.
- Large procedural worlds (voxel chunks).
- Whole level arenas.

Costs/risks:
- Huge pages are **unswappable** — a 4 GB huge-page level can push the OS to junk-LRU everything else.
- Not all systems grant permission; feature-detect.

```cpp
static bool s_hugePages = IsHugePagesAvailable();
void* allocForStreaming(size_t n) {
    return s_hugePages ? VirtualAlloc(n, MEM_LARGE_PAGES) : VirtualAlloc(n, MEM_COMMIT);
}
```

## 4. Memory-Mapped Files

`mmap`/`CreateFileMapping` maps a file's bytes into the virtual space; the OS pages them on touch, evicts by LRU. Perfect for read-only assets:

```cpp
int fd = ::open("bank.pak", O_RDONLY);
void* p = mmap(nullptr, n, PROT_READ, MAP_PRIVATE, fd, 0);
// touch p[0..k] → OS brings those pages in on demand; no explicit fread
```

### 4.1 Tactics

- Map a 2 GB asset bank; the OS only loads the touched parts at app start.
- `mlock`/`VirtualLock` a small hot region (level start) to pin it.
- Advise sequential (`madvise(MADV_SEQUENTIAL)`) for streaming reads, random for scattered access.
- Windows: `MapViewOfFile` is equivalent; FS cache keeps read-heavy pages.

### 4.2 Watch-Outs

- A mapped file shares the OS page cache — a 4 GB map in a 8 GB machine evicts other processes.
- Mapped writes that the game then reads need fences (cache coherency) on some platforms.
- Unmap on level unload so the file handle closes and pages return.

## 5. NUMA Awareness (Servers / HPC / Large Worlds)

Multi-socket machines (devops game servers) have memory *local* to each CPU. A thread on socket 0 touching socket 1's memory pays ~2x. Numactl and NUMA-aware allocators (`mbind`, `set_mempolicy`) let you pin:
- Per-socket job workers → per-socket arenas.
- Textures/assets on the socket closer to the render/stream thread.

Engines rarely go NUMA for a single game instance; it matters most in **dedicated server farms** and **simulation clusters**.

## 6. The Address-Space Budget Dashboard

Per-subsystem:

```
Region              Virtual  Physical  HighWater  Huge?
  Streaming pool     64 GB     1.2 GB   1.4 GB     Yes
  Level arena        16 GB     380 MB    512 MB    No
  Voxel world       128 GB     240 MB   2.1 GB     Yes
```

The dashboard tells you whether a system is "virtual-hungry but physical-light" (good, defer cheap) or "physical-hungry" (bad, watch the budget).

## 7. Pitfalls

1. **Huge pages for everything** — unswappable + permission gates; target streaming only.
2. **VirtualAlloc in hot loop** — commit is a syscall; pre-commit runways.
3. **mmap of mutable data** — page cache coherency surprises; use for read-only.
4. **Not watching commit growth** — reserve counts as nothing until touched; a runaway writer silently expands physical usage.
5. **Windows `VirtualAlloc` vs `HeapAlloc` vs `malloc`** — each hits different paths; keep one policy per subsystem.
6. **Forgetting `VirtualFree`/`munmap` on unload** — rocks into process RSS.

## 8. When to Reach for OS Memory APIs

| Need | API |
|------|-----|
| Big virtual arena that grows | `VirtualAlloc(RESERVE)` + commit |
| Read-only, streamed, lazily paged | `mmap` / `CreateFileMapping` |
| TLB pressure on large working set | huge pages (2 MB) |
| 2-socket server locality | NUMA allocator / `mbind` |
| Page-level trap for debugging | guard pages + `mprotect`