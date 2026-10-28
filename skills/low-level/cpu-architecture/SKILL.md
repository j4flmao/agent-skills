---
name: cpu-architecture
description: >
  Use this skill when the user says 'CPU pipeline', 'branch prediction', 'branch misprediction', 'out-of-order execution', 'superscalar', 'cache miss', 'false sharing', 'memory ordering', 'SIMD', 'TLB', 'hardware performance counters', 'perf stat', 'microarchitecture', 'why is this loop slow'. Explains how modern x86-64 and ARM64 cores execute code and turns that into concrete optimisation steps: pipelines and OoO, branch prediction, cache hierarchy and coherence, memory ordering, SIMD, TLBs, and measurement with hardware counters. Do NOT use for: compiler internals (use compiler-design), OS kernel design (use kernel-development), GPU programming.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [low-level, cpu, microarchitecture, cache, performance, simd]
---

# CPU Architecture and Microarchitecture

## Purpose
Code that looks sequential runs on superscalar, out-of-order, speculative cores behind a deep cache hierarchy. Performance problems are usually memory access patterns, unpredictable branches or dependency chains, not instruction counts. This skill explains those mechanisms and how to measure them before changing code.

## Agent Protocol

### Trigger
"CPU pipeline", "branch prediction", "out-of-order", "superscalar", "cache miss", "false sharing", "memory ordering", "SIMD", "TLB", "performance counters", "perf stat", "microarchitecture".

### Input Context
- CPU (vendor, generation) and OS; compiler and flags
- The hot code (from a profiler), data sizes and access pattern
- Existing measurements (time, `perf stat`, VTune/uProf/Instruments output)

### Output Artifact
Diagnosis tied to a hardware mechanism, measurement commands, and a code change. No file unless requested.

### Response Format
```
Symptom: {what was measured}
Mechanism: {e.g. L2 miss bound, branch mispredicts, dependency chain, false sharing}
Evidence: {counter values / profile lines}
Change: {code or layout change}
Expected effect + how to verify: {counter to re-check}
```

## 1. Execution Model
- **Pipeline**: fetch → decode (x86 instructions → micro-ops, often from a µop cache) → rename/allocate → schedule → execute → retire in program order. Front ends are 4–8+ wide on current cores.
- **Out-of-order**: instructions whose inputs are ready execute early; a reorder buffer of a few hundred entries retires them in order. Long-latency loads are overlapped with independent work — but only up to ROB/load-buffer capacity.
- **Dependency chains** limit speed: `sum += a[i]` serialises on floating-point add latency (~3–4 cycles); multiple accumulators break the chain:
```c
double s0 = 0, s1 = 0, s2 = 0, s3 = 0;
for (size_t i = 0; i + 4 <= n; i += 4) { s0 += a[i]; s1 += a[i+1]; s2 += a[i+2]; s3 += a[i+3]; }
double s = (s0 + s1) + (s2 + s3);   /* changes FP rounding order: only where acceptable */
```

## 2. Branch Prediction
- Predictors learn patterns and history; a mispredict flushes speculative work, costing roughly 10–20+ cycles on modern cores.
- Data-dependent unpredictable branches in hot loops hurt. The classic demonstration: filtering `if (x >= 128)` over random bytes is several times faster after sorting the data, because the branch becomes predictable.
- Fixes: sort/partition data, make code branchless (`cmov`/`select`, masks, SIMD compares), or restructure so the common case is a straight line. Check that the compiler actually emitted a branchless form.
- Indirect branches (virtual calls, switch tables) are predicted too; megamorphic call sites mispredict.

## 3. Memory Hierarchy
| Level | Typical size per core | Typical latency |
|-------|----------------------|-----------------|
| L1D | 32–64 KB (128 KB on Apple P-cores) | ~4–5 cycles |
| L2 | 512 KB–2 MB (shared per cluster on some ARM designs) | ~12–16 cycles |
| L3 / SLC | several MB to 100+ MB shared | ~30–70 cycles |
| DRAM | GBs | ~70–120 ns (hundreds of cycles) |

Numbers vary by chip; measure with a pointer-chasing benchmark if they matter.

- Cache line = 64 bytes on x86 and most ARM cores, 128 bytes on Apple M-series. Access is per line: touching one byte loads 64.
- Hardware prefetchers detect sequential and strided streams; pointer chasing defeats them.
- Layout rules: contiguous arrays over linked structures; structure-of-arrays for loops that touch one field; hot/cold splitting; tile loops (blocking) so the working set fits in L1/L2.
- See `references/cache-hierarchy.md` for coherence and inclusive/exclusive designs.

## 4. Coherence and False Sharing
- MESI-family protocols (MESIF on Intel, MOESI on AMD) keep caches coherent per line. Two cores writing different variables in the same line ping-pong it between caches (false sharing).
- Fix: pad/align per-thread data to the line size (`alignas(64)` or `std::hardware_destructive_interference_size`), or accumulate thread-locally and combine at the end.

## 5. Memory Ordering
- x86-64 is TSO: stores are not reordered with other stores, loads not with loads, but a later load can pass an earlier store to a different address (store buffer).
- ARM64 is weakly ordered: loads and stores can be reordered; use acquire/release (`LDAR`/`STLR`) or barriers (`DMB`).
- Write portable code with the language memory model (`std::atomic` with `memory_order_acquire/release`, Rust `Ordering`), never by relying on x86 behaviour.

## 6. SIMD
- x86: SSE (128-bit), AVX/AVX2 (256-bit), AVX-512 (512-bit, available on server parts and AMD Zen 4/5; absent on most Intel client chips since Alder Lake). ARM: NEON (128-bit), SVE/SVE2 (scalable vectors, e.g. Graviton, Neoverse cores).
- Let the compiler auto-vectorise first (`-O3 -march=native` for local tests, explicit target levels like `-march=x86-64-v3` for distribution); check with `-Rpass=loop-vectorize` (Clang) or `-fopt-info-vec` (GCC).
- Obstacles: aliasing (use `restrict`), non-contiguous access, loop-carried dependencies, function calls inside the loop, mixed types.
- Ship runtime dispatch (CPUID / `__builtin_cpu_supports`, function multiversioning) when targeting mixed fleets.

## 7. Virtual Memory and the TLB
- Every access translates virtual → physical through the TLB; a miss walks the page tables (hardware page walker, cached in paging-structure caches).
- Large working sets with random access thrash the TLB; 2 MB/1 GB huge pages raise TLB reach (Linux THP, `madvise(MADV_HUGEPAGE)`, hugetlbfs).
- See `references/tlb-and-paging.md`.

## 8. Measuring
```bash
perf stat -e cycles,instructions,branches,branch-misses,cache-references,cache-misses ./app
perf stat -M TopdownL1 ./app          # Top-down level 1 on supported Intel/AMD CPUs (recent perf)
perf record -g ./app && perf report   # where cycles go
```
- IPC (instructions/cycle) well below the core's width with high cache-miss rates → memory bound; high branch-miss ratio → speculation bound.
- Top-down method (Yasin): frontend bound / bad speculation / backend (memory vs core) bound / retiring — tells you which section above to read.
- Tools: Linux `perf`, Intel VTune, AMD uProf, Apple Instruments (CPU Counters), Arm Streamline; microbenchmarks with Google Benchmark, nanobench.
- Pin frequency (or report it), warm up, repeat runs, and check variance before trusting a speed-up.

## 9. Security Side Notes
Speculative execution leaks (Spectre variants, Meltdown) led to mitigations (retpolines, IBRS/eIBRS, KPTI, `lfence` barriers) that cost performance on syscall-heavy or indirect-branch-heavy code; know whether they are enabled when benchmarking (`/sys/devices/system/cpu/vulnerabilities/`).

## 10. Anti-Patterns
- Micro-optimising instruction count while the loop is DRAM bound.
- Quoting a speed-up from one run on a laptop with turbo and thermal throttling.
- `volatile` or inline asm to "prevent reordering" instead of atomics.
- Assuming x86 ordering in code that will run on ARM servers or Apple silicon.

## 11. Checklist
- [ ] Hot spot found with a profiler, not guessed
- [ ] Counters identify the bound (memory, branch, core, frontend)
- [ ] Data layout reviewed (contiguity, line size, false sharing)
- [ ] Vectorisation confirmed from compiler remarks or disassembly
- [ ] Before/after measured with variance, on target hardware

## References
- `references/cache-hierarchy.md` — L1/L2/L3, inclusion policies, MESI coherence
- `references/tlb-and-paging.md` — virtual memory, page walks, TLB reach, huge pages
