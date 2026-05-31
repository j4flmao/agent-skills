# GitOps Advanced: Security Hardening

## Overview

GitOps systems occupy a privileged position in the infrastructure: they have write access to Kubernetes clusters, read access to Git repositories containing configuration secrets, and the ability to deploy arbitrary workloads. Compromising a GitOps tool like ArgoCD or Flux gives an attacker control over the entire cluster and potentially every cluster it manages. This reference provides deep architecture for hardening GitOps deployments against compromise.

## Core Architecture Concepts

### GitOps Attack Surface

The GitOps pipeline introduces several attack vectors that traditional CI/CD does not:

Attack Surface:
- Git Repository: Malicious PR merged, repository compromise, secret exposure in Git history
- GitOps Controller (ArgoCD/Flux): Controller compromise, webhook spoofing, configuration drift
- CI/CD Integration: CI token compromise, pipeline injection, artifact tampering
- Cluster API: RBAC escalation, CRD injection, admission control bypass
- Secrets Management: Encrypted secret decryption key compromise, vault credential leak

### Security Architecture Layers

Layer 1: Git Security
- Signed commits (GPG/SSH), branch protection rules
- CODEOWNERS for sensitive paths
- Dependabot/Renovate for dependency scanning
- Secret scanning (pre-commit hooks, push protection)

Layer 2: CI/CD Security
- OIDC-based cloud authentication (no static keys)
- SLSA provenance attestation
- Image signing and verification
- Build isolation (ephemeral runners)

Layer 3: GitOps Controller Security
- RBAC least privilege (per-App, per-Cluster)
- Network policies (controller isolation)
- Audit logging (all sync operations)
- Webhook signature verification

Layer 4: Deployment Security
- Admission control (OPA/Kyverno)
- Pod Security Standards
- Container image policy enforcement
- Runtime security (Falco, AppArmor)

### Decision Tree: GitOps Security Model

GitOps Authentication Model:
- ArgoCD: SSO integration (OIDC, SAML, Dex), local users (RBAC per project), webhook authentication (HMAC verification), CLI tokens (scoped, short-lived)
- Flux: Git authentication (deploy keys, SSH), OCI authentication (registry credentials), webhook receivers (HMAC verification)
- Crossplane: Provider credentials (Vault, IRSA, Workload Identity), composition RBAC, package authentication

## Architecture Decision Trees

### Secret Management Strategy

Secret Storage Decision:
- Encrypted in Git: Sealed Secrets (Bitnami), SOPS (Mozilla + Age/GPG + KMS), Helm Secrets
- External Secrets: External Secrets Operator (multiple providers), Vault Agent Sidecar, Cloud-native (AWS Secrets Manager, GCP Secret Manager)
- Hybrid: Bootstrap secrets in Git (encrypted), runtime secrets from vault, rotation via External Secrets Operator

### Controller Isolation Strategy

Controller Isolation Level:
- Namespace-scoped (Flux per-namespace): Each team has their own controller, limited blast radius
- Cluster-scoped (ArgoCD project-based): RBAC per Project, resource restrictions per Project
- Multi-cluster (ArgoCD hub): Hub cluster has elevated privileges, agent clusters limited scope

## Implementation Strategies

### ArgoCD RBAC Hardening

ArgoCD RBAC configuration uses ConfigMap-based policy definitions. Each project has defined roles: team-admin (full project access), team-developer (sync and update), team-viewer (read-only). Platform team has admin access across all projects.

### ArgoCD Project Security Constraints

Each project restricts source repositories, destination namespaces, and available resource types. Cluster-scoped resources are whitelisted explicitly. Dangerous resource types (ClusterRoleBinding, CRD) are blacklisted.

### Image Policy and Signature Verification

Flux ImagePolicy with Cosign verification ensures only signed images are deployed. The verification provider validates signatures against public keys stored in Kubernetes secrets. Failed verification blocks the deployment.

### Webhook Security

Webhooks triggering GitOps syncs must be authenticated with HMAC signatures. GitHub, GitLab, and Bitbucket webhook secrets are configured in the ArgoCD secret. Without valid signatures, webhook events are rejected.

## Integration Patterns

### Admission Control Integration

GitOps controllers should be gated by admission control that validates manifests before deployment. OPA/Gatekeeper constraints ensure all deployed resources have required labels and annotations. Kyverno policies validate that GitOps-managed resources meet security standards.

### Image Policy Enforcement

Container image policies prevent deployment of untrusted images:
- Allowed registries: Only known registries permitted
- Image signing: Cosign signatures required for production
- Vulnerability threshold: No critical vulnerabilities
- Freshness policy: Images not older than 30 days

### Network Policy for Controller Isolation

GitOps controller pods should be isolated with NetworkPolicies:
- Ingress: Only from API server and monitoring
- Egress to Git: Allow only to known Git servers
- Egress to cluster: Allow only to Kubernetes API
- Egress to registries: Allow only to known container registries
- No direct internet access for controller pods

## Performance Optimization

### Security Overhead Management

- Signed commit verification: Enable by default in CI, optional in emergency
- Admission control: Use validating webhooks for policy enforcement, not mutating
- Audit logging: Async writes to SIEM, batch processing
- Webhook HMAC verification: Negligible overhead (sub-millisecond)

## Security Considerations

### Incident Response for GitOps Compromise

If the GitOps controller is compromised:

1. Revoke all controller tokens and deploy keys
2. Rotate all secrets accessible from the controller
3. Audit recent sync operations for unauthorized deployments
4. Review Git revision history for unauthorized commits
5. Reinstall controller from clean state
6. Verify cluster state matches Git desired state

### Compliance and Audit

| Requirement | Implementation | Verification |
|-------------|---------------|--------------|
| Change traceability | Every deployment traces to Git commit | Git log audit |
| Access control | Per-project RBAC | Monthly access review |
| Approval gates | Sync approval for production | Approval chain audit |
| Image provenance | Cosign signatures | Signature verification log |
| Secret management | Encrypted in Git or external vault | No plaintext secrets in Git |

## Operational Excellence

### Security Monitoring for GitOps

| Metric | Alert | Action |
|--------|-------|--------|
| Failed webhook auth | Suspicious sync attempt | Investigate source |
| Unauthorized sync | RBAC violation | Review access, revoke tokens |
| Unsigned image deployment | Policy violation | Block deployment, notify security |
| Secret scan alert | Credential in Git | Rotate credential, scrub history |
| Controller audit log gap | Logging failure | Restart controller, verify SIEM |

## Testing Strategy

### Security Testing

| Test | Method | Frequency |
|------|--------|-----------|
| RBAC validation | Verify per-project permissions | Every config change |
| Secret encryption test | Confirm sealed secrets decrypt correctly | Every release |
| Webhook auth test | Send invalid HMAC, verify rejection | Weekly |
| Admission control test | Deploy violating manifest, verify block | Every policy change |
| Controller compromise drill | Simulate compromise, measure response | Quarterly |
| Image policy test | Deploy unsigned image, verify block | Every policy change |

## Common Pitfalls

| Pitfall | Impact | Prevention |
|---------|--------|------------|
| Overly permissive ArgoCD RBAC | Blast radius covers all projects | Per-Project RBAC, deny by default |
| Secrets in Git history | Credentials permanently exposed | Pre-commit secret scanning, history rewriting |
| No webhook authentication | Anyone can trigger sync | HMAC verification on all webhooks |
| Unverified container images | Malicious code deployed | Image signing and verification |
| Controller internet access | Data exfiltration risk | Network policies restricting egress |
| No audit logging | Compromise undetected | Centralized audit log collection |
| Shared deploy keys | One key for all clusters | Per-cluster deploy keys |
| Disabled admission control | Policy bypass | Validate-only admission as safety net |

## Key Takeaways

- GitOps controllers are high-value targets; they combine Git write access, cluster admin privileges, and secret access
- RBAC must be per-project with least privilege; global admin access should be limited to emergency break-glass accounts
- All secrets in Git must be encrypted; plaintext secrets in repositories are the most common GitOps security failure
- Webhook authentication prevents unauthorized sync triggers; every webhook endpoint must verify HMAC signatures
- Container image signing with Cosign ensures only approved images are deployed through GitOps
- Admission control provides a secondary validation layer: even if a malicious manifest reaches the cluster, policy enforcement blocks it
- Network policies should isolate the GitOps controller; it should not have arbitrary internet access
- Audit logging must capture every sync operation: who triggered it, what changed, and what revision was deployed
- Regular security testing (RBAC validation, webhook auth, admission control) prevents configuration drift from weakening security
- The principle of least privilege applies recursively: each component (Git, controller, cluster) trusts the others only as much as necessary
