# Kubernetes Operations Reference

## Rolling Updates

```bash
# Update image
kubectl set image deployment/app app=ghcr.io/org/app:v1.3.0 -n production

# Check rollout status
kubectl rollout status deployment/app -n production

# Rollback
kubectl rollout undo deployment/app -n production
kubectl rollout undo deployment/app -n production --to-revision=2

# Pause/resume rollout
kubectl rollout pause deployment/app -n production
kubectl rollout resume deployment/app -n production
```

## Canary Deployments

```yaml
# Canary service (routes subset of traffic)
apiVersion: v1
kind: Service
metadata:
  name: app-canary
spec:
  selector:
    app: app
    track: canary
---
# Canary deployment (1 replica, same selector + track label)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-canary
  labels:
    track: canary
spec:
  replicas: 1
  selector:
    matchLabels:
      app: app
      track: canary
  template:
    metadata:
      labels:
        app: app
        track: canary
    spec:
      containers:
        - name: app
          image: ghcr.io/org/app:v1.4.0-rc1
```

## Blue-Green Deployments

```bash
# Deploy green version alongside blue
kubectl apply -f deployment-green.yaml -n production

# Wait for green to be ready
kubectl rollout status deployment/app-green -n production

# Switch service to green
kubectl patch service app -n production -p '{"spec":{"selector":{"version":"green"}}}'

# If issues, switch back
kubectl patch service app -n production -p '{"spec":{"selector":{"version":"blue"}}}'
```

## Pod Disruption Budgets

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: app-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: app
```

PDB ensures voluntary disruptions (node drain, cluster upgrade) don't take all replicas down.

## Resource Quotas

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-quota
  namespace: team-a
spec:
  hard:
    requests.cpu: "10"
    requests.memory: 20Gi
    limits.cpu: "20"
    limits.memory: 40Gi
    persistentvolumeclaims: 10
    pods: "20"
    services: "10"
    configmaps: "10"
---
apiVersion: v1
kind: LimitRange
metadata:
  name: team-limits
  namespace: team-a
spec:
  limits:
    - default:
        cpu: 500m
        memory: 512Mi
      defaultRequest:
        cpu: 250m
        memory: 256Mi
      type: Container
```

## Namespace Strategy

| Namespace | Purpose | RBAC | Quota |
|-----------|---------|------|-------|
| production | Live traffic | Read-only for devs | Full production |
| staging | Pre-prod testing | Write for devs | Reduced |
| development | Dev sandboxes | Full access | Minimal |
| monitoring | Prometheus, Grafana | Admin | Medium |
| ingress-nginx | Ingress controllers | Infra team | Medium |
| kube-system | System pods | Cluster admin | Unlimited |

## Multi-Cluster Operations

```bash
# Switch context
kubectl config use-context production-eu-west-1
kubectl config use-context staging-us-east-1

# List contexts
kubectl config get-contexts

# Set namespace preference
kubectl config set-context --current --namespace=production
```
