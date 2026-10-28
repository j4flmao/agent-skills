# Argo CD Sync Strategies: Waves, Hooks, Options, Policies

How Argo CD applies resources: automated vs manual sync, sync phases and hooks, sync waves for ordering, per-resource and per-application sync options, retries, and patterns for migrations and safe rollouts.

## 1. Automated vs Manual Sync

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: payments
  namespace: argocd
spec:
  project: payments
  source:
    repoURL: https://github.com/acme/deploy.git
    targetRevision: main
    path: apps/payments/overlays/prod
  destination:
    server: https://kubernetes.default.svc
    namespace: payments
  syncPolicy:
    automated:
      prune: true          # delete resources removed from Git
      selfHeal: true       # revert manual drift in the cluster
      allowEmpty: false    # refuse to sync if the source renders zero resources
    syncOptions:
      - CreateNamespace=true
      - PruneLast=true
      - ServerSideApply=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

| Setting | Default | Guidance |
|---|---|---|
| `automated` | off (manual) | Enable for environments where Git is the source of truth |
| `prune` | false | Enable with care; pair with `PruneLast` and protect critical resources |
| `selfHeal` | false | Enable to enforce GitOps; manual hotfixes are reverted |
| `allowEmpty` | false | Keep false; protects against a broken render deleting everything |

Sync windows (`AppProject.spec.syncWindows`) block or allow syncs on schedules, e.g. no automated syncs to production on Friday evenings.

## 2. Sync Phases and Hooks

Order within one sync operation:

```
PreSync hooks → Sync (regular resources, by wave) → PostSync hooks
          └─ on failure at any point: SyncFail hooks
```

Hook annotation values: `PreSync`, `Sync`, `PostSync`, `SyncFail`, `Skip` (plus `PreDelete`/`PostDelete` in recent versions). Hooks usually are Jobs or Pods.

```yaml
# Database migration BEFORE new application pods start
apiVersion: batch/v1
kind: Job
metadata:
  generateName: db-migrate-
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation,HookSucceeded
spec:
  backoffLimit: 1
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: ghcr.io/acme/payments-migrations:1.8.0
          args: ["migrate", "up"]
          envFrom:
            - secretRef: { name: payments-db }
---
# Smoke test AFTER all resources are healthy
apiVersion: batch/v1
kind: Job
metadata:
  generateName: smoke-
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  backoffLimit: 0
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: smoke
          image: ghcr.io/acme/smoke-tests:1.8.0
          args: ["--base-url", "http://payments.payments.svc"]
```

| Hook delete policy | Effect |
|---|---|
| `HookSucceeded` | Delete after success |
| `HookFailed` | Delete after failure |
| `BeforeHookCreation` | Delete previous instance before creating a new one (default if none set) |

Migrations must be backward compatible with the currently running version (expand/contract), because old pods keep serving during the rollout.

## 3. Sync Waves

Within each phase, resources apply in ascending wave order (default wave `0`, negative allowed). Argo CD waits until resources in a wave are healthy before the next wave.

```yaml
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
```

| Wave | Typical resources |
|---|---|
| -2 | Namespaces, CRDs (if managed here) |
| -1 | ConfigMaps, Secrets / ExternalSecrets, ServiceAccounts, RBAC |
| 0 | Deployments, StatefulSets, Services |
| 1 | Ingress/Gateway routes, HPAs |
| 2 | Resources depending on running workloads (e.g. custom resources consumed by an operator) |

Argo CD already orders by kind within a wave (namespaces and CRDs first, etc.), so add waves only where real dependencies exist. Health checks determine "ready"; custom resources may need custom Lua health checks to gate waves meaningfully.

## 4. Useful Sync Options

| Option | Scope | Effect |
|---|---|---|
| `CreateNamespace=true` | App | Create destination namespace |
| `PruneLast=true` | App/resource | Prune after all other resources are synced and healthy |
| `ServerSideApply=true` | App/resource | Server-side apply; avoids annotation size limits on large CRDs |
| `ApplyOutOfSyncOnly=true` | App | Apply only out-of-sync resources (faster for large apps) |
| `PrunePropagationPolicy=foreground` | App | Deletion propagation policy (`foreground`, `background`, `orphan`) |
| `Replace=true` | Resource | `kubectl replace/create` instead of apply; destructive, use sparingly |
| `Prune=false` | Resource (`argocd.argoproj.io/sync-options`) | Never prune this resource (e.g. PVCs) |
| `Delete=false` | Resource | Keep resource when the Application is deleted |
| `SkipDryRunOnMissingResource=true` | Resource | Custom resources whose CRD is installed in the same sync |
| `RespectIgnoreDifferences=true` | App | Do not overwrite fields listed in `ignoreDifferences` during sync |

```yaml
metadata:
  annotations:
    argocd.argoproj.io/sync-options: Prune=false,Delete=false
```

## 5. Ignoring Expected Drift

```yaml
spec:
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas            # managed by HPA
    - group: admissionregistration.k8s.io
      kind: MutatingWebhookConfiguration
      jqPathExpressions:
        - .webhooks[]?.clientConfig.caBundle
  syncPolicy:
    syncOptions:
      - RespectIgnoreDifferences=true
```

## 6. Rollback

- GitOps rollback: revert the commit in Git; automated sync applies the previous state. This is the preferred path.
- `argocd app rollback <app> <history-id>` redeploys a previous sync, but only when automated sync is disabled (otherwise Argo CD re-syncs to Git).
- Hooks and migrations are not reversed automatically; database rollbacks need their own plan.

## 7. Progressive Delivery

Argo CD applies manifests; it does not shift traffic gradually. For canary or blue-green, use Argo Rollouts (`Rollout` resources with analysis templates) or Flagger, managed by Argo CD like any other resource. Promotion and abort happen through the Rollouts controller, and Argo CD shows the health of the Rollout.

## 8. Multi-Application Ordering

Waves order resources within one Application. Across Applications:
- App-of-apps: parent Application whose children carry sync-wave annotations; requires a health check for `Application` resources (re-enable via `resource.customizations` in `argocd-cm` in recent versions, where it is disabled by default).
- ApplicationSets with the progressive sync (`RollingSync`) strategy to roll changes across clusters or environments in steps.

## Pitfalls

- Database migrations as `PostSync`: new pods start before the schema exists.
- `prune: true` without protecting PVCs or shared resources.
- `selfHeal` enabled while operators still make manual changes, causing fights.
- Waves on resources without meaningful health checks: ordering without real waiting.
- `Replace=true` on resources with dependents, causing recreation and downtime.

## Checklist

- [ ] Automated sync with prune, self-heal, and `allowEmpty: false` where GitOps is enforced.
- [ ] Migrations as `PreSync` hooks, backward compatible.
- [ ] Waves only for real dependencies; custom health checks for CRDs that gate waves.
- [ ] Critical resources protected with `Prune=false` / `Delete=false`.
- [ ] Expected drift handled with `ignoreDifferences` and `RespectIgnoreDifferences`.
- [ ] Rollback via Git revert documented; progressive delivery via Argo Rollouts where needed.
