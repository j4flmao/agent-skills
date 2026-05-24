# Kubernetes on Hetzner

## K3s

### Quick Install

```bash
# Single-node K3s server (with embedded etcd)
curl -sfL https://get.k3s.io | \
  K3S_TOKEN=mysecret sh -s - server \
  --cluster-init \
  --node-taint "node-role.kubernetes.io/control-plane:NoSchedule" \
  --kubelet-arg "cloud-provider=external"

# Additional server nodes (HA)
curl -sfL https://get.k3s.io | \
  K3S_TOKEN=mysecret sh -s - server \
  --server https://10.0.1.10:6443 \
  --kubelet-arg "cloud-provider=external"

# Agent nodes
curl -sfL https://get.k3s.io | \
  K3S_TOKEN=mysecret sh -s - agent \
  --server https://10.0.1.10:6443 \
  --kubelet-arg "cloud-provider=external"

# Get kubeconfig
sudo cat /etc/rancher/k3s/k3s.yaml

# Install via Ansible
# ansible-playbook -i inventory.ini ansible-k3s/site.yml
```

### K3s with Hetzner Cloud Provider

```yaml
# /etc/rancher/k3s/config.yaml
token: "mysecret"
cluster-init: true
node-taint:
  - "node-role.kubernetes.io/control-plane:NoSchedule"
kubelet-arg:
  - "cloud-provider=external"
kube-controller-manager-arg:
  - "cloud-provider=external"
kube-proxy-arg:
  - "proxy-mode=iptables"
flannel-backend: "none"  # Use Cilium instead
disable:
  - traefik
  - servicelb
---
# Hetzner Cloud Controller Manager (CCM) installation
# kubectl apply -f https://github.com/hetznercloud/hcloud-cloud-controller-manager/releases/latest/download/ccm-networks.yaml
---
# Hetzner CSI Driver installation
# kubectl apply -f https://raw.githubusercontent.com/hetznercloud/csi-driver/master/deploy/kubernetes/hcloud-csi.yml
```

## Terraform Deployment

```hcl
# Deploy K3s on Hetzner Cloud with Terraform
resource "hcloud_server" "control" {
  count       = 3
  name        = "k3s-control-${count.index}"
  server_type = "cx52"
  image       = "ubuntu-24.04"
  location    = "nbg1"

  network {
    network_id = hcloud_network.main.id
    ip         = "10.0.1.${count.index + 10}"
  }

  placement_group_id = hcloud_placement_group.k3s.id

  user_data = templatefile("${path.module}/templates/k3s-control.yaml", {
    k3s_token    = var.k3s_token
    server_ip    = "10.0.1.10"
    k3s_version  = var.k3s_version
  })
}

resource "hcloud_server" "worker" {
  count       = 3
  name        = "k3s-worker-${count.index}"
  server_type = "cx52"
  image       = "ubuntu-24.04"
  location    = "nbg1"

  network {
    network_id = hcloud_network.main.id
    ip         = "10.0.2.${count.index + 10}"
  }

  placement_group_id = hcloud_placement_group.k3s.id

  user_data = templatefile("${path.module}/templates/k3s-worker.yaml", {
    k3s_token   = var.k3s_token
    server_url  = "https://10.0.1.10:6443"
    k3s_version = var.k3s_version
  })
}
```

## Rancher

```bash
# Install Rancher on K3s cluster
# Requires cert-manager and a valid domain

# 1. Install cert-manager
kubectl create namespace cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/latest/download/cert-manager.yaml

# 2. Install Rancher
helm repo add rancher-latest https://releases.rancher.com/server-charts/latest
helm repo update

kubectl create namespace cattle-system

helm install rancher rancher-latest/rancher \
  --namespace cattle-system \
  --set hostname=rancher.example.com \
  --set bootstrapPassword=admin \
  --set replicas=3 \
  --set ingress.tls.source=letsEncrypt \
  --set letsEncrypt.email=admin@example.com \
  --set letsEncrypt.ingressClass=nginx

# 3. Access Rancher UI
# https://rancher.example.com

# 4. Import existing K3s clusters or create new ones
```

## Cluster Autoscaling with cluster-api

```bash
# Cluster API Provider Hetzner (CAPH)
# Automates lifecycle management of K3s clusters on Hetzner

# Pre-requisites:
# - Cluster API management cluster (e.g., existing K3s or Kind cluster)
# - Hetzner Cloud API token
# - SSH key pair

# Initialize CAPH
clusterctl init --infrastructure hetzner

# Create cluster manifest
cat > my-cluster.yaml << 'EOF'
apiVersion: cluster.x-k8s.io/v1beta1
kind: Cluster
metadata:
  name: my-cluster
  namespace: default
spec:
  clusterNetwork:
    pods:
      cidrBlocks: ["10.244.0.0/16"]
    services:
      cidrBlocks: ["10.96.0.0/12"]
  infrastructureRef:
    apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
    kind: HCloudCluster
    name: my-cluster
  controlPlaneRef:
    apiVersion: controlplane.cluster.x-k8s.io/v1beta1
    kind: KubeadmControlPlane
    name: my-cluster-control-plane
---
apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
kind: HCloudCluster
metadata:
  name: my-cluster
  namespace: default
spec:
  location: nbg1
  network:
    name: cluster-net
    cidrBlock: 10.0.0.0/16
    region: eu-central
---
apiVersion: controlplane.cluster.x-k8s.io/v1beta1
kind: KubeadmControlPlane
metadata:
  name: my-cluster-control-plane
  namespace: default
spec:
  replicas: 3
  machineTemplate:
    infrastructureRef:
      apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
      kind: HCloudMachine
      name: my-cluster-control-plane
  kubeadmConfigSpec:
    initConfiguration:
      nodeRegistration:
        name: '{{ ds.meta_data.hostname }}'
    joinConfiguration:
      nodeRegistration:
        name: '{{ ds.meta_data.hostname }}'
---
apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
kind: HCloudMachine
metadata:
  name: my-cluster-control-plane
  namespace: default
spec:
  placementGroupName: cp-group
  imageName: ubuntu-24.04
  serverType: cx52
---
apiVersion: cluster.x-k8s.io/v1beta1
kind: MachineDeployment
metadata:
  name: my-cluster-workers
  namespace: default
spec:
  clusterName: my-cluster
  replicas: 3
  template:
    spec:
      clusterName: my-cluster
      version: v1.30.5
      bootstrap:
        configRef:
          apiVersion: bootstrap.cluster.x-k8s.io/v1beta1
          kind: KubeadmConfigTemplate
          name: my-cluster-workers
      infrastructureRef:
        apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
        kind: HCloudMachineTemplate
        name: my-cluster-workers
EOF

# Apply cluster manifest
kubectl apply -f my-cluster.yaml

# Get kubeconfig for workload cluster
clusterctl get kubeconfig my-cluster > my-cluster.kubeconfig
```

## Hetzner CSI Driver

```yaml
# CSI driver creates Hetzner Cloud Volumes as PersistentVolumes
# Storage Class
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: hcloud-volumes
provisioner: csi.hetzner.cloud
reclaimPolicy: Delete
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
---
# PVC example using hcloud-volumes
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
  storageClassName: hcloud-volumes
---
# Pod consuming the PVC
apiVersion: v1
kind: Pod
metadata:
  name: postgres
spec:
  containers:
  - name: postgres
    image: postgres:16-alpine
    ports:
    - containerPort: 5432
    env:
    - name: POSTGRES_PASSWORD
      valueFrom:
        secretKeyRef:
          name: pg-secret
          key: password
    volumeMounts:
    - name: data
      mountPath: /var/lib/postgresql/data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: postgres-data
```

## Load Balancer Integration

```yaml
# Hetzner Load Balancers can be used as Kubernetes Services
# Using klippy-lb (K3s built-in) or MetalLB + Hetzner LB

# Option 1: Klippy Load Balancer (K3s built-in, for ServicelB)
# Default with K3s, creates an LB for each LoadBalancer Service
---
apiVersion: v1
kind: Service
metadata:
  name: nginx
  annotations:
    # Auto-assign Hetzner Load Balancer
    servicelb.hetzner.cloud/location: nbg1
    servicelb.hetzner.cloud/type: lb11
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 80
  selector:
    app: nginx
---
# Option 2: Hetzner Cloud Controller Manager LoadBalancer
# Uses hcloud-cloud-controller-manager
# Supports dedicated Load Balancer resources
---
apiVersion: v1
kind: Service
metadata:
  name: api
  annotations:
    # CCM-based Load Balancer
    load-balancer.hetzner.cloud/location: nbg1
    load-balancer.hetzner.cloud/type: lb11
    load-balancer.hetzner.cloud/use-private-ip: "true"
    load-balancer.hetzner.cloud/health-check-interval: "10s"
    load-balancer.hetzner.cloud/health-check-timeout: "5s"
    load-balancer.hetzner.cloud/health-check-retries: "3"
spec:
  type: LoadBalancer
  ports:
  - port: 443
    targetPort: 3000
  selector:
    app: api
```

## Networking with Cilium

```yaml
# Cilium CNI for advanced networking
# Install via Helm:
# helm repo add cilium https://helm.cilium.io/
# helm install cilium cilium/cilium --namespace kube-system \
#   --set kubeProxyReplacement=true \
#   --set hostServices.enabled=true \
#   --set hostDatapathMode=false \
#   --set ipam.mode=cluster-pool \
#   --set ipam.operator.clusterPoolIPv4PodCIDRList="10.244.0.0/16"
---
# Network policy with Cilium
apiVersion: "cilium.io/v2"
kind: CiliumNetworkPolicy
metadata:
  name: api-policy
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
      - port: "3000"
        protocol: TCP
  egress:
  - toEndpoints:
    - matchLabels:
        app: database
    toPorts:
    - ports:
      - port: "5432"
        protocol: TCP
  - toCIDR:
    - "0.0.0.0/0"
    toPorts:
    - ports:
      - port: "443"
        protocol: TCP
```

## Monitoring

```yaml
# Prometheus + Grafana with Hetzner metrics
---
# Install kube-prometheus-stack:
# helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
# helm install prometheus prometheus-community/kube-prometheus-stack \
#   --namespace monitoring --create-namespace

# Hetzner Cloud metrics via hcloud-ccm
# Already exposed through Kubelet / node metrics

# Node exporter for Hetzner-specific metrics
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-exporter
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: node-exporter
  template:
    metadata:
      labels:
        app: node-exporter
    spec:
      hostNetwork: true
      containers:
      - name: node-exporter
        image: prom/node-exporter:latest
        ports:
        - containerPort: 9100
```

## Best Practices

- Use K3s with embedded etcd for HA control plane (3+ control-plane nodes)
- Use Hetzner CCM (Cloud Controller Manager) and CSI Driver for cloud integration
- Use Hetzner Placement Groups (spread) for control-plane and worker nodes
- Use Cilium CNI for advanced networking, network policies, and Hubble observability
- Use K3s built-in Load Balancer (ServicelB) or hcloud-ccm for Load Balancer services
- Use Cluster API for automated cluster lifecycle management
- Use Rancher for multi-cluster management and GitOps
- Store kubeconfigs and secrets in external vault (HashiCorp Vault)
- Enable automatic backup of etcd snapshots (K3s built-in)
- Use hcloud-volumes StorageClass for persistent workloads
- Monitor cluster with kube-prometheus-stack and Hetzner Cloud metrics
- Use taints and tolerations to separate control-plane and worker workloads
- Use Hetzner private network (VXLAN) for all cluster-internal traffic
