# Model Serving Frameworks

## Framework Comparison

| Feature | vLLM | TGI | Ollama | Triton |
|---------|------|-----|--------|--------|
| Throughput | Highest | High | Low | High |
| PagedAttention | Yes | No | No | No |
| Continuous Batching | Yes | Yes | Limited | Yes |
| Tensor Parallelism | Yes | Yes | No | Yes |
| Quantization | AWQ, GPTQ, FP8 | AWQ, GPTQ, EXL2 | Many | FP8, INT8, INT4 |
| Multi-LoRA | Yes | Limited | No | Yes |
| OpenAI Compatible API | Yes | Yes | Yes | No (native) |
| Ease of Setup | Medium | Easy | Very Easy | Complex |
| Multi-Model | No | No | Yes | Yes |
| Best For | High-throughput LLM serving | HF ecosystem | Dev/local | Enterprise multi-model |

## vLLM

### Architecture
vLLM uses PagedAttention to manage KV cache as non-contiguous blocks, eliminating fragmentation. This enables ~2x throughput over naive implementations.

### Key Features
- **PagedAttention**: manages KV cache in pages, like virtual memory. Eliminates fragmentation, enables near-100% cache utilization.
- **Continuous batching**: add/remove requests from batch dynamically. No need to wait for all requests to complete.
- **Tensor parallelism**: split model across GPUs using Megatron-LM style partitioning.
- **Prefix caching**: reuse KV cache for shared prefixes across requests.
- **Multi-LoRA**: serve multiple LoRA adapters with one base model. Switch adapters per request.

### Configuration
```yaml
model: meta-llama/Llama-3.1-70B-Instruct
tensor-parallel-size: 2
dtype: float16
max-model-len: 8192
gpu-memory-utilization: 0.90
trust-remote-code: true

# Performance tuning
block-size: 16                  # PagedAttention block size
swap-space: 8                   # GB for CPU-offloaded cache
max-num-batched-tokens: 8192
max-num-seqs: 256
enable-prefix-caching: true
```

### Hardware Sizing
| Model Size | GPU | Config | Est. Throughput |
|-----------|-----|--------|-----------------|
| 7-8B | 1× A100-80GB | FP16, no TP | ~2000 tok/s |
| 13-14B | 1× A100-80GB | FP16, no TP | ~1200 tok/s |
| 30-34B | 2× A100-80GB | FP16, TP=2 | ~800 tok/s |
| 70-72B | 4× A100-80GB | FP16, TP=4 | ~500 tok/s |
| 7-8B | 1× A100-80GB | AWQ 4-bit | ~4000 tok/s |
| 70-72B | 2× A100-80GB | AWQ 4-bit, TP=2 | ~1200 tok/s |

### Deployment
```bash
# Start server
vllm serve meta-llama/Llama-3.1-8B-Instruct \
  --port 8000 \
  --tensor-parallel-size 1 \
  --gpu-memory-utilization 0.90

# Scale with Kubernetes
kubectl scale deployment vllm --replicas=3
```

## TGI (Text Generation Inference)

### Architecture
Built by Hugging Face. Tight integration with the HF ecosystem. Good for single-model, moderate-scale serving.

### Key Features
- **Native HF integration**: automatic model downloading, safetensors, PEFT adapter support.
- **Continuous batching**: similar to vLLM but slightly lower throughput.
- **Quantization**: AWQ, GPTQ, bitsandbytes, EETQ, FP8.
- **Message API**: OpenAI-compatible chat endpoint.
- **Router**: built-in load balancing across multiple instances.

### Configuration
```yaml
model: mistralai/Mixtral-8x7B-Instruct-v0.1
max-total-tokens: 4096
max-batch-prefill-tokens: 4096
max-batch-total-tokens: 16384
dtype: float16

# Quantization
quantize: awq
quantize-config:
  awq:
    group_size: 128
    version: gemm
```

### Deployment
```bash
docker run -d --gpus all -p 8080:80 \
  -v $PWD/data:/data \
  ghcr.io/huggingface/text-generation-inference:latest \
  --model-id mistralai/Mixtral-8x7B-Instruct-v0.1 \
  --max-total-tokens 4096
```

## Ollama

### Architecture
Local-first serving with minimal configuration. Wraps llama.cpp under the hood. Best for development, testing, and personal use.

### Key Features
- **One-command setup**: `ollama pull <model>` and serve.
- **Model library**: curated collection of open models with optimal presets.
- **Modelfile**: customize model parameters, system prompt, and template.
- **GGUF format**: quantized models for CPU and consumer GPU inference.
- **OpenAI compatible API**: basic endpoint compatibility.

### Configuration
```dockerfile
# Modelfile
FROM llama3.1:8b

PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER stop "[/INST]"
PARAMETER num_ctx 4096

TEMPLATE """{{ .System }}
[INST] {{ .Prompt }} [/INST]
"""
```

### Deployment
```bash
ollama pull llama3.1:8b
ollama serve  # Port 11434
```

### Limitations
- No distributed inference (single node only).
- No PagedAttention or equivalent optimization.
- Limited throughput for production workloads.
- No multi-LoRA or adapter routing.
- No production monitoring built-in.

## Triton Inference Server

### Architecture
NVIDIA's enterprise inference server. Supports multiple frameworks in a single deployment (TensorRT, ONNX, PyTorch, Python, custom).

### Key Features
- **Multi-framework**: run PyTorch, TensorRT, ONNX, and custom backends simultaneously.
- **Dynamic batching**: automatically batch requests of varying sizes.
- **Model ensembles**: chain multiple models in a pipeline (e.g., embedding → re-rank → generation).
- **Concurrent model execution**: run models on different GPUs or on the same GPU with scheduling.
- **Metrics**: Prometheus-native metrics for every model, every GPU.
- **Request routing**: model versioning, canary deployments.

### Configuration
```yaml
# config.pbtxt for an LLM model
name: "llama-70b"
backend: "python"
max_batch_size: 64
input [
  {
    name: "input_ids"
    data_type: TYPE_INT64
    dims: [-1]
  }
]
output [
  {
    name: "output_ids"
    data_type: TYPE_INT64
    dims: [-1, -1]
  }
]
instance_group [
  {
    count: 4
    kind: KIND_GPU
    gpus: [0, 1, 2, 3]
  }
]
```

### Deployment
```bash
docker run --gpus all -p 8000:8000 -p 8001:8001 -p 8002:8002 \
  -v $PWD/model_repository:/models \
  nvcr.io/nvidia/tritonserver:24.08-py3 \
  tritonserver --model-repository=/models
```

## Serving Patterns

### Single-Instance
```
Client → vLLM (1 instance)
```
Simple, single point of failure. Max throughput limited by one GPU node.

### Load-Balanced
```
Client → Load Balancer (nginx/ALB) → [vLLM × N]
```
Horizontal scaling. Sessions independent. No shared state needed for stateless inference.

### Sharded by Model
```
Client → Router → vLLM (Llama-70B)
                 → TGI (Mixtral)
                 → Ollama (local test)
```
Different models for different endpoints. Router based on model name in request.

### Adapter Routing
```
Client → Router → vLLM (base model)
Base model + per-request LoRA adapter.
```
One base model serves many fine-tuned variants. Adapter selected by request header or path.

## Monitoring Metrics

| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| Time-to-first-token (TTFT) | vLLM/TGI metrics | P99 > 2s |
| Tokens per second | vLLM/TGI metrics | < expected throughput |
| Request latency P50/P99 | Load balancer | P99 > 5s |
| GPU utilization | DCGM exporter | < 30% or > 95% |
| GPU memory | DCGM exporter | > 90% for > 5min |
| Queue depth | vLLM waiting requests | > 50 sustained |
| Error rate | API gateway | > 1% of requests |
| Batch size | vLLM/TGI metrics | < 8 sustained |
