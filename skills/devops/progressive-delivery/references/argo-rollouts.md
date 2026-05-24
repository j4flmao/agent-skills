# Argo Rollouts

Argo Rollouts extends Kubernetes Deployments with advanced deployment strategies (blue-green, canary) and traffic routing integration.

## Rollout CRD

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: myapp
spec:
  replicas: 5
  revisionHistoryLimit: 2
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: app
          image: myapp:1.0.0
          ports:
            - containerPort: 8080
```

## Canary Strategy

```yaml
spec:
  strategy:
    canary:
      steps:
        - setWeight: 10
        - pause: { duration: 30s }
        - setWeight: 25
        - pause: { duration: 60s }
        - setWeight: 50
        - pause: { duration: 120s }
        - setWeight: 75
        - pause: { duration: 60s }
        - setWeight: 100
      trafficRouting:
        istio:
          virtualService:
            name: myapp
            routes:
              - primary
      canaryService: myapp-canary
      stableService: myapp-stable
```

## Blue-Green Strategy

```yaml
spec:
  strategy:
    blueGreen:
      activeService: myapp
      previewService: myapp-preview
      autoPromotionEnabled: false
      scaleDownDelaySeconds: 600  # keep old replicas for rollback
      prePromotionAnalysis:
        templates:
          - templateName: smoke-test
      postPromotionAnalysis:
        templates:
          - templateName: success-rate
```

## Traffic Routing Integrations

### Istio

```yaml
spec:
  strategy:
    canary:
      trafficRouting:
        istio:
          virtualService:
            name: myapp
            routes:
              - primary
          destinationRule:
            name: myapp
            canarySubsetName: canary
            stableSubsetName: stable
```

### NGINX Ingress

```yaml
spec:
  strategy:
    canary:
      trafficRouting:
        nginx:
          stableIngress: myapp-ingress
          additionalIngressAnnotations:
            canary-by-header: X-Canary
            canary-by-header-value: "true"
```

### AWS ALB

```yaml
spec:
  strategy:
    canary:
      trafficRouting:
        alb:
          ingress: myapp-ingress
          servicePort: 80
          rootService: myapp-stable
          canaryService: myapp-canary
```

### SMI (Service Mesh Interface)

```yaml
spec:
  strategy:
    canary:
      trafficRouting:
        smi:
          trafficSplitName: myapp
          rootService: myapp
```

## Analysis Templates

Prometheus metric analysis:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate
spec:
  metrics:
    - name: success-rate
      interval: 30s
      count: 10
      failureLimit: 3
      successCondition: result >= 0.99
      provider:
        prometheus:
          address: http://prometheus.monitoring:9090
          query: |
            1 - (
              sum(rate(http_requests_total{app="myapp",status=~"5.*"}[1m]))
              /
              sum(rate(http_requests_total{app="myapp"}[1m]))
            )
    - name: latency-p99
      interval: 30s
      count: 10
      failureLimit: 3
      successCondition: result <= 200
      provider:
        prometheus:
          address: http://prometheus.monitoring:9090
          query: |
            histogram_quantile(0.99,
              sum(rate(http_request_duration_seconds_bucket{app="myapp"}[1m])) by (le)
            )
```

## Manual Promotion

```bash
# Promote canary to 100%
kubectl argo rollouts promote myapp

# Abort and rollback
kubectl argo rollouts abort myapp

# Watch rollout status
kubectl argo rollouts get rollout myapp --watch

# List rollouts
kubectl argo rollouts list
```

## Dashboard

```bash
kubectl argo rollouts dashboard
# Open http://localhost:3100
```

## Key Features

| Feature | Description |
|---------|-------------|
| Auto-rollback | Automatically roll back on failed analysis |
| Manual promotion | Approve steps interactively |
| Pre/post promotion hooks | Run analysis before or after promotion |
| Scale down delay | Keep old ReplicaSet for quick rollback |
| Multiple traffic routers | Istio, NGINX, ALB, SMI, Ambassador |
| Analysis runs | Prometheus, Datadog, New Relic, CloudWatch |
| Blue-green preview | Preview service for validation before cutover |

Argo Rollouts provides Kubernetes-native progressive delivery with deep traffic routing integration and automated analysis-driven rollbacks.
