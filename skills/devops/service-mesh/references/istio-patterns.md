# Istio Patterns

## Installation
```bash
curl -sL https://istio.io/downloadIstio | sh -
export PATH=$PWD/istio-1.20/bin:$PATH

istioctl install --set profile=demo -y      # dev
istioctl install --set profile=default -y    # prod

kubectl label namespace myapp istio-injection=enabled
```
Profiles: default (production), demo (all components), minimal (just ingress/egress), external (for mesh expansion). Custom profile via `istioctl profile dump`.

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
Restrict sidecar egress to only necessary hosts for security. Proxy resource limits via injection template or per-pod annotation.

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
Fault injection and mirroring also configurable in VirtualService. Timeouts and retries at route level override DestinationRule defaults.

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
Subsets correspond to workload version labels. Circuit breaker protects downstream services from cascading failures.

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
Gateway handles TLS termination at edge. Multiple Gateways for different domains or protocols. Combine with VirtualService binding via `gateways` field.

## mTLS
```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: myapp
spec:
  mtls:
    mode: STRICT
```
Also set mesh-wide via `meshConfig.defaultConfig.tlsMode=ISTIO_MUTUAL`. Verification: Kiali edges show lock icon, `istioctl authz check`.

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
Default-deny: add `- action: DENY { rules: [{ to: [{ operation: { paths: ["/*"] } }] }] }` at the end or use mesh-wide default-deny policy.

## Kiali Dashboard
```bash
istioctl dashboard kiali
kubectl port-forward -n istio-system svc/kiali 20001:20001
```

## Egress Gateway
```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-api
spec:
  hosts:
  - api.external.com
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: DNS
```
Egress gateway routes traffic through dedicated Envoy instances. Enable TLS origination at gateway for encrypted outbound connections.

## Key Points
- VirtualService + DestinationRule work together — VS routes, DR applies policies
- mTLS STRICT mode after PERMISSIVE migration period
- AuthorizationPolicy default-denies all, then explicitly allows
- Circuit breakers prevent cascading failures
- Kiali provides visual service graph and config validation
- Egress gateway for controlled, logged, and audited outbound traffic
- Sidecar resource limits prevent OOM under load
