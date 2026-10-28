# Advanced Kubernetes Autoscaling: In-Place Resize, Karpenter Consolidation, Scale-to-Zero and Coordination

Production topics beyond basic HPA/VPA: in-place pod resource resize, VPA modes that use it, Karpenter disruption controls, scale-to-zero, predictive pre-scaling, and avoiding fights between autoscalers.

## In-Place Pod Resize

CPU and memory requests/limits of running pods are mutable through the `resize` subresource: alpha in 1.27, beta in 1.33, GA in Kubernetes 1.35. Containers can be resized without restart, depending on their `resizePolicy`.

```yaml
spec:
  containers:
  - name: app
    image: registry.example.com/app:1.8.2
    resources:
      requests: {cpu: "500m", memory: "512Mi"}
      limits:   {memory: "1Gi"}
    resizePolicy:
    - resourceName: cpu
      restartPolicy: NotRequired
    - resourceName: memory
      restartPolicy: RestartContainer     # e.g. JVMs that size heap at startup
```

```bash
kubectl patch pod app-7d9f --subresource resize --patch \
  '{"spec":{"containers":[{"name":"app","resources":{"requests":{"cpu":"1"}}}]}}'
kubectl get pod app-7d9f -o jsonpath='{.status.containerStatuses[0].resources}'
```

Notes:
- If the node lacks capacity, the resize is deferred or infeasible (pod conditions `PodResizePending` / `PodResizeInProgress`); it does not move the pod.
- Memory limit decreases are allowed in 1.35 on a best-effort basis (only when current usage is below the new limit).
- Pod-level (rather than container-level) resource resize is a separate, newer feature (alpha in 1.35).
- Runtimes that size internal pools at startup (JVM heap, worker counts) may not benefit without restart.

## VPA Update Modes

| Mode | Behavior |
|---|---|
| `Off` | Recommendations only (status) — safe default alongside HPA |
| `Initial` | Apply at pod creation only |
| `Recreate` | Evict pods to apply new requests |
| `InPlaceOrRecreate` | Resize in place when possible, fall back to eviction (beta in recent VPA releases; requires cluster support for in-place resize) |
| `Auto` | Historically equivalent to `Recreate`; check your VPA version's semantics |

Bound recommendations with `resourcePolicy.containerPolicies[].minAllowed/maxAllowed` and `controlledValues: RequestsOnly` when limits should stay fixed.

## HPA and VPA Together

Conflict: VPA raises requests → HPA utilization drops → HPA scales in → per-pod usage rises → VPA raises requests again.

Safe combinations:
- HPA on custom/external metrics (RPS, backlog) + VPA on CPU/memory.
- HPA on CPU + VPA in `Off` mode, with periodic manual application of recommendations.
- VPA controlling memory only (`controlledResources: ["memory"]`) + HPA on CPU.

## Karpenter Disruption Controls (`karpenter.sh/v1`)

```yaml
apiVersion: karpenter.sh/v1
kind: NodePool
metadata:
  name: general
spec:
  template:
    spec:
      nodeClassRef: {group: karpenter.k8s.aws, kind: EC2NodeClass, name: default}
      requirements:
      - {key: karpenter.sh/capacity-type, operator: In, values: ["spot", "on-demand"]}
      - {key: kubernetes.io/arch, operator: In, values: ["amd64", "arm64"]}
      expireAfter: 720h                      # rotate nodes (AMI/security patches)
  disruption:
    consolidationPolicy: WhenEmptyOrUnderutilized
    consolidateAfter: 2m
    budgets:
    - nodes: "10%"                           # at most 10% of nodes disrupted at once
    - nodes: "0"                             # freeze during business peak
      schedule: "0 9 * * mon-fri"
      duration: 8h
      reasons: ["Underutilized"]
  limits:
    cpu: "2000"
```

Workload-side controls: PodDisruptionBudgets, `karpenter.sh/do-not-disrupt: "true"` on pods that must not be moved (long batch jobs), topology spread constraints to keep replicas across zones.

## Scale to Zero

| Option | Notes |
|---|---|
| KEDA (`minReplicaCount: 0`) | Activation from event source; KEDA scales 0↔1 itself, HPA handles 1↔N |
| HPA `minReplicas: 0` | Requires the `HPAScaleToZero` feature gate (alpha) and object/external metrics |
| Knative Serving | Request-driven scale to zero with activator buffering requests |

Cold start becomes user-visible latency: acceptable for async workers, rarely for synchronous APIs.

## Predictive and Scheduled Scaling

HPA is reactive. For known patterns:
- KEDA cron scaler to raise minimum replicas before daily peaks.
- A CronJob or GitOps change that adjusts `minReplicas` for events (sales, launches).
- Overprovisioning: low-priority "pause" pods reserve node headroom; real pods preempt them, and the node autoscaler replaces the headroom in the background.

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata: {name: overprovisioning}
value: -10
preemptionPolicy: Never
globalDefault: false
```

## Multi-Signal and SLO-Based Scaling

- Scale on a latency-derived metric only when it is not saturated by downstream bottlenecks (adding pods will not fix a slow database).
- Combine a fast signal (in-flight requests) with a capacity signal (CPU); HPA takes the max of both.
- Guard with `maxReplicas` sized to downstream capacity (database connections, rate limits).

## Observability for Autoscaling

| Metric | Source |
|---|---|
| Desired vs current replicas, scaling events | kube-state-metrics (`kube_horizontalpodautoscaler_status_desired_replicas`), events |
| Pending pod duration | scheduler metrics / kube-state-metrics |
| Node provisioning latency, consolidation actions | Karpenter / Cluster Autoscaler metrics |
| VPA recommendation vs requests | VPA status, kube-state-metrics custom resource config |
| Cost per workload | OpenCost/Kubecost |

Alert on HPA at `maxReplicas` for sustained periods, pods Pending > N minutes, and repeated scale up/down oscillation.

## Pitfalls
- VPA and HPA both acting on CPU.
- Aggressive consolidation evicting pods with long warmup during peak; use disruption budgets with schedules.
- Scale-to-zero for latency-sensitive APIs.
- `maxReplicas` above what downstream dependencies can serve.
- Assuming in-place resize will find capacity; it does not reschedule.

## Checklist
- [ ] Cluster version and feature status checked for in-place resize and VPA mode
- [ ] HPA/VPA signals non-overlapping
- [ ] Karpenter NodePool disruption budgets and `expireAfter` set
- [ ] Scale-to-zero only for tolerant workloads
- [ ] Known peaks pre-scaled; overprovisioning for burst headroom
- [ ] Autoscaling behavior dashboards and alerts in place
