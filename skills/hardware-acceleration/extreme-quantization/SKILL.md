---
name: extreme-quantization-mastery
description: >
  Use this skill when the user says 'quantization', 'int4', 'int8', 'fp8', 'fp4', 'nvfp4', 'mxfp4', 'gptq', 'awq', 'smoothquant', 'w4a16', 'w8a8', 'bitsandbytes', 'nf4'. Selects and applies low-bit weight/activation/KV-cache quantization for LLM inference and training on NVIDIA hardware, and validates accuracy loss. Do NOT use for: generic quantization theory for model formats (ai model-quantization skill), TensorRT engine building (tensorrt-optimization), KV-cache paging (paged-attention), fine-tuning workflows (ml-deep-learning).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
tags: [hardware-acceleration, quantization, fp8, int4, gptq, awq, llm-inference]
---

# Extreme Quantization (sub-16-bit LLMs)

## Purpose
Shrink LLM weights, activations and KV cache to 8, 4 or fewer bits so models fit in less memory and run faster. Weight-only quantization speeds up memory-bound decoding; weight+activation quantization speeds up compute-bound prefill and large batches. Every scheme must be validated on task evals, not just perplexity.

## Agent Protocol

### Trigger
"quantize", "int4", "int8", "fp8", "fp4", "nvfp4", "mxfp4", "gptq", "awq", "smoothquant", "w4a16", "w8a8", "nf4", "bitsandbytes", "kv cache fp8".

### Input Context
- Model + size, target GPU generation (Ampere sm_80, Ada sm_89, Hopper sm_90, Blackwell sm_100/sm_120).
- Serving engine (vLLM, SGLang, TensorRT-LLM, llama.cpp) and batch profile (latency vs throughput).
- Accuracy budget and evaluation set.

### Output Artifact
Quantization recipe + command/code + evaluation plan. No file unless requested.

### Response Format
```
Scheme: {W4A16|W8A8-INT8|W8A8-FP8|NVFP4|...} group={size}
Method: {GPTQ|AWQ|SmoothQuant|RTN|dynamic FP8}
Hardware path: {kernel/tensor-core type}
Memory: {before} -> {after}
Eval: {tasks, max allowed drop}
```

### Completion Criteria
- [ ] Target engine + GPU support the chosen format natively (otherwise it is slower, not faster).
- [ ] Calibration data resembles production prompts.
- [ ] Baseline vs quantized evaluated on the same harness and seeds.
- [ ] Sensitive layers (lm_head, embeddings, sometimes first/last blocks) excluded or kept higher precision.

## Formats
| Format | Bits | Notes |
|--------|------|-------|
| BF16/FP16 | 16 | Baseline. |
| INT8 | 8 | Per-channel weights, per-token activations. Tensor cores since Turing. |
| FP8 E4M3 | 8 | 4 exp / 3 mantissa, max 448. Weights + activations (forward). Tensor cores on Ada and Hopper and later. |
| FP8 E5M2 | 8 | 5 exp / 2 mantissa, max 57344. Wider range; used for gradients in FP8 training. |
| INT4 (W4A16) | 4 | Weight-only, group-wise scales (group size 128 typical). Dequantized in the GEMM kernel (e.g. Marlin/Machete). |
| MXFP4 | 4 | OCP microscaling: E2M1 values, one E8M0 (power-of-two) scale per 32 elements. |
| NVFP4 | 4 | E2M1 values, one FP8 E4M3 scale per 16 elements plus a per-tensor FP32 scale. Native on Blackwell tensor cores. |
| NF4 | 4 | bitsandbytes NormalFloat for QLoRA; storage format, not a fast inference path. |

## Methods
- **RTN (round-to-nearest)**: no calibration. Fine at 8-bit, often poor at 4-bit.
- **GPTQ** (Frantar et al., 2022): quantizes weights column by column and updates the remaining columns to compensate the error, using second-order information from the layer-input Hessian (H = 2XXᵀ); a Cholesky factorization of H⁻¹ makes it numerically stable and fast. Needs a few hundred calibration samples.
- **AWQ** (Lin et al., 2023): observes that a small fraction of weight channels (those multiplied by large activations) matter most. Instead of keeping them in FP16 (mixed precision is hardware-unfriendly), it scales those channels up before quantization and folds the inverse scale into the preceding op, so all weights stay uniformly 4-bit.
- **SmoothQuant** (Xiao et al., 2022): for W8A8, migrates activation outliers into weights with a per-channel scale s_j = max|X_j|^α / max|W_j|^(1-α) (α≈0.5), making both tensors quantizable to INT8.
- **FP8 dynamic/static**: per-tensor or per-channel scales; nearly lossless for most LLMs and the default first choice on Hopper/Blackwell.
- **KV-cache FP8**: halves KV memory vs BF16, raising batch size/context; validate on long-context tasks.

## Decision Rules
```
GPU is Hopper/Blackwell and engine supports FP8? → W8A8-FP8 first (lowest risk)
Memory-bound decoding, small batch, need max compression → W4A16 (AWQ or GPTQ)
High-throughput serving, large batches on Ampere → W8A8-INT8 (SmoothQuant + GPTQ)
Blackwell, aggressive throughput → NVFP4 (validate carefully; consider QAT)
Fine-tuning on limited memory → QLoRA (NF4 base + BF16 adapters)
```
Weight-only 4-bit can be *slower* than BF16 at large batch sizes because dequantization adds work to a compute-bound GEMM.

## Example: GPTQ W4A16 with llm-compressor (vLLM ecosystem)
```python
from llmcompressor import oneshot
from llmcompressor.modifiers.quantization import GPTQModifier

recipe = GPTQModifier(targets="Linear", scheme="W4A16", ignore=["lm_head"])
oneshot(
    model="meta-llama/Llama-3.1-8B-Instruct",
    dataset="open_platypus",
    recipe=recipe,
    max_seq_length=2048,
    num_calibration_samples=512,
    output_dir="Llama-3.1-8B-Instruct-W4A16",
)
```
```bash
vllm serve ./Llama-3.1-8B-Instruct-W4A16          # format detected from the saved config
vllm serve meta-llama/Llama-3.1-8B-Instruct --quantization fp8 --kv-cache-dtype fp8   # dynamic FP8
```

## Example: 4-bit loading for QLoRA (transformers + bitsandbytes)
```python
import torch
from transformers import AutoModelForCausalLM, BitsAndBytesConfig

bnb = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_use_double_quant=True,
)
model = AutoModelForCausalLM.from_pretrained(
    "meta-llama/Llama-3.1-8B", quantization_config=bnb, device_map="auto"
)
```

## FP8 Training
NVIDIA Transformer Engine's hybrid recipe uses E4M3 in the forward pass and E5M2 for gradients, with delayed scaling (scale from an amax history). Newer recipes use finer-grained (block/MX) scaling. Keep master weights and optimizer state in higher precision.

## Memory Arithmetic
Weights ≈ params x bits / 8. A 70B model: ~140 GB in BF16, ~70 GB in FP8, ~35-40 GB in 4-bit (scales/zeros add overhead). KV cache and activations come on top and often dominate at long context.

## Anti-Patterns
- Reporting only perplexity; 4-bit damage shows up first in math, code and long-context tasks.
- Quantizing for a format the GPU lacks tensor-core support for (e.g. FP8 on Ampere falls back to slower weight-only paths or fails).
- Calibrating on generic web text when production is code or another language.
- Relying on unmaintained tooling: AutoGPTQ is archived and AutoAWQ is deprecated; prefer llm-compressor, GPTQModel, or NVIDIA Model Optimizer.

## References
- Papers: GPTQ (arXiv:2210.17323), AWQ (arXiv:2306.00978), SmoothQuant (arXiv:2211.10438), FP8 Formats for Deep Learning (arXiv:2209.05433).
- Related: `../tensorrt-optimization/SKILL.md`, `../paged-attention/SKILL.md`.
