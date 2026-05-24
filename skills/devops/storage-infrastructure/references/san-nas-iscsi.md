# SAN / NAS / iSCSI / NVMe-oF — Network Storage

## Definitions

```
SAN  Storage Area Network — block storage over dedicated fabric (FC, FCoE, iSCSI, NVMe-oF)
     Server sees a raw LUN (Logical Unit Number); formats with own filesystem
NAS  Network Attached Storage — file-level over NFS or SMB/CIFS
     Server mounts a remote filesystem; file semantics
```

## Protocol Map

| Protocol  | Layer  | Transport         | Latency  | Throughput   | Use case                  |
|-----------|--------|-------------------|----------|--------------|---------------------------|
| FC        | block  | Fibre Channel     | very low | 16/32/64G    | enterprise SAN, VMware    |
| FCoE      | block  | Ethernet (lossless) | low    | 10/25/40G    | converged FC + Ethernet   |
| iSCSI     | block  | TCP/IP            | medium   | 10/25G       | commodity SAN             |
| NVMe-oF   | block  | RDMA / TCP / FC   | very low | 25/100G+     | modern, NVMe at line rate |
| NFS v3/v4 | file   | TCP (sometimes UDP) | medium | depends      | shared home / dev / k8s   |
| SMB/CIFS  | file   | TCP               | medium   | depends      | Windows shares, samba     |
| S3 / Swift| object | HTTP              | variable | massive scale| bulk / backup / web       |

## iSCSI — Cheap Commodity SAN

```
Target (server side):   exports LUN over TCP/3260
Initiator (client):     mounts LUN as /dev/sdX

Use cases: K8s persistent volumes, VM disks, DB volumes
Storage backend: ZFS, LVM, dedicated array
```

```bash
# Target (LIO / targetcli on Linux)
targetcli
  /backstores/block create disk1 /dev/zvol/tank/iscsi-disk1
  /iscsi create iqn.2026-05.com.example:server
  /iscsi/iqn.2026-05.com.example:server/tpg1/luns create /backstores/block/disk1
  /iscsi/iqn.2026-05.com.example:server/tpg1/acls create iqn.2026-05.com.example:client
  /iscsi/iqn.2026-05.com.example:server/tpg1/portals create 0.0.0.0 3260

# Initiator (Linux open-iscsi)
iscsiadm -m discovery -t st -p 10.10.1.1
iscsiadm -m node -T iqn.2026-05.com.example:server -p 10.10.1.1 --login
# Result: /dev/sdb appears, format & mount
```

## MPIO (Multipath)

Multiple physical paths to same LUN for redundancy + bandwidth.

```bash
# /etc/multipath.conf
defaults {
    user_friendly_names yes
    path_grouping_policy multibus
    path_selector "round-robin 0"
    failback immediate
    no_path_retry queue
}

systemctl restart multipathd
multipath -ll        # show paths per device

# Result: /dev/mapper/mpathX with N paths active
```

Pairs with 2 NICs on initiator → 2 NICs on target via 2 switches = full redundancy.

## NFS

```
NFSv3   stateless, simpler, broad support
NFSv4   stateful, pseudo-fs, ACLs, parallel (pNFS)
NFSv4.1+ pNFS for parallel data servers (rare in practice)
```

```bash
# Server (Linux)
apt install nfs-kernel-server
echo '/srv/share 10.10.0.0/16(rw,sync,no_subtree_check,no_root_squash)' >> /etc/exports
exportfs -ra

# Client
mount -o vers=4.1,rsize=1048576,wsize=1048576,hard,timeo=600,retrans=2 \
  10.10.1.1:/srv/share /mnt/share
```

Sync vs async:
```
sync   server fsyncs each write (slow, safe)
async  server acks before fsync (fast, can lose data on crash)
```
Use **sync** for any important data. Pair with low-latency storage + ZFS SLOG to mitigate.

## SMB / CIFS (Samba)

```
[share]
   path = /srv/share
   read only = no
   guest ok = no
   valid users = @smbusers
   create mask = 0660
   directory mask = 0770
```

```bash
mount -t cifs //fileserver/share /mnt/share -o user=alice,uid=1000,gid=1000,vers=3.1.1
```

SMB 3+ with multichannel + RDMA = surprising performance for file workloads.

## FC SAN (legacy gold standard)

```
Enterprise arrays: Pure Storage FlashArray, NetApp AFF, Dell PowerStore, HPE Primera
Switches: Brocade, Cisco MDS
Connectivity: 16/32/64G FC HBAs on each server
Zoning: per-WWN allows access; soft + hard zoning
Multipath: MPIO with N HBA × N fabric = N×N paths
```

When still chosen: VMware estates, regulated industries, mature ops team. Costs 3-10× iSCSI/NVMe-oF.

## NVMe-oF (modern winner)

```
NVMe-oF/FC      NVMe over Fibre Channel
NVMe-oF/RDMA    over RoCE or InfiniBand (lowest latency)
NVMe-oF/TCP     over commodity Ethernet, lower CPU than iSCSI for the same load

Latency: <100µs target, vs iSCSI ~500µs+
Bandwidth: line rate at 25/100G+
```

```bash
# Linux (nvme-tcp)
modprobe nvme-tcp
nvme discover -t tcp -a 10.10.1.1 -s 4420
nvme connect -t tcp -n nqn.2026-05.com.example:server -a 10.10.1.1 -s 4420
# /dev/nvme0n1 appears
```

NVMe-oF is replacing iSCSI for new builds where target supports it.

## Storage Array Buyer's Guide

```
NetApp     Enterprise NAS + SAN, ONTAP, deep snapshot/replication
Pure Storage  All-flash, simple ops, inline dedup
Dell EMC PowerStore  Multi-purpose, NVMe
HPE Alletra/Primera  All-flash, AI ops
Hitachi Vantara  Enterprise, mainframe heritage
Lenovo TruScale  Subscription model
IBM FlashSystem  All-flash, FC + NVMe
QSAN, Synology, TrueNAS  SMB-friendly, less feature-rich
DIY (Ceph / ZFS / Linux)  Most flexible, ops-heavy
```

## Performance Targets

```
Local NVMe:           <100µs latency, 500k-1M IOPS, 7-14 GB/s
iSCSI over 25G:       ~500µs, 100-300k IOPS, 2-3 GB/s
NVMe-oF/TCP over 25G: ~200µs, 300-700k IOPS, ~3 GB/s
NVMe-oF/RDMA:         <100µs, 500k+ IOPS, line rate
NFS over 25G:         1-5ms, 50-200k IOPS, 1-2 GB/s
S3 (object):          10-100ms p50, throughput scales horizontally
```

## Network for Storage

```
Dedicated VLAN/fabric (NEVER share with prod traffic)
Jumbo MTU 9000 (or 9216 for VXLAN encap)
At least 2 NICs per host (MPIO)
QoS / lossless Ethernet (PFC + ECN) for FCoE / RoCE
25G+ minimum for production; 100G for storage clusters
```

## Common Failures

- iSCSI on prod VLAN → DB stalls under traffic burst
- Single NIC to SAN → outage on cable pull
- MTU mismatch end-to-end → silent fragmentation, latency spikes
- NFS async on critical data → loss on server crash
- Forgetting to enable multipath → manual failover needed
- SAN zoning wrong → wrong server sees wrong LUN
- Cache battery dead on RAID controller → write-through forced, 10× slower
