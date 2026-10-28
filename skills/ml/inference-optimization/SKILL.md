---
name: ml-inference-optimization
description: >
  Use this skill when the user says 'llm inference optimization', 'reduce latency llm', 'time to first token', 'ttft', 'tokens per second', 'llm throughput', 'vllm vs tgi', 'speculative decoding', 'continuous batching', 'serve llm cheaper'. Diagnoses and optimizes LLM inference end to end: latency/throughput metrics, memory budget, engine choice, batching, quantization, KV cache, parallelism and speculative decoding. Do NOT use for: deep KV-cache paging internals (paged-attention), quantization algorithm details (extreme-quantization-mastery), TensorRT engine builds (tensorrt-optimization), classical model serving infra (ml-model-serving).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
tags: [ml, llm, inference, vllm, latency, throughput, optimization]
---

# LLM Inference Optimization

## Purpose
Serve LLMs at the required latency for the lowest cost. Decoding one token at a time is usually memory-bandwidth bound (every step reads all weights plus the KV cache), while prompt prefill is compute bound. Optimizations therefore aim to batch more requests per weight read, shrink bytes moved (quantization, KV compression), and generate more tokens per step (speculative decoding).

## Agent Protocol

### Trigger
"llm inference", "optimize inference", "ttft", "time to first token", "tokens per second", "throughput", "inter-token latency", "vllm", "sglang", "tgi", "tensorrt-llm", "speculative decoding", "serving cost".

### Input Context
- Model, GPU type/count, current engine and config.
- Traffic: prompt and output length distributions, concurrency, latency SLOs (TTFT, inter-token latency).
- Current metrics and cost per million tokens.

### Output Artifact
Bottleneck diagnosis + prioritized changes + benchmark plan. No file unless requested.

### Response Format
```
Workload: prompt {p50/p95 tokens}, output {p50/p95}, concurrency {n}
Bound: {prefill compute|decode bandwidth|KV capacity|scheduler/host}
Changes (ordered): 1) {...} 2) {...}
Benchmark: {tool + metric targets}
```

### Completion Criteria
- [ ] Baseline measured with realistic prompt/output lengths and concurrency.
- [ ] Each change measured separately for TTFT, inter-token latency, throughput, quality.
- [ ] Quality evaluated after quantization or speculative decoding config changes.

## Metrics
| Metric | Meaning | Dominated by |
|--------|---------|--------------|
| TTFT | Time to first token | Queueing + prefill (prompt length) |
| ITL / TPOT | Time between output tokens | Decode step time (weights + KV bytes / bandwidth) |
| Throughput | Output tokens/s across all requests | Batch size the KV memory allows |
| Goodput | Requests/s meeting the SLO | Trade-off between batch size and latency |

## Memory Budget
- Weights: params x bytes per param (70B BF16 ≈ 140 GB → at least 2 x 80 GB GPUs; FP8 ≈ 70 GB; 4-bit ≈ 35-40 GB).
- KV cache per token: 2 x layers x kv_heads x head_dim x bytes. Grouped-query attention models have far fewer KV heads than query heads.
- Whatever remains after weights and activations is KV capacity, which caps concurrency.

## Optimization Levers (roughly in order)
| Lever | Helps | Notes |
|-------|-------|-------|
| Dedicated engine (vLLM, SGLang, TensorRT-LLM, TGI) | Large throughput gains over naive `generate()` loops | Continuous batching, paged KV cache, fused kernels |
| Continuous batching | Throughput | New requests join at every step |
| Paged KV cache + prefix caching | Concurrency, TTFT for shared prompts | Keep shared system prompt/document first |
| FP8 weights/activations (Hopper+) | Throughput, memory | Near-lossless for most models; validate |
| 4-bit weight-only (AWQ/GPTQ) | Memory, small-batch latency | Can be slower at large batch |
| FP8 KV cache | Concurrency, long context | Validate long-context quality |
| Tensor parallelism | Latency, fit large models | Needs fast intra-node links (NVLink) |
| Speculative decoding (draft model, n-gram, EAGLE, MTP heads) | Inter-token latency at low/medium load | Gains shrink when GPU is already saturated by batching |
| Chunked prefill | Tail ITL during long prompts | Interleaves prefill chunks with decode |
| Prefill/decode disaggregation | SLOs at scale | Separate GPU pools; KV transfer between them |

## Example: vLLM Offline Batch + Server
```python
from vllm import LLM, SamplingParams

llm = LLM(
    model="Qwen/Qwen2.5-7B-Instruct",
    gpu_memory_utilization=0.90,
    max_model_len=8192,
    enable_prefix_caching=True,
)
params = SamplingParams(temperature=0.2, max_tokens=256)
outputs = llm.generate(["Summarize: ...document text...", "Translate to French: hello"], params)
for o in outputs:
    print(o.outputs[0].text)
```
```bash
vllm serve Qwen/Qwen2.5-7B-Instruct --max-model-len 8192 --enable-prefix-caching
```
Pass prompts as a list so the engine batches them; looping one prompt at a time throws away batching.

## Benchmarking
- Use the engine's benchmark tooling (e.g. `vllm bench serve`) or a load generator that replays real length distributions at fixed request rates.
- Sweep request rate; plot TTFT/ITL p50/p99 vs throughput to find the knee.
- Warm up first; report GPU type, engine version, precision, and max concurrency.

## Decision Rules
```
TTFT high, ITL fine → prefill bound or queueing: prefix caching, chunked prefill, more replicas
ITL high at low load → bandwidth bound: quantize weights, speculative decoding, TP
Throughput capped with KV usage ~100% → FP8 KV, shorter max_model_len, quantized weights, more GPUs
GPU util low with high load → host/scheduler bound: check tokenizer, detokenization, Python overhead, engine version
```

## Anti-Patterns
- Serving production traffic with `transformers` `pipeline()`/`generate()` per request.
- Benchmarking with one prompt length and concurrency 1, then sizing a fleet.
- Enabling every optimization at once without per-change measurement.
- Claiming quality is unchanged after quantization without task evals.

## References
- Related skills: `../../hardware-acceleration/paged-attention/SKILL.md`, `../../hardware-acceleration/extreme-quantization/SKILL.md`, `../../hardware-acceleration/flash-attention/SKILL.md`, `../model-serving/SKILL.md`.
- Kwon et al., PagedAttention/vLLM (arXiv:2309.06180); Leviathan et al., speculative decoding (arXiv:2211.17192).
