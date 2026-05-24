# Multi-Cluster GitOps Management

## App-of-Apps Pattern

The app-of-apps pattern uses a root Application that manages child Applications, enabling hierarchical deployment structures.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: root-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/org/gitops-repo.git
    path: clusters/production/apps
    directory:
      recurse: true
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

Each child Application is defined as a separate YAML in the `apps/` directory:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: istio
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: infrastructure
  source:
    repoURL: https://github.com/istio/istio.git
    path: manifests/charts/istio-control/istio-discovery
    targetRevision: 1.20.0
    helm:
      valuesFiles:
        - values.yaml
  destination:
    namespace: istio-system
    server: https://kubernetes.default.svc
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Cluster Registration

Register remote clusters in ArgoCD via `argocd cluster add` or declarative config:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: production-us-east-1
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: cluster
type: Opaque
stringData:
  name: production-us-east-1
  server: https://api.eks-us-east-1.example.com
  config: |
    {
      "bearerToken": "<token>",
      "tlsClientConfig": {
        "insecure": false,
        "caData": "<base64-ca>"
      }
    }
  namespaces: |
    ["default", "kube-system", "team-a", "team-b"]
```

## Hub-Spoke Model

A central hub cluster manages the ArgoCD control plane and deploys to spoke clusters:

```
Hub Cluster (management)
  ├── ArgoCD (control plane)
  ├── Argo Rollouts (global)
  ├── Cert-Manager (global)
  └── App-of-Apps
       ├── prod-us-east-1 → spoke cluster
       ├── prod-eu-west-1 → spoke cluster
       ├── staging → spoke cluster
       └── dev → spoke cluster
```

Spoke clusters run workloads only, no ArgoCD control plane:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: team-app-prod-us
spec:
  project: team-a
  source:
    repoURL: https://github.com/org/team-app.git
    path: overlays/production
    targetRevision: main
  destination:
    name: production-us-east-1
    namespace: team-a
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Cluster Labels

Use labels on cluster secrets for targeting:

```yaml
metadata:
  labels:
    argocd.argoproj.io/secret-type: cluster
    environment: production
    region: us-east-1
    team: platform
    criticality: high
```

Reference in ApplicationSets:

```yaml
spec:
  generators:
    - clusters:
        selector:
          matchLabels:
            environment: production
            region: us-east-1
  template:
    spec:
      source:
        repoURL: https://github.com/org/app.git
        targetRevision: main
        path: '{{name}}/'
      destination:
        name: '{{name}}'
```

## Selective Sync

Use `syncPolicy` and `ignoreDifferences` for cluster-specific tuning:

```yaml
spec:
  syncPolicy:
    syncOptions:
      - ApplyOutOfSyncOnly=true
      - PruneLast=true
      - RespectIgnoreDifferences=true
      - PrunePropagationPolicy=foreground
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas
    - group: autoscaling
      kind: HorizontalPodAutoscaler
      jsonPointers:
        - /spec/metrics
```

## Disaster Recovery

Backup ArgoCD state with `argocd-export` or Velero:

```bash
argocd admin export -n argocd > argocd-backup.yaml
```

Restore with:

```bash
argocd admin import -n argocd argocd-backup.yaml
```

## Cluster Add Script

```bash
#!/bin/bash
CLUSTER_NAME=$1
CLUSTER_ENV=$2
CONTEXT="arn:aws:eks:$REGION:$ACCOUNT:cluster/$CLUSTER_NAME"

argocd cluster add "$CONTEXT" \
  --name "$CLUSTER_NAME" \
  --label "environment=$CLUSTER_ENV" \
  --label "name=$CLUSTER_NAME" \
  --label "argocd.argoproj.io/secret-type=cluster" \
  --namespace argocd \
  --upsert
```

Key considerations: RBAC per cluster, network latency between hub and spokes, managing drift at scale, and avoiding hub cluster overload with thousands of Applications.
