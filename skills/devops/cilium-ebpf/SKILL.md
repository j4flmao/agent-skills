---
name: devops-cilium-ebpf
description: >
  Cilium and eBPF for cloud-native networking, security, and observability.
  Covers: Cilium architecture (eBPF data path, identity-based security, CNI plugin,
  kube-proxy replacement, Hubble), NetworkPolicy (L3/L4/L7, HTTP/gRPC/Kafka/DNS-aware),
  ClusterMesh (multi-cluster networking, service mirroring, mTLS), Hubble observability
  (service map, flow logs, metrics, CLI, UI), eBPF internals (BPF program types, maps,
  kprobes, tracepoints, XDP, TC, CO-RE, BTF).
  Do NOT use for: Traditional iptables-based networking, non-Cilium CNI setups.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, cilium, ebpf, networking, kubernetes, security, phase-5]
---

# Cilium & eBPF

## Purpose
Design, deploy, and manage Cilium-based Kubernetes networking with eBPF for high-performance networking, identity-aware security policies, multi-cluster connectivity, and deep observability.

## Agent Protocol

### Trigger
Exact user phrases: "Cilium", "eBPF", "Hubble", "Cilium NetworkPolicy", "Cilium ClusterMesh", "service mesh", "kube-proxy replacement", "BPF", "XDP", "TC hook", "CO-RE", "BTF", "Cilium CNI", "Cilium L7 policy".

### Input Context
Before activating, verify:
- Kubernetes version and cluster size.
- Current CNI plugin (Calico, Flannel, Weave, etc.) and migration plan.
- Cilium version to deploy (minimum 1.14+).
- Network policy requirements (L3/L4, L7, API-aware).
- Multi-cluster connectivity needs.

### Output Artifact
Writes to YAML manifests for Cilium installation, CiliumNetworkPolicy, CiliumClusterwideNetworkPolicy, ClusterMesh configuration, and Hubble configuration.

### Response Format
YAML manifests with Cilium API versions, ready for `kubectl apply` or Helm values.

### Completion Criteria
This skill is complete when:
- [ ] Cilium installed and all agents running.
- [ ] kube-proxy replaced by Cilium.
- [ ] Network policies defined for critical services.
- [ ] Hubble enabled and flow data visible.
- [ ] ClusterMesh configured (if multi-cluster).

### Max Response Length
Direct file write. No response text.

## Quick Start
Install Cilium via Helm with kube-proxy replacement → Verify `cilium status` → Deploy CiliumNetworkPolicy for L3/L4 → Add L7 HTTP-aware policy → Enable Hubble → Explore service map → Configure ClusterMesh for multi-cluster.

## When to Use This Skill
- Replacing kube-proxy for better performance and scalability
- Implementing identity-based, API-aware network policies
- Multi-cluster networking with service discovery
- Deep network observability with Hubble
- High-performance packet processing with eBPF

## Core Workflow

### Step 1: Install Cilium
```bash
helm repo add cilium https://helm.cilium.io
helm upgrade --install cilium cilium/cilium \
  --namespace kube-system \
  --set kubeProxyReplacement=true \
  --set hubble.enabled=true \
  --set hubble.relay.enabled=true \
  --set hubble.ui.enabled=true
```

### Step 2: Verify Installation
```bash
cilium status --wait
cilium connectivity test
```

### Step 3: Network Policy
```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: api-policy
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

## Rules & Constraints
- Cilium requires Linux kernel 5.10+ for full eBPF functionality.
- kube-proxy replacement requires `bpffs` mount in init containers.
- L7 policies require Cilium agent proxy (Envoy) to be enabled.
- ClusterMesh requires at least one shared service across clusters.
- Hubble relay requires sufficient memory for flow storage.

## References
- `references/cilium-architecture.md` — eBPF data path, identity, CNI, kube-proxy
- `references/network-policies.md` — L3/L4/L7 policies, HTTP/gRPC/Kafka/DNS
- `references/cluster-mesh.md` — Multi-cluster networking, service mirroring
- `references/observability-hubble.md` — Service map, flows, metrics, CLI, UI
- `references/ebpf-deep-dive.md` — BPF programs, maps, kprobes, XDP, CO-RE

## Handoff
After completing this skill:
- Next skill: **devops-opentelemetry** — Integrate Hubble metrics with OTel Collector
- Pass context: Cilium version, Hubble flow config, ClusterMesh clusters, policy names
