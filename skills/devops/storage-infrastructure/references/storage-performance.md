# Storage Performance Tuning

## SSD Performance Factors
Wear leveling: distribute writes across all NAND cells. TRIM: discard unused blocks, maintain write speed. Over-provisioning: reserve 7-28% capacity for GC and wear leveling. Write amplification: affected by filesystem (ext4 < XFS < ZFS). NVMe vs SATA: NVMe has 4x+ IOPS and lower latency. Temperature monitoring: high heat reduces SSD lifespan.

## Filesystem Tuning
ext4: noatime,nodiratime,nobarrier for performance. XFS: default with large files and concurrent IO. ZFS: ARC (adaptive replacement cache), L2ARC (L2 cache), ZIL/SLOG (sync writes). Btrfs: CoW overhead, disable for databases. Mount options: noatime significantly reduces write IO. Block size alignment to RAID stripe or SSD page.

## RAID Configuration
RAID 0: striping, max performance, no redundancy. RAID 1: mirroring, good read, redundant. RAID 5/6: parity, balanced, write penalty. RAID 10: stripe + mirror, best performance + redundancy. Stripe size: 64KB for databases, 256KB for sequential IO. Hardware vs software RAID: HBA passthrough + ZFS preferred.

## IO Scheduler
none (NVMe): no reordering, lowest latency. mq-deadline: good for mixed workloads, bounded latency. kyber: adaptive, low latency, good for SSDs. bfq: fair queuing, good for desktop/multi-tenant. Choose by workload: rotate → deadline/cfq, SSD/SAN → none/mq-deadline.

## Caching Strategies
L1/L2 ARC (ZFS): hot data in memory (primarycache). bcache: SSD caching for HDD backend. LVM cache: SSD extension for HDD volumes. dm-cache: generic block-level caching. Page cache: Linux file cache, tuned with vm.vfs_cache_pressure.

## Benchmarking
fio: flexible IO tester, rand/seq read/write, IOPS, latency. ioping: real-time storage latency. iostat: device-level utilization and performance. blktrace: block layer trace for IO pattern analysis. Benchmark with production-like workload and queue depth.

## References
- storage-infrastructure-fundamentals.md -- Fundamentals
- ceph.md -- Ceph
- san-nas-iscsi.md -- SAN/NAS/iSCSI
- zfs-raid.md -- ZFS and RAID
- snapshots.md -- Snapshots
