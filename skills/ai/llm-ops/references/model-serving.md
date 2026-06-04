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

### Production Configuration & Multi-Node Execution

For large-scale models (e.g., Llama-3.1-405B or multi-node Llama-3.1-70B deployments), vLLM integrates with Ray for distributed tensor parallelism (TP) and pipeline parallelism (PP).

```yaml
# production-vllm-config.yaml
model: meta-llama/Llama-3.1-70B-Instruct
tensor-parallel-size: 4          # Split model across 4 GPUs (intra-node)
pipeline-parallel-size: 1        # Inter-node split if running multi-node (requires Ray)
dtype: bfloat16                  # Use BF16 for A100/H100 native performance
max-model-len: 16384             # Supported context window
gpu-memory-utilization: 0.95     # Reserve 95% VRAM for weights and KV Cache
trust-remote-code: true
enforce-eager: false             # Set true only if CUDA graphs fail or run out of memory

# High-Performance KV Cache Configuration
block-size: 16                   # Size of KV Cache blocks (16 tokens is optimal for cache allocation)
enable-prefix-caching: true      # Cache system prompts/chat templates to bypass TTFT penalty
gpu-memory-utilization: 0.92
swap-space: 16                   # 16 GB CPU swap space to offload inactive sequences
max-num-seqs: 512                # Max concurrent sequences processed in continuous batch
max-num-batched-tokens: 32768    # Max token limit per prefill iteration (bounds iteration time)
enable-chunked-prefill: true     # Chunk long prompts to avoid blocking active decoding cycles
```

#### Multi-Node Ray Cluster Command Line
When scaling beyond a single node (e.g., 8x H100 distributed across two nodes for Llama-3.1-405B FP16):
```bash
# Node 1 (Ray Head Node)
ray start --head --port=6379

# Node 2 (Ray Worker Node)
ray start --address='<head-node-ip>:6379'

# Launch distributed serving fleet across nodes
vllm serve meta-llama/Llama-3.1-405B-Instruct \
  --tensor-parallel-size 8 \
  --pipeline-parallel-size 2 \
  --worker-use-ray \
  --ray-address '<head-node-ip>:6379' \
  --port 8000 \
  --gpu-memory-utilization 0.95 \
  --max-model-len 32768
```

### Hardware Sizing & Throughput Metrics
| Model Size | Precision | GPUs Required | Parallelism Config | Est. TTFT (P50) | Est. Throughput |
|-----------|-----------|---------------|-------------------|-----------------|-----------------|
| Llama-3-8B | BF16 | 1× A10G (24GB) | TP=1, PP=1 | ~150ms | ~1,200 tok/s |
| Llama-3-8B | FP8 | 1× A10G (24GB) | TP=1, PP=1 | ~100ms | ~1,900 tok/s |
| Llama-3.1-70B | BF16 | 4× A100 (80GB)| TP=4, PP=1 | ~250ms | ~2,500 tok/s |
| Llama-3.1-70B | FP8 | 2× A100 (80GB)| TP=2, PP=1 | ~180ms | ~3,100 tok/s |
| Llama-3.1-405B| FP8 | 8× H100 (80GB)| TP=8, PP=1 | ~350ms | ~4,500 tok/s |
| Llama-3.1-405B| BF16 | 16× H100 (80G)| TP=8, PP=2 (Ray)  | ~450ms | ~3,800 tok/s |

### Deployment Architecture on Kubernetes
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vllm-inference-server
spec:
  replicas: 4
  template:
    spec:
      containers:
      - name: vllm-container
        image: vllm/vllm-openai:latest
        command: ["python3", "-m", "vllm.entrypoints.openai.api_server"]
        args: ["--model", "meta-llama/Llama-3.1-70B-Instruct", "--tensor-parallel-size", "4"]
        resources:
          limits:
            nvidia.com/gpu: "4"
          requests:
            nvidia.com/gpu: "4"
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

### Production Limitations
- **Concurrency & Thread Contention**: Under the hood, llama.cpp handles thread dispatching. Lacking production-grade dynamic batching (like vLLM's scheduler), high concurrency leads to severe thread contention, high tail latencies, and request queue starvation.
- **No Multi-LoRA/Adapter Hot-Swapping**: Serving multiple adapters requires spawning multiple separate model instances, multiplying VRAM footprint. Cannot dynamically apply adapters at runtime per request.
- **CPU Offloading Bottlenecks**: When offloading layers to system memory, PCI-Express bus transfer times dominate. Swapping contexts between VRAM and system RAM blocks the execution loop, causing drastic throughput collapse.
- **Queue Saturation & HoL (Head-of-Line) Blocking**: Ollama relies on simple FIFO queues. If one large request takes 30s to process, all subsequent short requests are blocked until completion.
- **No Native Telemetry**: Lacks OpenTelemetry tracing, Prometheus endpoints, or detailed metric export, requiring external proxy parsing for operational visibility.

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

## Serving & Routing Patterns

### 1. Single-Instance Serving
```
Client ──► vLLM (Single Instance / Pod) ──► GPU VRAM
```
Simple configuration suitable for internal development, debugging, and small isolated APIs. Lacks high availability and scale.

### 2. Load-Balanced Fleet
```
Client ──► Load Balancer (Nginx/HAProxy/Envoy) ──► [ vLLM Replica 1 ]
                                                ──► [ vLLM Replica 2 ]
                                                ──► [ vLLM Replica N ]
```
Horizontal scaling model. Requests are routed dynamically based on CPU/GPU metrics or round-robin selection. Prefixes should be synchronized or stickiness configured if prefix caching is heavily utilized.

### 3. Smart Fallback Router Pattern (Hybrid Dedicated + Serverless)
Provides fault tolerance and rate compliance by routing traffic to local open-source LLM instances first, falling back to public APIs (e.g., Anthropic, Azure OpenAI) when local GPU queues are saturated or return error codes.

```python
import time
import asyncio
import httpx
import logging
from typing import Dict, Any, Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("GatewayRouter")

class FallbackRouter:
    def __init__(self, primary_url: str, backup_url: str, backup_api_key: str):
        self.primary_url = primary_url
        self.backup_url = backup_url
        self.backup_api_key = backup_api_key
        self.client = httpx.AsyncClient(timeout=30.0)

    async def route_request(self, payload: Dict[str, Any], retries: int = 2) -> Dict[str, Any]:
        """
        Attempts to route request to primary local vLLM server.
        If local server fails (503, 429, timeout), fallbacks to backup cloud API.
        """
        for attempt in range(retries + 1):
            try:
                logger.info(f"Attempting primary route (vLLM) - Attempt {attempt + 1}")
                response = await self.client.post(
                    f"{self.primary_url}/v1/chat/completions",
                    json=payload
                )
                
                # Check for rate-limiting or server overloaded
                if response.status_code == 200:
                    return response.json()
                elif response.status_code in [429, 503]:
                    logger.warning(f"Primary overloaded. Status: {response.status_code}. Initiating failover...")
                    break
                else:
                    response.raise_for_status()

            except (httpx.RequestError, httpx.HTTPStatusError) as exc:
                logger.warning(f"Primary route failed: {exc}. Attempt {attempt + 1}/{retries + 1}")
                if attempt == retries:
                    break
                await asyncio.sleep(2 ** attempt) # Exponential backoff before retry

        # Fallback Trigger
        logger.error("All primary attempts failed. Steering traffic to backup cloud API...")
        return await self._execute_fallback(payload)

    async def _execute_fallback(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        headers = {
            "Authorization": f"Bearer {self.backup_api_key}",
            "Content-Type": "application/json"
        }
        # Transform payload if switching models (e.g. Llama-3.1-70B -> Claude 3.5 Sonnet)
        backup_payload = payload.copy()
        if "model" in backup_payload:
            backup_payload["model"] = "gpt-4o-mini" # Map to corresponding tier fallback
            
        try:
            response = await self.client.post(
                f"{self.backup_url}/v1/chat/completions",
                json=backup_payload,
                headers=headers
            )
            response.raise_for_status()
            return response.json()
        except Exception as exc:
            logger.critical(f"Critical Failure: Both primary and fallback routes failed: {exc}")
            raise exc

    async def close(self):
        await self.client.aclose()
```

### 4. Token-Bucket Rate Limiter Gateway
Protects backend GPU memory from out-of-memory (OOM) crashes by enforcing limits on Request-Per-Minute (RPM) and Token-Per-Minute (TPM).

```python
class TokenBucketRateLimiter:
    def __init__(self, rpm_limit: int, tpm_limit: int):
        self.rpm_limit = rpm_limit
        self.tpm_limit = tpm_limit
        
        self.rpm_tokens = float(rpm_limit)
        self.tpm_tokens = float(tpm_limit)
        
        self.last_update = time.monotonic()
        self.lock = asyncio.Lock()

    async def consume(self, estimated_tokens: int) -> bool:
        async with self.lock:
            now = time.monotonic()
            elapsed = now - self.last_update
            self.last_update = now
            
            # Refill tokens proportionally
            self.rpm_tokens = min(float(self.rpm_limit), self.rpm_tokens + elapsed * (self.rpm_limit / 60.0))
            self.tpm_tokens = min(float(self.tpm_limit), self.tpm_tokens + elapsed * (self.tpm_limit / 60.0))
            
            if self.rpm_tokens >= 1.0 and self.tpm_tokens >= estimated_tokens:
                self.rpm_tokens -= 1.0
                self.tpm_tokens -= estimated_tokens
                return True
                
            return False
```

## Monitoring Metrics

| Metric | Source | Alert Threshold | Operational Mitigation |
|--------|--------|-----------------|------------------------|
| Time-to-first-token (TTFT) | vLLM/TGI metrics | P99 > 2.5s | Scale up replicas, enable prefix caching |
| Time-per-output-token (TPOT) | Engine metrics | P99 > 80ms | Enable chunked prefill, lower max sequence batch |
| Request latency P50/P99 | Gateway | P99 > 10s | Trigger fallback routing to public APIs |
| GPU utilization | DCGM exporter | < 20% sustained | Reduce replicas or run model sharding / concurrent models |
| GPU memory (VRAM) usage | DCGM exporter | > 95% sustained | Reduce `gpu-memory-utilization` limit in engine config |
| Queue depth | Engine API | > 100 requests | Route excess traffic to cloud serverless providers |
| Error rate (5xx / timeouts) | API Gateway | > 0.5% | Circuit breaker trips; trigger automatic replica reboot |
| Cache hit rate (KV Cache) | Engine Engine | < 40% (systems) | Optimize system prompt structures to leverage prefix caching |

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive production serving specifications & code configurations)
Strict compliance with vLLM multi-node architecture, Ollama limits, rate limit algorithms, and fallback proxies.
-->
