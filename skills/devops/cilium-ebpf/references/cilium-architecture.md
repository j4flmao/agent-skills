# Cilium Architecture

## Overview

Cilium is an eBPF-based CNI plugin for Kubernetes that provides networking, security, and observability. Its architecture leverages eBPF programs attached to network hooks to implement data path operations without kernel module dependencies.

## Architecture Diagram

```
                    ┌─────────────────────────┐
                    │    Kubernetes API       │
                    └───────────┬─────────────┘
                                │
                    ┌───────────▼─────────────┐
                    │     Cilium Operator     │
                    │                         │
                    │ - Identity allocation   │
                    │ - Endpoint management   │
                    │ - Policy derivation     │
                    └─────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
   ┌────▼────┐           ┌──────▼──────┐          ┌─────▼────┐
   │ Cilium  │           │ Cilium      │          │ Cilium   │
   │ Agent   │           │ Agent       │          │ Agent    │
   │ (Node1) │           │ (Node2)     │          │ (Node3)  │
   │         │           │             │          │          │
   │ eBPF    │           │ eBPF        │          │ eBPF     │
   │ TC/XDP  │           │ TC/XDP      │          │ TC/XDP   │
   │ → veth  │           │ → veth      │          │ → veth   │
   └────┬────┘           └──────┬──────┘          └─────┬────┘
        │                      │                        │
        │         ┌────────────┼────────────┐           │
        │         │            │            │           │
   ┌────▼────┐    │    ┌──────▼──────┐     │     ┌─────▼────┐
   │ Pod4    │    │    │ Pod2        │     │     │ Pod3     │
   │         │    │    │             │     │     │          │
   │ Identity│    │    │ Identity    │     │     │ Identity │
   │ ID:1001 │    │    │ ID:1002     │     │     │ ID:1001  │
   └─────────┘    │    └─────────────┘     │     └──────────┘
                  │                        │
             ┌────▼────┐              ┌────▼────┐
             │ Pod1    │              │ Pod5    │
             │         │              │         │
             │ Identity│              │ Identity│
             │ ID:1003 │              │ ID:1004 │
             └─────────┘              └─────────┘
```

## eBPF Data Path

Cilium's data path uses eBPF programs at multiple hook points:

```
Packet In → XDP (early drop/forward)
   │
   ↓
TC Ingress (BPF_PROG_TYPE_SCHED_CLS)
   │
   ├── Policy enforcement (identity-based)
   ├── Load balancing (kube-proxy replacement)
   ├── Encryption (WireGuard/IPsec)
   └── Observability (Hubble metrics)
   │
   ↓
Kernel Network Stack (if needed)
   │
   ↓
TC Egress (BPF_PROG_TYPE_SCHED_CLS)
   │
   ├── Policy enforcement
   ├── Load balancing decisions
   └── Hubble flow monitoring
   │
   ↓
Packet Out → XDP (or NIC)
```

## Identity-Based Security

### Identity Architecture
```
Pod Labels → Cilium derives security identity → Identity stored in BPF map →
eBPF program checks identity on each packet → Policy decision (allow/deny)
```

### Identity Allocation
```bash
# View identities
kubectl get ciliumidentity

# Example identities
NAME             NAMESPACE   AGE
k8s:app=api      default     5h
k8s:app=web      default     5h
k8s:app=worker   default     5h
```

### Identity in BPF Maps
```
cilium_ct4_global    # Connection tracking table
cilium_lb4_services  # Load balancer services
cilium_ipcache       # IP-to-Identity mapping
cilium_policy        # Policy enforcement map
```

## CNI Plugin

### CNI Chain Configuration
```json
{
  "name": "cilium-cni",
  "type": "cilium-cni",
  "chaining-mode": "generic-veth",
  "datapath-mode": "veth"
}
```

### Pod Networking Flow
```
1. Kubelet requests CNI plugin for pod
2. Cilium CNI creates veth pair
3. Cilium allocates IP and identity
4. eBPF programs attach to veth
5. Pod becomes reachable via Cilium
```

### IP Address Management (IPAM)
```yaml
# ClusterPool IPAM (default)
ipam:
  mode: cluster-pool
  operator:
    clusterPoolIPv4PodCIDRList:
    - 10.0.0.0/16
    clusterPoolIPv4MaskSize: 24

# Kubernetes CRD-based IPAM
ipam:
  mode: kubernetes

# AWS ENI IPAM
ipam:
  mode: eni
  eni:
    aws-release-excess-ips: true
```

## Kube-Proxy Replacement

### What It Replaces
| kube-proxy Feature | Cilium Replacement |
|-------------------|--------------------|
| Service ClusterIP | eBPF service LB (Maglev/random) |
| NodePort | eBPF NodePort (DSR or SNAT) |
| ExternalTrafficPolicy | eBPF direct routing |
| SessionAffinity | eBPF affinity tracking |

### Configuration
```yaml
kubeProxyReplacement: true
k8sServiceHost: <api-server-ip>
k8sServicePort: 6443

# Service implementation
loadBalancer:
  algorithm: maglev  # Maglev consistent hashing
  mode: dsr          # Direct Server Return (DSR)

# NodePort options
nodePort:
  enabled: true
  autoProtect: true
  mode: dsr          # Or: snat, hybrid
```

### Verification
```bash
# Check if kube-proxy is replaced
cilium status | grep "KubeProxyReplacement"
# Output: KubeProxyReplacement: Strict

# Disable kube-proxy after Cilium is running
kubectl -n kube-system delete daemonset kube-proxy
```

## Cilium Agent Components

### Agent Responsibilities
```
- Endpoint management (pod lifecycle)
- Policy computation and enforcement
- eBPF program compilation and loading
- Service load balancing
- Hubble flow monitoring
- Node discovery and health checking
```

### Key Agent Flags
```yaml
# Cilium agent configuration
agent:
  endpoints: true
  monitor-aggregation: medium
  monitor-aggregation-interval: 5s
  pprof: false
  prometheus:
    enabled: true
    serviceMonitor:
      enabled: true
```

## Helm Installation Options

```bash
# Full Cilium with all features
helm upgrade --install cilium cilium/cilium \
  --namespace kube-system \
  --set kubeProxyReplacement=true \
  --set socketLB.enabled=true \
  --set nodePort.enabled=true \
  --set externalIPs.enabled=true \
  --set hostPort.enabled=true \
  --set bpf.masquerade=true \
  --set ipam.mode=cluster-pool \
  --set ipam.operator.clusterPoolIPv4PodCIDRList=["10.0.0.0/16"] \
  --set ipam.operator.clusterPoolIPv4MaskSize=24 \
  --set hubble.enabled=true \
  --set hubble.relay.enabled=true \
  --set hubble.ui.enabled=true \
  --set hubble.metrics.enabled="{dns,drop,tcp,flow,port-distribution}" \
  --set l2announcements.enabled=true \
  --set bandwidthManager.enabled=true \
  --set bandwidthManager.bbr=true
```

## Best Practices

1. **Enable kube-proxy replacement** for full eBPF benefits and scalability.
2. **Use Maglev load balancing** for consistent hashing across backends.
3. **Enable DSR mode** for direct server return to reduce latency.
4. **Set IPAM appropriately** — ClusterPool for general use, ENI for AWS.
5. **Enable Hubble** for observability from day one.
6. **Monitor `cilium_status`** for agent health and BPF map usage.
7. **Set `bpf.masquerade=true`** to avoid iptables masquerading.
8. **Use CiliumEndpoint** for pod-level network visibility.
9. **Enable bandwidth management** (`bandwidthManager.enabled=true`) for BBR.
10. **Run `cilium connectivity test`** after installation to validate.
