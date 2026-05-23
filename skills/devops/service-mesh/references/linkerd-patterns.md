# Linkerd Patterns

## Installation
```bash
curl --proto '=https' --tlsv1.2 -sSfL https://run.linkerd.io/install | sh
export PATH=$HOME/.linkerd2/bin:$PATH

linkerd check --pre
linkerd install --crds | kubectl apply -f -
linkerd install | kubectl apply -f -
linkerd check

kubectl annotate namespace myapp linkerd.io/inject=enabled
```

## mTLS
mTLS is enabled by default for all injected pods — no additional configuration needed.
```bash
linkerd viz edges -n myapp deploy
linkerd viz stat deploy -n myapp --tls
```
Certificates auto-rotated by linkerd-identity. Verification: `linkerd viz edges` shows TLS status per edge.

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
Gradual weight shift: 900m (90%) / 100m (10%) -> 500m/500m -> 0/1000m. Combine with Flagger for automated canary based on metrics.

## Multi-Cluster
```bash
# Source cluster
linkerd multicluster install | kubectl apply -f -
linkerd multicluster link --cluster-name target-cluster --gateway-address 1.2.3.4:443 | kubectl apply -f -

# Target cluster
linkerd multicluster install --gateway | kubectl apply -f -
linkerd multicluster gateways
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
ServiceExport makes service available to other clusters. ServiceMirror creates mirrored services in the source cluster.

## Observability with linkerd-viz
```bash
linkerd viz install | kubectl apply -f -
linkerd viz dashboard &

linkerd viz stat deploy -n myapp
linkerd viz top deploy -n myapp
linkerd viz tap deploy/myapp -n myapp --to deploy/myapp --path /api
```
```yaml
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
Tap allows live traffic inspection for debugging. Server and HTTPRoute resources control tap access per application.

## Resource Configuration
```yaml
kind: Deployment
metadata:
  annotations:
    config.linkerd.io/proxy-cpu-request: "100m"
    config.linkerd.io/proxy-cpu-limit: "500m"
    config.linkerd.io/proxy-memory-request: "128Mi"
    config.linkerd.io/proxy-memory-limit: "256Mi"
    config.linkerd.io/proxy-version: "stable-2.14.0"
```
Resource limits prevent sidecar OOM. Version annotation controls sidecar version independently of data plane rollout.

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
ServiceProfile defines per-route metrics, retries, and timeouts. Retries and timeouts at service profile level complement DestinationRule circuit breakers.

## Authorization Policies (Linkerd)
```yaml
apiVersion: policy.linkerd.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: myapp-deny-all
  namespace: myapp
spec:
  targetRef:
    group: policy.linkerd.io
    kind: Server
    name: myapp-server
  requiredAuthentication:
    identities:
    - myapp.svc.cluster.local
---
apiVersion: policy.linkerd.io/v1beta1
kind: Server
metadata:
  name: myapp-server
  namespace: myapp
spec:
  podSelector:
    matchLabels:
      app: myapp
  port: 8080
```
Linkerd AuthorizationPolicy requires matching Server resource. authenticate only specified identities.

## Key Points
- Linkerd is simpler and lighter than Istio — lower resource overhead
- mTLS enabled by default — no extra config needed
- TrafficSplit for canary deployments, combine with Flagger for automation
- Multi-cluster via ServiceExport/ServiceMirror — simple cross-cluster connectivity
- ServiceProfile adds per-route observability and retries
- Sidecar resource limits required — 128Mi memory minimum
- AuthorizationPolicy with Server resources for mTLS enforcement
- linkerd-viz provides topology, metrics, and live traffic tap
