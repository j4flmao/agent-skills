---
name: paged-attention
description: >
  Use this skill when the user says 'pagedattention', 'paged attention', 'kv cache', 'kv cache memory', 'vllm memory', 'block table', 'prefix caching', 'continuous batching', 'gpu-memory-utilization', 'preemption'. Explains PagedAttention KV-cache management (fixed-size blocks, block tables, copy-on-write sharing, prefix caching) and tunes LLM serving engines (vLLM, SGLang, TensorRT-LLM) for KV capacity and throughput. Do NOT use for: the attention kernel math itself (flash-attention), weight quantization (extreme-quantization-mastery), TensorRT engine building (tensorrt-optimization), general model serving infra (ml-model-serving).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
tags: [hardware-acceleration, paged-attention, kv-cache, vllm, llm-serving, throughput]
---

# PagedAttention and KV-Cache Management

## Purpose
During autoregressive decoding every request keeps Keys and Values for all past tokens. Allocating that cache contiguously for the maximum length wastes most of it; the vLLM paper measured 60-80% of KV memory wasted in prior systems. PagedAttention stores the cache in fixed-size blocks mapped through a per-sequence block table, like OS virtual memory, so waste drops to under ~4% and far more requests fit in a batch.

## Agent Protocol

### Trigger
"pagedattention", "kv cache", "kv cache size", "vllm OOM", "block table", "prefix caching", "continuous batching", "gpu-memory-utilization", "max-num-seqs", "preemption".

### Input Context
- Model architecture (layers, KV heads, head dim), dtype, max context length.
- GPU memory and count (tensor parallel size), traffic profile (prompt/output lengths, concurrency, shared prefixes).
- Engine and version.

### Output Artifact
KV-cache capacity estimate + engine flags. No file unless requested.

### Response Format
```
KV bytes/token: {value}
KV budget: {GB} -> ~{tokens} tokens -> ~{concurrent requests} at {avg len}
Flags: {engine flags}
Expected bottleneck: {KV capacity|compute|bandwidth}
```

### Completion Criteria
- [ ] KV bytes/token computed from the real config (GQA heads, not attention heads).
- [ ] Preemption/queueing metrics checked under realistic load.
- [ ] Prefix caching considered when prompts share system prompts or documents.

## KV-Cache Size
```
bytes_per_token = 2 (K and V) x num_layers x num_kv_heads x head_dim x bytes_per_element
```
Example, Llama-3.1-8B (32 layers, 8 KV heads via GQA, head_dim 128, BF16):
2 x 32 x 8 x 128 x 2 = 131,072 bytes ≈ 128 KiB per token → 8K-token context ≈ 1 GiB per sequence. FP8 KV cache halves this.

## How PagedAttention Works
| Concept | Behavior |
|---------|----------|
| Block | Fixed number of tokens' K/V (16 in the paper; configurable via `--block-size`). |
| Block table | Per sequence: logical block i → physical block id. Physical blocks need not be contiguous. |
| Allocation | A new block is allocated only when the last one fills, so waste is at most one partial block per sequence. |
| External fragmentation | None: all blocks have the same size, any free block serves any sequence. |
| Sharing | Parallel sampling / beam search share prompt blocks by reference count; copy-on-write when a sequence writes to a shared block. |
| Prefix caching | Full blocks are hashed by their token content (and prefix); new requests with the same prefix reuse cached blocks and skip that prefill. |
| Preemption | When blocks run out, the scheduler evicts lower-priority sequences (recompute later, or swap to CPU in some engines). |

The attention kernel reads K/V through the block table (gather by block id), so it must be paging-aware; FlashAttention and FlashInfer provide paged variants.

## Continuous Batching
The scheduler adds and removes requests at every decode step instead of waiting for a whole batch to finish. Combined with paging this keeps the GPU busy with as many sequences as KV memory allows. Chunked prefill splits long prompts into pieces interleaved with decode steps to bound latency spikes.

## vLLM Tuning
```bash
vllm serve meta-llama/Llama-3.1-8B-Instruct \
  --gpu-memory-utilization 0.90 \
  --max-model-len 16384 \
  --max-num-seqs 256 \
  --kv-cache-dtype fp8 \
  --enable-prefix-caching \
  --tensor-parallel-size 2
```
| Flag | Effect |
|------|--------|
| `--gpu-memory-utilization` | Fraction of GPU memory vLLM may use (weights + activations + KV). |
| `--max-model-len` | Context cap; smaller cap lets more sequences fit. |
| `--max-num-seqs` | Max concurrent sequences per scheduler step. |
| `--kv-cache-dtype fp8` | Halves KV memory; validate quality. |
| `--enable-prefix-caching` | Reuse blocks for shared prefixes. |
| `--tensor-parallel-size` | Shards weights and KV heads across GPUs. |
vLLM logs the number of KV-cache blocks/tokens available at startup; use it to confirm the estimate. Watch metrics such as running/waiting requests, KV-cache usage, and preemption counts on the `/metrics` endpoint.

## Decision Rules
| Symptom | Action |
|---------|--------|
| Many waiting requests, KV usage ~100% | FP8 KV cache, lower `--max-model-len`, add GPUs (TP), quantize weights to free memory |
| Frequent preemptions | Lower `--max-num-seqs`, reserve more memory, shorter max output |
| Repeated long system prompts / RAG documents | Prefix caching; put shared content first in the prompt |
| High time-to-first-token with long prompts | Chunked prefill, separate prefill/decode (disaggregated serving) |
| GPU compute saturated, KV not full | Capacity is not the limit; look at kernels, batch size, speculative decoding |

## Anti-Patterns
- Computing KV size with query heads instead of KV heads (overestimates GQA models by 4-8x).
- Setting `--gpu-memory-utilization` near 1.0 with other processes on the GPU.
- Putting per-request variable data (timestamps, user ids) before shared instructions, which defeats prefix caching.
- Benchmarking with one request; paging benefits appear only under concurrency.

## References
- Kwon et al., Efficient Memory Management for Large Language Model Serving with PagedAttention (SOSP 2023, arXiv:2309.06180).
- vLLM documentation (engine arguments, automatic prefix caching design).
- Related: `../flash-attention/SKILL.md`, `../extreme-quantization/SKILL.md`, `../../ml/inference-optimization/SKILL.md`.
