# ArgoCD Patterns

## ApplicationSet with Git Generator

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: myapp
  namespace: argocd
spec:
  generators:
  - git:
      repoURL: https://github.com/org/myapp-gitops.git
      revision: main
      directories:
      - path: apps/*
  template:
    metadata:
      name: '{{path.basename}}'
    spec:
      project: team-platform
      source:
        repoURL: https://github.com/org/myapp-gitops.git
        targetRevision: main
        path: '{{path}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{path.basename}}'
```

## ApplicationSet with Cluster Generator

```yaml
spec:
  generators:
  - clusters: {}
  template:
    spec:
      project: multi-cluster
      source:
        repoURL: https://github.com/org/myapp-gitops.git
        targetRevision: main
        path: 'overlays/{{name}}'
      destination:
        server: '{{server}}'
        namespace: myapp
```

## Sync Waves

```yaml
apiVersion: v1
kind: Namespace
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "-5"
---
apiVersion: v1
kind: ConfigMap
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "0"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "5"
```

## Sync Hooks

```yaml
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
      containers:
      - name: migration
        image: myapp:latest
        command: ["rake", "db:migrate"]
      restartPolicy: Never
```

## Rollback

```bash
# View deployment history
argocd app get myapp-prod

# Rollback to specific revision
argocd app rollback myapp-prod --prune <REVISION_ID>

# Rollback with sync policy override
argocd app rollback myapp-prod --sync-policy=manual <REVISION_ID>
```

## Blue-Green via Argo Rollouts

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: myapp
spec:
  replicas: 5
  strategy:
    blueGreen:
      activeService: myapp-active
      previewService: myapp-preview
      autoPromotionEnabled: false
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: myapp
        image: myapp:1.2.3
```

## Canary via Argo Rollouts

```yaml
strategy:
  canary:
    steps:
    - setWeight: 20
    - pause: {duration: 5m}
    - setWeight: 60
    - pause: {duration: 5m}
    - setWeight: 100
```

## ApplicationSet Matrix Generator

```yaml
generators:
- matrix:
    generators:
    - clusters: {}
    - git:
        repoURL: https://github.com/org/myapp-gitops.git
        revision: main
        files:
        - path: "config/{{name}}/values.yaml"
```
