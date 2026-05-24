# OKE (Oracle Kubernetes Engine)

## OKE Cluster Creation

```hcl
# Basic managed OKE cluster
resource "oci_containerengine_cluster" "oke" {
  compartment_id     = var.compartment_ocid
  name               = "production-oke"
  kubernetes_version = "v1.30.5"

  vcn_id = oci_core_vcn.main.id

  options {
    service_lb_subnet_ids = [oci_core_subnet.public.id]
    add_ons {
      is_kubernetes_dashboard_enabled = false
      is_tiller_enabled               = false
    }
    admission_controller_options {
      is_pod_security_policy_enabled = false
    }
    kubernetes_network_config {
      pods_cidr     = "10.244.0.0/16"
      services_cidr = "10.96.0.0/16"
    }
  }

  endpoint_config {
    subnet_id          = oci_core_subnet.private.id
    is_public_ip_enabled = false
    nsg_ids           = [oci_core_network_security_group.oke_control.id]
  }

  image_policy_config {
    is_policy_enabled = true
  }
}
```

## Node Pools

```hcl
# Node pool with flexible shapes and multiple placement configs
resource "oci_containerengine_node_pool" "workers" {
  compartment_id     = var.compartment_ocid
  cluster_id         = oci_containerengine_cluster.oke.id
  name               = "worker-pool"
  kubernetes_version = "v1.30.5"
  node_shape         = "VM.Standard.E4.Flex"

  node_shape_config {
    ocpus         = 8
    memory_in_gbs = 64
  }

  node_config_details {
    size = 6
    placement_configs {
      availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
      subnet_id           = oci_core_subnet.private.id
    }
    placement_configs {
      availability_domain = data.oci_identity_availability_domains.ads.availability_domains[1].name
      subnet_id           = oci_core_subnet.private.id
    }
    placement_configs {
      availability_domain = data.oci_identity_availability_domains.ads.availability_domains[2].name
      subnet_id           = oci_core_subnet.private.id
    }

    defined_tags = {
      "Operations.CostCenter" = "CC-123"
    }

    node_pool_pod_network_option_details {
      cni_type = "OCI_VCN_IP_NATIVE"
    }
  }

  node_source_details {
    source_type = "IMAGE"
    image_id    = data.oci_core_images.oke_image.images[0].id
  }

  node_metadata = {
    user_data = base64encode(<<-EOF
      #!/bin/bash
      echo "Custom bootstrapping"
      EOF
    )
  }

  node_eviction_node_pool_settings {
    eviction_grace_duration = "PT10M"
    is_force_delete_after_grace_duration = false
  }
}

# GPU node pool for ML workloads
resource "oci_containerengine_node_pool" "gpu" {
  compartment_id     = var.compartment_ocid
  cluster_id         = oci_containerengine_cluster.oke.id
  name               = "gpu-pool"
  kubernetes_version = "v1.30.5"
  node_shape         = "VM.GPU.A10.1"

  node_config_details {
    size = 2
    placement_configs {
      availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
      subnet_id           = oci_core_subnet.private.id
    }
  }

  node_shape_config {
    ocpus         = 15
    memory_in_gbs = 240
  }
}
```

## VCN-Native Networking (OCI CNI)

OKE supports OCI VCN-Native Pod Networking using the OCI CNI plugin. Each pod gets a VCN IP directly, enabling:

- Network security groups applied to pods
- VCN flow logs for pod traffic
- Service gateway access from pods without NAT
- Network policies with OCI-native constructs

```yaml
# Example: NSG applied to pods
apiVersion: v1
kind: Namespace
metadata:
  name: production
  annotations:
    oci.security.oracle.com/security-list-management: "enabled"
---
# Pod gets VCN-native networking
apiVersion: v1
kind: Pod
metadata:
  name: web-app
  labels:
    app: web
  annotations:
    oci.oraclecloud.com/security-list-management-mode: "namespace"
spec:
  containers:
  - name: nginx
    image: nginx:latest
    ports:
    - containerPort: 80
```

## OCI Service Broker

```yaml
# OCI Service Broker installation via helm
# helm repo add oci-service-broker https://oracle.github.io/oci-service-broker/charts
# helm install oci-service-broker oci-service-broker/oci-service-broker \
#   --set ociauth.secretName=oci-credentials \
#   --set ociauth.tenancyOCID=ocid1.tenancy.oc1..example \
#   --set ociauth.userOCID=ocid1.user.oc1..example \
#   --set ociauth.fingerprint=ab:cd:12:34 \
#   --set ociauth.region=us-ashburn-1

# OCI Service Broker service classes:
# - Autonomous Database (ATP/ADW)
# - MySQL HeatWave
# - Object Storage
# - Streaming

---
apiVersion: servicecatalog.k8s.io/v1beta1
kind: ServiceInstance
metadata:
  name: atp-instance
spec:
  clusterServiceClassExternalName: atp-service
  clusterServicePlanExternalName: standard
  parameters:
    compartmentId: ocid1.compartment.oc1..example
    dbName: appdb
    cpuCount: 4
    storageSizeInTBs: 1
---
apiVersion: servicecatalog.k8s.io/v1beta1
kind: ServiceBinding
metadata:
  name: atp-binding
spec:
  serviceInstanceRef:
    name: atp-instance
  secretName: atp-credentials
```

## Flexible Shapes

```hcl
# Flexible shape configurations for OKE node pools
# List of common flexible shapes:
# VM.Standard.E4.Flex - Intel Xeon, up to 64 OCPU, 1024 GB RAM
# VM.Standard.E5.Flex - Intel Xeon, up to 100 OCPU, 1024 GB RAM
# VM.Optimized3.Flex - Intel Xeon (compute-optimized)
# VM.GPU.A10.1      - NVIDIA A10 GPU
# VM.GPU.A100.1     - NVIDIA A100 GPU

# OCPU to memory ratio: 1 OCPU = 16 GB for E4/E5 standard
```

## OKE Best Practices

- Use VCN-native pod networking (OCI CNI) for network isolation and NSG support
- Enable cluster encryption with OCI Vault KMS
- Deploy control plane in private subnet with public endpoint disabled
- Use placement in all 3 ADs for HA node pools
- Enable cluster autoscaler for dynamic scaling
- Use node pool defined tags for cost tracking
- Configure pod security policies (PSP) or OPA/Gatekeeper
- Use OCI Service Broker for backing services
- Enable audit logging for the cluster
- Separate node pools by workload type (general, GPU, memory)

## CLI Commands

```bash
# Create OKE cluster
oci ce cluster create \
  --compartment-id ocid1.compartment.oc1..example \
  --name production-oke \
  --kubernetes-version v1.30.5 \
  --vcn-id ocid1.vcn.oc1..example \
  --service-lb-subnet-ids '["ocid1.subnet.oc1..example"]'

# Create kubeconfig
oci ce cluster create-kubeconfig \
  --cluster-id ocid1.cluster.oc1..example \
  --file $HOME/.kube/oke-config \
  --region us-ashburn-1 \
  --token-version 2.0.0

# List node pools
oci ce node-pool list \
  --compartment-id ocid1.compartment.oc1..example \
  --cluster-id ocid1.cluster.oc1..example

# Scale node pool
oci ce node-pool update \
  --node-pool-id ocid1.nodepool.oc1..example \
  --size 5

# Get cluster status
oci ce cluster get \
  --cluster-id ocid1.cluster.oc1..example
```
