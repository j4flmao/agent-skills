# Infrastructure System Architecture

## Layered Model

```mermaid
graph LR
    subgraph L7 - Governance & Strategy
    A[Cloud Architecture, FinOps, Cost]
    end
    subgraph L6 - Security & Compliance
    A --> B[IAM, Secrets, Zero-Trust, Audit]
    end
    subgraph L5 - Observability & Incident
    B --> C[Monitoring, Logging, Tracing]
    end
    subgraph L4 - Service Mesh & Networking
    C --> D[Ingress, DNS, CDN, mTLS]
    end
    subgraph L3 - Compute & Orchestration
    D --> E[Kubernetes, Serverless, Nomad]
    end
    subgraph L2 - Infrastructure as Code
    E --> F[Terraform, Pulumi, GitOps]
    end
    subgraph L1 - Cloud & Physical Infrastructure
    F --> G[AWS, Azure, GCP, Bare-Metal]
    end
    subgraph L0 - Network, Storage, Compute Foundations
    G --> H[VPC, Storage, Backup-DR]
    end
    
    cross[Cross-Cutting: CI/CD, Chaos Engineering, On-Call] -.-> A
    cross -.-> H
```

## Layer Descriptions

### L0 — Network, Storage, Compute Foundations
The lowest layer provides raw infrastructure building blocks: virtual networks (VPC/VNet), subnets, routing, firewall rules, block/object/file storage, bare-metal compute, and physical data center or cloud region topology. This layer is provisioned once per environment and rarely changes.

**Key decisions:** CIDR allocation, region selection, storage tier (SSD vs HDD vs object), network throughput SLAs.

**Skills:** `network-infrastructure`, `storage-infrastructure`, `datacenter`, `bare-metal`, `cdn-edge`, `backup-dr`

> [!IMPORTANT]
> **Production Best Practice**: Avoid overlapping CIDR blocks across environments or VPCs. Use IP Address Management (IPAM) tools to enforce contiguous non-overlapping subnets to ensure VPC peering or Transit Gateway routing remains trivial in the future.

### L1 — Cloud & Physical Infrastructure
Cloud provider-specific services and configurations. This layer includes landing zones, organization structure, IAM hierarchy, billing/account structure, and service quotas. Multi-cloud strategy lives here — which workload goes to which provider based on cost, compliance, and capability.

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

> [!TIP]
> **Production Best Practice**: Enable strict mTLS only after confirming all workload readiness. Use Permissive mode during migrations. Control outbound/egress traffic tightly using egress gateways to prevent data exfiltration.

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

## Advanced Troubleshooting Workflows

### Multi-Region Outage Remediation
1. Verify L0 Network State (Transit Gateways, BGP peering).
2. Validate Global Load Balancer / DNS health probes. Route traffic statically if health probes are failing falsely.
3. Scale L3 Node Pools in the healthy region immediately.
4. Scale Workloads dynamically using HPA/KEDA.

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
