# ArgoCD Advanced Topics

## Introduction
Advanced ArgoCD topics cover multi-cluster management, ApplicationSets, progressive delivery with Argo Rollouts, performance tuning, and enterprise security configurations.

## Multi-Cluster Management
Register external clusters via argocd cluster add. Use cluster labels for environment targeting. ApplicationSets generate Applications per cluster using cluster generators. RBAC for per-cluster access control. Sync waves across clusters for ordered rollouts.

## ApplicationSets
ApplicationSet generators: clusters (per-cluster), git (per-directory), list (explicit list), matrix (combine generators), merge (merge generator outputs), SCM (per-SCM provider), pull request (per-PR). Template field substitution with generator parameters. Go template-based patch operations for complex transformations.

## Argo Rollouts
Blue-green deployment: service mesh traffic switching, preview services, auto-promotion. Canary deployment: incremental traffic shifting, analysis templates for automated rollback, Istio/nginx/Ambassador integration. Experiments: run test versions alongside stable for validation.

## Config Management Plugins
CMPs extend ArgoCD to support custom config management tools. Use CMPs for Kustomize (built-in), Helm (built-in), Jsonnet, Kap, Tanka, or custom tools. Plugin binaries available in ArgoCD image or sidecar containers.

## Security Hardening
Disable local users, require SSO. Project-scoped repositories and clusters. Resource exclusions and customizations to restrict CRDs. Audit logging for all API operations. Signed commits verification for Git sources. Network policies for component isolation.

## Performance Optimization
Repository server caching with Redis. Application controller sharding for large deployments. Orphaned resource cleanup. Selective sync instead of full sync by default. Resource tracking with annotation or label.

## References
- argo-cd-fundamentals.md -- Fundamentals
- argocd-setup.md -- Setup Guide
- application-sets.md -- ApplicationSets
- sync-strategies.md -- Sync Strategies
- argocd-security.md -- Security
