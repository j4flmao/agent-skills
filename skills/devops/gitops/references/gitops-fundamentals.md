# GitOps Fundamentals

## Overview
GitOps is an operational framework that applies DevOps best practices (version control, CI/CD, collaboration) to infrastructure automation. Git repositories serve as the single source of truth for declarative infrastructure and application configurations.

## Core Concepts

### GitOps Principles
Declarative description: the entire system is described declaratively (Kubernetes manifests, Terraform, Crossplane). Version controlled and immutable: desired state stored in Git with full history. Automatically applied: software agents pull changes from Git automatically. Continuously reconciled: agents continuously correct drift between desired and actual state.

### Pull vs Push Model
Pull-based (GitOps native): agent in cluster pulls desired state from Git. Cluster initiates all changes. No external access to cluster API needed. More secure.

Push-based (CI/CD traditional): CI system pushes to cluster. Cluster API exposed to CI system. Higher blast radius if CI is compromised.

### Reconciliation Loop
Git (desired state) -> GitOps Controller watches repo -> Compares with cluster state -> Detects drift -> Applies desired state -> Reports sync status -> Loops continuously (every 3-5 minutes).

## Key Implementations

### ArgoCD
CNCF graduated project. Rich web UI with sync status visualization. Sync waves for resource ordering. ApplicationSets for multi-cluster management. SSO integration (OIDC, Dex, GitHub). Rollback via UI or CLI.

### Flux
CNCF graduated project, lighter weight. Kubernetes-native CRDs (GitRepository, Kustomization, HelmRelease). SOPS integration for secret encryption. depends-on for resource ordering. Multi-cluster via separate Kustomizations.

## Repository Structure

### Monorepo Pattern
```
infra-repo/
  base/              # Common configuration
    kustomization.yaml
    deployment.yaml
    service.yaml
  overlays/
    dev/             # Dev environment overrides
    staging/         # Staging environment
    prod/            # Production environment
```

## Best Practices
- Enable auto-sync with prune and self-heal for production.
- Use separate repo for application config (not application source code).
- Store secrets encrypted (SealedSecrets, SOPS, External Secrets).
- Pin targetRevision to specific branch, tag, or commit.
- Use branch protection on GitOps repo.
- Enable sync waves for resource ordering.
- Monitor sync status and alert on OutOfSync or SyncFailed.
- Document rollback procedure (revert Git commit).

## References
- gitops-advanced.md -- Advanced GitOps topics
- argocd-setup.md -- ArgoCD Setup
- flux-setup.md -- Flux Setup
- sync-strategies.md -- Sync Strategies
- gitops-security-compliance.md -- GitOps Security
