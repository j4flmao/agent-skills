# Network Infrastructure Fundamentals

Core networking knowledge for DevOps and infrastructure engineers: layering, IPv4/IPv6 addressing and subnetting, Ethernet and VLANs, routing protocols, NAT, DNS, MTU, load balancing, firewalls, and a troubleshooting toolkit. Data center fabric design is in `leaf-spine.md`; BGP and anycast in `bgp-anycast.md`; first-hop redundancy in `vrrp-hsrp.md`.

## Layers in Practice

| Layer | Examples | Typical failures |
|-------|----------|------------------|
| L1 physical | Optics, cables, link speed/duplex | CRC errors, flapping links, wrong optic type |
| L2 data link | Ethernet, VLAN 802.1Q, LACP 802.3ad, STP | Loops, MAC flapping, VLAN mismatch |
| L3 network | IPv4/IPv6, OSPF, BGP, ICMP | Missing routes, asymmetric routing, MTU black holes |
| L4 transport | TCP, UDP, QUIC (over UDP) | Firewall state timeouts, port exhaustion |
| L7 application | HTTP, DNS, TLS | Certificate errors, DNS misconfiguration |

## IPv4 Addressing

| CIDR | Hosts (usable) | Mask |
|------|----------------|------|
| /32 | 1 (host route) | 255.255.255.255 |
| /31 | 2 (point-to-point, RFC 3021) | 255.255.255.254 |
| /30 | 2 | 255.255.255.252 |
| /24 | 254 | 255.255.255.0 |
| /22 | 1022 | 255.255.252.0 |
| /16 | 65,534 | 255.255.0.0 |

Private ranges (RFC 1918): `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`. Shared address space for carrier-grade NAT: `100.64.0.0/10` (RFC 6598). Plan non-overlapping ranges across VPCs, offices and partners from the start; overlapping space blocks peering and VPNs later.

## IPv6 Essentials

- 128-bit addresses; typical allocation: /48 per site, /64 per subnet (SLAAC requires /64).
- Link-local `fe80::/10` on every interface; unique local addresses `fd00::/8` for internal use; global unicast `2000::/3`.
- Neighbor Discovery (NDP) replaces ARP; ICMPv6 must not be blocked wholesale (needed for NDP and Path MTU discovery).
- Dual-stack is the common migration path; cloud providers support IPv6-only subnets with DNS64/NAT64 for IPv4 reachability.

## Ethernet, VLANs and Link Aggregation

- VLANs segment broadcast domains; trunks carry multiple VLANs with 802.1Q tags; set native VLAN deliberately (or tag all).
- LACP bonds multiple links for bandwidth and redundancy; hashing is per flow, so one flow never exceeds a single member link.
- MLAG / vPC lets a server bond to two switches.
- Spanning Tree prevents loops in L2 domains; modern data centers minimise L2 with routed (L3) designs and EVPN-VXLAN overlays.

## Routing

| Protocol | Type | Use |
|----------|------|-----|
| Static | Manual | Small edges, default routes |
| OSPF | Link-state IGP | Campus and DC underlay; areas for scale |
| IS-IS | Link-state IGP | Service provider and large DC underlays |
| BGP | Path-vector EGP | Internet edge, DC fabrics (eBGP underlay), cloud interconnect, Kubernetes (Calico, Cilium BGP) |

Route selection: longest prefix match first, then administrative distance between protocols, then protocol metric. ECMP spreads flows over equal-cost paths.

## NAT

| Type | Purpose |
|------|---------|
| SNAT / masquerade | Many private hosts share public IPs outbound |
| DNAT / port forwarding | Expose internal service |
| Cloud NAT gateway | Managed SNAT for private subnets |

NAT gateways have per-destination port limits; high-connection workloads can hit SNAT port exhaustion (symptoms: intermittent connection timeouts). Mitigate with more public IPs, connection reuse (keep-alive, pooling), or private endpoints.

## DNS

- Record types: A, AAAA, CNAME (not at zone apex; use provider ALIAS/ANAME), MX, TXT, SRV, NS, CAA, PTR.
- TTLs control propagation speed; lower TTLs before migrations, raise afterwards.
- Split-horizon DNS for internal vs external answers; private hosted zones in clouds.
- Resolver failures cascade: run redundant resolvers, cache locally (NodeLocal DNSCache in Kubernetes), monitor SERVFAIL rates.
- DNSSEC signs zones; CAA restricts which CAs may issue certificates.

## MTU

- Ethernet default 1500 bytes; jumbo frames 9000 (9216 on many switches) inside data centers.
- Encapsulation overhead: VXLAN adds 50 bytes, Geneve 50+ bytes, WireGuard about 60-80, IPsec varies.
- Path MTU discovery needs ICMP "fragmentation needed" (IPv4) / "packet too big" (ICMPv6) to pass; blocking them creates black holes where small packets work and large transfers hang.
- TCP MSS clamping on tunnel edges is a common fix.

## Load Balancing

| Type | Operates on | Examples | Notes |
|------|-------------|----------|-------|
| L4 | IP/port | AWS NLB, IPVS, MetalLB, Maglev-style | Fast, preserves client IP options, no HTTP awareness |
| L7 | HTTP/gRPC | Envoy, NGINX, HAProxy, ALB | Routing by host/path/header, retries, TLS termination |
| DNS/GSLB | Name resolution | Route 53, Cloudflare | Geographic/failover, limited by TTL caching |
| Anycast | Routing | Same IP announced from many sites | See `bgp-anycast.md` |

Health checks should test real dependencies lightly (readiness), not just process liveness.

## Firewalls and Segmentation

- Stateful firewalls/security groups track connections; stateless ACLs need rules for both directions.
- Default deny inbound; restrict east-west traffic with security groups, NetworkPolicies, or microsegmentation.
- Document flows (source, destination, port, purpose) and review periodically.

## Troubleshooting Toolkit

```bash
ip addr; ip route; ip -6 route; ip neigh              # interfaces, routes, ARP/NDP
ping -M do -s 1472 10.0.0.1                           # test 1500 MTU path (IPv4, DF set)
traceroute -T -p 443 example.com ; mtr -rwz example.com
ss -tanp state established                            # sockets
dig +trace example.com ; dig @10.0.0.2 api.internal AAAA
curl -v --resolve api.example.com:443:203.0.113.10 https://api.example.com/health
tcpdump -ni eth0 'host 10.0.1.5 and port 443'
ethtool -S eth0 | grep -i err                         # NIC error counters
```

Method: confirm the layer (link up? IP reachable? port open? application responding?), test from both ends, compare working vs failing paths, and check recent changes.

## Checklist

- [ ] Non-overlapping IP plan across environments and partners; IPv6 strategy defined
- [ ] Redundant links (LACP/MLAG) and gateways (VRRP or routed design)
- [ ] MTU consistent end to end; ICMP needed for PMTUD allowed
- [ ] Redundant DNS resolvers with monitoring
- [ ] SNAT capacity monitored for egress-heavy workloads
- [ ] Default-deny firewalling with documented flows
- [ ] Troubleshooting runbook with the commands above
