# GitOps Principles

## The Four Principles

1. **Declarative** — The entire system is described declaratively stored in Git
2. **Source of Truth** — Git is the single source of truth; cluster state converges to it
3. **Reconciliation** — A controller continuously reconciles actual state with desired state
4. **Observability** — Drift is detected, reported, and optionally auto-remediated

## Benefits

| Benefit | Description |
|---------|-------------|
| Auditable | Every change has a commit log with author, timestamp, and diff |
| Reproducible | Spin up identical environments from the same Git state |
| Secure | No direct cluster access needed; Git credentials are sufficient |
| Rollback | Revert by reverting a commit or pointing to a previous revision |
| Reviewable | Changes go through PR review before hitting production |
| Observable | Drift is detected immediately and reported |

## Comparison

| Feature | ArgoCD | Flux |
|---------|--------|------|
| Architecture | Pull-based, single controller | Pull-based, multi-controller |
| CRDs | Application, AppProject | GitRepository, Kustomization, HelmRelease |
| UI | Built-in web UI | No built-in UI (uses kubectl) |
| SSO | OIDC, Dex, GitHub, GitLab | OIDC via Kubernetes auth |
| Sync modes | Manual, automated, wave-based | Automated with depends-on |
| Secrets | SOPS, SealedSecrets, External Secrets | SOPS, External Secrets, Azure Key Vault |
| Multi-cluster | Native support via cluster CRDs | Native support via Kustomization |
| Helm | Helm charts as sources | HelmRelease CRD |
| Health checks | Built-in resource health assessment | Health check via Kubernetes status |
| Notifications | Webhook, Slack, Email, custom | Notification controller (Slack, Discord, etc.) |

## Tool Selection

**Choose ArgoCD when:**
- You need a web UI for operations teams
- Multi-cluster management is a primary concern
- You want built-in SSO/ RBAC
- Sync waves for complex ordering

**Choose Flux when:**
- You want a Kubernetes-native experience (kubectl only)
- You need dependency-based reconciliation
- You prefer a controller-per-resource model
- You want tighter integration with Tekton/other CNCF tools

## Anti-Patterns

- Pushing directly to the cluster bypassing Git
- Storing plain-text secrets in the Git repository
- Using `latest` as image tags (use specific semantic versions or SHAs)
- Manual cluster modifications that won't be in Git
- One monolithic repository with no environment separation
- Auto-sync without prune enabled (leads to stale resources)
