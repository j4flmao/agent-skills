# Cilium ClusterMesh

## Overview

Cilium ClusterMesh enables multi-cluster networking, service discovery, and security across Kubernetes clusters. It provides pod-to-pod connectivity across clusters without a VPN or overlay network, using native routing and eBPF.

## Architecture

```
                    ┌─────────────────┐       ┌─────────────────┐
                    │  Cluster A      │       │  Cluster B      │
                    │  us-east-1      │       │  eu-west-1      │
                    │                 │       │                 │
                    │ ┌─────────────┐ │       │ ┌─────────────┐ │
                    │ │ Cilium Agent│ │       │ │ Cilium Agent│ │
                    │ └─────────────┘ │       │ └─────────────┘ │
                    │        │        │       │        │        │
                    │ ┌─────────────┐ │       │ ┌─────────────┐ │
                    │ │ KV Store    │◄┼───────┼►│ KV Store    │ │
                    │ │ (etcd/CRD)  │ │       │ │ (etcd/CRD)  │ │
                    │ └─────────────┘ │       │ └─────────────┘ │
                    │                 │       │                 │
                    │ Pod A           │       │ Pod B           │
                    │ 10.0.1.5       │◄──────►│ 10.0.2.7       │
                    │                 │ Direct│                 │
                    │ Service:        │ eBPF  │ Service:        │
                    │ global/foo      │ tunnel│ global/foo      │
                    └─────────────────┘       └─────────────────┘
```

## Configuration

### Prerequisites
```yaml
# Requirements:
# 1. Non-overlapping pod CIDRs across clusters
# 2. Direct network connectivity between nodes (or VPN/Gateway)
# 3. Shared KV store (etcd) or Kubernetes CRD-based synchronization
# 4. Cilium 1.14+ on all clusters
```

### ClusterMesh Setup

#### Step 1: Enable on Each Cluster
```bash
# Cluster 1
helm upgrade --install cilium cilium/cilium \
  --namespace kube-system \
  --set cluster.name=cluster-1 \
  --set cluster.id=1 \
  --set clustermesh.enabled=true \
  --set clustermesh.apiserver.kvstoremesh.enabled=true

# Cluster 2
helm upgrade --install cilium cilium/cilium \
  --namespace kube-system \
  --set cluster.name=cluster-2 \
  --set cluster.id=2 \
  --set clustermesh.enabled=true \
  --set clustermesh.apiserver.kvstoremesh.enabled=true
```

#### Step 2: Install ClusterMesh API Server
```bash
# Install ClusterMesh API server on each cluster
cilium clustermesh install --context cluster-1
cilium clustermesh install --context cluster-2
```

#### Step 3: Connect Clusters
```bash
# From cluster-1, connect to cluster-2
cilium clustermesh connect --context cluster-1 --destination-context cluster-2

# Verify
cilium clustermesh status --context cluster-1
```

### CRD-Based ClusterMesh (No External etcd)
```yaml
# Newer Cilium versions support CRD-based cluster mesh without external etcd
clustermesh:
  enabled: true
  useAPIServer: true
  config:
    enabled: true
    domain: mesh.cluster.local
  apiserver:
    kvstoremesh:
      enabled: true
    tls:
      authMode: cluster
```

## Service Mirroring

### Global Service
```yaml
apiVersion: v1
kind: Service
metadata:
  name: global-service
  annotations:
    io.cilium/global-service: "true"
spec:
  type: ClusterIP
  selector:
    app: my-app
  ports:
  - port: 80
    targetPort: 8080
```

### Global Service with Shared Workloads
```yaml
apiVersion: v1
kind: Service
metadata:
  name: global-api
  annotations:
    io.cilium/global-service: "true"
spec:
  type: ClusterIP
  selector:
    app: api-server
---
# Workloads in ANY cluster matching the selector are load-balanced
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
```

## Cross-Cluster Communication

### Direct Pod-to-Pod
```
# Pod in cluster-1 can reach pod in cluster-2 by IP
cilium-dbg-abc → 10.0.2.7:8080

# Cilium eBPF handles routing if nodes are directly connected
# Falls back to encapsulation (VXLAN/Geneve) if not directly connected
```

### Service Discovery
```yaml
# Services in other cluster are accessible as:
# <service>.<namespace>.svc.clusterset.local
#
# Example: Pod in cluster-1 accesses:
#   global-service.default.svc.clusterset.local

# Or simply <service-name> if same namespace
#   global-service
```

### DNS Resolution
```yaml
# Cilium provides DNS-based service discovery across clusters
# Requires cilium-dns-deployment for cluster-aware DNS

apiVersion: v1
kind: Service
metadata:
  name: cilium-dns
  annotations:
    io.cilium/global-service: "true"
spec:
  type: ClusterIP
  ports:
  - port: 53
```

## mTLS Across Clusters

### Mutual Authentication
```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: cross-cluster-mtls
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
      mutual:
        enabled: true
```

## Load Balancing Across Clusters

### Topology-Aware Routing
```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: topology-aware
spec:
  endpointSelector:
    matchLabels:
      app: api-server
  ingress:
  - fromEndpoints:
    - matchLabels:
        app: frontend
  # Default: prefer local cluster endpoints, spread to remote if needed
---
apiVersion: v1
kind: Service
metadata:
  name: global-api
  annotations:
    io.cilium/global-service: "true"
    service.cilium.io/global-service-mode: "cluster"  # Prefer local
    # Or: "global" for equal distribution
```

### Service Affinity
```yaml
# Session affinity across clusters
apiVersion: v1
kind: Service
spec:
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 10800
```

## Monitoring ClusterMesh

```bash
# Check ClusterMesh status
cilium clustermesh status

# View remote cluster identities
kubectl get ciliumidentity --all-namespaces | grep remote

# Check mesh connections
cilium-dbg status --cluster

# View cross-cluster flows
hubble observe --type trace --from-cluster cluster-2

# ClusterMesh metrics
cilium-dbg metrics | grep clustermesh
```

### Key Metrics
```
# ClusterMesh health
cilium_clustermesh_remote_clusters
cilium_clustermesh_remote_identities
cilium_clustermesh_kvstore_sync_duration_seconds

# Cross-cluster connectivity
cilium_clustermesh_cross_cluster_connections
cilium_clustermesh_failover_total
```

## Troubleshooting

```bash
# Check ClusterMesh API server
kubectl -n kube-system get pods -l k8s-app=clustermesh-apiserver

# Check TLS certs
cilium clustermesh status --verbose

# Verify connectivity
kubectl exec -n kube-system ds/cilium -- cilium-dbg status --cluster

# Check firewall rules
# Must allow:
# - PodCIDR-to-PodCIDR between clusters
# - TCP 2379 (etcd) or 2379 (KVStoreMesh)
# - TCP 443 (ClusterMesh API server webhook)
```

## Best Practices

1. **Use non-overlapping pod CIDRs** across all clusters in the mesh.
2. **Ensure direct network connectivity** between cluster nodes (VPC peering, VPN, or Transit Gateway).
3. **Use CRD-based ClusterMesh** for simpler setup without external etcd.
4. **Annotate global services** with `io.cilium/global-service: "true"`.
5. **Use `service.cilium.io/global-service-mode: cluster`** to prefer local endpoints.
6. **Monitor cross-cluster latency** — remote calls should be the exception, not the norm.
7. **Configure DNS per cluster** for service discovery across clusters.
8. **Set resource limits** on ClusterMesh API server for predictable performance.
9. **Enable mTLS** for cross-cluster service-to-service authentication.
10. **Test failover** scenarios by simulating a cluster outage.
