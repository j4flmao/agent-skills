---
name: oracle-cloud
description: >
  Use this skill when the user says 'oracle cloud', 'oci', 'oracle
  cloud infrastructure', 'oracle database cloud', 'oci compute',
  'oci networking', 'oci storage', 'oci identity', 'oci iam',
  'oracle autonomous database', 'oci load balancer', 'oci dns',
  'oci functions', 'oci container engine', 'oke', 'oracle
  kubernetes', 'oci terraform', 'oci resource manager', 'oracle
  cloud regions', 'oci fastconnect', 'oci vcn', 'oci security
  list', 'oci nsg', 'oci bastion', 'oci vault', 'oci waf',
  'oci email delivery', 'oci object storage', 'oci block volume',
  'oci file storage', 'oci budget', 'oci cost analysis',
  'oci announcements', 'oci support'.
  Covers: Oracle Cloud Infrastructure (OCI) resources, networking,
  compute, storage, IAM, OKE (Kubernetes), Autonomous Database,
  and governance.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, oracle-cloud, oci, cloud-provider, phase-4]
---

# Oracle Cloud Infrastructure (OCI)

## Purpose
Manage Oracle Cloud Infrastructure resources: compute, networking, storage, IAM, OKE (Kubernetes), Autonomous Database, and cost governance.

## Agent Protocol

### Trigger
Exact user phrases: "oracle cloud", "oci", "oke", "oracle kubernetes", "autonomous database", "oci compute", "oci networking", "oci iam".

### Input Context
Before activating, verify:
- OCI region(s) and tenancy OCID.
- Compartment structure.
- Authentication method (API key, instance principal, resource principal).
- Terraform or OCI CLI for provisioning.

### Output Artifact
OCI resource configurations (Terraform or CLI) or architecture documentation.

### Response Format
Terraform HCL or OCI CLI commands. No preamble.

### Completion Criteria
- [ ] Networking: VCN, subnets, security lists, NSGs, route tables, DRG.
- [ ] Compute: instance shapes, images, boot volumes, cloud-init.
- [ ] Storage: object storage buckets, block volumes, file systems.
- [ ] IAM: compartments, groups, policies, dynamic groups.
- [ ] OKE: cluster, node pools, kubeconfig, ingress controller.
- [ ] Database: Autonomous Database or DB system.
- [ ] Governance: budgets, alerts, cost tags.

### Max Response Length
400 lines.

## Quick Start
Create a compartment → set up VCN with subnets and security lists → provision compute instance (VM.Standard.E4.Flex) → configure IAM policies → deploy OKE cluster → set up object storage for backups. All via `oci` CLI or Terraform.

## Decision Tree: OCI Compute Shapes
| Shape Family | Use Case | vCPUs | Memory | Networking |
|-------------|----------|-------|--------|------------|
| **VM.Standard.E4.Flex** | General purpose, AMD EPYC | 1-64 | 1-512 GB | Up to 32 Gbps |
| **VM.Standard.A1.Flex** | ARM Ampere, cost-effective | 1-80 | 1-512 GB | Up to 32 Gbps |
| **BM.Optimized3.36** | Bare metal, HPC | 36 | 512 GB | 100 Gbps |
| **VM.GPU.A10.1** | ML inference, graphics | 15 | 120 GB | 4 Gbps |
| **VM.DenseIO.E4.Flex** | NVMe local SSD, databases | 1-64 | 1-512 GB | Up to 32 Gbps |

## Core Workflow

### Step 1: OCI Networking
```hcl
# VCN with public and private subnets
resource "oci_core_vcn" "main" {
  compartment_id = var.compartment_ocid
  display_name   = "vcn-main"
  cidr_blocks    = ["10.0.0.0/16"]
  dns_label      = "vcnmain"
}

resource "oci_core_subnet" "public" {
  compartment_id    = var.compartment_ocid
  vcn_id            = oci_core_vcn.main.id
  cidr_block        = "10.0.1.0/24"
  display_name      = "subnet-public"
  security_list_ids = [oci_core_security_list.public.id]
  route_table_id    = oci_core_route_table.public.id
  dns_label         = "public"
}

resource "oci_core_subnet" "private" {
  compartment_id    = var.compartment_ocid
  vcn_id            = oci_core_vcn.main.id
  cidr_block        = "10.0.2.0/24"
  display_name      = "subnet-private"
  security_list_ids = [oci_core_security_list.private.id]
  route_table_id    = oci_core_route_table.private.id
  dns_label         = "private"
}

# Internet Gateway for public subnet
resource "oci_core_internet_gateway" "ig" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.main.id
  display_name   = "ig-main"
}

# NAT Gateway for private subnet outbound
resource "oci_core_nat_gateway" "nat" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.main.id
  display_name   = "nat-main"
}
```

### Step 2: Security Lists and NSGs
```hcl
# Security List (stateless, applies to whole subnet)
resource "oci_core_security_list" "public" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.main.id
  display_name   = "sl-public"

  egress_security_rules {
    destination = "0.0.0.0/0"
    protocol    = "6"
  }

  ingress_security_rules {
    source   = "0.0.0.0/0"
    protocol = "6"
    tcp_options {
      min = 80
      max = 80
    }
  }
  ingress_security_rules {
    source   = "0.0.0.0/0"
    protocol = "6"
    tcp_options {
      min = 443
      max = 443
    }
  }
}

# Network Security Group (stateful, applies to individual instances)
resource "oci_core_network_security_group" "web" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.main.id
  display_name   = "nsg-web"
}

resource "oci_core_network_security_group_security_rule" "web_http" {
  network_security_group_id = oci_core_network_security_group.web.id
  direction                 = "INGRESS"
  protocol                  = "6"
  source                    = "0.0.0.0/0"
  source_type               = "CIDR_BLOCK"
  tcp_options {
    destination_port_range {
      min = 80
      max = 80
    }
  }
}
```

### Step 3: Compute Instance
```hcl
resource "oci_core_instance" "app" {
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
  compartment_id      = var.compartment_ocid
  shape               = "VM.Standard.E4.Flex"
  shape_config {
    ocpus         = 4
    memory_in_gbs = 32
  }
  display_name = "app-server"

  source_details {
    source_type = "image"
    source_id   = data.oci_core_images.ol8.images[0].id
  }

  create_vnic_details {
    subnet_id        = oci_core_subnet.private.id
    assign_public_ip = false
    nsg_ids          = [oci_core_network_security_group.web.id]
  }

  metadata = {
    ssh_authorized_keys = file(var.ssh_public_key_path)
    user_data           = base64encode(file("${path.module}/cloud-init.yaml"))
  }
}
```

### Step 4: OCI IAM
```hcl
# Compartments
resource "oci_identity_compartment" "team" {
  compartment_id = var.root_compartment_ocid
  description    = "Team workload compartment"
  name           = "team-compartment"
}

# Groups and Policies
resource "oci_identity_group" "ops" {
  compartment_id = var.root_compartment_ocid
  name           = "DevOpsTeam"
  description    = "DevOps engineering team"
}

resource "oci_identity_policy" "ops_policy" {
  compartment_id = var.root_compartment_ocid
  name           = "devops-policy"
  description    = "Policy for DevOps team"
  statements = [
    "Allow group DevOpsTeam to manage all-resources in compartment team-compartment",
    "Allow group DevOpsTeam to read audit-events in tenancy",
    "Allow group DevOpsTeam to use tag-namespaces in tenancy"
  ]
}

# Dynamic Group for compute instances
resource "oci_identity_dynamic_group" "compute" {
  compartment_id = var.root_compartment_ocid
  name           = "ComputeInstances"
  description    = "All compute instances in prod"
  matching_rule = "ALL {instance.compartment.id = '${oci_identity_compartment.team.id}'}"
}
```

### Step 5: OKE (Oracle Kubernetes Engine)
```hcl
resource "oci_containerengine_cluster" "oke" {
  compartment_id     = var.compartment_ocid
  kubernetes_version = "v1.28.2"
  name               = "oke-prod"
  vcn_id             = oci_core_vcn.main.id

  options {
    service_lb_subnet_ids = [oci_core_subnet.public.id]

    add_ons {
      is_kubernetes_dashboard_enabled = false
      is_tiller_enabled               = false
    }

    admission_controller_options {
      is_pod_security_policy_enabled = false
    }
  }
}

resource "oci_containerengine_node_pool" "pool" {
  cluster_id         = oci_containerengine_cluster.oke.id
  compartment_id     = var.compartment_ocid
  kubernetes_version = "v1.28.2"
  name               = "pool-general"
  node_shape         = "VM.Standard.E4.Flex"
  node_shape_config {
    ocpus         = 4
    memory_in_gbs = 32
  }
  node_source_details {
    source_type = "image"
    image_id    = data.oci_core_images.oke.images[0].id
  }
  subnet_ids           = [oci_core_subnet.private.id]
  quantity_per_subnet  = 3
  ssh_public_key       = file(var.ssh_public_key_path)

  initial_node_labels {
    key   = "pool"
    value = "general"
  }
}
```

### Step 6: Autonomous Database
```hcl
resource "oci_database_autonomous_database" "adb" {
  compartment_id = var.compartment_ocid
  db_name        = "mydb"
  display_name   = "my-autonomous-db"
  db_workload    = "OLTP"
  is_free_tier   = false
  db_version     = "19c"

  admin_password = var.db_admin_password
  cpu_core_count = 4
  data_storage_size_in_tbs = 1

  whitelisted_ips = ["10.0.0.0/16"]
  license_model   = "BRING_YOUR_OWN_LICENSE"

  # Enable auto-scaling
  is_auto_scaling_enabled = true

  # Database backups
  is_backup_retention_enabled = true
  backup_retention_period_in_days = 7
}
```

### Step 7: Object Storage
```hcl
resource "oci_objectstorage_bucket" "backup" {
  compartment_id = var.compartment_ocid
  name           = "app-backups"
  namespace      = data.oci_objectstorage_namespace.ns.namespace
  access_type    = "NoPublicAccess"
  storage_tier   = "Standard"
  object_events_enabled = true

  # Lifecycle rules
  retention_rules {
    display_name = "7-year-retention"
    duration {
      time_amount = 7
      time_unit   = "YEARS"
    }
  }
}

resource "oci_objectstorage_bucket" "cold_storage" {
  compartment_id = var.compartment_ocid
  name           = "archived-logs"
  namespace      = data.oci_objectstorage_namespace.ns.namespace
  access_type    = "NoPublicAccess"
  storage_tier   = "Archive"
  auto_tiering   = "INFREQUENT_ACCESS"
}
```

### Step 8: FastConnect (Dedicated Private Connectivity)
```hcl
resource "oci_core_fast_connect_provider_service" "provider" {
  provider_service_name = "Megaport"
}

resource "oci_core_virtual_circuit" "fc_primary" {
  compartment_id = var.compartment_ocid
  type           = "PRIVATE"
  display_name   = "fastconnect-primary"
  bandwidth      = 1000  # 1 Gbps
  customer_bgp_asn = 65550
  provider_service_id  = data.oci_core_fast_connect_provider_services.provider.fast_connect_provider_services[0].id
  provider_service_key_name = "megaport-key-primary"
  gateway_id = oci_core_drg.main.id

  cross_connect_mappings {
    customer_bgp_peering_ip  = "10.200.0.1/30"
    oracle_bgp_peering_ip    = "10.200.0.2/30"
  }
}
```

### Step 9: Resource Manager (Terraform Automation)
```hcl
resource "oci_resourcemanager_stack" "infra" {
  compartment_id = var.compartment_ocid
  display_name   = "infrastructure-stack"
  description    = "Base infrastructure deployment"
  config_source {
    config_source_type = "GIT_CONFIG_SOURCE"
    configuration_source_provider_id = oci_resourcemanager_configuration_source_provider.github.id
    branch_name = "main"
  }
}

resource "oci_resourcemanager_job" "apply" {
  stack_id          = oci_resourcemanager_stack.infra.id
  job_operation_details {
    operation = "APPLY"
    apply_job_plan_resolution {
      resolution_strategy = "ALWAYS_USE_LATEST_PLAN"
    }
  }
}
```

### Step 10: Monitoring and Alerts
```hcl
resource "oci_monitoring_alarm" "cpu_high" {
  compartment_id     = var.compartment_ocid
  alarm_summary      = "High CPU utilization"
  display_name       = "cpu-utilization-high"
  metric_compartment_id = var.compartment_ocid
  namespace          = "oci_computeagent"
  query              = "CpuUtilization[1m].mean() > 90"
  severity           = "WARNING"
  body               = "CPU > 90% for >1 minute on {resource.display_name}"
  destinations       = [oci_ons_topic.alarms.id]
  is_enabled         = true
  repeat_duration    = "PT15M"
}
```

## Rules
- Every resource must belong to a compartment — no root compartment resources.
- Use NSGs for instance-level security; use Security Lists for subnet defaults.
- Preflex Flex shapes over fixed OCPU shapes for cost efficiency and flexibility.
- Enable auto-scaling on Autonomous Database for unpredictable workloads.
- Use instance principals for OKE node pools to access object storage without keys.
- Tag all resources with a cost-tracking tag namespace (Environment, Project, Owner).
- Set up budgets and alerts before deploying production workloads.
- Use OCI Vault for secrets, API keys, and database passwords.
- Prefer FastConnect over site-to-site VPN for production hybrid connectivity.
- Enable OKE cluster audit logs and ship to OCI Logging.

## Production Considerations
- OCI regions are organized by realm (commercial, government, China). Choose the right realm.
- Availability domains (AD) are isolated within a region — 3 ADs in commercial regions.
- Fault domains are within an AD — spread instances across all fault domains.
- Block volume performance scales with size — allocate >= 320 GB for max IOPS.
- OKE control plane is Oracle-managed (free) but node pools are your responsibility.
- Use reserved (prepaid) compute for steady-state workloads to save up to 60%.
- OCI Budgets support consumption-based and forecast-based alerts.
- Exadata Cloud Service is available for extremely large Oracle Database workloads.
- OCI WAF (Web Application Firewall) supports rate limiting, bot management, and CAPTCHA.
- OCI Bastion service provides SSH/RDP access to private instances without public IPs.

## Anti-Patterns
- Using root compartment for resources — impossible to apply fine-grained policies.
- Using fixed OCPU shapes (VM.Standard2.x) instead of Flex — wasteful and inflexible.
- No VCN flow logs — can't troubleshoot connectivity issues.
- Direct internet access from private subnets without NAT gateway.
- S3 API compatibility assumed for OCI Object Storage — use OCI SDK or CLI.
- Using Security Lists exclusively without NSGs — broader blast radius.
- No budget alerts — surprise bills from misconfigured or attacked resources.
- Manually managing OKE node pools — let cluster autoscaler or node pool management handle it.
- Over-provisioning block volumes for IOPS — use performance tiers instead.
- Ignoring OCI announcements service — unplanned maintenance surprises.

## References
  - references/oci-compute.md — OCI Compute and Shapes
  - references/oci-networking.md — VCN, Subnets, Security Lists, DRG
  - references/oci-storage.md — Object Storage, Block Volume, File Storage
  - references/oci-oke.md — OKE Cluster and Node Pool Management
  - references/oracle-cloud-advanced.md — Oracle Cloud Advanced Topics
  - references/oracle-cloud-fundamentals.md — Oracle Cloud Fundamentals
## Handoff
- `devops-terraform` for Terraform state and module patterns for OCI.
- `devops-kubernetes` for workload deployment on OKE clusters.
- `devops-docker` for containerizing applications for OKE.
- `devops-hybrid-cloud` for connecting OCI with on-prem or other clouds.
- `devops-backup-dr` for OCI-based backup and DR strategies.
- `devops-observability` for OCI logging and monitoring integration.
