# Linkerd Patterns

## Installation

```bash
# Install CLI
curl --proto '=https' --tlsv1.2 -sSfL https://run.linkerd.io/install | sh
export PATH=$HOME/.linkerd2/bin:$PATH

# Check cluster readiness
linkerd check --pre

# Install control plane
linkerd install --crds | kubectl apply -f -
linkerd install | kubectl apply -f -

# Verify
linkerd check

# Enable namespace injection
kubectl annotate namespace myapp linkerd.io/inject=enabled
```

## mTLS

```yaml
# mTLS is enabled by default for all injected pods
# Verify mTLS is active:
linkerd viz edges -n myapp deploy

# Check TLS status per deployment:
linkerd viz stat deploy -n myapp --tls
```

## Traffic Splitting (Canary)

```yaml
apiVersion: split.smi-spec.io/v1alpha4
kind: TrafficSplit
metadata:
  name: myapp-split
  namespace: myapp
spec:
  service: myapp
  backends:
  - service: myapp-v1
    weight: 900m
  - service: myapp-v2
    weight: 100m
```

## Multi-Cluster

```bash
# On source cluster
linkerd multicluster install | kubectl apply -f -
linkerd multicluster link --cluster-name target-cluster \
  --gateway-address 1.2.3.4:443 | kubectl apply -f -

# On target cluster
linkerd multicluster install --gateway | kubectl apply -f -
linkerd multicluster gateways

# Verify
linkerd multicluster check
```

```yaml
apiVersion: multicluster.linkerd.io/v1beta1
kind: ServiceExport
metadata:
  name: myapp
  namespace: myapp
spec: {}
---
apiVersion: multicluster.linkerd.io/v1beta1
kind: ServiceMirror
metadata:
  name: myapp
  namespace: myapp
spec:
  gateway:
    name: linkerd-gateway
    namespace: linkerd-multicluster
```

## Observability with linkerd-viz

```bash
# Install viz extension
linkerd viz install | kubectl apply -f -

# Open dashboard
linkerd viz dashboard &

# CLI commands
linkerd viz stat deploy -n myapp
linkerd viz top deploy -n myapp
linkerd viz tap deploy/myapp -n myapp --to deploy/myapp --path /api
```

```yaml
# Enable tap for specific resources
apiVersion: policy.linkerd.io/v1beta1
kind: Server
metadata:
  namespace: myapp
  name: myapp-tap
spec:
  podSelector:
    matchLabels:
      app: myapp
  port: 4191
---
apiVersion: policy.linkerd.io/v1beta1
kind: HTTPRoute
metadata:
  namespace: myapp
  name: myapp-tap-route
spec:
  parentRefs:
  - name: myapp-tap
    group: policy.linkerd.io
    kind: Server
  rules:
  - matches:
    - path:
        type: path-prefix
        value: /
```

## Resource Configuration

```yaml
# Sidecar resource limits via annotation
kind: Deployment
metadata:
  annotations:
    config.linkerd.io/proxy-cpu-request: "100m"
    config.linkerd.io/proxy-cpu-limit: "500m"
    config.linkerd.io/proxy-memory-request: "128Mi"
    config.linkerd.io/proxy-memory-limit: "256Mi"
    config.linkerd.io/proxy-version: "stable-2.14.0"
```

## Service Profile

```yaml
apiVersion: linkerd.io/v1alpha2
kind: ServiceProfile
metadata:
  name: myapp.myapp.svc.cluster.local
  namespace: myapp
spec:
  routes:
  - name: GET /api/users
    condition:
      method: GET
      pathRegex: /api/users
    isRetryable: true
    timeout: 500ms
  - name: POST /api/orders
    condition:
      method: POST
      pathRegex: /api/orders
    isRetryable: false
    timeout: 10s
```
