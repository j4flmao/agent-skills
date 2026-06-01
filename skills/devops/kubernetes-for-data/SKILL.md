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

```yaml
apiVersion: sparkoperator.k8s.io/v1beta2
kind: SparkApplication
metadata:
  name: spark-etl
spec:
  type: Scala
  mode: cluster
  image: gcr.io/spark-operator/spark:v3.5.0
  imagePullPolicy: Always
  mainClass: com.example.ETLJob
  mainApplicationFile: local:///opt/spark/jobs/etl.jar
  sparkVersion: "3.5.0"
  restartPolicy:
    type: Never
  driver:
    cores: 1
    coreLimit: "1200m"
    memory: "4g"
    serviceAccount: spark
    labels:
      version: 3.5.0
    tolerations:
    - key: workload-type
      operator: Equal
      value: data
      effect: NoSchedule
  executor:
    instances: 10
    cores: 2
    coreLimit: "2200m"
    memory: "8g"
    memoryOverhead: "2g"
    labels:
      version: 3.5.0
    tolerations:
    - key: workload-type
      operator: Equal
      value: spark
      effect: NoSchedule
  dynamicAllocation:
    enabled: true
    initialExecutors: 5
    minExecutors: 1
    maxExecutors: 50
  sparkConf:
    spark.shuffle.service.enabled: "false"
    spark.dynamicAllocation.enabled: "true"
    spark.kubernetes.allocation.driver.requests.cores: "1"
    spark.kubernetes.allocation.executor.requests.cores: "2"
    spark.sql.adaptive.enabled: "true"
    spark.sql.adaptive.coalescePartitions.enabled: "true"
```

### Step 4: GPU Scheduling
Install NVIDIA GPU Operator. Define GPU-enabled node pool with taint. Use Volcano for batch GPU scheduling with queue management. Set GPU memory and count in pod spec.

```yaml
# GPU pod spec
resources:
  limits:
    nvidia.com/gpu: 1
```

```yaml
# Volcano GPU job with queue management
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: gpu-training
spec:
  queue: gpu-queue
  minAvailable: 2
  schedulerName: volcano
  tasks:
  - replicas: 4
    name: trainer
    template:
      spec:
        containers:
        - name: trainer
          image: pytorch/pytorch:2.1.0-cuda12.1
          command: ["python", "train.py"]
          resources:
            requests:
              cpu: "8"
              memory: "32Gi"
              nvidia.com/gpu: 1
            limits:
              cpu: "8"
              memory: "32Gi"
              nvidia.com/gpu: 1
        tolerations:
        - key: nvidia.com/gpu
          operator: Exists
          effect: NoSchedule
```

### Step 5: Storage Configuration
- **Local SSDs**: Spark shuffle, temporary data. Use local volume static provisioner.
- **PVC with CSI**: Kafka persistent storage. EBS gp3 or equivalent.
- **Object store**: Airflow logs, Spark event logs. S3/GCS via FUSE or SDK.
- **Shared filesystem**: Airflow DAGs. NFS or EFS.

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: kafka-ssd
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
  encrypted: "true"
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: kafka-data
  labels:
    app: kafka
spec:
  accessModes:
  - ReadWriteOnce
  storageClassName: kafka-ssd
  resources:
    requests:
      storage: 500Gi
```

### Step 6: Karpenter for Elasticity
Configure Karpenter provisioners per workload type. Set consolidation for cost. TTL for empty nodes. Node template with AMI, security group, subnet.

```yaml
apiVersion: karpenter.sh/v1beta1
kind: NodePool
metadata:
  name: spark-executor
spec:
  template:
    spec:
      requirements:
      - key: kubernetes.io/arch
        operator: In
        values: ["amd64"]
      - key: karpenter.sh/capacity-type
        operator: In
        values: ["spot"]
      - key: node.kubernetes.io/instance-type
        operator: In
        values: ["c5.4xlarge", "c5.8xlarge", "m5.4xlarge"]
      - key: karpenter.k8s.aws/instance-family
        operator: In
        values: ["c5", "c6i", "m5", "m6i"]
      nodeClassRef:
        name: spark-executor-class
      taints:
      - key: workload-type
        value: spark
        effect: NoSchedule
  limits:
    cpu: 4000
    memory: 16000Gi
  disruption:
    consolidationPolicy: WhenUnderutilized
    expireAfter: 168h
---
apiVersion: karpenter.k8s.aws/v1beta1
kind: EC2NodeClass
metadata:
  name: spark-executor-class
spec:
  amiFamily: Bottlerocket
  role: KarpenterNodeRole
  subnetSelector:
    karpenter.sh/discovery: data-cluster
  securityGroupSelector:
    karpenter.sh/discovery: data-cluster
  tags:
    Environment: production
    WorkloadType: spark
  blockDeviceMappings:
  - deviceName: /dev/xvda
    ebs:
      volumeSize: 100Gi
      volumeType: gp3
```

### Step 7: Strimzi Kafka Cluster Config
```yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: Kafka
metadata:
  name: data-cluster
spec:
  kafka:
    version: 3.7.0
    replicas: 3
    listeners:
    - name: plain
      port: 9092
      type: internal
      tls: false
    - name: tls
      port: 9093
      type: internal
      tls: true
    authorization:
      type: simple
    config:
      offsets.topic.replication.factor: 3
      transaction.state.log.replication.factor: 3
      transaction.state.log.min.isr: 2
      default.replication.factor: 3
      min.insync.replicas: 2
      log.retention.hours: 168
      log.segment.bytes: "1073741824"
      log.retention.bytes: "-1"
    storage:
      type: jbod
      volumes:
      - id: 0
        type: persistent-claim
        size: 500Gi
        deleteClaim: false
        class: kafka-ssd
    rack:
      topologyKey: topology.kubernetes.io/zone
    template:
      pod:
        affinity:
          podAntiAffinity:
            requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchExpressions:
                - key: app.kubernetes.io/name
                  operator: In
                  values:
                  - kafka-cluster
              topologyKey: kubernetes.io/hostname
        tolerations:
        - key: workload-type
          operator: Equal
          value: kafka
          effect: NoSchedule
  zookeeper:
    replicas: 3
    storage:
      type: persistent-claim
      size: 50Gi
      class: kafka-ssd
    template:
      pod:
        affinity:
          podAntiAffinity:
            requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchExpressions:
                - key: app.kubernetes.io/name
                  operator: In
                  values:
                  - kafka-zookeeper
              topologyKey: kubernetes.io/hostname
  entityOperator:
    topicOperator: {}
    userOperator: {}
```

### Step 8: Airflow on Kubernetes with KubernetesExecutor
```yaml
# values.yaml for airflow Helm chart
config:
  core:
    executor: KubernetesExecutor
    load_examples: "False"
  kubernetes_executor:
    worker_container_repository: apache/airflow
    worker_container_tag: 2.9.0
    namespace: airflow
    delete_worker_pods: true
    worker_pods_creation_batch_size: "10"
    worker_pods_pending_timeout: "300"
    kube_image_pull_policy: IfNotPresent
    dags_in_image: "False"
  logging:
    remote_logging: "True"
    remote_task_handler_args:
      s3_log_server: "True"
      s3_bucket: airflow-logs-prod
      s3_region: us-east-1
      s3_url: https://s3.us-east-1.amazonaws.com

executor: KubernetesExecutor
logs:
  persistence:
    enabled: false  # Use S3/GCS instead

dags:
  persistence:
    enabled: true
    storageAccessMode: ReadWriteMany
    size: 10Gi
  gitSync:
    enabled: true
    repo: https://github.com/org/airflow-dags.git
    branch: main
    subPath: dags
    wait: 60
    maxFailures: 5

workers:
  replicas: 0  # K8sExecutor creates pods dynamically
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 2
      memory: 4Gi
```

### Step 9: Resource Management and Priority
```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: data-critical
value: 1000000
globalDefault: false
description: "Critical data pipeline tasks"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: data-best-effort
value: 1000
globalDefault: false
description: "Best-effort Spark executors"
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: data-quota
  namespace: data
spec:
  hard:
    requests.cpu: "200"
    requests.memory: "800Gi"
    requests.nvidia.com/gpu: 16
    persistentvolumeclaims: 50
    count/priorityclasses.scheduling.k8s.io/data-critical: "4"
```

### Step 10: Network Policies for Data Workloads
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: kafka-ingress
  namespace: kafka
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: kafka-cluster
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: spark
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: airflow
    ports:
    - protocol: TCP
      port: 9092
    - protocol: TCP
      port: 9093
```

### Step 11: Data Locality with Node Tuning Operator
```yaml
apiVersion: tuned.openshift.io/v1
kind: Tuned
metadata:
  name: data-workloads
spec:
  profile:
  - data: |
      [sysctl]
      vm.swappiness = 1
      vm.dirty_ratio = 40
      vm.dirty_background_ratio = 10
      net.core.rmem_max = 134217728
      net.core.wmem_max = 134217728
      net.ipv4.tcp_rmem = 4096 87380 134217728
      net.ipv4.tcp_wmem = 4096 65536 134217728
    name: data-workloads
  recommend:
  - match:
    - label: tuned.openshift.io/data
      value: "true"
    priority: 10
    profile: data-workloads
```

## Rules
- Never run Spark executors on the same node as the driver.
- GPU nodes must be tainted to prevent non-GPU workloads.
- Kafka brokers require dedicated nodes — no colocation.
- Local SSDs are ephemeral — use replication for durability.
- Spot nodes must have `cluster-autoscaler.kubernetes.io/safe-to-evict: "true"`.
- Always set resource requests equal to limits for data workloads.
- Prefer Karpenter over cluster-autoscaler for data workloads.
- Use podAntiAffinity for Kafka brokers to spread across AZs.
- Set Spark dynamic allocation bounds to prevent resource exhaustion.
- Always configure pod priority for data workloads to ensure preemption order.
- Use topology spread constraints for rack-aware Kafka placement.
- Enable volumeBindingMode: WaitForFirstConsumer for data PVCs.

## Decision Tree: Storage Selection
- Data that needs to survive node failure (Kafka logs, DB) → PVC with CSI + replication
- Temporary shuffle data (Spark shuffle) → Local SSD or emptyDir with memory limit
- Artifacts and logs (Spark event logs, Airflow logs) → S3/GCS object store
- DAGs and config files (Airflow DAGs) → Shared filesystem (NFS/EFS) or GitSync
- ML model artifacts → Object store (S3/GCS) with versioning

## Production Considerations
- Enable rack awareness for Kafka to spread replica leaders across racks.
- Use pod topology spread constraints for even workload distribution.
- Configure Spark dynamic allocation with reasonable bounds to avoid cluster saturation.
- Set memoryOverhead for Spark executors to account for off-heap memory.
- Taint GPU nodes and use tolerations to ensure only GPU workloads land there.
- Enable consolidation on Karpenter for cost optimization of spot instances.
- Use pod priority and preemption for critical data pipelines.
- Set resource quotas per namespace per workload type.
- Monitor Spark executors for shuffle spill to disk (indicates memory pressure).
- For Airflow, prefer GitSync over DAG image embedding for faster iteration.
- Use Prometheus + Grafana dashboards for Spark executor resource utilization.

## Anti-Patterns
- Running Spark driver and executor on same node — single point of failure.
- No GPU taint — non-GPU pods occupy expensive GPU nodes.
- Kafka brokers with emptyDir storage — data loss on node failure.
- Using default storage class without performance testing for Kafka.
- Unlimited Spark dynamic allocation — can exhaust cluster resources.
- No pod disruption budgets — all executors can be evicted simultaneously.
- Over-allocating executor memory without monitoring actual usage.
- Mixing Spark executors and Kafka brokers on same nodes — resource contention.
- Not setting memoryOverhead for Spark executors — OOM kills from off-heap.
- Using suboptimal instance types for data workloads (burstable t-series).

## Troubleshooting
- Spark executors OOM: increase memoryOverhead, check shuffle spill metrics.
- Kafka broker slow: check disk IOPS/throughput, verify JBOD config, check ISR count.
- GPU not detected: verify NVIDIA drivers, check nvidia-device-plugin pod logs.
- Airflow tasks pending: check KubernetesExecutor config, verify node availability.
- Karpenter not provisioning: check EC2NodeClass selectors, verify IAM role.
- Spark dynamic allocation not scaling: check `spark.dynamicAllocation.enabled`, verify shuffle service.
- Strimzi cluster not stabilizing: check ZooKeeper quorum, verify storage class.

## References
  - references/data-infrastructure-k8s.md — Data Infrastructure on Kubernetes
  - references/data-processing-k8s.md — Data Processing on Kubernetes
  - references/data-workloads-k8s.md — Data Workloads on Kubernetes
  - references/gpu-storage-k8s.md — GPU & Storage for Kubernetes Data Workloads
  - references/kubernetes-for-data-advanced.md — Kubernetes For Data Advanced Topics
  - references/kubernetes-for-data-fundamentals.md — Kubernetes For Data Fundamentals
## Handoff
For data pipeline orchestration, hand off to `etl-pipeline`. For streaming infrastructure, hand off to `streaming`.
