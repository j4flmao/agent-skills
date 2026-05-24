# Longhorn Performance

## RWX Volumes

| Method | Description | Performance | Use Case |
|--------|-------------|-------------|----------|
| Share Manager | NFS server per volume via share-manager pod | Medium | General RWX workloads |
| ReadWriteManyPod | Experimental, no NFS gateway | Higher | Advanced users |

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shared-data
spec:
  accessModes:
  - ReadWriteMany
  volumeMode: Filesystem
  storageClassName: longhorn
  resources:
    requests:
      storage: 100Gi
```

## Performance Tuning

| Parameter | Default | Tuning | Effect |
|-----------|---------|--------|--------|
| Replica count | 3 | 2 (safety) or 1 (dev) | Write IOPS: more replicas = lower |
| `staleReplicaTimeout` | 30 | < 30 | Faster failure detection |
| `guaranteedEngineCPU` | 0.2 (20%) | 0.5-1.0 | Higher engine throughput |
| Concurrency | 1 | 2-4 | Parallel backup/snapshot ops |
| `replicaAutoBalance` | disabled | `least-effort` | Better storage utilization |
| `disableSchedulingOnCordonedNode` | true | true | Prevent scheduling on cordoned nodes |
| `mkfsParams` | default ext4 | `-O ^has_journal` | Disable journal for higher write perf |

## Storage Classes

```yaml
# Fast SSD — high performance, low latency
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-fast
provisioner: driver.longhorn.io
parameters:
  numberOfReplicas: "3"
  staleReplicaTimeout: "20"
  fromBackup: ""
  fsType: ext4
  guaranteedEngineCPU: "1"
  replicaAutoBalance: "least-effort"
  diskSelector: "ssd"
  nodeSelector: "storage-optimized"

---
# Capacity — slow disks, cost-optimized
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-capacity
provisioner: driver.longhorn.io
parameters:
  numberOfReplicas: "2"
  staleReplicaTimeout: "30"
  fromBackup: ""
  fsType: ext4
  guaranteedEngineCPU: "0.2"
  diskSelector: "capacity"
```

## IOPS and Throughput

| Replicas | Read IOPS (4K) | Write IOPS (4K) | Read MB/s | Write MB/s |
|----------|---------------|----------------|-----------|------------|
| 1 | ~25,000 | ~15,000 | ~400 | ~200 |
| 2 | ~23,000 | ~10,000 | ~380 | ~150 |
| 3 | ~20,000 | ~8,000 | ~350 | ~120 |

- Local SSD on nodes, direct-attached (not network storage)
- Network bandwidth between nodes affects performance

## Monitoring

```yaml
# Prometheus ServiceMonitor for Longhorn
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: longhorn
  namespace: longhorn-system
spec:
  selector:
    matchLabels:
      app: longhorn-manager
  endpoints:
  - port: manager
    path: /metrics
    interval: 15s
```

| Metric | What It Shows | Alert Threshold |
|--------|--------------|----------------|
| `longhorn_volume_state` | Volume healthy/degraded/fault/unknown | Degraded > 5min |
| `longhorn_volume_robustness` | Volume redundancy status | Degraded |
| `longhorn_disk_storage_available` | Available storage per disk | < 20% |
| `longhorn_disk_storage_reserved` | Reserved space per disk | > 80% |
| `longhorn_node_status` | Node online/offline | Offline > 1min |
| `longhorn_volume_latency` | IO latency | > 100ms |
| `longhorn_volume_throughput` | IO throughput | Sudden drop > 50% |

## Backup Performance

| Network | 100Gi Backup | Restore |
|---------|-------------|---------|
| 1 Gbps | ~20 min | ~15 min |
| 10 Gbps | ~2 min | ~1.5 min |
| S3 (standard) | ~30 min | ~25 min |
| S3 (express) | ~5 min | ~4 min |

## Best Practices

- Dedicated SSD disks for Longhorn (don't share with OS)
- Use storage-optimized node pool (local NVMe preferred)
- Set `guaranteedEngineCPU: 0.5` for production workloads
- Use `replicaAutoBalance: least-effort` for even disk utilization
- Monitor disk space — Longhorn reserves 25% by default
- Use `mkfsParams: "-O ^has_journal -T largefile"` for large file workloads
- RWX volumes have NFS overhead — prefer RWO for performance-sensitive workloads
- Longhorn on bare-metal or direct-attached storage outperforms network storage
