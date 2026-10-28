---
name: flash-attention
description: >
  Use this skill when the user says 'flashattention', 'flash attention', 'flash_attn', 'sdpa', 'scaled_dot_product_attention', 'online softmax', 'io-aware attention', 'attention memory', 'long context attention kernel'. Explains and applies FlashAttention (tiling, online softmax, recomputation), picks the right implementation (PyTorch SDPA, flash-attn package, FA3 on Hopper, FA4 on Blackwell) and diagnoses why it is not being used. Do NOT use for: KV-cache memory management in serving (paged-attention), writing generic kernels (cuda-programming, triton-kernels), quantization (extreme-quantization-mastery).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
tags: [hardware-acceleration, flash-attention, attention, transformers, gpu, memory]
---

# FlashAttention

## Purpose
Compute exact softmax attention without materializing the N x N score matrix in GPU HBM. FlashAttention is IO-aware: it tiles Q, K, V into on-chip SRAM, fuses matmul + softmax + matmul into one kernel, and recomputes scores in the backward pass. FLOPs are unchanged (still O(N²·d)); memory for attention drops from O(N²) to O(N), and wall-clock time drops because HBM traffic drops.

## Agent Protocol

### Trigger
"flashattention", "flash attention", "flash_attn", "sdpa", "scaled_dot_product_attention", "online softmax", "attention OOM", "long context training memory".

### Input Context
- GPU (Ampere/Ada/Hopper/Blackwell), dtype, head dimension, sequence lengths, masking (causal, padding, sliding window).
- Framework (PyTorch, HF transformers, JAX) and whether training or inference.

### Output Artifact
Configuration/code to enable the fastest exact attention path + verification steps. No file unless requested.

### Response Format
```
Path: {SDPA flash backend|flash-attn FA2|FA3|FA4|cuDNN|memory-efficient}
Requirements met: dtype={fp16/bf16} head_dim={d} mask={...}
Change: {code/config}
Verify: {profiler kernel name / benchmark}
```

### Completion Criteria
- [ ] Confirmed the flash kernel actually runs (profiler trace or forced backend), not a silent fallback.
- [ ] Numerical parity checked against a reference attention on small inputs.
- [ ] Padding handled with varlen/packed sequences rather than dense masks where possible.

## Why It Works (A100 numbers from the FlashAttention paper)
| Memory | Capacity | Bandwidth |
|--------|----------|-----------|
| HBM | 40-80 GB | ~1.5-2.0 TB/s |
| On-chip SRAM (shared memory/L1) | 192 KB per SM, ~20 MB across 108 SMs | ~19 TB/s |

Standard attention writes S = QKᵀ and P = softmax(S) (each N x N) to HBM and reads them back. FlashAttention keeps tiles of S and P in SRAM, so HBM traffic falls from Θ(Nd + N²) to Θ(N²d²/M) for SRAM size M.

## Online Softmax (per query-row block, iterating over key/value blocks j)
```
m_new = max(m, rowmax(S_j))                 # S_j = Q_i K_jᵀ · scale
P_j   = exp(S_j - m_new)
l_new = exp(m - m_new) · l + rowsum(P_j)
O     = exp(m - m_new) · O + P_j V_j        # rescale previous partial output
m, l  = m_new, l_new
# after the last block: O = O / l ; store logsumexp L = m + log(l) for backward
```
The rescaling of the accumulated output O is essential; tracking only m and l is not enough. The backward pass recomputes S and P from Q, K, V and L instead of storing them.

## Versions
| Version | Target | Key ideas |
|---------|--------|-----------|
| FlashAttention (2022) | Ampere | Tiling + recomputation, IO-aware analysis |
| FlashAttention-2 (2023) | Ampere/Ada/Hopper | Parallelism over sequence length, fewer non-matmul FLOPs, better warp work split |
| FlashAttention-3 (2024) | Hopper (sm_90) | Asynchronous WGMMA + TMA, warp specialization, overlapping softmax with matmul, FP8 |
| FlashAttention-4 (2025-26) | Blackwell (sm_100) | Fully asynchronous MMA with tensor memory, software-emulated exponentials, conditional softmax rescaling |

## Using It

### PyTorch SDPA (default choice)
```python
import torch
import torch.nn.functional as F
from torch.nn.attention import sdpa_kernel, SDPBackend

q = torch.randn(4, 16, 4096, 128, device="cuda", dtype=torch.bfloat16)  # (B, H, L, D)
k = torch.randn_like(q)
v = torch.randn_like(q)

out = F.scaled_dot_product_attention(q, k, v, is_causal=True)  # auto-selects a backend

with sdpa_kernel(SDPBackend.FLASH_ATTENTION):   # force flash; raises if inputs unsupported
    out = F.scaled_dot_product_attention(q, k, v, is_causal=True)
```
SDPA backends: `FLASH_ATTENTION`, `EFFICIENT_ATTENTION` (memory-efficient, supports arbitrary masks), `CUDNN_ATTENTION`, `MATH` (reference). An arbitrary `attn_mask` tensor generally disqualifies the flash backend.

### flash-attn package
```python
from flash_attn import flash_attn_func, flash_attn_varlen_func

# layout (B, L, H, D), fp16/bf16 only
out = flash_attn_func(q, k, v, dropout_p=0.0, causal=True)

# packed variable-length batch: no padding FLOPs
# q: (total_tokens, H, D); cu_seqlens: int32 cumulative lengths [0, l1, l1+l2, ...]
out = flash_attn_varlen_func(q, k, v, cu_seqlens_q=cu, cu_seqlens_k=cu,
                             max_seqlen_q=max_len, max_seqlen_k=max_len, causal=True)
```
Supports grouped/multi-query attention (fewer K/V heads than Q heads) and sliding window via `window_size=(left, right)`.

### Hugging Face transformers
```python
model = AutoModelForCausalLM.from_pretrained(
    model_id, dtype=torch.bfloat16, attn_implementation="flash_attention_2"  # or "sdpa"
)
```

## Requirements / Common Fallback Causes
- dtype must be FP16 or BF16 (FP8 for FA3 forward). FP32 inputs fall back to slower kernels.
- Head dimension limits (flash-attn supports up to 256; check the installed version).
- Unsupported GPU architecture for the installed wheel (FA3/FA4 are architecture-specific builds).
- Dense additive masks instead of `is_causal`/varlen.
- Non-contiguous last dimension.

## Verifying
```python
from torch.profiler import profile, ProfilerActivity
with profile(activities=[ProfilerActivity.CUDA]) as prof:
    F.scaled_dot_product_attention(q, k, v, is_causal=True)
print(prof.key_averages().table(sort_by="cuda_time_total", row_limit=5))
```
Look for kernel names containing `flash` (e.g. `flash_fwd`); `efficient_attention` or plain `gemm` + `softmax` kernels mean a fallback.

## Anti-Patterns
- Expecting fewer FLOPs: speedups come from memory traffic; at short sequence lengths gains are small.
- Padding a batch to max length and masking instead of using varlen/packing.
- Assuming the flash path is active because the package is installed.
- Using FP32 "for safety" in attention; BF16 with FP32 accumulation inside the kernel is standard.

## References
- Dao et al., FlashAttention (arXiv:2205.14135); FlashAttention-2 (arXiv:2307.08691); Shah et al., FlashAttention-3 (arXiv:2407.08608).
- Related: `../paged-attention/SKILL.md`, `../triton-kernels/SKILL.md`.
