# GitOps with Argo CD

> Reference for `devops/argo-cd` — the entry point is [`../SKILL.md`](../SKILL.md). This file keeps only material the SKILL.md does not cover.

## Purpose
Replace "CI runs kubectl against the cluster" with a pull model: CI builds an image and commits its reference to a config repo; Argo CD, running inside the cluster, reconciles the cluster to that repo. CI no longer needs cluster credentials, every change is a reviewed commit, and drift is visible.

## Push vs Pull
| | Push (CI deploys) | Pull (GitOps) |
|---|---|---|
| Credentials | CI holds cluster creds | Cluster agent reads Git; CI writes Git only |
| Audit | CI logs | Git history = deploy history |
| Drift | Undetected | Detected; optionally self-healed |
| Rollback | Re-run old pipeline | `git revert` |

## Install
```bash
kubectl create namespace argocd
helm repo add argo https://argoproj.github.io/argo-helm
helm install argocd argo/argo-cd -n argocd --version <pinned-chart-version> \
  --set configs.params."server\.insecure"=false
# initial admin password (delete the secret after configuring SSO)
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d
argocd login argocd.example.com --sso    # after Dex/OIDC configured
```

## AppProject Guardrails
```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: payments
  namespace: argocd
spec:
  description: Payments team applications
  sourceRepos:
    - https://github.com/example/platform-config.git
  destinations:
    - server: https://kubernetes.default.svc
      namespace: payments-*
  clusterResourceWhitelist: []          # team cannot create cluster-scoped resources
  namespaceResourceBlacklist:
    - group: ""
      kind: ResourceQuota
  roles:
    - name: deployers
      policies:
        - p, proj:payments:deployers, applications, sync, payments/*, allow
        - p, proj:payments:deployers, applications, get, payments/*, allow
      groups: [payments-engineers]       # SSO group
```

## Application
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: checkout-dev
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io   # delete app → delete its resources
spec:
  project: payments
  source:
    repoURL: https://github.com/example/platform-config.git
    targetRevision: main
    path: apps/checkout/overlays/dev
  destination:
    server: https://kubernetes.default.svc
    namespace: payments-dev
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
    retry:
      limit: 5
      backoff: { duration: 10s, factor: 2, maxDuration: 3m }
```
Production: often `automated` without `prune` at first, or manual sync with required approvals, until teams trust the flow.

## CI Hand-off Options
1. **CI commit** — after pushing the image, CI updates the image digest in the overlay (`kustomize edit set image`) and commits/opens a PR in the config repo.
2. **Argo CD Image Updater** — watches the registry and writes new tags back to Git (`write-back-method: git`) for matching Applications; good for dev environments.
3. **Webhooks** — configure the Git provider to call `https://argocd.example.com/api/webhook` so Argo CD refreshes immediately instead of waiting for the ~3-minute poll.

## Access and Security
- SSO via OIDC/Dex; RBAC in `argocd-rbac-cm` (`policy.default: role:readonly` or empty).
- Repo credentials as Secrets labelled `argocd.argoproj.io/secret-type: repository` (deploy keys or GitHub App), read-only.
- Secrets: never commit plaintext; use External Secrets Operator / Sealed Secrets / SOPS.
- Restrict who can edit `argocd` namespace objects — Applications in that namespace can target any project they are allowed into.

## Anti-Patterns
- All apps in the `default` project (no restrictions).
- Same repo + branch for app source and deployment config, causing CI loops.
- Mutable image tags in manifests.
- Disabling self-heal and fixing prod with `kubectl edit`.

## Checklist
- [ ] Pinned install, SSO, admin account disabled.
- [ ] AppProjects per team with destination/source limits.
- [ ] CI writes digests to config repo; webhook configured.
- [ ] Notifications (argocd-notifications) for sync failed/degraded.
- [ ] Backup of Argo CD config (`argocd admin export`) or everything declarative in Git.

## References
- Related skills: `skills/devops/argo-cd/SKILL.md`, `skills/devops/gitops/references/merged-cloud-native-gitops-workflows.md`, `skills/devops/gitops/references/merged-cloud-native-argocd-reconciliation.md`, `skills/devops/github-actions/references/merged-github-actions-pipelines.md`.
