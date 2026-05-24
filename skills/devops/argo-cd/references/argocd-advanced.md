# ArgoCD Advanced

## Config Management Plugins (CMP)

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
data:
  configManagementPlugins: |
    - name: sops
      init:
        command: ["sops", "-d"]
        args: ["${sourceFile}"]
      generate:
        command: ["bash"]
        args: ["-c", "sops -d ${sourceFile}"]
    - name: custom-helm
      init:
        command: ["helm", "dependency", "build"]
      generate:
        command: ["bash"]
        args: ["-c", "helm template . --values values-$ARGOCD_ENV.yaml"]
```

## Webhook Integration

| Provider | Webhook Secret | Endpoint |
|----------|---------------|----------|
| GitHub | HMAC SHA-256 | `POST /api/webhook` |
| GitLab | Token | `POST /api/webhook` |
| Bitbucket | Secret | `POST /api/webhook` |
| Azure DevOps | Basic Auth | `POST /api/webhook` |

```yaml
# argocd-cm update for webhook
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
data:
  webhook.github.secret: "sha256=..."
```

## Multi-Cluster Disaster Recovery

| Strategy | Setup | RTO | RPO |
|----------|-------|-----|-----|
| Hub-spoke DR | Backup ArgoCD config, re-register clusters | 30min | 5min |
| Regional ArgoCD | ArgoCD per region, Git is source of truth | 5min | 0 (Git) |
| Global ArgoCD | Single ArgoCD managing multiple regions | Depends on control plane | 0 (Git) |

```bash
# Backup ArgoCD
kubectl get application -A -o yaml > applications-backup.yaml
kubectl get appproject -A -o yaml > projects-backup.yaml
kubectl -n argocd get configmap argocd-cm -o yaml > argocd-cm-backup.yaml

# Restore
kubectl apply -f argocd-cm-backup.yaml
kubectl apply -f projects-backup.yaml
kubectl apply -f applications-backup.yaml
# ArgoCD reconnects to clusters and re-syncs from Git
```

## Notifications

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
data:
  template.deployment-completed: |
    message: |
      Application {{.app.metadata.name}} sync {{.app.status.sync.status}}.
      Health: {{.app.status.health.status}}
  trigger.on-sync-succeeded: |
    - description: Application sync succeeded
      send: [deployment-completed]
  service.slack: |
    webhook: https://hooks.slack.com/services/T...
```

## Argo Rollouts Integration

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: myapp-rollout
spec:
  replicas: 5
  strategy:
    canary:
      steps:
      - setWeight: 20
      - pause: {duration: 60s}
      - setWeight: 40
      - pause: {duration: 60s}
      - setWeight: 60
      - pause: {duration: 30s}
      - setWeight: 80
      - pause: {duration: 30s}
  template:
    spec:
      containers:
      - name: myapp
        image: myapp:latest
```

## Resource Hook Ordering

| Annotation | Purpose |
|------------|---------|
| `argocd.argoproj.io/sync-wave` | Order resources within sync |
| `argocd.argoproj.io/hook` | PreSync, Sync, PostSync, SyncFail |
| `argocd.argoproj.io/hook-delete-policy` | When to delete hook resources |
| `argocd.argoproj.io/sync-options` | Skip dry run, prune last |

```yaml
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "5"
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
```
