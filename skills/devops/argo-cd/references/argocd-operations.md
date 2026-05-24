# ArgoCD Operations

## High Availability

| Component | Production Setup |
|-----------|-----------------|
| API Server | 2+ replicas, HPA |
| Repo Server | 2+ replicas, HPA |
| Application Controller | 2+ replicas active/passive |
| Redis | HA with Sentinel |
| Dex/OIDC | 2+ replicas |

```yaml
apiVersion: k8s.argoproj.io/v1alpha1
kind: ArgoCD
metadata:
  name: example-argocd
spec:
  ha:
    enabled: true
    redisProxyImage: haproxy:2.6
  controller:
    replicas: 2
    sharding:
      enabled: true
      clustersPerShard: 50
  repo:
    replicas: 3
  server:
    replicas: 3
    autoscale:
      enabled: true
      min: 3
      max: 10
      metrics:
      - type: Resource
        resource:
          name: cpu
          target:
            type: Utilization
            averageUtilization: 80
```

## Scaling Guidelines

| Scale | Clusters | Applications | Repo Server Replicas |
|-------|----------|-------------|---------------------|
| Small | 1-3 | <100 | 1-2 |
| Medium | 3-10 | 100-500 | 2-3 |
| Large | 10-50 | 500-2000 | 3-5 |
| Enterprise | 50+ | 2000+ | 5-10 |

## Backup and Restore

```bash
# Full backup
argocd admin export -n argocd > argocd-backup.yaml

# Selective backup
kubectl get applications -n argocd -o yaml > apps.yaml
kubectl get appprojects -n argocd -o yaml > projects.yaml
kubectl get configmap argocd-cm -n argocd -o yaml > config.yaml
kubectl get secret argocd-secret -n argocd -o yaml > secret.yaml

# Restore
argocd admin import -n argocd argocd-backup.yaml
```

## Upgrade Procedure

```bash
# 1. Check current version
kubectl get deployment argocd-server -n argocd -o jsonpath='{.spec.template.spec.containers[0].image}'

# 2. Update ArgoCD CR or operator
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# 3. Wait for all pods to be healthy
kubectl wait --for=condition=ready pod -l app.kubernetes.io/part-of=argocd -n argocd --timeout=300s

# 4. Verify functionality
argocd app list
argocd account get-user-info
```

## Troubleshooting

| Symptom | Likely Cause | Diagnosis |
|---------|-------------|-----------|
| App stuck "OutOfSync" | Config drift, Git vs cluster mismatch | `argocd app diff <app>` |
| Sync hangs on hook | Hook Job stuck or failed | `kubectl get jobs -n <ns>` |
| Repo not accessible | SSH key expired, private repo | `argocd repo list`, check repo server logs |
| Cluster connection lost | Kubeconfig expired, cluster down | `argocd cluster list` |
| App shows "Unknown" health | Missing health assessment | Create LUA health check |
| High CPU on controller | Too many apps per shard | Enable sharding, add replicas |

## Performance Tuning

| Parameter | Default | Tuning |
|-----------|---------|--------|
| `controller.statusProcessors` | 1 | 5-10 for large installations |
| `controller.operationProcessors` | 10 | 20 for many concurrent syncs |
| `repo.parallelism.limit` | 3 | 5-10 for many repos |
| `server.grpc.maxSize` | 100MB | Increase for large manifests |
| Redis maxmemory | 256MB | 1GB+ for large installations |
