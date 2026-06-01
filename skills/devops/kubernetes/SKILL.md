---
name: kubernetes
description: >
  Use this skill for Kubernetes cluster administration, architecture, operations,
  and production best practices. Covers: cluster architecture (control plane,
  etcd, worker nodes), networking (CNI, Service, Ingress, NetworkPolicies),
  storage (CSI, PVC, StorageClasses), security (RBAC, PodSecurity, secrets),
  scheduling (taints/tolerations, node affinity, topology spread), upgrades,
  backup/DR, and cluster autoscaling.
  Do NOT use for: application-level Kubernetes patterns (kubernetes-patterns),
  Helm chart design (helm-patterns), service mesh (service-mesh), or
  cloud-specific managed Kubernetes (aws/gcp/azure).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, kubernetes, cluster-admin, phase-5]
---

# Kubernetes Cluster Administration

## Purpose
Design, deploy, secure, and operate production-grade Kubernetes clusters covering architecture decisions, networking, storage, security, scheduling, upgrades, and disaster recovery.

## Agent Protocol

### Trigger
Exact user phrases: "Kubernetes", "K8s", "kubeadm", "cluster", "kubectl", "etcd", "kubelet", "kube-proxy", "CNI", "Container Network Interface", "CSI", "Container Storage Interface", "RBAC", "PodSecurity", "PodSecurityPolicy", "PSA", "taint", "toleration", "node affinity", "topology spread", "cluster upgrade", "kubeadm upgrade", "cluster backup", "etcd backup", "Velero", "node pool", "karpenter", "cluster autoscaler", "control plane", "kube-apiserver", "kube-scheduler", "kube-controller-manager", "coredns", "network policy".

### Input Context
- Cluster deployment method (kubeadm, kops, managed service, Talos)
- Kubernetes version (current + target for upgrades)
- Network plugin (Calico, Cilium, Flannel, Weave)
- Number of nodes + instance types
- Workload types (stateless, stateful, batch, GPU)
- Compliance requirements (PCI, HIPAA, SOC2, FedRAMP)
- Existing tooling (Helm, ArgoCD, Prometheus, cert-manager)

### Output Artifact
Cluster architecture document with control plane design, network topology, security model, upgrade plan, backup/DR strategy, and operational runbooks.

### Response Format
YAML manifests, shell commands, and architecture decisions with no extraneous explanation. No preamble. No postamble. No filler.

### Completion Criteria
- [ ] Cluster architecture defined (control plane HA, etcd topology, node types)
- [ ] CNI selected and configured (Calico, Cilium, or alternative)
- [ ] Security model defined (RBAC, Pod Security, Network Policies)
- [ ] Storage classes defined with CSI driver selection
- [ ] Upgrade strategy documented (version skew, node pool strategy)
- [ ] Backup/DR strategy defined (etcd backup, Velero, restore test)
- [ ] Monitoring and logging infrastructure specified
- [ ] Cluster autoscaling configured (Cluster Autoscaler or Karpenter)

## Architecture / Decision Trees

### Control Plane Deployment Options

| Method | Pros | Cons | Best For |
|--------|------|------|----------|
| **kubeadm** | Standard tooling, stackable control plane | Manual upgrades, no auto-scaling | Self-managed, on-prem, air-gapped |
| **kops** | AWS-native, state management via S3 | AWS-only, complex | AWS self-managed |
| **Talos** | Immutable OS, API-driven, low attack surface | Smaller community, newer project | Security-conscious, GitOps-native |
| **EKS / AKS / GKE** | Managed control plane, auto upgrades | Vendor lock-in, less control | Teams without K8s ops expertise |
| **OpenShift** | Enterprise features, built-in registry | Resource-heavy, licensing cost | Regulated enterprises |

### etcd Topology Decision Tree
```
Number of control plane nodes?
  1 node (dev/test) → Stacked etcd (simpler, less secure)
  3 nodes (prod) → Stacked etcd or External etcd
  5+ nodes (large prod) → External etcd (separate from control plane)

Workload criticality?
  Dev/test → Stacked etcd on single or 3 nodes
  Production → External etcd on dedicated nodes
  Regulated/PCI → External etcd with encryption at rest + HSM-backed TLS
```

### CNI Decision Tree
```
NetworkPolicy required?
  YES → Calico (policy-rich, mature) or Cilium (eBPF-based, modern)
  NO → Flannel (simplest overlay) or Weave (encrypted by default)

eBPF capabilities needed?
  YES → Cilium (L7 policies, Hubble observability, service mesh)
  NO → Calico (mature, wireguard encryption, BGP)

Performance critical?
  YES → Cilium (eBPF, direct routing, XDP acceleration)
  NO → Flannel (VXLAN overlay, simple)

Multi-cluster / multi-cloud?
  YES → Cilium ClusterMesh or Submariner
  NO → Calico (single-cluster is fine)
```

### Node Type Strategy
```
General purpose (80% of workloads)
  Instance: 4-8 vCPU, 16-32GB RAM
  Type: On-demand or Spot (with PDB and anti-affinity)

Compute-optimized (batch, CI/CD)
  Instance: 8-32 vCPU, high clock speed
  Type: Spot for cost savings

Memory-optimized (databases, caching)
  Instance: 8-64 vCPU, 64-256GB RAM
  Type: On-demand (stateful)

GPU (ML training, inference)
  Instance: NVIDIA A100, H100, L4
  Type: On-demand + nodepool taint

Storage-optimized (Kafka, Ceph)
  Instance: 8-32 vCPU, local NVMe SSDs
  Type: On-demand with dedicated disk
```

## Core Workflow

### Step 1: Cluster Bootstrap (kubeadm)

```bash
# Control plane node 1
cat <<EOF | sudo tee /etc/kubernetes/kubeadm-config.yaml
apiVersion: kubeadm.k8s.io/v1beta3
kind: InitConfiguration
localAPIEndpoint:
  advertiseAddress: "10.0.1.10"
  bindPort: 6443
---
apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
clusterName: production
kubernetesVersion: v1.30.2
controlPlaneEndpoint: "10.0.0.100:6443"
apiServer:
  extraArgs:
    authorization-mode: "Node,RBAC"
    audit-log-path: "/var/log/kubernetes/audit.log"
    audit-log-maxage: "30"
    audit-log-maxbackup: "10"
    feature-gates: "PodSecurity=true"
etcd:
  local:
    dataDir: /var/lib/etcd
    extraArgs:
      auto-compaction-retention: "8"
networking:
  podSubnet: "10.244.0.0/16"
  serviceSubnet: "10.96.0.0/12"
  dnsDomain: cluster.local
---
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
maxPods: 110
imageGCHighThresholdPercent: 85
imageGCLowThresholdPercent: 80
evictionHard:
  memory.available: "500Mi"
  nodefs.available: "10%"
  nodefs.inodesFree: "5%"
EOF

kubeadm init --config=kubeadm-config.yaml

# Join additional control plane nodes
kubeadm join 10.0.0.100:6443 --token <token> \
  --discovery-token-ca-cert-hash sha256:<hash> \
  --control-plane

# Join worker nodes
kubeadm join 10.0.0.100:6443 --token <token> \
  --discovery-token-ca-cert-hash sha256:<hash>
```

### Step 2: CNI Installation (Cilium)

```yaml
# cilium-values.yaml
cluster:
  name: production
  id: 1
ipam:
  mode: cluster-pool
  operator:
    clusterPoolIPv4PodCIDRList: ["10.244.0.0/16"]
    clusterPoolIPv4MaskSize: 24
k8s:
  requireIPv4PodCIDR: true
kubeProxyReplacement: true
securityContext:
  capabilities:
    ciliumAgent: ["CHOWN", "KILL", "NET_ADMIN", "NET_RAW", "IPC_LOCK", "SYS_ADMIN", "SYS_RESOURCE", "DAC_OVERRIDE", "FOWNER", "SETGID", "SETUID"]
    cleanCiliumState: ["NET_ADMIN", "SYS_ADMIN", "SYS_RESOURCE"]
cgroup:
  autoMount:
    enabled: false
  hostRoot: /sys/fs/cgroup
hubble:
  enabled: true
  relay:
    enabled: true
  ui:
    enabled: true
```

```bash
helm repo add cilium https://helm.cilium.io/
helm upgrade --install cilium cilium/cilium \
  --namespace kube-system \
  --values cilium-values.yaml \
  --version 1.15.0
```

### Step 3: Security Configuration

**RBAC Model**
```yaml
# Least-privilege ClusterRole example
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: namespace-admin
rules:
  - apiGroups: [""]
    resources: ["pods", "pods/log", "services", "configmaps", "secrets", "pvc"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["apps"]
    resources: ["deployments", "statefulsets", "daemonsets"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["networking.k8s.io"]
    resources: ["ingresses", "networkpolicies"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["autoscaling"]
    resources: ["horizontalpodautoscalers"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["rbac.authorization.k8s.io"]
    resources: ["roles", "rolebindings"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: [""]
    resources: ["namespaces"]
    verbs: ["get", "list"]
  - apiGroups: ["policy"]
    resources: ["poddisruptionbudgets"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
```

**Pod Security Standards (PSA)**
```yaml
# Namespace-level enforcement
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
---
# Exemption for system-critical namespaces
apiVersion: v1
kind: Namespace
metadata:
  name: kube-system
  labels:
    pod-security.kubernetes.io/enforce: privileged
    pod-security.kubernetes.io/audit: privileged
    pod-security.kubernetes.io/warn: privileged
```

### Step 4: Storage Classes

```yaml
# SSD-backed fast storage (for databases)
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: ebs.csi.aws.com  # Adjust per cloud/CSI
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
  encrypted: "true"
allowVolumeExpansion: true
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer

# HDD-backed archive storage
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: archive-hdd
provisioner: ebs.csi.aws.com
parameters:
  type: sc1
  encrypted: "true"
allowVolumeExpansion: true
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
```

### Step 5: Scheduling Configuration

```yaml
# Taint for GPU-only nodes
apiVersion: v1
kind: Node
metadata:
  name: gpu-node-1
  labels:
    accelerator: nvidia-a100
spec:
  taints:
    - effect: NoSchedule
      key: nvidia.com/gpu
      value: "true"

# GPU workload toleration
apiVersion: v1
kind: Pod
metadata:
  name: gpu-training
spec:
  tolerations:
    - key: nvidia.com/gpu
      operator: Equal
      value: "true"
      effect: NoSchedule
  nodeSelector:
    accelerator: nvidia-a100

# Topology spread for HA
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 6
  template:
    spec:
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: web-app
        - maxSkew: 1
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: ScheduleAnyway
          labelSelector:
            matchLabels:
              app: web-app
```

### Step 6: Cluster Upgrades

```bash
# Pre-upgrade checks
kubectl get nodes -o wide
kubectl version --short
kubectl get pods -A | grep -v Running | grep -v Completed

# Upgrade control plane (one node at a time)
apt-get update && apt-get install -y kubeadm=1.31.0-1.1
kubeadm upgrade plan
kubeadm upgrade apply v1.31.0
kubectl drain control-plane-1 --ignore-daemonsets
apt-get install -y kubelet=1.31.0-1.1 kubectl=1.31.0-1.1
systemctl daemon-reload && systemctl restart kubelet
kubectl uncordon control-plane-1

# Upgrade worker nodes
kubectl drain worker-pool-1 --ignore-daemonsets --delete-emptydir-data
apt-get install -y kubeadm=1.31.0-1.1 kubelet=1.31.0-1.1 kubectl=1.31.0-1.1
kubeadm upgrade node
systemctl daemon-reload && systemctl restart kubelet
kubectl uncordon worker-pool-1
```

### Step 7: Backup and Disaster Recovery

```yaml
# etcd snapshot cron
apiVersion: batch/v1
kind: CronJob
metadata:
  name: etcd-backup
  namespace: kube-system
spec:
  schedule: "*/30 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          nodeSelector:
            node-role.kubernetes.io/control-plane: ""
          tolerations:
            - key: node-role.kubernetes.io/control-plane
              operator: Exists
          containers:
            - name: etcdctl
              image: bitnami/etcd:3.5.12
              command:
                - /bin/sh
                - -c
                - |
                  ETCDCTL_API=3 etcdctl \
                    --endpoints=https://127.0.0.1:2379 \
                    --cacert=/etc/kubernetes/pki/etcd/ca.crt \
                    --cert=/etc/kubernetes/pki/etcd/server.crt \
                    --key=/etc/kubernetes/pki/etcd/server.key \
                    snapshot save /backup/etcd-snapshot-$(date +%Y%m%d-%H%M%S).db
                  aws s3 cp /backup/*.db s3://cluster-backups/etcd/
              volumeMounts:
                - name: backup
                  mountPath: /backup
                - name: pki
                  mountPath: /etc/kubernetes/pki
              resources:
                requests:
                  cpu: 100m
                  memory: 256Mi
          volumes:
            - name: backup
              hostPath:
                path: /var/backups/etcd
            - name: pki
              hostPath:
                path: /etc/kubernetes/pki
          restartPolicy: OnFailure
```

```yaml
# Velero backup configuration
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: daily-cluster-backup
  namespace: velero
spec:
  schedule: "0 2 * * *"
  template:
    includedNamespaces:
      - "*"
    excludedNamespaces:
      - kube-system
      - velero
    ttl: 720h  # 30 days
    storageLocation: default
    volumeSnapshotLocations:
      - default
```

### Step 8: Cluster Autoscaling

```yaml
# Cluster Autoscaler (AWS)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cluster-autoscaler
  template:
    metadata:
      labels:
        app: cluster-autoscaler
    spec:
      serviceAccountName: cluster-autoscaler
      containers:
        - image: registry.k8s.io/autoscaling/cluster-autoscaler:v1.30.0
          name: cluster-autoscaler
          command:
            - ./cluster-autoscaler
            - --cloud-provider=aws
            - --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled
            - --balance-similar-node-groups=true
            - --expander=least-waste
            - --max-node-provision-time=15m
            - --scale-down-delay-after-add=10m
            - --scale-down-delay-after-delete=10s
            - --scale-down-unneeded-time=10m
            - --skip-nodes-with-system-pods=false
            - --skip-nodes-with-local-storage=false
          resources:
            requests:
              cpu: 100m
              memory: 300Mi
---
# Karpenter provisioner (alternative)
apiVersion: karpenter.sh/v1beta1
kind: NodePool
metadata:
  name: default
spec:
  template:
    spec:
      requirements:
        - key: kubernetes.io/arch
          operator: In
          values: ["amd64"]
        - key: karpenter.sh/capacity-type
          operator: In
          values: ["on-demand", "spot"]
        - key: karpenter.k8s.aws/instance-category
          operator: In
          values: ["c", "m", "r"]
      nodeClassRef:
        name: default
  limits:
    cpu: 1000
    memory: 4000Gi
  disruption:
    consolidationPolicy: WhenUnderutilized
    expireAfter: 720h
```

## Production Considerations

### Cluster Sizing Guidelines
```
Control plane nodes: 3 for HA, 5 for large clusters (>500 nodes)
Worker nodes: scale based on workload, max 110 pods per node (default)
etcd: dedicate separate nodes for large clusters (>250 nodes)
CIDR sizing: /16 pod subnet = 65535 pods, /12 service subnet = 1M services
```

### Resource Reservations for System Daemons
```
kubelet reserved: 100m CPU + 100Mi per node for kubelet
system reserved: 500m CPU + 512Mi for kube-proxy, coredns, CNI
eviction threshold: 5% disk, 500Mi memory
```

### Key Metrics to Monitor
| Component | Metric | Alert Threshold |
|-----------|--------|-----------------|
| API server | request latency p99 | >1s for 5m |
| etcd | leader changes | >1 in 5m |
| etcd | disk fsync latency | >100ms p99 |
| etcd | db size | >3GB (auto-compact at 8h) |
| CoreDNS | latency | >100ms p99 |
| kubelet | node status | NotReady >5m |
| Scheduler | pending pods | >10 for 5m |

### Node Lifecycle
```
Taint:    mark node as unschedulable + repel pods
Cordon:   mark node as unschedulable (no new pods)
Drain:    evict pods gracefully (respects PDB)
Delete:   remove from cluster
Replace:  automated via Cluster Autoscaler / Karpenter

Procedure:
  1. kubectl cordon <node>
  2. kubectl drain <node> --ignore-daemonsets --delete-emptydir-data
  3. Perform maintenance
  4. kubectl uncordon <node> (or delete and let autoscaler replace)
```

## Security Hardening Checklist

- [ ] Control plane endpoint restricted to admin CIDR
- [ ] etcd encrypted at rest + TLS for peer/client communication
- [ ] Audit logging enabled with retention policy
- [ ] Pod Security Standards enforced (restricted baseline)
- [ ] Network Policies default-deny for all namespaces
- [ ] ServiceAccount token automount disabled for most workloads
- [ ] RBAC least-privilege — no cluster-admin for service accounts
- [ ] Container images from trusted registries with image policy webhook
- [ ] Seccomp and AppArmor profiles for security-sensitive workloads
- [ ] Node metadata protection (IMDS firewall)
- [ ] Kubernetes secrets encrypted at rest with KMS
- [ ] OIDC integration for user authentication
- [ ] Admission controllers: PodSecurity, NodeRestriction, AlwaysPullImages
- [ ] Runtime class for gVisor/Kata Containers on untrusted workloads

## Anti-Patterns

1. **Running without resource limits**: Pods can consume all node resources. Always set requests + limits.
2. **No PodDisruptionBudget for stateful workloads**: Maintenance can cause data loss. Always set PDB minAvailable.
3. **Ignoring etcd backups**: etcd is the source of truth for cluster state. Loss = cluster loss.
4. **Using default ServiceAccount**: Every pod gets the default SA with no explicit binding. Create per-namespace SA.
5. **Wide-open NetworkPolicies**: Default-allow means any pod can reach any pod. Default-deny then allow specific.
6. **Missing PodAntiAffinity for multi-replica deployments**: All replicas on one node = single point of failure.
7. **Skip version-skew upgrades**: Upgrade one minor version at a time. Never skip versions.
8. **Using hostNetwork without justification**: Bypasses CNI policies and security controls.
9. **No pod priority/preemption**: Critical system pods compete with batch workloads.
10. **Over-privileged RBAC**: `cluster-admin` for developers breaks the security model.

## Anti-Pattern Examples

```yaml
# BAD: No resources, probes, or security context
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bad-app
spec:
  template:
    spec:
      containers:
        - image: myapp:latest
          name: app

# GOOD: Resources, probes, security context
apiVersion: apps/v1
kind: Deployment
metadata:
  name: good-app
spec:
  template:
    spec:
      serviceAccountName: app-sa
      securityContext:
        runAsNonRoot: true
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: app
          image: myapp:v1.2.3
          resources:
            requests:
              cpu: 250m
              memory: 256Mi
            limits:
              cpu: 1
              memory: 512Mi
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL
```

## Tooling Ecosystem

| Tool | Purpose | Install |
|------|---------|---------|
| kubectl | Primary CLI | Package manager or binary |
| k9s | Terminal UI for cluster management | `brew install k9s` |
| kubectx/kubens | Switch context/namespace | `brew install kubectx` |
| kube-ps1 | Kubernetes prompt in shell | `brew install kube-ps1` |
| popeye | Cluster health scan | `brew install popeye` |
| kube-bench | CIS benchmark scanner | `kubectl apply -f job.yaml` |
| kube-hunter | Security penetration testing | `pip install kube-hunter` |
| sonobuoy | Conformance testing | `curl -L -o sonobuoy ...` |
| kubectl-neat | Clean K8s manifests | `kubectl krew install neat` |
| kubectl-tree | Resource hierarchy | `kubectl krew install tree` |
| kubectl-snapshot | Resource snapshots | `kubectl krew install snapshot` |
| starboard | Vulnerability scanner | `kubectl krew install starboard` |

## Compared With

| Aspect | Self-Managed (kubeadm) | Managed (EKS/AKS/GKE) | Talos |
|--------|----------------------|----------------------|-------|
| Control plane mgmt | Full responsibility | Cloud provider managed | API-driven immutable |
| Upgrade effort | Manual, version by version | Automated via cloud console | `talosctl upgrade` |
| Security baseline | Your config | Provider defaults + CIS | Immutable OS, minimal |
| etcd management | Manual backup/restore | Provider managed | Automatic snapshots |
| Add-on management | Manual (Helm/kubectl) | Sometimes managed | Declarative config |
| Control plane cost | Server costs only | ~$0.10-0.30/hr per cluster | Server costs only |
| Learning curve | High | Medium | Medium-High |

## References
- references/ingress-controllers.md — Ingress Controller Selection and Config
- references/namespace-management.md — Namespace Strategy and Resource Quotas
- references/pod-lifecycle.md — Pod Lifecycle, Init Containers, and Ephemeral Containers
- references/kubernetes-api-resources.md — API Resource Guide
- references/kubernetes-security.md — Kubernetes Security Hardening
- references/kubernetes-upgrades.md — Cluster Upgrade Procedures
- references/kubernetes-backup-dr.md — etcd Backup and Disaster Recovery
- references/kubernetes-monitoring.md — Cluster Monitoring and Alerting
- references/kubernetes-troubleshooting.md — Cluster Troubleshooting Guide

## Handoff
Cross-reference with `kubernetes-patterns` for application manifests. Use `helm-patterns` for chart design. Use `cilium-ebpf` for advanced networking. Use `service-mesh` for Istio/Linkerd. Use `monitoring` for Prometheus/Grafana. Use `backup-dr` for Velero. Hand off to `incident-response` for cluster incidents.
