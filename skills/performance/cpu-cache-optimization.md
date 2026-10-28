# CPU Cache Optimization & False Sharing

## 1. Skill Context
**Focus**: Structuring memory layout to match how CPU caches work (mechanical sympathy).
**Triggers**: cache-line, false-sharing, memory-alignment, cpu-cache.

## 2. Cache Lines
CPUs move memory in cache lines: 64 bytes on x86-64 and most ARM cores, 128 bytes on Apple M-series. Reading one 4-byte `int` loads its whole line.
- **Locality**: Iterating an aligned `int` array uses all 16 values in each 64-byte line, and the hardware prefetcher streams the next lines ahead. Linked lists and pointer-heavy trees scatter nodes across memory, so each hop can miss the cache.
- **Layout**: Order struct fields to avoid padding holes, split hot and cold fields, and use struct-of-arrays for loops that touch only a few fields.
- **Measure**: Use `perf stat -e cache-misses,cache-references`, `perf c2c` (false sharing), VTune, or Instruments before and after a change.

## 3. False Sharing
```c
struct Stats { long thread1_count; long thread2_count; }; /* same cache line */
```
Thread 1 writes `thread1_count` on core 1 while thread 2 writes `thread2_count` on core 2. The coherence protocol (MESI and its variants) must move ownership of the **whole line** between the cores on every write, so both threads slow down even though they never touch the same variable.
- **Fix**: Put each hot, independently-written variable on its own cache line:
  ```cpp
  struct alignas(64) PaddedCounter { std::atomic<long> value; };
  // C++17: std::hardware_destructive_interference_size (where the compiler provides it)
  ```
  - Java: `@jdk.internal.vm.annotation.Contended` (needs `-XX:-RestrictContended`) or manual padding.
  - Rust: `crossbeam_utils::CachePadded`.
  - Some Intel CPUs prefetch cache lines in adjacent pairs, so 128-byte padding is safer for the hottest counters.
- **Better**: Avoid sharing entirely. Use per-thread counters and sum them on read.
