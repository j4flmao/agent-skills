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
version: "2.0.0"
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

## Architecture Decision Trees

### Fabric Topology Selection
| Topology | East-West BW | Scalability | Cost | Best For |
|---|---|---|---|---|
| Leaf-spine (Clos) | Excellent | 1000s of nodes | Medium-High | Modern DC, storage, K8s |
| Hub-spoke | Poor | <100 nodes | Low | Branch offices, small DC |
| Full-mesh | Excellent | <8 nodes | Low (small) | Small clusters only |
| 3-stage Clos | Excellent | ~500 racks | Medium | Most DC deployments |
| 5-stage Clos | Excellent | 1000+ racks | High | Hyperscale |

### Underlay Routing Protocol Comparison
| Protocol | Convergence | Complexity | ECMP | Best For |
|---|---|---|---|---|
| BGP unnumbered | Sub-second (BFD) | Low | Yes (up to 128-way) | Modern DC, FRR/SONiC |
| OSPF | Seconds | Low | Yes (up to 32-way) | Small-medium, classic |
| ISIS | Sub-second | Medium | Yes (up to 128-way) | ISP, hyperscale |
| Static | None | Lowest | No | Edge, simple branches |

### BGP Route Policy Decision Tree
```
Ingress preference:
  Is peer at IX?
  ├── Yes → LOCAL_PREF 200 (cheaper peering)
  └── No → Is peer transit?
      ├── Yes → LOCAL_PREF 100 (paid transit)
      └── No → LOCAL_PREF 50 (backup)

Egress preference:
  Is prefix ours?
  ├── Yes → MED 100, prepend AS once
  └── No → Do we need AS prepend?
      ├── Yes → prepend 2-3 times for less-preferred path
      └── No → standard MED
```

### Overlay Protocol Comparison
| Protocol | L2 Stretch | L3 Isolation | Control-Plane | Best For |
|---|---|---|---|---|
| EVPN/VXLAN | Yes | 16M VNIs | BGP MP-BGP | Multi-tenant DC |
| VLAN | Yes | 4094 VLANs | STP/RSTP | Simple L2 networks |
| MPLS L3VPN | No | Yes | LDP/RSVP-TE | ISP, WAN |
| VXLAN (static) | Yes | 16M VNIs | Static | Simple overlay |
| Geneve | Yes | 16M+ VNIs | EVPN | Modern, extensible |

### Network Vendor Comparison
| Vendor | Switching | Routing | Automation | Best For |
|---|---|---|---|---|
| Arista | EOS VXLAN/EVPN | BGP, ISIS | CloudVision, eAPI | DC leaf-spine |
| Cisco Nexus | NX-OS VXLAN/EVPN | BGP, OSPF | NX-API, Ansible | Enterprise DC |
| Juniper | Junos EVPN | BGP, ISIS | PyEZ, Ansible | ISP, large DC |
| FRR (Linux) | Linux bridge | BGP, OSPF | Ansible, Cumulus | White-box, DIY |
| SONiC | Switch abstraction | BGP | Redis DB, K8s | Hyperscale, OCP |
| Aruba CX | VSX, EVPN | BGP, OSPF | AOS-CX Ansible | Campus + DC |

## Quick Start
Leaf-spine topology → BGP unnumbered underlay → EVPN/VXLAN overlay (if needed) → BGP multi-homing for north-south → Anycast for DNS/API → VRRP for L2 redundancy → MTU 9216 core → Monitoring with Prometheus + SNMP.

## Core Workflow

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

### Step 8: BGP Configuration — Arista EOS
```eos
! Arista EOS leaf switch BGP config
router bgp 65001
 router-id 10.0.0.1
 maximum-paths 4 ecmp 128
 neighbor SPINE-PEERS peer-group
 neighbor SPINE-PEERS remote-as 65000
 neighbor SPINE-PEERS bfd
 neighbor SPINE-PEERS timers 3 9
 neighbor SPINE-PEERS route-map FROM-SPINE in
 neighbor SPINE-PEERS route-map TO-SPINE out
 neighbor 10.0.1.0 peer-group SPINE-PEERS
 neighbor 10.0.1.1 peer-group SPINE-PEERS
 neighbor 10.0.1.2 peer-group SPINE-PEERS
 neighbor 10.0.1.3 peer-group SPINE-PEERS
 !
 address-family ipv4
  neighbor SPINE-PEERS activate
  network 10.0.0.1/32
  network 198.51.100.0/24
 !
 address-family evpn
  neighbor SPINE-PEERS activate
  advertise all-vni
```

### Step 9: EVPN/VXLAN Configuration — Arista
```eos
! Configure VXLAN on leaf
interface Vxlan1
 description EVPN VXLAN overlay
 vxlan source-interface Loopback0
 vxlan udp-port 4789
 vxlan vlan 100 vni 10100
 vxlan vlan 200 vni 10200
 vxlan vlan 300 vni 10300
 vxlan learn-restrict-any-vni
 vxlan flood vtep 10.0.0.2
 vxlan flood vtep 10.0.0.3
 vxlan flood vtep 10.0.0.4

! EVPN address-family already under BGP
! Type-2 routes for MAC/IP advertisement
! Type-5 routes for IP prefix advertisement
```

### Step 10: BGP Prefix Filtering
```bash
! RPKI-based prefix validation
route-map FROM-TRANSIT permit 10
 match rpki valid
 set local-preference 100
!
route-map FROM-TRANSIT permit 20
 match rpki not-found
 set local-preference 50
!
route-map FROM-TRANSIT deny 30
 match rpki invalid
!

! Prefix filter — only accept our prefix
ip prefix-list OUR-BLOCKS seq 5 permit 198.51.100.0/24
route-map TO-TRANSIT permit 10
 match ip address prefix-list OUR-BLOCKS
```

### Step 11: EVPN Multi-Homing (Ethernet Segment)
```eos
! On leaf switches connected to same server
interface Ethernet3
 description Server-01 bond0
 switchport access vlan 100
 evpn ethernet-segment
  identifier 00:01:01:00:00:01:00:00:00:01
  df-election method preference
  df-election preference 150  ! higher priority leaf
  mpls bgp df-election include-pref-len
 lacp system-id 00:01:01:00:00:01
 spanning-tree portfast
```

### Step 12: Carrier Diversity
```
Tier-1: ≥ 2 transit + ≥ 2 IX peering
Fiber entry: 2 physical entries to building (different geographic paths)
Conduit: separate conduits, ideally different sides of building
Provider: avoid two carriers riding same physical fiber underneath
Test: actual run from carrier maps; insist on diverse routes in SLA
```

### Step 13: QoS and Traffic Shaping
```
Classify at edge:
  EF (46): VoIP, real-time       — strict priority, 5% BW
  AF41 (34): video, interactive   — guaranteed BW, 20%
  AF31 (26): critical data, DB    — guaranteed BW, 30%
  AF21 (18): standard web         — scavenger, 30%
  BE (0): best-effort             — remaining, 15%
  
Apply on all uplinks: shape, queue, police inbound to protect fabric.
```

### Step 14: Network Automation — Ansible
```yaml
# ansible/bgp-config.yaml
- name: Configure BGP on leaf switches
  hosts: leaf_switches
  gather_facts: no
  vars:
    leaf_asn: 65001
    spine_asn: 65000
  tasks:
  - name: Deploy BGP config
    arista.eos.eos_config:
      src: bgp-leaf.j2
      backup: yes
    notify: save config
  
  - name: Verify BGP neighbors
    arista.eos.eos_command:
      commands:
        - show bgp summary | json
    register: bgp_summary
    failed_when: bgp_summary.stdout[0].vrfs.default.peers | length < 4

  handlers:
  - name: save config
    arista.eos.eos_command:
      commands:
        - write memory
```

### Step 15: Network Automation — Nornir
```python
# nornir/bgp_check.py
from nornir import InitNornir
from nornir_netmiko import netmiko_send_command
from nornir_utils.plugins.functions import print_result

nr = InitNornir(config_file="config.yaml")

def check_bgp_peers(task):
    result = task.run(
        task=netmiko_send_command,
        command_string="show bgp summary",
        use_textfsm=True,
    )
    bgp_data = result[0].result
    peers_up = sum(1 for p in bgp_data if p.get('state') == 'Established')
    task.host["bgp_peers_up"] = peers_up
    if peers_up < 4:
        return f"WARNING: Only {peers_up} BGP peers established"

results = nr.run(task=check_bgp_peers)
print_result(results)
```

### Step 16: DOCSIS / Fiber OLT Access (Last Mile)
For ISPs or edge POPs, apply cable access standards. DOCSIS 3.1 supports 10G down/1G up.
GPON/XGS-PON for fiber to the home. Use BNG (Broadband Network Gateway) for subscriber management.

### Step 17: Monitoring Tools and KPIs
```
BGP neighbor state          up/down + uptime + prefixes received
Interface counters          errors, drops, throughput per port
ECMP hash distribution      uneven = polarization, retune hash
Latency to upstream peers   ping / mtr from edge to {transit, peer}
DDoS / volume anomaly       netflow / sFlow / IPFIX export
Switch CPU/memory           control-plane load
Fabric utilization          per-spine / per-leaf link utilization
Optics DOM                  temperature, TX power, RX power, bias current
```

Tools: librenms, observium, Prometheus + snmp_exporter, flow collector (akvorado, pmacct),
oxidized for config backup, batfish for config validation.

## Anti-Patterns

### Anti-Pattern 1: Single-Carrier Uplink
Full outage during carrier maintenance. Always multi-home to ≥ 2 transit providers. Use BGP with LOCAL_PREF to prefer primary, prepend AS for backup path.

### Anti-Pattern 2: Mixing MTU Within a Path
One link at 1500 in a 9000 path causes silent fragmentation and blackhole connections. Verify end-to-end with `ping -M do -s 8972`. Document MTU per link in DCIM.

### Anti-Pattern 3: No BGP Filtering
Accepting full BGP table from non-transit peers. Always deploy prefix lists inbound and outbound on every eBGP session. Use RPKI ROA validation to reject invalid prefixes.

### Anti-Pattern 4: L2 Loop with STP
Spanning tree disables redundant links to prevent loops. Use MLAG/VPC for L2 redundancy instead. STP should only be a safety net, never the primary redundancy mechanism.

### Anti-Pattern 5: Oversubscription > 5:1 on Storage Fabric
Storage traffic (Ceph, iSCSI, NFS) requires predictable throughput. Oversubscription above 5:1 creates contention. Design storage fabric at 1:1 or 3:1 maximum.

### Anti-Pattern 6: Manual Config Only
Config drift, no audit trail, no rollback capability. All changes must go through NetOps automation (Ansible, Nornir, Salt). Enable config backup with oxidized.

### Anti-Pattern 7: Flat Network (No L3 Segmentation)
Broadcast storms, large blast radius, no tenant isolation. Use VLANs or VXLAN for segmentation. Route at the leaf layer — never stretch L2 across the fabric unnecessarily.

### Anti-Pattern 8: Single Fiber Entry into Building
Backhoe fade takes out entire site regardless of carrier diversity. Ensure two physical fiber entries from different geographic paths. Separate conduits and building entry points.

### Anti-Pattern 9: Ignoring ECMP Polarization
Poor hash algorithms cause uneven flow distribution across ECMP paths. Use enhanced hashing (include L4 ports, entropy fields). Test with `show ip load-sharing` on Arista/Cisco.

### Anti-Pattern 10: No BFD Configuration
BGP hold timers alone (30-120s) are too slow for modern DC failover. Always enable BFD for sub-second detection (3x 300ms = 900ms detect). Tune BGP timers to 3s keepalive, 9s hold as backup.

## Production Considerations

### High Availability
- Deploy BFD with 300ms interval for sub-second failure detection.
- Use Anycast for DNS, NTP, and stateless API gateways across POPs.
- MLAG/VPC + VRRP/HSRP for L2 device redundancy at ToR layer.
- Route reflectors at spine layer to avoid full iBGP mesh between leaves.
- Design for 50% headroom on spine uplinks during any single link failure.
- Quarterly fail-test: pull one uplink / one switch and verify auto-recovery.

### Security
- RPKI ROA published for owned prefixes; RPKI validation inbound on all eBGP sessions.
- Prefix filters on every eBGP session (in AND out).
- Max-prefix limits on all neighbor sessions to prevent route table overflow.
- Control-plane policing (CoPP) to protect switch CPU from DoS.
- MACsec for intra-fabric encryption if required by compliance.
- Management VRF for out-of-band management access.

### Performance
- ECMP across all leaf-spine uplinks; flow-hash tuned to avoid polarization.
- MTU 9216 in core, 1500 at edge, consistent within each domain.
- Use jumbo frames for storage and backup traffic (Ceph, iSCSI, NFS).
- Tune buffer allocation on spine switches for deep-buffered workloads.
- Monitor optics DOM for predictive failure detection.

### Operational Excellence
- Color-code and label both ends of every fiber patch for ops clarity.
- Use digital optical monitoring (DOM) on all optics to predict failures.
- All changes via NetOps automation, never manual on prod.
- Separate underlay (loopbacks) from overlay (VNI) addressing plan.
- Run BGP timers aggressively: 3s keepalive, 9s hold for ToR-to-spine.
- NetFlow/sFlow export from every ToR for capacity planning + DDoS detection.

## Security Considerations
| Threat | Mitigation | Implementation |
|---|---|---|
| BGP hijack | RPKI ROA + prefix filters | Route-map match rpki valid |
| Route table flooding | Max-prefix limit | `neighbor max-prefix 1000` |
| ARP spoofing | Dynamic ARP Inspection | DAI on all access VLANs |
| DHCP spoofing | DHCP Snooping | Trust uplink ports only |
| MAC flooding | Port Security + MAC limiting | `switchport port-security` |
| Control-plane DoS | CoPP | Aggregate control-plane ACL |
| Unauthorized access | AAA + management VRF | TACACS+/RADIUS on mgmt VRF |
| VLAN hopping | Disable DTP, restrict trunk | `switchport nonegotiate` |
| STP attack | BPDU Guard | `spanning-tree bpduguard enable` |
| MACsec encryption | IEEE 802.1AE | Key agreement via EAP |

## Rules
- Multi-home BGP from day one for any north-south critical traffic.
- ECMP across all leaf-spine uplinks; flow-hash tuned to avoid polarization.
- MLAG/VPC + VRRP/HSRP for L2 device redundancy.
- MTU end-to-end consistent within a domain.
- RPKI ROA published for owned prefixes; RPKI validation inbound.
- Prefix filters on every eBGP session (in AND out).
- Carrier diversity: ≥ 2 physical fiber entries, different conduits.
- IPv6 dual-stack everywhere; IPv6-only acceptable for greenfield.
- All changes via NetOps automation, never manual on prod.
- Quarterly fail-test: pull one uplink / one switch and verify auto-recovery.
- Deploy QoS classification at edge; trust boundaries on all uplinks.
- NetFlow/sFlow export from every ToR for capacity planning + DDoS detection.

## References
  - references/bgp-anycast.md — BGP + Anycast — Policy, RPKI, Multi-Homing
  - references/leaf-spine.md — Leaf-Spine — Clos Fabric, ECMP, EVPN/VXLAN
  - references/network-infrastructure-advanced.md — Network Infrastructure Advanced Topics
  - references/network-infrastructure-fundamentals.md — Network Infrastructure Fundamentals
  - references/sd-wan-mpls.md — SD-WAN vs MPLS — Branch + Hybrid Connectivity
  - references/vrrp-hsrp.md — L2 Redundancy — VRRP / HSRP / CARP / MLAG
  - references/evpn-vxlan-deep-dive.md — EVPN/VXLAN Deep Dive
  - references/bgp-automation.md — BGP Automation with Ansible
## Handoff
- `devops-datacenter` for physical cabling and patch panels.
- `devops-cdn-edge` for global anycast and DDoS scrubbing.
- `devops-cloud-architecture` for cloud VPC and Transit Gateway alongside on-prem.
- `enterprise-high-availability` for app-level LB and failover.
