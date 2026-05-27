---
name: devops-kubernetes-autoscaling
description: >
  Kubernetes autoscaling strategies and configurations.
  Covers: Horizontal Pod Autoscaler (HPA) with CPU/memory, custom, and external metrics,
  Vertical Pod Autoscaler (VPA) update modes and recommender, Keda with 50+ scalers,
  Cluster Autoscaler node group optimization, combined HPA+VPA+CA strategies,
  predictive scaling, and cost optimization.
  Do NOT use for: Non-Kubernetes autoscaling (AWS ASG, Azure VMSS, etc.).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, kubernetes, autoscaling, hpa, vpa, keda, phase-5]
---

# Kubernetes Autoscaling

## Purpose
Design, implement, and optimize Kubernetes autoscaling strategies using HPA, VPA, Keda, and Cluster Autoscaler to achieve cost-efficient, responsive, and reliable workloads.

## Agent Protocol

### Trigger
Exact user phrases: "HPA", "VPA", "Keda", "Cluster Autoscaler", "autoscaling", "horizontal pod autoscaler", "vertical pod autoscaler", "Keda scaler", "pod scaling", "node scaling", "predictive scaling", "autoscaling strategy".

### Input Context
Before activating, verify:
- Kubernetes version and available autoscaling APIs.
- Workload characteristics (stateless, stateful, batch, event-driven).
- Metric sources (Prometheus, custom metrics API, external metrics API).
- Node group configuration (instance types, min/max sizes, spot vs. on-demand).
- Cluster autoscaler version and configuration.

### Output Artifact
Writes to YAML manifests for HPA, VPA, ScaledObject, ScaledJob, and ClusterAutoscaler configuration.

### Response Format
YAML manifests with appropriate apiVersion and autoscaling parameters.

### Completion Criteria
This skill is complete when:
- [ ] HPA configured with appropriate metrics and behavior.
- [ ] VPA configured with correct update mode and resource recommendations.
- [ ] Keda ScaledObject created for event-driven workloads.
- [ ] Cluster Autoscaler configured for efficient node scaling.
- [ ] Combined strategy documented with mutual exclusion rules.

### Max Response Length
Direct file write. No response text.

## Quick Start
Deploy metrics-server → Create HPA with CPU target → Add custom metric → Configure VPA in "off" mode for initial recommendations → Deploy Keda for event-driven scale → Configure Cluster Autoscaler node groups → Monitor with K9s or Prometheus.

## When to Use This Skill
- Scaling stateless web applications based on load
- Right-sizing container resource requests/limits
- Event-driven scaling (Kafka, message queues, cron)
- Optimizing cluster node costs with spot instances
- Batch job autoscaling based on queue depth

## Core Workflow

### Step 1: Deploy Metrics Server
```yaml
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

### Step 2: HPA Configuration
```yaml
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
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Step 3: Combined Strategy
```yaml
# VPA to recommend requests, HPA to scale replicas
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
    updateMode: "Off"  # Only recommend
  resourcePolicy:
    containerPolicies:
    - containerName: app
      minAllowed:
        cpu: 100m
        memory: 128Mi
      maxAllowed:
        cpu: 2000m
        memory: 2Gi
```

## Rules & Constraints
- VPA and HPA on same metric (CPU/memory) cause conflicts — use VPA in "Off" mode or separate metrics.
- Always set min/max replicas on HPA to prevent runaway scaling.
- Set stabilizationWindows for metrics that fluctuate rapidly.
- Never scale below 2 replicas for production workloads (HA requirements).
- Cluster Autoscaler requires proper IAM permissions for node group management.

## References
  - references/autoscaling-strategies.md — Combined Autoscaling Strategy
  - references/cluster-autoscaler.md — Cluster Autoscaler
  - references/hpa-patterns.md — Horizontal Pod Autoscaler (HPA)
  - references/keda-scalers.md — Keda Scalers
  - references/kubernetes-autoscaling-advanced.md — Kubernetes Autoscaling Advanced Topics
  - references/kubernetes-autoscaling-fundamentals.md — Kubernetes Autoscaling Fundamentals
  - references/vpa-config.md — Vertical Pod Autoscaler (VPA)
## Handoff
After completing this skill:
- Next skill: **devops-apm-observability** — Observability to monitor and inform autoscaling
- Pass context: HPA metric names, VPA recommendations, Keda scaler configuration, node group names
