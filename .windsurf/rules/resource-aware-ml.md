---
description: "j4flmao/rules — Mandatory standards for ML Engineering and GPU resource management"
glob: "*"
---

# Resource-Aware Machine Learning Rules

Cursor/AI MUST follow these rules when writing code for PyTorch, ML Inference, or GPU computations.

## 1. No FP32 by Default for Large Models
- **Rule**: Do not load large Transformer models in `float32` on GPU unless explicitly requested. FP32 weights take 4 bytes per parameter (a 7B model needs ~28 GB before activations and KV cache).
- **Action**: Default to `bfloat16` on GPUs that support it (NVIDIA Ampere and newer); use `float16` on older GPUs. Use 4/8-bit quantization (bitsandbytes, AWQ, GPTQ) when VRAM is still insufficient.
  ```python
  # BAD: loads weights in FP32
  model = AutoModelForCausalLM.from_pretrained("meta-llama/Llama-3.1-8B-Instruct")

  # GOOD (`dtype` replaced `torch_dtype` in recent transformers; older versions use torch_dtype=)
  model = AutoModelForCausalLM.from_pretrained(
      "meta-llama/Llama-3.1-8B-Instruct",
      dtype=torch.bfloat16,
      device_map="auto",  # requires `accelerate`
  )
  ```
- **Estimate before loading**: weights ≈ params × bytes/param, plus KV cache ≈ 2 × layers × kv_heads × head_dim × seq_len × batch × bytes.

## 2. Use Inference Engines for Serving APIs
- **Rule**: If asked to "create a production API to serve an LLM", do NOT write a Flask/FastAPI wrapper around `transformers.generate()`. It handles one request at a time and wastes GPU memory.
- **Action**: Use a serving engine with continuous batching and paged KV cache, such as `vLLM`, `SGLang`, `TensorRT-LLM`, or `TGI`. Most expose an OpenAI-compatible endpoint. Put auth, rate limiting, and timeouts in front of it.

## 3. Explicit Device Management
- **Rule**: Never hardcode `.to('cuda:0')`. Select the device dynamically and fall back gracefully.
  ```python
  device = (
      torch.device("cuda") if torch.cuda.is_available()
      else torch.device("mps") if torch.backends.mps.is_available()
      else torch.device("cpu")
  )
  ```
- **Rule**: Wrap inference in `torch.inference_mode()`, and call `model.eval()` before inference.
