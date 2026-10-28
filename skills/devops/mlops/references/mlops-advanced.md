# MLOps Advanced: GPU Infrastructure, Distributed Training, Serving at Scale, LLMOps and ML Security

Advanced platform topics for organizations running many models or large models: GPU scheduling and sharing on Kubernetes, distributed training, feature store architecture, high-throughput serving, LLM-specific operations, model supply-chain security and GPU cost control. Pipeline automation, deployment strategies, retraining and governance are in sibling references.

## GPU Scheduling on Kubernetes

| Need | Mechanism |
|------|-----------|
| Expose GPUs to pods | NVIDIA GPU Operator (driver, container toolkit, device plugin, DCGM exporter) |
| Request GPUs | `resources.limits: {nvidia.com/gpu: 1}` (GPUs are not overcommitted) |
| Share one GPU among small workloads | Time-slicing (no isolation), MIG partitions on supported data center GPUs (hardware isolation), MPS |
| Queue and fair-share batch jobs | Kueue (ClusterQueues, quotas, borrowing), Volcano |
| Gang scheduling for distributed jobs | Kueue with JobSet / Volcano; all workers start together or none |
| Keep CPU pods off GPU nodes | Taints on GPU nodes + tolerations on GPU workloads |

```yaml
apiVersion: kueue.x-k8s.io/v1beta1
kind: ClusterQueue
metadata:
  name: training
spec:
  namespaceSelector: {}
  resourceGroups:
    - coveredResources: ["cpu", "memory", "nvidia.com/gpu"]
      flavors:
        - name: a100
          resources:
            - name: "cpu"
              nominalQuota: 256
            - name: "memory"
              nominalQuota: 2Ti
            - name: "nvidia.com/gpu"
              nominalQuota: 16
```

Jobs label themselves with `kueue.x-k8s.io/queue-name: <LocalQueue>` and wait for admission instead of failing or fragmenting GPUs.

Dynamic Resource Allocation (DRA, `resource.k8s.io`) is the newer Kubernetes API for devices such as GPUs and partitions; adopt it as vendor drivers and your Kubernetes version support it.

## Distributed Training

| Strategy | When | Tools |
|----------|------|-------|
| Data parallel (DDP) | Model fits on one GPU; scale throughput | PyTorch DDP via `torchrun` |
| Sharded data parallel (FSDP / ZeRO) | Model + optimizer state too large for one GPU | PyTorch FSDP2, DeepSpeed ZeRO |
| Tensor / pipeline parallel | Very large models across GPUs/nodes | Megatron-LM, DeepSpeed, NeMo |
| Hyperparameter search | Many independent trials | Ray Tune, Optuna, Katib |

```bash
torchrun --nnodes=2 --nproc_per_node=8 \
  --rdzv_backend=c10d --rdzv_endpoint=trainer-0.trainer:29500 \
  train.py --config configs/large.yaml
```

Operational requirements:
- **Checkpointing** to object storage at regular intervals; resume logic tested (spot/preemptible capacity and hardware failures are routine at scale).
- **Mixed precision** (`torch.amp.autocast` with bf16 on supporting GPUs) for memory and speed.
- **Fast interconnect** for multi-node training (NVLink within a node, InfiniBand/RoCE or high-bandwidth cloud networking between nodes); without it, communication dominates.
- **Data loading** must keep GPUs busy: sharded datasets (WebDataset, Mosaic Streaming, Parquet), enough loader workers, local NVMe caching.
- Track GPU utilization (DCGM `DCGM_FI_DEV_GPU_UTIL`, SM occupancy) per job; low utilization usually means input pipeline bottlenecks.

Orchestration options: Kubeflow Training Operator / JobSet on Kubernetes, Ray Train on KubeRay, managed services (SageMaker, Vertex AI, Azure ML), Slurm for HPC-style clusters.

## Feature Store Architecture

```text
Batch sources (lakehouse) --> offline store (point-in-time joins for training)
                         \-> materialization job --> online store (Redis, DynamoDB, Bigtable) --> serving lookup
Streaming sources ------------------------------------^ (stream transformations update online features)
```

- Same feature definitions generate training sets and online values, preventing skew.
- Point-in-time correctness: training rows join features as of the label event time, never later.
- Monitor materialization freshness; stale online features silently degrade predictions.
- Do not adopt a feature store before you have multiple models sharing features or online/offline consistency problems; it adds operational weight.

## Serving at Scale

| Technique | Benefit |
|-----------|---------|
| Dynamic / continuous batching (Triton, vLLM, TorchServe, Ray Serve) | Higher GPU throughput |
| Model compilation (TensorRT, ONNX Runtime, `torch.compile`, OpenVINO) | Lower latency per request |
| Quantization (INT8, FP8, 4-bit weight-only for LLMs) | Less memory, more throughput; validate accuracy impact |
| Multi-model serving (Triton, KServe ModelMesh) | Many small models share infrastructure |
| Autoscaling on concurrency/queue depth (KEDA, KServe/Knative) | Scale with demand; CPU utilization is a poor signal for GPU servers |
| Scale-to-zero for rarely used models | Cost savings, at the price of cold starts (model load time) |

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: churn
spec:
  predictor:
    minReplicas: 2
    maxReplicas: 10
    scaleMetric: concurrency
    scaleTarget: 8
    model:
      modelFormat: {name: sklearn}
      storageUri: s3://models/churn/v42
      resources:
        requests: {cpu: "1", memory: 2Gi}
```

Reduce cold start by baking models into images or using node-local caches (KServe LocalModelCache, pre-pulled images) for large weights.

## LLMOps Specifics

| Concern | Practice |
|---------|----------|
| Prompt and configuration versioning | Prompts, system messages, tool schemas and decoding parameters versioned like code and tied to releases |
| Evaluation | Offline eval sets with task-specific metrics, LLM-as-judge with calibrated rubrics and human spot checks; regression suite on every prompt/model change |
| Serving self-hosted models | vLLM, SGLang, TensorRT-LLM or TGI with continuous batching and paged KV cache; OpenAI-compatible APIs |
| Hosted model APIs | Gateway for keys, routing, rate limits, cost tracking, fallbacks; pin model versions where providers allow |
| Fine-tuning | Parameter-efficient methods (LoRA/QLoRA) tracked as model versions with datasets and eval results |
| RAG pipelines | Version the index (embedding model + chunking + corpus snapshot); re-embed entirely when the embedding model changes |
| Observability | Trace each request (prompt, retrieved context, tool calls, tokens, latency, cost) with OpenTelemetry GenAI conventions or tools like Langfuse/Phoenix; redact personal data |
| Safety | Input/output filtering, prompt injection defenses for tools and retrieved content, abuse monitoring |

## ML Security and Supply Chain

| Risk | Control |
|------|---------|
| Malicious model files (pickle executes code on load) | Prefer `safetensors`/ONNX; use `torch.load(..., weights_only=True)` (default since PyTorch 2.6); scan third-party models (ModelScan, picklescan) |
| Untrusted public models and datasets | Pin by revision/hash, mirror internally, review licenses |
| Dependency compromise | Lock files, private package mirrors, image scanning, SBOMs |
| Model tampering between registry and serving | Sign artifacts (Sigstore/cosign, model signing tools), verify at deploy |
| Training data poisoning | Data provenance, validation, anomaly detection on new data |
| Model extraction / inversion via API | Authentication, rate limits, output restrictions, monitoring of query patterns |
| Sensitive data in training sets or logs | Data minimization, access controls, PII redaction in prompts and traces |

## GPU Cost Control

- Measure GPU-hours by team and job (DCGM + Kubernetes labels, OpenCost) and show utilization next to cost.
- Use spot/preemptible GPUs for checkpointed training and batch inference.
- Right-size GPU type per workload: inference of small models often runs well on smaller GPUs, MIG slices or CPUs.
- Turn off idle notebook servers and interactive GPU pods with idle culling.
- Commit (reservations, savings plans) only for the steady baseline of serving and scheduled training.

## Multi-Tenant Platform Concerns

- Namespaces and quotas per team; Kueue for fair sharing of scarce GPUs.
- Standard templates (project scaffolding with pipeline, tracking, serving defaults) as golden paths.
- Central model registry with access control per model; audit of promotions.
- Shared observability with per-model dashboards and owners.

## Checklist

- [ ] GPU Operator, taints, and queueing (Kueue/Volcano) for fair GPU access
- [ ] Distributed jobs checkpoint and resume; utilization monitored
- [ ] Feature definitions shared between training and serving with point-in-time joins
- [ ] Serving uses batching, appropriate compilation/quantization, and concurrency-based autoscaling
- [ ] LLM prompts, models, indexes and eval suites versioned together
- [ ] Safe model formats, pinned and signed artifacts, scanned dependencies
- [ ] GPU cost and utilization reported per team
