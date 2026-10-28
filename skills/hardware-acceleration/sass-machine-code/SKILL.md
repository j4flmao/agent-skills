---
name: sass-machine-code
description: >
  Use this skill when the user says 'sass', 'cuobjdump -sass', 'nvdisasm', 'machine code', 'stall reasons', 'long scoreboard', 'register bank conflict', 'HMMA', 'FFMA', 'instruction mix', 'warp stall'. Reads NVIDIA SASS (native GPU machine code) to explain what the compiler actually generated and maps Nsight Compute per-instruction stall sampling back to source to fix kernel bottlenecks. Do NOT use for: writing PTX or inline asm (ptx-assembly), general kernel design (cuda-programming), Triton kernels (triton-kernels).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
tags: [hardware-acceleration, sass, cuda, nvidia, profiling, gpu-microarchitecture]
---

# SASS Machine Code Analysis

## Purpose
SASS is the architecture-specific machine code that the SM actually executes, produced by `ptxas` from PTX. NVIDIA documents the instruction names per architecture but not the encoding, so SASS is used for reading, not writing: confirming vectorized loads, tensor-core instructions, spills, unrolling and predication, and attributing stalls to exact instructions with Nsight Compute.

## Agent Protocol

### Trigger
"sass", "cuobjdump -sass", "nvdisasm", "machine code", "stall reasons", "long scoreboard", "warp stall", "register bank conflict", "HMMA", "HGMMA", "FFMA", "instruction mix".

### Input Context
- Binary or kernel source + compile flags, target `sm_XX`.
- Nsight Compute report (`--set full`) with source/SASS correlation (`-lineinfo`).

### Output Artifact
Annotated SASS excerpt + root cause + source-level fix. No file unless requested.

### Response Format
```
Hot instruction(s): {SASS line(s)} ← source line {n}
Top stall: {reason} ({% of samples})
Cause: {explanation}
Fix: {source/compile change}
Re-check: {metric}
```

### Completion Criteria
- [ ] Hot spots chosen from sampling data, not by eye.
- [ ] Fix applied at source/flag level, then SASS and metrics re-inspected.
- [ ] Result correctness re-validated.

## Getting SASS
```bash
nvcc -O3 -arch=sm_90 -lineinfo -cubin -o k.cubin k.cu
cuobjdump -sass k.cubin                 # or on the final executable
nvdisasm -g k.cubin                     # -g annotates source line info
nvdisasm -cfg k.cubin | dot -Tsvg > cfg.svg   # control-flow graph
ncu --set full --import-source yes -o rep ./app   # then open the Source page, view "SASS" or "Source and SASS"
```

## Reading Common Instructions
| SASS | Meaning |
|------|---------|
| `LDG.E.128` / `STG.E.128` | 128-bit (vectorized) global load/store. `LDG.E` alone = 32-bit. |
| `LDG.E.CONSTANT` | Read-only (non-coherent) path, from `__ldg` / `const __restrict__`. |
| `LDS` / `STS` | Shared memory load/store. |
| `LDL` / `STL` | Local memory: usually register spills (bad in hot loops). |
| `LDGSTS` | Async global→shared copy (`cp.async`, sm_80+). |
| `UTMALDG` | TMA bulk tensor load (sm_90). |
| `FFMA`, `FADD`, `FMUL` | FP32 fused multiply-add / add / multiply on CUDA cores. |
| `HMMA` / `IMMA` | Warp-level tensor-core MMA (FP16/BF16/TF32 / INT8). |
| `HGMMA` | Hopper warpgroup tensor-core MMA (`wgmma`). |
| `MUFU.EX2`, `MUFU.RCP`, `MUFU.RSQ` | Special function unit: exp2, reciprocal, rsqrt (fast intrinsics). |
| `SHFL.BFLY/DOWN` | Warp shuffle. |
| `BAR.SYNC` | `__syncthreads()`. |
| `ISETP` + `@P0` | Integer compare setting a predicate; `@P0`/`@!P0` predicated execution. |
| `BRA`, `BSSY`/`BSYNC` | Branch; convergence-barrier pairs around divergent regions (Volta+). |
| `S2R SR_TID.X` | Read special register (thread index). |

Matrix-multiply throughput on modern GPUs comes from tensor-core instructions (`HMMA`/`HGMMA`), not `FFMA`. A GEMM kernel full of `FFMA` with FP16/BF16 inputs means tensor cores are not being used.

## Scheduling Model (what matters for analysis)
- Since Maxwell, an SM is split into 4 processing blocks, each with its own warp scheduler that issues at most one instruction per cycle from one eligible warp.
- Each warp issues its instructions in program order; latency is hidden by switching among warps (and by independent instructions within a warp).
- Fixed-latency dependencies are handled by compiler-encoded control information (stall counts, yield hints). Variable-latency results (memory, MUFU) use scoreboards; a dependent instruction waits on that scoreboard.
- Register file is banked; an instruction reading several operands from the same bank can lose cycles. `ptxas` sets `.reuse` flags to serve repeated operands from an operand reuse cache. Bank counts/widths differ per architecture (known from microbenchmark studies, not official docs).

## Nsight Compute Stall Reasons → Fix
| Stall reason | Meaning | Typical fix |
|--------------|---------|-------------|
| Long Scoreboard | Waiting on L1TEX (global/local/texture) data | Coalesce, increase reuse via smem, prefetch/`cp.async` pipelining, more warps/ILP; check for `LDL` spills |
| Short Scoreboard | Waiting on MIO (shared memory, MUFU, shuffles) | Fix bank conflicts, fewer transcendental ops, `-use_fast_math` if accuracy allows |
| MIO Throttle / LG Throttle | Memory instruction queues full | Wider (vectorized) accesses, fewer instructions |
| Math Pipe Throttle | Execution pipe busy | Good if compute-bound; otherwise move work to tensor cores or lower precision |
| Wait | Fixed-latency dependency | More ILP, unrolling |
| Barrier | Waiting at `__syncthreads` | Balance work across warps, fewer barriers |
| Not Selected | Eligible but another warp issued | Not a problem; indicates enough warps |
| No Instruction | Instruction cache miss / branch target | Reduce code size (over-unrolling), avoid huge kernels |
| Branch Resolving | Divergent branches | Make branches warp-uniform, predication |

## Checklist When Reading a Hot Loop
1. Loads vectorized (`.64`/`.128`) where data is contiguous?
2. Any `LDL`/`STL` inside the loop (spills)?
3. Tensor-core instructions present for half/bf16/int8 math?
4. Expected unroll factor visible (repeated instruction blocks)?
5. Address arithmetic (`IMAD`, `LEA`) dominating over useful math? Hoist/strength-reduce in source.
6. Unexpected `F2F`/`I2F` conversions from mixed types (e.g. a stray `double` literal produces `DADD`/`F2F.F64`)?

## Anti-Patterns
- Optimizing without per-instruction sampling; guessing hot spots from SASS length.
- Trying to hand-edit SASS for production (unsupported, architecture-specific, unmaintainable). Change source, flags, or use CUTLASS.
- Treating a high "Not Selected" share as a stall to fix.
- Comparing SASS across architectures as if instruction sets were identical.

## References
- CUDA Binary Utilities documentation (cuobjdump, nvdisasm, instruction set lists per architecture).
- Nsight Compute Kernel Profiling Guide (warp stall reason definitions).
- Jia et al., "Dissecting the NVIDIA Volta GPU Architecture via Microbenchmarking" (arXiv:1804.06826).
- Related: `../ptx-assembly/SKILL.md`, `../cuda-programming/SKILL.md`.
