# GitOps Security Hardening

## Repository Security
Branch protection: require PR reviews, status checks, no direct pushes. Signed commits: GPG or SSH signing for all commits. Signed tags for releases. Secret scanning on push (GitHub secret scanning, GitLab secret detection). Repository visibility: private for config containing secrets. Least-privilege access: read-only for most engineers, write for platform team.

## Image Security
Image signing with cosign and Sigstore keyless signing. Verification in admission controller (Kyverno, OPA). Image provenance: attestations for build and source. Vulnerability scanning in registry. Base image freshness: automated update with Renovate. Image pull policy: Always for production.

## Secret Management in GitOps
Sealed Secrets: encrypt Secret resources in Git. External Secrets Operator: sync secrets from external stores at runtime. SOPS: encrypt individual values in YAML with age/GPG. Vault Agent Sidecar: inject secrets from HashiCorp Vault. Avoid committing plain-text secrets. Audit secret access with external store logs.

## Access Control
GitOps controller service account with minimal RBAC. Application namespace isolation. Multi-tenancy with ArgoCD projects or Flux profiles. SSO/OIDC integration for ArgoCD/Flux UI. API token rotation and expiration. Audit logging of sync operations.

## Network Security
Webhook security: validate payload with shared secret. Mutual TLS for GitOps controller communication. Egress restrictions: controller only reaches Git server and registry. Ingress to GitOps UI restricted by IP allowlist. Cluster network policies for GitOps controller.

## Compliance and Audit
Sync history: full audit trail of deployments. Approval gates for production environments. Drift detection alerts. Policy enforcement with OPA/Gatekeeper. Compliance reports for SOC 2, PCI DSS, HIPAA.

## References
- gitops-fundamentals.md -- Fundamentals
- argocd-setup.md -- ArgoCD Setup
- flux-setup.md -- Flux Setup
- sync-strategies.md -- Sync Strategies
- gitops-advanced.md -- Advanced Topics
