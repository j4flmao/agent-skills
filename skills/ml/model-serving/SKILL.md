---
name: ml-model-serving
description: >
  Use this skill when deploying models for inference: TorchServe, BentoML, Ray Serve, KServe, Seldon Core, model deployment, A/B testing, autoscaling, canary deployment, model versioning, inference optimization.
  This skill enforces: framework selection based on model type, deployment strategy documentation, autoscaling configuration, model versioning scheme, rollback procedure, inference optimization.
  Do NOT use for: model training, feature store serving, pipeline orchestration, prompt engineering.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [ml, serving, inference, phase-11]
---

# Model Serving Agent

## Purpose
Design model serving architecture with framework selection, deployment strategy, autoscaling, and inference optimization for production workloads.

## Architecture/Decision Trees

### Framework Selection Decision Tree
```
Model framework and requirements
  ├── PyTorch model
  │   ├── Need native PyTorch support → TorchServe (model archive, metrics)
  │   ├── Complex pipeline (multi-model) → Ray Serve (composition)
  │   └── K8s native → KServe (K8s CRD, auto-scaling to zero)
  ├── TensorFlow model
  │   └── TF Serving (native, best performance, SavedModel format)
  ├── Python ecosystem (sklearn, XGBoost, custom)
  │   ├── Simple API → BentoML (OpenAPI, framework-agnostic)
  │   └── Distributed, complex → Ray Serve (Python-native)
  ├── Multiple frameworks
  │   ├── K8s → KServe or Seldon Core (multi-framework)
  │   └── MLflow → MLflow Serving (experiment tracking integration)
  └── Edge / Mobile
      ├── Mobile → TensorFlow Lite / Core ML
      ├── Edge → ONNX Runtime / OpenVINO
      └── Web → TensorFlow.js / ONNX.js
```

### Deployment Strategy Decision Tree
```
Risk tolerance and traffic pattern
  ├── Zero-risk tolerance, critical system
  │   └── Blue-Green (full cutover, instant rollback, double resources)
  ├── Staged rollout, can monitor
  │   ├── Services → Canary (5% → 25% → 50% → 100%, automated metrics)
  │   └── Stateless → Rolling (update instances one-by-one)
  └── Need to compare models
      └── A/B Testing (traffic split by user/region, statistical comparison)
```

### Autoscaling Strategy
```
Workload pattern
  ├── Predictable traffic → Scheduled scaling (cron-based min/max)
  ├── Spiky, bursty → RPS-based (scale on requests per second)
  ├── CPU-bound → CPU utilization (target 60-70%)
  ├── GPU-bound → GPU utilization (target 70-80%)
  ├── Latency-sensitive → Concurrency-based (target concurrent requests)
  └── Variable → Hybrid: RPS + CPU + memory combination
```

### Inference Optimization Decision Tree
```
Latency/throughput requirement
  ├── Real-time (<100ms)
  │   ├── GPU → TensorRT (FP16/INT8, kernel fusion)
  │   ├── CPU → ONNX Runtime (graph optimization, int8 quantization)
  │   └── Small model → batching with max_latency_budget
  ├── Near real-time (<1s)
  │   ├── Dynamic batching (max_batch_size=32, max_delay=100ms)
  │   └── Response caching (TTL=60s for frequent queries)
  └── Batch (minutes)
      └── Large batch processing (maximize throughput, no latency concern)
```

## Agent Protocol

### Trigger
User request includes: model serving, TorchServe, BentoML, Ray Serve, Seldon Core, KServe, inference, model deployment, A/B testing, autoscaling, canary deploy, model versioning, prediction, inference API.

### Protocol
1. Identify model framework and inference requirements.
2. Select serving framework based on model type, scale, and feature needs.
3. Design deployment strategy: canary, blue-green, or A/B testing.
4. Configure autoscaling with metrics and thresholds.
5. Define model versioning scheme and rollback procedure.
6. Optimize inference: batching, quantization, kernel fusion.

### Output
Model serving architecture with framework selection, deployment strategy, scaling, optimization.

### Response Format
```
## Model Serving Configuration
### Framework
Engine: {TorchServe / BentoML / Ray Serve / KServe}
Model Format: {Mar / Bento / ONNX / SavedModel}

### Deployment
Strategy: {canary / blue-green / rolling}
Replicas: {min} - {max}
Model Version: {current} | Previous: {previous}

### Autoscaling
Metric: {CPU / GPU / RPS / latency}
Threshold: {value}

### Inference Optimization
Batching: {max_batch_size} | {max_latency_ms}
Quantization: {FP16 / INT8 / none}
```

No preamble. No postamble. No explanations. No filler. Compress output.

### Completion Criteria
- [ ] Serving framework selected with rationale based on model type.
- [ ] Deployment strategy defined with traffic split and monitoring.
- [ ] Autoscaling configured with metrics and thresholds.
- [ ] Model versioning scheme with rollback procedure.
- [ ] Inference optimization applied (batching, quantization).
- [ ] Health checks and readiness probes configured.

## Workflow

### Step 1: Select Serving Framework
- **TorchServe**: PyTorch-native, built-in model archive, metrics. Best for PyTorch models.
- **BentoML**: Framework-agnostic, Python-first, OpenAPI spec. Best for Python ML ecosystem.
- **Ray Serve**: Distributed, composition of models, Python-native. Best for complex pipelines.
- **KServe**: Kubernetes-native, serverless, auto-scaling to zero. Best for K8s infra.
- **Seldon Core**: Multi-framework, explainability, outlier detection. Best for advanced ML features.

```python
# BentoML service definition
import bentoml
import numpy as np
from bentoml.io import JSON, NumpyNdarray

@bentoml.service(
    resources={"cpu": "2", "memory": "4Gi"},
    traffic={"timeout": 10, "max_concurrency": 32},
)
class PredictionService:
    def __init__(self):
        self.model = bentoml.xgboost.load_model("churn_model:v2")

    @bentoml.api(batchable=True, max_batch_size=32, batch_dim=0)
    def predict(self, input: np.ndarray) -> np.ndarray:
        return self.model.predict(input)
```

### Step 2: Package Model
```python
# BentoML packaging
import bentoml
import xgboost as xgb

model = xgb.XGBClassifier()
model.fit(X_train, y_train)
bentoml.xgboost.save_model("churn_model", model)

# Verify
svc = bentoml.Server("prediction_service:latest")
svc.start()
```

### Step 3: Configure Autoscaling
```yaml
# KServe InferenceService
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: model-server
spec:
  predictor:
    minReplicas: 2
    maxReplicas: 10
    scaleMetric: concurrency
    scaleTarget: 10
    containers:
    - image: model-server:latest
      resources:
        limits:
          cpu: "4"
          memory: 8Gi
          nvidia.com/gpu: "1"
```

### Step 4: Deploy with Canary Strategy
```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: my-model
spec:
  canary:
    trafficPercent: 10
    containers:
    - image: my-model:v2
  default:
    containers:
    - image: my-model:v1
```

### Step 5: Inference Optimization
```python
# Dynamic batching in config
batch_size=32
max_batch_delay=100

# Quantization
import torch
model = torch.quantization.quantize_dynamic(
    model, {torch.nn.Linear}, dtype=torch.qint8
)
torch.jit.save(torch.jit.script(model), 'model_quantized.pt')

# ONNX export
import torch.onnx
dummy_input = torch.randn(1, 3, 224, 224)
torch.onnx.export(
    model, dummy_input, "model.onnx",
    opset_version=17,
    input_names=["input"], output_names=["output"],
    dynamic_axes={"input": {0: "batch"}, "output": {0: "batch"}},
)
```

### Step 6: Health Checks & Monitoring
```yaml
# Kubernetes health probes
readinessProbe:
  httpGet:
    path: /v1/models/my-model/ready
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 5
livenessProbe:
  httpGet:
    path: /v1/models/my-model/health
    port: 8080
  initialDelaySeconds: 60
  periodSeconds: 30
```

### Step 7: A/B Testing Setup
```python
# Traffic routing for A/B testing
import numpy as np

class ABTestRouter:
    def __init__(self, model_a, model_b, traffic_percent_a=0.5):
        self.model_a = model_a
        self.model_b = model_b
        self.traffic_percent_a = traffic_percent_a

    def predict(self, request):
        user_id = request.get("user_id")
        if hash(str(user_id)) % 100 < self.traffic_percent_a * 100:
            return self.model_a.predict(request)
        else:
            return self.model_b.predict(request)
```

## Anti-Patterns

- **100% cutover without canary**: Always use traffic splitting for new model versions.
- **Autoscaling on CPU**: CPU is a lagging indicator for inference. Use concurrency or RPS.
- **Not retaining previous model versions**: Keep last 2 versions for rollback.
- **Batching without latency budget**: Batch beyond user tolerance → timeout errors.
- **Missing health endpoints**: Every serving endpoint needs /health and /ready.
- **Not pinning framework versions**: ABI breaks when serving framework upgrades.
- **100% inference logging**: Log overflow. Sample at <1% rate.
- **Not monitoring data drift**: Model degrades silently without drift detection.

## Production Considerations

### Monitoring
- p50/p95/p99 inference latency.
- Error rate (HTTP 4xx/5xx).
- Request throughput (RPS).
- GPU utilization and memory.
- Model version drift detection.
- Prediction distribution monitoring.

### Scaling
- Horizontal Pod Autoscaler with custom metrics.
- GPU node auto-scaling with cluster autoscaler.
- Batch jobs: reduce to zero replicas when idle.

### Cost Optimization
- Serverless (KServe): scale to zero when idle.
- GPU: use spot instances for batch inference.
- Cache frequent predictions (response cache).
- Right-size instances: profile before deploying.

## Deployment Patterns — Detailed

### Pattern: Canary Deployment
```
Goal: Gradually shift traffic to new model version with automatic rollback.

Implementation steps:
1. Deploy model v2 alongside v1 (both serving)
2. Route 5% of traffic to v2
3. Monitor: latency p99, error rate, prediction distribution
4. If metrics stable for 30 min, increase to 25%
5. If stable for 1 hour, increase to 50%
6. If stable for 2 hours, increase to 100%
7. Keep v1 running for 24 hours for rollback

Platform config (KServe):
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: my-model
spec:
  canary:
    trafficPercent: 5
  predictor:
    canaryTrafficPercent: 5
    containers:
      - image: my-model:v2
  predictor-v1:
    containers:
      - image: my-model:v1
```

### Pattern: Blue-Green Deployment
```
Goal: Swap entire traffic between two model versions.

Implementation steps:
1. Deploy v2 (green) alongside v1 (blue)
2. Run validation suite against green endpoint
3. All tests pass -> switch router to green
4. Keep blue running for 24 hours
5. After 24 hours, tear down blue

Pros: Instant rollback, simple
Cons: 2x resource usage during transition
Best for: Models that can't handle mixed traffic
```

### Pattern: Shadow Deployment
```
Goal: Test new model against production traffic without affecting users.

Implementation:
1. Deploy v2 as shadow (receives all requests, results discarded)
2. Compare v1 vs v2 outputs for offline analysis
3. Validate: mean prediction difference < 5%, latency OK, no errors
4. Promote v2 to canary or blue-green

Pros: Zero user impact, can test with full production load
Cons: 2x compute cost, no real user feedback
Best for: High-risk model changes, validating new architecture
```

### Pattern: Multi-Model Serving
```
Goal: Serve multiple models on shared infrastructure.

Strategies:
1. Sidecar per model: each model in its own container, shared sidecar
2. Model multiplexing: single server loads multiple models, routes by header
3. Model mesh: dedicated infrastructure for model routing (e.g., Seldon Core)

Config (Seldon Core):
apiVersion: machinelearning.seldon.io/v1
kind: SeldonDeployment
metadata:
  name: model-mesh
spec:
  predictors:
    - componentSpecs:
        - spec:
            containers:
              - image: model-a-server
              - image: model-b-server
              - image: model-c-server
```

## Autoscaling Configuration — Production Ready

### KServe with Knative Autoscaling
```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
spec:
  predictor:
    minReplicas: 2         # minimum for availability
    maxReplicas: 20        # upper bound for cost control
    scaleMetric: concurrency
    scaleTarget: 5          # target requests in-flight per replica
    scaleMetric: concurrency  # options: concurrency, rps, cpu, memory
    scaleTarget: 5
    scaleDownDelay: 10m    # wait before scaling down to avoid thrashing
    containers:
      - image: model:v1
        resources:
          requests:
            cpu: "1"
            memory: 2Gi
          limits:
            cpu: "2"
            memory: 4Gi
```

### Autoscaling Decision Table
| Workload Pattern | Metric | Scale Target | Strategy |
|-----------------|--------|-------------|----------|
| Real-time API, steady | Concurrency | 5-10 | HPA with concurrency |
| Real-time API, bursty | RPS | 50-100 | KPA (Knative) |
| Batch processing | CPU | 70% | HPA with CPU |
| GPU inference | GPU utilization | 60% | Custom metrics |
| Variable load | Request latency p99 | < 500ms | Custom HPA |

### HPA with Custom Metrics
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: model-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: model-server
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Pods
      pods:
        metric:
          name: inference_requests_inflight
        target:
          type: AverageValue
          averageValue: 10
    - type: Pods
      pods:
        metric:
          name: inference_latency_p99_ms
        target:
          type: AverageValue
          averageValue: 300
```

## Response Caching Strategy

```python
class PredictionCache:
    """LRU cache for frequent prediction requests."""

    def __init__(self, max_size: int = 10000, ttl_seconds: int = 300):
        self.cache = lru.LRU(max_size)
        self.ttl = ttl_seconds

    def get_or_predict(self, request_id: str, model_fn, fallback=None):
        if request_id in self.cache:
            entry = self.cache[request_id]
            if time.time() - entry["timestamp"] < self.ttl:
                return entry["prediction"]
        prediction = model_fn()
        self.cache[request_id] = {
            "prediction": prediction,
            "timestamp": time.time(),
        }
        return prediction
```

## Optimization for Latency vs. Throughput

| Strategy | Reduces | Cost | Complexity |
|----------|---------|------|------------|
| FP16/INT8 quantization | Latency + memory | Accuracy loss | Low (ONNX, TensorRT) |
| Batch inference | Throughput ++ | Latency per item | Low |
| Knowledge distillation | Latency + size | Training cost | High |
| Model pruning | Latency + size | Accuracy loss | Medium |
| ONNX Runtime | Latency | Setup | Low |
| TensorRT (NVIDIA) | Latency ++ | GPU only | Medium |
| vLLM (LLMs) | Throughput ++ | GPU only | Medium |
| Response caching | Latency for cache hits | Staleness | Low |

## Model Serving Anti-Patterns
1. **No traffic splitting**: Every deploy is a full cutover, no gradual rollout
   Fix: Always use canary or blue-green for model changes
2. **CPU-based autoscaling for models**: CPU is a poor proxy for inference load
   Fix: Scale on concurrency or RPS
3. **No request batching**: Every prediction is a separate HTTP call
   Fix: Smart batching with max latency budget
4. **One-size-fits-all instance type**: CPU/GPU for all models regardless of size
   Fix: Right-size per model; use GPU only for large models
5. **No model warmup**: First request is slow due to cold start
   Fix: Pre-warm model on startup, keep min replicas

## Serving Framework Comparison

| Framework | GPU Support | Autoscaling | Batching | Model Versioning | Community |
|-----------|-------------|-------------|----------|-----------------|-----------|
| KServe | Yes | Knative | Smart batch | Multiple strategies | Large |
| Seldon Core | Yes | Custom HPA | Custom | Graph-based | Medium |
| TorchServe | Yes | Custom | Yes | Yes | Medium |
| TF Serving | Yes | Custom | Yes | Yes (+ lifecycle) | Large |
| Triton | Yes (best) | Custom | Dynamic batching | Yes | Large |
| BentoML | Yes | Custom | Yes | Yes | Growing |
| FastAPI custom | Yes | HPA | Custom | Custom | N/A |

## Rules
- Serving framework matches model framework.
- Deployment strategy uses traffic splitting.
- Autoscaling based on concurrency or RPS, not CPU.
- Every model version retains previous 2 for rollback.
- Batching with max latency budget.
- Health checks at /health and /ready.
- Models pinned to specific framework versions.
- Inference logging sampled <1%.
- GPU inference uses FP16 by default.
- Rollback validated with health checks.

## References
  - references/k8s-serving.md — Kubernetes-Native Serving
  - references/model-serving-advanced.md — Model Serving Advanced Topics
  - references/model-serving-fundamentals.md — Model Serving Fundamentals
  - references/model-versioning.md — Model Versioning & Deployment Strategies
  - references/serverless-inference.md — Serverless Model Inference
  - references/serving-frameworks.md — Serving Frameworks Comparison
## Handoff
For model building and packaging, hand off to `ml-ml-pipeline`. For monitoring inference metrics, hand off to `devops/monitoring`.
