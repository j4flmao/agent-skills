# Sync Phases, Waves, and Hooks

## Sync Phases

ArgoCD syncs in three phases:

| Phase | Description | Actions |
|-------|-------------|---------|
| Pre-sync | Before sync runs | DB migrations, pre-checks |
| Sync | Apply resources | Create/Update resources |
| Post-sync | After sync completes | Smoke tests, notifications |
| Sync-Fail | On sync failure | Rollback, cleanup, alert |

## Sync Waves

Resources within each phase are ordered by waves (default wave = 0, lower numbers first):

```yaml
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "5"
```

Wave ordering:
- Wave -5: Cluster operators (cert-manager, istio, ingress-nginx)
- Wave -3: CRDs, priority classes
- Wave -1: Namespaces, service accounts, RBAC
- Wave 0: ConfigMaps, Secrets (default)
- Wave 1: Storage (PostgreSQL, Redis)
- Wave 2: Network (Services, Ingress)
- Wave 3: Application deployments
- Wave 5: Canary analysis, smoke tests

## Sync Hooks

Hooks are Jobs that run at specific sync phases:

### Pre-Sync Hook (DB Migration)

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      containers:
        - name: migration
          image: myapp:latest
          command: ["npm", "run", "migrate"]
      restartPolicy: Never
```

### Sync Hook (Post-sync verification)

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: smoke-test
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      containers:
        - name: smoke
          image: curlimages/curl
          command:
            - sh
            - -c
            - "curl -f http://myapp:8080/health || exit 1"
      restartPolicy: Never
```

### Sync-Fail Hook

```yaml
metadata:
  annotations:
    argocd.argoproj.io/hook: SyncFail
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  template:
    spec:
      containers:
        - name: notify
          image: alpine
          command:
            - sh
            - -c
            - "wget -qO- https://hooks.slack.com/notify --post-data='{\"text\":\"Deploy failed\"}'"
```

## Hook Deletion Policies

Control when hook resources are cleaned up:

| Policy | Behavior |
|--------|----------|
| `HookSucceeded` | Delete after successful completion |
| `HookFailed` | Delete after failure |
| `BeforeHookCreation` | Delete before creating a new hook of same name |
| `HookSucceeded && HookFailed` | Always delete after completion |

## Resource Ordering Patterns

### Wave Group with Hooks

```yaml
# Wave -1: Pre-check
apiVersion: batch/v1
kind: Job
metadata:
  name: pre-check
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/sync-wave: "-1"
---
# Wave 0: Core infra
apiVersion: v1
kind: Namespace
metadata:
  name: myapp
  annotations:
    argocd.argoproj.io/sync-wave: "0"
---
# Wave 1: Database
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  annotations:
    argocd.argoproj.io/sync-wave: "1"
---
# Wave 2: Application
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  annotations:
    argocd.argoproj.io/sync-wave: "2"
---
# Wave 3: Post-sync verification
apiVersion: batch/v1
kind: Job
metadata:
  name: verify
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/sync-wave: "3"
```

## Manual Sync with Wave Control

```bash
# Sync specific waves
argocd app sync myapp --sync-wave 0,1

# Sync with selective resource
argocd app sync myapp --resource apps:Deployment:myapp

# Dry run to check ordering
argocd app sync myapp --dry-run
```

## PreSync Wait Pattern

Use `argocd.argoproj.io/sync-wave` with health checks to ensure sequential execution:

```yaml
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "0"
    argocd.argoproj.io/sync-wave-group: "database"
```

## Hook Failure Behavior

- Failed PreSync hooks block the sync entirely
- Failed PostSync hooks are logged but sync is considered successful
- SyncFail hooks run after sync failure for cleanup/notification
- Use `argocd.argoproj.io/sync-wave` on hooks to order them within their phase

Proper wave and hook management ensures safe, ordered deployments in complex environments.
