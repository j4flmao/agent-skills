# Model Serving Advanced Topics

High-throughput and cost-efficient model serving: dynamic batching, GPU utilization, LLM serving engines (continuous batching, paged KV cache, quantization), multi-model hosting, autoscaling GPU workloads, safe rollout of new models, caching, and drift-aware operations.

## Dynamic Batching

GPUs reach high throughput only with batches. Dynamic batching collects concurrent requests for a short window and runs them together.

```text
# Triton model config (config.pbtxt)
name: "fraud_onnx"
platform: "onnxruntime_onnx"
max_batch_size: 64
dynamic_batching {
  preferred_batch_size: [ 16, 32 ]
  max_queue_delay_microseconds: 2000
}
instance_group [ { count: 2, kind: KIND_GPU } ]
```

Trade-off: larger `max_queue_delay` raises throughput and per-request latency. Tune with load tests at realistic concurrency (Triton `perf_analyzer`, Locust/k6 against your API).

## GPU Utilization

| Technique | Effect |
|-----------|--------|
| Lower precision (bf16/fp16), INT8/FP8 where supported | Higher throughput, less memory |
| Compiled runtimes (TensorRT, ONNX Runtime with TensorRT/CUDA EP, `torch.compile`) | Fused kernels, lower latency |
| Multiple model instances per GPU | Overlap execution for small models |
| GPU sharing (MIG partitions, time-slicing, MPS) | Fit several small models on one GPU with isolation trade-offs |
| CPU offload of pre/post-processing | Keep GPU busy with inference |

Measure GPU utilization and memory alongside latency (DCGM exporter metrics). Low utilization with high latency usually means a CPU or I/O bottleneck in pre-processing or batching.

## LLM Serving

LLM inference is dominated by memory bandwidth and KV cache size. Use a serving engine with continuous batching and paged KV cache instead of a web framework wrapping `generate()`.

| Engine | Highlights |
|--------|-----------|
| vLLM | PagedAttention, continuous batching, prefix caching, OpenAI-compatible server, many quantization formats |
| SGLang | RadixAttention prefix reuse, structured generation, fast scheduling |
| TensorRT-LLM | NVIDIA-optimized kernels, in-flight batching, FP8 on supported GPUs |
| TGI (Text Generation Inference) | Hugging Face server with continuous batching |

```bash
vllm serve meta-llama/Llama-3.1-8B-Instruct \
  --dtype bfloat16 \
  --max-model-len 8192 \
  --gpu-memory-utilization 0.90 \
  --enable-prefix-caching \
  --port 8000
```

Sizing:
- Weights ≈ parameters × bytes per parameter (8B in bf16 ≈ 16 GB).
- KV cache ≈ 2 × layers × KV heads × head dim × tokens × bytes, per sequence; it limits concurrency more than weights do.
- Quantization (AWQ, GPTQ, FP8) reduces memory; validate quality on your evaluation set.
- Tensor parallelism (`--tensor-parallel-size`) splits large models across GPUs in one node.

Key LLM metrics: time to first token (TTFT), inter-token latency / time per output token, tokens per second per GPU, queue time, KV cache utilization, preemptions.

Put authentication, rate limits (per tenant, in tokens), request size limits and timeouts in a gateway in front of the engine.

## Multi-Model Serving

| Approach | Use |
|----------|-----|
| One deployment per model | Few high-traffic models, independent scaling |
| Multi-model server (Triton model repository, KServe ModelMesh) | Many small/long-tail models; load/unload on demand |
| LoRA adapters on a shared base (vLLM multi-LoRA) | Many fine-tuned variants of one LLM |

Watch cold-load latency for on-demand models and keep hot models pinned.

## Autoscaling

GPU pods are slow to start (image pull, model download, load). Scale before saturation:

- Scale on in-flight requests per replica, queue depth, or engine metrics (e.g. vLLM waiting requests) via KEDA or custom-metrics HPA; CPU utilization is a poor signal for GPU servers.
- Keep a minimum warm replica count for latency-sensitive services; scale-to-zero only for tolerant workloads.
- Reduce cold start: preloaded model weights on node-local disk or a shared volume, smaller images, model streaming loaders.
- Cluster autoscaler / node provisioning with GPU node pools and quotas; spot/preemptible GPUs for batch and tolerant online tiers.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: llm-server
spec:
  scaleTargetRef:
    name: llm-server
  minReplicaCount: 1
  maxReplicaCount: 8
  triggers:
    - type: prometheus
      metadata:
        serverAddress: http://prometheus.monitoring:9090
        query: sum(vllm:num_requests_waiting{service="llm-server"})
        threshold: "10"
```

Check the exact metric names exposed by your engine version.

## Rolling Out New Models

| Stage | Purpose |
|-------|---------|
| Offline evaluation | Frozen test set, slices, fairness, calibration |
| Shadow deployment | New model receives mirrored traffic; outputs logged, not used |
| Canary | Small share of live traffic with guardrail metrics |
| A/B test | Measure business impact with statistical design |
| Full rollout + rollback path | Previous version kept warm |

KServe `InferenceService` supports canary traffic percentages between revisions:

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: churn-classifier
spec:
  predictor:
    canaryTrafficPercent: 10
    model:
      modelFormat: { name: mlflow }
      storageUri: s3://models/churn-classifier/15
```

Compare prediction distributions between versions during shadow/canary; large shifts without explanation block promotion.

## Caching

- Exact-match response cache for deterministic models with repeated inputs (key = model version + normalized input hash).
- Feature cache for expensive online features.
- LLM prefix caching (system prompts, shared context) inside the engine; semantic caches only with careful evaluation, because near-duplicate questions can need different answers.
- Invalidate caches on model version change.

## Drift and Feedback Loops

- Monitor input drift (PSI, KL divergence, population statistics) and output drift per feature and segment.
- Join predictions with delayed ground truth to compute live quality metrics.
- Alert on drift as a signal to investigate, not to retrain automatically without evaluation.
- Beware feedback loops: models that influence the data they are retrained on (recommendations, fraud blocks) need exploration or holdout traffic.

## Cost Management

| Lever | Notes |
|-------|-------|
| Right-size GPU type | Smaller GPUs for small models; memory-bound LLMs need high-bandwidth memory |
| Batch offline when possible | Cheaper than always-on replicas |
| Quantization and distillation | Smaller models with acceptable quality |
| Utilization targets | Track cost per 1k predictions / per 1M tokens |
| Spot capacity | For interruptible workloads with checkpointed queues |

## Checklist

- [ ] Dynamic/continuous batching tuned with load tests
- [ ] LLMs served by a dedicated engine with bf16/quantized weights and KV-cache sizing
- [ ] Gateway with auth, token-based rate limits, timeouts
- [ ] Autoscaling on queue/concurrency metrics with warm minimums
- [ ] Shadow → canary → A/B rollout with rollback
- [ ] Drift and live-quality monitoring tied to delayed labels
- [ ] Cost per prediction/token tracked
