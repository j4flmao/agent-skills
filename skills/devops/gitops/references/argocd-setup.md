# ArgoCD Setup

## Installation

```bash
# Install ArgoCD
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# HA installation
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/ha/install.yaml

# Verify
kubectl get pods -n argocd

# Get initial admin password
kubectl get secret argocd-initial-admin-secret -n argocd -o jsonpath="{.data.password}" | base64 -d
```

## CLI Setup

```bash
# Install CLI
curl -sSL -o argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
chmod +x argocd && mv argocd /usr/local/bin/

# Login
argocd login argocd.example.com --sso  # With SSO
argocd login argocd.example.com --username admin  # With password
```

## Configuration

```yaml
# argocd-cm.yaml — ConfigMap overrides
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  url: https://argocd.example.com
  timeout.reconciliation: 180s
  repositories: |
    - url: https://github.com/org/private-repo
      passwordSecret:
        name: repo-creds
        key: password
      usernameSecret:
        name: repo-creds
        key: username
  resource.customizations: |
    networking.k8s.io/Ingress:
      health.lua: |
        hs = {}
        hs.status = "Healthy"
        return hs
```

## RBAC

```yaml
# argocd-rbac-cm.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.default: role:readonly
  policy.csv: |
    p, role:ci, applications, sync, */*, allow
    p, role:ci, applications, get, */*, allow

    g, team-leads, role:admin
    g, ci-bot, role:ci
```

## AppProject

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: platform
  namespace: argocd
spec:
  description: Platform team project
  sourceRepos:
    - 'https://github.com/org/platform-*'
  destinations:
    - namespace: 'platform-*'
      server: https://kubernetes.default.svc
  clusterResourceWhitelist:
    - group: '*'
      kind: '*'
  namespaceResourceWhitelist:
    - group: '*'
      kind: '*'
  roles:
    - name: developer
      policies:
        - p, proj:platform:developer, applications, sync, platform/*, allow
```

## Managing Applications

```bash
# Create from CLI
argocd app create my-app \
  --repo https://github.com/org/infra.git \
  --path overlays/dev \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace my-app \
  --sync-policy automated \
  --auto-prune \
  --self-heal

# Sync
argocd app sync my-app

# Get status
argocd app get my-app

# Rollback
argocd app rollback my-app --id 5
```

## Webhook Integration

```yaml
# argocd-cm.yaml
data:
  configManagementPlugins: |
    - name: kustomize
  webhook.config: |
    - type: github
      secret:
        name: webhook-secret
        key: github-secret
```

```yaml
# Application annotation for webhook
metadata:
  annotations:
    argocd.argoproj.io/webhook: "true"
```
