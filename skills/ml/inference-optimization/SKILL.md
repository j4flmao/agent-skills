# LLM Inference Optimization & MLOps

## 1. Skill Context
**Focus**: Optimizing the deployment of Large Language Models (LLMs) in production to maximize throughput, minimize VRAM usage, and reduce latency (Time-to-First-Token).
**Triggers**: inference, vllm, paged-attention, quantization, awq, gptq, kv-cache.

## 2. The Inference Bottleneck: Memory Bandwidth
When running an LLM (e.g., Llama-3 70B), the math (Matrix Multiplication) is not the bottleneck. The bottleneck is loading the 70 Billion weights from the GPU's VRAM into the GPU's Compute Cores for *every single token generated*. 
Inference is fundamentally **Memory-Bandwidth Bound**.

## 3. The KV Cache Problem & PagedAttention
During token generation, the Transformer model must remember the calculations of all previous tokens. It stores these in the **Key-Value (KV) Cache**.
- **The Problem**: In naive PyTorch/HuggingFace implementations, the KV Cache is pre-allocated contiguously in VRAM for the maximum possible sequence length (e.g., 8000 tokens). This wastes up to 80% of VRAM due to fragmentation. You quickly run Out Of Memory (OOM), drastically limiting how many concurrent users you can serve.
- **The Solution (vLLM & PagedAttention)**: Inspired by OS Virtual Memory, PagedAttention breaks the KV cache into fixed-size "blocks" (pages). The blocks do not need to be contiguous in VRAM. This eliminates fragmentation and allows the GPU to serve 3x-4x more concurrent users on the same hardware.

## 4. Quantization (Fitting 70B on limited GPUs)
A 70B parameter model in FP16 (16-bit float) requires ~140GB of VRAM just to load the weights (requiring 2x 80GB A100s).
**Quantization** compresses the weights into lower precision without completely destroying the model's intelligence.

- **PTQ (Post-Training Quantization)**: 
  - **GPTQ**: Compresses weights to 4-bit integers. Reduces the 140GB model to ~35GB (fits on a single A6000). Highly optimized for batch processing.
  - **AWQ (Activation-Aware Weight Quantization)**: Also 4-bit, but smarter. It identifies the top 1% most "important" weights and keeps them in FP16, only quantizing the rest. Often yields better reasoning performance than GPTQ.
- **KV Cache Quantization**: Beyond compressing the model weights, modern engines quantize the KV cache itself to FP8, saving even more VRAM during long context interactions.

## 5. Architectural Rule
Never use `transformers.pipeline()` for a production API serving multiple users. Always deploy a dedicated inference engine like **vLLM**, **TGI (Text Generation Inference)**, or **TensorRT-LLM** to leverage continuous batching and PagedAttention.
