---
name: llm-model-quantization
description: >
  Use this skill when the user says 'quantize a model', 'GPTQ', 'AWQ', 'GGUF', 'Q4_K_M', 'INT4 / INT8 / FP8 weights', 'NF4', 'bitsandbytes', 'model too big for my GPU'. Explains how weight (and activation) quantization works, compares GPTQ, AWQ, GGUF k-quants, bitsandbytes NF4, and FP8, and gives working commands to produce and serve quantized models with an evaluation gate. Do NOT use for: KV cache sizing (ai/llm-engineering/kv-cache), QLoRA fine-tuning workflows (ai/llm-finetuning), or running local models end to end (rnd/ai-agents/local-slm-inference).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [ai, llm, quantization, gptq, awq, gguf, fp8, inference]
---

# Model Quantization

## Purpose
Quantization stores weights (and optionally activations) in fewer bits so a model fits in less memory and decodes faster, since decoding is usually memory-bandwidth bound. The cost is a quality loss that depends on bit width, method, calibration data, and model. Pick the format your inference engine runs fastest, quantize with a calibration-aware method, and gate the result on your own evals.

## Agent Protocol

### Trigger
"quantize", "GPTQ", "AWQ", "GGUF", "k-quants", "Q4_K_M", "INT4", "INT8", "FP8", "NF4", "bitsandbytes", "fit model in VRAM".

### Input Context
- Model and size; target hardware (NVIDIA generation, Apple Silicon, CPU).
- Inference engine (vLLM, TensorRT-LLM, llama.cpp/Ollama, transformers).
- Quality tolerance and the eval set that measures it.

### Output Artifact
Recommended format and bit width, quantization commands, memory estimate, eval comparison plan.

### Response Format
```
Target: {hardware} via {engine}
Format: {fp8|awq-w4a16|gptq-w4a16|gguf Q4_K_M|nf4}
Memory: weights ≈ params × bits/8 (+ scales) = {GB}
Steps: {commands}
Eval gate: {metric} drop ≤ {x}% vs bf16 baseline
```

### Completion Criteria
- [ ] Format supported natively by the target engine/hardware.
- [ ] Calibration data resembles production inputs.
- [ ] Baseline vs quantized evaluated on task metrics, not only perplexity.
- [ ] Throughput/latency measured, not assumed.

## How It Works

Affine (asymmetric) quantization of a group of weights:

```
scale  s = (max(W) - min(W)) / (2^b - 1)
zero   z = round(-min(W) / s)
q      = clamp(round(W / s) + z, 0, 2^b - 1)
W_hat  = s · (q - z)
```

Symmetric quantization fixes `z = 0` and uses a signed range. **Group-wise** quantization (e.g. group size 128) keeps a separate scale (and zero point) per group, limiting the damage from outliers at a cost of extra bits per weight (a 16-bit scale per 128 weights adds 0.125 bits/weight).

Weight-only schemes (W4A16, W8A16) dequantize inside the matmul kernel; they help most in the memory-bound decode phase. Weight+activation schemes (W8A8 INT8/FP8) also speed up compute-bound prefill on hardware with matching tensor-core support.

## Methods

| Method | Idea | Calibration | Typical use |
|---|---|---|---|
| RTN (round-to-nearest) | Quantize each group independently | None | Baseline; fine at 8-bit |
| GPTQ | Quantize columns sequentially, compensate error in remaining weights using approximate second-order (Hessian) information | Yes (small dataset) | 4-bit GPU serving |
| AWQ | Find salient weight channels via activation magnitudes; scale them up (inputs scaled down) before quantizing so their relative error shrinks | Yes | 4-bit GPU serving |
| SmoothQuant | Migrate activation outliers into weights to enable W8A8 | Yes | INT8 activations |
| FP8 (E4M3) | 8-bit float weights/activations with per-tensor or per-channel scales | Optional (static scales) | Hopper/Ada/Blackwell GPUs |
| NF4 (bitsandbytes) | 4-bit NormalFloat data type with double quantization of scales | None | QLoRA training, quick experiments |
| GGUF k-quants | Block quantization with super-blocks of quantized scales; optional importance matrix | Optional (imatrix) | llama.cpp / Ollama on CPU, Apple, mixed CPU+GPU |

## Choosing a Format
```
Engine?
├── vLLM / TensorRT-LLM / SGLang on recent NVIDIA (FP8-capable)
│   └── FP8 W8A8 first (near-lossless on most models); W4A16 (AWQ/GPTQ) if memory-bound
├── vLLM on older GPUs (Ampere) → W4A16 AWQ or GPTQ (Marlin kernels)
├── llama.cpp / Ollama / LM Studio → GGUF: Q4_K_M default, Q5_K_M/Q6_K for quality, Q8_0 near-lossless
├── transformers experiments / QLoRA → bitsandbytes NF4
└── Blackwell → FP4 variants (NVFP4/MXFP4) where the engine supports them; eval carefully
```

## Producing Quantized Models

**W4A16 GPTQ with llm-compressor (vLLM project)**; AutoGPTQ and AutoAWQ are no longer maintained, so prefer llm-compressor or GPTQModel:

```python
from llmcompressor import oneshot
from llmcompressor.modifiers.quantization import GPTQModifier

recipe = GPTQModifier(targets="Linear", scheme="W4A16", ignore=["lm_head"])
oneshot(
    model="meta-llama/Llama-3.1-8B-Instruct",
    dataset="open_platypus",              # replace with in-domain calibration data
    recipe=recipe,
    max_seq_length=2048,
    num_calibration_samples=512,
    output_dir="Llama-3.1-8B-Instruct-W4A16",
)
# Serve: vllm serve ./Llama-3.1-8B-Instruct-W4A16   (format detected from the saved config)
```

**GGUF with llama.cpp**:

```bash
python convert_hf_to_gguf.py ./Llama-3.1-8B-Instruct --outtype f16 --outfile llama-f16.gguf
./llama-imatrix -m llama-f16.gguf -f calibration.txt -o imatrix.dat      # optional, helps low bits
./llama-quantize --imatrix imatrix.dat llama-f16.gguf llama-Q4_K_M.gguf Q4_K_M
```

**NF4 on load (bitsandbytes)**:

```python
import torch
from transformers import AutoModelForCausalLM, BitsAndBytesConfig

bnb = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4",
                         bnb_4bit_compute_dtype=torch.bfloat16, bnb_4bit_use_double_quant=True)
model = AutoModelForCausalLM.from_pretrained("meta-llama/Llama-3.1-8B-Instruct",
                                             quantization_config=bnb, device_map="auto")
```

## Memory Estimates (weights only)
| Params | bf16 | 8-bit | ~4.5 bits (4-bit + scales) |
|---|---|---|---|
| 8B | 16 GB | 8 GB | ~4.5 GB |
| 70B | 140 GB | 70 GB | ~40 GB |

Add KV cache and runtime overhead on top (see the kv-cache skill).

## Evaluation Gate
1. Run the bf16 baseline and the quantized model on the same task evals (accuracy, pass@k, rubric scores) plus a perplexity sanity check.
2. Check long-context and tool-calling behaviour separately; they degrade before short QA does.
3. Measure tokens/s and TTFT on the real engine and batch sizes; low-bit kernels can be slower at large batch.
4. Ship only if the drop is within the agreed threshold.

## Anti-Patterns
- Judging quality by perplexity alone.
- Calibrating on generic web text for a domain model (code, legal, non-English).
- Quantizing `lm_head`/embeddings aggressively without testing.
- Choosing a format the engine dequantizes in slow fallback kernels.
- Comparing speed at batch size 1 when production runs batched.

## Checklist
- [ ] Format matches engine and GPU generation.
- [ ] In-domain calibration set (hundreds of samples).
- [ ] Baseline vs quantized eval table recorded.
- [ ] Throughput/latency benchmark on target hardware.
- [ ] Model card notes method, bits, group size, calibration data.

## References
- Frantar et al., "GPTQ" (ICLR 2023); Lin et al., "AWQ" (MLSys 2024); Xiao et al., "SmoothQuant" (ICML 2023); Dettmers et al., "QLoRA" (NeurIPS 2023).
- llama.cpp docs: `convert_hf_to_gguf.py`, `llama-quantize`, `llama-imatrix`; vLLM quantization docs; llm-compressor examples.
