# Storage Infrastructure Fundamentals

Core concepts for designing and operating storage: block, file, and object storage; media types; redundancy basics; access protocols; performance metrics; and how Kubernetes consumes storage. Deep dives: `zfs-raid.md`, `ceph.md`, `san-nas-iscsi.md`, `snapshots.md`, `storage-performance.md`.

## 1. Storage Types

| Type | Interface | Typical protocols | Use |
|---|---|---|---|
| Block | Raw volumes, host formats a filesystem | iSCSI, Fibre Channel, NVMe-oF, cloud block (EBS, Persistent Disk) | Databases, VMs, latency-sensitive apps |
| File | Shared hierarchical filesystem | NFS (v3, v4.x), SMB 3 | Shared app data, home directories, content |
| Object | HTTP API, flat namespace of buckets/objects | S3 API, Azure Blob, GCS | Backups, data lakes, media, logs |

Rule of thumb: databases on block, shared POSIX access on file, large unstructured or archival data on object.

## 2. Media

| Media | Strength | Weakness |
|---|---|---|
| HDD (7.2k rpm) | Lowest cost per TB, good sequential throughput | Low random IOPS (on the order of a hundred per drive), high latency |
| SATA/SAS SSD | Good random IOPS, low latency | SATA interface limits throughput |
| NVMe SSD | Highest IOPS and lowest latency, parallel queues | Cost; endurance (DWPD) varies by model |
| Tape / cold object tiers | Lowest cost for archives | Retrieval latency in minutes to hours |

Check SSD endurance ratings (drive writes per day or TBW) against the write workload, especially for write-heavy logs and caches.

## 3. Redundancy Basics

| Scheme | Usable capacity | Tolerates | Notes |
|---|---|---|---|
| RAID 1 / mirror | 50% | 1 drive per mirror | Fast rebuilds, good random I/O |
| RAID 10 | 50% | 1 drive per mirror pair | Common for databases |
| RAID 5 / RAIDZ1 | (n−1)/n | 1 drive | Risky with large drives: second failure during long rebuild |
| RAID 6 / RAIDZ2 | (n−2)/n | 2 drives | Common for large HDD arrays |
| RAIDZ3 | (n−3)/n | 3 drives | Very large arrays |
| 3× replication (distributed) | 33% | 2 copies lost | Ceph/Longhorn/HDFS default style |
| Erasure coding k+m | k/(k+m) | m chunks | Efficient for object/archival; higher CPU and small-write cost |

Redundancy is not backup: it does not protect against deletion, corruption propagated by the application, ransomware, or site loss. Follow 3-2-1 (three copies, two media, one off-site), with at least one immutable or offline copy.

## 4. Performance Metrics

| Metric | Meaning | Sensitive workloads |
|---|---|---|
| IOPS | Operations per second at a given block size | OLTP databases, VMs |
| Throughput (MB/s) | Data rate | Analytics, backups, media |
| Latency (ms/µs) | Time per operation; watch p99, not just average | Databases, transactional apps |
| Queue depth | Outstanding I/Os | Determines achievable IOPS on SSD/NVMe |

IOPS figures are meaningless without block size, read/write mix, randomness, and queue depth. Measure with `fio` using a profile that resembles the application (see `storage-performance.md`).

## 5. Access Protocol Basics

| Protocol | Notes |
|---|---|
| iSCSI | Block over TCP/IP; use dedicated VLANs/NICs, multipath (MPIO), CHAP authentication |
| Fibre Channel | Dedicated SAN fabric, zoning and LUN masking |
| NVMe over Fabrics (TCP, RDMA, FC) | Low-latency block access; NVMe/TCP runs on standard Ethernet |
| NFS v4.1/4.2 | Stateful, Kerberos security, pNFS option |
| SMB 3 | Windows file sharing, encryption, multichannel |
| S3 API | De facto object standard; many on-prem implementations (Ceph RGW, MinIO, vendor arrays) |

## 6. Filesystems

| Filesystem | Strengths |
|---|---|
| ext4 | Mature default on Linux |
| XFS | Large files, parallel I/O; default on RHEL family |
| ZFS | Checksums, snapshots, compression, integrated RAID |
| Btrfs | Snapshots, checksums, subvolumes |
| NTFS / ReFS | Windows; ReFS for Storage Spaces Direct and large volumes |

Data checksumming (ZFS, Btrfs, Ceph BlueStore) detects silent corruption; schedule scrubs to find it before a rebuild needs the data.

## 7. Kubernetes Storage Basics

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-rwo
provisioner: ebs.csi.aws.com          # any CSI driver
parameters:
  type: gp3
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
reclaimPolicy: Delete
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: data
spec:
  accessModes: ["ReadWriteOnce"]
  storageClassName: fast-rwo
  resources: { requests: { storage: 100Gi } }
```

- CSI drivers connect Kubernetes to storage systems; PVCs request storage from StorageClasses.
- `WaitForFirstConsumer` provisions in the zone where the pod is scheduled, avoiding zone mismatches.
- `reclaimPolicy: Retain` for data that must survive PVC deletion.
- `VolumeSnapshot` resources (with a snapshot controller and CSI support) provide crash-consistent snapshots.

## 8. Capacity Planning

- Track used, provisioned, and growth rate per pool; forecast time to full.
- Keep headroom: most systems degrade when nearly full (ZFS fragmentation, Ceph `nearfull`/`full` ratios at 85%/95% by default, thin pools running out).
- Account for redundancy overhead, snapshots, and rebuild space (distributed systems need free capacity to re-replicate after a node failure).

## Pitfalls

- RAID 5 with large HDDs for critical data.
- Treating snapshots or replication as backups.
- Benchmarking with unrealistic block sizes or with caches hiding disk behaviour.
- Running pools above ~80% full.

## Checklist

- [ ] Storage type chosen per workload (block/file/object).
- [ ] Redundancy level matched to drive size and rebuild time.
- [ ] Backups follow 3-2-1 with an immutable copy.
- [ ] Performance requirements stated as IOPS/throughput/latency at a block size.
- [ ] Capacity monitoring with growth forecasts and headroom thresholds.
