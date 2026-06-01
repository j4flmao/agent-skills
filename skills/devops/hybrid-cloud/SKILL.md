---
name: hybrid-cloud
description: >
  Use this skill when the user says 'hybrid cloud', 'hybrid-cloud',
  'cloud burst', 'on-prem to cloud', 'cloud repatriation', 'hybrid
  connectivity', 'express route', 'direct connect', 'VPN', 'transit
  gateway', 'cloud interconnect', 'multi-cloud', 'cross-cloud',
  'data gravity', 'cloud migration', 'hybrid workload', 'hybrid
  networking', 'hybrid storage', 'hybrid compute', 'hybrid identity',
  'cloud agnostic'.
  Covers: Designing hybrid architectures, connectivity patterns,
  hybrid identity, hybrid compute orchestration, data synchronization,
  disaster recovery across environments, repatriation planning, vendor
  comparison.
  Do NOT use this for: single-cloud architectures, pure on-prem
  environments, or basic VPN setup without hybrid context.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, hybrid-cloud, multi-cloud, cloud-architecture, hcp, phase-4]
---

# Hybrid Cloud

## Purpose
Design and operate hybrid cloud architectures that span on-premises data centers and public cloud providers, with secure networking, consistent identity, unified management, and resilient data synchronization.

## Agent Protocol

### Trigger
Exact user phrases: "hybrid cloud", "cloud burst", "hybrid connectivity", "Direct Connect", "ExpressRoute", "transit gateway", "cloud interconnect", "multi-cloud", "cross-cloud", "data gravity", "cloud migration", "hybrid workload", "repatriation", "hybrid identity".

### Input Context
Before activating, verify:
- On-premises hypervisor (VMware, Hyper-V, Nutanix).
- Cloud provider(s) (AWS, Azure, GCP).
- Current workload placement decisions (data gravity, latency).
- Identity provider (Active Directory, Azure AD, Okta).
- Compliance and data residency requirements.
- Existing connectivity (VPN, Direct Connect, ExpressRoute).

### Output Artifact
Architecture decision record with connectivity topology, identity federation config, workload placement matrix, and synchronization patterns.

### Response Format
```
Connectivity: {DirectConnect|ExpressRoute|VPN|SD-WAN}
Identity: {ADFS|AzureAD Connect|Okta SCIM}
Compute: {VMware HCX|Anthos|Arc|EKS Anywhere|AKS Arc}
Storage: {FSx|NetApp CVO|Azure NetApp Files|Pure Cloud Block Store}
```
No preamble. No postamble. No explanations.

### Completion Criteria
- [ ] Connectivity plan (primary + backup path, MTTR < 5 min failover).
- [ ] Identity federation configured with consistent RBAC across environments.
- [ ] Workload placement matrix (data gravity, latency, compliance documented).
- [ ] Data synchronization strategy for stateful workloads.
- [ ] DR plan with RPO/RTO for hybrid workloads.
- [ ] Monitoring and observability across environments.

### Max Response Length
400 lines.

## Quick Start
Establish hybrid connectivity: VPN to cloud as interim → provision Direct Connect/ExpressRoute within 30 days → configure route propagation via Transit Gateway → federate on-prem AD with cloud IdP → deploy hybrid compute (VMware HCX, Anthos, Arc) → set up data sync layer → implement monitoring across both environments.

## Decision Tree: Connectivity Options
| Method | Latency | Bandwidth | Cost | Use Case |
|--------|---------|-----------|------|----------|
| **Site-to-Site VPN** | >5ms | Up to 1.25 Gbps per tunnel | Low | Interim, DR, low-volume |
| **Direct Connect / ExpressRoute** | 1-3ms | 50 Mbps - 100 Gbps | Medium + egress | Primary, high-volume, latency-sensitive |
| **SD-WAN over MPLS** | 5-10ms | Up to 1 Gbps per circuit | Medium | Branch offices, multi-site |
| **Cloud Interconnect (GCP)** | 1-3ms | 10-200 Gbps | Medium | GCP primary connectivity |
| **Megaport / Equinix Fabric** | <1ms | Up to 10 Gbps per port | Medium | Multi-cloud exchange |
| **Colo cross-connect** | <1ms | 1-100 Gbps | Low per link | Same-facility hybrid |

## Core Workflow

### Step 1: Hybrid Connectivity Design
```hcl
# AWS Transit Gateway + VPN + Direct Connect
resource "aws_dx_gateway" "main" {
  name            = "dxgw-main"
  amazon_side_asn = "64512"
}

resource "aws_dx_private_virtual_interface" "primary" {
  connection_id    = aws_dx_connection.primary.id
  name             = "dxvif-primary"
  vlan             = 100
  address_family   = "ipv4"
  bgp_asn          = "65550"
}
```

```hcl
# Azure ExpressRoute + Virtual WAN
resource "azurerm_express_route_circuit" "primary" {
  name                  = "er-primary"
  location              = azurerm_resource_group.main.location
  resource_group_name   = azurerm_resource_group.main.name
  service_provider_name = "Equinix"
  peering_location      = "Silicon Valley"
  bandwidth_in_mbps     = 1000
  sku {
    tier   = "Standard"
    family = "MeteredData"
  }
}
```

### Step 2: Identity Federation
```yaml
# ADFS → Azure AD hybrid identity flow
Identity sources:
  On-prem: Active Directory Domain Services
  Cloud:   Azure AD / AWS IAM Identity Center / GCP Cloud Identity
  Sync:    Azure AD Connect (password hash sync + passthrough auth)

Federation protocols:
  SAML 2.0: Primary for web apps
  OpenID Connect: Modern apps, API access
  Kerberos: On-prem legacy, seamless SSO

# Okta Universal Directory as alternative
# - Masters identities in Okta
# - Syncs to AD via AD Agent
# - Syncs to cloud IdPs via SCIM connectors
```

### Step 3: Hybrid Compute Orchestration
```yaml
# VMware Cloud on AWS (HCX)
Network extension:
  - HCX L2 stretch (vMotion without re-IP)
  - HCX network extension appliance (per segment)
  - Compute profiles: compute-intensive, memory-optimized

Migration types:
  - Bulk migration: vSphere replication 8 VMs at a time
  - Cold migration: power-off, move via HCX bulk
  - Replication-assisted: near-zero downtime, vMotion over WAN
```

```yaml
# Google Anthos (GKE on-prem + cloud)
- GKE on VMware for on-premises Kubernetes
- Cloud Run for Anthos
- Config Management (sync from Cloud Source Repositories or GitLab)
- Service Mesh (Anthos Service Mesh, Istio-based)
- Multi-cluster ingress for global load balancing
```

```yaml
# Azure Arc / AWS Outposts
Azure Arc:
  - Servers: Any Linux/Windows VM on-prem
  - Kubernetes: AKS hybrid, K3s, Rancher
  - Data: SQL Managed Instance, PostgreSQL Hyperscale
  - Policies: Azure Policy + Guest Configuration

AWS Outposts:
  - Native AWS services on-prem (EC2, EBS, RDS, ECS, EKS)
  - Up to 96 racks, 1U or 2U configuration
  - 1-10 Gbps per Outpost rack
  - Local gateway for low-latency on-prem traffic
```

### Step 4: Data Synchronization Strategy
```yaml
Data gravity decision matrix:
  Data source          | Sync method                     | RPO     | RTO
  ---------------------|---------------------------------|---------|-------
  User profiles        | Azure AD Connect / Okta AD Sync | <5 min  | <1 min
  Databases (OLTP)     | Always On AG / DMS CDC           | <1 sec  | <30 sec
  Blob/object storage   | Rclone / Storage Sync / DataSync  | <15 min | <1 min
  Files (NAS/EFS/FSx)  | NetApp SnapMirror / DFS-R        | <1 min  | <5 min
  Message queues       | Cross-region replication         | <1 sec  | <1 sec
  Analytics            | Periodic extract + incremental   | 1 hour  | 1 hour
```

### Step 5: Disaster Recovery Strategy
```yaml
# Hybrid DR patterns

Pilot light:
  - Replicate data to cloud, provision compute only during DR
  - Lowest cost, longest RTO (hours)
  - Service Catalog / CloudFormation templates for rapid provisioning

Warm standby:
  - Base compute running at minimum scale in cloud
  - Scale up during DR event
  - Database replica in cloud, failover via DNS/Route53
  - RTO < 30 min

Multi-site active-active:
  - Workloads running in both environments
  - DNS weighted routing or global load balancer
  - Database multi-region writes (conflict resolution needed)
  - RPO near-zero, RTO < 1 min
```

```hcl
# AWS DMS for hybrid DB replication
resource "aws_dms_replication_task" "hybrid" {
  replication_instance_arn = aws_dms_replication_instance.main.replication_instance_arn
  migration_type            = "full-load-and-cdc"
  table_mappings            = jsonencode({
    rules: [{
      rule-type: "selection",
      rule-id: "1",
      rule-name: "1",
      object-locator: {
        schema-name: "public",
        table-name: "%"
      },
      rule-action: "include"
    }]
  })
  replication_task_settings = jsonencode({
    TargetMetadata: {
      ParallelLoadThreads: 4,
      ParallelApplyThreads: 4
    },
    FullLoadSettings: {
      TargetTablePrepMode: "DROP_AND_CREATE",
      CreatePkAfterFullLoad: true
    }
  })
}
```

### Step 6: Monitoring Across Environments
```yaml
Observability stack for hybrid cloud:
  Metrics:  Prometheus + Thanos / Azure Monitor + Grafana
  Logs:     Loki / Splunk / Azure Log Analytics
  Tracing:  OpenTelemetry Collector (gateway mode)
  Alerts:   PagerDuty / Opsgenie with on-call rotations

Key metrics to monitor:
  - Cross-environment latency (ping, traceroute, mtr)
  - Tunnel/connection state (VPN, DX, ER)
  - Sync lag for replicated data
  - Compute utilization on both sides
  - Egress data transfer costs
  - Queue depth for async workloads
```

### Step 7: Cloud Repatriation
```yaml
Trigger for repatriation:
  - Data egress costs exceed on-prem TCO
  - Latency-sensitive workloads need deterministic performance
  - Data gravity pulling compute back to on-prem
  - Compliance/censorship requirements
  - Reserved instance expiration → re-evaluation point

Process:
  1. TCO analysis (compute + storage + egress + networking vs. colo/capex)
  2. Data transfer plan (DMS reverse, Snowball/Data Box offline)
  3. Cutover plan with rollback
  4. Decommission cloud resources post-migration

Key repatriation services:
  - AWS Outposts / Azure Stack / GDC (for managed hybrid)
  - VMware Cloud Foundation (self-managed SDDC)
  - Anthos / AKS hybrid / EKS Anywhere (K8s portability)
```

## Rules
- Always provision a backup connectivity path (VPN as backup to Direct Connect).
- Never route production traffic over the internet without IPsec encryption.
- Use BGP for dynamic routing in all hybrid connections when available.
- Federate identity before migrating workloads to maintain consistent access.
- Monitor and limit egress traffic — it is the largest hidden hybrid cost.
- Document data gravity for every workload before deciding placement.
- Treat cloud as a separate failure domain — never make on-prem dependent on cloud.
- Test DR failover quarterly with actual workload cutover.

## Production Considerations
- Latency over Direct Connect varies by provider location — test with `mtr` before committing.
- BGP timers should be aggressive (3s keepalive, 9s hold) for fast failover on DX/ER.
- Set MTU 9000 internally for jumbo frames across Direct Connect.
- Route propagation via Transit Gateway: 100 routes per TGW attachment limit.
- Monitor ExpressRoute BFD status — silent failure on ER circuit is common.
- Use SNAT for overlapping IP ranges ($10.0.0.0/8 on both sides).
- Azure AD Connect: domain and OU filtering, don't sync service accounts.
- Database CDC replication needs enough bandwidth — measure daily change volume.
- Place log aggregation across environments in a single SIEM for unified search.
- Tag resources consistently across cloud and on-prem (tag-on-prem-tools like rmm).

## Anti-Patterns
- Cloud-first without data gravity analysis — huge egress costs.
- No backup connectivity path — single point of failure.
- L2 extension everywhere — broadcast storms across environments.
- Identity split — different passwords, mismatched groups.
- All workloads in cloud during repatriation — move incrementally.
- Manual config for BGP — route leaks, misconfiguration.
- Cloud as pure DR without testing — failover never actually works.
- Synchronous writes across hybrid connection — latency kills app perf.
- Ignoring cloud provider egress costs during cost allocation.

## References
  - references/hybrid-cloud-advanced.md — Hybrid Cloud Advanced Topics
  - references/hybrid-cloud-fundamentals.md — Hybrid Cloud Fundamentals
  - references/vpn-direct-connect.md — VPN vs Direct Connect — Decision Guide
  - references/identity-federation.md — Identity Federation Patterns
  - references/hybrid-storage.md — Hybrid Storage Patterns
  - references/disaster-recovery-hybrid.md — Hybrid DR Strategies
  - references/repatriation.md — Cloud Repatriation Guide
## Handoff
- `devops-aws` for native AWS services integration.
- `devops-azure` for Azure Arc and ExpressRoute depth.
- `devops-gcp` for Anthos and GCP interconnect.
- `devops-datacenter` for on-prem DC alongside hybrid.
- `enterprise-high-availability` for HA/DR across environments.
- `devops-network-infrastructure` for BGP and connectivity deep-dive.
