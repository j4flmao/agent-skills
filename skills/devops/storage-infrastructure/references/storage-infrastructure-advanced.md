# Storage Infrastructure Advanced: Durability, Failure Domains, Tiering, Multi-Site

Design topics for large or critical storage platforms: failure-domain design, replication vs erasure coding trade-offs, data integrity, tiering and caching, NVMe-oF fabrics, multi-site replication, and operating storage for Kubernetes at scale. Fundamentals are in `storage-infrastructure-fundamentals.md`.

## 1. Failure Domains

Data placement must survive the failures you expect:

| Level | Failure examples | Placement rule |
|---|---|---|
| Disk | Drive failure, latent sector errors | Redundancy within or across hosts |
| Host | Motherboard, PSU, kernel panic | Copies/chunks on different hosts |
| Rack | Top-of-rack switch, PDU | Copies/chunks on different racks |
| Room / AZ | Power, cooling, fire | Copies across AZs (latency budget permitting) |
| Region / site | Disaster, regional outage | Asynchronous replication or backups off-site |

Ceph expresses this with CRUSH rules (`step chooseleaf firstn 0 type rack`); Kubernetes storage with topology labels (`topology.kubernetes.io/zone`). Uneven failure domains (one rack much larger) concentrate data and limit usable capacity.

## 2. Replication vs Erasure Coding

| | 3× replication | Erasure coding (e.g. 4+2, 8+3) |
|---|---|---|
| Raw overhead | 200% | 50% (4+2), 37.5% (8+3) |
| Small random writes | Efficient | Read-modify-write; higher latency |
| Rebuild | Copy from a surviving replica | Read k chunks to rebuild one; more network/CPU |
| Minimum failure domains | 3 | k+m (6 for 4+2) |
| Fit | Block volumes, databases, metadata | Object storage, backups, archives, large sequential files |

Common pattern: replicated pools for block/metadata, erasure-coded pools for object data.

## 3. Data Integrity

- End-to-end checksums detect corruption (ZFS, Btrfs, Ceph BlueStore checksums every block).
- Scrubbing reads data in the background and repairs from redundancy: schedule regular light and periodic deep scrubs (Ceph `osd_deep_scrub_interval` defaults to one week); ZFS `zpool scrub` monthly or more often.
- Monitor SMART/NVMe health (`smartctl -a`, `nvme smart-log`): reallocated sectors, media errors, percentage used.
- Use ECC memory on storage servers; memory errors corrupt data before checksums are computed.

## 4. Rebuild Behaviour

Rebuild windows are when data is most at risk.
- Larger drives mean longer rebuilds; prefer double-parity or 3× replication with large HDDs.
- Distributed systems rebuild in parallel from many peers; keep enough free capacity (at least one failure domain's worth) to re-protect data.
- Throttle recovery so client I/O stays acceptable (Ceph mClock profiles such as `high_client_ops`/`high_recovery_ops`), but not so much that the risk window grows excessively.

## 5. Tiering and Caching

| Technique | Description | Watch for |
|---|---|---|
| All-flash primary + HDD/object archive | Lifecycle policies move cold data | Retrieval cost/latency for archived data |
| Object lifecycle (S3 Standard → IA → Glacier classes) | Automatic transitions by age | Minimum storage durations and retrieval fees |
| ZFS special vdev / L2ARC / SLOG | Metadata on SSD, read cache, sync-write log | SLOG must be power-loss-protected; special vdev loss loses the pool, so mirror it |
| Ceph device classes | Separate pools on `ssd`/`hdd`/`nvme` classes via CRUSH | Ceph cache tiering is deprecated; use device-class pools |
| bcache / dm-cache / LVM cache | Block-level SSD cache for HDD | Write-back mode risks data on cache failure |

## 6. NVMe over Fabrics

- NVMe/TCP: runs on standard Ethernet, simplest to deploy, latency close to local NVMe for many workloads.
- NVMe/RoCE: lower latency, requires lossless Ethernet configuration (PFC/ECN) and RDMA NICs.
- NVMe/FC: on existing Fibre Channel fabrics.
- Use native NVMe multipath (ANA) on Linux (`nvme list-subsys`), dedicated networks or VLANs, jumbo frames where supported end-to-end.

## 7. Multi-Site Replication

| Mode | RPO | Latency impact | Use |
|---|---|---|---|
| Synchronous | 0 | Every write waits for remote ack; limited by distance | Metro distances, critical data |
| Asynchronous | Seconds to minutes | None on writes | Regional DR |
| Snapshot shipping | Snapshot interval | None | Simple DR, backups |

Examples: ZFS `zfs send -i` incremental replication; Ceph RBD mirroring (journal- or snapshot-based) and RGW multisite; array-native replication; object storage cross-region replication.

Always test failover and failback, including application consistency (databases need their own replication or quiesced snapshots).

## 8. Kubernetes Storage at Scale

- Separate StorageClasses per tier (latency, durability, cost) with clear names.
- Use volume snapshots and backup tools (Velero with CSI snapshots or data movers, Kasten, vendor tools) with schedules and retention.
- Set ResourceQuotas on `requests.storage` and per-StorageClass usage per namespace.
- Monitor kubelet volume stats (`kubelet_volume_stats_used_bytes`, `kubelet_volume_stats_capacity_bytes`) and alert before PVCs fill.
- Plan for node drains: replicated storage needs drains coordinated with rebuild state (see Longhorn/Rook drain policies).
- Stateful workloads that replicate themselves (Kafka, Cassandra, Elasticsearch) can use local NVMe PVs instead of replicated storage, avoiding double replication.

## 9. Operations

| Practice | Detail |
|---|---|
| Firmware management | Track drive/controller firmware; stage updates |
| Spare strategy | Hot spares or replacement SLA; distributed systems use free capacity instead |
| Capacity forecasting | Linear and seasonal growth; order hardware ahead of lead times |
| Change control | Pool/rule changes trigger rebalancing; schedule and throttle |
| Disaster drills | Restore from backups and replicas regularly |

## Pitfalls

- Erasure-coded pools for small-block random-write databases.
- Replicas placed only across hosts in one rack.
- Write-back caches without power-loss protection.
- Never-tested DR replication.
- Running distributed storage near full, leaving no space to recover from a failure.

## Checklist

- [ ] Failure domains defined and encoded in placement rules.
- [ ] Replication vs EC chosen per pool by workload.
- [ ] Checksums, scrubs, and drive-health monitoring active.
- [ ] Free-capacity reserve to re-protect after a failure-domain loss.
- [ ] Multi-site replication mode matches RPO; failover tested.
- [ ] Kubernetes storage quotas, snapshots, backups, and PVC fill alerts.
