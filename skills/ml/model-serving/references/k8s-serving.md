# Kubernetes-Native Serving

## KServe InferenceService

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: fraud-detector
  namespace: ml-serve
spec:
  predictor:
    containers:
      - name: kserve-container
        image: fraud-detector:v1
        ports:
          - containerPort: 8080
        env:
          - name: MODEL_PATH
            value: /models/fraud-detector/
          - name: STORAGE_URI
            value: gs://models/fraud-detector/v1/
        resources:
          requests:
            cpu: "2"
            memory: 4Gi
          limits:
            cpu: "4"
            memory: 8Gi
            nvidia.com/gpu: "1"
    minReplicas: 2
    maxReplicas: 10
    scaleMetric: concurrency
    scaleTarget: 5
    scaleZero: false
```

## Canary Deployment

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: fraud-detector
spec:
  canary:
    trafficPercent: 10
    containers:
      - image: fraud-detector:v2
        env:
          - name: MODEL_VERSION
            value: v2
  default:
    containers:
      - image: fraud-detector:v1
        env:
          - name: MODEL_VERSION
            value: v1
```

## Seldon Core

```yaml
apiVersion: machinelearning.seldon.io/v1
kind: SeldonDeployment
metadata:
  name: sentiment-model
spec:
  name: sentiment
  predictors:
    - name: default
      graph:
        name: classifier
        implementation: SKLEARN_SERVER
        modelUri: gs://models/sentiment/v1/
        children: []
      componentSpecs:
        - spec:
            containers:
              - name: classifier
                env:
                  - name: SELDON_LOG_LEVEL
                    value: DEBUG
                resources:
                  requests:
                    cpu: "1"
                    memory: 2Gi
      traffic: 100
```

## Autoscaling

```yaml
# HPA (horizontal pod autoscaler)
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: model-server-hpa
spec:
  scaleTargetRef:
    apiVersion: serving.kserve.io/v1beta1
    kind: InferenceService
    name: fraud-detector
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Pods
      pods:
        metric:
          name: avg_request_concurrency
        target:
          type: AverageValue
          averageValue: 5
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 80

# KPA (Knative Pod Autoscaler) - scales to zero
apiVersion: autoscaling/v1
kind: KPA
metadata:
  name: model-server
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Revision
    name: model-server-00001
  minScale: 0
  maxScale: 10
  concurrency: 10  # target concurrent requests
```

## Model Versioning & Rollback

```yaml
# Version management with InferenceService
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: fraud-detector-v2
  annotations:
    predecessor: fraud-detector-v1
    rollback: "fraud-detector-v1"
spec:
  predictor:
    containers:
      - image: fraud-detector:v2

---

# Route traffic between versions
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: fraud-detector
spec:
  default:
    trafficPercent: 90
    ...

  canary:
    trafficPercent: 10
    ...
```

## Monitoring & Observability

```yaml
# Prometheus monitoring for KServe
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: model-server-monitor
spec:
  selector:
    matchLabels:
      serving.kserve.io/inferenceservice: fraud-detector
  endpoints:
    - port: http
      path: /metrics
      interval: 15s

# Prometheus rules for model serving
groups:
  - name: model_serving
    rules:
      - alert: ModelLatencySpike
        expr: histogram_quantile(0.99, rate(model_inference_latency_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: P1
        annotations:
          summary: "Model {{ $labels.model_name }} p99 latency > 2s"

      - alert: ModelErrorRateHigh
        expr: rate(model_inference_errors_total[5m]) / rate(model_inference_requests_total[5m]) > 0.02
        for: 5m
        labels:
          severity: P1
        annotations:
          summary: "Model {{ $labels.model_name }} error rate > 2%"
```

## Explainability with Seldon

```python
# Alibi explainer with Seldon
from alibi.explainers import AnchorTabular
import seldon_core

explainer = AnchorTabular(
    predictor=predict_fn,
    feature_names=feature_names,
    categorical_names=categorical_names,
)

explainer.fit(X_train)
explanation = explainer.explain(X_instance, threshold=0.95)
print(f"Anchor: {explanation.anchor}")
print(f"Precision: {explanation.precision}")
print(f"Coverage: {explanation.coverage}")
```

## Deployment Strategies Summary

| Strategy | Traffic Shift | Rollback Speed | Risk | Use Case |
|---|---|---|---|---|
| Rolling | Gradual | Slow | Low | Simple updates |
| Blue-Green | Instant swap | Instant | Medium | Major version changes |
| Canary | %-based | Fast | Low | A/B testing new models |
| A/B test | Split by user | N/A | Low | Model comparison |
| Shadow | 0% (mirror) | N/A | None | Dark launch testing |

## Configuration Best Practices

```yaml
# Resource limits for serving
resources:
  requests:
    cpu: "2"      # minimum to maintain baseline
    memory: 4Gi
  limits:
    cpu: "4"      # burst capacity
    memory: 8Gi
    nvidia.com/gpu: "1"  # GPU for inference

# Readiness probe
readinessProbe:
  httpGet:
    path: /v1/models/fraud-detector/ready
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10

# Liveness probe
livenessProbe:
  httpGet:
    path: /v1/models/fraud-detector/health
    port: 8080
  initialDelaySeconds: 60
  periodSeconds: 30
```
