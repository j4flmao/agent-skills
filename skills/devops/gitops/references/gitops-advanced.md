# GitOps Advanced Topics

## Introduction
Advanced GitOps covers multi-environment promotion strategies, secrets management, progressive delivery with Flagger/Argo Rollouts, multi-cluster management, and Kustomize advanced patterns.

## Multi-Environment Promotion
Promotion path: dev → staging → production. Image promotion: update tag in Git, sync to next env. Config promotion: propagate config changes through envs. Manual approval gates between envs. Automated smoke tests after each promotion. Rollback: revert commit, sync previous state.

## Secrets Management
Sealed Secrets: encrypt Secrets into SealedSecret CRDs. External Secrets Operator: sync from AWS Secrets Manager, Azure Key Vault, GCP Secret Manager, HashiCorp Vault. SOPS: encrypt secrets in Git with age/GPG, decrypt at sync time. Vault Agent Sidecar: inject secrets from Vault. ClusterSecret: replicate secrets across namespaces.

## Progressive Delivery
Flagger: automated canary, A/B, blue-green deployments. Canary metrics-based promotion: traffic percentage increases with success metrics. A/B testing: route by header, cookie, or query parameter. Blue-green: instant switch with rollback. Prometheus metrics integration for automated analysis. Webhook-based manual approval for production.

## Multi-Cluster Management
ApplicationSet (ArgoCD): generates Applications per cluster. Cluster add-ons managed centrally via App of Apps. Config per cluster with ApplicationSet generators. DR cluster: passive sync, promoted on failover. Hub cluster: discover and manage spoke clusters.

## Kustomize Advanced Patterns
Kustomize components for reusable config pieces. Patches: patchStrategicMerge, patchJson6902, replacements. Variants: overlay per env with different patches. Kustomize plugins for custom transformers. ConfigMapGenerator and SecretGenerator with hashed content.

## Config Drift Detection
Drift detection on sync, periodic, and webhook trigger. Auto-prune for resources removed from Git. Diff preview in PR/MR comments. Manual sync override for emergency changes. Drift alerting and automatic correction.

## References
- gitops-fundamentals.md -- Fundamentals
- argo-cd-workflows.md -- ArgoCD Workflows
- flux-reconciliation.md -- Flux Reconciliation
- secrets-management.md -- Secrets with GitOps
- multi-cluster-gitops.md -- Multi-Cluster GitOps
