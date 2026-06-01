---
name: devops-service-mesh
description: |
  Trigger: "service mesh", "Istio", "Linkerd", "Envoy", "sidecar", "mTLS",
  "service-to-service", "mesh traffic", "virtual service", "destination rule",
  "service mesh observability", "mesh security"
  Exclusion: Not for standard K8s networking — use kubernetes-patterns.
version: 1.0.0
author: j4flmao
license: MIT
compatibility:
  cli: true
  core: true
  editor: true
  api: true
tags: [devops, service-mesh, networking, phase-7]
---

# devops-service-mesh

## Purpose
Install, configure, and operate a service mesh (Istio or Linkerd) for traffic management, mTLS security, observability, and resilience patterns in Kubernetes.

## Agent Protocol

### Trigger
Any user message referencing service mesh, Istio, Linkerd, sidecar injection, mTLS, VirtualService, DestinationRule, or mesh observability.

### Input Context
Mesh provider preference, cluster size, security requirements, existing networking setup, K8s version, resource constraints.

### Output Artifact
Mesh installation commands (istioctl/linkerd CLI), sidecar injection config, traffic management VirtualService/DestinationRule YAML, mTLS policy, AuthorizationPolicy rules.

### Response Format
CLI commands and YAML manifests with brief explanations.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
Mesh installed, sidecars injected, mTLS enabled, traffic rules applied, telemetry flowing, Kiali topology visible.

### Max Response Length
8000 tokens.

## Decision Tree: Istio vs Linkerd
| Factor | Istio | Linkerd |
|--------|-------|---------|
| Complexity | High, many CRDs (20+) | Low, fewer concepts |
| Features | Rich (traffic split, fault injection, WASM) | Focused (mTLS, metrics, tap) |
| Performance overhead | 5-15ms latency added | 1-5ms latency added |
| Resource usage | 200-500Mi per sidecar | 20-50Mi per sidecar |
| Multi-cluster | Native east-west gateway | Service mirroring |
| Customization | WASM, EnvoyFilter, extensive API | Limited (annotation-based) |
| Learning curve | Steep | Moderate |
| Community | Large, CNCF graduated | CNCF graduated |
| Best for | Complex traffic management, compliance | Simplicity, low overhead, small teams |

## Components

### Istio Architecture
Pilot: service discovery abstraction (bridges K8s services to Envoy), traffic management rule conversion (VirtualService/DestinationRule -> Envoy filter config), Envoy xDS protocol for dynamic configuration push. Citadel: SPIFFE-compatible certificate authority, issues X.509 certificates with 24h TTL to every sidecar, auto-rotation before expiry, supports integration with external CA (cert-manager, Vault). Galley: validates all Istio CRDs before persistence, ingests platform state (services, endpoints, pods). Envoy sidecar: L4/L7 proxy, implements routing rules, mTLS, circuit breakers, retries, timeouts, rate limiting, access logging, telemetry generation. Ingress gateway: dedicated Envoy at mesh edge, handles TLS termination, mTLS passthrough, traffic routing. Egress gateway: dedicated Envoy for outbound traffic with policy enforcement.

### Traffic Management CRDs
VirtualService: hosts (service DNS names), http/tcp routes (match: uri, headers, method, query params), route (destination host, subset, weight, port), fault injection (abort with HTTP status, delay), mirror, retries, timeout, corsPolicy. DestinationRule: host, trafficPolicy (loadBalancer, connectionPool, outlierDetection), subsets, tlsSettings. Gateway: selector, servers (port, protocol, TLS mode, hosts). ServiceEntry: hosts, ports, resolution, location.

## Installation

### Istio with Production Profile
```bash
istioctl install --set profile=production \
  --set meshConfig.accessLogFile=/dev/stdout \
  --set meshConfig.accessLogEncoding=JSON \
  --set meshConfig.enableTracing=true \
  --set values.global.proxy.resources.requests.cpu=100m \
  --set values.global.proxy.resources.requests.memory=128Mi \
  --set values.global.proxy.resources.limits.cpu=500m \
  --set values.global.proxy.resources.limits.memory=256Mi \
  --set values.pilot.resources.requests.cpu=500m \
  --set values.pilot.resources.requests.memory=2Gi

# Create namespace label for auto-injection
kubectl label namespace default istio-injection=enabled

# Verify
istioctl verify-install
istioctl proxy-status
```

### Istio with Helm (GitOps-friendly)
```bash
helm repo add istio https://istio-release.storage.googleapis.com/charts
helm upgrade -i istio-base istio/base -n istio-system --create-namespace
helm upgrade -i istiod istio/istiod -n istio-system \
  --set meshConfig.accessLogFile=/dev/stdout \
  --set meshConfig.enableTracing=true
helm upgrade -i istio-ingressgateway istio/gateway -n istio-system \
  --set service.type=LoadBalancer
```

### Linkerd Installation
```bash
linkerd install | kubectl apply -f -
linkerd check
kubectl annotate namespace default linkerd.io/inject=enabled
```

## Traffic Management Examples

### VirtualService with Weighted Canary
```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: myapp
spec:
  hosts:
  - myapp.default.svc.cluster.local
  http:
  - match:
    - uri:
        prefix: /api
    route:
    - destination:
        host: myapp
        subset: v1
      weight: 90
    - destination:
        host: myapp
        subset: v2
      weight: 10
    timeout: 5s
    retries:
      attempts: 3
      perTryTimeout: 2s
      retryOn: connect-failure,refused-stream,503
    corsPolicy:
      allowOrigins:
      - exact: https://myapp.example.com
      allowMethods: [GET, POST, PUT, DELETE]
```
```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: myapp
spec:
  host: myapp
  trafficPolicy:
    loadBalancer:
      simple: LEAST_REQUEST
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 10
        http2MaxRequests: 1000
        maxRequestsPerConnection: 10
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

### Fault Injection for Resilience Testing
```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: myapp-fault
spec:
  hosts:
  - myapp
  http:
  - fault:
      delay:
        percentage:
          value: 10
        fixedDelay: 5s
      abort:
        percentage:
          value: 5
        httpStatus: 500
    route:
    - destination:
        host: myapp
        subset: v1
```

### Traffic Mirroring (Shadow Traffic)
```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: myapp-mirror
spec:
  hosts:
  - myapp
  http:
  - route:
    - destination:
        host: myapp
        subset: v1
    mirror:
      host: myapp
      subset: v2
    mirrorPercentage:
      value: 50
```

### Ingress Gateway with TLS Termination
```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: myapp-gateway
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    hosts:
    - myapp.example.com
    tls:
      mode: SIMPLE
      credentialName: myapp-tls-cert
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: myapp-ingress
spec:
  hosts:
  - myapp.example.com
  gateways:
  - myapp-gateway
  http:
  - match:
    - uri:
        prefix: /api
    route:
    - destination:
        host: myapp
        port:
          number: 8080
```

## Security Configuration

### mTLS: PERMISSIVE to STRICT Migration
```yaml
# Step 1: Mesh-wide PERMISSIVE
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: PERMISSIVE
---
# Step 2: Per-namespace STRICT
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: STRICT
---
# Step 3: Per-workload override (opt-out)
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: legacy-workload
  namespace: production
spec:
  selector:
    matchLabels:
      app: legacy
  mtls:
    mode: PERMISSIVE
```

### AuthorizationPolicy (Default Deny)
```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: production
spec:
  {}
---
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: myapp-allow
  namespace: production
spec:
  selector:
    matchLabels:
      app: myapp
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/frontend/sa/frontend-sa"]
    - source:
        namespaces: ["monitoring"]
    to:
    - operation:
        methods: ["GET", "POST"]
        paths: ["/api/*"]
    when:
    - key: request.headers[x-api-version]
      values: ["v1", "v2"]
```

### RequestAuthentication (JWT Validation)
```yaml
apiVersion: security.istio.io/v1beta1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: production
spec:
  selector:
    matchLabels:
      app: myapp
  jwtRules:
  - issuer: https://accounts.example.com
    jwksUri: https://accounts.example.com/.well-known/jwks.json
    forwardOriginalToken: true
    audiences:
    - myapp-api
```

## Observability Configuration

### Access Logging (JSON format)
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: istio-mesh-config
  namespace: istio-system
data:
  mesh: |-
    accessLogFile: /dev/stdout
    accessLogEncoding: JSON
    accessLogFormat: |
      {"start_time":"%START_TIME%","method":"%REQ(:METHOD)%","path":"%REQ(X-ENVOY-ORIGINAL-PATH?)%","protocol":"%PROTOCOL%","response_code":"%RESPONSE_CODE%","response_flags":"%RESPONSE_FLAGS%","duration":"%DURATION%","upstream_host":"%UPSTREAM_HOST%","bytes_received":"%BYTES_RECEIVED%","bytes_sent":"%BYTES_SENT%","trace_id":"%REQ(X-REQUEST-ID)%","user_agent":"%REQ(USER-AGENT)%"}
    enableTracing: true
```

### WASM Extension for Custom Metrics
```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: custom-metrics
  namespace: istio-system
spec:
  selector:
    matchLabels:
      app: myapp
  url: oci://ghcr.io/org/custom-metrics:v1
  phase: STATS
  imagePullPolicy: IfNotPresent
  pluginConfig:
    metrics:
    - name: custom_request_count
      type: COUNTER
```

## Multi-Cluster Setup (Primary-Remote)

### Cluster A (Primary)
```bash
istioctl install --set profile=production \
  --set values.global.meshID=mesh1 \
  --set values.global.multiCluster.clusterName=cluster-a \
  --set values.global.network=network1
# Expose services via east-west gateway
samples/multicluster/gen-eastwest-gateway.sh --mesh mesh1 --cluster cluster-a --network network1 | kubectl apply -f -
```

### Cluster B (Remote)
```bash
istioctl install --set profile=remote \
  --set values.global.meshID=mesh1 \
  --set values.global.multiCluster.clusterName=cluster-b \
  --set values.global.network=network2
# Join cluster B to mesh
istioctl create-remote-secret --name cluster-b | kubectl apply -f - -n istio-system
```

## Sidecar Injection Configuration

### Resource Limits for Sidecars
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  annotations:
    sidecar.istio.io/proxyCPU: 100m
    sidecar.istio.io/proxyMemory: 128Mi
    sidecar.istio.io/proxyCPULimit: 500m
    sidecar.istio.io/proxyMemoryLimit: 256Mi
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/inject: "true"
```

## Troubleshooting Commands
```bash
# Check sidecar status
istioctl proxy-status
istioctl proxy-status <pod-name>

# View Envoy config
istioctl proxy-config clusters <pod-name>
istioctl proxy-config listeners <pod-name>
istioctl proxy-config routes <pod-name>
istioctl proxy-config endpoints <pod-name>

# Check mTLS
istioctl authz check <pod-name>
istioctl experimental authz check <pod-name> -a

# Verify injection
istioctl analyze <deployment-yaml>
kubectl describe mutatingwebhookconfiguration istio-sidecar-injector

# Envoy admin (port-forward required)
kubectl port-forward <pod-name> 15000:15000
curl localhost:15000/server_info
curl localhost:15000/stats

# Check control plane health
kubectl get pods -n istio-system
kubectl logs -n istio-system deployment/istiod
istioctl dashboard kiali
istioctl dashboard jaeger
istioctl dashboard grafana
```

## Rules
1. mTLS in STRICT mode for all mesh-internal traffic.
2. Sidecar injection via namespace label — never manual annotations.
3. AuthorizationPolicy default deny with explicit allow rules.
4. Circuit breaker configured for all downstream service calls.
5. Telemetry enabled at mesh level, not per-sidecar override.
6. Sidecar resource limits required — without them sidecars crash under load.
7. Mesh control plane upgraded before data plane (sidecars).
8. Canary upgrades for control plane — one revision at a time.
9. Egress traffic explicitly allowed via ServiceEntry — no wildcard egress.
10. Migration: PERMISSIVE -> monitor -> STRICT — never go directly to STRICT.
11. Sidecar version must match control plane version exactly.
12. Access logs sampled at 1% in production — 100% sample impacts performance.
13. WASM extensions over legacy Mixer for telemetry generation.
14. Service mesh version compatibility verified before upgrade.

## Production Considerations
- Sidecar resource limits prevent OOM under traffic spikes.
- Access log sampling (1% default) reduces storage and performance overhead.
- Control plane metrics (Pilot, Galley, Citadel) monitored separately.
- Canary upgrade for control plane: revision-based upgrades allow rollback.
- East-west gateway for multi-cluster traffic with dedicated node pools.
- Kiali accessed via SSO with read-only role for most team members.
- DestinationRule circuit breaker tuned based on actual performance data.
- mTLS migration plan: DISABLE -> PERMISSIVE (monitor) -> STRICT (per namespace).
- WASM extensions for custom metrics replace deprecated Mixer telemetry.
- ServiceEntry for all external dependencies with explicit allow.

## Anti-Patterns
- Sidecar injection on istio-system namespace — recursive injection.
- 100% access log sampling on high-traffic services — performance impact.
- No circuit breaker on DestinationRule — cascading failures.
- AuthorizationPolicy with allow-all before default-deny — security gap.
- Direct STRICT mTLS mode without PERMISSIVE migration — broken connections.
- Mixing sidecar versions across control plane — config mismatch.
- No sidecar resource limits — sidecar OOM under load.
- Using EnvoyFilter when Istio API covers the use case — maintenance burden.
- Egress via wildcard instead of explicit ServiceEntry — security risk.
- Single control plane revision for all namespaces during upgrades.

## References
  - references/istio-patterns.md — Istio Patterns
  - references/linkerd-patterns.md — Linkerd Patterns
  - references/mesh-observability.md — Service Mesh Observability
  - references/mesh-operations.md — Service Mesh Operations
  - references/service-mesh-advanced.md — Service Mesh Advanced Topics
  - references/service-mesh-architecture.md — Service Mesh Architecture
  - references/service-mesh-fundamentals.md — Service Mesh Fundamentals
  - references/service-mesh-security.md — Service Mesh Security
## Handoff
Hand off to monitoring for Prometheus/Grafana dashboards. Hand off to security for PKI and certificate management. Hand off to argo-cd for progressive delivery patterns with Istio integration. Hand off to chaos-engineering for mesh resilience testing.
