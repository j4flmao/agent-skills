---
name: ml-model-serving
description: >
  Use this skill when deploying models for inference: TorchServe, BentoML, Ray Serve, KServe, Seldon Core, model deployment, A/B testing, autoscaling, canary deployment, model versioning, inference optimization.
  This skill enforces: framework selection based on model type, deployment strategy documentation, autoscaling configuration, model versioning scheme, rollback procedure, inference optimization.
  Do NOT use for: model training, feature store serving, pipeline orchestration, prompt engineering.
version: "1.0.0"
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

## Agent Protocol

### Trigger
User request includes: model serving, TorchServe, BentoML, Ray Serve, Seldon Core, KServe, inference, model deployment, A/B testing, autoscaling, canary deploy, model versioning, prediction, inference API.

### Protocol
1. Identify model framework (PyTorch, TensorFlow, ONNX, scikit-learn) and inference requirements.
2. Select serving framework based on model type, scale, and feature needs.
3. Design deployment strategy: canary, blue-green, or A/B testing.
4. Configure autoscaling with metrics and thresholds.
5. Define model versioning scheme and rollback procedure.
6. Optimize inference: batching, quantization, kernel fusion.

## Output
Model serving architecture with framework selection, deployment strategy, scaling, optimization.

### Response Format
```
## Model Serving Configuration
### Framework
Engine: {TorchServe / BentoML / Ray Serve / KServe}
Version: {version}
Model Format: {Mar / Bento / ONNX / SavedModel}

### Deployment
Strategy: {canary / blue-green / rolling}
Replicas: {min} - {max}
Model Version: {current} | Previous: {previous}
Endpoint: {url}

### Autoscaling
Metric: {CPU / GPU / RPS / latency}
Threshold: {value}
Scale Up: {cooldown}s | Scale Down: {cooldown}s

### Inference Optimization
Batching: {max_batch_size} | {max_latency_ms}
Quantization: {FP16 / INT8 / none}
Runtime: {TensorRT / ONNX Runtime / default}
Cache: {response cache TTL}

### Rollback
Trigger: {error rate > threshold / latency spike / manual}
Procedure: {revert to previous version}
Validation: {health check for 5 min after rollback}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

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

### Step 2: Package Model
```python
# BentoML example
import bentoml
import torch

class MyModel(bentoml.BentoService):
    @bentoml.api(input=JsonInput(), output=JsonOutput())
    def predict(self, parsed_json):
        input_tensor = torch.tensor(parsed_json['input'])
        output = self.artifacts.model(input_tensor)
        return {'prediction': output.tolist()}

# Save and serve
bentoml.save(MyModel)
svc = bentoml.Server(MyModel)
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
# Dynamic batching in TorchServe
# config.properties
batch_size=32
max_batch_delay=100
batch_size=auto

# Quantization
import torch
model = torch.quantization.quantize_dynamic(
    model, {torch.nn.Linear}, dtype=torch.qint8
)
torch.jit.save(torch.jit.script(model), 'model_quantized.pt')
```

## Rules
- Serving framework matches model framework — avoid unnecessary conversion layers.
- Deployment strategy uses traffic splitting — never deploy 100% cutover without canary.
- Autoscaling based on concurrency or RPS, not CPU — CPU is lagging indicator for inference.
- Every model version retains previous 2 versions for rollback.
- Batching configured with max latency budget — never batch beyond user tolerance.
- Health checks at `/health` and readiness at `/ready` on every serving endpoint.
- Models pinned to specific framework versions to avoid ABI breaks.
- Inference logging sampled at rate < 1% to avoid log overflow.
- GPU inference uses FP16 by default unless accuracy degrades.
- Rollback validated with health checks before accepting traffic.

## References
- `references/serving-frameworks.md` — TorchServe, BentoML, Ray Serve comparison, setup, optimization
- `references/k8s-serving.md` — KServe, Seldon Core, deployment strategies, autoscaling, canary, monitoring
- `references/serverless-inference.md` — Serverless deployment (AWS SageMaker, Modal, GCP Cloud Run), cold start optimization, batch inference
- `references/model-versioning.md` — Versioning schemes, model registry, canary/blue-green/shadow deployment, rollback procedures, metadata

## Handoff
For model building and packaging, hand off to `ml-ml-pipeline`. For monitoring inference metrics, hand off to `devops/monitoring`. For feature serving alongside models, hand off to `ml-feature-store`.
