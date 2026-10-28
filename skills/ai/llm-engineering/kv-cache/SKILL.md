---
name: llm-kv-cache-paged-attention
description: >
  Use this skill when the user says 'KV cache', 'PagedAttention', 'vLLM memory', 'gpu_memory_utilization', 'prefix caching', 'max concurrent sequences', 'KV cache size', 'context length OOM'. Explains KV cache memory math and how paged allocation, prefix caching, KV quantization, and attention variants (MQA/GQA/MLA) change serving capacity, with vLLM configuration. Do NOT use for: weight quantization (ai/llm-engineering/model-quantization), local llama.cpp/Ollama setups (rnd/ai-agents/local-slm-inference), or general LLMOps (ai/llm-ops).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [ai, llm, inference, kv-cache, paged-attention, vllm, serving]
---

# KV Cache & PagedAttention

## Purpose
During decoding each new token attends to the keys and values of all previous tokens. Caching K and V avoids recomputing them, but the cache grows linearly with sequence length and batch size and usually becomes the binding constraint on concurrency. This skill gives the sizing math and the serving-engine levers (paging, prefix sharing, KV quantization, scheduling) to maximize throughput without OOM.

## Agent Protocol

### Trigger
"KV cache", "PagedAttention", "vLLM OOM", "gpu_memory_utilization", "max_num_seqs", "prefix caching", "long context memory", "KV cache quantization".

### Input Context
- Model architecture: layers, KV heads, head dim (from `config.json`), dtype.
- GPU count/VRAM, target context length, expected concurrent requests.
- Prompt shape: shared system prompts or few-shot prefixes?

### Output Artifact
KV budget calculation and serving configuration (vLLM flags or equivalent) with expected max concurrency.

### Response Format
```
Model: {name} L={layers} kv_heads={h} head_dim={d} dtype={bytes}
KV per token: 2*L*h*d*bytes = {KiB}
KV budget: {GiB} -> tokens in cache ≈ {n}
Max concurrency at {ctx} tokens ≈ {n}
Config: --max-model-len {..} --gpu-memory-utilization {..} --kv-cache-dtype {..} --max-num-seqs {..}
```

### Completion Criteria
- [ ] KV bytes/token computed from the real config (KV heads, not attention heads).
- [ ] Budget accounts for weights and activation/workspace memory.
- [ ] Concurrency estimate validated with a load test.
- [ ] Prefix caching considered for shared prompts.

## Sizing Math

KV bytes per token = `2 (K and V) × num_layers × num_kv_heads × head_dim × bytes_per_element`

| Model (config) | Per-token KV (bf16) | 8k-token sequence |
|---|---|---|
| Llama-3-8B: 32 layers, 8 KV heads, head_dim 128 | 2·32·8·128·2 = 128 KiB | 1 GiB |
| Same model with fp8 KV cache | 64 KiB | 0.5 GiB |
| Hypothetical MHA (32 KV heads) | 512 KiB | 4 GiB |

Grouped-query attention (GQA) shares each KV head across several query heads, cutting the cache by the group factor; multi-query attention (MQA) uses one KV head; multi-head latent attention (MLA, DeepSeek-V2/V3) stores a compressed latent instead of full K/V.

```python
def kv_bytes_per_token(layers: int, kv_heads: int, head_dim: int, dtype_bytes: int) -> int:
    return 2 * layers * kv_heads * head_dim * dtype_bytes


def max_concurrent_seqs(vram_gib: float, weights_gib: float, util: float,
                        overhead_gib: float, per_token: int, ctx_tokens: int) -> int:
    kv_budget = (vram_gib * util - weights_gib - overhead_gib) * 2**30
    if kv_budget <= 0:
        raise ValueError("weights + overhead exceed usable VRAM; quantize weights or add GPUs")
    return int(kv_budget // (per_token * ctx_tokens))

# 80 GiB GPU, 16 GiB bf16 8B weights, util 0.9, ~4 GiB overhead, 8k context:
# kv_budget ≈ 52 GiB -> ~52 sequences at full 8k length (more in practice: most are shorter)
```

## PagedAttention

Contiguous per-request allocation sized for the maximum length wastes memory to internal and external fragmentation; the vLLM paper (Kwon et al., SOSP 2023) measured 60-80% of KV memory wasted in prior systems versus under 4% with paging.

- **Blocks**: the KV cache is split into fixed-size blocks (vLLM default 16 tokens). A per-sequence block table maps logical blocks to physical blocks, so a sequence's cache need not be contiguous.
- **On-demand allocation**: blocks are allocated as tokens are generated; waste is limited to the last partial block.
- **Sharing with copy-on-write**: parallel samples or beams share prompt blocks; a block is copied only when a sequence writes to a shared block.
- **Preemption**: when blocks run out, the scheduler preempts lower-priority sequences. The vLLM V1 engine recomputes preempted sequences; older V0 also supported swapping blocks to CPU memory.

## Prefix Caching
Blocks are hashed by their token content (and prefix), so requests starting with the same tokens reuse cached blocks and skip prefill for that part. Enabled by default in the vLLM V1 engine (`--enable-prefix-caching` on older versions). Put stable content (system prompt, tools, few-shot examples) first and variable content last to maximize hits. Provider APIs expose the same idea as prompt caching.

## vLLM Configuration

```bash
vllm serve meta-llama/Llama-3.1-8B-Instruct \
  --max-model-len 16384 \
  --gpu-memory-utilization 0.90 \
  --kv-cache-dtype fp8 \
  --max-num-seqs 128 \
  --tensor-parallel-size 1
```

```python
from vllm import LLM, SamplingParams

llm = LLM(model="meta-llama/Llama-3.1-8B-Instruct", max_model_len=16384,
          gpu_memory_utilization=0.90, kv_cache_dtype="fp8")
outs = llm.generate(["Summarize: ..."], SamplingParams(temperature=0.2, max_tokens=256))
```

| Flag | Effect | Trade-off |
|---|---|---|
| `--gpu-memory-utilization` | Fraction of VRAM vLLM may use (weights + KV + activations) | Too high → OOM with other processes |
| `--max-model-len` | Longest allowed sequence | Lower = more concurrency, rejects longer prompts |
| `--kv-cache-dtype fp8` | Halves KV memory vs fp16/bf16 | Small accuracy risk; verify on evals |
| `--max-num-seqs` | Cap on concurrently scheduled sequences | Higher throughput vs latency |
| `--tensor-parallel-size` | Shard model across GPUs | Interconnect overhead |
| chunked prefill (default on V1) | Splits long prefills to interleave with decodes | Smoother latency |

On startup vLLM logs the number of KV cache blocks/tokens and the maximum concurrency for `max_model_len`; compare it against your calculation.

## Diagnosing
| Symptom | Cause | Fix |
|---|---|---|
| OOM at startup | Not enough memory for weights + minimal KV | Lower `max_model_len`, quantize weights, add TP |
| Frequent preemption warnings | KV pool exhausted under load | fp8 KV, lower `max_num_seqs`, more GPUs |
| High TTFT with shared prompts | Prefix not reused | Stable prefix ordering; check prefix-cache hit rate metric |
| Throughput low, VRAM free | Batch limited by `max_num_seqs` or CPU | Raise cap; check tokenizer/CPU bottlenecks |

## Anti-Patterns
- Using attention heads instead of KV heads in the math (overestimates GQA models by 4-8×).
- Setting `max_model_len` to the model's maximum "just in case".
- Putting per-request data (timestamps, user ids) at the start of prompts, defeating prefix caching.
- Enabling fp8 KV without re-running quality evals.

## Checklist
- [ ] KV/token computed; concurrency estimated and load tested.
- [ ] `max_model_len` matched to real traffic percentiles.
- [ ] Prefix ordering optimized; hit rate monitored.
- [ ] KV dtype decision backed by eval results.
- [ ] Metrics: KV usage %, preemptions, TTFT, inter-token latency.

## References
- Kwon et al., "Efficient Memory Management for Large Language Model Serving with PagedAttention" (SOSP 2023).
- Ainslie et al., "GQA" (2023); DeepSeek-AI, "DeepSeek-V2" (2024) for MLA.
- vLLM documentation: engine arguments, automatic prefix caching, optimization guide.
