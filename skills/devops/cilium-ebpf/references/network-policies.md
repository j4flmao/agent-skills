# Cilium Network Policies

## Overview

Cilium extends Kubernetes NetworkPolicy with identity-based, L7-aware policies that work at the API protocol level (HTTP, gRPC, Kafka, DNS). Policies use endpoint selectors based on Kubernetes labels rather than IP CIDRs.

## Policy Types

| Resource | Scope | Use Case |
|----------|-------|----------|
| `CiliumNetworkPolicy` | Namespace-scoped | Per-namespace policies |
| `CiliumClusterwideNetworkPolicy` | Cluster-scoped | Global policies, admin controls |

## L3/L4 Policies

### Basic Ingress Policy
```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-frontend
  namespace: default
spec:
  endpointSelector:
    matchLabels:
      app: api-server
  ingress:
  - fromEndpoints:
    - matchLabels:
        app: frontend
    toPorts:
    - ports:
      - port: "8080"
        protocol: TCP
```

### Egress Policy
```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: api-egress
  namespace: default
spec:
  endpointSelector:
    matchLabels:
      app: api-server
  egress:
  - toEndpoints:
    - matchLabels:
        app: database
    toPorts:
    - ports:
      - port: "5432"
        protocol: TCP
  - toFQDNs:
    - matchName: "api.external.com"
    toPorts:
    - ports:
      - port: "443"
        protocol: TCP
```

### CIDR-Based Policy
```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-external
spec:
  endpointSelector:
    matchLabels:
      app: api-server
  egress:
  - toCIDR:
    - 10.0.0.0/8
    - 192.168.0.0/16
    toPorts:
    - ports:
      - port: "443"
  - toCIDRSet:
    - cidr: 172.16.0.0/12
      except:
      - 172.16.1.0/24
```

### Deny Policy
```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: deny-except-health
spec:
  endpointSelector:
    matchLabels:
      app: api-server
  ingressDeny:
  - fromEndpoints:
    - matchLabels:
        app: legacy-service
  egressDeny:
  - toCIDR:
    - 0.0.0.0/0
```

## L7 Policies

### HTTP-Aware Policy
```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: http-api-policy
  namespace: default
spec:
  endpointSelector:
    matchLabels:
      app: api-server
  ingress:
  - fromEndpoints:
    - matchLabels:
        app: frontend
    toPorts:
    - ports:
      - port: "8080"
        protocol: TCP
      rules:
        http:
        - method: GET
          path: "/api/v1/users/.*"
        - method: POST
          path: "/api/v1/orders"
          headers:
          - "X-API-Version: 2"
        - method: GET
          path: "/healthz"
        - method: "DENY"
          path: "/api/v1/admin/.*"
```

### gRPC-Aware Policy
```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: grpc-policy
spec:
  endpointSelector:
    matchLabels:
      app: grpc-server
  ingress:
  - fromEndpoints:
    - matchLabels:
        app: grpc-client
    toPorts:
    - ports:
      - port: "50051"
        protocol: TCP
      rules:
        grpc:
        - method: "com.example.OrderService/CreateOrder"
        - method: "com.example.OrderService/GetOrder"
        - method: "DENY"
          service: "com.example.AdminService"
```

### Kafka-Aware Policy
```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: kafka-policy
spec:
  endpointSelector:
    matchLabels:
      app: kafka-broker
  ingress:
  - fromEndpoints:
    - matchLabels:
        app: order-processor
    toPorts:
    - ports:
      - port: "9092"
        protocol: TCP
      rules:
        kafka:
        - apiKey: "produce"
          topic: "orders"
          clientID: "order-processor-1"
        - apiKey: "fetch"
          topic: "orders"
        - apiKey: "produce"
          topic: "dead-letter"
```

### DNS-Aware Policy
```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: dns-egress
spec:
  endpointSelector:
    matchLabels:
      app: worker
  egress:
  - toEndpoints:
    - matchLabels:
        io.cilium.k8s.namespace: kube-system
        k8s-app: kube-dns
    toPorts:
    - ports:
      - port: "53"
        protocol: UDP
      rules:
        dns:
        - matchName: "api.example.com"
        - matchPattern: "*.internal.example.com"
```

## Clusterwide Policies

### Global Default Deny
```yaml
apiVersion: cilium.io/v2
kind: CiliumClusterwideNetworkPolicy
metadata:
  name: default-deny-ingress
spec:
  description: "Default deny all ingress traffic"
  nodeSelector: {}
  ingress:
  - fromEndpoints:
    - matchLabels:
        io.cilium.k8s.namespace: kube-system
```

### Allow All from Namespace
```yaml
apiVersion: cilium.io/v2
kind: CiliumClusterwideNetworkPolicy
metadata:
  name: allow-monitoring
spec:
  description: "Allow Prometheus to scrape all pods"
  endpointSelector: {}
  ingress:
  - fromEndpoints:
    - matchLabels:
        app.kubernetes.io/name: prometheus
```

## Advanced Policy Patterns

### Policy with Entities
```yaml
spec:
  endpointSelector:
    matchLabels:
      app: web-server
  ingress:
  - fromEntities:
    - world             # All external traffic
    - cluster           # All cluster nodes
    - host              # Local host
    - remote-node       # Remote cluster nodes (ClusterMesh)
    - health            # Cilium health endpoints
    - init              # Cilium init container
    - unmanaged         # Non-Kubernetest managed endpoints
```

### Policy with Namespace Selectors
```yaml
spec:
  endpointSelector:
    matchLabels:
      app: api-server
  ingress:
  - fromEndpoints:
    - matchLabels:
        app: frontend
    - matchExpressions:
      - key: version
        operator: In
        values:
        - v2
        - v3
  - fromRequires:
    - matchLabels:
        io.cilium.k8s.namespace: production
```

### Mutual Authentication (mTLS) Policy
```yaml
spec:
  endpointSelector:
    matchLabels:
      app: service-a
  ingress:
  - fromEndpoints:
    - matchLabels:
        app: service-b
    authentication:
      mode: required
      # mutual: true  -- requires Cilium mTLS
```

## Policy Enforcement

### Policy Audit Mode
```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: audit-policy
  annotations:
    cilium.io/network-policy-mode: audit
spec:
  endpointSelector:
    matchLabels:
      app: new-service
  ingress:
  - fromEndpoints:
    - matchLabels:
        app: frontend
    toPorts:
    - ports:
      - port: "8080"
```

### Policy Verification
```bash
# Check policy enforcement status
cilium policy get default/allow-frontend

# Test connectivity
cilium connectivity test --policy-deny

# View policy verdicts in Hubble
hubble observe --verdict DROPPED

# Check policy trace
cilium policy trace -n default -i app=api-server
```

## Best Practices

1. **Start with default-deny policies** — least privilege from the start.
2. **Use identities over IPs** — identity-based policies survive pod restarts.
3. **Enable audit mode** for new policies before enforcing.
4. **Use CiliumClusterwideNetworkPolicy** for admin-level controls.
5. **Test with `cilium connectivity test`** before deploying to production.
6. **Monitor policy drops** with Hubble to identify legitimate traffic needing exceptions.
7. **Use L7 policies for APIs** — they provide intent-based security at the application layer.
8. **Set DNS policies** to control external service access.
9. **Document policy intent** in annotations for operational clarity.
10. **Version policies in Git** and apply via CI/CD for audit trail.
