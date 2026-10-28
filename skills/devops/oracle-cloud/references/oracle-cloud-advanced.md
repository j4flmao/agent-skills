# OCI Advanced: Landing Zones, Hub-Spoke Networking, Multi-Region DR, Governance

Patterns for running OCI at scale: landing zones, hub-and-spoke networks with DRG and Network Firewall, hybrid connectivity, multi-region disaster recovery, security posture services, and cost governance. Foundations are in `oracle-cloud-fundamentals.md`.

## 1. Landing Zone

Oracle publishes CIS-aligned landing zone Terraform (OCI Core Landing Zone, successor to the CIS Landing Zone) that creates:
- Compartments for network, security, application, database, and exadata workloads.
- Groups and least-privilege policies per role (network admin, security admin, app admin, auditor).
- Cloud Guard, Security Zones (optional), Vulnerability Scanning, logging, notifications, and events.
- Hub/spoke or standalone VCN topologies.

Fork or wrap the landing zone modules rather than hand-building the baseline; keep changes in version control and apply via Resource Manager or CI.

## 2. Hub-and-Spoke Networking

```
           On-premises
     (FastConnect / IPSec VPN)
                │
               DRG ───────────── remote peering (RPC) ──► DR region DRG
           ┌────┴─────────────┐
       Hub VCN            Spoke VCNs (prod, nonprod, shared services)
   ┌───────────────┐
   │ OCI Network    │  all spoke-to-spoke, spoke-to-on-prem, and egress
   │ Firewall       │  traffic routed through the firewall
   └───────────────┘
```

Key mechanisms:
- DRG attachments for each VCN; DRG route tables and import distributions control which attachments learn which routes.
- VCN ingress route tables on the hub's DRG attachment send traffic to the firewall's private IP.
- Spokes have no internet gateway; egress via hub NAT or firewall.
- Service Gateway in each spoke (or centralized) for Oracle Services Network access.

```hcl
resource "oci_core_drg_attachment" "spoke_prod" {
  drg_id       = oci_core_drg.hub.id
  display_name = "spoke-prod"
  network_details {
    id   = oci_core_vcn.prod.id
    type = "VCN"
  }
  drg_route_table_id = oci_core_drg_route_table.spokes.id
}
```

## 3. Hybrid Connectivity

| Option | Characteristics |
|---|---|
| Site-to-Site IPSec VPN | Quick to set up, over internet, two tunnels per connection for redundancy |
| FastConnect | Private dedicated connectivity via partner or colocation, predictable latency |
| FastConnect + VPN backup | VPN as failover path with BGP preferences |
| Multicloud interconnects (Azure, Google Cloud) | Private interconnect between clouds in paired regions |
| Oracle Database@Azure / @AWS / @Google Cloud | Oracle database services running in the other cloud's data centers |

Use BGP with redundant circuits in different locations; test failover.

## 4. Multi-Region Disaster Recovery

| Layer | Mechanism |
|---|---|
| Orchestration | OCI Full Stack Disaster Recovery: DR protection groups and plans for switchover/failover of compute, volumes, databases, OKE, load balancers |
| Block volumes | Cross-region volume group replication; volume backups copied to another region |
| Object Storage | Cross-region replication policies per bucket |
| Autonomous Database | Autonomous Data Guard standby (local or cross-region), backup-based cross-region DR |
| Base / Exadata Database | Data Guard with cross-region standby |
| DNS / traffic | OCI DNS Traffic Management steering policies (failover) with health checks |
| Infrastructure | Same Terraform applied per region, region-specific variables |

Define RPO/RTO per application, then pick replication mechanisms that meet them. Run DR drills with Full Stack DR plans, including switchback.

## 5. Security Posture Services

| Service | Use |
|---|---|
| Cloud Guard | Detector recipes (configuration and activity) and responder recipes per target compartment |
| Security Zones | Enforce policies (e.g. no public buckets, encryption with customer keys) on compartments; violating actions are denied |
| Vault | Customer-managed keys (software or HSM-protected) and secrets |
| Bastion | Time-limited SSH sessions to private resources without public IPs |
| Vulnerability Scanning | Host and container image scanning |
| Web Application Firewall | Layer 7 protection for load balancers and edge |
| Audit | Records API calls; retention configurable (default 365 days) |
| Logging Analytics / Service Connector Hub | Route logs to SIEM (Splunk, Sentinel, etc.) |

Example Security Zone-aligned policy hygiene: deny public buckets, require customer-managed keys for block volumes and buckets in production compartments.

## 6. Advanced IAM Patterns

```
# Network admins can manage network in shared-network, but not delete the DRG
Allow group 'Default'/'NetworkAdmins' to manage virtual-network-family in compartment shared-network
  where request.permission != 'DRG_DELETE'

# Time-bound / tag-based conditions
Allow group 'Default'/'AppADevelopers' to manage instance-family in compartment prod
  where target.resource.tag.Ownership.Team = 'app-a'

# OKE workload identity: pods in a namespace/service account read one bucket
Allow any-user to read objects in compartment prod:app-a
  where all { request.principal.type = 'workload',
              request.principal.namespace = 'payments',
              request.principal.service_account = 'reporter',
              request.principal.cluster_id = '<cluster-ocid>',
              target.bucket.name = 'reports' }
```

Review policies with the policy simulator/analysis tools and audit logs; avoid `manage all-resources` outside break-glass groups.

## 7. Cost Governance

- Compartment quotas: `zero compute-core quotas in compartment sandbox` then `set compute-core quota standard-e5-core-count to 16 in compartment sandbox`.
- Budgets with forecast-based alerts per compartment or cost-tracking tag.
- Cost reports exported to Object Storage for FinOps tooling.
- Commitments: Universal Credits (annual flex) and support rewards; model before committing.
- Rightsize with Cloud Advisor recommendations; use flexible shapes to match OCPU/memory.

## 8. Operations at Scale

- Events + Notifications/Functions for automated responses (e.g. tag enforcement on create).
- OS Management Hub for patching fleets.
- Monitoring alarms (MQL) on service metrics; route to PagerDuty/Slack via Notifications.
- Resource Manager stacks with drift detection.

## Pitfalls

- Flat VCN peering mesh instead of DRG hub: unmanageable routes and no inspection point.
- DR plans never executed; switchover fails on first real use.
- Cloud Guard enabled without responders or triage ownership: findings pile up.
- Quotas not set on sandbox compartments.

## Checklist

- [ ] Landing zone baseline applied from code.
- [ ] Hub-and-spoke with DRG routing and centralized inspection.
- [ ] Redundant hybrid connectivity with tested failover.
- [ ] DR per application with defined RPO/RTO and rehearsed Full Stack DR plans.
- [ ] Cloud Guard, Security Zones, Vault, Bastion, audit export in place.
- [ ] Quotas, budgets, and tag-based cost reporting per compartment.
