# Cilium and eBPF Advanced Topics

## Introduction
Advanced Cilium and eBPF covers custom eBPF program development, Cilium Service Mesh, cluster mesh, network performance optimization, and kernel-level security.

## Custom eBPF Program Development
Write eBPF programs in C, compile with clang to BPF bytecode. Use BPF CO-RE (Compile Once - Run Everywhere) for kernel compatibility. BCC (BPF Compiler Collection) for Python-based eBPF tools. bpftrace for one-liner eBPF tracing. Common hook points: XDP (fastest, earliest), TC (traffic control), kprobes/kretprobes, tracepoints, perf events.

## Cilium Service Mesh
Replace Envoy sidecar with eBPF-based L7 proxy. Envoy as L7 proxy with eBPF-powered routing. Mutual TLS with SPIFFE identities. HTTP/gRPC metrics, tracing, and retries. Ingress and Gateway API support. No sidecar required for service mesh features.

## Cluster Mesh
Connect multiple Kubernetes clusters across regions. Service discovery across clusters. Global services for multi-cluster load balancing. Network policies across cluster boundaries. mTLS across cluster mesh. Use cases: multi-region HA, DR, workload isolation.

## Network Performance Optimization
XDP-based packet processing for DDoS mitigation (millions of packets/second per core). TC BPF for traffic shaping and forwarding. Maglev consistent hashing for service load balancing. eBPF-native kube-proxy replacement for better performance. Bandwidth management with EDT (Earliest Departure Time).

## eBPF for Security
Falco: runtime security monitoring with eBPF. Tetragon: Cilium-based security observability and runtime enforcement. Process-level monitoring with eBPF. File integrity monitoring. Network flow logging with full metadata.

## References
- cilium-ebpf-fundamentals.md -- Fundamentals
- e-bpf-basics.md -- eBPF Basics
- cilium-networking.md -- Cilium Networking
- cilium-security-policies.md -- Security Policies
- hubble-observability.md -- Hubble Observability
