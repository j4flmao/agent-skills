# Vertical Pod Autoscaler (VPA)

## Overview

VPA automatically adjusts pod resource requests and limits based on historical usage and OOM events. It works in three modes: Off (recommendations only), Initial (apply on creation), and Auto (apply dynamically).

## VPA Architecture

```
                    ┌──────────────────┐
                    │   Recommender    │
                    │                  │
                    │ ← Metrics API   │
                    │ ← OOM events    │
                    │ → Recommendations│
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │   Updater        │
                    │                  │
                    │ Evicts pods to  │
                    │ apply new res.  │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │ Admission Plugin │
                    │                  │
                    │ Sets resources  │
                    │ on pod creation │
                    └──────────────────┘
```

## VPA Modes

### Off Mode (Recommendations Only)
```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: app-vpa-recommend
spec:
  targetRef:
    apiVersion: "apps/v1"
    kind: Deployment
    name: app
  updatePolicy:
    updateMode: "Off"  # Only recommend, no automatic changes
  resourcePolicy:
    containerPolicies:
    - containerName: "*"
      minAllowed:
        cpu: 50m
        memory: 64Mi
      maxAllowed:
        cpu: 4000m
        memory: 8Gi
```

### Initial Mode
```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: app-vpa-initial
spec:
  targetRef:
    apiVersion: "apps/v1"
    kind: Deployment
    name: app
  updatePolicy:
    updateMode: "Initial"  # Apply on new pods, never evict
  resourcePolicy:
    containerPolicies:
    - containerName: "app"
      controlledResources: ["cpu", "memory"]
      controlledValues: RequestsAndLimits
```

### Auto Mode
```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: app-vpa-auto
spec:
  targetRef:
    apiVersion: "apps/v1"
    kind: Deployment
    name: app
  updatePolicy:
    updateMode: "Auto"  # Evict pods to apply new recommendations
  resourcePolicy:
    containerPolicies:
    - containerName: "app"
      minAllowed:
        cpu: 100m
        memory: 128Mi
      maxAllowed:
        cpu: 2000m
        memory: 4Gi
      controlledResources: ["cpu", "memory"]
      controlledValues: RequestsAndLimits
```

## VPA Recommendations

### Viewing Recommendations
```bash
# Get VPA recommendations
kubectl describe vpa app-vpa-recommend

# Output:
# Recommendation:
#   Container Recommendations:
#     Container: app
#     Lower Bound:
#       Cpu:     250m
#       Memory:  256Mi
#     Target:
#       Cpu:     500m
#       Memory:  512Mi
#     Upper Bound:
#       Cpu:     1000m
#       Memory:  1Gi
#     Uncapped Target:
#       Cpu:     500m
#       Memory:  512Mi
```

### Understanding Recommendations
```
Lower Bound:  Minimum resources to avoid OOM/throttling
Target:       Recommended resources for optimal performance
Upper Bound:  Maximum before considering scaling unnecessary
Uncapped:     Target without min/max constraints
```

## VPA with HPA Integration

### VPA (Off) + HPA Combination
```yaml
# VPA recommends resource sizing
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: app-vpa
spec:
  targetRef:
    apiVersion: "apps/v1"
    kind: Deployment
    name: app
  updatePolicy:
    updateMode: "Off"  # Read-only: use recommendations as guidance
  resourcePolicy:
    containerPolicies:
    - containerName: "app"
      minAllowed:
        cpu: 100m
        memory: 128Mi
      maxAllowed:
        cpu: 2000m
        memory: 2Gi

# HPA scales replicas based on CPU
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: app
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### VPA + HPA Mutual Exclusion Rules
```yaml
# VPA Auto mode — do NOT configure HPA on same metric
# VPA Off mode — safe to use HPA on CPU/memory
# VPA Initial mode — safe to use HPA if VPA only applies to new pods

# Recommended: VPA Off + HPA
# 1. VPA recommends optimal CPU/memory requests
# 2. HPA scales replicas based on target metric
# 3. Periodically review VPA recommendations and update deployment manually
```

## OOM Handling

### VPA OOM Detection
```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: app-vpa-oom
spec:
  targetRef:
    apiVersion: "apps/v1"
    kind: Deployment
    name: app
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: "app"
      # VPA automatically increases memory for OOMing pods
      minAllowed:
        cpu: 100m
        memory: 256Mi
      maxAllowed:
        cpu: 4000m
        memory: 8Gi
```

### OOM Score Threshold
```yaml
# Configurable via VPA recommender flags
# --oom-bump-up-ratio=1.2        # Increase memory by 20% after OOM
# --memory-min-mb=250            # Minimum memory recommendation
# --memory-max-mb=65536          # Maximum memory recommendation
```

## VPA Resource Policy

### Fine-Grained Container Policies
```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: multi-container-vpa
spec:
  targetRef:
    apiVersion: "apps/v1"
    kind: Deployment
    name: multi-container-app
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: "main-app"
      mode: "Auto"
      minAllowed:
        cpu: 200m
        memory: 256Mi
      maxAllowed:
        cpu: 4000m
        memory: 8Gi
      controlledResources: ["cpu", "memory"]
    - containerName: "sidecar"
      mode: "Off"  # Don't autoscale this container
    - containerName: "istio-proxy"
      mode: "Auto"
      minAllowed:
        cpu: 10m
        memory: 32Mi
      maxAllowed:
        cpu: 500m
        memory: 512Mi
```

## VPA for StatefulSets

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: statefulset-vpa
spec:
  targetRef:
    apiVersion: "apps/v1"
    kind: StatefulSet
    name: my-statefulset
  updatePolicy:
    updateMode: "Initial"  # Only on restart, avoid eviction
```

## VPA Recommender Configuration

### Recommender Flags
```yaml
# VPA recommender deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vpa-recommender
  namespace: kube-system
spec:
  template:
    spec:
      containers:
      - name: recommender
        image: registry.k8s.io/autoscaling/vpa-recommender:1.2.0
        command:
        - ./recommender
        - --v=4
        - --recommender-name=default
        - --checkpoints-interval=1h
        - --prometheus-address=http://prometheus:9090
        - --storage=Prometheus
        - --history-length=14d
        - --pod-recommendation-min-cpu-millicores=25
        - --pod-recommendation-min-memory-mb=250
```

### History Periods
```
--history-length=8d     # Default: 8 days of history
--recommendation-lower-bound-margin-fraction=0.05
--recommendation-upper-bound-margin-fraction=0.05
--recommendation-target-margin-fraction=0.15
```

## Troubleshooting

### Check VPA Status
```bash
# Get VPA status
kubectl describe vpa app-vpa

# Check VPA conditions
kubectl get vpa app-vpa -o json | jq '.status.conditions'

# View VPA logs
kubectl logs -n kube-system -l app=vpa-recommender

# Check admission controller
kubectl logs -n kube-system -l app=vpa-admission-controller
```

### Common Issues
```bash
# VPA not updating — check admission webhook
kubectl get mutatingwebhookconfiguration vpa-webhook-config

# Missing metrics
kubectl top pod my-pod

# VPA eviction loop
kubectl describe pod my-pod | grep -A5 "Reason"
```

## Best Practices

1. **Start with "Off" mode** for 1-2 weeks to gather recommendations before applying changes.
2. **Use "Initial" mode** for stateful workloads where pod eviction is expensive.
3. **Set realistic `minAllowed` and `maxAllowed`** to prevent extreme recommendations.
4. **Never use VPA "Auto" with HPA on the same metric** (CPU/memory) — they conflict.
5. **Review VPA recommendations weekly** and update deployments manually if using "Off" mode.
6. **Enable Prometheus storage** for VPA to improve recommendation accuracy.
7. **Configure `controlledValues: RequestsAndLimits`** to keep requests == limits.
8. **Set resource limits on VPA components** to prevent resource starvation.
9. **Use `--oom-bump-up-ratio=1.2`** to avoid excessive memory increases on OOM.
10. **Monitor VPA-evicted pods** — frequent evictions indicate configuration issues.
