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
Each subdirectory under `apps/` becomes a separate Application. Directory name is used as app name and namespace. Add new microservice by creating a new directory — ArgoCD auto-discovers.

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
Each registered cluster gets an Application with cluster-specific overlay. Cluster name from cluster Secret metadata, server URL from cluster endpoint.

## ApplicationSet with List Generator
```yaml
spec:
  generators:
  - list:
      elements:
      - env: dev
      - env: staging
      - env: prod
  template:
    spec:
      source:
        path: 'overlays/{{env}}'
      destination:
        namespace: 'myapp-{{env}}'
```

## ApplicationSet with Matrix Generator
```yaml
spec:
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
Combines cluster generator with git file generator — each cluster gets config from its values file.

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
Lower wave = earlier execution. Resources in same wave apply in parallel. Typical ordering: -5 (CRDs, NS), -3 (Secrets, SAs), 0 (ConfigMaps, Services), 3 (Deployments, StatefulSets), 5 (HPA, Ingress).

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
Hook types: PreSync (before sync), Sync (during sync), PostSync (after success), SyncFail (on failure), Skip (first sync only). Delete policies: HookSucceeded, HookFailed, BeforeHookCreation. PreSync hooks block sync until complete.

## Rollback
```bash
argocd app get myapp-prod
argocd app rollback myapp-prod --prune <REVISION_ID>
argocd app rollback myapp-prod --sync-policy=manual <REVISION_ID>
```
Rollback reverts to a previous revision by reapplying the desired state from Git. `--prune` deletes resources not present in the target revision. Manual sync policy prevents auto-sync from immediately overwriting rollback.

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
Blue-green creates a preview environment alongside active. Traffic stays on active until manual promotion or auto-promotion timeout.

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
Canary incrementally shifts traffic weight. Pauses allow monitoring before proceeding. Can be combined with analysis (Prometheus queries, webhooks) for automated promote or rollback.

## Key Points
- ApplicationSet generators eliminate repetitive Application YAML
- Git generator for multi-service repos, cluster generator for multi-cluster
- Matrix generator for complex multi-dimensional deployments
- Sync waves control ordering, sync hooks control workflow
- Rollback is safe for standard apps but understand the diff first
- Argo Rollouts extend ArgoCD with blue-green and canary strategies
