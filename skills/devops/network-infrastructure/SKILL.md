---
name: devops-network-infrastructure
description: >
  Use this skill when designing or operating production network infrastructure: BGP, anycast, ECMP,
  leaf-spine fabric, EVPN/VXLAN, MPLS, SD-WAN, VRRP/HSRP/CARP, jumbo frames, QoS, multi-WAN, NAT,
  IPv6 dual-stack, transit-vs-peering, internet exchanges (IX). Applies to colo, on-prem DC, hybrid
  cloud, and edge POPs. This skill enforces: redundant uplinks, BGP best-practice (origin AS, prefix
  filtering, MED/LOCAL_PREF policy), leaf-spine non-blocking, MTU consistency, and verifiable failover.
  Do NOT use for: cloud-native VPC/Transit Gateway (see devops-aws / devops-gcp / devops-azure),
  service mesh (see devops-service-mesh), or app-level load balancing (see enterprise-high-availability).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, network, bgp, anycast, leaf-spine, phase-2]
---

# DevOps Network Infrastructure

## Purpose
Design networks that survive single-link, single-device, single-carrier, single-POP failures while
delivering wire-rate throughput. Cover BGP for multi-homing and anycast, leaf-spine for east-west
scale, EVPN/VXLAN for L2 stretch, MPLS / SD-WAN for branch, and VRRP/HSRP for L2 redundancy.

## Agent Protocol

### Trigger
Exact user phrases: "BGP", "anycast", "ECMP", "leaf-spine", "EVPN", "VXLAN", "MPLS", "SD-WAN",
"VRRP", "HSRP", "CARP", "multi-homing", "transit", "peering", "IX", "internet exchange", "AS number",
"prefix filter", "MED", "LOCAL_PREF", "DDoS scrubbing", "blackhole route", "jumbo frames", "MTU",
"network fabric", "spine", "leaf", "Clos", "QoS".

### Input Context
- Current topology + scale (rack count, links)
- Carrier mix (transit, peering, IX)
- Own AS number? PI / PA address space?
- Workloads (east-west heavy: storage / k8s; north-south heavy: web; both)
- Geographic POPs / regions / sites
- Compliance / latency requirements

### Output Artifact
Network design with topology diagram, addressing, BGP policy, MTU plan, redundancy proof.

### Response Format
```
Topology: {leaf-spine | hub-spoke | full-mesh}
Underlay: {BGP unnumbered | OSPF | ISIS}
Overlay: {EVPN/VXLAN | none}
North-south: {2+ transit, ≥1 IX, BGP multi-home}
Failure domains: {rack / row / pod}
MTU: {core 9216, edge 1500}
```

No preamble. No postamble. No explanations.

### Completion Criteria
- [ ] Redundant uplinks (≥ 2 carriers; ≥ 2 fiber entries to building)
- [ ] BGP policy: prefix filter, AS path filter, RPKI ROA validation
- [ ] Anycast for stateless services where applicable
- [ ] Leaf-spine sized for non-blocking fabric (oversubscription documented)
- [ ] L2 redundancy via MLAG/VPC + VRRP/HSRP
- [ ] Consistent MTU policy across underlay
- [ ] IPv6 dual-stack
- [ ] Monitoring: BGP neighbor state, interface errors, throughput

### Max Response Length
350 lines.

## Workflow

### Step 1: Pick Fabric Topology
```
Leaf-spine (Clos)
  All leaves connect to all spines. East-west predictable. Most modern DCs.
  Scale: add more spines/leaves; non-blocking with right oversub ratio.

Hub-spoke
  One core, many edges. Good for small / branch; bad for east-west.

Full-mesh
  All-to-all links. Only for small clusters; doesn't scale beyond ~8 nodes.

3-stage Clos (leaf-spine)        small/medium DC
5-stage Clos (super-spine added) hyperscale (1000s of racks)
```

```
        Spine-1   Spine-2   Spine-3   Spine-4
          │ │ │     │ │ │     │ │ │     │ │ │
          ╳ ╳ ╳     ╳ ╳ ╳     ╳ ╳ ╳     ╳ ╳ ╳
          │ │ │     │ │ │     │ │ │     │ │ │
        Leaf-1   Leaf-2   Leaf-3   …   Leaf-N
        (ToR)    (ToR)    (ToR)        (ToR)
          │        │        │              │
         Rack     Rack     Rack         Rack
```

Oversubscription: total leaf-to-server bw : total leaf-to-spine bw.
- 1:1 non-blocking (max performance, max cost)
- 3:1 typical compute
- 5:1+ acceptable for general workloads, not for storage

### Step 2: Underlay Routing
```
BGP unnumbered (FRR / Cumulus / SONiC)   modern, no need to manage per-link IPs
OSPF                                     classic, simpler scale
ISIS                                     ISP-grade, used by hyperscalers
```

BGP-only DCs (Hyperscale pattern):
- Each leaf in its own ASN, each spine in its own ASN (or shared)
- ECMP across all uplinks (FRR / Arista EOS supports)
- Loopback IPs for router-id; underlay via /31 or unnumbered

### Step 3: Overlay (if multi-tenant L2 needed)
```
EVPN/VXLAN
  L2 stretch over L3 underlay. Tenant separation via VNI.
  Type-2 MAC routes via BGP. Type-5 IP prefix routes for inter-VNI.

Use only if you NEED L2 stretch (legacy apps, vMotion, multi-AZ cluster requiring same subnet).
Modern apps prefer L3-everywhere.
```

### Step 4: North-South — Multi-Homing + BGP
Get your own ASN + PI space for control. Multi-home to ≥ 2 transit + 1+ IX.

```
You (AS 65001)
   │           │
 Transit-A   Transit-B
 (Cogent)    (Lumen)
                     IX-1 (private peering: Cloudflare, Google, AWS, Meta)

eBGP to all 3. Outbound: LOCAL_PREF to prefer peering > transit (cheaper).
Inbound: AS-prepend for less-preferred ingress; MED only with same neighbor.
```

```bash
router bgp 65001
 bgp router-id 198.51.100.1
 neighbor 192.0.2.1 remote-as 174       ! Cogent
 neighbor 192.0.2.5 remote-as 3356      ! Lumen
 address-family ipv4 unicast
  network 198.51.100.0/24
  neighbor 192.0.2.1 prefix-list out-default out
  neighbor 192.0.2.1 route-map prefer-peer in
  neighbor 192.0.2.5 prefix-list out-default out
```

### Step 5: Anycast
Same IP announced from multiple POPs. BGP withdraws on failure → traffic shifts in seconds.
Use cases: DNS (root + recursive), Anycast HTTPS (CDN-style), Multi-region API gateway.
Requirement: stateless or session-portable workload (anycast may hop mid-conn under churn).

### Step 6: L2 Redundancy (within a rack/row)
```
MLAG / VPC   two switches act as one LACP partner
             servers LACP-bond two NICs to two switches
             survives one switch loss seamlessly
VRRP / HSRP  virtual IP shared by switch pair as default gateway
             sub-second failover
```

```
interface Vlan100
 ip address 10.10.0.2 255.255.255.0
 vrrp 1 ip 10.10.0.1
 vrrp 1 priority 110
 vrrp 1 preempt
```

### Step 7: MTU + Jumbo Frames
```
1500   default Ethernet MTU
1380   safe for VPN encap (1500 - IPSec overhead)
9000   jumbo for storage / east-west (Ceph, iSCSI, NFS)
9216   modern jumbo limit (handles VXLAN + jumbo payload)
```

Rule: end-to-end consistency. One link at 1500 in a 9000 path = silent fragmentation / blackhole.
Verify with `ping -M do -s 8972` (don't-fragment).

### Step 8: Carrier Diversity
```
Tier-1: ≥ 2 transit + ≥ 2 IX peering
Fiber entry: 2 physical entries to building (different geographic paths)
Conduit: separate conduits, ideally different sides of building
Provider: avoid two carriers riding same physical fiber underneath
Test: actual run from carrier maps; insist on diverse routes in SLA
```

### Step 9: QoS and Traffic Shaping
```
Classify at edge:
  EF (46): VoIP, real-time       — strict priority, 5% BW
  AF41 (34): video, interactive   — guaranteed BW, 20%
  AF31 (26): critical data, DB    — guaranteed BW, 30%
  AF21 (18): standard web         — scavenger, 30%
  BE (0): best-effort             — remaining, 15%
  
Apply on all uplinks: shape, queue, police inbound to protect fabric.
```

### Step 10: Network Automation
```yaml
# Ansible playbook example for BGP config
- name: Configure BGP on leaf switches
  hosts: leaf_switches
  tasks:
  - name: Set BGP ASN
    cisco.ios.ios_bgp:
      config:
        bgp_as: "{{ leaf_asn }}"
        log_neighbor_changes: true
        neighbors:
        - neighbor: "{{ item }}"
          remote_as: "{{ spine_asn }}"
          description: "uplink-to-spine-{{ inventory_hostname }}"
      state: merged
    loop: "{{ spine_ips }}"
```

### Step 11: DOCSIS / Fiber OLT Access (Last Mile)
For ISPs or edge POPs, apply cable access standards. DOCSIS 3.1 supports 10G down/1G up.
GPON/XGS-PON for fiber to the home. Use BNG (Broadband Network Gateway) for subscriber management.

### Step 12: Monitoring Tools and KPIs
```
BGP neighbor state          up/down + uptime + prefixes received
Interface counters          errors, drops, throughput per port
ECMP hash distribution      uneven = polarization, retune hash
Latency to upstream peers   ping / mtr from edge to {transit, peer}
DDoS / volume anomaly       netflow / sFlow / IPFIX export
Switch CPU/memory           control-plane load
Fabric utilization          per-spine / per-leaf link utilization
```

Tools: librenms, observium, Prometheus + snmp_exporter, flow collector (akvorado, pmacct),
oxidized for config backup, batfish for config validation.

## Rules
- Multi-home BGP from day one for any north-south critical traffic.
- ECMP across all leaf-spine uplinks; flow-hash tuned to avoid polarization.
- MLAG/VPC + VRRP/HSRP for L2 device redundancy.
- MTU end-to-end consistent within a domain.
- RPKI ROA published for owned prefixes; RPKI validation inbound.
- Prefix filters on every eBGP session (in AND out).
- Carrier diversity: ≥ 2 physical fiber entries, different conduits.
- IPv6 dual-stack everywhere; IPv6-only acceptable for greenfield.
- All changes via NetOps automation (Ansible, Nornir), never manual on prod.
- Quarterly fail-test: pull one uplink / one switch and verify auto-recovery.
- Deploy QoS classification at edge; trust boundaries on all uplinks.
- NetFlow/sFlow export from every ToR for capacity planning + DDoS detection.

## Production Considerations
- Run BGP timers aggressively: 3s keepalive, 9s hold for ToR-to-spine.
- Use BFD for sub-second failure detection alongside BGP.
- Separate underlay (loopbacks) from overlay (VNI) addressing plan.
- Deploy route reflectors at spine layer to avoid full iBGP mesh.
- Prefix-list filter on all edges: max-prefix limits, RPKI invalid = reject.
- Design for 50% headroom on spine uplinks during any single link failure.
- Color-code and label both ends of every fiber patch for ops clarity.
- Use digital optical monitoring (DOM) on all optics to predict failures.

## Anti-Patterns
- Single-carrier uplink — full outage during carrier maintenance.
- Mixing MTU within a path — silent packet drops, inconsistent behavior.
- No BGP filtering — accepts full BGP table from non-transit peers.
- L2 loop with STP — spanning tree disables redundant links.
- Oversubscription > 5:1 on storage fabric — throughput bottleneck.
- Manual config only — config drift, no audit trail.
- Flat network (no L3 segmentation) — broadcast storms, large blast radius.
- Single fiber entry into building — backhoe fade takes out entire site.

## References
  - references/bgp-anycast.md — BGP + Anycast — Policy, RPKI, Multi-Homing
  - references/leaf-spine.md — Leaf-Spine — Clos Fabric, ECMP, EVPN/VXLAN
  - references/network-infrastructure-advanced.md — Network Infrastructure Advanced Topics
  - references/network-infrastructure-fundamentals.md — Network Infrastructure Fundamentals
  - references/sd-wan-mpls.md — SD-WAN vs MPLS — Branch + Hybrid Connectivity
  - references/vrrp-hsrp.md — L2 Redundancy — VRRP / HSRP / CARP / MLAG
## Handoff
- `devops-datacenter` for physical cabling and patch panels.
- `devops-cdn-edge` for global anycast and DDoS scrubbing.
- `devops-cloud-architecture` for cloud VPC and Transit Gateway alongside on-prem.
- `enterprise-high-availability` for app-level LB and failover.
