---
name: devops-argo-cd
description: |
  Trigger: "ArgoCD", "Argo CD", "GitOps", "GitOps deployment", "ArgoCD app",
  "ArgoCD project", "sync policy", "auto-sync", "ArgoCD application set",
  "ArgoCD rollback", "declarative GitOps"
  Exclusion: Not for general Kubernetes manifests — use kubernetes-patterns.
version: 1.0.0
author: j4flmao
license: MIT
compatibility:
  cli: true
  core: true
  editor: true
  api: true
tags: [devops, gitops, argocd, kubernetes, phase-7]
---

# devops-argo-cd

## Purpose

Manage GitOps workflows using ArgoCD — declarative Kubernetes deployments
with auto-sync, ApplicationSets, multi-cluster, and RBAC.

## Agent Protocol

### Trigger

Any user message referencing ArgoCD, GitOps, sync policies, ApplicationSets,
rollback, or multi-cluster GitOps deployments.

### Input Context

Desired ArgoCD operation: application definition, sync strategy, project
scoping, ApplicationSet generator type, or multi-cluster registration.

### Output Artifact

ArgoCD Application/AppProject/ApplicationSet manifests as YAML, plus
sync policy, RBAC configuration, and cluster registration commands.

### Response Format

YAML manifests with inline explanations. Usage examples and CLI commands
where applicable.

No preamble. No postamble. No explanations. No filler/hedging/transitions.
Compress output — why use many token when few do trick.

### Completion Criteria

Application synced, health check passing. RBAC and project scoping applied.
Multi-cluster registration verified.

### Max Response Length

8000 tokens.

## Workflow

### 1. Architecture Overview

ArgoCD comprises five components: API server (UI + API endpoints), repo server
(caches Git repos), application controller (reconciles desired vs live state),
Redis cache (for dedup and memoization), and Dex/ OIDC integration for SSO.
All components run in the argocd namespace.

### 2. Application Definition

Application CRD defines: source repo (Helm, Kustomize, plain YAML, or Jsonnet),
destination cluster/server, sync policy (manual or auto-sync with prune), sync
options (e.g. SkipDryRunOnMissingResource, PruneLast, RespectIgnoreDifferences),
and health checks (lua or built-in for common workloads).

### 3. Sync Strategies

Auto-sync with prune and self-heal for standard deployments. Manual sync with
apply-out-of-sync-only for controlled rollouts. Sync waves (annotation
argocd.argoproj.io/sync-wave) for dependency ordering across resources. Sync
hooks (PreSync, Sync, PostSync, Skip, SyncFail) — Jobs running before/after
sync for db migrations or smoke tests.

### 4. ApplicationSets

Generators: list (static list of values), git (dirs/files per branch/tag),
cluster (all registered clusters), SCM (pull requests from SCM provider),
matrix (combine two generators), pull request (apps per open PR). Template
defines the generated Application per generator item.

### 5. RBAC & Projects

AppProject scopes Applications to teams — restricts source repos, destination
clusters/namespaces, and allowed resources. RBAC policies (argocd-rbac-cm)
map OIDC groups/roles to API/UI permissions. Project roles for CI system
access with JWT tokens.

### 6. Multi-Cluster

Register external clusters via `argocd cluster add <context>`. Cluster
generator in ApplicationSet iterates all registered clusters. Hub-and-spoke
model: single ArgoCD control plane manages multiple workload clusters.
Cluster-specific config via config overlays in ApplicationSet template.

## Rules

1. Git is single source of truth — manual cluster changes overwritten on sync.
2. ApplicationSets for multi-env / multi-cluster deployments.
3. Sync waves for dependency ordering across resources.
4. Health checks every 3 minutes default; customize via lua for custom CRDs.
5. Auto-sync with prune enabled by default for standard apps.
6. AppProject restricts source repos, dest clusters, and namespaces per team.
7. Sync hooks for pre/post sync tasks (db migrations, smoke tests).
8. Never commit encrypted secrets to Git — use SealedSecrets or External Secrets.

## References

- [ArgoCD Setup](./references/argocd-setup.md) — installation, config, SSO,
  projects, cluster registration
- [ArgoCD Patterns](./references/argocd-patterns.md) — ApplicationSets, sync
  waves, hooks, rollback, blue-green, canary

## Handoff

Hand off to ArgoCD when Application manifests or sync policies are needed.
Hand off to kubernetes-patterns for general workload manifests.
Hand off to helm-patterns for Helm chart-specific concerns.
Hand off to observability for monitoring ArgoCD itself.
