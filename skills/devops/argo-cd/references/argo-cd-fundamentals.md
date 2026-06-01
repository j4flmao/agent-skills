# ArgoCD Fundamentals

## Overview
ArgoCD is a declarative GitOps continuous delivery tool for Kubernetes. It automates application deployment and lifecycle management by synchronizing cluster state with Git repositories. ArgoCD is a CNCF graduated project.

## Core Concepts

### GitOps with ArgoCD
ArgoCD implements the GitOps operating model where Git repositories are the single source of truth for Kubernetes manifests. The ArgoCD controller continuously monitors Git repositories and compares the desired state (in Git) with the live state (in the cluster). When drift is detected, ArgoCD can automatically or manually reconcile.

### Application CRD
The Application custom resource defines the source (Git repo, path, revision), destination (cluster, namespace), and sync policy (automated, manual, pruning, self-heal). Applications are the primary unit of management in ArgoCD.

### Sync Strategies
Manual sync: operator triggers sync via UI or CLI after reviewing changes. Automated sync with prune: ArgoCD syncs automatically and removes resources not in Git. Automated sync with self-heal: ArgoCD reverts any manual changes to match Git. PruneLast: delete resources after applying new ones to reduce downtime.

### Projects
Projects provide logical grouping and RBAC boundaries for Applications. They restrict which Git repos, clusters, namespaces, and resources can be used. Projects can enforce sync and resource quotas.

## Key Components

### ArgoCD Components
API Server: exposes REST/gRPC API, UI, and CLI. Repository Server: caches Git repo contents and generates manifests. Application Controller: monitors applications and reconciles state. Dex/SSO: authentication via OIDC, GitHub, GitLab, LDAP. Redis: cache for application state.

### Deployment Options
ArgoCD can be installed on a Kubernetes cluster via manifests or Helm chart. Multi-cluster management uses cluster credentials stored as Secrets in the ArgoCD namespace. High-availability mode deploys multiple replicas of each component.

## Basic Configuration

### Application Definition
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/org/repo.git
    targetRevision: main
    path: k8s/overlays/prod
  destination:
    server: https://kubernetes.default.svc
    namespace: my-app
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

### CLI Commands
```bash
# Login and list applications
argocd login <server> --sso
argocd app list

# Manage application
argocd app create my-app --repo https://github.com/org/repo.git --path k8s/overlays/prod --dest-server https://kubernetes.default.svc --dest-namespace my-app
argocd app sync my-app
argocd app get my-app
argocd app diff my-app

# Rollback
argocd app rollback my-app <revision-id>
```

## Best Practices
- Use auto-sync with prune and self-heal for production.
- Configure sync waves to order resource creation (CRDs first, then apps).
- Use repositories separate from application source code.
- Enable automated sync only after reviewing diffs in staging.
- Use projects to enforce access controls across teams.
- Monitor sync status and alert on OutOfSync or SyncFailed.
- Pin targetRevision to specific commit or tag for production.
- Use ApplicationSets for multi-cluster or multi-environment deployments.

## References
- argo-cd-advanced.md -- Advanced ArgoCD topics
- argocd-setup.md -- ArgoCD Setup Guide
- application-sets.md -- ApplicationSets
- sync-strategies.md -- Sync Strategies
- argocd-security.md -- ArgoCD Security
