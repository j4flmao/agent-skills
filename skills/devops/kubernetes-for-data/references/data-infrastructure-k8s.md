# Data Infrastructure on Kubernetes

## Kafka on K8s (Strimzi)

```yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: Kafka
metadata:
  name: data-cluster
spec:
  kafka:
    version: 3.6.0
    replicas: 3
    config:
      offsets.topic.replication.factor: 3
      transaction.state.log.replication.factor: 3
      transaction.state.log.min.isr: 2
      default.replication.factor: 3
      min.insync.replicas: 2
      log.retention.hours: 168
      log.segment.bytes: 1073741824
    storage:
      type: jbod
      volumes:
      - id: 0
        type: persistent-claim
        size: 1Ti
        deleteClaim: false
        class: ssd
    resources:
      requests:
        memory: 8Gi
        cpu: 4
      limits:
        memory: 16Gi
        cpu: 8
  zookeeper:
    replicas: 3
    storage:
      type: persistent-claim
      size: 100Gi
      deleteClaim: false
      class: ssd
```

## Databases on K8s (Operators)

| Operator | Database | Storage | Backup | Production Readiness |
|----------|----------|---------|--------|---------------------|
| CloudNativePG | PostgreSQL | PVC + WAL | Barman + S3 | High |
| MySQL Operator (Oracle) | MySQL | PVC | mysqldump | High |
| MongoDB Community | MongoDB | PVC + Oplog | S3 snapshot | Medium |
| Strimzi | Kafka + ZooKeeper | JBOD PVC | MirrorMaker + S3 | High |
| Redis Operator | Redis | PVC | RDB/AOF to S3 | Medium |
| OpenSearch | Elasticsearch | PVC | Snapshot to S3 | High |

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: data-db
spec:
  instances: 3
  imageName: ghcr.io/cloudnative-pg/postgresql:16
  storage:
    size: 500Gi
    storageClass: ssd
  walStorage:
    size: 50Gi
    storageClass: ssd  
  backup:
    barmanObjectStore:
      destinationPath: s3://my-backup/db/
      s3Credentials:
        accessKeyId:
          name: aws-creds
          key: ACCESS_KEY_ID
        secretAccessKey:
          name: aws-creds
          key: ACCESS_SECRET_KEY
    retentionPolicy: "30d"
  resources:
    requests:
      memory: 8Gi
      cpu: 4
    limits:
      memory: 16Gi
      cpu: 8
```

## Object Store Integration

```yaml
# S3 CSI driver for data workloads
apiVersion: storage.k8s.io/v1
kind: CSIDriver
metadata:
  name: s3.csi.aws.com
spec:
  attachRequired: false
  podInfoOnMount: true
---
apiVersion: v1
kind: PersistentVolume
metadata:
  name: data-lake-pv
spec:
  accessModes:
  - ReadWriteMany
  capacity:
    storage: 1Pi  # Unlimited — S3-backed
  csi:
    driver: s3.csi.aws.com
    volumeHandle: data-lake
    volumeAttributes:
      bucket: my-data-lake
      server: https://s3.us-east-1.amazonaws.com
```

## Data Caching (Alluxio)

```yaml
apiVersion: alluxio.io/v1alpha1
kind: Dataset
metadata:
  name: data-cache
spec:
  mounts:
  - path: /data
    mountPoint: s3://my-data-lake/
    options:
      aws.accessKeyId: "..."
      aws.secretKey: "..."
  prefetch: true
  cacheSize: "500Gi"
  cachePolicy:
    lfu: {}  # Least Frequently Used eviction
```

## Node Pool Strategy

| Pool | Instance Type | Taint | Use Case |
|------|--------------|-------|----------|
| System | Standard (D-series) | none | K8s system components |
| Data-compute | Compute-optimized (C-series) | `workload=data:NoSchedule` | Spark/Flink executors |
| Data-storage | Storage-optimized (I-series) | `workload=data:NoSchedule` | Databases, Kafka |
| Data-gpu | GPU (P4, V100, A100) | `workload=gpu:NoSchedule` | Spark GPU, Ray |
| Spot | Any spot instance | `workload=spot:PreferNoSchedule` | Batch, CI/CD |

## Monitoring

| Component | Metrics | Dashboard |
|-----------|---------|-----------|
| Spark | Shuffle read/write, task duration, GC | Grafana Spark |
| Kafka | Lag, request rate, disk usage | Strimzi dashboard |
| Database | Query latency, connections, WAL rate | PG dashboard |
| Alluxio | Cache hit rate, throughput | Alluxio dashboard |
| PVC | IOPS, throughput, capacity | K8s dashboard |
