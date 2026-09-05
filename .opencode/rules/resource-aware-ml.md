---
description: "j4flmao/rules — Mandatory standards for ML Engineering and GPU resource management"
glob: "*"
---

# Resource-Aware Machine Learning Rules

Cursor/AI MUST follow these rules when writing code for PyTorch, ML Inference, or GPU computations.

## 1. Ban FP32 for Large Models
- **Rule**: Never initialize or load large Transformer models in `float32` (FP32) unless explicitly requested. 
- **Why**: It instantly causes VRAM exhaustion (OOM). 
- **Action**: Always default to `torch.float16` or `torch.bfloat16`. 
  ```python
  # BAD
  model = AutoModelForCausalLM.from_pretrained("llama")
  # GOOD
  model = AutoModelForCausalLM.from_pretrained("llama", torch_dtype=torch.bfloat16)
  ```

## 2. Enforce Inference Engines for APIs
- **Rule**: If asked to "create a production API to serve an LLM", do NOT write a Flask/FastAPI wrapper around `transformers.generate()`.
- **Action**: You must propose or implement an enterprise-grade inference engine (e.g., `vLLM` or `TGI`) that supports continuous batching and PagedAttention.

## 3. Explicit Device Management
- **Rule**: Never hardcode `.to('cuda:0')`. Always use dynamic device selection and gracefully fallback to CPU/MPS if CUDA is unavailable.
- **Action**: Use `device = torch.device("cuda" if torch.cuda.is_available() else "cpu")`.
