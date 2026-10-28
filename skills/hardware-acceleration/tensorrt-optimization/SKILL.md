---
name: tensorrt-optimization
description: >
  Use this skill when the user says 'tensorrt', 'trt', 'trtexec', 'onnx to tensorrt', 'tensorrt engine', 'tensorrt-llm', 'trt-llm', 'int8 calibration', 'fp8 engine', 'optimization profile', 'dynamic shapes tensorrt'. Builds and tunes NVIDIA TensorRT engines from ONNX (precision, dynamic shapes, explicit quantization, profiling) and serves LLMs with TensorRT-LLM. Do NOT use for: choosing quantization algorithms in depth (extreme-quantization-mastery), KV-cache paging concepts (paged-attention), framework-agnostic model serving platforms (ml-model-serving), custom CUDA kernels (cuda-programming).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
tags: [hardware-acceleration, tensorrt, tensorrt-llm, onnx, inference, nvidia]
---

# TensorRT Optimization

## Purpose
TensorRT compiles a network (usually ONNX) into an engine optimized for one GPU model and TensorRT version: it fuses layers, selects the fastest kernel ("tactic") per layer, plans memory, and runs reduced precision where allowed. TensorRT-LLM builds on it for LLMs with in-flight batching, paged KV cache and quantized kernels. Gains are real but must be measured against the framework baseline at the target batch size.

## Agent Protocol

### Trigger
"tensorrt", "trt", "trtexec", "onnx to tensorrt", "engine build", "tensorrt-llm", "trtllm", "int8 calibration", "fp8 engine", "optimization profile", "dynamic shapes".

### Input Context
- Model + export path (PyTorch → ONNX opset), input shapes and their ranges.
- Target GPU, TensorRT / TensorRT-LLM version, latency vs throughput goal.
- Accuracy tolerance and evaluation set.

### Output Artifact
Build command/script + precision plan + benchmark plan. No file unless requested.

### Response Format
```
Engine: {precision} profile min/opt/max={shapes}
Build: {trtexec or Python command}
Benchmark: {latency p50/p99, throughput} vs baseline
Accuracy: {metric delta}
```

### Completion Criteria
- [ ] ONNX validated (onnx checker / Polygraphy) and outputs match the framework within tolerance.
- [ ] Engine built on the same GPU model + TensorRT version used in production.
- [ ] Dynamic shape profile covers real traffic; `opt` set to the most common shape.
- [ ] Accuracy re-checked after reduced precision.

## Workflow
```
PyTorch → torch.onnx.export (dynamic axes) → validate ONNX (Polygraphy) →
trtexec / Python builder (precision, profiles) → compare outputs → benchmark → deploy (Triton Inference Server or custom runtime)
```

## trtexec
```bash
trtexec --onnx=model.onnx --saveEngine=model.plan \
  --fp16 \
  --minShapes=input:1x3x224x224 --optShapes=input:8x3x224x224 --maxShapes=input:32x3x224x224 \
  --memPoolSize=workspace:4096 \
  --dumpProfile --separateProfileRun
trtexec --loadEngine=model.plan --shapes=input:8x3x224x224   # benchmark an existing engine
```
`--best` allows all precisions (lets TensorRT pick per layer); `--stronglyTyped` makes TensorRT follow the ONNX tensor types exactly (used with explicitly quantized models).

## Python Builder (TensorRT 10)
```python
import tensorrt as trt

LOGGER = trt.Logger(trt.Logger.WARNING)

def build_engine(onnx_path: str, plan_path: str) -> None:
    builder = trt.Builder(LOGGER)
    network = builder.create_network(0)          # explicit batch is the only mode in TRT 10
    parser = trt.OnnxParser(network, LOGGER)
    with open(onnx_path, "rb") as f:
        if not parser.parse(f.read()):
            errors = [str(parser.get_error(i)) for i in range(parser.num_errors)]
            raise RuntimeError(f"ONNX parse failed for {onnx_path}: {errors}")

    config = builder.create_builder_config()
    config.set_memory_pool_limit(trt.MemoryPoolType.WORKSPACE, 4 << 30)
    config.set_flag(trt.BuilderFlag.FP16)

    profile = builder.create_optimization_profile()
    profile.set_shape("input", (1, 3, 224, 224), (8, 3, 224, 224), (32, 3, 224, 224))
    config.add_optimization_profile(profile)

    serialized = builder.build_serialized_network(network, config)
    if serialized is None:
        raise RuntimeError(f"TensorRT build failed for {onnx_path}")
    with open(plan_path, "wb") as f:
        f.write(serialized)
```
TensorRT 10 removed `max_workspace_size` (use `set_memory_pool_limit`) and the implicit-batch mode.

## Precision Strategy
| Precision | When | How |
|-----------|------|-----|
| FP16 / BF16 | Default first step; usually small accuracy impact | `--fp16` / `--bf16` |
| FP8 | Hopper/Ada/Blackwell, LLMs and transformers | Explicit quantization (Q/DQ nodes) from NVIDIA Model Optimizer (`nvidia-modelopt`) |
| INT8 | CNNs, older GPUs | Prefer explicit Q/DQ (PTQ or QAT via Model Optimizer); implicit calibrator-based INT8 is deprecated in TensorRT 10 |
| INT4 / FP4 (weights) | LLM weight-only or Blackwell FP4 | TensorRT-LLM / Model Optimizer recipes |

Keep numerically sensitive layers (softmax, layer norm, final classifier) in higher precision when accuracy drops; Polygraphy can bisect which layers cause mismatches.

## What TensorRT Does
- Layer/tensor fusion (conv+bias+activation, GEMM epilogues, attention patterns via plugins/Myelin).
- Tactic selection: benchmarks candidate kernels per layer for the target GPU (build can take minutes; use a timing cache to speed rebuilds).
- Memory planning and constant folding.
Engines are not portable across GPU models or TensorRT versions unless built with hardware/version compatibility options, which cost some performance.

## TensorRT-LLM
```python
from tensorrt_llm import LLM, SamplingParams

llm = LLM(model="meta-llama/Llama-3.1-8B-Instruct")
outputs = llm.generate(["Explain PagedAttention in one sentence."],
                       SamplingParams(max_tokens=64, temperature=0.2))
print(outputs[0].outputs[0].text)
```
- Serving: `trtllm-serve <model>` exposes an OpenAI-compatible endpoint; Triton Inference Server has a TensorRT-LLM backend.
- Features: in-flight (continuous) batching, paged KV cache, FP8/INT4/FP4 quantization, speculative decoding, tensor/pipeline parallelism.
- Recent releases default to a PyTorch-based backend; the older checkpoint-convert + `trtllm-build` engine flow still exists. Check the docs for the installed version.

## Debugging Tools
```bash
polygraphy run model.onnx --trt --onnxrt --atol 1e-3 --rtol 1e-3     # compare TRT vs ONNX Runtime
polygraphy inspect model model.plan                                  # engine layers/bindings
nsys profile trtexec --loadEngine=model.plan                         # kernel timeline
```

## Anti-Patterns
- Building engines on a different GPU model than production.
- One optimization profile with `opt` = max shape when typical batches are small.
- Benchmarking with trtexec but deploying through a runtime that adds host copies and syncs.
- Treating FP16/INT8 as free: always compare task metrics.
- Custom plugins for ops TensorRT now supports natively; check the operator support matrix first.

## References
- NVIDIA TensorRT Developer Guide, TensorRT 8.x→10.x migration guide, Polygraphy and TensorRT-LLM docs.
- Related: `../extreme-quantization/SKILL.md`, `../paged-attention/SKILL.md`.
