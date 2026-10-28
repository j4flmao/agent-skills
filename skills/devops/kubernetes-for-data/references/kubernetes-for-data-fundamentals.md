# Kubernetes for Data Workloads: Fundamentals

How data workloads (batch ETL, Spark, Airflow, streaming, notebooks, model training) differ from stateless web services on Kubernetes, and the core primitives used to run them: Jobs, CronJobs, StatefulSets, operators, storage classes, resource management and scheduling.

## How Data Workloads Differ

| Aspect | Web services | Data workloads |
|--------|--------------|----------------|
| Lifetime | Long-running | Often run-to-completion |
| Resource shape | Small, steady | Large, bursty, sometimes GPUs |
| State | Externalized | Shuffle data, checkpoints, local scratch |
| Scheduling | Spread replicas | Gang scheduling, queues, fair share |
| Failure handling | Restart pod | Retry task/job, resume from checkpoint |
| Storage | Minimal | High-throughput object storage, local NVMe scratch |

## Core Primitives

| Primitive | Use |
|-----------|-----|
| `Job` | Run-to-completion batch task; retries via `backoffLimit` |
| Indexed `Job` | Parallel shards with stable index (`JOB_COMPLETION_INDEX`) |
| `CronJob` | Scheduled batch |
| `StatefulSet` | Stateful services with stable identity and PVCs (Kafka, ZooKeeper-free brokers, databases) |
| Operators (CRDs + controllers) | Domain-specific lifecycle: Spark, Flink, Kafka (Strimzi), Postgres (CloudNativePG), Ray (KubeRay) |
| `PersistentVolumeClaim` | Durable or scratch storage |
| `PriorityClass` | Preemption order between workloads |
| `ResourceQuota`, `LimitRange` | Per-namespace guardrails |

## Batch Job Example

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: daily-aggregate-2026-10-27
  namespace: data-batch
spec:
  backoffLimit: 3
  activeDeadlineSeconds: 7200
  ttlSecondsAfterFinished: 86400
  completions: 8
  parallelism: 8
  completionMode: Indexed
  template:
    spec:
      restartPolicy: Never
      serviceAccountName: batch-runner
      containers:
        - name: worker
          image: registry.example.com/etl/aggregate:1.8.2
          args: ["--shard=$(JOB_COMPLETION_INDEX)", "--shards=8", "--date=2026-10-27"]
          resources:
            requests: { cpu: "2", memory: 8Gi }
            limits: { memory: 8Gi }
          volumeMounts: [{ name: scratch, mountPath: /scratch }]
      volumes:
        - name: scratch
          ephemeral:
            volumeClaimTemplate:
              spec:
                accessModes: [ReadWriteOnce]
                storageClassName: local-nvme
                resources: { requests: { storage: 200Gi } }
```

- `ttlSecondsAfterFinished` cleans up finished jobs.
- `activeDeadlineSeconds` bounds runaway jobs.
- `podFailurePolicy` (stable since Kubernetes 1.31) can fail fast on non-retriable exit codes or ignore disruptions.
- Make the job idempotent: re-running a shard overwrites its output.

## Resources: Requests and Limits

- Requests drive scheduling; limits cap usage.
- Set memory request equal to memory limit for data jobs to avoid OOM kills from overcommitted nodes.
- CPU limits cause throttling; many teams set CPU requests but omit CPU limits for batch workloads, relying on requests for fair share.
- JVM workloads (Spark, Flink): set heap below the container limit to leave room for off-heap and overhead (Spark `memoryOverhead`).

## Storage for Data

| Need | Option |
|------|--------|
| Source/sink data | Object storage (S3/GCS/ADLS/MinIO), accessed via workload identity |
| Shuffle/spill scratch | Ephemeral volumes on local NVMe, `emptyDir` (optionally `medium: Memory` for small tmpfs) |
| Stateful services | PVCs with SSD storage classes, `WaitForFirstConsumer` binding |
| Shared files across pods | ReadWriteMany (NFS, CephFS, cloud file services); avoid for heavy throughput |

Avoid network block volumes for shuffle-heavy scratch; local disks are faster and cheaper.

## Access to Cloud Storage

Use workload identity rather than static keys:
- EKS: IAM Roles for Service Accounts or EKS Pod Identity.
- GKE: Workload Identity Federation for GKE.
- AKS: Microsoft Entra Workload ID.

## Scheduling Basics

- Node pools per workload class (CPU batch, memory-optimized, GPU, spot) selected via `nodeSelector`/affinity and taints/tolerations.
- `PriorityClass` so production pipelines can preempt ad hoc jobs.
- Gang scheduling (all-or-nothing pod groups) matters for Spark/Ray/MPI; the default scheduler does not provide it. Use Kueue, Volcano, YuniKorn or scheduler plugins (see `kubernetes-for-data-advanced.md`).

## Orchestration Layer

| Tool | Role on Kubernetes |
|------|--------------------|
| Airflow (KubernetesExecutor / KubernetesPodOperator) | Pipeline DAG orchestration, one pod per task |
| Argo Workflows | Kubernetes-native DAGs and steps |
| Dagster, Prefect | Asset/flow orchestration with Kubernetes run launchers |
| Spark Operator / spark-submit to K8s | Spark applications |
| Flink Kubernetes Operator | Streaming jobs with savepoints |
| KubeRay | Ray clusters and jobs |

## Observability Basics

- Logs from short-lived pods must be shipped before pods are deleted (cluster log agent).
- Metrics: job duration, success/failure counts (kube-state-metrics `kube_job_*`), resource usage vs requests.
- Engine UIs (Spark history server, Flink dashboard, Ray dashboard) exposed internally.

## Checklist

- [ ] Batch work as Jobs/operators with deadlines, retries, TTL cleanup
- [ ] Memory requests equal limits; JVM heap sized under limit
- [ ] Local NVMe scratch for shuffle/spill
- [ ] Workload identity for object storage
- [ ] Separate node pools and priority classes per workload type
- [ ] Gang-aware scheduler for multi-pod jobs
- [ ] Logs shipped before pod deletion
