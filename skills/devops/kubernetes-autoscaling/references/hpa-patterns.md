# Horizontal Pod Autoscaler (HPA) Patterns

HPA (`autoscaling/v2`) scales the replica count of a Deployment, StatefulSet or any resource with a `scale` subresource, from resource, per-pod, object or external metrics. This file is a pattern catalog; the scaling algorithm is explained in `kubernetes-autoscaling-fundamentals.md`, event-driven scaling in `keda-scalers.md`.

## Base Manifest

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70      # percent of the pods' CPU *requests*
```

Utilization targets are relative to container `requests`; pods without requests for that resource make the metric unavailable. Requests must reflect real usage, which is what VPA recommendations help with. Setting requests equal to limits is a QoS decision (Guaranteed class), not an HPA requirement.

The remaining patterns show only the `spec` fields that change.

## Metric Patterns

Memory (only for workloads whose memory tracks load; many runtimes never release memory, so the HPA cannot scale down):

```yaml
  metrics:
  - type: Resource
    resource:
      name: memory
      target: {type: Utilization, averageUtilization: 75}
```

Per-container resource (ignores sidecars such as service-mesh proxies; GA since Kubernetes 1.30):

```yaml
  metrics:
  - type: ContainerResource
    containerResource:
      name: cpu
      container: app
      target: {type: Utilization, averageUtilization: 70}
```

Per-pod custom metric (served by an adapter at `custom.metrics.k8s.io`):

```yaml
  metrics:
  - type: Pods
    pods:
      metric: {name: http_requests_per_second}
      target: {type: AverageValue, averageValue: "100"}
```

Object metric (one value describing another object, e.g. an Ingress or Service):

```yaml
  metrics:
  - type: Object
    object:
      describedObject: {apiVersion: networking.k8s.io/v1, kind: Ingress, name: main}
      metric: {name: requests_per_second}
      target: {type: Value, value: "2k"}
```

External metric (queue depth from outside the cluster, via `external.metrics.k8s.io`):

```yaml
  metrics:
  - type: External
    external:
      metric:
        name: sqs_messages_visible
        selector: {matchLabels: {queue: orders}}
      target: {type: AverageValue, averageValue: "30"}   # per replica
```

`AverageValue` divides the metric by current replicas; `Value` compares the raw value. For queues, `AverageValue` (backlog per worker) is the usual choice. For queue-driven workloads, KEDA is often simpler than running a metrics adapter yourself.

With multiple metrics, HPA computes a desired count for each and uses the highest.

## Prometheus Adapter Rule

```yaml
rules:
- seriesQuery: 'http_requests_total{namespace!="",pod!=""}'
  resources:
    overrides:
      namespace: {resource: "namespace"}
      pod: {resource: "pod"}
  name:
    matches: "^(.*)_total$"
    as: "${1}_per_second"
  metricsQuery: 'sum(rate(<<.Series>>{<<.LabelMatchers>>}[2m])) by (<<.GroupBy>>)'
```

`seriesQuery` selects raw series (not a `rate()` expression); the rate belongs in `metricsQuery`.

## Behavior Patterns

Fast up, slow down (web services):

```yaml
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0
      selectPolicy: Max                 # pick the policy allowing the largest change
      policies:
      - {type: Percent, value: 100, periodSeconds: 15}
      - {type: Pods, value: 4, periodSeconds: 15}
    scaleDown:
      stabilizationWindowSeconds: 300   # use the highest recommendation of the last 5 min
      selectPolicy: Min                 # pick the policy allowing the smallest change
      policies:
      - {type: Percent, value: 10, periodSeconds: 60}
      - {type: Pods, value: 5, periodSeconds: 60}
```

Never scale down (manual or batch-controlled shrink):

```yaml
  behavior:
    scaleDown:
      selectPolicy: Disabled
```

Burst workloads with long startup (JVM, model loading): raise `scaleUp` limits and pre-scale with `minReplicas` via a scheduled change (or KEDA cron scaler) before known peaks, because HPA reacts only after load arrives.

## Interplay With Other Autoscalers

| Combination | Guidance |
|---|---|
| HPA + VPA on the same resource metric | Avoid; VPA changing requests shifts HPA's utilization baseline. Use VPA in `Off` (recommend-only) mode or scale HPA on custom metrics |
| HPA + Cluster Autoscaler/Karpenter | Expected pairing: HPA adds pods, node autoscaler adds nodes for Pending pods |
| HPA + KEDA | KEDA creates and manages its own HPA; do not also define an HPA for the same target |
| HPA + PodDisruptionBudget | PDB limits voluntary disruption, not HPA scale-down; keep `minReplicas` ≥ PDB `minAvailable` |

## Troubleshooting

```bash
kubectl describe hpa web                      # conditions, events, current vs target
kubectl get hpa web -o yaml                   # status.currentMetrics, conditions
kubectl top pods -l app=web                   # metrics-server data
kubectl get --raw /apis/metrics.k8s.io/v1beta1 | head
kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1" | head
kubectl get --raw "/apis/external.metrics.k8s.io/v1beta1" | head
```

| Condition / message | Meaning |
|---|---|
| `ScalingActive=False`, `FailedGetResourceMetric` | Metrics unavailable: metrics-server down, missing requests, pods not ready |
| `AbleToScale=False` | Cannot read/update the scale subresource |
| `ScalingLimited=True` | Desired count clamped by min/max or behavior policies |
| Targets show `<unknown>` | No metric data yet or adapter misconfigured |

## Checklist
- [ ] Requests set realistically on all containers involved in utilization metrics
- [ ] Metric reflects load (CPU, RPS, backlog), not a lagging signal
- [ ] `minReplicas` ≥ 2 for HA services and ≥ PDB requirements
- [ ] `maxReplicas` within cluster and quota capacity
- [ ] Behavior policies tuned: fast up, stabilized down
- [ ] No overlapping HPA/KEDA/VPA control of the same signal
- [ ] Load-tested scaling response before production
