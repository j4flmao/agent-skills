# Istio Patterns

## Installation

```bash
# Download istioctl
curl -sL https://istio.io/downloadIstio | sh -
export PATH=$PWD/istio-1.20/bin:$PATH

# Install with demo profile (dev)
istioctl install --set profile=demo -y

# Install with default profile (prod)
istioctl install --set profile=default -y

# Enable namespace injection
kubectl label namespace myapp istio-injection=enabled
```

## Sidecar Configuration

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: default
  namespace: myapp
spec:
  egress:
  - hosts:
    - "myapp/*"
    - "istio-system/*"
  - hosts:
    - "*.external.com"
    port:
      number: 443
      protocol: TLS
```

## VirtualService

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: myapp
  namespace: myapp
spec:
  hosts:
  - myapp
  http:
  - match:
    - uri:
        prefix: /api/v1
    route:
    - destination:
        host: myapp-v1
        port:
          number: 8080
      weight: 90
    - destination:
        host: myapp-v2
        port:
          number: 8080
      weight: 10
  - match:
    - headers:
        x-canary:
          exact: "true"
    route:
    - destination:
        host: myapp-v2
        port:
          number: 8080
```

## DestinationRule

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: myapp-dr
  namespace: myapp
spec:
  host: myapp
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 10
        http2MaxRequests: 100
        maxRequestsPerConnection: 10
    loadBalancer:
      simple: ROUND_ROBIN
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

## Gateway

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: myapp-gateway
  namespace: istio-ingress
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: myapp-tls-cert
    hosts:
    - myapp.example.com
```

## mTLS

```yaml
# Enable STRICT mTLS per namespace
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: myapp
spec:
  mtls:
    mode: STRICT
```

## AuthorizationPolicy

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: myapp-authz
  namespace: myapp
spec:
  selector:
    matchLabels:
      app: myapp
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/monitoring/sa/prometheus"]
    to:
    - operation:
        paths: ["/metrics"]
        methods: ["GET"]
  - from:
    - source:
        namespaces: ["frontend"]
    to:
    - operation:
        methods: ["GET", "POST"]
        paths: ["/api/*"]
```

## Kiali Dashboard

```bash
istioctl dashboard kiali
# Port-forward to access Kiali UI
kubectl port-forward -n istio-system svc/kiali 20001:20001
```
