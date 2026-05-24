# Snapshots — Strategy, Retention, Replication, Restore

## Snapshot is NOT Backup
A snapshot lives on the same storage as the original. Storage loss = both gone.
- **Snapshot** = fast rollback, point-in-time view, recovery from "oops" deletes
- **Backup** = separate medium, separate location, separate trust domain

Both are needed.

## Snapshot Types

```
Copy-on-Write (CoW)         common; cheap to create, slight write overhead
                            ZFS, Btrfs, LVM thin, Ceph RBD, ESXi
Redirect-on-Write (RoW)     similar; uses pointer redirection
Full clone                  bit-for-bit copy (slow, double space, immutable)
Crash-consistent            point-in-time snapshot, no app coordination
App-consistent              app flushes / freezes before snapshot (DB, VSS)
```

## Retention Strategy (GFS — Grandfather/Father/Son)

```
Frequent:    every 5-15 min, retain 48                   (last 6-12 hours)
Hourly:      retain 48                                    (last 2 days)
Daily:       retain 30                                    (last month)
Weekly:      retain 8                                     (last 2 months)
Monthly:     retain 12                                    (last year)
Yearly:      retain 7+                                    (compliance, audit)

Tier-1 dataset: full GFS, replicated to DR + monthly air-gapped
Tier-3 dataset: hourly + daily + weekly only, local
```

## Per-Engine Snapshot Commands

```bash
# ZFS
zfs snapshot tank/data@2026-05-23
zfs list -t snapshot tank/data

# Ceph RBD
rbd snap create rbd-hot/vol1@2026-05-23
rbd snap ls rbd-hot/vol1

# LVM thin
lvcreate -s -n vol1-snap-20260523 vg0/vol1

# Btrfs
btrfs subvolume snapshot /mnt/data /mnt/data/.snapshots/2026-05-23

# Linux LVM (classic, expensive)
lvcreate -L 10G -s -n vol1_snap /dev/vg0/vol1

# VMware
PowerCLI / vSphere API > VirtualMachine.CreateSnapshot

# AWS EBS
aws ec2 create-snapshot --volume-id vol-... --description "daily"
```

## Automation

```
ZFS:          sanoid + syncoid (auto snap + replicate)
LVM:          custom cron, snapper for openSUSE
Btrfs:        snapper
Ceph RBD:     rbd-mirror for cross-cluster; cron for local snaps
VMware:       backup tool (Veeam, Rubrik) handles snap+ship
AWS:          DLM (Data Lifecycle Manager), AWS Backup
```

## App-Consistent Snapshots

Crash-consistent = the storage will look like the app crashed. Most journaled FS and modern DBs
recover fine; some don't.

To get app-consistent:
```
Linux:    fsfreeze before snap, fsfreeze --unfreeze after
                fsfreeze -f /mnt/data
                <create snap>
                fsfreeze -u /mnt/data

DBs:      enter "backup mode":
  PostgreSQL: SELECT pg_backup_start('snap'); ... pg_backup_stop();
  MySQL: FLUSH TABLES WITH READ LOCK; UNLOCK TABLES;
  MongoDB: db.fsyncLock(); ... db.fsyncUnlock();

VMware:   guest-OS VSS quiesce (Windows) or pre-/post-freeze scripts (Linux)
```

## Replication

```
Active-passive: snapshot → ship to DR → restore-ready
Continuous: streaming (CDC, log shipping, ZFS send -i, rbd-mirror journal mode)

DR site requirements:
  - Equivalent capacity
  - Same engine version (or known compatible)
  - Network bandwidth ≥ change rate × headroom
  - Retention may differ (DR usually less frequent)
```

```bash
# ZFS replication via syncoid (covers send/recv automation)
syncoid --recursive tank/data dr-host:tank2/data

# Ceph RBD mirror (one-way)
rbd mirror pool enable rbd-hot pool
rbd mirror image enable rbd-hot/vol1 journal
# Configure remote cluster, peer-add, sync starts
```

## Air-Gapped / Immutable

For ransomware resilience, at least one snapshot copy must be:
- Stored in a different trust domain (separate account / cloud / vendor)
- WORM / object-lock enforced
- Disconnected from prod network

```bash
# AWS S3 Object Lock (compliance mode, cannot be removed)
aws s3api put-object --bucket immutable-backups --key path/snap.zfs \
  --object-lock-mode COMPLIANCE \
  --object-lock-retain-until-date 2027-05-23T00:00:00Z

# Tape: rotate offsite, write-protect, store in vault
```

## Restore Drill (the most-skipped step)

A snapshot you never restored from might as well not exist.

```
Monthly:    pick random snapshot, mount on isolated test host, verify file integrity
Quarterly:  full restore of a Tier-1 DB to dev environment, verify app starts + smoke test
Annual:     full DR restore — bring up entire stack from backup-only

Document:
  - Time to first byte (RTO start)
  - Time to first usable record
  - Time to application-ready
  - Time to full functional test pass
```

## Restore Workflow Sample (DB)

```bash
# 1. Identify snapshot to restore
zfs list -t snapshot tank/postgres | tail -5

# 2. Clone snapshot to writable dataset
zfs clone tank/postgres@2026-05-23 tank/postgres-restore

# 3. Mount in isolated env, start DB
mount /dev/zvol/tank/postgres-restore /mnt/restore
sudo -u postgres pg_ctl -D /mnt/restore start

# 4. Verify (row counts, recent timestamps, app smoke)

# 5. Promote: cutover, repoint apps, then destroy original on success
```

## Capacity Implications

```
Snapshot space ≈ (rate of change) × (retention duration)
On a 1 TB volume with 5%/day change rate, 30-day retention:
  ≈ 1.5 TB of snapshot space (worst case)

Reserve ≥ 50% headroom in storage pool for snapshots if active retention.
```

## Common Mistakes

- Snapshots as the only backup (single trust domain)
- Never tested restore (snapshot rot, schema drift, broken format)
- Forgetting app-consistency for DBs (crash-consistent corruption risk)
- Snapshot retention forever → pool fills, performance dies
- Replication never tested at DR site
- Immutable backup not actually immutable (compliance vs governance mode confusion in S3)
- Restore plan assumes prod DNS / secrets / network all up (chicken-egg in DR)
