# Longhorn Fundamentals: Architecture, Installation, Volumes

Longhorn is a CNCF distributed block storage system for Kubernetes. Each volume is served by its own engine (controller) and synchronously replicated to replicas on several nodes' local disks. This reference covers architecture, prerequisites, installation, StorageClasses, and the volume lifecycle. Tuning, backup, and DR have their own references in this directory.

## 1. Architecture

```
Pod ──► PVC ──► Longhorn CSI driver (driver.longhorn.io)
                     │
               longhorn-manager (DaemonSet, control plane + API, CRDs)
                     │
   instance-manager pods per node
        ├── engine (one per attached volume, on the node where the pod runs)
        │       └── iSCSI/block frontend → /dev/longhorn/<volume>
        └── replicas (one per replica, on nodes holding replica data)
                └── data in /var/lib/longhorn/replicas/<volume>-<id>/
```

| Component | Role |
|---|---|
| longhorn-manager | Reconciles Longhorn CRDs (`volumes`, `engines`, `replicas`, `nodes`, `settings`, `backups`) |
| Engine | Receives block I/O and writes synchronously to all healthy replicas |
| Replica | Stores data as a chain of sparse snapshot files plus a live head |
| CSI plugin | Provision, attach, expand, snapshot via Kubernetes CSI |
| Longhorn UI | Web UI for volumes, nodes, backups, settings |
| share-manager | NFS server pod per RWX volume |

Data engines: V1 (default, mature) and V2 (SPDK-based, higher performance, stricter requirements such as huge pages; check the release notes of your version for its support status before production use).

## 2. Prerequisites per Node

| Requirement | Why |
|---|---|
| `open-iscsi` installed, `iscsid` running | V1 block frontend |
| NFSv4 client (`nfs-common` / `nfs-utils`) | RWX volumes and NFS backup targets |
| `bash`, `curl`, `findmnt`, `grep`, `awk`, `blkid`, `lsblk` | Manager operations |
| Supported filesystem for `/var/lib/longhorn` (ext4 or XFS) | Replica storage |
| Kernel modules `dm_crypt` (encryption), `nvme-tcp` and huge pages (V2) | Optional features |
| Multipathd configured to ignore Longhorn devices | Avoid device conflicts |

Check with the Longhorn CLI preflight: `longhornctl check preflight` (and `longhornctl install preflight` to install missing dependencies on supported distributions).

## 3. Installation (Helm)

```bash
helm repo add longhorn https://charts.longhorn.io
helm repo update
helm upgrade --install longhorn longhorn/longhorn \
  --namespace longhorn-system --create-namespace \
  --version <chart-version> \
  -f longhorn-values.yaml
kubectl -n longhorn-system get pods
```

```yaml
# longhorn-values.yaml
defaultSettings:
  defaultReplicaCount: 3
  defaultDataPath: /var/lib/longhorn
  storageMinimalAvailablePercentage: 25
  storageOverProvisioningPercentage: 100
  replicaZoneSoftAntiAffinity: true
  nodeDrainPolicy: block-if-contains-last-replica
persistence:
  defaultClass: true
  defaultClassReplicaCount: 3
ingress:
  enabled: false        # expose the UI only behind authentication
```

Pin the chart version and read upgrade notes; Longhorn supports upgrading one minor version at a time.

## 4. StorageClass

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-fast
provisioner: driver.longhorn.io
allowVolumeExpansion: true
reclaimPolicy: Delete
volumeBindingMode: Immediate
parameters:
  numberOfReplicas: "3"
  staleReplicaTimeout: "30"          # minutes before a failed replica is cleaned up
  dataLocality: "best-effort"        # disabled | best-effort | strict-local
  fsType: "ext4"
  diskSelector: "ssd"                # only disks tagged ssd
  nodeSelector: "storage"            # only nodes tagged storage
  dataEngine: "v1"
```

| Parameter | Effect |
|---|---|
| `numberOfReplicas` | Copies of data; 3 for production, 2 for less critical, 1 only with app-level replication |
| `dataLocality` | `best-effort` tries to keep one replica on the pod's node (lower read latency) |
| `diskSelector` / `nodeSelector` | Place replicas on tagged disks/nodes |
| `fromBackup` | Create the volume by restoring a backup URL |
| `recurringJobSelector` | Attach recurring snapshot/backup job groups |

## 5. Using Volumes

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: data-postgres-0
spec:
  accessModes: ["ReadWriteOnce"]
  storageClassName: longhorn-fast
  resources:
    requests:
      storage: 50Gi
```

| Access mode | Implementation |
|---|---|
| ReadWriteOnce / ReadWriteOncePod | Block device attached to one node |
| ReadWriteMany | NFS export via a share-manager pod backed by a Longhorn volume |
| Block mode (`volumeMode: Block`) | Raw device for databases or VMs |

Expansion: edit the PVC `resources.requests.storage`; Longhorn expands online for V1 volumes on supported filesystems.

## 6. Volume States and Robustness

| State | Meaning |
|---|---|
| `attached` / `detached` | Engine running or not |
| Robustness `healthy` | All replicas in sync |
| `degraded` | Fewer healthy replicas than desired; rebuilding |
| `faulted` | No healthy replica; data unavailable until recovered |

```bash
kubectl -n longhorn-system get volumes.longhorn.io
kubectl -n longhorn-system get replicas.longhorn.io -l longhornvolume=<pv-name>
```

## 7. Snapshots vs Backups

| | Snapshot | Backup |
|---|---|---|
| Where | Inside the volume's replicas (same cluster) | Backup target (S3-compatible, NFS, CIFS/SMB, Azure Blob) |
| Protects against | Logical errors, bad writes | Cluster/node loss, disasters |
| Created by | UI, CSI `VolumeSnapshot` (`type: snap`), recurring job | UI, CSI `VolumeSnapshot` (`type: bak`), recurring job |

Snapshots are not backups. Configure a backup target for anything that matters (see `longhorn-backup.md`).

## Pitfalls

- Missing `iscsid` on new nodes: volumes fail to attach there.
- One replica per volume on a cluster with node churn: data loss on node failure.
- Exposing the Longhorn UI without authentication: it can delete volumes.
- Running out of disk because over-provisioning and snapshot growth were not monitored.

## Checklist

- [ ] Node prerequisites verified with `longhornctl check preflight`.
- [ ] Helm chart version pinned; defaults set in values.
- [ ] StorageClasses per tier with replica count, data locality, disk/node selectors.
- [ ] UI protected; RBAC limits who can manage Longhorn CRDs.
- [ ] Backup target configured; snapshots not treated as backups.
