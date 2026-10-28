---
name: ptx-assembly
description: >
  Use this skill when the user says 'ptx', 'inline ptx', 'asm volatile', 'nvcc -ptx', 'ptxas', 'state space', 'ld.global', 'bar.sync', 'cp.async', 'mma.sync', 'register spill'. Reads and writes NVIDIA PTX (the virtual ISA): generating and inspecting PTX, inline assembly in CUDA C++, state spaces, predication, barriers, async copies and register-pressure diagnosis via ptxas. Do NOT use for: final machine code and stall analysis (sass-machine-code), high-level kernel design (cuda-programming), Triton (triton-kernels).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
tags: [hardware-acceleration, ptx, cuda, nvidia, assembly, gpu]
---

# PTX Assembly

## Purpose
PTX (Parallel Thread Execution) is NVIDIA's virtual, forward-compatible ISA. nvcc compiles CUDA C++ to PTX, and `ptxas` (or the driver JIT) compiles PTX to SASS for a specific GPU. Engineers read PTX to check what the front end generated and write small amounts of inline PTX to reach instructions not exposed by CUDA C++ intrinsics. Real performance is decided after `ptxas`, so PTX work always ends with a SASS and profiler check.

## Agent Protocol

### Trigger
"ptx", "inline ptx", "asm volatile", "nvcc -ptx", "ptxas -v", "state space", "ld.global.nc", "bar.sync", "cp.async", "mma.sync", "register spill", "predicate".

### Input Context
- Target architecture (`sm_80`, `sm_90a`, ...), CUDA version, kernel source.
- `ptxas -v` output or Nsight Compute report if diagnosing performance.

### Output Artifact
PTX listing explanation or inline-asm snippet + verification commands. No file unless requested.

### Response Format
```
Goal: {instruction/behavior needed}
PTX: {snippet}
Constraints: {operand constraints, clobbers, arch requirement}
Verify: {cuobjdump -sass / ncu check}
```

### Completion Criteria
- [ ] Prefer a CUDA intrinsic or library (CUTLASS/CuTe, cuda::pipeline) if one exists.
- [ ] Inline asm has correct constraints, `volatile` and `"memory"` clobber where it touches memory.
- [ ] SASS inspected to confirm the intended instruction was emitted.
- [ ] Architecture guard (`__CUDA_ARCH__`) for arch-specific instructions.

## Toolchain
```bash
nvcc -arch=sm_90 -ptx kernel.cu -o kernel.ptx           # emit PTX
nvcc -arch=sm_90 -cubin kernel.cu -o kernel.cubin
nvcc -arch=sm_90 -Xptxas -v kernel.cu                   # registers, smem, spill stores/loads per kernel
nvcc -arch=sm_90 --keep kernel.cu                       # keep all intermediates
cuobjdump -ptx app      # PTX embedded in a binary
cuobjdump -sass app     # SASS embedded in a binary
```
Fat binaries: `-gencode arch=compute_90,code=[sm_90,compute_90]` embeds SASS for sm_90 plus PTX so newer GPUs can JIT-compile it.

## Core Syntax
```ptx
.version 8.0
.target sm_90
.address_size 64

.visible .entry scale(.param .u64 p_x, .param .f32 p_a, .param .u32 p_n)
{
    .reg .pred  %p<2>;
    .reg .b32   %r<6>;
    .reg .f32   %f<4>;
    .reg .b64   %rd<5>;

    ld.param.u64    %rd1, [p_x];
    ld.param.f32    %f1, [p_a];
    ld.param.u32    %r1, [p_n];
    cvta.to.global.u64 %rd2, %rd1;          // generic -> global address
    mov.u32         %r2, %ctaid.x;
    mov.u32         %r3, %ntid.x;
    mov.u32         %r4, %tid.x;
    mad.lo.s32      %r5, %r2, %r3, %r4;     // i = blockIdx.x*blockDim.x + threadIdx.x
    setp.ge.u32     %p1, %r5, %r1;
    @%p1 bra        DONE;                   // predicated branch
    mul.wide.u32    %rd3, %r5, 4;
    add.s64         %rd4, %rd2, %rd3;
    ld.global.f32   %f2, [%rd4];
    mul.f32         %f3, %f2, %f1;
    st.global.f32   [%rd4], %f3;
DONE:
    ret;
}
```
Virtual registers are unlimited in PTX; `ptxas` performs real register allocation and may spill to local memory.

## State Spaces
| Space | Meaning |
|-------|---------|
| `.reg` | Registers. |
| `.param` | Kernel/function parameters. |
| `.global` | Device memory, cached in L2 (and L1 depending on architecture and cache operator). |
| `.shared` | Per-CTA on-chip shared memory; 32 banks. `.shared::cluster` for distributed shared memory on sm_90. |
| `.local` | Per-thread memory in device DRAM (stack, spills), cached in L1/L2. |
| `.const` | Constant bank; fast when all threads of a warp read the same address. |
| generic | No state space suffix (`ld.f32`): address resolved at run time. Use `cvta` or explicit spaces when known to give the compiler more information. |

Cache operators on loads/stores: `.ca` (cache all levels), `.cg` (L2 only), `.cs` (streaming), `.lu`, `.cv`; `ld.global.nc` uses the non-coherent read-only path (what `__ldg()` / `const __restrict__` produce).

## Inline PTX in CUDA C++
```cpp
__device__ __forceinline__ unsigned lane_id() {
  unsigned id;
  asm volatile("mov.u32 %0, %%laneid;" : "=r"(id));
  return id;
}

__device__ __forceinline__ float4 ld_streaming(const float4* p) {
  float4 v;
  asm volatile("ld.global.cs.v4.f32 {%0,%1,%2,%3}, [%4];"
               : "=f"(v.x), "=f"(v.y), "=f"(v.z), "=f"(v.w)
               : "l"(p));
  return v;
}
```
Constraints: `r` 32-bit int, `l` 64-bit, `h` 16-bit, `f` f32, `d` f64, `n` immediate. Write `%%` for PTX special registers. Add `: "memory"` clobber when the asm reads/writes memory the compiler must not reorder around.

## Synchronization and Async Copy
- `bar.sync 0;` = `__syncthreads()` (all threads of the CTA; named barriers 1-15 allow subsets with a thread count).
- `bar.warp.sync mask;` = `__syncwarp(mask)`.
- `membar.cta/gl/sys` / `fence.*` order memory visibility; barriers alone do not order global memory across CTAs.
- `cp.async.ca.shared.global [smem], [gmem], 16;` + `cp.async.commit_group;` + `cp.async.wait_group N;` (sm_80+) copy global→shared without staging through registers, enabling multi-stage pipelines. Prefer `cuda::memcpy_async` / `cuda::pipeline`.
- sm_90 adds TMA (`cp.async.bulk.tensor`), mbarrier-based transaction barriers and `wgmma.mma_async`; use CUTLASS/CuTe rather than hand-written PTX for these. `sm_90a` features are not forward compatible to other architectures.

## Tensor Core MMA
`mma.sync.aligned.m16n8k16.row.col.f32.bf16.bf16.f32` performs a warp-wide 16x8x16 matrix multiply-accumulate (sm_80+). Fragment layouts per thread are defined in the PTX ISA; getting them wrong silently produces wrong results, so test against a reference GEMM.

## Diagnosing with ptxas -v
```
ptxas info : Used 96 registers, 16384 bytes smem, 400 bytes cmem[0]
ptxas info : 0 bytes stack frame, 0 bytes spill stores, 0 bytes spill loads
```
- Spill stores/loads > 0 in a hot kernel → reduce live values, smaller tiles, or loosen `__launch_bounds__`.
- Register count limits occupancy: 65,536 registers per SM shared by resident threads.

## Anti-Patterns
- Hand-writing PTX for something `__ldg`, `__shfl_sync`, `atomicAdd`, cooperative groups or CUTLASS already provides.
- Optimizing PTX and assuming SASS matches; `ptxas` reorders, schedules and allocates registers.
- Missing `volatile`/clobbers, letting the compiler delete or reorder the asm.
- Shipping only `sm_XX` SASS without PTX, breaking newer GPUs.

## References
- NVIDIA PTX ISA reference and "Inline PTX Assembly in CUDA" (docs.nvidia.com/cuda).
- Related: `../sass-machine-code/SKILL.md`, `../cuda-programming/SKILL.md`.
