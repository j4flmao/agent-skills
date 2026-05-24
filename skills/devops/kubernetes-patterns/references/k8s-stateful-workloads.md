# Kubernetes Stateful Workloads

## StatefulSets

| Feature | Deployment | StatefulSet |
|---------|-----------|-------------|
| Pod identity | Random hash | Ordinal (0, 1, 2...) |
| Storage | Shared or ephemeral | Dedicated PVC per pod |
| Scaling | Any order | Ordered (0..N-1), graceful |
| Update | Rolling any order | Partitioned, canary by ordinal |
| Network | Random hostname | Stable DNS: `pod-N.service` |

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres
  replicas: 3
  podManagementPolicy: OrderedReady
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      partition: 0
  template:
    spec:
      containers:
      - name: postgres
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      storageClassName: fast-ssd
      accessModes: [ReadWriteOnce]
      resources:
        requests:
          storage: 100Gi
```

## PVC Patterns

| Pattern | Access Mode | Use Case |
|---------|------------|----------|
| Single read-write | ReadWriteOnce | Databases, queues |
| Multi-read single-write | ReadOnlyMany + ReadWriteOnce | AI training, analytics |
| Shared filesystem | ReadWriteMany | NFS, EFS, Lustre |
| Ephemeral inline | CSI ephemeral | Scratch space for batch |

## Database on Kubernetes

| Database | Operator | Storage Pattern |
|----------|----------|----------------|
| PostgreSQL | CloudNativePG, Zalando | StatefulSet + PVC (RWO) |
| MySQL | MySQL Operator, Presslabs | StatefulSet + PVC, Group Replication |
| MongoDB | MongoDB Community Operator | StatefulSet + PVC, Replica Set |
| Redis | Redis Operator, Spotahome | StatefulSet + PVC, Sentinel |
| Cassandra | K8ssandra | StatefulSet + PVC, rack awareness |
| Kafka | Strimzi, Confluent | StatefulSet + PVC, JBOD |

## Backup and Restore

| Tool | Storage | Method |
|------|---------|--------|
| Velero | S3/GCS/Azure Blob | Volume snapshots + K8s resources |
| CloudNativePG | S3 via `barman` | WAL archiving, point-in-time recovery |
| Strimzi | S3 via Kafka Connect | Topic backup, offset export |
| CSI Snapshot | Any CSI driver | Volume snapshot CRD |

```yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: daily-postgres-backup
spec:
  schedule: "0 2 * * *"
  template:
    includedNamespaces: [database]
    includedResources: [persistentvolumeclaim]
    ttl: 168h
```

## Headless Services

```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres
spec:
  clusterIP: None  # Headless — DNS returns pod IPs directly
  selector:
    app: postgres
  ports:
  - port: 5432
    name: postgres
```

## Anti-Patterns

- Databases without backup/restore tested regularly
- StatefulSet with `OnDelete` update strategy (manual, error-prone)
- PVC without retention policy
- ReadWriteOnce for workloads needing concurrent writes from multiple pods
- Stateful workloads without PDB
