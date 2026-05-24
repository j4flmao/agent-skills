# SD-WAN vs MPLS — Branch + Hybrid Connectivity

## When You Need This
Multi-site enterprise: branch offices, retail stores, factories, edge POPs, all needing reliable
back to HQ / DC / cloud, with QoS for voice/video, and resilient enough to survive single-link
failure.

## Options at a Glance

| Approach   | Cost          | Reliability    | Flexibility | Best for                          |
|------------|---------------|----------------|-------------|-----------------------------------|
| MPLS       | $$$ (per Mbps)| Carrier-grade  | Low         | Voice, ERP, legacy WAN, latency-sensitive |
| IPSec VPN  | $ (Internet)  | Internet quality | High      | Small branches, cheap             |
| SD-WAN     | $$ (boxes + Internet) | Good with multi-path | High | Modern WAN, multi-path, app-aware |
| Direct Connect / ExpressRoute | $$$ | Carrier-grade | Medium | DC ↔ cloud                  |
| SASE       | $$ subscription | Vendor-managed | High | Cloud-first, distributed users   |

## MPLS (legacy gold standard)

```
+-----+       +--------+       +-----+
| HQ  |--MPLS-|Carrier |-MPLS--|Site2|
+-----+       |  PE    |       +-----+
              | router |
              +--------+
                  |
                  MPLS
                  |
              +-----+
              |Site3|
              +-----+
```

- L3 VPN (RFC 4364) with VRFs per customer
- Carrier provides predictable latency / jitter, SLA-backed
- Class-of-Service (CoS) for voice / video / data
- Expensive ($50-500/Mbps depending on region)
- Slow to provision (weeks)
- Vendor-locked to that carrier

Modern usage: legacy ERP, voice trunks, latency-sensitive workloads.

## SD-WAN (modern)

Software-defined overlay across any underlay (Internet, MPLS, 4G/5G). Centralized controller
makes app-aware routing decisions.

```
+----------+         Internet   ┌────────┐
| Branch  |---LTE---┐    ┌─────│Cloud   │
| SD-WAN  |---Bcast-┼────┤     │Gateway │
+----------+   MPLS-┘    │     └────────┘
                         │
                  Controller (orchestrates policy)
                         │
+----------+   Internet  │
|   HQ    |--MPLS--------┤
| SD-WAN  |--Bcast-------┘
+----------+
```

Vendors:
```
Cisco Viptela          mature, complex, premium
VMware VeloCloud       acquired, broad support
Fortinet Secure SD-WAN integrated with FortiGate firewalls
Palo Alto Prisma SD-WAN combined with security stack
Versa Networks         feature-rich, smaller foot
Open source (Flexiwan, libreqos) growing
```

Capabilities:
- Multi-path: use Internet + MPLS + LTE simultaneously, fail-over in milliseconds
- App-aware: send Office365 direct via Internet break-out, send ERP via MPLS
- Built-in IPsec encryption between sites
- Zero-touch provisioning at branches
- Centralized policy + monitoring

## SD-WAN vs MPLS Cost Math

```
Branch site, 100 Mbps requirement:
  MPLS:           $5,000/month per site
  SD-WAN over 2× Internet ($500 each) + LTE ($200): $1,200/month
  Savings:        $3,800/month per branch

Tradeoff: SD-WAN over Internet has variable performance; SLA depends on ISP best-effort.
Hybrid (1× MPLS + 1× Internet via SD-WAN) = compromise: guaranteed path + cost savings on bulk.
```

## IPSec VPN (basic alternative)

```
site-to-site IKEv2 IPSec tunnels
mesh or hub-and-spoke
free (only Internet cost)
manual failover (or BGP over GRE/IPSec)
no app-awareness
```

Good for: small branches, dev environments, fallback path.

## Routing Over WAN

```
Static routes        small / single path
OSPF over GRE        legacy
BGP over IPSec       modern, supports multi-path
SD-WAN underlay      vendor handles, abstracted from operator
```

```bash
# Simple IPSec + BGP example (StrongSwan + FRR)
# /etc/ipsec.conf
conn site2
  left=203.0.113.1
  leftsubnet=10.10.0.0/16
  right=198.51.100.5
  rightsubnet=10.20.0.0/16
  authby=secret
  ike=aes256gcm16-sha512-modp4096
  esp=aes256gcm16
  auto=start

# /etc/frr/frr.conf
router bgp 65010
 neighbor 10.255.0.2 remote-as 65020
 address-family ipv4 unicast
  network 10.10.0.0/16
```

## QoS / Traffic Shaping

```
Voice (RTP):       EF (Expedited Forwarding), priority queue, ≤ 30% link bandwidth
Video conf:        AF41, bandwidth-guaranteed queue
Business critical: AF31, weighted queue
Bulk / backup:     AF11 or BE, lowest priority

Edge marker:       trust DSCP from app, or remark based on 5-tuple ACL
Core:              honor markings, queue accordingly
```

## DC ↔ Cloud Direct Connection

```
AWS Direct Connect           dedicated 1G/10G/100G cross-connect
GCP Cloud Interconnect       same idea, GCP-native
Azure ExpressRoute           same, Azure
Oracle FastConnect           OCI

Speed:    sub-ms to cloud region (vs ~30ms via Internet)
Cost:     port + cross-connect + per-GB egress (cheaper than Internet egress)
Lead:     4–8 weeks setup
```

Always pair with VPN over Internet as backup (DC ↔ cloud should never be single-pathed).

## SASE (Secure Access Service Edge)

```
SD-WAN + SWG + CASB + ZTNA + FWaaS, vendor-managed cloud-native
Examples: Zscaler, Netskope, Cato, Palo Alto Prisma Access, Cloudflare One

Pro: distributed user model, cloud-first
Con: vendor lock-in, opacity, monthly cost
```

## Common Failures

- Single Internet circuit + IPsec VPN → branch down on ISP outage
- Manual route table per site → out of sync rapidly
- No QoS → voice quality drops under load
- MPLS only → cost-prohibitive at scale, can't break-out cloud traffic
- SD-WAN with no MPLS fallback for critical apps → still subject to Internet variability
- Trusting Internet ISP SLAs literally (usually 99.5% best-effort)
