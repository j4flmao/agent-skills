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

### CiliumInstallation Decision
```
Kernel version >= 5.10?
├── Yes → kube-proxy replacement mode (better performance, more features)
└── No → Standard iptables mode (fallback, fewer features)
    └── Consider upgrading kernel to 5.10+ for full eBPF benefits

Need encryption between nodes?
├── Yes → WireGuard (simpler, better perf) or IPsec (legacy compat)
└── No → Skip encryption config

Need multi-cluster communication?
├── Yes → Cluster Mesh with KV store mesh
└── No → Single cluster only
```

### Encryption Mode Decision
```
Kernel supports WireGuard?
├── Yes → WireGuard (better performance, simpler config)
│   ├── Kernel module available → encryption.type=wireguard
│   └── No kernel module → encryption.wireguard.userspaceFallback=true
└── No → IPsec (broader kernel compatibility, higher overhead)
```

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

### Step 9: Cilium Service Mesh — L7 Ingress
```yaml
# service-mesh/cilium-ingress.yaml
apiVersion: cilium.io/v2alpha1
kind: CiliumIngress
metadata:
  name: payment-ingress
  namespace: production
spec:
  ingressClassName: cilium
  rules:
    - host: api.payments.example.com
      http:
        paths:
          - path: /api/payments
            pathType: Prefix
            backend:
              service:
                name: payment-service
                port:
                  number: 8080
  tls:
    - hosts: [api.payments.example.com]
      secretName: payment-tls
```

### Step 10: CiliumClusterWideNetworkPolicy — Default Deny
```yaml
# policies/default-deny.yaml
apiVersion: cilium.io/v2
kind: CiliumClusterWideNetworkPolicy
metadata:
  name: default-deny-ingress
spec:
  endpointSelector: {}
  ingress:
    - fromEndpoints:
        - matchLabels:
            "k8s:io.kubernetes.pod.namespace": kube-system
  # All other ingress is denied by default
```

### Step 11: eBPF-native Ingress Load Balancing
```yaml
# lb/cilium-lb.yaml
apiVersion: cilium.io/v2alpha1
kind: CiliumLoadBalancerIPPool
metadata:
  name: production-pool
spec:
  blocks:
    - start: 192.168.10.100
      stop: 192.168.10.200
---
apiVersion: cilium.io/v2alpha1
kind: CiliumL2AnnouncementPolicy
metadata:
  name: production-l2-announce
spec:
  loadBalancerIPs: true
  interfaces:
    - eth0
  externalIPs: true
```

### Step 12: Hubble Metrics for Prometheus
```bash
# Enable Hubble metrics export
helm upgrade cilium cilium/cilium --namespace kube-system --reuse-values \
  --set hubble.metrics.enabled="{dns,drop,tcp,flow,icmp,http}" \
  --set hubble.metrics.destination=prometheus

# Grafana dashboards available at:
# https://github.com/cilium/cilium/tree/main/install/kubernetes/cilium/environment/hubble/grafana
```

### Step 13: Cilium Monitor — Real-time Debugging
```bash
# Real-time packet flow monitoring
cilium monitor --verbose

# Monitor specific service
cilium monitor --related-to payment-service

# Capture dropped packets only
cilium monitor --type drop

# Monitor HTTP traffic at L7
cilium monitor --type l7

# Capture and decode with tcpdump-like output
cilium monitor --hex
```

### Step 14: Cilium Endpoint and Identity Inspection
```bash
# List all Cilium endpoints
kubectl get ciliumendpoints -A

# Get endpoint identity details
cilium endpoint list
cilium endpoint get <endpoint-id>

# Identity-based troubleshooting
cilium identity list
cilium identity get <identity-id>

# Check security identity labels
kubectl get ciliumendpoints --all-namespaces -o json \
  | jq '.items[] | {pod: .metadata.name, ns: .metadata.namespace, identity: .status.identity.id}'
```

## Tool Comparison: eBPF-based Security Tools

| Feature | Cilium | Tetragon | Falco | Tracee |
|---|---|---|---|---|
| Use case | Network & security | Process & syscall monitoring | System call security | Runtime security |
| eBPF hooks | TC, XDP, cgroup, sock | Tracepoints, kprobes | Kernel modules + eBPF | Tracepoints, kprobes |
| Network policies | Yes (L3-L7) | No (process focus) | No | No |
| Process monitoring | Basic | Deep (exec, file, network) | Syscalls | Syscalls |
| K8s integration | Native | Native | Plugin | Plugin |
| CRD policies | Yes (NetworkPolicy) | Yes (TracingPolicy) | Rules file | Rules file |
| Prometheus metrics | Yes (Hubble) | Yes | Yes | Yes |

## Cilium Helm Values — Production Profile
```yaml
# cilium-production-values.yaml
kubeProxyReplacement: true
routingMode: native
autoDirectNodeRoutes: true
bpf:
  masquerade: true
  tproxy: true
ipam:
  mode: kubernetes
encryption:
  type: wireguard
  wireguard:
    userspaceFallback: true
l7Proxy: true
policyEnforcementMode: always
hubble:
  relay:
    enabled: true
  ui:
    enabled: true
  metrics:
    enabled:
      - dns
      - drop
      - tcp
      - flow
      - icmp
      - http
    destination: prometheus
rollOutCiliumPods: true
resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: 2
    memory: 2Gi
```

## Security Considerations
- CiliumNetworkPolicy with `policyEnforcementMode: always` prevents all traffic by default
- Enable Hubble audit logging for all dropped packets — store in SIEM for compliance
- Use toFQDN policies instead of allowing all egress — prevents data exfiltration via DNS
- WireGuard encryption ensures node-to-node traffic is secure even on untrusted networks
- Cilium identities are tied to Kubernetes service accounts — never run containers as root
- Hubble Relay API should be internal-only (not exposed externally)
- Enable TLS for Hubble gRPC communication between relay and UI
- Use CiliumClusterWideNetworkPolicy for baseline security that spans all namespaces
- Monitor Cilium agent logs for policy enforcement errors and identity allocation failures

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
- Use XDP acceleration for DDoS mitigation at the NIC level.

### Troubleshooting
- `cilium connectivity test` for end-to-end validation.
- `hubble observe --verdict DROPPED` to see dropped packets.
- `cilium monitor` for real-time packet flow.
- `cilium bpf` commands for low-level BPF map inspection.
- `cilium endpoint list` to verify identity labels match expected policies.

### Operations
- Upgrade Cilium using `helm upgrade` with `rollOutCiliumPods=true` for gradual rollout
- Test policy changes with `cilium connectivity test` before applying to production
- Monitor Cilium agent resource usage — enable auto-scaling for large clusters
- Enable etcd or CRD-backed KV store for Cluster Mesh reliability
- Set `bpf.lbBurstSize` proportionally to expected concurrent connections

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

### Anti-Pattern 6: Default Allow Egress
Not restricting pod egress traffic. Pods should only be allowed to talk to required services (API server, DNS, specific endpoints).

### Anti-Pattern 7: Hubble Disabled for Performance Reasons
Disabling Hubble thinking it adds overhead. Hubble's eBPF-based observability has negligible overhead (< 5% CPU) and provides invaluable debugging.

## Rules & Constraints
- Kernel >= 5.10 required for full eBPF features.
- Always deploy Hubble alongside Cilium.
- Enable kube-proxy replacement on new clusters.
- Use CiliumNetworkPolicy (not K8s NetworkPolicy) for L7 features.
- Enable encryption for multi-node clusters.
- Test connectivity with `cilium connectivity test` after install.
- Set policyEnforcementMode=always in production.
- Native routing requires proper podCIDR configuration on all nodes.
- Cilium agent log level: info in production, debug during troubleshooting only.

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
