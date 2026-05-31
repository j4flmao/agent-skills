---
name: gitops
description: >
  Use this skill when the user says 'GitOps', 'ArgoCD', 'Flux', 'Git as source
  of truth', 'sync policy', 'drift detection', 'multi-env GitOps', 'Application
  CRD', 'Kustomize', 'Helm with GitOps', 'sync waves', 'phased rollouts'.
  Covers: declarative deployments, ArgoCD setup, Flux setup, sync strategies,
  drift detection, multi-environment promotion, secrets in GitOps.
  Do NOT use this for: plain Kubernetes manifests (use kubernetes-patterns),
  CI pipeline design, or monorepo tooling.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsuf: true
tags: [devops, gitops, argocd, flux, phase-5]
---

# GitOps

## Purpose
Manage Kubernetes deployments using Git as the single source of truth
with ArgoCD or Flux. Covers repository structure, application definitions,
sync policies, environment promotion, drift detection, and secret management.

## Framework and Methodology

### GitOps Principles
The GitOps operating model is built on four principles:

```
1. Declarative Description: The entire system is described declaratively.
2. Version Controlled and Immutable: The desired state is stored in Git.
3. Automatically Applied: Software agents pull changes from Git.
4. Continuously Reconciled: Agents correct drift between desired and actual state.
```

### Reconciliation Loop
```
Git (desired state) 
  -> GitOps Controller watches repo
  -> Compares with cluster state
  -> Detects drift (manual change or config divergence)
  -> Applies desired state to cluster
  -> Reports sync status
  -> Loops continuously (default every 3-5 minutes)
```

### Pull vs Push Model

```
Pull-based (GitOps native):
  - Agent in cluster pulls from Git.
  - Cluster initiates all changes.
  - No external access to cluster API needed.
  - More secure (cluster reads, never write external).

Push-based (CI/CD traditional):
  - CI system pushes to cluster.
  - Cluster API exposed to CI system.
  - More complex security (credential management).
  - Higher blast radius (CI compromise = cluster compromise).

Recommendation: Always use pull-based for production.
```

## Agent Protocol

### Trigger
Exact user phrases: "GitOps", "ArgoCD", "Flux", "Git as source of truth",
"sync policy", "drift detection", "Application CRD", "sync waves".

### Input Context
- GitOps tool is chosen (ArgoCD vs Flux).
- Cluster access method is known (kubeconfig, OIDC, AWS EKS).
- Deployment structure (monorepo vs multi-repo, Kustomize vs Helm).
- Environment promotion model (staging to prod).

### Output Artifact
Writes to Application CRDs, Flux Kustomization/HelmRelease YAMLs,
sync policies, and directory structure.

### Response Format
YAML manifests with no extraneous explanation.
No preamble. No postamble. No explanations.

### Completion Criteria
- [ ] GitOps tool is configured (ArgoCD Application or Flux Kustomization).
- [ ] Sync policy is defined (auto-sync with prune, self-heal).
- [ ] Source repository and path are configured.
- [ ] Destination cluster and namespace are set.
- [ ] Drift detection and remediation are configured.

### Max Response Length
Direct file write. No response text.

## Workflow

### Step 1: Choose GitOps Tool
ArgoCD: richer UI, sync waves, ApplicationSets, SSO integration.
Flux: lighter, tighter K8s-native CRDs, SOPS/SealedSecrets integration, depends-on ordering.

### Step 2: Design Repository Structure
Monorepo (single repo for all environments) is recommended for most teams.
Separate base (common config) from overlays (environment-specific).

### Step 3: Configure Application Definition
ArgoCD Application CRD or Flux Kustomization/HelmRelease.
Point to source repo + path + target cluster + namespace.

### Step 4: Define Sync Policy
Auto-sync with prune and self-heal.
Sync options: CreateNamespace, PruneLast, ApplyOutOfSyncOnly.

### Step 5: Implement Environment Promotion
Branch per environment, path per environment, or tag-based promotion.

### Step 6: Handle Secrets
Never store raw secrets in Git.
Use SealedSecrets, External Secrets Operator, or SOPS.

### Step 7: Set Up Drift Detection
Enable self-heal in sync policy.
Monitor alert for sync failures and drift events.

### Step 8: Implement Sync Waves
Order resource creation: CRDs first, then namespaces, then apps.
Use sync-wave annotations (ArgoCD) or depends-on (Flux).

## Common Pitfalls

1. **Direct cluster changes**: Someone runs kubectl edit and changes drift. Self-heal reverts it.
   Fix: Always change in Git. Educate team that Git is source of truth.
2. **Plain-text secrets in Git**: Anyone with repo access sees production secrets.
   Fix: Use SealedSecrets, External Secrets, or SOPS. Never raw secrets.
3. **Missing prune:true**: Resources removed from Git stay in cluster.
   Fix: Enable prune on all sync policies.
4. **Self-heal without understanding**: Unexpected reverts confuse teams.
   Fix: Communicate self-heal behavior. Check Git for latest change if drift detected.
5. **Overly complex directory structure**: Too many layers make changes error-prone.
   Fix: Keep base simple. Use Kustomize overlays per environment.
6. **No sync wave ordering**: Deployments start before ConfigMaps exist.
   Fix: Add annotations or depends-on for resource ordering.
7. **No drift monitoring**: Self-heal silently reverts changes without notification.
   Fix: Monitor sync status and alert on OutOfSync state.
8. **Using latest as tag**: No traceability of what version is deployed.
   Fix: Pin to specific branch, tag, or commit hash.

## Best Practices

- Enable auto-sync with prune and self-heal in all environments.
- Use Kustomize or Helm to manage environment-specific overrides.
- Store cluster bootstrap config in same repo as application config.
- Review GitOps diff before merging PRs (ArgoCD PR previews).
- Monitor sync status and alert on errors and drift.
- Use branch protection on Git repo (require PRs for main branch).
- Keep application config repo separate from application source code.
- Document rollback procedure in runbook.
- Test GitOps changes in staging before promoting to production.
- Use ArgoCD ApplicationSets or Flux Kustomization for multi-cluster.

## Compared With

| Feature | ArgoCD | Flux | Helm-only | kubectl apply |
|---|---|---|---|---|
| Reconciliation | Yes | Yes | No | No |
| Drift detection | Yes (self-heal) | Yes (self-heal) | No | No |
| Sync waves | Yes (annotations) | Yes (depends-on) | -- | -- |
| Rollback UI | Yes | CLI only | No | No |
| SSO integration | Built-in | Dex/External | -- | -- |
| Multi-cluster | ApplicationSet | Kustomization | Manual | Manual |
| Secret encryption | SOPS plugin | SOPS native | Helm secrets | -- |
| Blue/green | AnalysisTemplate | None | Manual | Manual |
| Weight | Medium | Light | Light | None |

## Templates and Tools

### ArgoCD Application Template
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app-dev
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/org/infra.git
    targetRevision: main
    path: overlays/dev
  destination:
    server: https://kubernetes.default.svc
    namespace: my-app-dev
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
      allowEmpty: false
    syncOptions:
      - CreateNamespace=true
      - PruneLast=true
      - ApplyOutOfSyncOnly=true
```

### Flux Kustomization Template
```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app-dev
  namespace: flux-system
spec:
  interval: 5m
  path: ./overlays/dev
  prune: true
  sourceRef:
    kind: GitRepository
    name: my-app
  wait: true
  timeout: 5m
  postBuild:
    substitute:
      env: dev
```

## Rules
- Never apply changes directly to the cluster -- always push to Git first.
- Always enable prune:true in automated sync policies.
- Use selfHeal:true to remediate drift automatically.
- Pin targetRevision to a branch, tag, or commit -- never omit it.
- Every environment gets its own overlay or directory.
- Use sync waves / depends-on to order resource creation.
- Store secrets in SealedSecrets, External Secrets, or SOPS -- never plain text in Git.
- Monitor sync status and alert on OutOfSync or SyncFailed.
- Use branch protection on GitOps repo (require PRs to main).
- Apply GitOps config to staging before production for validation.
- Document rollback procedure (revert Git commit).
- Use ApplicationSet (ArgoCD) or Kustomization (Flux) for multi-cluster.
- Never use latest as image tag -- pin to specific version.
- Enable automated prune for all namespaces.
- Validate Kustomize/Helm output in CI before merging.

## References
  - references/argocd-setup.md -- ArgoCD Setup
  - references/flux-setup.md -- Flux Setup
  - references/gitops-advanced.md -- Gitops Advanced Topics
  - references/gitops-fundamentals.md -- Gitops Fundamentals
  - references/gitops-principles.md -- GitOps Principles
  - references/sync-strategies.md -- Sync Strategies
  - references/gitops-workflow-environments.md -- GitOps Workflow Environments
  - references/gitops-security-compliance.md -- GitOps Security and Compliance

## Handoff
After completing this skill:
- Next skill: **kubernetes-patterns** -- pod specs, services, ingress
- Pass context: Git repo URL, overlay paths, environment structure
