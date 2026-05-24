# ZFS + RAID — Single-Node Strong Storage

## Why ZFS
Best-in-class single-node storage: end-to-end checksums, snapshots/clones, compression, deduplication
(use sparingly), atomic transactions (COW), and excellent send/recv replication. ZFS handles RAID
internally — never put ZFS on top of hardware RAID.

## RAID Levels — When to Use Each

| Level   | Min disks | Survives | Usable% | Use case                        |
|---------|-----------|----------|---------|---------------------------------|
| RAID-0  | 2         | 0        | 100%    | scratch, ephemeral, cache       |
| RAID-1  | 2         | 1        | 50%     | small boot, dual-disk safety    |
| RAID-5  | 3         | 1        | (n-1)/n | legacy; avoid for HDD ≥ 4TB     |
| RAID-6  | 4         | 2        | (n-2)/n | bulk HDD storage                |
| RAID-10 | 4         | 1/mirror | 50%     | DB, hot data, fast rebuild      |
| RAIDZ1  | 3         | 1        | (n-1)/n | small archive                   |
| RAIDZ2  | 6         | 2        | (n-2)/n | general purpose                 |
| RAIDZ3  | 8         | 3        | (n-3)/n | huge HDDs, archive              |
| Mirrors | 2/vdev    | 1/vdev   | 50%     | DB, hot, max performance        |
| dRAID   | many      | varies   | varies  | very large pools, fast rebuild  |

## RAID-5 vs RAID-6 — The HDD Rule

```
URE (unrecoverable read error) rate: ~1 per 10^14 bits ≈ 1 per 12.5 TB read
RAID-5 rebuild on 8× 4TB = read 28 TB → ~2.2 expected UREs → 2nd failure during rebuild
Therefore: NEVER RAID-5 on HDDs ≥ 4 TB. Use RAID-6 or RAIDZ2.
For SSDs: rebuild is fast enough that RAID-5 is sometimes OK but RAID-10 wins for DBs.
```

## ZFS Pool Layout

```bash
# Mirror pool (best for DB)
zpool create tank mirror sda sdb mirror sdc sdd mirror sde sdf
# Result: 3 mirror vdevs striped = like RAID-10, IOPS scales with mirror count

# RAIDZ2 (general purpose, HDD)
zpool create tank raidz2 sda sdb sdc sdd sde sdf sdg sdh

# Mix: data + log + cache
zpool create tank \
  raidz2 sda sdb sdc sdd sde sdf sdg sdh \
  log mirror nvme0n1p1 nvme1n1p1 \
  cache nvme0n1p2 nvme1n1p2

# Set common properties
zfs set compression=zstd tank
zfs set atime=off tank
zfs set xattr=sa tank
zfs set recordsize=1M tank/media          # large files (>1MB) → set to 1M
zfs set recordsize=16k tank/postgres      # small writes (DB) → 16k or 8k
```

## SLOG (ZFS Intent Log) + L2ARC

```
SLOG:  separate log device for sync writes — accelerates fsync workloads (NFS sync, DBs)
       Mirror it (loss of unmirrored SLOG can lose in-flight writes)
       Use small fast NVMe (10-50 GB enough)

L2ARC: cache extension on SSD — reads only, optional, modest help for cold data
       Single device OK (loss is harmless)
```

## Snapshots

```bash
# Snapshot
zfs snapshot tank/data@2026-05-23-12:00

# Roll back (destructive — loses changes after snap)
zfs rollback tank/data@2026-05-23-12:00

# Clone (writable copy, CoW, near-zero space)
zfs clone tank/data@2026-05-23 tank/data-test

# List
zfs list -t snapshot tank/data

# Destroy
zfs destroy tank/data@2026-05-23-12:00
```

## Auto-Snapshot (sanoid)

```ini
# /etc/sanoid/sanoid.conf
[tank/data]
  use_template = production

[template_production]
  hourly = 48
  daily = 30
  weekly = 8
  monthly = 12
  yearly = 7
  autosnap = yes
  autoprune = yes
```

Run via cron every 5 min: `sanoid --cron`

## Replication (zfs send / receive)

```bash
# Initial full send
zfs snapshot tank/data@base
zfs send tank/data@base | ssh dr-host zfs receive tank2/data

# Incremental
zfs snapshot tank/data@2026-05-23
zfs send -i tank/data@base tank/data@2026-05-23 | ssh dr-host zfs receive tank2/data

# Native encryption (no need for TLS)
zfs send -w tank/encrypted-ds@snap | ssh dr-host zfs receive tank/encrypted-ds
```

`syncoid` (from sanoid project) automates incremental replication:
```bash
syncoid --recursive tank/data dr-host:tank2/data
```

## Scrub

```bash
# Manual
zpool scrub tank

# Status
zpool status tank

# Auto via cron (weekly for HDD, monthly for SSD)
0 2 * * 0 zpool scrub tank
```

Scrub reads every block, verifies checksum, self-heals from redundancy if mismatch.

## Drive Replacement

```bash
# Smart detects failing drive (sda)
zpool status tank                   # shows DEGRADED, sda FAULTED

# Offline + remove
zpool offline tank sda

# Hot-swap drive physically

# Online new drive (same slot, new device path possibly)
zpool replace tank sda /dev/sdh
# OR if same path:
zpool replace tank sda sda

# Watch resilver
zpool status tank
```

## Pool Performance Properties

```bash
# Performance-relevant
recordsize       8k-128k for DBs, 1M for media
compression      zstd (modern, good ratio + speed)
atime            off (saves writes)
xattr            sa (faster than dir)
sync             standard (default) | disabled (DANGEROUS, only for ephemeral)
primarycache     all | metadata | none
secondarycache   all | metadata | none
```

## ARC Tuning

```
ZFS ARC (RAM cache) defaults to half of RAM
For DB / appliance: tune to 60-80% of RAM
echo $((48 * 1024**3)) > /sys/module/zfs/parameters/zfs_arc_max
```

## Backup Strategy

```
Local snapshots:    sanoid (hourly/daily/weekly/monthly retention)
Remote replication: syncoid to DR site (zfs send/recv)
Offline backups:    weekly export to tape or air-gapped S3 (object-lock)
Restore drill:      monthly mount of recent snapshot to verify
```

## Common Failures

- ZFS on hardware RAID → ZFS sees one device, can't self-heal
- No SLOG on heavy sync workload → terrible NFS/DB performance
- L2ARC on slow SSD → makes things worse, not better (warming overhead)
- Pool > 80% full → fragmentation, performance collapse
- No mirror on SLOG → sudden power loss could lose in-flight sync writes
- Forgetting scrub schedule → silent corruption sits undetected
- Snapshot never destroyed → space leak over years
- `sync=disabled` on important data → consistency at risk on crash
