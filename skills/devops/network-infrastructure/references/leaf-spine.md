# Leaf-Spine — Clos Fabric, ECMP, EVPN/VXLAN

## Why Leaf-Spine
Traditional 3-tier (access-aggregation-core) was built for north-south traffic. Modern workloads
(K8s, Ceph, distributed DBs) are heavily east-west — server-to-server within the DC. Leaf-spine
gives predictable, equal latency between any two ToR switches via ECMP.

## Topology

```
   Spine layer (no servers attached)
   ┌────┐ ┌────┐ ┌────┐ ┌────┐
   │ S1 │ │ S2 │ │ S3 │ │ S4 │
   └─┬┬─┘ └─┬┬─┘ └─┬┬─┘ └─┬┬─┘
     ││     ││     ││     ││
     ◊◊─────◊◊─────◊◊─────◊◊       all leaves to all spines
     ││     ││     ││     ││
   ┌─┴┴─┐ ┌─┴┴─┐ ┌─┴┴─┐ ┌─┴┴─┐
   │ L1 │ │ L2 │ │ L3 │ │ Ln │     leaf = ToR switch
   └─┬─┬┘ └─┬─┬┘ └─┬─┬┘ └─┬─┬┘
     │ │   │ │   │ │     │ │
   servers in rack
```

Every leaf has one (or two, redundant) uplink to every spine. Equal-cost paths → ECMP load-share.

## Sizing

```
Per leaf:
  Server-facing ports (e.g., 48 × 25G = 1.2 Tbps)
  Spine-facing ports (e.g., 8 × 100G = 800 Gbps)
  Oversubscription = 1200 / 800 = 1.5 : 1

Per spine:
  Leaf-facing ports = number of leaves × leaf-uplink-count / spine-count
  Choose spine port count to support max leaves

Pod = group of leaves all connecting to same set of spines
Super-spine layer (5-stage Clos) connects multiple pods at hyperscale
```

## Hardware Choices

```
SONiC (open NOS)          Microsoft-led, runs on whitebox / brite-box
Arista EOS                premium commercial, mature, expensive
Cisco Nexus               commercial, NX-OS, big enterprise
Juniper QFX               commercial, Junos, large ISPs
Cumulus Linux (NVIDIA)    Debian-based, "Linux on switch"
FRR on whitebox           DIY routing on bare switch hardware

Common chip vendors: Broadcom (Tomahawk, Trident), NVIDIA Spectrum, Marvell.
```

## Underlay Routing — BGP Unnumbered

Modern fabric: each link uses IPv6 link-local for BGP next-hop, no per-link IP management.

```bash
# FRR / SONiC
router bgp 65101
 bgp router-id 10.0.0.101
 bgp bestpath as-path multipath-relax
 neighbor swp1 interface remote-as external      # auto-detect via LLDP
 neighbor swp2 interface remote-as external
 neighbor swp3 interface remote-as external
 neighbor swp4 interface remote-as external
 address-family ipv4 unicast
  network 10.0.0.101/32                          # loopback
  maximum-paths 16                                # ECMP across 16 spines
```

Each leaf in own ASN, each spine in own ASN (or shared). Pattern: AS 65000-65535 (private).

## ECMP Hashing

```
Hash inputs (typical): src-IP, dst-IP, src-port, dst-port, protocol (5-tuple)

Polarization: same hash function across multiple layers can map flows unevenly.
Fix: per-device seed, or symmetric hashing where applicable.

Monitor flow distribution per uplink — significant skew = retune hashing.
```

## EVPN / VXLAN Overlay

Run L3 underlay (above), L2 stretch via VXLAN encapsulation, distributed via BGP EVPN.

```
Tenant data plane:
  Server frame → VTEP (vxlan tunnel endpoint, on leaf) → UDP encap → spine → far leaf VTEP → server

Control plane:
  Leaf advertises locally-learned MACs via BGP EVPN Type-2
  Leaf advertises IP prefixes via BGP EVPN Type-5
  Other leaves install forwarding entries

VNI = VXLAN Network Identifier (24-bit; 16M segments)
RT = Route Target (BGP community for import/export between VRFs)
RD = Route Distinguisher (per-VRF disambiguation)
```

```
sample (SONiC / FRR):
router bgp 65101
 address-family l2vpn evpn
  neighbor swp1 activate
  neighbor swp2 activate
  advertise-all-vni

vrf TENANT1
 vni 10001
 ip route 0.0.0.0/0 10.10.0.1
```

## MTU + Jumbo Frames

```
Underlay MTU ≥ 9216 (jumbo + VXLAN 50-byte header + room)
Server MTU = 9000 (typical) for storage VLANs; 1500 for default
```

VXLAN adds ~50 bytes (outer Eth + IP + UDP + VXLAN header). Underlay MTU MUST exceed payload MTU
+ encap or you get blackholing on jumbo frames (DF set, can't fragment).

## Failure Domain Math

```
Lose 1 spine of 4: capacity drops 25%, all leaves still reach all leaves
Lose 1 leaf: only servers in that rack affected
Lose 1 server uplink (if MLAG): no impact

Power: each spine on different power feed; each leaf on rack's A+B feeds
```

## MLAG / VPC (Multi-Chassis LAG)

```
2 leaves per rack, paired with MLAG/VPC peer-link
Server has 2 NICs → LACP bond → one bond to both leaves
Survives single leaf failure with sub-second hashflow
```

Vendor names: Arista MLAG, Cisco vPC, Cumulus CLAG, SONiC MC-LAG.

## Greenfield Recipe (Tier-1 capable)

```
- 4 spines × 32 × 100G each (132 leaves max with 1 uplink each, or 33 with 4 uplinks)
- N leaves × 48 × 25G server + 4 × 100G uplink to each spine
- BGP unnumbered underlay, EVPN/VXLAN if multi-tenant L2 needed
- MLAG pairs at each rack
- Out-of-band mgmt switch separate fabric, with own L2 to BMC VLAN
- Jumbo (9216) on underlay; 9000 on storage VLAN; 1500 on default
```

## Monitoring

```
Per port: bps, pps, errors, drops, MTU mismatches
Per device: CPU, memory, route table size, BGP neighbor state
Per fabric: ECMP path utilization distribution, flow distribution
Telemetry: gNMI streaming preferred over SNMP for high-rate metrics
```

## Common Failures

- 1:1 oversub assumed but spine bandwidth lower → silent congestion under load
- ECMP polarization across multi-stage fabric → some links idle, others 100%
- MTU inconsistency causing slow path / blackhole on DF set
- VXLAN underlay MTU too small for encap'd jumbo → drops
- Single MLAG peer-link → both switches go split-brain on link failure
- Forgetting to filter inbound BGP between leaves (accept anything)
- No telemetry → debug via tcpdump at 3 a.m.
