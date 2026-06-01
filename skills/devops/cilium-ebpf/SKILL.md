---
name: cilium-ebpf
description: >
  Use this skill when the user says 'Cilium', 'eBPF', 'BPF', 'Hubble',
  'service mesh', 'network policy', 'cluster mesh', 'eBPF observability',
  'kube-proxy replacement', 'CiliumNetworkPolicy', 'CiliumClusterWideNetworkPolicy',
  'CiliumEndpoint', 'Hubble UI', 'Tetragon', 'Cilium CNI'.
  Covers: Cilium CNI installation, eBPF-based networking, network policies,
  Hubble observability, cluster mesh (multi-cluster), service mesh (L7 policies),
  kube-proxy replacement, bandwidth management, encryption (Wireguard/IPsec).
  Do NOT use for: generic Kubernetes networking (use kubernetes-patterns),
  traditional CNI plugins (Calico, Flannel).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, cilium, ebpf, kubernetes, networking, phase-5]
---

# Cilium and eBPF

## Purpose
Implement Cilium-based Kubernetes networking with eBPF for high-performance networking, security policies, observability, and multi-cluster connectivity.

## Architecture Decision Trees

### Cilium vs Other CNIs
| Feature | Cilium (eBPF) | Calico | Flannel | Weave |
|---|---|---|---|---|
| kube-proxy replacement | Yes (eBPF) | No | No | No |
| L7 network policies | Yes (Envoy) | No | No | No |
| Encryption | WireGuard/IPsec | WireGuard | No | Yes (encrypt) |
| Cluster mesh | Yes | Yes (multi-interface) | No | Yes |
| Hubble observability | Built-in | No | No | No |
| Bandwidth management | Yes (eBPF) | No | No | No |
| Performance | Near-native | Iptables-based | Overlay | Overlay |
| eBPF-only features | Yes | No | No | No |

### Cilium Agent Mode: kube-proxy replacement vs standard
| Feature | kube-proxy replacement | Standard (iptables) |
|---|---|---|
| Performance | Better (eBPF in kernel) | Good |
| Features | Service mesh, bandwidth, encryption | Basic networking |
| Kernel req | >= 5.10 | >= 4.19 |
| Migration | Requires kernel support | Safe fallback |
| Observability | Hubble per-packet | Limited |

### Network Policy Enforcement
| Policy Type | Cilium CRD | Traditional K8s | L7 Aware | Performance |
|---|---|---|---|---|
| L3/L4 (IP/port) | CiliumNetworkPolicy | NetworkPolicy | No | eBPF (fast) |
| L7 (HTTP/gRPC/Kafka) | CiliumNetworkPolicy | Not supported | Yes | Envoy proxy |
| Cluster-wide | CiliumClusterWideNetworkPolicy | Not supported | Yes | eBPF |
| DNS-based | ToFQDN | Not supported | No | eBPF |

### Hubble vs Prometheus for Observability
| Feature | Hubble | Prometheus |
|---|---|---|
| Data source | eBPF (kernel-level, per-packet) | Metrics endpoint (app-level) |
| Visibility | All network flows (including dropped) | Only app-exposed metrics |
| Latency | Kernel-level, no instrumentation | Application metrics |
| Storage | In-memory / relay | TSDB |
| Query | hubble CLI, UI, Grafana | PromQL |
| Retention | Configurable (via relay) | Configurable |

## Quick Start
Helm install Cilium → Verify with cilium status → kube-proxy replacement → Network policies (L3/L4, L7) → Hubble for observability → Cluster mesh for multi-cluster → Service mesh for L7.

## Core Workflow

### Step 1: Cilium Installation (Helm)
```bash
# Install Cilium with kube-proxy replacement
helm repo add cilium https://helm.cilium.io/
helm upgrade --install cilium cilium/cilium --namespace kube-system \
  --set kubeProxyReplacement=true \
  --set hubble.relay.enabled=true \
  --set hubble.ui.enabled=true \
  --set encryption.type=wireguard \
  --set ipam.mode=kubernetes \
  --set devices='{eth0}' \
  --set routingMode=native \
  --set autoDirectNodeRoutes=true \
  --set bpf.masquerade=true \
  --set l7Proxy=true

# Verify installation
cilium status --wait
cilium connectivity test

# Check eBPF is being used
cilium status | grep BPF
```

### Step 2: L3/L4 Network Policies
```yaml
# policies/l3-l4-policy.yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: payment-service-policy
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: payment-service
  ingress:
    - fromEndpoints:
        - matchLabels:
            app: api-gateway
      toPorts:
        - ports:
            - port: "8080"
              protocol: TCP
  egress:
    - toEndpoints:
        - matchLabels:
            app: notification-service
      toPorts:
        - ports:
            - port: "9090"
              protocol: TCP
    - toEntities:
        - kube-apiserver
      toPorts:
        - ports:
            - port: "6443"
              protocol: TCP
    - toFQDNs:
        - matchPattern: "*.internal.example.com"
        - matchName: "api.stripe.com"
```

### Step 3: L7 Network Policies (HTTP/gRPC)
```yaml
# policies/l7-http-policy.yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: l7-payment-policy
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: payment-service
  ingress:
    - fromEndpoints:
        - matchLabels:
            app: api-gateway
      toPorts:
        - ports:
            - port: "8080"
              protocol: TCP
          rules:
            http:
              - method: "POST"
                path: "/api/payments"
                headers:
                  - "X-Idempotency-Key"
              - method: "GET"
                path: "/api/payments/[0-9]+"
              - method: "GET"
                path: "/health"
            # Deny all other HTTP methods/paths
```

### Step 4: L7 Kafka Policy
```yaml
# policies/l7-kafka-policy.yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: kafka-producer-policy
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: payment-producer
  egress:
    - toEndpoints:
        - matchLabels:
            app: kafka-broker
      toPorts:
        - ports:
            - port: "9092"
              protocol: TCP
          rules:
            kafka:
              - apiKey: "produce"
                topic: "payments"
                clientID: "payment-service"
              - apiKey: "metadata"
                topic: "payments"
```

### Step 5: Hubble Observability
```bash
# Enable Hubble Relay and UI (already enabled in install)
kubectl port-forward -n kube-system svc/hubble-ui 12000:80
# Open http://localhost:12000

# Hubble CLI
hubble observe --from-pod production/payment-service
hubble observe --to-pod production/notification-service
hubble observe --verdict DROPPED
hubble observe --protocol http --last 100

# Hubble metrics (export to Prometheus)
# --set hubble.metrics.enabled="{dns,drop,tcp,flow,icmp,http}"
```

### Step 6: Cluster Mesh (Multi-Cluster)
```yaml
# cluster-mesh/cluster-mesh-values.yaml
# Install on cluster 1
clustermesh:
  useAPIServer: true
  config:
    clusters:
      - name: cluster-us-east
        ips: ["10.0.0.1"]
        port: 32379
      - name: cluster-us-west
        ips: ["10.0.1.1"]
        port: 32379
```

```bash
# Enable cluster mesh
cilium clustermesh enable --service-type ClusterIP --enable-kvstoremesh
# Generate connection secret for cluster 2
cilium clustermesh status
cilium clustermesh create --context cluster-us-east --hostname cluster-us-east.example.com
cilium clustermesh connect --context cluster-us-west \
  --destination-context cluster-us-east
```

```yaml
# cluster-mesh/service-export.yaml
apiVersion: cilium.io/v2alpha1
kind: CiliumClusterwideServiceExport
metadata:
  name: payment-service
spec:
  type: ClusterSetIP
  ports:
    - port: 8080
      protocol: TCP
---
apiVersion: cilium.io/v2alpha1
kind: CiliumClusterwideService
metadata:
  name: payment-service
spec:
  type: ClusterSetIP
  ports:
    - port: 8080
```

### Step 7: Bandwidth Management
```yaml
# bandwidth/pod-annotations.yaml
apiVersion: v1
kind: Pod
metadata:
  annotations:
    kubernetes.io/ingress-bandwidth: "100M"
    kubernetes.io/egress-bandwidth: "100M"
  name: bandwidth-limited-pod
spec:
  containers:
    - name: app
      image: nginx
```

### Step 8: Encryption with WireGuard
```yaml
# encryption/wireguard.yaml
# Set during install:
# --set encryption.type=wireguard
# --set encryption.wireguard.userspaceFallback=true

# Verify encryption
cilium encrypt status
cilium bpf ipcache list | grep encrypt

# Node-to-node encryption is automatic
# Can verify with tcpdump on any node:
# tcpdump -i any -nn "udp and port 51871"
```

## Anti-Patterns

### Anti-Pattern 1: Running on Old Kernels
Cilium's eBPF features require kernel >= 5.10 (ideally 6.x). On older kernels, Cilium falls back to iptables, losing most performance and feature benefits.

### Anti-Pattern 2: No Network Policies
Installing Cilium but using default allow-all policy. Cilium's primary value is its policy engine — enable with `--set policyEnforcementMode=always`.

### Anti-Pattern 3: Ignoring Hubble
Not deploying Hubble alongside Cilium. Hubble provides per-packet visibility that no other tool offers — deploy Hubble Relay and Prometheus metrics.

### Anti-Pattern 4: Direct Routing Without Native CIDR
Using tunneling (VXLAN/Geneve) when direct routing works. Native routing with autoDirectNodeRoutes provides better performance.

### Anti-Pattern 5: Too Permissive L7 Policies
Allowing all HTTP methods/paths without restrictions. L7 policies should be as specific as possible — only allow required paths and methods.

## Production Considerations

### Security
- Enable encryption (WireGuard) for node-to-node traffic.
- Use CiliumNetworkPolicy with L7 enforcement for critical services.
- Apply CiliumClusterWideNetworkPolicy for baseline security (deny all by default).
- Enable Hubble for network audit trail.
- Use toFQDN policies instead of allowing all egress to APNs.
- Enable policy enforcement mode: always.

### Performance
- Enable kube-proxy replacement for better service routing performance.
- Use native routing mode with autoDirectNodeRoutes.
- Enable BPF masquerading instead of iptables MASQUERADE.
- Use bandwidth annotations for noisy-neighbor prevention.
- Monitor Hubble dropped packet metrics for network issues.

### Troubleshooting
- `cilium connectivity test` for end-to-end validation.
- `hubble observe --verdict DROPPED` to see dropped packets.
- `cilium monitor` for real-time packet flow.
- `cilium bpf` commands for low-level BPF map inspection.

## Rules & Constraints
- Kernel >= 5.10 required for full eBPF features.
- Always deploy Hubble alongside Cilium.
- Enable kube-proxy replacement on new clusters.
- Use CiliumNetworkPolicy (not K8s NetworkPolicy) for L7 features.
- Enable encryption for multi-node clusters.
- Test connectivity with `cilium connectivity test` after install.

## References
  - references/cilium-architecture.md
  - references/cilium-ebpf-advanced.md
  - references/cilium-ebpf-fundamentals.md
  - references/cluster-mesh.md
  - references/ebpf-deep-dive.md
  - references/network-policies.md
  - references/observability-hubble.md
  - references/cilium-service-mesh-guide.md

## Handoff
Next: **service-mesh** — Istio/Linkerd service mesh integration with Cilium.
