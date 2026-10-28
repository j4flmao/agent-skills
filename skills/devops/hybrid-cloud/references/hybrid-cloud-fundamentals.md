# Hybrid Cloud Fundamentals

Hybrid cloud combines on-premises (or colocation/private cloud) infrastructure with one or more public clouds, connected and operated as one estate. This reference covers definitions, drivers, workload placement, the reference building blocks (network, identity, data, platform, management), and the operating model. Deep dives on dedicated links, DNS, identity federation, data gravity and networking patterns are in sibling references.

## Definitions

| Term | Meaning |
|---|---|
| Hybrid cloud | On-prem/private + public cloud, integrated (network, identity, management) |
| Multi-cloud | Two or more public clouds; may or may not include on-prem |
| Private cloud | Self-service, API-driven infrastructure on dedicated hardware (VMware VCF, OpenStack, Nutanix, Kubernetes on bare metal) |
| Edge | Compute near users/devices (stores, factories) managed centrally |
| Cloud-on-prem appliances | Provider hardware in your site: AWS Outposts, Azure Local (formerly Azure Stack HCI), Google Distributed Cloud |

## Why Organizations Run Hybrid

| Driver | Example |
|---|---|
| Data residency / sovereignty | Regulated data must stay in-country or on-prem |
| Latency / locality | Factory control systems, trading, retail stores |
| Existing investment | Mainframes, recently purchased hardware, licensed software |
| Migration in progress | Workloads moving over years (strangler pattern) |
| Burst capacity | Steady load on-prem, peaks in cloud |
| Cost profile | Stable, predictable workloads can be cheaper on owned hardware; spiky ones in cloud |
| Resilience | Cloud as DR site for on-prem, or vice versa |

Hybrid adds complexity; it should follow a business reason, not be the default.

## Workload Placement

```
For each workload:
  regulatory constraint on location?        -> on-prem / sovereign region
  latency to on-prem systems/devices < N ms? -> on-prem or edge, or move dependencies together
  large data that is expensive to move?     -> keep compute near data (data gravity)
  elastic or seasonal demand?               -> public cloud
  needs managed services (ML, analytics)?    -> public cloud
  stable 24x7 load, hardware already owned?  -> on-prem may be cheaper (verify TCO)
```
Evaluate per application group, keeping chatty dependencies in the same location.

## Building Blocks

### 1. Connectivity
| Option | Characteristics |
|---|---|
| Site-to-site IPsec VPN | Quick, over internet, variable latency; good for start or backup |
| Dedicated interconnect (AWS Direct Connect, Azure ExpressRoute, Google Cloud Interconnect) | Private, predictable bandwidth/latency; weeks to provision |
| Cloud exchange / NaaS (Equinix Fabric, Megaport) | Virtual cross-connects to multiple clouds |
| SD-WAN | Policy-based routing across links, branch integration |

Plan non-overlapping IP address space (IPAM) across all environments before connecting anything.

### 2. Identity
- One authoritative identity source (Entra ID, Okta, Active Directory with sync) federated to all clouds (SAML/OIDC).
- Workload identity for services rather than long-lived keys; consistent RBAC model.

### 3. DNS
- Split-horizon: private zones resolvable from on-prem and cloud via conditional forwarders/resolver endpoints.

### 4. Platform
- Kubernetes as a common runtime across locations (EKS Anywhere, AKS enabled by Azure Arc, GKE on bare metal/VMware, OpenShift, Rancher) or VMs with consistent images.
- Infrastructure as code (Terraform/OpenTofu, Pulumi, Ansible) for all environments.

### 5. Management and Governance
| Tool | Scope |
|---|---|
| Azure Arc | Projects on-prem/other-cloud servers, Kubernetes and data services into Azure for policy, monitoring, updates |
| Google Distributed Cloud / GKE Enterprise fleet features | Manage GKE clusters across environments |
| AWS Systems Manager hybrid activations, EKS Anywhere, Outposts | Manage on-prem servers/clusters with AWS tooling |
| Red Hat OpenShift / ACM, SUSE Rancher | Vendor-neutral cluster fleet management |
| Terraform + GitOps (Argo CD, Flux) | Declarative config across all clusters |

### 6. Observability and Security
- Central logging/metrics/tracing (OpenTelemetry collectors in every environment, one backend).
- Consistent security baseline: CIS benchmarks, policy-as-code, vulnerability scanning, secrets manager reachable from both sides.

## Reference Architecture

```
            Corporate IdP (SSO, MFA)  ----------------------------+
                    |                                              |
On-prem DC                   Interconnect (2x, diverse)        Public cloud
+-------------------+  <================================>  +-------------------------+
| VMware / K8s      |        + IPsec VPN backup            | Landing zone (hub VNet/  |
| Databases, ERP    |                                      |  VPC, shared services)   |
| Hybrid DNS fwd    | <---- conditional forwarding ---->   | Private DNS resolver     |
| OTel collectors   | ----- telemetry ---------------->    | Observability backend    |
+-------------------+                                      | Spoke VPCs per workload  |
                                                           +-------------------------+
             GitOps repo -> Argo CD/Flux in each cluster; Terraform for both sides
```

## Operating Model
- Platform team owns connectivity, landing zones, shared services and the golden paths.
- Application teams consume self-service templates regardless of location.
- FinOps covers cloud spend and on-prem capacity/cost together (unit costs per workload).
- Change management and incident response span both environments with shared runbooks.

## Common Pitfalls
| Pitfall | Consequence |
|---|---|
| Overlapping CIDR ranges | NAT complexity or re-IP projects |
| Single interconnect without backup | Outage when the link or provider fails |
| Separate identity per environment | Access sprawl, weak offboarding |
| Chatty app split across sites | Latency and egress costs |
| Ignoring egress charges | Unexpected bills for data leaving the cloud |
| Two tooling stacks | Double operational burden |

## Checklist
- [ ] Business reason documented for each hybrid workload
- [ ] Global IPAM plan with no overlaps
- [ ] Redundant connectivity with a tested failover
- [ ] Single federated identity and workload identity
- [ ] Hybrid DNS resolution in both directions
- [ ] One IaC/GitOps workflow and one observability backend
- [ ] Egress and capacity costs modeled per workload
