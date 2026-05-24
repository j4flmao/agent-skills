# CV Model Deployment

## Model Optimization

| Technique | Speedup | Accuracy Loss | Output Format |
|-----------|---------|---------------|---------------|
| FP32 → FP16 | 1.5-2x | Negligible | FP16 weights |
| INT8 quantization | 3-4x | 0.5-2% | INT8 weights + calibration |
| Weight pruning (50%) | 1.5x | 0-1% | Sparse weights |
| Knowledge distillation | 1x (student) | 0-2% | Smaller model |
| ONNX export | 1.2-2x | None | ONNX graph |
| TensorRT optimization | 2-5x | None (FP16) | TRT engine |

```python
# ONNX export with optimization
import torch.onnx
import onnx
import onnxruntime

# Export to ONNX
torch.onnx.export(
    model, dummy_input, "model.onnx",
    input_names=['input'], output_names=['output'],
    dynamic_axes={'input': {0: 'batch_size'}, 'output': {0: 'batch_size'}},
    opset_version=17
)

# Optimize ONNX
from onnxruntime.transformers import optimizer
optimized = optimizer.optimize_model(
    "model.onnx", model_type='bert', num_heads=12, hidden_size=768
)
optimized.save_model_to_file("model_optimized.onnx")
```

## TensorRT Deployment

```python
import tensorrt as trt

# Build TensorRT engine from ONNX
TRT_LOGGER = trt.Logger(trt.Logger.WARNING)
builder = trt.Builder(TRT_LOGGER)
network = builder.create_network(1 << int(trt.NetworkDefinitionCreationFlag.EXPLICIT_BATCH))
parser = trt.OnnxParser(network, TRT_LOGGER)

with open("model.onnx", "rb") as f:
    parser.parse(f.read())

config = builder.create_builder_config()
config.set_memory_pool_limit(trt.MemoryPoolType.WORKSPACE, 1 << 30)  # 1GB
config.set_flag(trt.BuilderFlag.FP16)  # Enable FP16

serialized_engine = builder.build_serialized_network(network, config)
with open("model.trt", "wb") as f:
    f.write(serialized_engine)
```

## Edge Deployment

```python
# TFLite conversion
import tensorflow as tf

converter = tf.lite.TFLiteConverter.from_saved_model("saved_model")
converter.optimizations = [tf.lite.Optimize.DEFAULT]
converter.representative_dataset = representative_dataset
converter.target_spec.supported_types = [tf.float16]
tflite_model = converter.convert()

with open("model.tflite", "wb") as f:
    f.write(tflite_model)

# CoreML conversion
import coremltools as ct

coreml_model = ct.convert(
    torch_model,
    inputs=[ct.ImageType(name="input", shape=(1, 3, 224, 224))],
    compute_precision=ct.precision.FLOAT16
)
coreml_model.save("model.mlpackage")
```

## Model Serving Comparison

| Backend | GPU | Latency | Batch | Best For |
|---------|-----|---------|-------|----------|
| TorchServe | Yes | Medium | Dynamic | PyTorch models |
| Triton Inference Server | Yes | Low | Dynamic | Multi-framework, high throughput |
| TensorRT Serving | Yes | Very low | Static | Max performance |
| ONNX Runtime | Optional | Low | Static | Cross-framework |
| TFLite Serving | CPU only | Medium | No | Edge deployment |
| OpenVINO | CPU/VPU | Low | Static | Intel hardware |

## Monitoring for CV

| Metric | What It Detects | Threshold |
|--------|----------------|-----------|
| Input brightness | Lighting change | Mean pixel < 50 or > 200 |
| Input noise | Camera/MIPI issues | SNR < 20dB |
| Detection count drift | Scene/usage change | > 3σ from baseline |
| Empty frame ratio | Coverage blind spot | > 10% consecutive empty |
| Model confidence | Distribution shift | Mean conf < 0.7 |
| Inference latency | System overload | P99 > 50ms |
