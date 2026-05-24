# Direct Connect / ExpressRoute / Cloud Interconnect

## Why Dedicated Links
- Lower, predictable latency (sub-ms to cloud region vs ~30ms via Internet)
- Lower egress cost ($0.02/GB vs $0.05-0.12/GB Internet egress)
- Higher throughput consistency (no Internet contention)
- BGP-managed routing, redundancy via multiple links
- SLA-backed by cloud provider + carrier

## Vendor Options

| Cloud  | Service           | Port speeds                  | Pricing model                          |
|--------|-------------------|------------------------------|----------------------------------------|
| AWS    | Direct Connect    | 1G / 10G / 100G              | port + per-GB egress (regional rates)  |
| Azure  | ExpressRoute      | 50M – 100G                   | port + monthly unlimited data or metered |
| GCP    | Cloud Interconnect (Dedicated / Partner) | 10G/100G or 50M-50G | port + per-GB egress |
| OCI    | FastConnect       | 1G / 10G / 100G              | port + egress                          |
| Alibaba| Express Connect   | various                      | port + egress                          |

## Setup Workflow (AWS DX example, ~4-8 weeks)

```
1. Pick AWS DX location (must be one of ~100 colos worldwide where AWS has a presence)
2. Order cross-connect from your cage to AWS at that colo
3. AWS DX port provisioned (1G or 10G dedicated, or via partner: lower speeds)
4. Create Virtual Interfaces (VIFs):
     Private VIF: to VPC (via VGW or DXGW)
     Transit VIF: to Transit Gateway (multi-VPC)
     Public VIF: to AWS public services (S3, etc.)
5. BGP session up; advertise on-prem prefixes; receive cloud prefixes
6. Route on-prem subnet to cloud → encrypted (MACsec or IPsec on top)
7. Test failover (pull cable, verify VPN backup takes over)
```

## Redundancy Patterns

```
SLA target ≥ 99.9%: single DX link
SLA target ≥ 99.99%: 2 links to different DX locations (different MMR rooms, different physical paths)
SLA target ≥ 99.95%: 2 links to same DX location, different ports (covers port failure not location)
+ VPN backup: ALWAYS (handles port + DX network outage)

LAG (Link Aggregation Group): bundle multiple DX ports for higher throughput / hot-spare
```

```
Topology for 99.99%:
  Colo A → AWS DX (us-east-1, location 1)  ┐
  Colo A → AWS DX (us-east-1, location 2)  ┤── BGP ECMP across both
  Colo A → AWS via Internet (VPN backup)   ┘── lowest LOCAL_PREF, used only on DX failure
```

## BGP Configuration

```bash
# FRR on-prem router → AWS DX peer
router bgp 65001
 neighbor 169.254.255.1 remote-as 7224       ! AWS ASN for DX (private VIF)
 neighbor 169.254.255.1 password $BGP_KEY
 neighbor 169.254.255.1 timers 10 30
 neighbor 169.254.255.1 description AWS-DX-Primary

 ! Backup tunnel via Internet IPSec
 neighbor 10.255.0.1 remote-as 64512
 neighbor 10.255.0.1 description AWS-VPN-Backup

 address-family ipv4 unicast
  network 10.10.0.0/16
  neighbor 169.254.255.1 prefix-list on-prem-out out
  neighbor 169.254.255.1 route-map prefer-dx in
  neighbor 10.255.0.1 prefix-list on-prem-out out
  neighbor 10.255.0.1 route-map prefer-vpn in

route-map prefer-dx permit 10
  set local-preference 200            ! prefer DX over VPN

route-map prefer-vpn permit 10
  set local-preference 100            ! backup
```

## ExpressRoute Specifics (Azure)

```
ExpressRoute SKUs:
  Standard:   peering within geopolitical region
  Premium:    global routing, larger route counts, Microsoft 365 connectivity
  Local:      ExpressRoute local SKU, single metro, unlimited data, cheaper

ExpressRoute Direct: connect at 10G or 100G physical ports directly to Microsoft network
                     (vs through a provider/exchange)

Billing:    Metered (per-GB egress) or Unlimited (flat rate per port speed)
            Unlimited is better above ~30 TB/month outbound
```

## Cloud Interconnect Specifics (GCP)

```
Dedicated:   10G or 100G, direct to Google PoP, contract 1-3 year, lowest $/GB
Partner:     50M to 50G via carrier, fast provisioning, slightly more per-GB

VLAN attachments: logical interfaces over physical port (multiple VPC peering on one port)
Cloud Router:   manages BGP peering on Google side
```

## Cloud Exchange (Megaport / Equinix Fabric)

```
You: 1 physical cross-connect to exchange provider's switch
They: virtual circuits (VXC) to any cloud / SaaS / IXP on demand

Benefits:
  - Multi-cloud from single physical port
  - Spin up / tear down VXCs in minutes (vs weeks for DX)
  - Often lower per-Mbps cost than direct DX for smaller speeds
  - Reach multiple regions of multiple clouds simultaneously

Use case: agile multi-cloud, DR pivot, project-based capacity
```

## MACsec / Encryption

```
MACsec:     802.1AE L2 encryption on DX ports (AWS supports on 10G/100G dedicated)
            No throughput penalty, line-rate encryption in hardware

IPsec:      L3 over DX or VPN, adds 5-15% overhead
            Required for regulated data even over DX in some compliance regimes
```

## Egress Cost Math

```
AWS Internet egress:        $0.05-0.09/GB (volume-tiered)
AWS DX egress:              $0.02-0.03/GB (regional)
On 100 TB/month:
  Internet:                  $5,000-9,000
  DX:                        $2,000-3,000
  Savings: $3-6k/month at this scale
Break-even on DX port (~$1,800/month for 10G): around 20-50 TB/month egress
```

## Latency Expectations

```
On-prem ↔ same-region cloud via DX:    1-5 ms (depends on colo distance to cloud PoP)
On-prem ↔ cloud via Internet VPN:      10-100 ms (Internet variability)
On-prem ↔ cross-region cloud via DX:   30-150 ms (still hits intra-cloud backbone)
```

## Failover Test Cadence

```
Monthly: artificial DX port disable (BGP shutdown) → verify VPN takeover < 30s
Quarterly: full DX location failover (if multi-location) → verify second site carries
Annual: VPN-only operation drill (DX down both sites) → verify all critical workloads survive
```

## Common Failures

- Single DX link → outage on port / fiber cut / DX router maintenance
- No VPN backup → outage on DX network-wide issue
- BGP password not set → potential session hijack
- Prefix filters missing → cloud receives full on-prem table, accidentally announces back
- LAG misconfig → traffic on one link only despite 2 ports
- MTU mismatch (1500 on DX vs 9000 expected) → silent fragmentation
- Forgotten cross-connect billing → port disconnect during contract renewal
- BGP path attributes not tuned → asymmetric routing, debug hell
