# Kubernetes Autoscaling Fundamentals: Layers, Metrics Pipeline and the HPA Algorithm

The autoscaling layers in Kubernetes, how metrics reach them, and the exact rules HPA uses to compute replicas. Configuration catalogs for each autoscaler live in the sibling files (`hpa-patterns.md`, `vpa-config.md`, `keda-scalers.md`, `cluster-autoscaler.md`).

## Layers

| Layer | Component | Adjusts | Trigger |
|---|---|---|---|
| Pod count | HorizontalPodAutoscaler (built in) | replicas | resource/custom/external metrics |
| Pod count, event-driven | KEDA | replicas, including 0 | event sources (queues, streams, cron, Prometheus) |
| Pod size | VerticalPodAutoscaler (add-on) | CPU/memory requests (and limits proportionally) | historical usage |
| Node count | Cluster Autoscaler or Karpenter | nodes | Pending (unschedulable) pods; underutilized nodes |
| Control-plane add-ons | cluster-proportional-autoscaler | replicas of DNS etc. | cluster size |

Typical stack: HPA or KEDA for workloads, VPA in recommendation mode to right-size requests, Karpenter or Cluster Autoscaler for nodes.

## Metrics Pipeline

```
kubelet (cAdvisor) --> metrics-server --> metrics.k8s.io           (CPU/memory; for HPA, VPA, kubectl top)
Prometheus --> prometheus-adapter --> custom.metrics.k8s.io / external.metrics.k8s.io
KEDA operator --> external.metrics.k8s.io (KEDA metrics server)
```

- Only one service can back each aggregated API (`custom.metrics.k8s.io`, `external.metrics.k8s.io`) at a time; KEDA and prometheus-adapter conflict on `external.metrics.k8s.io`.
- metrics-server keeps only recent samples (no history); VPA's recommender keeps its own histograms.

## HPA Algorithm

Every sync period (default 15 s, `--horizontal-pod-autoscaler-sync-period` on kube-controller-manager):

```
desiredReplicas = ceil( currentReplicas × currentMetricValue / desiredMetricValue )
```

Example: 4 replicas at 90 % average CPU with target 60 % → ceil(4 × 90 / 60) = 6.

Rules applied around the formula:
- Tolerance: no change if the ratio is within ±10 % of 1.0 (`--horizontal-pod-autoscaler-tolerance`, default 0.1). Kubernetes 1.33 added per-HPA tolerance in `spec.behavior.scaleUp/scaleDown.tolerance` as an alpha feature (`HPAConfigurableTolerance` gate); check its status for your version.
- Multiple metrics: compute desired replicas for each, take the maximum.
- Missing metrics: pods without metrics are assumed to use 100 % of target when scaling down and 0 % when scaling up (conservative in both directions).
- Not-ready / starting pods: for CPU, pods that are not yet ready or within the initial readiness window are ignored or treated conservatively (`--horizontal-pod-autoscaler-cpu-initialization-period` default 5 min, `--horizontal-pod-autoscaler-initial-readiness-delay` default 30 s).
- Clamp to `[minReplicas, maxReplicas]`, then apply `behavior` policies.

## Default Behavior

If `spec.behavior` is omitted:

| Direction | Stabilization window | Policies |
|---|---|---|
| Scale up | 0 s | max of 100 % or 4 pods per 15 s |
| Scale down | 300 s | 100 % per 15 s (bounded by stabilization) |

Stabilization: for scale-down, HPA uses the highest desired-replica recommendation seen during the window, preventing flapping.

## Requests Are the Foundation

- HPA utilization = usage / requests. Too-low requests make HPA scale out early; too-high make it react late and waste nodes.
- Cluster Autoscaler/Karpenter schedule by requests, not usage.
- VPA recommendations (or observed p90–p95 usage) are the input for setting requests.

## Node Autoscaling Basics

- Cluster Autoscaler: scales node groups (ASGs, MIGs, VMSS) when pods are Pending due to insufficient resources; scales down nodes whose pods fit elsewhere after a delay (`--scale-down-unneeded-time`, default 10 min).
- Karpenter: provisions right-sized nodes directly from pending pod requirements and consolidates underutilized nodes (`karpenter.sh/v1` NodePool API).
- Both respect PodDisruptionBudgets during scale-down/consolidation; pods with restrictive PDBs or `safe-to-evict: "false"` annotations block node removal.

## Reaction Time

```
load rises → metrics scraped (≈15–60 s) → HPA sync (≤15 s) → pod scheduled
  → if no capacity: node provisioned (~1–3 min typical in cloud) → image pull → app startup → readiness
```

Startup time of the app and image size often dominate. Mitigations: smaller images, image pre-pulling/caching, startup probes tuned, headroom via `minReplicas` or low-priority "pause" pods (overprovisioning) that get preempted.

## Choosing Signals

| Workload | Good signal |
|---|---|
| CPU-bound stateless API | CPU utilization or RPS per pod |
| I/O-bound API | RPS or in-flight requests per pod, latency SLO-based custom metric |
| Queue workers | Backlog per worker (KEDA) |
| Batch | Jobs per queue; scale to zero between runs |
| Memory-bound caches | Usually scale manually or vertically; memory rarely drops on scale-out |

## Checklist
- [ ] metrics-server installed and healthy; adapters do not conflict on aggregated APIs
- [ ] Requests set from observed usage
- [ ] Signal chosen per workload type
- [ ] Node autoscaler configured with PDB-aware scale-down
- [ ] End-to-end reaction time measured under a load test
