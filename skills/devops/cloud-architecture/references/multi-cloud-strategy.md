# Multi-Cloud Strategy

## Architecture Patterns

| Pattern | Description | Use Case |
|---------|-------------|----------|
| Active-Passive | Primary cloud runs all workloads, secondary on standby DR | Cost-sensitive, regulatory |
| Active-Active | Workloads split across clouds, each handles traffic | Latency, availability |
| Federated | Different workloads on different clouds, no failover | Best-of-breed per workload |
| Abstracted | Cloud-agnostic layer (K8s, Terraform) above providers | Portability, flexibility |

## Provider Comparison

| Dimension | AWS | Azure | GCP |
|-----------|-----|-------|-----|
| Regions | 30+ | 60+ | 40+ |
| K8s | EKS | AKS | GKE |
| Serverless | Lambda | Functions | Cloud Run |
| AI/ML | SageMaker | Azure AI | Vertex AI |
| Networking | VPC | VNet | VPC |
| Identity | IAM | Entra ID | Cloud IAM |
| Cost model | Per-hour/Per-GB | Per-minute | Per-second (many) |

## Multi-Cloud Decision Factors

- **Data gravity**: where data resides determines compute placement
- **Compliance**: data sovereignty, regional regulations
- **Vendor lock-in risk**: managed services (DynamoDB, CosmosDB, Bigtable) are harder to migrate
- **Operational complexity**: multi-cloud requires 2x the team expertise
- **Latency**: inter-cloud data transfer adds 5-50ms compared to intra-cloud

## Workload Placement

| Workload | Cloud Rationale |
|----------|----------------|
| Kubernetes | Cloud-agnostic (EKS/AKS/GKE), easy to move |
| Databases | Hardest to migrate — consider multi-cloud DB (CockroachDB, Yugabyte, Spanner) |
| ML Training | GPU availability, cost — GCP TPUs, Azure ND-series, AWS P4d |
| CDN/Edge | CloudFront vs Akamai vs Fastly vs Cloudflare — use multi-CDN |
| DR/Backup | Secondary cloud with cross-region replication |

## Anti-Patterns

- Lift-and-shift between clouds (different networking, IAM, services)
- Multi-cloud abstraction layer for everything (adds latency, complexity)
- Same architecture everywhere (lose cloud-native benefits)
- Multi-cloud without multi-cloud trained team
