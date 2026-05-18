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
  windsurf: true
tags: [devops, gitops, argocd, flux, phase-5]
---

# GitOps

## Purpose
Manage Kubernetes deployments using Git as the single source of truth with ArgoCD or Flux.

## Agent Protocol

### Trigger
Exact user phrases: "GitOps", "ArgoCD", "Flux", "Git as source of truth", "sync policy", "drift detection", "Application CRD", "sync waves".

### Input Context
Before activating, verify:
- The GitOps tool is chosen (ArgoCD vs Flux).
- The cluster access method is known (kubeconfig, OIDC, AWS EKS).
- The deployment structure (monorepo vs multi-repo, Kustomize vs Helm).
- The environment promotion model (staging → prod).

### Output Artifact
Writes to Application CRDs, Flux Kustomization/HelmRelease YAMLs, sync policies, and directory structure.

### Response Format
YAML manifests with no extraneous explanation.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
This skill is complete when:
- [ ] GitOps tool is configured (ArgoCD Application or Flux Kustomization).
- [ ] Sync policy is defined (auto-sync with prune, self-heal).
- [ ] Source repository and path are configured.
- [ ] Destination cluster and namespace are set.
- [ ] Drift detection and remediation are configured.

### Max Response Length
Direct file write. No response text.

## Quick Start
ArgoCD Application CRD pointing to a Git repo + path + cluster + namespace. Auto-sync with prune. Kustomize overlay per environment. Flux equivalent via Kustomization and GitRepository CRDs.

## When to Use This Skill
- Setting up GitOps for a new cluster
- Migrating from imperative kubectl to declarative GitOps
- Adding multi-environment promotion (dev → staging → prod)
- Implementing disaster recovery with Git-based state

## Core Workflow

### Step 1: Repository Structure
```
infra/
├── base/
│   ├── kustomization.yaml
│   ├── deployment.yaml
│   └── service.yaml
├── overlays/
│   ├── dev/
│   │   ├── kustomization.yaml
│   │   ├── patch-replicas.yaml
│   │   └── configmap.yaml
│   ├── staging/
│   │   └── kustomization.yaml
│   └── prod/
│       └── kustomization.yaml
└── clusters/
    └── apps.yaml
```

### Step 2: ArgoCD Application
```yaml
# apps/dev-app.yaml
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
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

### Step 3: Flux Setup
```yaml
# clusters/my-cluster/flux-system/gotk-components.yaml
# (install via `flux install`)

# clusters/my-cluster/source.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/org/infra.git
  ref:
    branch: main

# clusters/my-cluster/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app-dev
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: my-app
  path: ./overlays/dev
  prune: true
  wait: true
  timeout: 5m
  postBuild:
    substitute:
      env: dev
      version: latest
```

### Step 4: Sync Strategies
```yaml
# Manual sync with phases (ArgoCD sync waves)
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "0"  # CRDs first
---
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "1"  # Namespaces second
---
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "2"  # Apps third
---
# Flux depends-on for ordering
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
spec:
  dependsOn:
    - name: crds
    - name: namespaces
```

### Step 5: Multi-Environment Promotion
```yaml
# Promote by updating the targetRevision or path
# Strategy 1: Branch per environment
spec:
  source:
    targetRevision: release/1.2.3  # staging branch
    path: overlays/staging

# Strategy 2: Path per environment (same branch)
spec:
  source:
    targetRevision: main
    path: overlays/production

# Strategy 3: Tag-based
spec:
  source:
    targetRevision: v1.2.3
    path: overlays/production
```

## Rules & Constraints
- Never apply changes directly to the cluster — always push to Git first
- Always enable `prune: true` in automated sync policies
- Use `selfHeal: true` to remediate drift automatically
- Pin `targetRevision` to a branch, tag, or commit — never omit it
- Every environment gets its own overlay or directory
- Use sync waves / depends-on to order resource creation
- Store secrets in SealedSecrets, External Secrets, or SOPS — never plain text in Git

## Output Format
ArgoCD Application YAML, Flux GitRepository + Kustomization YAML, and directory structure.

## References
- `references/gitops-principles.md` — core GitOps concepts and benefits
- `references/argocd-setup.md` — ArgoCD installation, configuration, and management
- `references/flux-setup.md` — Flux bootstrap, sources, and kustomizations
- `references/sync-strategies.md` — sync waves, prune policies, drift detection

## Handoff
After completing this skill:
- Next skill: **kubernetes-patterns** — pod specs, services, ingress
- Pass context: Git repo URL, overlay paths, environment structure
