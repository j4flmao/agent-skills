---
name: local-slm-inference
description: >
  Use this skill when the user says 'run a model locally', 'local SLM', 'llama.cpp', 'Ollama', 'GGUF', 'offload layers to GPU', 'n-gpu-layers', 'KV cache on CPU', 'LM Studio', 'on-device LLM'. Prototypes local small-language-model inference: picking model size and GGUF quant for the hardware, splitting layers and KV cache between GPU and CPU, KV cache quantization, context sizing, and exposing an OpenAI-compatible endpoint. Do NOT use for: multi-GPU production serving (ai/llm-engineering/kv-cache with vLLM), producing quantized weights (ai/llm-engineering/model-quantization), or fine-tuning (ai/llm-finetuning).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [rnd, ai-agents, local-slm-inference, llama-cpp, ollama, gguf, kv-cache]
---

# Local SLM Inference & KV Cache Offloading

## Purpose
Run small and mid-size language models on a laptop, workstation, or edge box with llama.cpp or Ollama. The core engineering problem is fitting weights plus KV cache into the memory you have (VRAM, unified memory, system RAM) while keeping tokens/s acceptable. This PoC skill gives the sizing math, the relevant runtime flags, and a measurement loop.

## Agent Protocol

### Trigger
"llama.cpp", "llama-server", "Ollama", "GGUF", "run locally", "n-gpu-layers", "-ngl", "KV cache offload", "num_ctx", "local OpenAI-compatible endpoint".

### Input Context
- Hardware: GPU model + VRAM, or Apple Silicon unified memory, system RAM, CPU cores.
- Target model family/size and required context length.
- Use: interactive chat, batch jobs, agent tool calling.

### Output Artifact
Model + quant choice, memory budget, launch command/Modelfile, and a benchmark plan (prompt eval and generation tokens/s).

### Response Format
```
Hardware: {gpu/vram | unified mem | cpu}  Model: {name} {quant} ({GB})
Context: {n} tokens  KV: {GB} at {f16|q8_0}
Placement: -ngl {layers or all}  KV on {gpu|cpu}
Command: {llama-server ... | ollama Modelfile}
Expect: verify prompt-eval and gen tok/s with llama-bench
```

### Completion Criteria
- [ ] Weights + KV + overhead fit in target memory with margin.
- [ ] GPU layer count set explicitly and verified in startup logs.
- [ ] Context size chosen for the workload, not the model maximum.
- [ ] Throughput measured with `llama-bench` or server timings.

## Memory Budget
```
weights   ≈ GGUF file size (Q4_K_M ≈ 4.8-5 bits/weight → 8B model ≈ 4.9 GB)
kv_cache  = 2 × n_layers × n_kv_heads × head_dim × n_ctx × bytes_per_elem
overhead  ≈ compute buffers (hundreds of MB to ~1-2 GB depending on batch/context)
```
Example Llama-3.1-8B (32 layers, 8 KV heads, head_dim 128): f16 KV = 128 KiB/token → 8k context = 1 GiB; q8_0 KV roughly halves that.

| Hardware | Practical starting point |
|---|---|
| 8 GB VRAM | 7-8B at Q4_K_M, 4-8k context |
| 12-16 GB VRAM | 8B at Q6_K/Q8_0 or 12-14B at Q4_K_M |
| 24 GB VRAM | ~30B-class at Q4_K_M with moderate context |
| Apple Silicon 32-64 GB | Metal backend uses unified memory; larger models fit, bandwidth limits speed |
| CPU only | 1-4B models; speed bound by RAM bandwidth |

## How llama.cpp Places Work
- **Layer offload** `-ngl N` / `--n-gpu-layers N`: N transformer layers are placed on the GPU; the rest run on CPU. Use a large value (e.g. 999) to offload all layers.
- **KV cache placement**: by default each offloaded layer keeps its KV cache on the GPU. `-nkvo` / `--no-kv-offload` keeps KV in host RAM, freeing VRAM for more layers at the cost of speed.
- **KV quantization**: `--cache-type-k q8_0 --cache-type-v q8_0` (`-ctk`/`-ctv`); quantizing V requires flash attention (`-fa`; recent builds take `on|off|auto`).
- **Multi-GPU**: `--split-mode layer` (default) or `row`, with `--tensor-split` ratios.
- **Memory mapping**: GGUF is mmap'd by default so loading is fast and pages are shared; `--mlock` pins it in RAM; `--no-mmap` loads fully.
- **Threads**: `-t` for generation threads; set near the number of physical performance cores.

## Commands

```bash
# Benchmark offload settings (pp = prompt processing, tg = token generation)
llama-bench -m models/llama-3.1-8b-instruct-Q4_K_M.gguf -ngl 0,16,32,99 -p 512 -n 128

# OpenAI-compatible server
llama-server -m models/llama-3.1-8b-instruct-Q4_K_M.gguf \
  -ngl 99 -c 8192 -fa on -ctk q8_0 -ctv q8_0 \
  --host 127.0.0.1 --port 8080 --api-key "$LLAMA_API_KEY"
```

```python
import os
from openai import OpenAI

client = OpenAI(base_url="http://127.0.0.1:8080/v1", api_key=os.environ["LLAMA_API_KEY"], timeout=60)
resp = client.chat.completions.create(model="local", messages=[{"role": "user", "content": "Hi"}],
                                      max_tokens=128)
print(resp.choices[0].message.content)
```

Ollama equivalent (Modelfile):
```
FROM ./llama-3.1-8b-instruct-Q4_K_M.gguf
PARAMETER num_ctx 8192
PARAMETER num_gpu 99
```
`ollama create local-llama -f Modelfile && ollama run local-llama`. KV cache quantization in Ollama is enabled with `OLLAMA_FLASH_ATTENTION=1` and `OLLAMA_KV_CACHE_TYPE=q8_0`. Ollama serves `/api/chat` and an OpenAI-compatible `/v1/chat/completions` on port 11434.

## Tuning Loop
1. Start with all layers on GPU; if OOM, reduce context, quantize KV, then reduce `-ngl`.
2. Watch startup logs for offloaded layer count and buffer sizes.
3. Measure with `llama-bench`; partial offload often drops generation speed sharply once a few layers run on CPU, so a smaller model fully on GPU can beat a larger split model.
4. For agents, verify tool-call/JSON reliability at the chosen quant (use grammar/JSON-schema constrained output: `--grammar-file` or `response_format` on the server).

## Anti-Patterns
- Setting context to the model's maximum (e.g. 128k) and running out of memory.
- Exposing `llama-server` on `0.0.0.0` without an API key.
- Comparing speeds without separating prompt processing from generation.
- Assuming chat templates are right: check the GGUF's embedded template or pass `--chat-template`.

## Checklist
- [ ] Memory budget computed (weights + KV + overhead).
- [ ] Quant chosen from benchmarks + quality spot checks.
- [ ] `-ngl`, `-c`, KV type, flash attention set explicitly.
- [ ] Server bound to localhost or protected with a key.
- [ ] Throughput and quality recorded for the PoC report.

## References
- llama.cpp repository docs: `llama-server`, `llama-bench`, build backends (CUDA, Metal, Vulkan, CPU).
- Ollama documentation: Modelfile parameters, environment variables, OpenAI compatibility.
