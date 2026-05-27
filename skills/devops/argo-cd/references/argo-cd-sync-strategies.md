# Argo CD Sync Strategies

## Sync Waves

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  annotations:
    argocd.argoproj.io/sync-wave: "5"
spec:
  template:
    spec:
      containers:
        - name: api
          image: api:v1

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  annotations:
    argocd.argoproj.io/sync-wave: "1"

---
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
  annotations:
    argocd.argoproj.io/sync-wave: "2"

---
apiVersion: v1
kind: Service
metadata:
  name: api-service
  annotations:
    argocd.argoproj.io/sync-wave: "10"
```

## Sync Phases

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: guestbook
spec:
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
      allowEmpty: false
    syncOptions:
      - CreateNamespace=true
      - PruneLast=true
      - PrunePropagationPolicy=foreground
      - Replace=false
      - Validate=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

## Post-Sync Hooks

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migration
          image: migration:v1
          command: ["./run-migrations.sh"]

---
apiVersion: batch/v1
kind: Job
metadata:
  name: smoke-test
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  template:
    spec:
      containers:
        - name: test
          image: test-runner:v1
          command: ["./smoke-tests.sh"]
      restartPolicy: Never
```

## Key Points

- Use sync waves to order resource deployment
- Define wave dependencies between resources
- Use pre-sync hooks for validation and preparation
- Use post-sync hooks for migrations and tests
- Use sync phases for progressive rollouts
- Configure automated sync with prune and self-heal
- Set retry backoff for failed syncs
- Use sync options for namespace creation
- Delete completed hooks to avoid resource leaks
- Implement manual approval gates for production
- Monitor sync status with Argo CD notifications
- Rollback with PreviousSyncState for quick recovery
