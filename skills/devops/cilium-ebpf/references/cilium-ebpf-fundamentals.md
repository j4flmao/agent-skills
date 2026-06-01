# Cilium and eBPF Fundamentals

## Overview
Cilium is a networking, observability, and security solution for Kubernetes based on eBPF (extended Berkeley Packet Filter). eBPF allows sandboxed programs to run in the Linux kernel without modifying kernel source or loading kernel modules.

## Core Concepts

### eBPF Architecture
eBPF programs are verified bytecode executed in kernel space. Programs attach to hook points (system calls, network events, tracepoints). BPF maps share data between kernel and user space. The eBPF verifier ensures safety (no loops, bounded execution, valid memory access).

### Cilium Architecture
Cilium Agent runs on each node, manages eBPF programs. Cilium Operator manages cluster-wide tasks. Cilium CNI plugin handles pod networking. Hubble provides observability. Cilium replaces kube-proxy for service load balancing.

### eBPF vs Traditional Approaches
iptables: linear rule traversal, poor performance at scale, connection tracking per rule. eBPF: programmable kernel, sub-millisecond decisions, linear scaling with packet rate. Sidecar proxies (Envoy): additional resource consumption, added latency. eBPF: no sidecar needed, direct kernel-level enforcement.

## Key Features

### Networking
CNI-compliant pod networking with native routing or overlay (VXLAN, Geneve). Cluster mesh: connect multiple Kubernetes clusters across regions. Service load balancing: efficient L3/L4 load balancing replacing kube-proxy. Bandwidth management: EDT-based bandwidth limiting.

### Network Policy
Kubernetes NetworkPolicy-compatible with enhanced features. Identity-based security (labels, not IPs). L7 policies: HTTP, gRPC, Kafka, DNS-aware. FQDN-based policies: control egress to external services. Cluster-wide policies independent of namespace.

### Observability
Hubble: distributed networking and security observability. Flow logs: record every network flow with metadata. Service map: visualize dependencies between services. Metrics: Prometheus metrics for network and policy events.

## Basic Configuration

### Cilium Network Policy
```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-api
spec:
  endpointSelector:
    matchLabels:
      app: api
  ingress:
    - fromEndpoints:
        - matchLabels:
            app: frontend
      toPorts:
        - ports:
            - port: "8080"
              protocol: TCP
  egress:
    - toEndpoints:
        - matchLabels:
            app: database
      toPorts:
        - ports:
            - port: "5432"
              protocol: TCP
    - toFQDNs:
        - matchName: "api.example.com"
```

## Best Practices
- Use identity-based policies instead of IP-based for dynamic environments.
- Enable Hubble for network flow visibility.
- Replace kube-proxy with Cilium for better performance.
- Use cluster mesh for multi-cluster connectivity.
- Monitor eBPF program complexity to avoid verifier issues.
- Keep Cilium version up to date for security patches.
- Test policies with Cilium policy verdict metrics.

## References
- cilium-ebpf-advanced.md -- Advanced Cilium and eBPF topics
- e-bpf-basics.md -- eBPF Basics
- cilium-networking.md -- Cilium Networking
- cilium-security-policies.md -- Cilium Security Policies
- hubble-observability.md -- Hubble Observability
