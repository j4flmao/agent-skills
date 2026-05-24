# Combined Autoscaling Strategy

## Overview

Effective Kubernetes autoscaling combines HPA, VPA, Keda, and Cluster Autoscaler into a cohesive strategy. Each component scales a different dimension — pods horizontally, pods vertically, and nodes.

## Interaction Model

```
                     ┌────────────────────────┐
                     │   Workload Demands     │
                     └───────────┬────────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          │                      │                      │
   ┌──────▼──────┐     ┌────────▼───────┐    ┌─────────▼──────┐
   │  HPA/Keda   │     │      VPA       │    │    Manual     │
   │             │     │                │    │   Adjust      │
   │ Scale pods  │     │ Resize pods    │    │ Update req/   │
   │ horizontally│     │ vertically     │    │ limits        │
   └──────┬──────┘     └────────────────┘    └────────────────┘
          │
          │ More pods need more nodes
          ▼
   ┌──────────────────┐
   │ Cluster          │
   │ Autoscaler       │
   │                  │
   │ Scale node pool  │
   └──────────────────┘
```

## HPA + CA Interaction

### How HPA Triggers CA
```
1. Load increases → HPA scales replicas from 3 to 15
2. 5 pods scheduled, 10 pods pending (no capacity)
3. Cluster Autoscaler detects pending pods
4. CA triggers node group scale-up
5. New node joins cluster → remaining pods scheduled
6. Load decreases → HPA scales down replicas
7. CA detects underutilized nodes → scales down node group
```

### Configuration
```yaml
# HPA: Aggressive scale-up, conservative scale-down
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app
  minReplicas: 2
  maxReplicas: 100
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
      selectPolicy: Max
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
      selectPolicy: Min

# Cluster Autoscaler: Wait for HPA scale-down stabilization
command:
- --scale-down-delay-after-add=10m
- --scale-down-unneeded-time=10m
- --scale-down-utilization-threshold=0.5
```

## VPA + HPA Mutual Exclusion

### Rule: Never use VPA Auto + HPA on same metric
```yaml
# ❌ BAD: Both VPA and HPA control CPU
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: app
spec:
  metrics:
  - type: Resource
    resource:
      name: cpu      # HPA controls CPU
---
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: app
spec:
  updatePolicy:
    updateMode: "Auto"  # VPA also tries to control CPU
```

### Correct Combined Pattern
```yaml
# ✅ GOOD: VPA (Off) + HPA
# VPA provides recommendations only
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
    updateMode: "Off"
  resourcePolicy:
    containerPolicies:
    - containerName: "*"
      controlledResources: ["cpu", "memory"]

# HPA scales replicas based on custom metrics
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: app-hpa
spec:
  scaleTargetRef:
    apiVersion: "apps/v1"
    kind: Deployment
    name: app
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Pods
    pods:
      metric:
        name: requests_per_second
      target:
        type: AverageValue
        averageValue: 1000
```

## Keda + CA Interaction

### Keda Triggers CA
```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: kafka-consumer
spec:
  scaleTargetRef:
    name: kafka-consumer
  minReplicaCount: 1
  maxReplicaCount: 100         # High max for burst
  pollingInterval: 15
  cooldownPeriod: 120
  triggers:
  - type: kafka
    metadata:
      bootstrapServers: kafka:9092
      topic: orders
      consumerGroup: processor
      lagThreshold: "5"

# Combined with CA, the flow is:
# 1. Kafka messages spike → Keda scales to 30 pods
# 2. Pods start pending (only 10 nodes available)
# 3. CA scales up node group to fit new pods
# 4. Messages processed → Keda scales down
# 5. CA scales down node group
```

## Predictive Scaling

### Using Keda with Predictions
```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: predictive-worker
spec:
  scaleTargetRef:
    name: predictive-worker
  minReplicaCount: 2
  maxReplicaCount: 50
  triggers:
  - type: prometheus
    metadata:
      serverAddress: http://prometheus:9090
      metricName: predicted_demand
      threshold: "100"
      query: |
        # Use Prometheus to forecast demand
        predict_linear(
          rate(http_requests_total{job="api"}[1h]),
          3600,  # Predict 1 hour ahead
          0.1    # Confidence interval
        )
```

### Scheduled Pre-Scaling
```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: scheduled-worker
spec:
  scaleTargetRef:
    name: scheduled-worker
  minReplicaCount: 2
  maxReplicaCount: 50
  triggers:
  - type: cron
    metadata:
      timezone: America/New_York
      start: 0 6 * * *    # Pre-scale at 6 AM (before peak)
      end: 0 22 * * *     # Scale down at 10 PM (after peak)
      desiredReplicas: "20"
  - type: prometheus
    metadata:
      serverAddress: http://prometheus:9090
      metricName: cpu_usage
      threshold: "70"
      query: avg(rate(container_cpu_usage_seconds_total[5m]))
```

## Cost Optimization Strategy

### Tiered Node Groups
```yaml
# 1. Spot (cheapest, interruptible)
nodeGroups:
- name: spot-workers
  instanceDistribution:
    onDemandBaseCapacity: 0
    onDemandPercentageAboveBaseCapacity: 0
  spot: true
  minSize: 0
  maxSize: 100
  labels:
    tier: spot

# 2. On-Demand (reliable, moderate cost)
- name: on-demand-workers
  instanceType: c5.xlarge
  minSize: 2
  maxSize: 50
  labels:
    tier: on-demand

# 3. Reserved/Compute Savings (cheapest, steady)
- name: reserved-workers
  instanceType: m5.large
  minSize: 5
  maxSize: 10
  labels:
    tier: reserved

# Pod priority — prefer cheaper tiers
nodeSelector:
  tier: spot
tolerations:
- key: "spot"
  operator: "Exists"
  effect: "NoSchedule"
```

### Priority-Based Scaling
```yaml
# Priority expander: prefer spot, then on-demand, then reserved
command:
- ./cluster-autoscaler
- --expander=priority
- --expander-priority-config=priority-config
```

## Monitoring Strategy

### Key Metrics Dashboard
```
📊 Combined Autoscaling Dashboard

HPA:
  - Current/Max replicas per deployment
  - Current metric value vs target
  - Scaling events (up/down)

VPA:
  - Recommended CPU/memory per container
  - OOM events per container
  - Eviction rate

Keda:
  - Queue depths / metric values
  - ScaledObject status
  - Cooldown state

Cluster Autoscaler:
  - Node count per node group
  - Pending pods count
  - Scale-up/down events
```

### Alerting Rules
```yaml
# Prometheus alerting rules
groups:
- name: autoscaling
  rules:
  - alert: HPAMaxReplicasReached
    expr: kube_horizontalpodautoscaler_spec_max_replicas == kube_horizontalpodautoscaler_status_current_replicas
    for: 15m
    labels:
      severity: warning
    annotations:
      summary: "HPA at max replicas for 15 minutes"

  - alert: HPAStuck
    expr: rate(kube_horizontalpodautoscaler_status_current_replicas[10m]) == 0 and kube_horizontalpodautoscaler_spec_min_replicas < kube_horizontalpodautoscaler_spec_max_replicas
    for: 30m
    labels:
      severity: critical

  - alert: UnschedulablePods
    expr: cluster_autoscaler_unschedulable_pods_count > 0
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Pods pending due to insufficient cluster capacity"

  - alert: CAScaleUpFailed
    expr: increase(cluster_autoscaler_failed_scale_ups_total[15m]) > 0
    labels:
      severity: critical
```

## Strategy Selection Guide

| Workload Type | HPA | VPA | Keda | CA |
|--------------|-----|-----|------|----|
| Stateless web app | ✅ Required | Off mode | Optional | ✅ Required |
| Stateful database | ❌ | Auto/Initial | ❌ | Manual |
| Batch processing | ❌ | Off mode | ✅ Required | ✅ Required |
| Event-driven worker | Optional | Off mode | ✅ Required | ✅ Required |
| ML training jobs | ❌ | Initial | ❌ | ✅ |
| Cron jobs | Manual | Off mode | ✅ ScaledJob | ✅ |

## Best Practices

1. **Start simple**: HPA on CPU → Add custom metrics → Add Keda → Optimize behavior.
2. **VPA Off first**: Run for 2 weeks, review recommendations, update deployments.
3. **CA last**: Cluster Autoscaler should be the last scaling layer configured.
4. **Avoid conflicts**: Never use VPA Auto with HPA on CPU/memory.
5. **Test scaling**: Use load testing tools (k6, locust, hey) to validate scenarios.
6. **Set limits**: Always set maxReplicas on HPA and maxSize on CA.
7. **Monitor costs**: Tag nodes by lifecycle (spot, on-demand, reserved) for cost allocation.
8. **Pre-scale strategically**: Use Cron scalers for predictable traffic patterns.
9. **Stagger scale-down**: CA should wait for HPA/VPA stabilization before removing nodes.
10. **Document strategy**: Record which components handle which workloads and why.
