# Zero Trust Networking

## Purpose

Zero Trust Networking (ZTN) enforces "never trust, always verify" at the network layer. No entity is trusted based on network location — every packet, connection, and flow must be authenticated, authorized, and encrypted. This covers mTLS, service mesh, network segmentation, micro-segmentation, workload identity (SPIFFE), tunnel/overlay networks, egress controls, and network logging.

## Zero Trust Network Architecture

### Core Principles

1. **No implicit trust** — network location (internal IP, VLAN membership) confers zero trust
2. **Encrypt everything** — all traffic is encrypted in transit (mTLS for service-to-service, WireGuard/IPsec for infrastructure)
3. **Identity-based access** — policies reference workload and user identities, not IP addresses or CIDR ranges
4. **Micro-segmentation** — each workload has isolated network policies; east-west traffic is controlled
5. **Continuous verification** — sessions are re-verified periodically (not just at connection time)
6. **Log everything** — every flow is logged, every denied connection is alerted

### Architecture Layers

```
Layer 5+: Application (mTLS, JWT, SPIFFE)
Layer 4:  Transport (TCP/TLS, QUIC)
Layer 3:  Network (IPsec, WireGuard, overlay networks)
Layer 2:  Link (MAC, VLAN isolation)

+-------------------+     +-------------------+
|   Workload A      |     |   Workload B      |
| App: mTLS (SPIFFE)|---->| App: mTLS (SPIFFE)|
| Sidecar: Envoy    |     | Sidecar: Envoy    |
| Overlay: Cilium   |     | Overlay: Cilium   |
+-------------------+     +-------------------+
        |                         |
   Identity-based            Identity-based
   policy (network)          policy (network)
        |                         |
+----------------------------------------+
|         Network Fabric                 |
|   (No trust, authenticated flows)      |
+----------------------------------------+
```

## mTLS

### Mutual TLS

mTLS authenticates both sides of a connection using X.509 certificates. Every service presents a certificate, and both sides verify each other's certificates.

```yaml
# Istio — enable mTLS globally
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT  # STRICT = mTLS required, PERMISSIVE = allow plaintext
```

```yaml
# Linkerd — mTLS enabled by default
# No configuration needed — mTLS is automatic
# Injected proxy handles mTLS transparently
apiVersion: linkerd.io/v1alpha2
kind: ServiceProfile
metadata:
  name: myapp.default.svc.cluster.local
spec:
  routes:
    - name: POST /api/orders
      condition:
        method: POST
        pathRegex: /api/orders
      isRetryable: true
      timeout: 10s
```

### Certificate Rotation

```bash
# Certificate management with cert-manager
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: workload-cert
  namespace: production
spec:
  secretName: workload-tls
  duration: 24h                    # Short-lived certificates
  renewBefore: 12h                 # Renew when 12h remaining
  privateKey:
    rotationPolicy: Always         # Generate new key on each renewal
    algorithm: ECDSA
    size: 256
  usages:
    - server auth
    - client auth
  issuerRef:
    name: istio-ca
    kind: ClusterIssuer
```

### mTLS Configuration (Without Service Mesh)

```nginx
# Nginx — mTLS between services
server {
    listen 443 ssl;
    ssl_certificate /etc/certs/server.crt;
    ssl_certificate_key /etc/certs/server.key;
    ssl_client_certificate /etc/certs/ca.crt;  # CA for client certs
    ssl_verify_client on;                        # Require client cert
    ssl_verify_depth 2;

    location /api/ {
        # Only allow clients with specific CN
        if ($ssl_client_s_dn !~ "CN=allowed-service") {
            return 403;
        }
        proxy_pass http://backend:8080;
    }
}
```

## Service Mesh

### Istio

```yaml
# Istio AuthorizationPolicy — identity-based access
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: orders-service-policy
  namespace: production
spec:
  selector:
    matchLabels:
      app: orders-service
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/production/sa/api-gateway"]
            namespaces: ["production"]
      to:
        - operation:
            methods: ["POST", "GET"]
            paths: ["/api/orders/*"]
      when:
        - key: request.headers[X-Custom-Auth]
          values: ["validated"]
    - from:
        - source:
            principals: ["cluster.local/ns/internal/sa/reporting-cronjob"]
      to:
        - operation:
            methods: ["GET"]
            paths: ["/api/orders/report"]
```

### Linkerd

```yaml
# Linkerd — HTTP route-based authorization
apiVersion: policy.linkerd.io/v1beta1
kind: HTTPRoute
metadata:
  name: orders-api
  namespace: production
spec:
  parentRefs:
    - name: orders-service
      group: policy.linkerd.io
      kind: Server
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /api/orders
      filters:
        - type: RequestHeaderModifier
          requestHeaderModifier:
            add:
              - name: l5d-proxy-identity
                value: production/orders-service
---
apiVersion: policy.linkerd.io/v1alpha1
kind: AuthorizationPolicy
metadata:
  name: orders-api-policy
spec:
  targetRef:
    group: policy.linkerd.io
    kind: HTTPRoute
    name: orders-api
  requiredAuthenticationRef:
    group: policy.linkerd.io
    kind: MeshTLSAuthentication
    name: production-internal
```

## Micro-Segmentation

### Policy Models

```yaml
# Kubernetes NetworkPolicy — basic micro-segmentation
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: orders-network-policy
spec:
  podSelector:
    matchLabels:
      app: orders-service
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: api-gateway
        - namespaceSelector:
            matchLabels:
              tier: internal
      ports:
        - port: 8080
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: payments-service
      ports:
        - port: 8080
    - to:
        - podSelector:
            matchLabels:
              app: inventory-service
      ports:
        - port: 8080
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
            except:
              - 10.0.0.0/8       # Block internal network access
              - 172.16.0.0/12
              - 192.168.0.0/16
      ports:
        - port: 443               # Only HTTPS egress
```

### Cilium — Advanced Micro-Segmentation

```yaml
# Cilium NetworkPolicy — identity-aware, L7 aware
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: orders-policy
spec:
  endpointSelector:
    matchLabels:
      app: orders-service
  ingress:
    - fromEndpoints:
        - matchLabels:
            app: api-gateway
            "k8s:io.kubernetes.pod.namespace": production
      toPorts:
        - ports:
            - port: "8080"
              protocol: TCP
          rules:
            http:
              - method: "POST"
                path: "/api/orders"
              - method: "GET"
                path: "/api/orders/[^/]*$"
  egress:
    - toEndpoints:
        - matchLabels:
            app: redis
      toPorts:
        - ports:
            - port: "6379"
              protocol: TCP
    - toFQDNs:
        - matchPattern: "*.api.stripe.com"
      toPorts:
        - ports:
            - port: "443"
              protocol: TCP
```

## Workload Identity (SPIFFE)

### SPIFFE Standard

SPIFFE (Secure Production Identity Framework for Everyone) provides a standardized identity format for workloads.

```
SPIFFE ID format: spiffe://<trust-domain>/<path>
Example: spiffe://production.example.com/ns/production/sa/orders-service

Components:
- trust-domain: production.example.com  (your organization)
- path: ns/production/sa/orders-service (workload identity)
```

### SPIFFE Implementation with SPIRE

```yaml
# SPIRE Agent and Server deployment
apiVersion: spiffe.io/v1beta1
kind: ClusterSpiffeID
metadata:
  name: orders-service
  namespace: production
spec:
  spiffeID: "spiffe://production.example.com/ns/production/sa/orders-service"
  podSelector:
    matchLabels:
      app: orders-service
  workloadAttestor: k8s
```

```go
// Go workload — fetch SPIFFE SVID using go-spiffe library
import (
    "context"
    "crypto/tls"
    "net/http"

    "github.com/spiffe/go-spiffe/v2/spiffeid"
    "github.com/spiffe/go-spiffe/v2/spiffetls/tlsconfig"
    "github.com/spiffe/go-spiffe/v2/svid/x509svid"
    "github.com/spiffe/go-spiffe/v2/workloadapi"
)

func createMTLSClient(ctx context.Context) (*http.Client, error) {
    // Connect to SPIRE Agent's Workload API
    source, err := workloadapi.NewX509Source(ctx)
    if err != nil {
        return nil, err
    }

    tlsConfig := tlsconfig.MTLSClientConfig(source, source, tlsconfig.AuthorizeAny())
    return &http.Client{
        Transport: &http.Transport{TLSClientConfig: tlsConfig},
    }, nil
}
```

## Tunnel / Overlay Networks

### WireGuard

```ini
# WireGuard configuration — point-to-point encrypted tunnel
[Interface]
PrivateKey = <node-private-key>
Address = 10.100.0.1/32
ListenPort = 51820

# Allow only specific ports from this peer
[Peer]
PublicKey = <peer-public-key>
AllowedIPs = 10.100.0.2/32
PersistentKeepalive = 25
```

### Cilium Overlay (VXLAN)

```yaml
# Cilium — VXLAN overlay with encryption
apiVersion: cilium.io/v2
kind: CiliumClusterwideEnvoyConfig
metadata:
  name: cilium-overlay
spec:
  # Encryption using WireGuard built into Cilium
---
# Enable encryption
apiVersion: cilium.io/v2
kind: CiliumNodeConfig
metadata:
  name: enable-encryption
  namespace: kube-system
spec:
  defaults:
    encryption: "wireguard"
```

### Cloudflare Tunnel (Argo Tunnel)

```yaml
# Cloudflare Tunnel — outbound-only encrypted tunnel
# No open inbound ports, agent connects outbound to Cloudflare edge
tunnel:
  ingress:
    - hostname: app.example.com
      service: http://localhost:8080
    - hostname: admin.example.com
      service: http://localhost:3000
      # Require device posture + identity
      access:
        required: true
        team_name: my-team
    - service: http_status:404
```

## Egress Controls

### DNS-Based Egress Policy

```yaml
# Cilium — DNS-aware egress policy
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: egress-dns
spec:
  endpointSelector:
    matchLabels:
      app: orders-service
  egress:
    # DNS resolution first
    - toEndpoints:
        - matchLabels:
            "k8s:k8s-app": kube-dns
      toPorts:
        - ports:
            - port: "53"
              protocol: UDP
    # Allowed external services
    - toFQDNs:
        - matchPattern: "*.stripe.com"
        - matchPattern: "*.datadoghq.com"
        - matchName: "api.sendgrid.com"
      toPorts:
        - ports:
            - port: "443"
              protocol: TCP
```

### Egress Gateway (Istio)

```yaml
# Istio — route external traffic through egress gateway
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-api
spec:
  hosts:
    - "api.stripe.com"
  ports:
    - number: 443
      name: https
      protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL

---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: route-external
spec:
  hosts:
    - "api.stripe.com"
  tls:
    - match:
        - port: 443
          sniHosts:
            - "api.stripe.com"
      route:
        - destination:
            host: "istio-egressgateway.istio-system.svc.cluster.local"
            port:
              number: 443
```

## Network Logging

### Flow Logs

```yaml
# Cilium — Hubble flow monitoring
apiVersion: cilium.io/v2
kind: CiliumClusterwideNetworkPolicy
metadata:
  name: monitor-all-flows
spec:
  endpointSelector: {}
  ingress:
    - {}
  egress:
    - {}
---
# Hubble configuration
hubble:
  enabled: true
  metrics:
    enabled:
      - "flow:sourceContext=identity;destinationContext=identity"
      - "dns"
      - "http"
      - "tcp"
  relay:
    enabled: true
```

### Cilium Hubble Flow Export

```bash
# Observe flows in real-time
hubble observe --from-pod orders-service --to-pod payments-service

# Export flows to file
hubble observe --server hubble-relay.kube-system:80 \
  --format json \
  --output hubble-flows.json

# Example flow record
{
  "time": "2026-05-15T10:30:00.123Z",
  "source": {
    "pod_name": "orders-service-v2-abc123",
    "namespace": "production",
    "identity": 12345,
    "labels": ["app=orders-service"]
  },
  "destination": {
    "pod_name": "payments-service-def456",
    "namespace": "production",
    "identity": 67890,
    "labels": ["app=payments-service"]
  },
  "l4": {
    "TCP": {
      "source_port": 42100,
      "destination_port": 8080
    }
  },
  "l7": {
    "type": "REQUEST",
    "http": {
      "method": "POST",
      "path": "/api/payments",
      "code": 201
    }
  },
  "verdict": "FORWARDED"
}
```

### Alerting Rules

```yaml
# Prometheus alerting rules for network anomalies
groups:
  - name: zero-trust-network
    rules:
      - alert: DeniedConnection
        expr: rate(hubble_drop_total{verdict="DROPPED"}[5m]) > 0
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "Network policy violation detected"

      - alert: UnexpectedEgress
        expr: rate(hubble_flows_total{destination_namespace!="production",verdict="FORWARDED"}[5m]) > 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Unexpected egress traffic from production namespace"

      - alert: mTLSError
        expr: rate(istio_requests_total{response_code=~"4[0-9]{2}",connection_security_policy="mutual_tls"}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "mTLS handshake failures detected"

      - alert: NoNetworkPolicy
        expr: count(kube_networkpolicy_created) by (namespace) < count(kube_deployment_status_replicas) by (namespace)
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Some workloads lack NetworkPolicy coverage"
```

## Key Points

- mTLS authenticates both sides of every connection using X.509 certificates with short-lived automatic rotation.
- Service mesh (Istio, Linkerd) provides transparent mTLS, identity-based authorization, and traffic management.
- Network policies (Kubernetes NetworkPolicy, Cilium) enforce micro-segmentation at L3-L7.
- SPIFFE/SPIRE provides standardized workload identity across platforms.
- Overlay networks (VXLAN, WireGuard, Cilium) encrypt traffic between nodes.
- Egress controls restrict which external services workloads can reach.
- Hubble/Cilium flow monitoring provides visibility into every network flow.
- Alert on denied connections (policy violations), unexpected egress, and mTLS failures.
- Every flow must be authenticated and authorized — no implicit trust based on network location.
- Default-deny policies with explicit allow rules are the only safe approach.
