# GCP Advanced Topics

## Introduction
Advanced GCP covers organization policy at scale, multi-cluster Service Mesh, GKE Enterprise, advanced networking (NCC, PSC, hybrid connectivity), and CI/CD with Cloud Build.

## Organization Policy at Scale
Hierarchical policy enforcement: org → folder → project → resource. Custom constraints with CEL (Common Expression Language). Domain restricted sharing policy. Resource location restriction to specific regions. Shielded VMs and confidential VMs enforcement. Policy analyzer for impact analysis before applying.

## GKE Enterprise (Anthos)
Multi-cluster management: Connect, Config Management, Service Mesh. Config Management: Policy Controller (OPA/Gatekeeper) and Config Sync. Cloud Service Mesh: Istio-based, multi-cluster, multi-cloud. Serverless: Cloud Run for Anthos, Cloud Code. Migrate for Anthos: lift-and-shift VM migration to GKE. Binary Authorization for deployment gating.

## Advanced Networking
Network Connectivity Center (NCC): hub-and-spoke for hybrid connectivity. Private Service Connect (PSC): private access to managed services. Packet Mirroring: traffic capture for security analysis. Cloud NAT with manual NAT rules. Private Google Access for on-prem to GCP services. VPC Service Controls for data exfiltration prevention.

## Cloud Build CI/CD
Cloud Build triggers: branch, PR, tag, manual. Build config with cloudbuild.yaml: steps, substitutions, artifacts. Kaniko cache for container builds. Cloud Build private pools for VPC access. Artifact Registry integration. Cloud Deploy for Skaffold-based delivery and promotion. Cloud Run deploy with traffic splitting.

## Advanced IAM
IAM Conditions: attribute-based access control (resource, timestamp, IP). Deny policies: explicit deny rules alongside allow policies. Workload Identity Federation: OIDC/SAML for GitHub Actions, GitLab. Privileged Access Manager: just-in-time elevation. Policy Intelligence: recommendations, insights, troubleshooting.

## Billing and Cost Management
Billing budgets with alert thresholds and pub/sub notifications. BigQuery billing export for custom analysis. Committed Use Discounts (CUD): 1y/3y vCPU, memory, GPU. Preemptible VMs for fault-tolerant batch workloads. Cloud Cost Management: recommendations, analysis, rightsizing.

## References
- gcp-fundamentals.md -- Fundamentals
- gke-guide.md -- GKE Guide
- gcp-networking.md -- Networking
- cloud-build-cicd.md -- CI/CD
- gcp-security.md -- Security
