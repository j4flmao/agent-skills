---
name: devops-kubernetes-for-data
description: >
  Use this skill when running data workloads on Kubernetes: Spark on K8s, Airflow on K8s, Kafka on K8s, Strimzi, Spark Operator, Volcano, GPU scheduling, node pools, Karpenter, CSI storage for data workloads.
  This skill enforces: resource management for Spark executors, GPU scheduling config, node pool design, storage class selection, operator configuration.
  Do NOT use for: general Kubernetes (use kubernetes-patterns), data pipeline design (use etl-pipeline), Kafka topic design (use streaming).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, kubernetes, data, phase-11]
---

# Kubernetes for Data Agent

## Purpose
Configures Kubernetes for data-intensive workloads: Spark, Airflow, Kafka, with GPU scheduling, node pools, and storage optimization.

## Agent Protocol

### Trigger
User request includes: Kubernetes for data, Spark on K8s, Airflow on K8s, Kafka on K8s, Strimzi, Spark Operator, Volcano, GPU scheduling, node pools, data workloads K8s, Karpenter.

### Protocol
1. Identify data workload types (Spark, Airflow, Kafka, batch).
2. Select operators (Spark Operator, Strimzi, Airflow Helm chart).
3. Design node pools for workload isolation.
4. Configure resource requests/limits for executors.
5. Set up GPU scheduling if needed.
6. Choose storage class and CSI driver.
7. Configure Karpenter or autoscaler for elasticity.

## Output
Kubernetes configuration for data workloads with Spark/Airflow/Kafka setup, GPU strategy, storage plan.

### Response Format
```
## Data Workloads on Kubernetes
### Workload Configuration
Spark Operator: {enabled/disabled} | Version: {N}
Airflow Executor: {KubernetesExecutor / CelacyKubernetesExecutor}
Kafka Operator: {Strimzi / custom}

### Node Pools
- compute-spot: {instance type} | {min-max} nodes | {spot/on-demand}
- compute-gpu: {instance type} | {GPU count} | {min-max} nodes
- storage-optimized: {instance type} | local SSD: {N GB}

### Resource Management
Spark Driver: {CPU: N, memory: N, memoryOverhead: N}
Spark Executor: {CPU: N, memory: N, instances: N}
Airflow Worker: {CPU: N, memory: N}
Kafka Broker: {CPU: N, memory: N, storage: N GB}

### GPU Scheduling
Runtime: {nvidia/cuda}
Node Selector: {node label}
Volcano Queue: {name}

### Storage
Spark Shuffle: {local SSD / PVC / emptyDir}
Kafka: {CSI driver} | {storage class} | {replication}
Airflow Logs: {S3/GCS/EFS}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Node pools designed for workload isolation and cost optimization.
- [ ] Spark resource configuration matches workload profile.
- [ ] GPU operator installed and configured for ML workloads.
- [ ] Storage class selected with performance characteristics documented.
- [ ] Autoscaler configured for compute elasticity.
- [ ] Pod priority and preemption configured for critical workloads.
- [ ] Network policies for inter-service communication.

## Workflow

### Step 1: Operator Selection
- **Spark Operator**: Kubernetes operator for Apache Spark. Handles driver/executor lifecycle, resource management, dynamic allocation.
- **Strimzi**: Kafka operator. Manages Kafka clusters, topics, users, and MirrorMaker.
- **Airflow**: Official Helm chart. Use KubernetesExecutor for per-task pods or CeleryKubernetesExecutor for hybrid.

### Step 2: Node Pool Design
- **compute-spot**: Spot instances for Spark executors and Airflow workers. Cost-effective. Use nodeSelector for scheduling.
- **compute-gpu**: GPU-enabled instances for ML training. taint for exclusive access.
- **storage-optimized**: Local SSD or high-throughput instances for Kafka brokers.
- **system**: General purpose for operators, control plane components.

### Step 3: Spark Resource Sizing
Driver: 1 CPU, 4GB memory, 512MB overhead. Executors: right-size based on data volume. Dynamic allocation with min/max bounds. Use nodeSelector for spot pool. Local SSD for shuffle.

### Step 4: GPU Scheduling
Install NVIDIA GPU Operator. Define GPU-enabled node pool with taint. Use Volcano for batch GPU scheduling with queue management. Set GPU memory and count in pod spec.

```yaml
# GPU pod spec
resources:
  limits:
    nvidia.com/gpu: 1
```

### Step 5: Storage Configuration
- **Local SSDs**: Spark shuffle, temporary data. Use local volume static provisioner.
- **PVC with CSI**: Kafka persistent storage. EBS gp3 or equivalent.
- **Object store**: Airflow logs, Spark event logs. S3/GCS via FUSE or SDK.
- **Shared filesystem**: Airflow DAGs. NFS or EFS.

### Step 6: Karpenter for Elasticity
Configure Karpenter provisioners per workload type. Set consolidation for cost. TTL for empty nodes. Node template with AMI, security group, subnet.

### Step 7: Resource Management
Set resource quotas per namespace. Use priority classes for critical vs. best-effort. Configure horizontal pod autoscaler for streaming workloads. Use vertical pod autoscaler for Spark executors.

## Rules
- Never run Spark executors on the same node as the driver.
- GPU nodes must be tainted to prevent non-GPU workloads.
- Kafka brokers require dedicated nodes — no colocation.
- Local SSDs are ephemeral — use replication for durability.
- Spot nodes must have `cluster-autoscaler.kubernetes.io/safe-to-evict: "true"`.
- Always set resource requests equal to limits for data workloads.
- Prefer Karpenter over cluster-autoscaler for data workloads.

## References
- `references/data-workloads-k8s.md` — Spark Operator, Airflow K8sExecutor/KubernetesPodOperator, Kafka Strimzi, resource sizing
- `references/gpu-storage-k8s.md` — NVIDIA GPU Operator, Volcano batch scheduling, Karpenter, CSI storage, local SSDs, PVC patterns

## Handoff
For data pipeline orchestration, hand off to `etl-pipeline`. For streaming infrastructure, hand off to `streaming`.
