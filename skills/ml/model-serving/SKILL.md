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
