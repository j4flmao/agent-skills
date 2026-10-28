# Advanced Hybrid Cloud: Fleet Management, Consistent Policy, Resilience and Cost

Operating hybrid estates at scale: managing Kubernetes and server fleets across on-prem and clouds, enforcing consistent policy and security, cross-environment disaster recovery, workload portability limits, sovereignty patterns, and hybrid FinOps.

## Fleet Management with GitOps

```
git (fleet repo)
 ├── clusters/
 │    ├── onprem-dc1/          (cluster-specific values)
 │    ├── aws-eu-west-1/
 │    └── azure-westeurope/
 ├── platform/                 (shared addons: ingress, cert-manager, policy engine, OTel collector)
 └── apps/                     (app definitions with per-environment overlays)
        |
Argo CD ApplicationSets / Flux Kustomizations -> every cluster pulls its desired state
```

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: platform-addons
  namespace: argocd
spec:
  goTemplate: true
  generators:
    - clusters:
        selector:
          matchLabels:
            fleet: production
  template:
    metadata:
      name: "addons-{{.name}}"
    spec:
      project: platform
      source:
        repoURL: https://git.example.com/platform/fleet.git
        targetRevision: main
        path: "platform/overlays/{{index .metadata.labels \"location\"}}"
      destination:
        server: "{{.server}}"
        namespace: platform-system
      syncPolicy:
        automated: { prune: true, selfHeal: true }
        syncOptions: [CreateNamespace=true]
```
- Label clusters by `location`, `provider`, `env`, `data-class` and target by labels.
- Pull-based GitOps works through firewalls (clusters reach out to git); no inbound access to on-prem needed.
- Roll out platform changes in waves: lab -> one on-prem cluster -> one cloud cluster -> rest.

Provider-integrated fleet options: Azure Arc-enabled Kubernetes (GitOps with Flux, Azure Policy), GKE fleet management, Red Hat Advanced Cluster Management, Rancher Fleet.

## Consistent Policy and Security

| Layer | Mechanism |
|---|---|
| Cloud organization guardrails | AWS SCPs/RCPs, Azure Policy and management groups, GCP Organization Policies |
| On-prem and Arc-connected servers | Azure Policy guest configuration via Arc, Ansible compliance roles, CIS hardening |
| Kubernetes admission | Kyverno or OPA Gatekeeper with the same policy library on every cluster; Kubernetes ValidatingAdmissionPolicy (CEL) for simple rules |
| IaC | Policy checks in CI (Conftest/OPA, Checkov, provider policy tools) |
| Supply chain | Signed images (cosign/Sigstore), verified at admission in all clusters |
| Secrets | One secrets platform (Vault/OpenBao or cloud secret manager) with External Secrets Operator in each cluster |
| Network | Zero-trust: mTLS between services (service mesh), identity-aware proxies instead of flat VPN access |

Maintain a single policy repository; version and test policies, and report compliance per environment.

## Workload Identity Across Boundaries
- Use OIDC federation so on-prem workloads get cloud credentials without static keys: e.g. Kubernetes service account tokens trusted by AWS IAM (IAM Roles Anywhere uses X.509 instead), Azure workload identity federation, GCP workload identity federation.
- SPIFFE/SPIRE can issue workload identities across environments for mTLS and federation.

## Hybrid Disaster Recovery

| Pattern | RPO/RTO profile | Notes |
|---|---|---|
| Backup to cloud object storage | RPO hours; RTO hours-days | Immutable/object-lock backups protect against ransomware |
| Pilot light in cloud | RPO minutes; RTO hours | Replicated data, minimal compute scaled up on failover |
| Warm standby | RPO seconds-minutes; RTO minutes | Scaled-down full stack running |
| Active-active | Near-zero | Requires conflict handling or partitioned writes; costly |

Data replication options: database-native replication (PostgreSQL streaming/logical, SQL Server AG, Oracle Data Guard), storage replication, CDC to cloud.

Practices:
- Test failover regularly (game days), including DNS cutover and identity availability when the primary site is down.
- Keep IaC able to rebuild the cloud side from scratch.
- Ensure the IdP and DNS are not single points of failure located in the failed site.

## Portability: What Is Realistic

| Layer | Portable? | Notes |
|---|---|---|
| Containers + Kubernetes manifests | Mostly | Storage classes, load balancers, ingress and IAM differ |
| Terraform | Partly | Same tool, different provider resources |
| Managed databases/queues | No | Use open-source engines (PostgreSQL, Kafka) on both sides if portability is required, at the cost of operating them |
| Serverless/proprietary AI services | No | Abstract behind interfaces if needed |

Aim for **portable skills and processes** (GitOps, IaC, observability) rather than identical stacks everywhere.

## Sovereignty and Regulated Workloads
- Sovereign cloud offerings and partner-operated regions address residency and operator-access requirements; verify key custody, support access and legal jurisdiction.
- Customer-managed keys with external key managers (HSM on-prem) keep key control outside the provider.
- Classify data and enforce placement via policy (labels like `data-class: restricted` limit scheduling to on-prem clusters).

## Observability Across Environments
- OpenTelemetry Collector agents in every environment, gateway collectors per site, exporting to one backend.
- Add `cloud.provider`, `cloud.region`, `site`, `k8s.cluster.name` resource attributes for slicing.
- Buffer telemetry locally (collector persistent queues) to survive link outages.
- Monitor interconnect health: BGP session state, link utilization, packet loss, latency.

## Hybrid FinOps

| Cost element | Consideration |
|---|---|
| Cloud egress | Data leaving cloud to on-prem/internet is billed; place chatty components together |
| Interconnect | Port fees + data transfer; size to utilization |
| On-prem TCO | Hardware depreciation, power, cooling, space, staff, licenses, refresh cycles |
| Licensing | Bring-your-own-license rules differ per provider |
| Utilization | Low on-prem utilization raises effective unit cost |

Compare **unit cost per workload** (per transaction, per user) across locations, including staff and egress, before moving workloads either way. Repatriation decisions need the same rigor as migrations.

## Edge Extensions
- Lightweight Kubernetes (k3s, MicroK8s) or managed edge offerings at sites; GitOps pull model for intermittent connectivity.
- Design for disconnected operation: local data buffering, store-and-forward, autonomous operation during WAN loss.

## Checklist
- [ ] Single fleet repo with label-based rollout across all clusters
- [ ] Same policy library enforced at cloud org, IaC and admission layers
- [ ] Keyless workload identity federation across boundaries
- [ ] DR pattern chosen per tier and failover tested, including IdP/DNS
- [ ] Data classification drives placement policies
- [ ] Unified telemetry with location attributes and link monitoring
- [ ] Unit-cost comparison including egress and on-prem TCO
