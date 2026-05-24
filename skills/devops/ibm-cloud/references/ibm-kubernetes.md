# IBM Cloud Kubernetes

## IKS (IBM Kubernetes Service)

```hcl
# VPC Gen2 IKS cluster
resource "ibm_container_vpc_cluster" "iks" {
  name              = "production-iks"
  vpc_id            = ibm_is_vpc.main.id
  flavor            = "bx2.4x16"
  worker_count      = 3
  resource_group_id = data.ibm_resource_group.default.id
  kube_version      = "1.30.5"
  wait_till         = "OneWorkerNodeReady"

  zones {
    subnet_id = ibm_is_subnet.app.id
    name      = "us-south-1"
  }
  zones {
    subnet_id = ibm_is_subnet.app2.id
    name      = "us-south-2"
  }
  zones {
    subnet_id = ibm_is_subnet.app3.id
    name      = "us-south-3"
  }

  # KMS encryption
  kms_config {
    instance_id = ibm_resource_instance.kms.guid
    crk_id      = ibm_kms_key.app.id
  }

  # Private-only cluster
  public_service_endpoint  = false
  private_service_endpoint = true

  # COS integration for backups
  cos_instance_crn = ibm_resource_instance.cos.id

  tags = ["production", "iks"]
}

# Classic IKS cluster (non-VPC)
resource "ibm_container_cluster" "classic" {
  name              = "classic-iks"
  datacenter        = "dal10"
  flavor            = "b3c.4x16"
  worker_num        = 3
  resource_group_id = data.ibm_resource_group.default.id
  hardware          = "shared"
  public_vlan_id    = ibm_network_vlan.public.id
  private_vlan_id   = ibm_network_vlan.private.id
}
```

## Worker Pools

```hcl
# Add worker pool
resource "ibm_container_vpc_worker_pool" "gpu" {
  cluster           = ibm_container_vpc_cluster.iks.id
  resource_group_id = data.ibm_resource_group.default.id
  worker_pool_name  = "gpu-pool"
  flavor            = "gx2.8x64x1v100"
  worker_count      = 2
  vpc_id            = ibm_is_vpc.main.id

  zones {
    subnet_id = ibm_is_subnet.app.id
    name      = "us-south-1"
  }
}

resource "ibm_container_vpc_worker_pool" "memory" {
  cluster           = ibm_container_vpc_cluster.iks.id
  resource_group_id = data.ibm_resource_group.default.id
  worker_pool_name  = "memory-pool"
  flavor            = "mx2.16x128"
  worker_count      = 3
  vpc_id            = ibm_is_vpc.main.id

  zones {
    subnet_id = ibm_is_subnet.app.id
    name      = "us-south-1"
  }
}

# Autoscaling worker pool
resource "ibm_container_vpc_worker_pool" "autoscale" {
  cluster           = ibm_container_vpc_cluster.iks.id
  resource_group_id = data.ibm_resource_group.default.id
  worker_pool_name  = "autoscale-pool"
  flavor            = "bx2.4x16"
  worker_count      = 3
  vpc_id            = ibm_is_vpc.main.id

  zones {
    subnet_id = ibm_is_subnet.app.id
    name      = "us-south-1"
  }
}

# Enable cluster autoscaler
resource "ibm_container_cluster_autoscaler_config" "iks" {
  cluster           = ibm_container_vpc_cluster.iks.id
  resource_group_id = data.ibm_resource_group.default.id
  enabled           = true
  balance_available_zones = true
  max_node_group_count    = 10
  min_node_group_count    = 3
  expander               = "random"
  scale_down_enabled     = true
  # Scale down only after 10 min of low utilization
  scale_down_delay_after_add    = "10m"
  scale_down_delay_after_delete = "10s"
  scale_down_unneeded_time      = "10m"
}
```

## OpenShift on IBM Cloud

```hcl
# Red Hat OpenShift cluster
resource "ibm_container_vpc_cluster" "openshift" {
  name              = "production-openshift"
  vpc_id            = ibm_is_vpc.main.id
  flavor            = "bx2.4x16"
  worker_count      = 3
  resource_group_id = data.ibm_resource_group.default.id
  kube_version      = "4.16_openshift"
  wait_till         = "OneWorkerNodeReady"

  zones {
    subnet_id = ibm_is_subnet.app.id
    name      = "us-south-1"
  }

  public_service_endpoint  = true
  private_service_endpoint = true

  # OpenShift-specific
  entitlement = "cloud_pak"
}
```

## Ingress and Networking

```yaml
# IBM Cloud ALB (Application Load Balancer)
# By default, IKS creates a public and private ALB
---
# Custom ALB configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: ibm-cloud-provider-ingress-cm
  namespace: kube-system
data:
  default-backend-service: "default/nginx-default-backend"
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  annotations:
    kubernetes.io/ingress.class: "public-iks-k8s-nginx"
    ingress.bluemix.net/redirect-to-https: "true"
    ingress.bluemix.net/proxy-connect-timeout: "60s"
    ingress.bluemix.net/proxy-read-timeout: "60s"
    ingress.bluemix.net/client-max-body-size: "50m"
spec:
  tls:
  - hosts:
    - app.example.com
    secretName: app-tls
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 3000
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 80
```

## Logging and Monitoring

```yaml
# IBM Cloud Log Analysis and Monitoring
# Enable via Terraform or CLI
---
# Terraform: enable monitoring
resource "ibm_resource_instance" "monitoring" {
  name              = "production-monitor"
  service           = "sysdig-monitor"
  plan              = "graduated-tier"
  location          = "us-south"
  resource_group_id = data.ibm_resource_group.default.id
}

resource "ibm_resource_instance" "logging" {
  name              = "production-logs"
  service           = "logdna"
  plan              = "graduated-tier"
  location          = "us-south"
  resource_group_id = data.ibm_resource_group.default.id
}

# Attach to IKS cluster
resource "ibm_ob_logging" "iks" {
  cluster            = ibm_container_vpc_cluster.iks.id
  resource_group_id  = data.ibm_resource_group.default.id
  instance_id        = ibm_resource_instance.logging.guid
  log_agent_priority = "DaemonSet"
}

resource "ibm_ob_monitoring" "iks" {
  cluster            = ibm_container_vpc_cluster.iks.id
  resource_group_id  = data.ibm_resource_group.default.id
  instance_id        = ibm_resource_instance.monitoring.guid
  sysdig_agent_priority = "DaemonSet"
}
```

## Container Registry

```hcl
resource "ibm_cr_namespace" "app" {
  name              = "app-namespace"
  resource_group_id = data.ibm_resource_group.default.id
}

# IAM policies for image pull
resource "ibm_iam_service_policy" "iks_to_cr" {
  iam_service_id = ibm_container_vpc_cluster.iks.iam_service_id
  roles          = ["Reader"]
  resources {
    service = "container-registry"
  }
}
```

```bash
# IBM Cloud CLI
# Login and target
ibmcloud login --sso
ibmcloud target -g production

# Create cluster
ibmcloud ks cluster create vpc-gen2 \
  --name production-iks \
  --vpc-id <vpc> --flavor bx2.4x16 \
  --workers 3 --zone us-south-1 \
  --subnet-id <subnet>

# List clusters
ibmcloud ks cluster list

# Get kubeconfig
ibmcloud ks cluster config --cluster production-iks

# Add worker pool
ibmcloud ks worker-pool create vpc-gen2 \
  --cluster production-iks \
  --name gpu-pool --flavor gx2.8x64x1v100 \
  --size-per-zone 2

# List workers
ibmcloud ks workers --cluster production-iks

# Enable autoscaler
ibmcloud ks autoscaler enable --cluster production-iks \
  --min 3 --max 10

# Upgrade cluster
ibmcloud ks cluster update --cluster production-iks \
  --kube-version 1.31.0

# Create OpenShift cluster
ibmcloud oc cluster create vpc-gen2 \
  --name production-openshift \
  --version 4.16_openshift

# Enable logging
ibmcloud ob logging config create \
  --cluster production-iks \
  --instance <log-analysis-instance>

# View logs
ibmcloud logdna tail

# Container Registry
ibmcloud cr region-set us-south
ibmcloud cr namespace-add app-namespace
ibmcloud cr images
```

## Best Practices

- Use VPC Gen2 clusters over Classic for production (better networking, security groups)
- Deploy across 3 zones in a multi-zone region for HA
- Use private-only clusters for security (no public endpoints)
- Enable KMS encryption with IBM Key Protect
- Use separate worker pools for system vs. application workloads
- Enable cluster autoscaler with proper min/max boundaries
- Use IBM Cloud Monitoring (Sysdig) and Log Analysis (LogDNA) for observability
- Enable Image Security Enforcement for container image scanning
- Use OpenShift when you need built-in CI/CD, service mesh, or operator hub
- Rotate worker node API keys regularly
- Use trusted profiles for service-to-service authentication
