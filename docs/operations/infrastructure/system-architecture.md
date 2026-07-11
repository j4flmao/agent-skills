# Infrastructure System Architecture

## Layered Model

```
┌──────────────────────────────────────────────────────────────┐
│                     L7 — Governance & Strategy                │
│  (cloud-architecture, multi-cloud, migration, finops, cost)  │
├──────────────────────────────────────────────────────────────┤
│                   L6 — Security & Compliance                  │
│  (iam, network-policy, secrets, audit, compliance, zero-trust)│
├──────────────────────────────────────────────────────────────┤
│                  L5 — Observability & Incident                │
│  (monitoring, logging, tracing, incident-response, runbooks)  │
├──────────────────────────────────────────────────────────────┤
│               L4 — Service Mesh & Networking                   │
│  (service-mesh, ingress, dns, cdn, load-balancing, mTLS)      │
├──────────────────────────────────────────────────────────────┤
│               L3 — Compute & Orchestration                     │
│  (kubernetes, nomad, serverless, docker, helm, autoscaling)   │
├──────────────────────────────────────────────────────────────┤
│                L2 — Infrastructure as Code                     │
│  (terraform, pulumi, crossplane, gitops/argo-cd, policy-code) │
├──────────────────────────────────────────────────────────────┤
│              L1 — Cloud & Physical Infrastructure              │
│  (aws, azure, gcp, datacenter, bare-metal, hybrid-cloud)      │
├──────────────────────────────────────────────────────────────┤
│             L0 — Network, Storage, Compute Foundations         │
│  (vpc, storage, cdn-edge, backup-dr, network-infrastructure)  │
└──────────────────────────────────────────────────────────────┘

 Cross-Cutting:
 ┌───────────┐ ┌────────────┐ ┌───────────────┐ ┌──────────┐
 │   CI/CD   │ │    IaC     │ │    Chaos /     │ │  On-Call │
 │  (cicd,   │ │ (terraform,│ │  Resilience    │ │ (incident│
 │  argo-cd) │ │  pulumi)   │ │   Testing      │ │ response)│
 └───────────┘ └────────────┘ └───────────────┘ └──────────┘
```

## Layer Descriptions

### L0 — Network, Storage, Compute Foundations
The lowest layer provides raw infrastructure building blocks: virtual networks (VPC/VNet), subnets, routing, firewall rules, block/object/file storage, bare-metal compute, and physical data center or cloud region topology. This layer is provisioned once per environment and rarely changes.

**Key decisions:** CIDR allocation, region selection, storage tier (SSD vs HDD vs object), network throughput SLAs.

**Skills:** `network-infrastructure`, `storage-infrastructure`, `datacenter`, `bare-metal`, `cdn-edge`, `backup-dr`

### L1 — Cloud & Physical Infrastructure
Cloud provider-specific services and configurations. This layer includes landing zones, organization structure, IAM hierarchy, billing/account structure, and servicequotas. Multi-cloud strategy lives here — which workload goes to which provider based on cost, compliance, and capability.

**Key decisions:** Single vs multi-cloud, landing zone design, account/org structure, region strategy, reserved instances vs on-demand.

**Skills:** `aws`, `azure`, `gcp`, `alibaba-cloud`, `oracle-cloud`, `ibm-cloud`, `digitalocean`, `hetzner`, `hybrid-cloud`, `cloud-architecture`

### L2 — Infrastructure as Code
All infrastructure defined as code. Terraform, Pulumi, Crossplane, and OpenTofu for infrastructure provisioning. GitOps (ArgoCD) for application deployment. Policy as Code (Sentinel, OPA) for compliance enforcement. This layer ensures reproducible, auditable, and version-controlled infrastructure.

**Key decisions:** State backend, module structure, policy enforcement point, Git vs CI/CD trigger.

**Skills:** `terraform`, `pulumi`, `crossplane`, `argo-cd`, `gitops`, `policy-as-code`, `helm-patterns`

### L3 — Compute & Orchestration
Where workloads actually run. Kubernetes for container orchestration (with operators, autoscaling, scheduling policies), Nomad for simpler/batch workloads, serverless for event-driven functions. This layer abstracts the underlying compute (VMs, bare-metal) behind a unified scheduling interface.

**Key decisions:** K8s vs Nomad vs serverless, cluster sizing, node pool strategy, autoscaling policy, namespace isolation model.

**Skills:** `kubernetes-patterns`, `helm-patterns`, `nomad`, `serverless`, `docker-patterns`, `kubernetes-autoscaling`, `kubernetes-operators`, `container-security`

### L4 — Service Mesh & Networking
Service-to-service communication: traffic routing, mTLS, observability, circuit breaking, rate limiting. Service mesh (Istio, Linkerd) provides uniform security and observability across all service communication. Ingress/egress gateways control external traffic. DNS and CDN provide global routing and edge caching.

**Key decisions:** Mesh vs no mesh, Istio vs Linkerd vs Consul Connect, mTLS mode, egress control strategy, ingress gateway topology.

**Skills:** `service-mesh`, `cilium-ebpf`, `network-infrastructure`, `cdn-edge`

### L5 — Observability & Incident
Metrics, logs, traces, and alerting — the "three pillars" plus incident management. This layer tells you what's happening, what went wrong, and how to fix it. Incident response runbooks, postmortems, and metrics (MTTD/MTTR) close the feedback loop.

**Key decisions:** Metrics backend (Prometheus vs Datadog vs Grafana Cloud), logging (ELK vs Loki vs CloudWatch), tracing (Jaeger vs Datadog), alert routing (PagerDuty vs OpsGenie).

**Skills:** `monitoring`, `observability`, `apm-observability`, `opentelemetry`, `incident-response`, `sre-practices`, `chaos-engineering`

### L6 — Security & Compliance
Identity, access control, secrets management, vulnerability scanning, compliance auditing, and threat detection. This layer spans all others — from IAM on L1 to pod security policies on L3 to mTLS on L4.

**Key decisions:** Zero-trust vs perimeter-based, secrets management strategy (Vault vs cloud-native), SIEM vs no SIEM, compliance framework (SOC2, PCI, HIPAA).

**Skills:** `vault`, `secrets-management`, `iam-governance`, `policy-as-code`, `container-security`, `api-security`, `cspm`, `zero-trust`

### L7 — Governance & Strategy
Cost governance, capacity planning, architecture governance, SLA management, vendor management. This layer ensures the infrastructure business alignment: cost-effective, compliant, and capable of meeting business SLAs.

**Key decisions:** Finops vs fixed budget, reserved instance strategy, capacity buffer, vendor lock-in risk acceptance.

**Skills:** `cloud-cost-optimization`, `finops`, `capacity-planning`, `sla-management`, `vendor-management`, `enterprise/architecture-governance`

## Cross-Cutting Concerns

### CI/CD Pipeline
Spans L2 (IaC applies via CI/CD) to L5 (deployment observability). Every layer change flows through CI/CD: infrastructure changes via Terraform in CI, application changes via Helm in ArgoCD.

**Skills:** `cicd-pipeline`, `github-actions`, `gitlab-ci`, `circleci`, `jenkins`, `argo-cd`

### Chaos & Resilience Testing
Validates the entire stack. Pod kill (L3), network latency (L4), certificate expiry (L6), DNS failure (L0). Chaos experiments are the only holistic test of all layers working together.

**Skills:** `chaos-engineering`, `resilience-patterns`

### Cost Optimization
Every layer has cost implications: L0 storage tier, L1 instance type/reservation, L3 cluster overhead, L5 data retention, L7 finops.

**Skills:** `cloud-cost-optimization`, `finops`, `data-cost-optimization`

## Common Failure Scenarios

| Scenario | Layer | Detective Control | Mitigation |
|----------|-------|-------------------|------------|
| AZ outage | L0 | Health checks, multi-AZ | Spread across AZs, PDB |
| Cloud provider outage | L1 | Multi-cloud DR | Failover to secondary |
| Terraform state corruption | L2 | Remote state locking | Restore from backup |
| Cluster autoscaler failure | L3 | Pod pending alerts | Overprovision buffer |
| mTLS cert expiry | L4 | Certificate expiry monitoring | Auto-rotation, short TTL |
| Alert fatigue | L5 | Noise reduction, SLO-based | Tune thresholds, dedup |
| Secrets leak | L6 | Audit logging, rotation | Short-lived secrets, access review |
| Cost overrun | L7 | Budget alerts | Automated shutdown, tagging |

## Architecture Decision Records

Major infrastructure decisions should be documented as ADRs in `docs/infrastructure/adr/`. Example decisions:
- Container orchestration: K8s vs Nomad
- Service mesh: Istio vs Linkerd vs none
- IaC tool: Terraform vs Pulumi vs Crossplane
- GitOps: ArgoCD vs Flux

## Related Documents

- `docs/blockchain/system-architecture.md` — blockchain infrastructure layer model
- `skills/enterprise/high-availability/references/load-balancing.md` — load balancing algorithms reference
- `skills/enterprise/business-continuity/` — business continuity and DR planning
- `skills/planning/solution-architecture/` — solution architecture patterns
