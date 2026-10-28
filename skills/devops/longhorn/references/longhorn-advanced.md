# Longhorn Advanced Operations

Operating Longhorn in production: replica scheduling and anti-affinity, node maintenance and drains, disk management, capacity controls, RWX volumes, encryption, upgrades, and monitoring. Backup/DR and performance tuning are covered in sibling references.

## 1. Replica Scheduling

| Setting | Default | Effect |
|---|---|---|
| `replica-soft-anti-affinity` | false | If false, replicas of a volume must be on different nodes; scheduling fails rather than co-locating |
| `replica-zone-soft-anti-affinity` | true | Prefer different zones (`topology.kubernetes.io/zone`), allow same zone if needed |
| `replica-disk-soft-anti-affinity` | true | Prefer different disks on the same node when co-location is allowed |
| `replica-auto-balance` | disabled | `least-effort` / `best-effort` redistribute replicas when nodes are added or freed |
| `storage-minimal-available-percentage` | 25 | Disk is unschedulable below this free percentage |
| `storage-over-provisioning-percentage` | 100 | Scheduled (provisioned) size may reach this percentage of usable capacity |

For zone resilience, label nodes with zones and use three replicas across three zones. Set `replica-zone-soft-anti-affinity=false` only if every volume can always find nodes in distinct zones.

## 2. Node and Disk Management

```yaml
# Node CR excerpt (kubectl -n longhorn-system edit nodes.longhorn.io <node>)
spec:
  allowScheduling: true
  tags: ["storage"]
  disks:
    nvme-0:
      path: /mnt/nvme0/longhorn
      allowScheduling: true
      storageReserved: 21474836480      # bytes kept free for the OS/other uses
      tags: ["ssd"]
```

- Use dedicated disks or partitions for Longhorn data, not the root filesystem.
- To retire a disk: set `allowScheduling: false`, then `evictionRequested: true`; wait until its replicas rebuild elsewhere; then remove it.
- Node labels can create default disks automatically (`create-default-disk-labeled-nodes` setting with the `node.longhorn.io/default-disks-config` annotation).

## 3. Node Maintenance and Drains

`node-drain-policy` controls whether `kubectl drain` may evict instance-manager pods:

| Policy | Behaviour |
|---|---|
| `block-if-contains-last-replica` (default) | Block drain if the node holds the last healthy replica of any volume |
| `allow-if-replica-is-stopped` | Allow if the last replica is stopped (volume detached) |
| `always-allow` | Never block; risk of data unavailability |
| `block-for-eviction` | Evict all replicas off the node before allowing drain |
| `block-for-eviction-if-contains-last-replica` | Evict only last replicas before allowing drain |

Procedure for planned maintenance:

```bash
kubectl cordon node-3
kubectl drain node-3 --ignore-daemonsets --delete-emptydir-data --timeout=30m
# Longhorn volumes re-attach on other nodes when their pods reschedule;
# replicas on node-3 become failed and are rebuilt per staleReplicaTimeout
kubectl uncordon node-3
```

For long maintenance, request eviction of replicas from the node first so volumes stay at full redundancy.

## 4. RWX Volumes

- Each RWX volume runs a share-manager pod exporting NFSv4; clients mount it over the cluster network.
- The share-manager is a single point for that volume; Longhorn recreates it on failure, with brief I/O interruption. Recent versions add faster failover options; check your version's settings.
- Not suited to heavy database workloads; use RWO block volumes for databases.
- Nodes need an NFS client; network policies must allow traffic to share-manager services.

## 5. Volume Encryption

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: longhorn-crypto
  namespace: longhorn-system
stringData:
  CRYPTO_KEY_VALUE: "<from secret manager>"
  CRYPTO_KEY_PROVIDER: "secret"
  CRYPTO_KEY_CIPHER: "aes-xts-plain64"
  CRYPTO_KEY_HASH: "sha256"
  CRYPTO_KEY_SIZE: "256"
  CRYPTO_PBKDF: "argon2i"
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-encrypted
provisioner: driver.longhorn.io
parameters:
  numberOfReplicas: "3"
  encrypted: "true"
  csi.storage.k8s.io/provisioner-secret-name: longhorn-crypto
  csi.storage.k8s.io/provisioner-secret-namespace: longhorn-system
  csi.storage.k8s.io/node-publish-secret-name: longhorn-crypto
  csi.storage.k8s.io/node-publish-secret-namespace: longhorn-system
  csi.storage.k8s.io/node-stage-secret-name: longhorn-crypto
  csi.storage.k8s.io/node-stage-secret-namespace: longhorn-system
```

Encryption uses LUKS (dm-crypt) on the node; backups of encrypted volumes stay encrypted. Store the key in a secret manager and sync it (e.g. External Secrets); losing the key loses the data.

## 6. Upgrades

1. Read release notes; upgrade one minor version at a time.
2. Verify all volumes are `healthy`; take backups of critical volumes and a Longhorn system backup.
3. Upgrade the Helm release (manager, CSI, UI).
4. Engine upgrade: automatic per `concurrent-automatic-engine-upgrade-per-node-limit` (0 disables automatic upgrade) or manual per volume; attached volumes upgrade live.
5. Confirm no volumes remain on old engine images; old images are cleaned up afterwards.

Kubernetes version compatibility is listed per Longhorn release; upgrade Longhorn before moving Kubernetes beyond its supported range.

## 7. Monitoring

Longhorn exposes Prometheus metrics from longhorn-manager (`longhorn-backend` service, port 9500, `/metrics`).

| Metric | Use |
|---|---|
| `longhorn_volume_robustness` | 1 healthy, 2 degraded, 3 faulted (0 unknown) |
| `longhorn_volume_actual_size_bytes` / `longhorn_volume_capacity_bytes` | Snapshot growth vs provisioned |
| `longhorn_node_storage_usage_bytes` / `longhorn_node_storage_capacity_bytes` | Node capacity |
| `longhorn_disk_usage_bytes` / `longhorn_disk_capacity_bytes` | Disk capacity |
| `longhorn_volume_read_latency` / `longhorn_volume_write_latency` | Performance |
| `longhorn_backup_state` | Backup success/failure |

```yaml
- alert: LonghornVolumeDegraded
  expr: longhorn_volume_robustness == 2
  for: 15m
- alert: LonghornVolumeFaulted
  expr: longhorn_volume_robustness == 3
  for: 1m
- alert: LonghornDiskAlmostFull
  expr: longhorn_disk_usage_bytes / longhorn_disk_capacity_bytes > 0.8
  for: 30m
```

## 8. Snapshot Space Management

- Snapshots keep overwritten blocks; actual size can exceed volume capacity.
- Use recurring `snapshot-cleanup` / `snapshot-delete` jobs and set retain counts on recurring snapshot jobs.
- `snapshot-max-count` and `snapshot-max-size` limits (per volume, in recent versions) prevent runaway growth.
- Trim (`fstrim`) inside the filesystem lets Longhorn reclaim space from deleted files where supported (`unmapMarkSnapChainRemoved`).

## Pitfalls

- `always-allow` drain policy with routine node rotation: volumes lose their last replica.
- Soft anti-affinity enabled on small clusters: replicas co-located on one node defeat replication.
- RWX for write-heavy databases.
- Upgrading Longhorn several minor versions at once.
- No alert on degraded volumes; a second failure becomes data loss.

## Checklist

- [ ] Hard node anti-affinity; zone spreading where zones exist.
- [ ] Drain policy chosen and maintenance procedure documented.
- [ ] Dedicated data disks with reserved space and tags.
- [ ] Encryption keys in a secret manager for encrypted classes.
- [ ] Upgrade runbook: one minor at a time, backups first.
- [ ] Alerts on robustness, capacity, backup failures, snapshot growth.
