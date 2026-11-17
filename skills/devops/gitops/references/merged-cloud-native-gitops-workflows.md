# GitOps Workflows and Promotion

> Reference for `devops/gitops` — the entry point is [`../SKILL.md`](../SKILL.md). This file keeps only material the SKILL.md does not cover.

## Purpose
Make Git the declarative source of truth for cluster state, with a promotion path from dev to production that is reviewable, reversible, and does not put secrets in Git. The design decisions are repo layout, how changes move between environments, and how secrets and rollouts integrate.

## Repository Layout (folders per environment)

```
platform-config/
├── apps/
│   └── checkout/
│       ├── base/                 # Deployment, Service, HPA, kustomization.yaml
│       └── overlays/
│           ├── dev/              # image tag, replicas, config for dev
│           ├── staging/
│           └── prod/
├── clusters/
│   ├── prod-eu-1/               # what runs on this cluster (Applications or Flux Kustomizations)
│   └── prod-us-1/
└── infrastructure/              # ingress controller, cert-manager, ESO, policies
```
Environment-per-folder beats environment-per-branch: branches drift, merges between long-lived branches pull unrelated changes, and diffs between environments become hard to read. Keep app source code and deployment config in separate repos (or at least separate paths) so CI commits to config do not retrigger app builds.

## Promotion Patterns
| Pattern | How | Fit |
|---|---|---|
| PR promotion | CI opens PR updating `overlays/staging` → after verification, PR copies tag to `overlays/prod` | Regulated environments, clear audit |
| Image updater | Argo CD Image Updater / Flux image automation writes new tags back to Git for dev | Fast-moving dev envs |
| Promotion tools | Kargo (stages/freight model) on top of Argo CD | Many stages/clusters, automated verification gates |

Always promote **immutable artifacts** (image digest or semver tag), never `latest`.

## Multi-Cluster with ApplicationSet

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: checkout
  namespace: argocd
spec:
  goTemplate: true
  goTemplateOptions: ["missingkey=error"]
  generators:
    - clusters:
        selector:
          matchLabels:
            env: prod
  template:
    metadata:
      name: 'checkout-{{.name}}'
    spec:
      project: payments
      source:
        repoURL: https://github.com/example/platform-config.git
        targetRevision: main
        path: 'apps/checkout/overlays/prod'
      destination:
        server: '{{.server}}'
        namespace: checkout
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
          - CreateNamespace=true
          - ServerSideApply=true
  strategy:
    type: RollingSync
    rollingSync:
      steps:
        - matchExpressions:
            - key: region
              operator: In
              values: [eu]
        - matchExpressions:
            - key: region
              operator: In
              values: [us]
```
`RollingSync` (progressive syncs) must be enabled on the ApplicationSet controller; it rolls clusters in steps instead of all at once. "App of apps" (one Application pointing at a folder of Applications) remains useful for bootstrapping a cluster's platform components.

## Secrets
| Option | Mechanism | Trade-off |
|---|---|---|
| External Secrets Operator | `ExternalSecret` in Git references a key in Vault/AWS SM/GCP SM; operator writes the K8s Secret | Secret values never in Git; requires a secret backend |
| Sealed Secrets | Encrypt with controller's public key (`kubeseal`); only that controller decrypts | Simple; ciphertext tied to cluster key — back up the key |
| SOPS (+ age/KMS) | Encrypted values in Git; Flux decrypts natively, Argo CD via plugin | Works offline; key distribution needed |

```yaml
apiVersion: external-secrets.io/v1
kind: ExternalSecret
metadata:
  name: checkout-db
  namespace: checkout
spec:
  refreshInterval: 1h
  secretStoreRef:
    kind: ClusterSecretStore
    name: aws-secrets-manager
  target:
    name: checkout-db
  data:
    - secretKey: password
      remoteRef:
        key: prod/checkout/db
        property: password
```
ESO serves `external-secrets.io/v1` since v0.16; `v1beta1` is no longer served from v0.17.

## Progressive Delivery Hand-off
GitOps applies the new desired state; Argo Rollouts or Flagger then shifts traffic in steps (e.g. 10% → 25% → 50% → 100%) and aborts on metric analysis failure. Keep the Rollout/Canary objects in the same Git path so the rollout strategy is versioned with the app.

## Argo CD vs Flux
| | Argo CD | Flux |
|---|---|---|
| UI | Built-in web UI, SSO, RBAC | No built-in UI (third-party UIs exist) |
| Multi-cluster | Central instance managing many clusters (or one per cluster) | Typically one Flux per cluster, pull from Git |
| Model | `Application` / `ApplicationSet` | `GitRepository`/`OCIRepository` + `Kustomization`/`HelmRelease` |
| SOPS | Via plugin / CMP | Native decryption |

## Anti-Patterns
- `kubectl apply` hotfixes in production with `selfHeal` off → permanent drift.
- One giant Application for an entire cluster → slow syncs, huge blast radius.
- CI holds cluster-admin credentials "to make it faster" — defeats the pull model.
- Auto-sync with `prune: true` on shared namespaces without resource tracking awareness.

## Checklist
- [ ] Folder-per-env layout; immutable image references.
- [ ] Branch protection + CODEOWNERS on `overlays/prod` and `clusters/`.
- [ ] ESO/Sealed Secrets/SOPS chosen; no plaintext Secrets in history (scan with gitleaks).
- [ ] Sync waves/hooks for ordering (CRDs before CRs).
- [ ] Notifications on sync failure and degraded health.

## References
- `argocd-architecture.md`
- `progressive-delivery-flagger.md`
- `secrets-management-eso.md`
