---
name: devops-gitops-advanced
description: >
  Use when the user asks about advanced GitOps, multi-cluster GitOps, ArgoCD ApplicationSets, sync waves, sync phases, progressive delivery with GitOps, cluster bootstrapping, or GitOps at scale. Do NOT use for: basic GitOps introduction (devops-gitops), basic ArgoCD setup (devops-argo-cd), or Flux setup.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, gitops-advanced, phase-3]
---

# GitOps Advanced

## Purpose
Implement advanced GitOps patterns: multi-cluster management, ApplicationSets, sync strategies, progressive delivery, cluster bootstrapping, and GitOps at enterprise scale.

## Workflow

### Multi-Cluster GitOps
```
Git Repository (source of truth)
  ├── clusters/
  │   ├── production/
  │   ├── staging/
  │   └── development/
  ├── apps/
  │   ├── team-a/
  │   ├── team-b/
  │   └── platform/
  └── infrastructure/
      ├── cert-manager/
      ├── ingress-nginx/
      └── monitoring/

ArgoCD (Hub Cluster) — manages app-of-apps pattern
  ├── Cluster 1: Production (us-east-1)
  ├── Cluster 2: Production (eu-west-1)
  ├── Cluster 3: Staging
  └── Cluster 4: Development
```

### ApplicationSet Patterns
| Generator | Use Case |
|-----------|----------|
| Cluster generator | Deploy to all clusters |
| Git generator | Generate apps from directory structure |
| Matrix generator | Combine cluster + git for multi-dimensional |
| SCM provider | Auto-discover repos in GitHub/GitLab |
| Pull request | Preview environments per PR |

### Sync Waves Strategy
```
Wave 0: CRDs, Namespaces
Wave 1: Storage (PostgreSQL, Redis)
Wave 2: Network (Ingress, Service Mesh)
Wave 3: Application Deployments
Wave -1: Pre-sync hooks (migrations)
Wave -5: Cluster bootstrap (operators, cert-manager)
```

### Progressive Delivery with GitOps
| Strategy | ArgoCD Mechanism | Rollback |
|----------|-----------------|----------|
| Canary | Argo Rollouts + Istio/nginx | Automatic on failure |
| Blue-Green | Argo Rollouts + Service mesh | Instant switch |
| A/B Testing | Istio VirtualService + ArgoCD | Traffic shift |

## References
  - references/applicationset-generators.md — ArgoCD ApplicationSet Generators
  - references/argocd-image-updater.md — ArgoCD Image Updater
  - references/gitops-advanced-advanced.md — Gitops Advanced Advanced Topics
  - references/gitops-advanced-fundamentals.md — Gitops Advanced Fundamentals
  - references/gitops-secrets.md — Secrets in GitOps
  - references/multi-cluster-management.md — Multi-Cluster GitOps Management
  - references/sync-phases-hooks.md — Sync Phases, Waves, and Hooks
## Handoff
Related skills: devops-progressive-delivery, devops-argo-cd, devops-gitops, kubernetes-patterns.
