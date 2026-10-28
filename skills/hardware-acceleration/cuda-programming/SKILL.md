---
name: cuda-programming
description: >
  Use this skill when the user says 'cuda', 'cuda kernel', 'nvcc', 'gpu programming', 'thread block', 'shared memory', 'warp divergence', 'coalesced access', 'occupancy', 'cuda streams'. Writes and reviews CUDA C++ kernels: launch configuration, memory hierarchy, coalescing, shared-memory tiling, synchronization, error checking and profiling with Nsight. Do NOT use for: Triton kernels (triton-kernels), PTX/SASS inspection (ptx-assembly, sass-machine-code), TensorRT engines (tensorrt-optimization), multi-GPU training (distributed-training).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
tags: [hardware-acceleration, cuda, gpu, nvcc, kernels, performance]
---

# CUDA Programming

## Purpose
Write correct, fast CUDA C++ kernels for NVIDIA GPUs. Most kernels are limited by memory bandwidth or latency, not arithmetic, so the work is mostly about access patterns, data reuse in shared memory/registers, and enough parallelism to hide latency. Every optimization must be confirmed with Nsight Compute, not intuition.

## Agent Protocol

### Trigger
"cuda", "cuda kernel", "nvcc", "gpu programming", "thread block", "shared memory", "warp divergence", "coalesced", "occupancy", "cuda streams", "__syncthreads".

### Input Context
- Target GPU / compute capability (e.g. sm_80 A100, sm_90 H100, sm_100 B200).
- CUDA toolkit version, host language, problem sizes and data types.
- Current kernel + profiler output if optimizing.

### Output Artifact
Kernel code (`.cu`) with launch code, error checking, and a profiling plan. No file unless requested.

### Response Format
```
Bound: {memory|compute|latency} (evidence: {ncu metric})
Launch: grid={...} block={...} smem={bytes}
Change: {what and why}
Expected effect: {metric to re-check}
```

### Completion Criteria
- [ ] Every CUDA API call and kernel launch error-checked.
- [ ] Bounds checks for partial tiles / tails.
- [ ] Result validated against a CPU or library reference.
- [ ] Bottleneck classified with Nsight Compute before and after the change.

## Execution Model
| Level | Facts |
|-------|-------|
| Thread | Has private registers; spills go to "local" memory (device DRAM, cached in L1/L2). |
| Warp | 32 threads. Scheduler issues one instruction per warp per cycle. Since Volta, threads have independent program counters but divergent paths still execute serially. |
| Block (CTA) | Up to 1024 threads. Shares shared memory; synchronizes with `__syncthreads()`. Runs on one SM. |
| Cluster (sm_90+) | Group of blocks on a GPC that can access each other's shared memory (distributed shared memory). |
| Grid | All blocks of a launch. No grid-wide barrier except cooperative launch. |

## Memory Hierarchy
| Space | Scope | Notes |
|-------|-------|-------|
| Registers | thread | Fastest. Per-thread limit 255. High usage lowers occupancy. |
| Shared memory | block | On-chip SRAM, 32 banks of 4 bytes. Default static limit 48 KB per block; larger requires `cudaFuncSetAttribute(..., cudaFuncAttributeMaxDynamicSharedMemorySize, bytes)` (up to ~227 KB on H100, ~163 KB on A100). |
| L1 / L2 | SM / device | Hardware caches; L1 shares capacity with shared memory. |
| Global (HBM/GDDR) | device | Hundreds of cycles latency. Bandwidth is the usual limit. |
| Constant | device, cached | Fast only when all threads of a warp read the same address. |

## Rules
1. **Coalesce global access.** Consecutive threads of a warp should touch consecutive addresses so a warp load maps to few 32-byte sectors. Structure-of-arrays beats array-of-structures.
2. **Reuse via shared memory.** Load a tile once, use it many times (tiled GEMM/stencils). Pad tiles (`[TILE][TILE+1]`) to avoid bank conflicts on column access.
3. **Avoid divergence inside a warp.** Branching on `threadIdx.x % 2` serializes both paths; branching on warp-uniform values (`threadIdx.x / 32`) does not.
4. **Occupancy is a means, not a goal.** Enough warps to hide latency; higher occupancy past that point rarely helps. Use `cudaOccupancyMaxPotentialBlockSize` as a starting point.
5. **Block size a multiple of 32**, usually 128-256.
6. **Grid-stride loops** make kernels correct for any `n` and reusable across GPUs.
7. **Minimize host-device transfers**; use pinned memory (`cudaMallocHost`) and `cudaMemcpyAsync` on streams to overlap copy and compute.
8. **Check errors after launches**: `cudaGetLastError()` for launch errors, a sync (in debug) for execution errors.

## Example: Error Checking + Grid-Stride SAXPY
```cpp
#include <cstdio>
#include <cstdlib>
#include <cuda_runtime.h>

#define CUDA_CHECK(call)                                                     \
  do {                                                                       \
    cudaError_t err_ = (call);                                               \
    if (err_ != cudaSuccess) {                                               \
      std::fprintf(stderr, "CUDA error %s at %s:%d: %s\n", #call, __FILE__,  \
                   __LINE__, cudaGetErrorString(err_));                      \
      std::exit(EXIT_FAILURE);                                               \
    }                                                                        \
  } while (0)

__global__ void saxpy(int n, float a, const float* __restrict__ x,
                      float* __restrict__ y) {
  for (int i = blockIdx.x * blockDim.x + threadIdx.x; i < n;
       i += blockDim.x * gridDim.x) {
    y[i] = a * x[i] + y[i];
  }
}

void run_saxpy(int n, float a, const float* d_x, float* d_y, cudaStream_t s) {
  int device = 0, sms = 0;
  CUDA_CHECK(cudaGetDevice(&device));
  CUDA_CHECK(cudaDeviceGetAttribute(&sms, cudaDevAttrMultiProcessorCount, device));
  const int block = 256;
  const int grid = sms * 8;  // enough blocks to fill the GPU; loop covers the rest
  saxpy<<<grid, block, 0, s>>>(n, a, d_x, d_y);
  CUDA_CHECK(cudaGetLastError());
}
```

## Example: Shared-Memory Tiled Transpose (bank-conflict free)
```cpp
constexpr int TILE = 32;
constexpr int ROWS = 8;

__global__ void transpose(float* out, const float* in, int width, int height) {
  __shared__ float tile[TILE][TILE + 1];  // +1 pad removes bank conflicts
  int x = blockIdx.x * TILE + threadIdx.x;
  int y = blockIdx.y * TILE + threadIdx.y;
  for (int j = 0; j < TILE; j += ROWS)
    if (x < width && y + j < height)
      tile[threadIdx.y + j][threadIdx.x] = in[(y + j) * width + x];
  __syncthreads();
  x = blockIdx.y * TILE + threadIdx.x;  // swapped block indices
  y = blockIdx.x * TILE + threadIdx.y;
  for (int j = 0; j < TILE; j += ROWS)
    if (x < height && y + j < width)
      out[(y + j) * height + x] = tile[threadIdx.x][threadIdx.y + j];
}
// launch: dim3 block(TILE, ROWS); dim3 grid((width+TILE-1)/TILE, (height+TILE-1)/TILE);
```
Both reads and writes are coalesced; the column read from shared memory is conflict-free because of the padding.

## Warp-Level Reduction
```cpp
__inline__ __device__ float warp_sum(float v) {
  for (int offset = 16; offset > 0; offset >>= 1)
    v += __shfl_down_sync(0xffffffffu, v, offset);
  return v;  // lane 0 holds the warp total
}
```
Shuffles exchange registers without shared memory. Use CUB (`cub::BlockReduce`, `cub::DeviceReduce`) instead of hand-rolling in production.

## Build & Profile
```bash
nvcc -O3 -arch=sm_90 -lineinfo -o app app.cu        # -lineinfo maps SASS to source in Nsight
compute-sanitizer --tool memcheck ./app            # out-of-bounds, races (--tool racecheck)
nsys profile -o timeline ./app                     # timeline: transfers, launches, overlap
ncu --set full -o report ./app                     # per-kernel: throughput, stalls, occupancy
```
Read in Nsight Compute: "GPU Speed Of Light" (memory vs compute % of peak), "Memory Workload Analysis" (sectors per request), "Warp State Statistics" (stall reasons), "Occupancy".

## Decision Table
| Symptom (ncu) | Likely cause | Fix |
|---------------|--------------|-----|
| DRAM throughput near peak, SM low | memory-bound | Fuse kernels, reuse via smem, lower precision, vectorized loads (`float4`) |
| Many sectors per request | uncoalesced access | Change layout (SoA), transpose via smem |
| Shared-memory bank conflicts | strided smem access | Padding or swizzled layout |
| Low achieved occupancy | registers/smem per block too high | `__launch_bounds__`, smaller tiles |
| Stall "Long Scoreboard" dominant | waiting on global loads | More ILP, prefetch, `cp.async` pipelining (sm_80+) |
| Tensor-heavy math on FP32 cores | missed tensor cores | Use cuBLAS/CUTLASS or WMMA/MMA with FP16/BF16/TF32 |

## Anti-Patterns
- Writing a custom GEMM/conv/FFT when cuBLAS, cuDNN, cuFFT or CUTLASS already exists.
- `cudaDeviceSynchronize()` after every launch in production code.
- Assuming warp-synchronous execution without `__syncwarp()` / `_sync` intrinsics (invalid since Volta).
- Atomics on a single global counter from every thread; reduce per warp/block first.
- Benchmarking without warm-up or with `std::chrono` around async launches (use CUDA events).

## References
- CUDA C++ Programming Guide and Best Practices Guide (docs.nvidia.com/cuda).
- Related: `../ptx-assembly/SKILL.md`, `../sass-machine-code/SKILL.md`, `../triton-kernels/SKILL.md`.
