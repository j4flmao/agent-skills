# Kubernetes for Data Workloads: Advanced Scheduling, Multi-Tenancy, Autoscaling and Cost

Advanced patterns for platforms running many teams' data and ML jobs on shared clusters: batch queueing and gang scheduling with Kueue/Volcano/YuniKorn, quotas and fair sharing, node autoscaling with Karpenter or Cluster Autoscaler, spot strategies, Spark and Flink operator specifics, and cost attribution.

## Why the Default Scheduler Is Not Enough

The default scheduler places pods one at a time. Data jobs need:
- Gang scheduling: start all pods of a job or none, avoiding partial allocations that deadlock (two half-started Spark jobs each waiting for more executors).
- Queueing and admission: hold jobs until quota is available instead of creating pending pods that trigger runaway autoscaling.
- Fair sharing and borrowing between teams.

## Batch Schedulers

| Project | Model | Notes |
|---------|-------|-------|
| Kueue (Kubernetes SIG) | Admission controller over the default scheduler; ClusterQueues, LocalQueues, ResourceFlavors, cohorts for borrowing | Integrates with Job, JobSet, RayJob/RayCluster, Spark (via pod groups), Kubeflow trainers, plain pods |
| Volcano (CNCF) | Replacement scheduler with PodGroups, queues, gang scheduling | Popular for Spark/MPI/AI |
| Apache YuniKorn | Scheduler with hierarchical queues, gang scheduling | Common with Spark on K8s |

Kueue example:

```yaml
apiVersion: kueue.x-k8s.io/v1beta1
kind: ResourceFlavor
metadata: { name: spot-cpu }
spec:
  nodeLabels: { karpenter.sh/capacity-type: spot }
---
apiVersion: kueue.x-k8s.io/v1beta1
kind: ClusterQueue
metadata: { name: analytics }
spec:
  cohort: data-platform
  namespaceSelector: {}
  resourceGroups:
    - coveredResources: ["cpu", "memory"]
      flavors:
        - name: spot-cpu
          resources:
            - { name: cpu, nominalQuota: 400, borrowingLimit: 200 }
            - { name: memory, nominalQuota: 1600Gi, borrowingLimit: 800Gi }
  preemption:
    reclaimWithinCohort: Any
    withinClusterQueue: LowerPriority
---
apiVersion: kueue.x-k8s.io/v1beta1
kind: LocalQueue
metadata: { name: team-a, namespace: team-a }
spec: { clusterQueue: analytics }
```

Jobs opt in with the label `kueue.x-k8s.io/queue-name: team-a` (and are created suspended until admitted). Check the API version for your Kueue release.

## Multi-Tenancy

| Control | Purpose |
|---------|---------|
| Namespace per team/environment | Isolation boundary for RBAC, quotas, network policies |
| `ResourceQuota` + queue quotas | Caps on aggregate consumption |
| `LimitRange` | Defaults so pods without requests do not run unbounded |
| NetworkPolicies | Restrict access to data stores and between teams |
| Pod Security Admission (`restricted`) | Non-root, no privilege escalation |
| Separate service accounts with workload identity | Per-team data access |

## Node Autoscaling

| Tool | Approach |
|------|----------|
| Cluster Autoscaler | Scales predefined node groups |
| Karpenter (AWS GA, Azure via AKS node autoprovisioning) | Provisions right-sized nodes per pending pod requirements; consolidation |

Karpenter NodePool (v1 API):

```yaml
apiVersion: karpenter.sh/v1
kind: NodePool
metadata: { name: batch-spot }
spec:
  template:
    spec:
      requirements:
        - { key: karpenter.sh/capacity-type, operator: In, values: [spot] }
        - { key: kubernetes.io/arch, operator: In, values: [amd64, arm64] }
        - { key: karpenter.k8s.aws/instance-category, operator: In, values: [c, m, r] }
      taints:
        - { key: workload, value: batch, effect: NoSchedule }
      nodeClassRef: { group: karpenter.k8s.aws, kind: EC2NodeClass, name: batch }
  limits: { cpu: "2000" }
  disruption:
    consolidationPolicy: WhenEmptyOrUnderutilized
    consolidateAfter: 5m
```

Long-running batch pods can be protected from voluntary consolidation with the annotation `karpenter.sh/do-not-disrupt: "true"`.

Interaction with queueing: with Kueue admission, only admitted jobs create pods, so autoscalers scale for work that is allowed to run.

## Spot Strategy

- Diversify instance types and zones to reduce simultaneous interruptions.
- Keep drivers, coordinators, Airflow schedulers, Flink JobManagers on on-demand nodes.
- Use frameworks' resilience: Spark executor decommissioning, remote shuffle services, Flink checkpoints, Ray task retries.
- Handle interruption notices (AWS Node Termination Handler or Karpenter's native interruption handling).

## Spark on Kubernetes

- Submit via the Kubeflow Spark Operator (`SparkApplication` CRD) or `spark-submit --master k8s://...`.
- Enable dynamic allocation with shuffle tracking (`spark.dynamicAllocation.shuffleTracking.enabled=true`) or a remote shuffle service.
- Pod templates for tolerations, node selectors, sidecars.
- Executor local dirs on NVMe-backed volumes (`spark.kubernetes.executor.volumes...` with names prefixed `spark-local-dir-`).
- Run a Spark History Server reading event logs from object storage.

## Flink on Kubernetes

- Flink Kubernetes Operator `FlinkDeployment` (application mode) with checkpoints/savepoints in object storage.
- Upgrade mode `savepoint` or `last-state` for stateful upgrades.
- Kubernetes HA services for JobManager leader election.
- Autoscaler in the operator can tune parallelism based on backlog/throughput.

## GPU Workloads

- NVIDIA GPU Operator for drivers, device plugin, DCGM exporter.
- Time-slicing or MIG to share GPUs for small jobs; whole GPUs for training.
- Dynamic Resource Allocation (DRA) is maturing for more flexible device requests; check your Kubernetes version and driver support.
- See `gpu-computing.md` and `gpu-storage-k8s.md` for depth.

## Cost Attribution

- Label every workload with `team`, `pipeline`, `cost-center`; enforce with admission policy (Kyverno/Gatekeeper).
- Use OpenCost/Kubecost or cloud cost allocation to report cost per namespace/label.
- Track request vs actual usage; oversized requests waste nodes.
- Report cost per pipeline run and per TB processed to owners.

## Reliability

- PodDisruptionBudgets for stateful services (Kafka, databases), not for batch executors.
- Priority classes: system > streaming > scheduled batch > ad hoc.
- Separate clusters or node pools for latency-sensitive streaming vs bursty batch to avoid noisy neighbors.

## Checklist

- [ ] Queue/admission (Kueue/Volcano/YuniKorn) with gang semantics
- [ ] Team quotas with borrowing and preemption rules
- [ ] Autoscaler tied to admitted work; limits on node pools
- [ ] Spot for workers, on-demand for coordinators
- [ ] Spark/Flink configured for preemption resilience
- [ ] Mandatory cost labels and per-team cost reports
- [ ] Priority classes and isolation between streaming and batch
