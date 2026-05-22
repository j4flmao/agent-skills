# ArgoCD Setup

## Installation

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

For HA production:
```bash
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/ha/install.yaml
```

## Initial Admin Password

```bash
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

## CLI Installation

```bash
# Windows (scoop)
scoop install argocd
# macOS
brew install argocd
# Linux
curl -sSL -o /usr/local/bin/argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
chmod +x /usr/local/bin/argocd
```

Login: `argocd login <ARGOCD_SERVER> --sso` or `argocd login <ARGOCD_SERVER> --username admin`

## SSO Configuration

Configure Dex in argocd-cm ConfigMap:
```yaml
data:
  dex.config: |
    connectors:
    - type: oidc
      id: azure
      name: Azure AD
      config:
        issuer: https://login.microsoftonline.com/<TENANT_ID>/v2.0
        clientID: <CLIENT_ID>
        clientSecret: $dex.clientSecret
        claimMapping:
          email: email
          groups: groups
```

## AppProject Setup

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: team-platform
  namespace: argocd
spec:
  sourceRepos:
  - 'https://github.com/org/platform-gitops*'
  destinations:
  - namespace: 'platform-*'
    server: https://kubernetes.default.svc
  clusterResourceWhitelist:
  - group: '*'
    kind: '*'
  roles:
  - name: ci-deploy
    policies:
    - p, proj:team-platform:ci-deploy, applications, sync, team-platform/*, allow
```

## Cluster Registration

```bash
# Register external cluster
argocd cluster add <kubeconfig-context-name>

# List clusters
argocd cluster list

# Remove cluster
argocd cluster rm <server-url>
```

## Application Example

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp-prod
  namespace: argocd
spec:
  project: team-platform
  source:
    repoURL: https://github.com/org/myapp-gitops.git
    targetRevision: main
    path: overlays/prod
  destination:
    server: https://kubernetes.default.svc
    namespace: myapp-prod
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
    - CreateNamespace=true
    - PruneLast=true
  revisionHistoryLimit: 10
```

## Health Check Customization

```yaml
resourceCustomizations: |
    argoproj.io/Application:
      health.lua: |
        hs = {}
        hs.status = "Healthy"
        hs.message = "Application is healthy"
        return hs
```
