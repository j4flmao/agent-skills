---
name: triton-kernels
description: >
  Use this skill when the user says 'triton kernel', 'openai triton', '@triton.jit', 'tl.load', 'tl.dot', 'triton autotune', 'fused kernel python', 'custom gpu kernel in python', 'torch.compile triton'. Writes, autotunes, tests and benchmarks Triton GPU kernels (elementwise, reductions, fused ops, matmul) and integrates them with PyTorch. Do NOT use for: Triton Inference Server (ml-model-serving / tensorrt-optimization), CUDA C++ kernels (cuda-programming), PTX/SASS analysis (ptx-assembly, sass-machine-code).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
tags: [hardware-acceleration, triton, gpu-kernels, pytorch, autotuning]
---

# Triton Kernels

## Purpose
Triton is a Python DSL and compiler for GPU kernels. You program one *program instance* that processes a block (tile) of data with vector operations; the compiler handles thread mapping, coalescing, shared-memory staging, and tensor-core use. It is the fastest route to fused custom ops in PyTorch (and what `torch.compile`'s Inductor generates), on NVIDIA and AMD GPUs.

## Agent Protocol

### Trigger
"triton kernel", "openai triton", "@triton.jit", "tl.load", "tl.dot", "triton.autotune", "fused kernel", "custom kernel in python", "inductor generated kernel".

### Input Context
- Operation to implement, tensor shapes/dtypes/strides, GPU, PyTorch and Triton versions.
- Baseline implementation for correctness and performance comparison.

### Output Artifact
Kernel + Python wrapper + correctness test + benchmark. No file unless requested.

### Response Format
```
Kernel: {name} grid={expr} blocks={BLOCK_*}
Fusion: {ops fused, HBM round-trips removed}
Correctness: torch.testing.assert_close(..., atol, rtol)
Benchmark: {GB/s or TFLOP/s} vs {baseline}
```

### Completion Criteria
- [ ] Masks on every load/store that can go out of bounds.
- [ ] Correctness test vs PyTorch reference across odd sizes (not just powers of two).
- [ ] Benchmarked with `triton.testing.do_bench` against the PyTorch/`torch.compile` baseline.
- [ ] Autotune `key` includes the dimensions that change the best config.

## Programming Model
| Concept | Triton |
|---------|--------|
| Kernel | `@triton.jit` function; pointer args are tensors passed from Python |
| Instance id | `tl.program_id(axis)` |
| Block of indices | `tl.arange(0, BLOCK)`; `BLOCK` must be a `tl.constexpr` power of two |
| Memory | `tl.load(ptr + offs, mask=..., other=0.0)`, `tl.store(ptr + offs, val, mask=...)` |
| Math | elementwise ops, `tl.sum`/`tl.max` reductions, `tl.dot` (tensor cores), `tl.exp`, `tl.where` |
| Launch | `kernel[grid](args...)`, grid is a tuple or `lambda meta: (...)` |
| Tuning | `num_warps`, `num_stages` (software pipelining depth), block sizes |

Values from `tl.load` live in registers; the compiler decides when to use shared memory (e.g. for `tl.dot` operands).

## Example: Fused Row-wise Softmax
```python
import torch
import triton
import triton.language as tl

@triton.jit
def softmax_kernel(out_ptr, in_ptr, in_row_stride, out_row_stride, n_cols,
                   BLOCK_SIZE: tl.constexpr):
    row = tl.program_id(0)
    cols = tl.arange(0, BLOCK_SIZE)
    mask = cols < n_cols
    x = tl.load(in_ptr + row * in_row_stride + cols, mask=mask, other=-float("inf"))
    x = x - tl.max(x, axis=0)
    num = tl.exp(x)
    y = num / tl.sum(num, axis=0)
    tl.store(out_ptr + row * out_row_stride + cols, y, mask=mask)

def softmax(x: torch.Tensor) -> torch.Tensor:
    if x.ndim != 2 or not x.is_cuda:
        raise ValueError(f"expected 2-D CUDA tensor, got shape={tuple(x.shape)} device={x.device}")
    n_rows, n_cols = x.shape
    out = torch.empty_like(x)
    block = triton.next_power_of_2(n_cols)
    num_warps = 4 if block <= 2048 else 8 if block <= 8192 else 16
    softmax_kernel[(n_rows,)](out, x, x.stride(0), out.stride(0), n_cols,
                              BLOCK_SIZE=block, num_warps=num_warps)
    return out

x = torch.randn(4096, 1000, device="cuda")
torch.testing.assert_close(softmax(x), torch.softmax(x, dim=1))
```
One HBM read and one write per element, versus several passes for unfused max/exp/sum/divide. This simple version assumes a row fits in one block; very long rows need a loop with online softmax.

## Example: Autotuned Matmul (core loop)
```python
@triton.autotune(
    configs=[
        triton.Config({"BLOCK_M": 128, "BLOCK_N": 128, "BLOCK_K": 32}, num_warps=8, num_stages=3),
        triton.Config({"BLOCK_M": 64, "BLOCK_N": 128, "BLOCK_K": 32}, num_warps=4, num_stages=4),
        triton.Config({"BLOCK_M": 128, "BLOCK_N": 64, "BLOCK_K": 64}, num_warps=4, num_stages=4),
    ],
    key=["M", "N", "K"],
)
@triton.jit
def matmul_kernel(a_ptr, b_ptr, c_ptr, M, N, K,
                  stride_am, stride_ak, stride_bk, stride_bn, stride_cm, stride_cn,
                  BLOCK_M: tl.constexpr, BLOCK_N: tl.constexpr, BLOCK_K: tl.constexpr):
    pid_m = tl.program_id(0)
    pid_n = tl.program_id(1)
    offs_m = pid_m * BLOCK_M + tl.arange(0, BLOCK_M)
    offs_n = pid_n * BLOCK_N + tl.arange(0, BLOCK_N)
    offs_k = tl.arange(0, BLOCK_K)
    a_ptrs = a_ptr + offs_m[:, None] * stride_am + offs_k[None, :] * stride_ak
    b_ptrs = b_ptr + offs_k[:, None] * stride_bk + offs_n[None, :] * stride_bn
    acc = tl.zeros((BLOCK_M, BLOCK_N), dtype=tl.float32)
    for k in range(0, tl.cdiv(K, BLOCK_K)):
        k_rem = K - k * BLOCK_K
        a = tl.load(a_ptrs, mask=(offs_m[:, None] < M) & (offs_k[None, :] < k_rem), other=0.0)
        b = tl.load(b_ptrs, mask=(offs_k[:, None] < k_rem) & (offs_n[None, :] < N), other=0.0)
        acc = tl.dot(a, b, acc)                    # tensor cores for fp16/bf16 inputs
        a_ptrs += BLOCK_K * stride_ak
        b_ptrs += BLOCK_K * stride_bk
    c = acc.to(c_ptr.dtype.element_ty)
    c_ptrs = c_ptr + offs_m[:, None] * stride_cm + offs_n[None, :] * stride_cn
    tl.store(c_ptrs, c, mask=(offs_m[:, None] < M) & (offs_n[None, :] < N))

def matmul(a: torch.Tensor, b: torch.Tensor) -> torch.Tensor:
    M, K = a.shape
    K2, N = b.shape
    if K != K2:
        raise ValueError(f"inner dims differ: a={tuple(a.shape)} b={tuple(b.shape)}")
    c = torch.empty((M, N), device=a.device, dtype=a.dtype)
    grid = lambda meta: (triton.cdiv(M, meta["BLOCK_M"]), triton.cdiv(N, meta["BLOCK_N"]))
    matmul_kernel[grid](a, b, c, M, N, K, a.stride(0), a.stride(1),
                        b.stride(0), b.stride(1), c.stride(0), c.stride(1))
    return c
```
Production matmuls add grouped program ordering (L2 reuse) and epilogue fusion; for plain GEMM, cuBLAS/`torch.matmul` is usually as fast or faster.

## Benchmarking
```python
ms = triton.testing.do_bench(lambda: softmax(x))
gbps = 2 * x.numel() * x.element_size() / (ms * 1e-3) / 1e9   # read + write
```
Compare to the memory-bandwidth roofline for memory-bound kernels, to peak tensor TFLOP/s for matmuls.

## Decision Rules
| Situation | Choice |
|-----------|--------|
| Chain of elementwise/reduction ops | Try `torch.compile` first; hand-write Triton only if it falls short |
| Custom fused op (e.g. fused norm + activation + quant) | Triton |
| Standard GEMM/conv/attention | Library (cuBLAS, cuDNN, FlashAttention) |
| Need warp-level control, unusual sync, or PTX-only features | CUDA C++ / CUTLASS |

## Anti-Patterns
- Missing masks (silent out-of-bounds reads) or `other` values that break reductions (use `-inf` for max).
- Non-power-of-two `tl.arange` sizes (compile error).
- Autotune `key` missing a shape argument, so one config is reused for very different sizes.
- Timing first call (includes JIT compile and autotuning).
- Integer overflow in pointer offsets for very large tensors; cast indices to `tl.int64` when offsets can exceed 2³¹.

## References
- Triton documentation and tutorials (vector add, fused softmax, matrix multiplication, fused attention).
- Related: `../flash-attention/SKILL.md`, `../cuda-programming/SKILL.md`.
