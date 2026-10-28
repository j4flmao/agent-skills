# GitOps Fundamentals: Principles, Repository Layout and Application Model

The foundations that the advanced GitOps topics build on: OpenGitOps principles, how to structure repositories and environments, the Argo CD Application and Flux Kustomization models, and how changes are promoted. Specialized topics (ApplicationSets, sync phases, multi-cluster, secrets, DR, security) have their own references in this skill.

## OpenGitOps Principles

1. Declarative: desired state is expressed declaratively.
2. Versioned and immutable: desired state is stored with full history (Git).
3. Pulled automatically: agents pull desired state from the source.
4. Continuously reconciled: agents observe actual state and converge it to desired state.

Consequences: no `kubectl apply` from CI to production; CI builds and publishes artifacts and updates Git, the in-cluster controller applies.

## Repository Strategies

| Strategy | Layout | Fits |
|---|---|---|
| App repo + config repo | Source code repo builds images; separate config repo holds manifests | Most teams; clean audit and access control |
| Monorepo config | One config repo for all apps and clusters | Platform-managed fleets |
| Repo per team | Each team owns its config repo; platform repo bootstraps | Large orgs, strong team boundaries |
| Manifests in app repo | `deploy/` folder next to code | Small teams; couples app commits to deployments |

## Environment Layout (Kustomize)

```
config-repo/
  apps/
    payments/
      base/
        deployment.yaml
        service.yaml
        kustomization.yaml
      overlays/
        dev/kustomization.yaml
        staging/kustomization.yaml
        prod/kustomization.yaml
  clusters/
    prod-eu-1/
      apps.yaml            # which apps/overlays this cluster runs
    staging-eu-1/
      apps.yaml
  platform/
    ingress-nginx/  cert-manager/  external-secrets/
```

Prefer directories per environment over branches per environment: branches drift, merges between them are error-prone, and differences are hard to review. Helm users keep a values file per environment instead of overlays.

## Argo CD Application

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: payments-prod
  namespace: argocd
  finalizers:
  - resources-finalizer.argocd.argoproj.io      # delete resources when the Application is deleted
spec:
  project: payments
  source:
    repoURL: https://git.example.com/platform/config-repo.git
    targetRevision: main
    path: apps/payments/overlays/prod
  destination:
    server: https://kubernetes.default.svc
    namespace: payments
  syncPolicy:
    automated:
      prune: true          # delete resources removed from Git
      selfHeal: true       # revert manual changes in the cluster
    syncOptions:
    - CreateNamespace=true
    - ServerSideApply=true
    retry:
      limit: 5
      backoff: {duration: 10s, factor: 2, maxDuration: 3m}
```

`AppProject` restricts which repos, clusters, namespaces and resource kinds an Application may use; give each team its own project.

## Flux Equivalent

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata: {name: config, namespace: flux-system}
spec:
  interval: 1m
  url: https://git.example.com/platform/config-repo.git
  ref: {branch: main}
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata: {name: payments-prod, namespace: flux-system}
spec:
  interval: 10m
  sourceRef: {kind: GitRepository, name: config}
  path: ./apps/payments/overlays/prod
  prune: true
  wait: true
  timeout: 5m
```

## App of Apps / Bootstrapping

A root Application points at a directory of Application manifests (or an ApplicationSet generates them), so a new cluster is bootstrapped by installing Argo CD and applying one root Application. Flux bootstraps with `flux bootstrap <provider>` which commits its own manifests to the repo.

## Promotion Model

```
CI: build image → push → sign → update dev overlay image tag (PR or bot commit)
dev healthy + tests pass → PR updates staging overlay
staging verified → PR (approved) updates prod overlay
```

- Promote immutable references: image digests or semver tags, never `latest`.
- Automate PR creation (Argo CD Image Updater, Flux image automation, Renovate, or a promotion tool such as Kargo); keep human approval for prod.
- Each promotion is a Git commit: rollback = revert commit.

## Drift and Health

- Drift: Argo CD shows `OutOfSync` when live state differs from Git; `selfHeal` reverts it. Use `ignoreDifferences` only for fields legitimately managed by controllers (e.g. HPA-managed `replicas`).
- Health: Argo CD has built-in health checks for core kinds and supports custom Lua health checks for CRDs; Flux uses `wait`/`healthChecks` on Kustomizations.

## What Does Not Belong in Git

- Plain-text secrets (use External Secrets Operator, Sealed Secrets or SOPS; see `gitops-secrets.md`).
- Generated status or runtime-only fields.
- Values that change on every deploy without review (use image automation writing commits instead).

## Checklist
- [ ] Separate config repo (or clear `deploy/` boundary) with directory-per-environment
- [ ] Applications grouped in AppProjects with least-privilege restrictions
- [ ] Automated sync with prune and self-heal where safe
- [ ] Immutable image references promoted via commits/PRs
- [ ] Bootstrap via root Application / Flux bootstrap
- [ ] No secrets in plain text
