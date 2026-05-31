# Datacenter Networking and Storage

## Purpose
Provide comprehensive reference for datacenter networking and storage architecture. Covers network topology, leaf-spine design, storage types (SAN/NAS/DAS/object), fiber channel, NVMe-oF, and integration with compute infrastructure.

## Table of Contents
1. [Network Topology Design](#network-topology-design)
2. [Leaf-Spine Architecture](#leaf-spine-architecture)
3. [Storage Architecture](#storage-architecture)
4. [Storage Protocols](#storage-protocols)
5. [Networking for Storage](#networking-for-storage)
6. [Network Services](#network-services)
7. [Network Management and Monitoring](#network-management-and-monitoring)
8. [Storage Management](#storage-management)
9. [Performance Optimization](#performance-optimization)
10. [Troubleshooting Common Issues](#troubleshooting-common-issues)

---

## Network Topology Design

### Traditional Three-Tier (Legacy)

```
Core Layer: High-speed switching, routing between DCs.
  - Redundant core switches.
  - BGP / OSPF routing.
  - Handles east-west and north-south traffic.

Aggregation Layer: Connects access to core.
  - Spanning tree, VSS, vPC.
  - Default gateway for VLANs.
  - Firewall and load balancer integration.

Access Layer: Server connectivity.
  - 1G/10G to servers.
  - VLAN segmentation.
  - Port security, STP.

Limitations: STP blocks links, oversubscription, east-west bottleneck.
```

### Leaf-Spine (Modern)

```
Spine Layer: High-speed non-blocking fabric.
  - Every leaf connects to every spine.
  - Layer 3 routing only (no STP).
  - Typically 4-8 spines for redundancy.
  - 40G/100G/400G uplinks.

Leaf Layer: Server access switches.
  - Every server connects to 2 leaves (MLAG/VPC).
  - Layer 2 or 3 to servers.
  - 10G/25G/50G to servers.
  - BGP/EVPN for routing.

Benefits:
  - Predictable latency (1-2 hops).
  - Linear bandwidth scaling.
  - No STP blocking.
  - Horizontal scale (add spines or leaves).
  - Unified fabric for LAN + SAN.

Scale:
  - 8 spines x 32 ports = 256 leaf ports.
  - Each leaf: 48 server ports = 12,288 servers.
  - Each server: 25 Gbps = 307 Tbps total capacity.
```

### Network Oversubscription

```
Calculate oversubscription ratio:

Leaf uplinks: 4 x 100G = 400G
Leaf downlinks: 48 x 25G = 1,200G
Oversubscription: 1,200 / 400 = 3:1

Target ratios:
  Compute: 3:1 to 6:1
  Storage: 1:1 (no oversubscription for storage traffic)
  Management: 10:1 to 20:1
  GPU cluster: 1:1 (full bisection bandwidth)
```

---

## Leaf-Spine Architecture

### EVPN-VXLAN

```
VXLAN extends Layer 2 over Layer 3 fabric:
  - VTEP (VXLAN Tunnel Endpoint) on leaf switches.
  - VNI (VXLAN Network Identifier) per segment.
  - EVPN distributes MAC/VTEP information.

Benefits:
  - Layer 2 adjacency across racks.
  - VM mobility without re-IP.
  - Multi-tenant isolation (up to 16M VNIs).
  - Active-active anycast gateway.

Configuration references:
  - Anycast gateway IP per VLAN.
  - BGP EVPN address family between leaf and spine.
  - Loopback interface for VTEP source.
```

### BGP in the Fabric

```
Underlay BGP:
  - Unnumbered BGP (IPv6 link-local).
  - eBGP between leaf and spine.
  - Different AS per leaf, same AS across spines.
  - Fast convergence (BGP PIC).

Overlay BGP:
  - MP-BGP EVPN address family.
  - Route reflectors (spines or dedicated).
  - IMET (Inclusive Multicast Ethernet Tag) routes.
  - Type-2 (MAC/IP) and Type-5 (IP prefix) routes.
```

### Multi-DC Connectivity

```
DCI (Data Center Interconnect) options:
  - Dark fiber: dedicated wavelength, lowest latency.
  - DWDM: multiple wavelengths on single fiber pair.
  - MPLS/VPLS: carrier-managed L2 extension.
  - IPsec over internet: encrypted, cost-effective.

Multi-DC routing:
  - BGP with AS path prepending for traffic engineering.
  - Anycast DNS and load balancers for active-active.
  - Stretched VLANs for live migration (limited radius).
  - VXLAN DCI: Inter-DC VTEP peering.

Latency benchmarks:
  Same DC: < 1 ms
  Metro (< 50 km): < 2 ms
  Regional (< 500 km): < 5-10 ms
  Cross-country: < 30-50 ms
  Intercontinental: < 100-200 ms
```

---

## Storage Architecture

### Storage Typology

```
DAS (Direct Attached Storage):
  - Disks directly in server.
  - Lowest latency, simple.
  - Limited capacity, no sharing.
  - Use: OS boot, local cache, high-performance scratch.

NAS (Network Attached Storage):
  - File-level access (NFS, SMB).
  - Shared storage, easy management.
  - Use: home directories, file shares, content repositories.

SAN (Storage Area Network):
  - Block-level access (FC, iSCSI, NVMe-oF).
  - High performance, low latency.
  - Use: databases, VMs, high-performance applications.

Object Storage:
  - RESTful API access (S3, Swift).
  - Unlimited scalability, cheap.
  - Use: backups, archives, media, data lakes.

Hyperconverged (HCI):
  - Compute + storage in same nodes.
  - vSAN, Nutanix, Ceph.
  - Use: general virtualization, VDI, ROBO.
```

### RAID Levels

| RAID | Min Disks | Capacity | Read Perf | Write Perf | Fault Tolerance |
|---|---|---|---|---|---|
| 0 | 2 | N x disk | High | High | None |
| 1 | 2 | N/2 | High | Medium | 1 disk |
| 5 | 3 | N-1 | High | Medium (parity) | 1 disk |
| 6 | 4 | N-2 | High | Lower | 2 disks |
| 10 | 4 | N/2 | Very High | High | 1 per mirror |

**Recommendations:**
- RAID 10 for databases, VMs (performance + protection).
- RAID 6 for large capacity arrays (rebuild resilience).
- RAID 5 for read-heavy workloads (limited rebuild risk).
- RAID 0 for scratch/scratch space (no protection).

### Storage Tiers

```
Tier 0 (Optane / SCM):
  - < 10 us latency.
  - 10-100 DWPD endurance.
  - Use: write cache, metadata, logging.
  - Cost: $3-5/GB.

Tier 1 (NVMe SSD):
  - < 100 us latency.
  - 1-3 DWPD endurance.
  - Use: databases, VMs, active datasets.
  - Cost: $0.30-0.60/GB.

Tier 2 (SATA SSD):
  - < 500 us latency.
  - 0.5-1 DWPD endurance.
  - Use: file servers, lower-tier VMs.
  - Cost: $0.15-0.30/GB.

Tier 3 (HDD - 10K/15K):
  - 5-10 ms latency.
  - Use: bulk storage, backups.
  - Cost: $0.05-0.10/GB.

Tier 4 (HDD - 7.2K):
  - 10-20 ms latency.
  - Use: archives, cold data.
  - Cost: $0.02-0.05/GB.

Tier 5 (S3 / Object):
  - 50-200 ms latency.
  - Use: archives, backups, data lakes.
  - Cost: $0.01-0.03/GB.
```

---

## Storage Protocols

### Fibre Channel (FC)

```
Topology: FC switches (separate fabric from Ethernet).
Speeds: 8/16/32/64 Gbps (Gen 7: 128 Gbps).

Components:
  - HBA (Host Bus Adapter) in server.
  - FC switch (director for enterprise).
  - Storage array front-end ports.
  - SFPs, cables (OM3/OM4 for 32G+).

Zoning: LUN masking and WWN-based access control.
  - Single initiator, single target per zone.
  - Zone by WWN (not port).
  - Separate fabric A and B for redundancy.

VSANs: Virtual SANs for multi-tenant FC fabric.
```

### NVMe over Fabrics (NVMe-oF)

```
NVMe-oF extends NVMe command set over network:
  - NVMe/FC: FC transport (lowest latency).
  - NVMe/RoCE: RDMA over Converged Ethernet.
  - NVMe/TCP: Standard TCP (no special HW).
  - NVMe/iWARP: RDMA over standard Ethernet.

Latency comparison:
  NVMe/FC: 20-50 us.
  NVMe/RoCE: 50-100 us.
  NVMe/TCP: 200-500 us.
  iSCSI: 500-2000 us.
  NFS: 1-5 ms.

When to use:
  - NVMe/FC: existing FC investment, lowest latency.
  - NVMe/RoCE: new deployment, want unified fabric.
  - NVMe/TCP: standard Ethernet, no special HW needed.
```

### iSCSI

```
iSCSI sends SCSI commands over TCP/IP.

Configuration:
  - iSCSI initiator (software or hardware).
  - iSCSI target on storage array.
  - CHAP authentication for security.
  - Jumbo frames (9000 MTU) recommended.
  - Dedicated VLAN or subnet for storage traffic.

Performance tuning:
  - Multiple sessions for load balancing.
  - Flow control enabled on switches.
  - TCP offload engine (TOE) on NIC.
  - Proper queue depth configuration.
```

### NFS and SMB

```
NFS (Network File System):
  - Version: NFSv3 (stateless), NFSv4 (stateful, pNFS).
  - Transport: TCP, RDMA (pNFS).
  - Use: VMware, Linux file shares, home directories.

SMB (Server Message Block):
  - Version: SMB 3.1.1 (encryption, multi-channel).
  - Use: Windows file shares, Hyper-V.
  - SMB Direct (RDMA) for low latency.

Best practices:
  - Dedicated storage network.
  - Proper mount options (noatime, nodiratime).
  - Multipathing with multiple NICs.
  - Large read/write buffers for throughput.
```

---

## Networking for Storage

### Storage Network Design

```
Dedicated storage network:
  - Separate VLAN or physical network.
  - No oversubscription (1:1 ratio).
  - Jumbo frames enabled throughout path.
  - Flow control (802.3x) enabled.
  - Priority flow control (PFC) for RoCE.

Recommended:

  Converged network (with QoS):
  - Unified fabric for LAN + SAN.
  - 802.1p/Q for class of service.
  - Lossless class for storage traffic.
  - Bandwidth guarantee: 30% for storage.
  - DCBX for automated QoS negotiation.

  Dedicated network:
  - Separate switches for storage.
  - No congestion from compute traffic.
  - Easier troubleshooting.
  - Higher hardware cost.
```

### Quality of Service

```
QoS classes:
  Class 1 (Network Control): 5% bandwidth, highest priority.
    - BGP, OSPF, spanning tree, EVPN.

  Class 2 (Storage): 30% bandwidth, lossless.
    - FCoE, NVMe-oF, iSCSI, NFS.
    - PFC (802.1Qbb) enabled.
    - No drop policy.

  Class 3 (Real-time): 15% bandwidth, low latency.
    - VoIP, video, VDI.
    - Strict priority queuing.

  Class 4 (Business Data): 40% bandwidth.
    - Application traffic, database replication.
    - Default class.

  Class 5 (Bulk Data): 10% bandwidth, scavenger.
    - Backups, large file transfers.
    - Can be dropped under congestion.
```

### Converged Network Adapters

```
CNA (Converged Network Adapter) capabilities:
  - Ethernet NIC (10/25/50/100 Gbps).
  - FC HBA (16/32 Gbps).
  - iSCSI hardware offload.
  - NVMe-oF offload.
  - RDMA (RoCE, iWARP).
  - Unified management.

Vendor choices:
  - Mellanox/NVIDIA ConnectX series.
  - Broadcom NetXtreme/Emulex.
  - Intel Ethernet 800 series.
  - Marvell QLogic.
```

---

## Network Services

### DHCP and IPAM

```
IP addressing:
  - RFC 1918 private ranges for internal DC.
  - /16 or /20 per POD or row.
  - Separate subnets: management, compute, storage, PXE.

DHCP infrastructure:
  - Redundant DHCP servers (anycast).
  - DHCP relay on access/leaf switches.
  - Scope per VLAN.
  - PXE boot scope with next-server.

IPAM integration:
  - Netbox or Infoblox as source of truth.
  - Subnet reservations for static assignments.
  - Overlap detection for multi-DC.
  - Automated DNS updates from DHCP.
```

### DNS

```
DNS architecture:
  - Authoritative: internal domain (dc.example.com).
  - Recursive: forwarders to external DNS.
  - Anycast DNS for high availability.
  - DNSSEC for integrity (if required).

Records:
  - A/AAAA for device management.
  - PTR for reverse lookups.
  - SRV for service discovery (LDAP, Kerberos).
  - CNAME for aliases (storage-nfs-01 -> nas01).

Dynamic DNS:
  - DHCP updates DNS automatically.
  - Device registration via IPAM.
  - Short TTL (60s) for host records.
  - Clean up on device decommission.
```

### NTP

```
NTP architecture:
  - Stratum 1: GPS-disciplined clock source.
  - Stratum 2: Internal NTP servers (redundant).
  - Stratum 3-4: Devices, servers, switches.

Configuration:
  - All DC devices point to same NTP sources.
  - Min 2 NTP servers per source.
  - NTP authentication (symmetric key or autokey).
  - Monitor NTP synchronization status.
```

---

## Network Management and Monitoring

### Management Network

```
Out-of-Band (OOB) management:
  - Separate management VLAN or network.
  - Independent from production network.
  - Access via VPN or bastion host.
  - BMC/IPMI/iLO/iDRAC on OOB.

In-Band management:
  - SSH/HTTPS on production interface.
  - ACLs restrict management access.

Recommended: Both OOB and in-band.
  - OOB for critical operations (reboot, firmware update).
  - In-band for routine monitoring and configuration.
```

### Monitoring Tools

```
SNMP:
  - Polling: CPU, memory, interface utilization, temperature.
  - Traps: link up/down, fan failure, high temperature.
  - V3 with authentication and encryption.

sFlow / NetFlow:
  - Traffic analysis: top talkers, bandwidth usage.
  - Flow export to collector (Elastic, Splunk).

Streaming Telemetry:
  - Push-based (vs poll-based).
  - Higher granularity, lower overhead.
  - gNMI for modern network devices.

Prometheus + Grafana:
  - snmp_exporter for SNMP metrics.
  - Custom dashboards per POD.
  - Alerting on link utilization, errors, CRC.
```

### Configuration Management

```
Network automation:
  - Ansible for configuration management.
  - Jinja2 templates for device configuration.
  - Git as source of truth.
  - CI/CD for configuration changes.
  - Backup configs daily, retain 1 year.

Golden configuration:
  - Standard baseline per device type.
  - Security hardening applied to all devices.
  - Compliance scanning against golden config.
  - Automated remediation for drift.
```

---

## Storage Management

### Storage Provisioning

```
LUN/Volume creation workflow:
  1. Request: capacity, performance tier, protection level.
  2. Validate: available capacity, RAID group.
  3. Provision: create volume, map to host.
  4. Verify: host sees LUN, multipath active.
  5. Document: updated in DCIM.

Host connectivity:
  - WWPN registration (FC zoning).
  - IQN registration (iSCSI).
  - Multipathing configuration.
  - Queue depth tuning.

Performance policies:
  - IOPS limits per volume.
  - Bandwidth limits.
  - Burst allowance.
  - QoS class.
```

### Storage Monitoring

```
Key metrics:
  - Array: capacity used, IOPS, throughput, latency.
  - Volume: IOPS, latency, queue depth.
  - Port: bandwidth utilization, errors.
  - Disk: health (SMART), wear, reallocated sectors.

Thresholds:
  - Array capacity: warning at 80%, critical at 90%.
  - Latency: warning at 10ms (HDD), 2ms (SSD), 500us (NVMe).
  - Queue depth: warning > 32 per volume.
  - Disk errors: any reallocated sectors = replace.

Alerting:
  - Capacity trending (predict disk full within 30 days).
  - Latency spike above threshold.
  - Disk failure or predictive failure.
  - Port down or degraded.
  - Replication lag (for DR).
```

### Data Protection

```
Snapshots:
  - Point-in-time copy, nearly instant.
  - Space-efficient (copy-on-write).
  - Retention: hourly for 24h, daily for 7d, weekly for 4w.
  - Performance impact: minimal (COW overhead).

Replication:
  - Synchronous: zero RPO, limited distance (< 100 km).
  - Asynchronous: configurable RPO (seconds to hours).
  - Multi-site: active-passive or active-active.

Data integrity:
  - End-to-end checksum.
  - Background scrubbing for bit rot detection.
  - T10 PI/DIX for end-to-end protection.
  - Regular data integrity checks.
```

---

## Performance Optimization

### Network Performance

```
Latency optimization:
  - Minimize hop count (leaf-spine).
  - Cut-through switching (vs store-and-forward).
  - RDMA for storage traffic.
  - Proper MTU configuration (jumbo frames).
  - Buffer tuning for deep queues.

Throughput optimization:
  - Link aggregation (LACP) for bandwidth.
  - ECMP for load balancing.
  - Flow hashing for even distribution.
  - TCP window scaling.
  - Congestion avoidance (WRED).

Monitoring:
  - Interface utilization: peak and average (5-min, 24-hr).
  - Queue drops: indicate congestion.
  - CRC errors: indicate physical layer issue.
  - Buffer utilization: indicates micro-bursts.
```

### Storage Performance

```
Latency optimization:
  - Use correct tier for workload.
  - Minimize queue depth (NVMe > SSD > HDD).
  - Proper read/write cache ratio.
  - Dedicated storage network.
  - I/O scheduler tuning (none/noop for SSD, deadline for HDD).

Throughput optimization:
  - Large block size for sequential I/O (backups, media).
  - Small block size for random I/O (databases).
  - Stripe width aligned to workload.
  - Multi-path I/O with round-robin.
  - Storage processor load balancing.

Monitoring:
  - IOPS vs capacity utilization tradeoff.
  - Read/write ratio.
  - Random vs sequential profile.
  - Queue depth per LUN.
  - Storage processor CPU utilization.
```

### End-to-End Performance

```
Full path optimization:
  - Application -> OS -> HBA/CNA -> Switch -> Storage array.
  - Each hop adds latency.
  - Measure and optimize weakest link.

Performance testing:
  - fio for block-level testing.
  - iperf3 for network throughput.
  - ORION (Oracle) for database simulation.
  - vdbench for storage validation.

Baseline:
  - Measure performance at deployment.
  - Re-measure after any significant change.
  - Compare against vendor specifications.
  - Document baseline for troubleshooting.
```

---

## Troubleshooting Common Issues

### Network Issues

| Symptom | Possible Cause | Diagnosis |
|---|---|---|
| Packet loss | Link errors, congestion | Interface CRC, queue drops, iperf3 |
| High latency | Congestion, buffer bloat | Latency test, buffer monitoring |
| Intermittent drops | LACP hash collision | Flow distribution check |
| VLAN not passing | Trunk mismatch, VXLAN issue | Ping across segment, VTEP check |
| BGP flap | Hold timer, MTU mismatch | BGP log, MTU path discovery |
| DNS failure | Server down, DNSSEC issue | dig/nslookup, forwarder check |

### Storage Issues

| Symptom | Possible Cause | Diagnosis |
|---|---|---|
| High latency | Queue depth, congestion | Monitoring tools, iostat |
| LUN not visible | Zoning, initiator | SAN zoning check, rescan |
| Slow performance | Tier mismatch, contention | Performance monitoring |
| Snapshot full | Write activity, retention | Snapshot utilization check |
| Replication lag | Bandwidth, latency | Replication status, iperf3 |
| Disk failed | SMART errors, age | Storage array, drive replacement |

### Physical Layer

| Symptom | Possible Cause | Diagnosis |
|---|---|---|
| Link down or flapping | Bad SFP, cable, port | Optics diagnostics, cable test |
| High CRC errors | Bad cable, connector | Cable test, reseat, replace |
| Light too low | Attenuation, dirty connector | Power meter, clean connector |
| Port disabled | STP, port security | Error disable recovery |
| Temperature alarm | Cooling failure, blockage | Environmental monitor, visual |

## Handoff
`datacenter-capacity-planning.md` for capacity planning.
`../../SKILL.md` for the parent datacenter skill.
