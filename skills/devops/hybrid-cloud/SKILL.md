---
name: devops-hybrid-cloud
description: >
  Use this skill when bridging on-prem / colo with public cloud, or running across multiple clouds:
  AWS Direct Connect / Azure ExpressRoute / GCP Cloud Interconnect, site-to-site VPN, identity
  federation (SAML / OIDC / AWS IAM Identity Center / Azure AD), data gravity decisions, multi-cloud
  DNS, hybrid Kubernetes (Anthos, EKS Anywhere, AKS Arc), and split-stack architectures (DB on-prem,
  app on cloud, or vice versa). This skill enforces: dedicated connectivity + VPN backup, identity
  federation source of truth, data-gravity-aware placement, multi-region DNS strategy, cost guardrails
  for cross-cloud egress. Do NOT use for: pure cloud-native single-provider design (see
  devops-aws/gcp/azure), on-prem-only network (see devops-network-infrastructure), DC facility design
  (see devops-datacenter).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, hybrid-cloud, multi-cloud, direct-connect, federation, phase-2]
---

# DevOps Hybrid Cloud

## Purpose
Connect on-prem / colo to one or more public clouds with reliable network, federated identity,
sensible data placement, and predictable egress cost. Run workloads where their data is, with
control plane that spans environments.

## Agent Protocol

### Trigger
Exact user phrases: "hybrid cloud", "multi-cloud", "Direct Connect", "ExpressRoute", "Cloud
Interconnect", "Megaport", "Equinix Fabric", "Transit Gateway", "Cloud WAN", "site-to-site VPN",
"federation", "SAML", "AWS IAM Identity Center", "Azure AD Connect", "data gravity", "data egress",
"cross-cloud", "Anthos", "EKS Anywhere", "AKS Arc", "ARC", "hybrid K8s", "on-prem to cloud".

### Input Context
- Existing on-prem footprint (colo? own DC? scale?)
- Cloud providers in use (and which workloads)
- Latency requirements between sites
- Data residency / sovereignty rules
- Identity directory (AD / LDAP / Okta / Workday)
- Compliance regime
- Budget for connectivity + egress

### Output Artifact
Hybrid design: connectivity topology, identity federation, data placement policy, DNS strategy,
egress cost model, K8s/control plane choice if applicable.

### Response Format
```
Connectivity: {DX / ER / Interconnect + VPN backup, BGP topology, speeds}
Identity: {source of truth, federation protocol, sync flows}
Data placement: {service → location, reason (gravity / latency / cost / regulation)}
DNS: {authoritative, split-horizon if needed, latency-based routing}
Egress: {expected GB/month, $/month, mitigation}
Hybrid K8s: {one cluster / multiple / control plane location}
```

No preamble. No postamble. No explanations.

### Completion Criteria
- [ ] Connectivity: dedicated link + VPN backup
- [ ] BGP design between on-prem and cloud
- [ ] Identity: single source of truth with federation flows
- [ ] Data placement decisions documented with reasoning
- [ ] DNS strategy for cross-environment resolution
- [ ] Egress cost modeled with mitigations
- [ ] K8s / orchestration spans environments if needed
- [ ] Failure modes: single connectivity loss, single cloud outage
- [ ] Compliance/residency requirements satisfied

### Max Response Length
350 lines.

## Workflow

### Step 1: Pick Connectivity Method
```
Site-to-site VPN (IPsec)
  Setup: hours; speed: 1.25 Gbps per tunnel (AWS); cost: cheap; reliability: Internet-quality
  Use: backup, dev/test, low-volume

Dedicated cloud links
  AWS Direct Connect:    1G / 10G / 100G ports, dedicated cross-connect at colo
  Azure ExpressRoute:    50M – 100G, similar model
  GCP Cloud Interconnect Dedicated (10G / 100G) or Partner (50M-50G)
  Setup: 2-8 weeks; cost: port + cross-connect + per-GB egress (cheaper than Internet egress)
  Use: production, high-volume, latency-sensitive

Cloud exchange providers
  Megaport, Equinix Fabric, PacketFabric, Console Connect
  Setup: minutes once enabled; multi-cloud from one port
  Use: agile, multi-cloud, smaller commit
```

Best practice: **dedicated link primary + VPN backup**. Never single-pathed.

### Step 2: BGP Topology
```
On-prem AS (private 65xxx)
   eBGP
   | 
Direct Connect Gateway / VGW
   |
Cloud VPC / Transit Gateway / Cloud Router
   |
Workloads

Multi-region: announce on-prem prefixes via DX to multiple Direct Connect Gateways
              receive cloud prefixes via BGP
              use LOCAL_PREF / AS-prepend for path selection
```

```bash
# Frr on-prem example
router bgp 65001
 neighbor 169.254.255.1 remote-as 7224          ! AWS DX peer
 neighbor 169.254.255.1 password $BGP_KEY
 address-family ipv4 unicast
  neighbor 169.254.255.1 prefix-list cloud-out out
  neighbor 169.254.255.1 prefix-list cloud-in in
  network 10.10.0.0/16
```

### Step 3: Identity Federation
```
Choose source of truth:
  Active Directory     classic, on-prem; sync to cloud via AAD Connect (Azure) / AWS Directory Service
  Azure AD / Entra ID  cloud-native; federate via SAML/OIDC to other clouds
  Okta / OneLogin      vendor IdP; federate everywhere
  Workday              HR-driven provisioning
```

Federation flows:
```
User logs in to Azure AD → SAML assertion → AWS IAM Identity Center → role assumption in AWS
User logs in to Okta → OIDC token → GCP Workforce Identity Federation → access to GCP

Pattern: never replicate passwords; always SAML/OIDC tokens
```

```yaml
# AWS IAM Identity Center → assumes role in AWS account
# Permission set example
arn:aws:iam::aws:policy/job-function/DataScientist + custom inline:
  Statement:
    - Effect: Allow
      Action: s3:GetObject
      Resource: arn:aws:s3:::analytics/*
```

### Step 4: Data Gravity Decisions
```
Data gravity:  large datasets are expensive to move; compute should go to data, not vice versa

Decision tree:
  Dataset > 10 TB?            keep where born; query in place
  Dataset < 100 GB?           move freely
  Egress > $X/month?          move dataset closer to consumers
  Regulated data?             keep in compliant zone, query via federation
```

Examples:
```
On-prem ERP DB (1 TB, regulated) + cloud analytics
  → keep ERP on-prem, use CDC (Debezium) to ship change events to cloud data lake
On-prem Hadoop cluster + cloud GPU for ML
  → store features in cloud (versioned), train on cloud GPU, return models on-prem
SaaS API + on-prem data
  → put API on cloud (CDN, scale), use Direct Connect for DB calls back, cache aggressively
```

### Step 5: DNS Strategy
```
Split-horizon DNS
  Internal name (api.internal) → resolves to private IPs (VPC + on-prem)
  External name (api.example.com) → resolves to public IP (CDN / LB)

Authoritative DNS:
  Route 53 (AWS), Cloud DNS (GCP), Azure DNS, NS1, Cloudflare DNS, BIND on-prem
  
Multi-environment resolution:
  Route 53 Private Hosted Zone + on-prem resolver forwarder (53 over VPN)
  Or run BIND on-prem with zone delegations / conditional forwarders
```

```bash
# Linux resolver forwarder for on-prem to query AWS Route 53 PHZ
# /etc/resolv.conf (systemd-resolved)
nameserver 169.254.169.254       # if EC2-style
# or via unbound on prem
forward-zone:
  name: "internal.example.com"
  forward-addr: 10.10.0.2        # Route 53 Inbound Resolver Endpoint
```

### Step 6: Egress Cost Modeling
```
Within-region cloud: free
Cross-region cloud: $0.02-0.10/GB
Cloud to Internet: $0.05-0.12/GB (CDN cheaper)
Cloud to on-prem via Direct Connect: $0.02/GB (much cheaper than Internet egress)
Cloud to cloud: usually treated as Internet egress (expensive)

Estimate: 100 TB/month cross-cloud at $0.08 = $8,000/month
Mitigation:
  - Keep big data within one cloud
  - Use cloud exchange (Megaport/Equinix) for cross-cloud at lower rates
  - CDN in front of cross-cloud traffic to cache
  - Compress / deduplicate before transfer
  - Schedule bulk transfers during pricing windows if applicable
```

### Step 7: Hybrid Kubernetes
```
Option A — separate clusters per environment, federated control
  Karmada, Kubefed (deprecated), Argo CD multi-cluster
  Each cluster autonomous; control plane orchestrates

Option B — single cluster spans environments
  Anthos (GKE on-prem + GCP)
  EKS Anywhere (on-prem EKS, optionally connected back)
  AKS on Azure Arc / AKS HCI
  OpenShift across clouds and DCs
  Higher latency = more risk; usually one cluster per environment

Option C — control plane in cloud, workers anywhere
  GKE Autopilot / Anthos
  EKS with self-managed Linux on-prem (limited)
```

### Step 8: Failure Modes + Mitigation
```
Direct Connect down:          fail to VPN backup; BGP withdraws DX, prefers VPN
Cloud region outage:          failover to second cloud or on-prem DR
On-prem outage:               cloud continues for cloud-resident services; on-prem-dependent degraded
Identity provider down:       AD can stand alone; SaaS apps with cached tokens degrade
Cross-cloud egress spike:     billing surprise; set budget alarms
```

## Rules
- Always have dedicated link + VPN backup (never single-pathed).
- Identity has ONE source of truth; federation to all consumers.
- Data placement decisions documented (gravity / latency / cost / regulation).
- Cloud egress cost monitored with monthly alerts at 50% / 80% / 100% of budget.
- BGP peers password-protected and prefix-filtered both directions.
- Cross-environment DNS resolution tested as part of DR drill.
- Compliance: data residency verified for every regulated dataset.
- Hybrid K8s: single cluster only when latency permits; otherwise federate.

## References
- `references/direct-connect.md` — AWS DX / Azure ER / GCP Interconnect setup, BGP, redundancy
- `references/identity-federation.md` — AD, AAD, Okta, SAML/OIDC, AWS IAM IC, GCP WIF
- `references/data-gravity.md` — Placement decisions, CDC, federated query
- `references/multi-cloud-dns.md` — Authoritative, split-horizon, latency routing

## Handoff
- `devops-aws / gcp / azure` for cloud-side specifics.
- `devops-network-infrastructure` for on-prem BGP, fabric, MPLS.
- `devops-datacenter` for colo cross-connect provisioning.
- `enterprise-business-continuity` for hybrid failure scenarios.
- `enterprise-cost-governance` for cross-cloud budget tracking.
