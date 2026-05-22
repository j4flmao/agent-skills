# GPU & Storage for Kubernetes Data Workloads

## NVIDIA GPU Operator

### Installation

```bash
helm repo add nvidia https://helm.ngc.nvidia.com/nvidia
helm install gpu-operator nvidia/gpu-operator \
  --namespace gpu-operator \
  --create-namespace
```

Installs: NVIDIA device plugin, drivers (if needed), container runtime hook, MIG manager, and DCGM exporter for monitoring.

### GPU Node Configuration

```yaml
# Node taint for exclusive GPU access
taints:
  - key: nvidia.com/gpu
    value: "true"
    effect: NoSchedule

# Pod spec
resources:
  limits:
    nvidia.com/gpu: 1  # One GPU
```

### MIG (Multi-Instance GPU)
Partition A100/H100 into smaller GPU instances. Each MIG device appears as independent GPU.

```yaml
spec:
  mig:
    devices:
      - device: 0
        profiles:
          - 1g.10gb  # 1 compute instance, 10GB memory
          - 1g.10gb
          - 2g.20gb
```

## Volcano Batch Scheduling

### Installation

```bash
helm repo add volcano https://volcano-sh.github.io/helm-charts
helm install volcano volcano/volcano --namespace volcano-system
```

### Queue and PodGroup

```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: data-queue
spec:
  weight: 10
  capability:
    cpu: 200
    memory: 800Gi
---
apiVersion: scheduling.volcano.sh/v1beta1
kind: PodGroup
metadata:
  name: spark-executors
spec:
  minMember: 5
  queue: data-queue
```

Volcano features: gang scheduling, fair sharing, resource reservation, NUMA awareness.

## Karpenter for Data Workloads

### Installation

```bash
helm repo add karpenter https://charts.karpenter.sh
helm install karpenter karpenter/karpenter \
  --namespace karpenter \
  --create-namespace
```

### Provisioner Configuration

```yaml
apiVersion: karpenter.sh/v1alpha5
kind: Provisioner
metadata:
  name: data-workloads
spec:
  requirements:
    - key: karpenter.sh/capacity-type
      operator: In
      values: ["spot", "on-demand"]
    - key: node.kubernetes.io/instance-type
      operator: In
      values: ["c5.4xlarge", "c5.8xlarge", "r5.4xlarge"]
  limits:
    resources:
      cpu: 1000
  consolidation:
    enabled: true
  ttlSecondsAfterEmpty: 30
```

## Storage for Data Workloads

### CSI Drivers

```yaml
# EBS CSI driver
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: premium-ssd
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "16000"
  throughput: "1000"
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
```

### Local SSDs for Spark Shuffle

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: local-ssd
provisioner: kubernetes.io/no-provisioner
volumeBindingMode: WaitForFirstConsumer

---
# Local volume
apiVersion: v1
kind: PersistentVolume
metadata:
  name: local-ssd-node1
spec:
  capacity:
    storage: 1.5Ti
  volumeMode: Filesystem
  accessModes: ["ReadWriteOnce"]
  persistentVolumeReclaimPolicy: Delete
  local:
    path: /mnt/local-ssd
  nodeAffinity:
    required:
      nodeSelectorTerms:
        - matchExpressions:
            - key: kubernetes.io/hostname
              operator: In
              values: ["node-1"]
```

### PVC Patterns

```yaml
# Spark executor with local SSD for shuffle
spec:
  executor:
    volumes:
      - name: shuffle-storage
        persistentVolumeClaim:
          claimName: spark-shuffle-pvc
    volumeMounts:
      - name: shuffle-storage
        mountPath: /tmp/spark-shuffle
sparkConf:
  spark.local.dir: /tmp/spark-shuffle
  spark.shuffle.file.buffer: "64k"
  spark.shuffle.spill.compress: "true"
```

### Storage Comparison

| Type | Use Case | Performance | Durability |
|------|----------|-------------|------------|
| Local SSD | Spark shuffle, temp data | 100K+ IOPS | Ephemeral |
| EBS gp3 | Kafka brokers, DB | 16K IOPS, 1K MBps | Durable (replicated) |
| EBS io2 | High-perf DB | 256K IOPS | Durable (99.999%) |
| S3/EFS | Airflow DAGs, logs | Moderate | Durable (11 9's) |
