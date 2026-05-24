# ACK (Alibaba Container Service for Kubernetes)

## Managed Kubernetes Cluster

```hcl
# Managed ACK cluster
resource "alicloud_cs_managed_kubernetes" "ack" {
  name                         = "production-ack"
  cluster_spec                 = "ack.pro.small"
  version                      = "1.30.3"
  worker_vswitch_ids           = alicloud_vswitch.app[*].id
  pod_vswitch_ids              = alicloud_vswitch.pod[*].id
  new_nat_gateway              = false
  service_cidr                 = "172.16.0.0/20"
  node_cidr_mask               = 24

  # Worker nodes
  worker_number                = 3
  worker_instance_types        = ["ecs.g7.xlarge"]
  worker_system_disk_category  = "cloud_essd"
  worker_system_disk_size      = 40

  # Control plane
  control_plane_log_components = ["apiserver", "ccm", "scheduler", "controllermanager"]

  # Maintenance
  maintenance_window {
    enable           = true
    maintenance_time = "03:00:00Z"
    duration         = "3h"
    weekly_period    = "Sunday"
  }

  # Add-ons
  addons {
    name   = "terway-eniip"
    config = "{\"InstanceType\":\"AliyunECS\",\"NetworkType\":\"eni\"}"
  }
  addons {
    name = "csi-plugin"
  }
  addons {
    name = "csi-provisioner"
  }
  addons {
    name = "nginx-ingress-controller"
    config = "{\"IngressSlbNetworkType\":\"internet\"}"
  }
  addons {
    name   = "arms-prometheus"
    config = "{\"InCluster\":\"true\"}"
  }
  addons {
    name = "logtail-ds"
    config = jsonencode({
      "IngressDashboardEnabled" = "true"
    })
  }
  addons {
    name = "ack-node-problem-detector"
  }

  # Encryption
  encryption_provider_key = alicloud_kms_key.app.id

  # Authentication
  enable_rrsa = true

  tags = {
    Environment = "production"
  }
}

# Get kubeconfig
data "alicloud_cs_cluster_credential" "ack" {
  cluster_id                 = alicloud_cs_managed_kubernetes.ack.id
  temporary_duration_minutes = 60
}

output "kubeconfig" {
  value     = data.alicloud_cs_cluster_credential.ack.kubeconfig
  sensitive = true
}
```

## Node Pools

```hcl
# Add node pool for GPU workloads
resource "alicloud_cs_node_pool" "gpu" {
  cluster_id        = alicloud_cs_managed_kubernetes.ack.id
  name              = "gpu-pool"
  node_count        = 2
  instance_types    = ["ecs.gn7i-c16g1.4xlarge"]
  vswitch_ids       = alicloud_vswitch.app[*].id
  system_disk_category = "cloud_essd"
  system_disk_size     = 80

  system_disk_performance_level = "PL2"

  # Auto-scaling
  scaling_config {
    min_size = 1
    max_size = 5
    type     = "cpu"
  }

  # Taints
  taints {
    key    = "nvidia.com/gpu"
    value  = "true"
    effect = "NoSchedule"
  }

  labels = {
    "accelerator" = "nvidia"
  }

  management {
    auto_repair  = true
    auto_upgrade = true
    surge        = 1
  }
}

# Add node pool for system workloads
resource "alicloud_cs_node_pool" "system" {
  cluster_id     = alicloud_cs_managed_kubernetes.ack.id
  name           = "system-pool"
  node_count     = 2
  instance_types = ["ecs.g7.xlarge"]
  vswitch_ids    = alicloud_vswitch.app[*].id

  taints {
    key    = "node-role.kubernetes.io/system"
    value  = "true"
    effect = "NoSchedule"
  }

  labels = {
    "node-role" = "system"
  }
}
```

## Networking with Terway

```yaml
# Terway CNI (Alibaba native networking)
# Two modes:
# 1. Terway ENI - Each pod gets a VPC ENI (Elastic Network Interface)
# 2. Terway ENIIP - Each pod gets a secondary IP from an ENI (higher density)

# Network policy example
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-network-policy
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: frontend
    ports:
    - protocol: TCP
      port: 3000
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: database
    ports:
    - protocol: TCP
      port: 5432
  - to:
    - ipBlock:
        cidr: 0.0.0.0/0
    ports:
    - protocol: TCP
      port: 443
```

## Container Registry

```hcl
# Personal Edition (free)
resource "alicloud_cr_ee_namespace" "app" {
  instance_id        = alicloud_cr_ee_instance.app.id
  name               = "app-namespace"
  auto_create        = false
  default_visibility = "PRIVATE"
}

resource "alicloud_cr_ee_instance" "app" {
  name              = "app-cr-instance"
  payment_type      = "Subscription"
  period            = 1
  instance_type     = "Advanced"
  password          = var.cr_password
}

resource "alicloud_cr_ee_repo" "api" {
  instance_id     = alicloud_cr_ee_instance.app.id
  namespace       = alicloud_cr_ee_namespace.app.name
  name            = "api"
  repo_type       = "PRIVATE"
  summary         = "API service image"
  detail          = "Production API service container image"
}
```

## Service Mesh (ASM)

```hcl
# Alibaba Service Mesh (ASM)
resource "alicloud_service_mesh_service_mesh" "asm" {
  edition            = "Default"
  name               = "production-asm"
  version            = "v1.22.0.0"
  cluster_spec       = "pro"
  cluster_ids        = [alicloud_cs_managed_kubernetes.ack.id]

  network {
    vpc_id          = alicloud_vpc.main.id
    vswitche_list   = alicloud_vswitch.app[*].id
  }

  # Enable Prometheus monitoring
  prometheus {
    use_existing = false
  }

  # Enable access log
  access_log {
    project  = alicloud_log_project.asm.name
  }

  # OPA for policy enforcement
  opa {
    enabled      = true
    limit_cpu    = "2"
    limit_memory = "4Gi"
  }
}
```

## CLI Commands

```bash
# Create ACK cluster
aliyun cs CreateCluster \
  --cluster_type managed_kubernetes \
  --name production-ack \
  --cluster_spec ack.pro.small \
  --kubernetes_version 1.30.3 \
  --vswitch_ids "[\"vsw-id1\",\"vsw-id2\"]"

# List clusters
aliyun cs DescribeClusters

# Get cluster kubeconfig
aliyun cs DescribeClusterUserKubeconfig \
  --ClusterId <cluster-id>

# Scale cluster worker count
aliyun cs ScaleCluster \
  --ClusterId <cluster-id> \
  --count 5

# Add node pool
aliyun cs CreateClusterNodePool \
  --cluster_id <cluster-id> \
  --name gpu-pool \
  --node_count 2 \
  --instance_types "[\"ecs.gn7i-c16g1.4xlarge\"]"

# Upgrade cluster
aliyun cs UpgradeCluster \
  --ClusterId <cluster-id> \
  --version 1.31.0

# Get cluster events
aliyun cs DescribeClusterEvents \
  --ClusterId <cluster-id>

# Attach existing ECS instances to cluster
aliyun cs AttachInstances \
  --ClusterId <cluster-id> \
  --instances "[\"i-instance-id\"]"

# Create CR instance
aliyun cr CreateInstance \
  --InstanceName app-cr-instance \
  --InstanceType Advanced

# List repository
aliyun cr ListRepository --InstanceId <cr-id>

# Enable ASM
aliyun servicemesh CreateServiceMesh \
  --ServiceMeshName production-asm \
  --ClusterIds "[\"<ack-id>\"]"
```

## ACK Cluster Specs

| Spec | Description | Max Nodes |
|------|-------------|-----------|
| ack.pro.small | Professional small | 200 |
| ack.pro.medium | Professional medium | 500 |
| ack.pro.large | Professional large | 1000 |
| ack.standard | Standard (free) | 100 |

## Best Practices

- Use ACK Professional edition for production (better SLA, security, and features)
- Use Terway ENIIP for pod networking (higher pod density per node)
- Enable RRSA (RAM Roles for Service Accounts) for pod-level IAM
- Use separate node pools for system, application, and GPU workloads
- Enable cluster auto-upgrade with surge for rolling updates
- Use maintenance windows to schedule upgrades during off-peak
- Enable control plane logging (apiserver, scheduler, etc.)
- Use ARMS Prometheus for cluster monitoring
- Use Container Registry with automated image scanning
- Enable ASM for production microservices (traffic management, security, observability)
- Use ACK security groups and network policies together for defense-in-depth
- Enable ack-node-problem-detector for automatic node health monitoring
