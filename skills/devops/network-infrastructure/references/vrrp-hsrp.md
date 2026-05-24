# L2 Redundancy — VRRP / HSRP / CARP / MLAG

## The Problem
A host has one default gateway IP. If the gateway router dies, the host stops sending Internet
traffic — even if a second router is sitting right next to it. L2 redundancy protocols share
a virtual IP between routers so the gateway survives single-device failure.

## Protocol Map

| Protocol  | Origin    | Standard       | Notes                          |
|-----------|-----------|----------------|--------------------------------|
| VRRP      | IETF      | RFC 5798       | Vendor-neutral, default choice |
| HSRP      | Cisco     | proprietary    | Cisco shops                    |
| CARP      | OpenBSD   | open           | BSD / pf-based firewalls       |
| GLBP      | Cisco     | proprietary    | Adds load-balancing            |

For mixed-vendor: VRRP. For Cisco-only shops: HSRP works fine.

## VRRP Mechanics

```
Two routers share virtual IP 10.0.0.1 (VRID = 1)
  Router A: real IP 10.0.0.2, priority 110 (preferred = MASTER)
  Router B: real IP 10.0.0.3, priority 100 (BACKUP)

MASTER sends VRRP advertisements every 1s (default)
BACKUP listens; if no adverts for 3s → election → BACKUP becomes MASTER
Sub-second failover with tuned timers
```

```
# Cisco IOS-XE example
interface Vlan10
 ip address 10.0.0.2 255.255.255.0
 vrrp 1 ip 10.0.0.1
 vrrp 1 priority 110
 vrrp 1 preempt
 vrrp 1 authentication text vrrp-secret
 vrrp 1 timers advertise 1
```

```
# FRR / Linux (keepalived) example
vrrp_instance VI_10 {
  state MASTER
  interface eno1
  virtual_router_id 1
  priority 110
  advert_int 1
  authentication { auth_type PASS; auth_pass secret }
  virtual_ipaddress { 10.0.0.1/24 }
  preempt
}
```

## HSRP (Cisco)

```
interface Vlan10
 ip address 10.0.0.2 255.255.255.0
 standby version 2
 standby 1 ip 10.0.0.1
 standby 1 priority 110
 standby 1 preempt
 standby 1 timers 1 3        ! hello 1s, dead 3s
 standby 1 authentication md5 key-string secret
```

## CARP (OpenBSD / pfSense / OPNsense)

```
ifconfig carp0 create
ifconfig carp0 vhid 1 pass secret 10.0.0.1/24 advskew 0 group 1
# Second node: advskew 100 (backup)
```

## Tuned Timers for Sub-Second Failover

```
Defaults (VRRP): 1s advert, 3 missed = ~3s failover
Tuned:           100-300ms advert, ~500ms total failover

# VRRP fast timer
vrrp 1 timers advertise msec 200       ! cisco
advert_int 0.2                          ! keepalived (some versions)
```

Don't tune too aggressive — flapping under CPU spike causes false failovers.

## MLAG / VPC — The Better Pattern

VRRP gives gateway redundancy but doesn't solve link bundling. MLAG (multi-chassis LAG) lets a
single LACP bundle span two physical switches, so the server sees one logical link to two
redundant switches.

```
Server NIC1 → Switch A ┐
Server NIC2 → Switch B ┘  → LACP bond, both active
              \           /
               peer link (16x100G typical)
                MLAG control plane (Arista MLAG / Cisco vPC / Cumulus CLAG)
```

```
# Arista MLAG sample
mlag configuration
 domain-id rack1
 local-interface Vlan4094
 peer-address 169.254.1.2
 peer-link Port-Channel100
!
interface Port-Channel1
 mlag 1
 switchport mode access
 switchport access vlan 10
```

Benefits:
- LACP, no STP blocking
- Failover when one switch dies = LACP renegotiates → sub-second
- Combine with VRRP/HSRP on the gateway IP for full redundancy

## Combined VRRP + MLAG (best practice)

```
Server bond0 (LACP) → Leaf-A + Leaf-B (MLAG pair)
                         │           │
                       VRID 1 on default gateway
                  MASTER (Leaf-A, prio 110) / BACKUP (Leaf-B)
                         │           │
                  Both reach spine layer
```

Test plan:
1. Pull NIC cable from server to Leaf-A → LACP failover, no app drop
2. Power off Leaf-A → MLAG peer detects, takes over LACP role, VRRP fails over
3. Restart Leaf-A → comes back as backup
4. Total user-observed downtime: <1s for app traffic

## STP — The Old Way (avoid for new builds)

```
Rapid Spanning Tree (RSTP/MSTP) blocks redundant L2 links to prevent loops
Failover: 6-50 seconds (too slow for modern apps)
Modern: build with L3 routing or MLAG; use STP only as safety net
Always set: BPDU guard on edge ports; root guard on uplinks
```

## Anycast Gateway (modern alternative)

EVPN/VXLAN supports anycast gateway: same gateway IP on ALL leaves; server traffic to that IP
egresses locally. Eliminates the VRRP active/backup question — both are active.

```
SVI on each leaf:
  ip address 10.0.0.1 255.255.255.0    ! same on every leaf
  ip virtual-router mac-address 0001.0001.0001
```

Pattern of choice for new EVPN/VXLAN fabrics.

## Failover Test Cadence

```
Monthly automated: pull one uplink, verify ≤ 1s app blip
Quarterly: power-off one router, verify VRRP transition + traffic continuity
Annual: full L2 fabric failover drill (with monitoring captures)
```

## Common Failures

- Asymmetric timers between MASTER and BACKUP → flapping
- Preempt off → BACKUP stays MASTER after primary recovers (intentional or bug?)
- VRRP authentication key mismatch → both routers think they're MASTER (active/active L2 loop)
- MLAG peer-link down but both switches still up → split-brain, dual-active
- Bond mode not LACP (e.g., active-backup) → unable to use both NICs simultaneously
- No BPDU guard on edge → user laptop plugs in switch → loop disaster
