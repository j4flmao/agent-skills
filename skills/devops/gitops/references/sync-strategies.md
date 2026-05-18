# Sync Strategies

## Automated Sync Policies

```yaml
# Full automated — prune + self-heal
syncPolicy:
  automated:
    prune: true
    selfHeal: true
  syncOptions:
    - CreateNamespace=true
    - PruneLast=true
    - ApplyOutOfSyncOnly=true
    - RespectIgnoreDifferences=true

# Manual — no auto-sync
# syncPolicy omitted entirely
```

## Sync Waves (ArgoCD)

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "-5"  # Before everything
spec:
  source:
    path: crds
---
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "0"  # Default wave
spec:
  source:
    path: namespaces
---
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "1"  # After wave 0
spec:
  source:
    path: infrastructure
---
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "2"  # Last
spec:
  source:
    path: applications
```

## Sync Phases with Hooks (ArgoCD)

```yaml
# PreSync hook — migrate DB before deploy
apiVersion: batch/v1
kind: Job
metadata:
  generateName: db-migrate-
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: my-app:latest
          command: ["npm", "run", "migrate"]
---
# PostSync hook — smoke test after deploy
apiVersion: batch/v1
kind: Job
metadata:
  generateName: smoke-test-
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: smoke
          image: curlimages/curl
          command: ["curl", "-f", "http://my-app/health"]
```

## Depends-On (Flux)

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
spec:
  dependsOn:
    - name: crds
    - name: namespaces
  interval: 10m
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: applications
spec:
  dependsOn:
    - name: infrastructure
  interval: 10m
```

## Drift Detection

```yaml
# ArgoCD — selfHeal auto-remediates drift
syncPolicy:
  automated:
    selfHeal: true

# ArgoCD — ignore specific fields
spec:
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas  # Ignore HPA-driven replica changes
    - group: ""
      kind: Secret
      jsonPointers:
        - /data  # Ignore secret data changes

# Flux — drift is detected every reconcile interval
# Use `kubectl diff` to check locally
kubectl diff -k overlays/prod
```

## Prune Behavior

| Prune setting | Behavior |
|---------------|----------|
| `prune: true` | Resources removed from Git are deleted from cluster |
| `prune: false` | Resources persist even after removal from Git |
| `PruneLast: true` | Prune runs after all sync waves complete |
| `ApplyOutOfSyncOnly: true` | Only changed resources are applied |
| `RespectIgnoreDifferences: true` | Ignored differences won't trigger sync |

## Promotion Strategies

- **Branch-per-env**: `dev`, `staging`, `production` branches — merge up
- **Path-per-env**: Single branch, `overlays/dev`, `overlays/prod` — merge overlay changes
- **Tag-per-release**: Tags like `v1.2.3-dev`, `v1.2.3-prod` — promote by retagging
- **Image update**: Flux image automation updates tag in YAML automatically
