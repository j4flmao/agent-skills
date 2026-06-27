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
version: "2.0.0"
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

## Architecture Decision Trees

### Connectivity Options Comparison
| Method | Latency | Bandwidth | Cost | MTTR | Use Case |
|---|---|---|---|---|---|
| Site-to-Site VPN | >5ms | Up to 1.25 Gbps per tunnel | Low | Minutes | Interim, DR, low-volume |
| Direct Connect / ExpressRoute | 1-3ms | 50 Mbps - 100 Gbps | Medium + egress | 1-4 hours | Primary, high-volume |
| SD-WAN over MPLS | 5-10ms | Up to 1 Gbps per circuit | Medium | Automatic | Branch offices |
| Cloud Interconnect (GCP) | 1-3ms | 10-200 Gbps | Medium | 1-2 hours | GCP primary |
| Megaport / Equinix Fabric | <1ms | Up to 10 Gbps per port | Medium | Instant | Multi-cloud exchange |
| Colo cross-connect | <1ms | 1-100 Gbps | Low per link | Days | Same-facility hybrid |

### Hybrid Compute Platform Comparison
| Platform | On-Prem | Cloud | Orchestration | Best For |
|---|---|---|---|---|
| VMware HCX | vSphere | AWS VMC, Azure VMware | L2 stretch, bulk migration | VMware-centric orgs |
| Google Anthos | GKE on-prem | GKE, GCP | Config Management, Service Mesh | K8s-native hybrid |
| Azure Arc | Any K8s, Linux/Windows | Azure | Azure Policy, GitOps | Azure-first hybrid |
| AWS Outposts | Native AWS HW | AWS | Same APIs as cloud | AWS extension |
| EKS Anywhere | EKS on-prem | EKS | GitOps, Curated packages | K8s hybrid |
| Nutanix Cloud Clusters | AHV | AWS, Azure | Single management | Nutanix shops |

### Identity Federation Comparison
| Protocol | Use Case | Complexity | Security Level |
|---|---|---|---|
| SAML 2.0 | Web app SSO, enterprise | Medium | High |
| OpenID Connect | Modern apps, API access | Low | High |
| Kerberos | On-prem legacy SSO | Medium | Medium |
| LDAP | Direct authentication | Low | Low |
| SCIM | User provisioning | Low | N/A |

### Data Sync Decision Tree
```
Is data structured (RDBMS)?
├── Yes → Need real-time sync?
│   ├── Yes → CDC (DMS, Debezium, GoldenGate)
│   └── No → Batch ETL (periodic extract-load)
└── No → Is data file-based?
    ├── Yes → Is NAS/EFS?
    │   ├── Yes → NetApp SnapMirror, DFS-R, rclone
    │   └── No → Object store sync (rclone, DataSync, Storage Sync)
    └── No → Is it message/queue?
        ├── Yes → Cross-region topic replication
        └── No → Custom sync logic
```

### DR Strategy for Hybrid Cloud
| Strategy | RPO | RTO | Cost | Complexity | Failover |
|---|---|---|---|---|---|
| Backup and restore | 24h | 4-24h | Low | Low | Manual |
| Pilot light | 15min | 1-4h | Low-Medium | Medium | Semi-auto |
| Warm standby | 5min | 15-60min | Medium | Medium | Semi-auto |
| Multi-site active-active | <1s | <1min | Very High | High | Automatic |

## Quick Start
Establish hybrid connectivity: VPN to cloud as interim → provision Direct Connect/ExpressRoute within 30 days → configure route propagation via Transit Gateway → federate on-prem AD with cloud IdP → deploy hybrid compute (VMware HCX, Anthos, Arc) → set up data sync layer → implement monitoring across both environments.

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

### Step 2: AWS Transit Gateway Configuration
```hcl
resource "aws_ec2_transit_gateway" "main" {
  description                     = "Hybrid cloud transit gateway"
  amazon_side_asn                 = 64512
  auto_accept_shared_attachments  = "enable"
  default_route_table_association = "enable"
  default_route_table_propagation = "enable"
  dns_support                     = "enable"
  vpn_ecmp_support                = "enable"
  
  tags = { Name = "hybrid-tgw" }
}

resource "aws_ec2_transit_gateway_vpc_attachment" "prod" {
  subnet_ids         = aws_subnet.private[*].id
  transit_gateway_id = aws_ec2_transit_gateway.main.id
  vpc_id             = aws_vpc.prod.id
}

resource "aws_ec2_transit_gateway_route_table_propagation" "dx" {
  transit_gateway_attachment_id  = aws_dx_gateway_association.main.id
  transit_gateway_route_table_id = aws_ec2_transit_gateway.main.association_default_route_table_id
}
```

### Step 3: Identity Federation
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

### Step 4: Hybrid Compute — VMware HCX
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
  - OS assisted: in-guest replication (no HCX needed)
```

### Step 5: Hybrid Compute — Google Anthos
```yaml
# Google Anthos (GKE on-prem + cloud)
- GKE on VMware for on-premises Kubernetes
- Cloud Run for Anthos
- Config Management (sync from Cloud Source Repositories or GitLab)
- Service Mesh (Anthos Service Mesh, Istio-based)
- Multi-cluster ingress for global load balancing
- Config Sync to enforce policy across clusters
- Policy Controller (OPA/Gatekeeper) for guardrails
```

### Step 6: Hybrid Compute — Azure Arc
```yaml
# Azure Arc / AWS Outposts
Azure Arc:
  - Servers: Any Linux/Windows VM on-prem
  - Kubernetes: AKS hybrid, K3s, Rancher
  - Data: SQL Managed Instance, PostgreSQL Hyperscale
  - Policies: Azure Policy + Guest Configuration
  - Extensions: Monitoring, security, custom scripts

AWS Outposts:
  - Native AWS services on-prem (EC2, EBS, RDS, ECS, EKS)
  - Up to 96 racks, 1U or 2U configuration
  - 1-10 Gbps per Outpost rack
  - Local gateway for low-latency on-prem traffic
```

### Step 7: Data Synchronization Strategy
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

### Step 8: Disaster Recovery with AWS DMS
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

### Step 9: Monitoring Across Environments
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

### Step 10: Hybrid Kubernetes (EKS Anywhere)
```yaml
# EKS Anywhere cluster on-prem
apiVersion: anywhere.eks.amazonaws.com/v1alpha1
kind: Cluster
metadata:
  name: hybrid-cluster
spec:
  controlPlaneConfiguration:
    count: 3
    machineGroupRef:
      name: on-prem-machines
  workerNodeGroupConfigurations:
  - count: 5
    machineGroupRef:
      name: on-prem-machines
  kubernetesVersion: "1.28"
  datacenterRef:
    kind: VSphereDatacenterConfig
    name: vsphere-dc
  managementCluster:
    name: hybrid-cluster
---
# GitOps sync to cloud
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: hybrid-apps
spec:
  source:
    repoURL: https://github.com/org/hybrid-gitops
    path: environments/production
  destination:
    server: https://kubernetes.default.svc
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

### Step 11: Cloud Repatriation
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

### Step 12: Cost Management for Hybrid Cloud
```yaml
Cost categories:
  Connectivity: DX/ER port hours, data transfer out, VPN
  Compute: On-prem capex + power + cooling vs cloud instance hours
  Storage: On-prem array maintenance vs cloud storage tiers + API calls
  Egress: The largest hidden cost — data leaving cloud to on-prem

Optimization strategies:
  - Use local caches on-prem to reduce data transfer
  - Compress data before transferring between environments
  - Only replicate data needed for DR, not entire datasets
  - Use CDN for user-facing content to reduce origin egress
  - Monitor and limit cross-environment traffic with budgets
```

## Security Considerations
- All cross-environment traffic must be encrypted (IPsec for VPN, MACsec for DX).
- Use BGP with MD5 authentication for routing protocol security.
- Federate identity before migrating workloads to maintain consistent access.
- Never expose on-prem services to cloud without firewall inspection.
- Use private IPs for all hybrid connectivity — avoid public internet.
- Implement network segmentation: separate VRF per environment.
- Monitor and audit all cross-environment access with VPC Flow Logs.
- Rotate VPN pre-shared keys and API tokens regularly.

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
- Over-provisioning DX/ER bandwidth — expensive and unnecessary.
- Not tagging resources consistently across environments.

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

## References
  - references/hybrid-cloud-advanced.md — Hybrid Cloud Advanced Topics
  - references/hybrid-cloud-fundamentals.md — Hybrid Cloud Fundamentals
  - references/vpn-direct-connect.md — VPN vs Direct Connect — Decision Guide
  - references/identity-federation.md — Identity Federation Patterns
  - references/hybrid-storage.md — Hybrid Storage Patterns
  - references/disaster-recovery-hybrid.md — Hybrid DR Strategies
  - references/repatriation.md — Cloud Repatriation Guide
  - references/hybrid-kubernetes.md — Hybrid Kubernetes with EKS Anywhere
## Handoff
- `devops-aws` for native AWS services integration.
- `devops-azure` for Azure Arc and ExpressRoute depth.
- `devops-gcp` for Anthos and GCP interconnect.
- `devops-datacenter` for on-prem DC alongside hybrid.
- `enterprise-high-availability` for HA/DR across environments.
- `devops-network-infrastructure` for BGP and connectivity deep-dive.

## Implementation Patterns

### Terraform: Multi-cloud VPN Tunnel (AWS ↔ On-prem)

```hcl
resource "aws_vpn_connection" "hybrid_tunnel" {
  customer_gateway_id = aws_customer_gateway.on_prem.id
  transit_gateway_id  = aws_ec2_transit_gateway.main.id
  type                = "ipsec.1"
  tunnel1_preshared_key = random_password.vpn_key.result
  tunnel2_preshared_key = random_password.vpn_key.result

  tags = {
    Name = "hybrid-vpn-${var.region}"
  }
}

resource "aws_ec2_transit_gateway" "main" {
  description                     = "Hybrid cloud TGW"
  amazon_side_asn                 = 64512
  default_route_table_association = "enable"
  default_route_table_propagation = "enable"
  dns_support                     = "enable"
  vpn_ecmp_support                = "enable"
}
```

### YAML: Azure Arc-enabled Kubernetes Cluster

```yaml
apiVersion: arc.azure.com/v1
kind: ConnectedCluster
metadata:
  name: on-prem-k8s
  location: eastus
spec:
  identity:
    type: SystemAssigned
  agentPublicKeyCertificate: ${ARC_AGENT_CERT}
  azureHybridBenefit: true
  distribution: k3s
  infrastructure: onpremise
---
apiVersion: arc.azure.com/v1
kind: Extension
metadata:
  name: monitoring
spec:
  clusterName: on-prem-k8s
  extensionType: microsoft.azuremonitor.containers
  releaseTrain: stable
  autoUpgradeMinorVersion: true
```

### Bash: Hybrid DNS Sync

```bash
#!/usr/bin/env bash
sync_dns_zones() {
  local on_prem_zone=$1
  local cloud_zone=$2

  # Export on-prem DNS records
  dig axfr "$on_prem_zone" @ns1.onprem.local \
    | grep -E '^[a-zA-Z]' \
    | while read -r name ttl class type value; do
      case "$type" in
        A|AAAA|CNAME)
          aws route53 change-resource-record-sets \
            --hosted-zone-id "$cloud_zone" \
            --change-batch "{
              \"Changes\": [{
                \"Action\": \"UPSERT\",
                \"ResourceRecordSet\": {
                  \"Name\": \"${name}.${on_prem_zone}\",
                  \"Type\": \"$type\",
                  \"TTL\": $ttl,
                  \"ResourceRecords\": [{\"Value\": \"$value\"}]
                }
              }]
            }"
          ;;
      esac
    done
}
```

## Production Considerations

- Establish **dedicated connectivity** (AWS Direct Connect, Azure ExpressRoute, GCP Interconnect) for reliable hybrid networking
- Use **shared DNS resolution** across environments with Route53 Resolver or Azure DNS Private Resolver
- Implement **centralized identity** (Azure AD / Okta) with federation to on-prem AD for consistent auth
- Deploy **hybrid Kubernetes** (EKS Anywhere, AKS on HCI, GKE on-prem) for consistent container orchestration
- Monitor **circuit health** from both sides with BGP session monitoring and synthetic probes
- Use **cloud-agnostic IaC** (Terraform, Pulumi) with provider abstraction for multi-cloud portability
- Implement **failover** with Route53 ARC (Application Recovery Controller) or Azure Traffic Manager

## Anti-Patterns

- Assuming **cloud is always cheaper** — repatriate steady-state workloads to on-prem when cost analysis favors it
- Using **different IaC tools** for on-prem and cloud — Terraform/Pulumi should manage both uniformly
- Ignoring **latency** between sites — chatty microservices across WAN links degrade performance
- Managing **separate identity stores** — federate everything to a single IdP
- Treating **hybrid as temporary** — hybrid is a long-term architecture, plan for it
- Skipping **cost governance** — egress charges and dual-running resources balloon budgets
- Overlooking **compliance boundaries** — data residency laws may restrict cross-region replication

## Performance Optimization

- Use **local caching** (Redis, CDN) at each site to reduce cross-region data fetches
- Enable **TCP BBR** on all hybrid VPN endpoints for better throughput over long-distance links
- Tune **MTU** to 1400 on VPN tunnels to avoid fragmentation over IPsec
- Deploy **read replicas** in each region and use proximity-routed DNS for database access
- Use **gRPC** instead of REST for inter-service calls across WAN (smaller payloads, multiplexed)
- Implement **connection pooling** across hybrid links to amortize TLS handshake overhead
- Monitor and alert on **packet loss and jitter** across the hybrid interconnect

## Security Considerations

- Encrypt **all traffic** between sites with IPsec VPN or MACsec for dedicated connections
- Use **PrivateLink / VPC Endpoints** for cloud services — never traverse public internet
- Implement **zero-trust** for hybrid: every cross-site call must authenticate and authorize
- Harden **VPN appliances** with certificate-based auth instead of pre-shared keys
- Centralize **audit logging** from all environments into a single SIEM (Splunk, Sentinel)
- Use **SCPs / Azure Policy** to enforce hybrid connectivity standards across cloud accounts
- Rotate **VPN pre-shared keys** quarterly and revoke compromised customer gateways immediately
## Implementation Patterns

### Observer Pattern for Event Handling
`
interface EventObserver<T> {
  onEvent(event: T): Promise<void>;
}

class EventBus<T> {
  private observers: Set<EventObserver<T>> = new Set();
  subscribe(observer: EventObserver<T>): void {
    this.observers.add(observer);
  }
  unsubscribe(observer: EventObserver<T>): void {
    this.observers.delete(observer);
  }
  async emit(event: T): Promise<void> {
    const results = Array.from(this.observers).map(o => o.onEvent(event));
    await Promise.allSettled(results);
  }
}
`

### Configuration-Driven Approach
`
config:
  defaults:
    timeout: 30s
    retryCount: 3
  overrides:
    production:
      timeout: 60s
      retryCount: 5
    development:
      timeout: 300s
      retryCount: 1
`

## Production Considerations

### Deployment Checklist
- [ ] Configuration validated against schema before startup
- [ ] Health check endpoints registered and monitored
- [ ] Graceful shutdown with draining period (30s timeout)
- [ ] Resource limits configured (CPU, memory, file descriptors)
- [ ] Log level set appropriate for environment
- [ ] Metrics endpoint secured and exposed
- [ ] Rate limiting configured per-tier
- [ ] TLS certificates valid and auto-renewing
- [ ] Database migrations run as separate deployment step
- [ ] Feature flags ready for gradual rollout

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% over 5min | Critical | Page on-call |
| p99 latency | > 2s over 5min | Warning | Investigate |
| Throughput drop | > 50% over 1min | Critical | Check upstream |
| Queue depth | > 1000 over 1min | Warning | Scale consumers |
| Disk usage | > 85% | Warning | Clean or expand |
| Memory usage | > 90% heap | Critical | Restart or scale |

## Anti-Patterns

| Anti-Pattern | Symptom | Root Cause | Solution |
|-------------|---------|------------|----------|
| Premature optimization | Complex code for no measured benefit | Guessing instead of profiling | Measure first, optimize based on data |
| Copy-paste reuse | Duplicate code across codebase | Lack of abstraction | Extract shared logic into libraries |
| Gold-plating | Features with no current requirement | Over-engineering | YAGNI — build what's needed now |
| Magical thinking | Assumptions without validation | Skipping error handling | Handle all failure modes explicitly |

## Performance Optimization

### Caching Strategy
Cache hierarchy: L1 (in-memory local) → L2 (distributed Redis/Memcached) → L3 (CDN/Edge).
Cache invalidation: TTL-based (simple, stale), event-based (complex, fresh), write-through (consistent, higher write latency), write-behind (fast writes, eventual consistency).

### Resource Pooling
- Database connections: Pool of reusable connections (HikariCP, pgBouncer)
- HTTP connections: Keep-alive + connection pooling for external calls
- Thread pool: Bounded thread pools for async task execution

### Profiling Methodology
1. Establish baseline with production traffic profile
2. Profile CPU with sampling profiler (pprof, perf, async-profiler)
3. Profile memory with heap dumps and allocation tracking
4. Profile I/O with strace/perf trace for syscall analysis
5. Profile latency with distributed tracing (OpenTelemetry)
6. Identify bottleneck, formulate hypothesis, implement fix
7. Re-profile to verify improvement, repeat

## Security Considerations

### Threat Modeling (STRIDE)
- Spoofing: Identity validation, authentication
- Tampering: Integrity checks, digital signatures
- Repudiation: Audit logs, non-repudiation
- Information disclosure: Encryption, access control
- Denial of service: Rate limiting, resource quotas
- Elevation of privilege: Principle of least privilege

### Supply Chain Security
- Dependency scanning: Snyk, Dependabot, Trivy
- SBOM generation: CycloneDX or SPDX format
- Signed commits: GPG or SSH commit signing
- Artifact verification: Checksum validation, signature verification

### Secrets Management
- Secrets never in code — always in secrets manager (Vault, AWS Secrets Manager)
- Rotation policy: Rotate database credentials every 90 days
- Access audit: Log every secrets access, alert on anomalies
- Encryption at rest and in transit for all secrets
- Principle of least privilege: each service gets only its own secrets

## Rules
- Default-deny security posture — allow only explicitly required access.
- All inputs validated, all outputs encoded, all errors handled.
- Defend in depth — multiple layers of security controls.
- Fail securely — errors default to safe behavior.
- Log security-relevant events for audit and investigation.
- Keep dependencies updated — automate vulnerability scanning.
- Design for observability from day one, not as an afterthought.
- Document all architectural decisions with rationale.
- Review code for security, performance, and correctness before merging.