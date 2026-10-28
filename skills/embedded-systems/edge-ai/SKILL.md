---
name: edge-ai
description: >
  Use this skill when the user says 'edge AI', 'on-device inference', 'TensorRT', 'ONNX Runtime', 'TFLite', 'LiteRT', 'TinyML', 'quantization int8', 'Jetson', 'Coral', 'NPU', 'ExecuTorch', 'model on microcontroller'. Deploys trained models to edge hardware: export path (PyTorch/TF → ONNX/LiteRT/ExecuTorch), runtime and accelerator choice, post-training quantization and calibration, benchmarking latency/power, and on-device validation. Do NOT use for: model training or architecture design (use ml/deep-learning), cloud LLM serving (use ml/inference-optimization), MCU driver code (use c-cpp-patterns).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [embedded, edge-ai, tensorrt, onnx, tflite, quantization, tinyml]
---

# Edge AI Deployment

## Purpose
A model that works in a notebook still has to fit the device's memory, latency, power and operator support. This skill picks the runtime for the target hardware, converts and quantizes the model without silently losing accuracy, and measures it on the device.

## Agent Protocol

### Trigger
"edge AI", "on-device inference", "TensorRT", "ONNX Runtime", "TFLite", "LiteRT", "TinyML", "int8 quantization", "Jetson", "Coral", "NPU", "ExecuTorch".

### Input Context
- Model framework, architecture, input shape, accuracy metric and baseline
- Target hardware (MCU, Cortex-A CPU, mobile NPU/GPU, Jetson, Hailo, Coral) and OS
- Latency, throughput, memory and power budgets

### Output Artifact
Export/convert/quantize scripts, runtime integration code, benchmark plan. No file unless requested.

### Response Format
```
Target: {hardware + OS}
Path: {framework -> format -> runtime/EP}
Precision: {FP32 | FP16 | INT8 (PTQ/QAT) | INT4}
Calibration: {dataset, size}
Result: {latency p50/p99, memory, accuracy delta vs FP32}
Risks: {unsupported ops, fallback to CPU, accuracy drop}
```

## 1. Choose the Runtime by Hardware
| Hardware | Typical runtime | Notes |
|----------|-----------------|-------|
| NVIDIA Jetson / dGPU | TensorRT (or ONNX Runtime with TensorRT/CUDA EP) | Engines are built per GPU + TensorRT version; rebuild on upgrade |
| Android phones | LiteRT (formerly TensorFlow Lite) with GPU/NNAPI delegates, or vendor SDKs (Qualcomm AI Engine Direct/QNN) | NNAPI is deprecated in Android 15; prefer GPU delegate or vendor SDK |
| iOS / Apple silicon | Core ML (convert with `coremltools`) | ANE used automatically for supported layers |
| Linux Cortex-A CPU | ONNX Runtime (CPU EP / XNNPACK), LiteRT + XNNPACK | NEON-optimised kernels |
| Microcontrollers | LiteRT for Microcontrollers (TFLM), CMSIS-NN kernels, vendor tools (STM32Cube.AI, Edge Impulse) | INT8 only in practice; static tensor arena |
| Dedicated NPUs (Hailo, Coral Edge TPU, NXP eIQ, Rockchip) | Vendor compiler + runtime | Coral needs fully INT8 models compiled with `edgetpu_compiler` |
| PyTorch-first mobile/embedded | ExecuTorch | Backends: XNNPACK, Core ML, Vulkan, Qualcomm, Arm Ethos-U |

ONNX is the usual interchange format: one export, then hardware-specific runtimes or Execution Providers (EPs).

## 2. Export
```python
import torch

model.eval()
example = torch.randn(1, 3, 224, 224)
torch.onnx.export(
    model, (example,), "model.onnx",
    input_names=["input"], output_names=["logits"],
    dynamic_axes={"input": {0: "batch"}, "logits": {0: "batch"}},
    opset_version=17,
)
```
- Validate: `onnx.checker.check_model`, then compare ONNX Runtime outputs with PyTorch on real samples (`np.testing.assert_allclose` with a tolerance).
- Fix shapes where the target needs static shapes (most NPUs/MCUs); simplify the graph (`onnxsim`) before conversion.
- Check operator coverage for the target early — one unsupported op can force a CPU fallback or a graph split that dominates latency.

## 3. Quantization
| Method | Effort | Accuracy | Use |
|--------|--------|----------|-----|
| FP16 | none | ~unchanged | GPUs/NPUs with FP16 |
| Dynamic INT8 (weights only, activations at runtime) | low | small drop | CPU, transformer/LSTM layers |
| Static PTQ INT8 (calibrated activations) | medium | small drop if calibrated well | CNNs on NPUs/MCUs/TensorRT |
| QAT (quantization-aware training) | high | best INT8 | when PTQ loses too much |
| INT4 weight-only | medium | model dependent | LLMs/large models on capable runtimes |

- Calibrate with a few hundred representative, preprocessed samples from the real input distribution (not random tensors).
- Per-channel weight quantization for convolutions; keep sensitive layers (first/last, softmax/attention) in higher precision if accuracy drops.
- Always report accuracy delta on the full validation set, not one image.

ONNX Runtime static quantization sketch:
```python
from onnxruntime.quantization import quantize_static, CalibrationDataReader, QuantFormat, QuantType

class Reader(CalibrationDataReader):
    def __init__(self, batches): self._it = iter(batches)
    def get_next(self): return next(self._it, None)   # dict {"input": np.ndarray} or None

quantize_static("model.onnx", "model.int8.onnx", Reader(calib_batches),
                quant_format=QuantFormat.QDQ,
                activation_type=QuantType.QInt8, weight_type=QuantType.QInt8,
                per_channel=True)
```

## 4. TensorRT Build
```bash
trtexec --onnx=model.onnx --saveEngine=model.fp16.plan --fp16
# INT8 needs calibration data or a QDQ (explicitly quantized) ONNX model
trtexec --onnx=model.int8.onnx --saveEngine=model.int8.plan --int8
```
TensorRT fuses layers (conv+bias+activation), selects kernels per GPU and can use FP16/INT8. Engines are not portable across GPU models or TensorRT versions. On Jetson use the JetPack-matched TensorRT and power mode (`nvpmodel`, `jetson_clocks`) when benchmarking.

## 5. Microcontrollers (TinyML)
- Model must fit flash (weights) and RAM (tensor arena + activations); typical budgets are hundreds of KB.
- Convert to a fully INT8 `.tflite` with a representative dataset, embed as a C array (`xxd -i`), run with the TFLM interpreter and `MicroMutableOpResolver` registering only the ops used.
- Size the arena with `interpreter.arena_used_bytes()` and keep a margin; use CMSIS-NN optimised kernels on Cortex-M.

## 6. Benchmarking on Device
- Measure on the real device with production preprocessing included: warm-up runs, then p50/p99 latency over hundreds of runs, peak memory, and power (external meter or on-board sensors such as `tegrastats` on Jetson).
- Report the share of ops actually running on the accelerator (delegate/EP logs) — silent CPU fallback is the most common performance bug.
- Thermal throttling: run long enough (minutes) to see sustained, not burst, performance.

## 7. Anti-Patterns
- Quantizing without calibration data that matches production inputs.
- Benchmarking on a desktop GPU and quoting it for a Jetson or phone.
- Mismatched preprocessing (RGB vs BGR, normalisation, resize method) between training and device.
- Shipping one TensorRT engine for every device model.
- Ignoring accuracy on minority classes after quantization.

## 8. Checklist
- [ ] Runtime/accelerator chosen for the exact target, op coverage verified
- [ ] Export validated numerically against the source model
- [ ] Quantization calibrated on representative data; accuracy delta reported
- [ ] Latency p50/p99, memory, power measured on device under sustained load
- [ ] Accelerator utilisation confirmed (no unexpected CPU fallback)
- [ ] Model + preprocessing versioned together; rollback path for model updates
