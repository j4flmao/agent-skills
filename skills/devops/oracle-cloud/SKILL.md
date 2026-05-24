---
name: oracle-cloud
description: >
  Use this skill when the user says 'Oracle Cloud', 'OCI', 'VCN', 'compute',
  'OKE', 'Autonomous DB', 'ATP', 'ADW', 'I AM', 'compartment', 'policy',
  'Cloud Guard', 'Functions', 'API Gateway', 'Terraform OCI', 'oci-cli',
  'MySQL HeatWave', 'Exadata', 'NoSQL', 'Streaming', 'Service Connector'.
  Covers: core OCI services, networking, IAM/security, databases, Kubernetes
  with OKE, serverless/event-driven, Terraform provider.
  Do NOT use this for: AWS, Azure, GCP, or other cloud providers.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, cloud, oracle-cloud, infrastructure, phase-5]
---

# Oracle Cloud (OCI)

## Purpose
Design, deploy, and manage Oracle Cloud Infrastructure (OCI) using Terraform, oci-cli, and best practices for networking, security, databases, Kubernetes, and serverless.

## Agent Protocol

### Trigger
Exact user phrases: "Oracle Cloud", "OCI", "VCN", "OKE", "Autonomous DB", "ATP", "ADW", "I AM", "compartment", "policy", "Cloud Guard", "Functions", "API Gateway", "Terraform OCI", "oci-cli", "MySQL HeatWave", "Exadata".

### Input Context
Before activating, verify:
- OCI region and tenancy OCID (single or multi-account).
- Compartment structure (root, child compartments).
- Authentication method (API key, instance principal, resource principal, CLI).
- Compliance requirements (HIPAA, SOC2, PCI).

### Output Artifact
Writes to Terraform HCL, OCI CLI commands, IAM policy documents, YAML manifests for OKE and Functions.

### Response Format
HCL, YAML, or CLI commands with no extraneous explanation.

No preamble. No postamble. No explanations. No filler/hedging/transitions.

### Completion Criteria
This skill is complete when:
- [ ] Core network (VCN, subnets, route rules, security lists) is defined.
- [ ] IAM resources (compartments, groups, policies, dynamic groups) are configured.
- [ ] Compute or OKE cluster is provisioned with HA.
- [ ] Database (Autonomous or MySQL HeatWave) is deployed with backup.
- [ ] Monitoring (Service Connector, metrics, alarms) is configured.

## Quick Start
Root compartment → network compartment with VCN with public/private subnets across 3 ADs → dynamic group + policy for compute → OKE cluster with node pool → Autonomous DB with auto-backup → Functions with API Gateway.

## Core Workflow

### Step 1: Compartments and Network
```hcl
# Terraform: compartment and VCN structure
resource "oci_identity_compartment" "network" {
  compartment_id = var.tenancy_ocid
  name           = "Network"
  description    = "Network infrastructure"
}

resource "oci_core_vcn" "main" {
  compartment_id = oci_identity_compartment.network.id
  display_name   = "main-vcn"
  cidr_blocks    = ["10.0.0.0/16"]
  dns_label      = "mainvcn"
}

resource "oci_core_subnet" "public" {
  compartment_id = oci_identity_compartment.network.id
  vcn_id         = oci_core_vcn.main.id
  display_name   = "public-subnet"
  cidr_block     = "10.0.0.0/24"
  dns_label      = "public"
  prohibit_public_ip_on_vnic = false
  security_list_ids = [oci_core_security_list.public.id]
}

resource "oci_core_subnet" "private" {
  compartment_id = oci_identity_compartment.network.id
  vcn_id         = oci_core_vcn.main.id
  display_name   = "private-subnet"
  cidr_block     = "10.0.1.0/24"
  dns_label      = "private"
  prohibit_public_ip_on_vnic = true
  security_list_ids = [oci_core_security_list.private.id]
}

resource "oci_core_internet_gateway" "ig" {
  compartment_id = oci_identity_compartment.network.id
  vcn_id         = oci_core_vcn.main.id
  display_name   = "internet-gateway"
}

resource "oci_core_nat_gateway" "ng" {
  compartment_id = oci_identity_compartment.network.id
  vcn_id         = oci_core_vcn.main.id
  display_name   = "nat-gateway"
}
```

### Step 2: IAM Groups and Policies
```hcl
resource "oci_identity_group" "network_admins" {
  compartment_id = var.tenancy_ocid
  name           = "Network-Admins"
  description    = "Network administrators"
}

resource "oci_identity_policy" "network_admin_policy" {
  compartment_id = var.tenancy_ocid
  name           = "network-admin-policy"
  description    = "Network admin permissions"
  statements = [
    "Allow group Network-Admins to manage virtual-network-family in compartment Network",
    "Allow group Network-Admins to manage load-balancers in compartment Network",
  ]
}

# Dynamic group for compute instances
resource "oci_identity_dynamic_group" "compute_instances" {
  compartment_id = var.tenancy_ocid
  name           = "Compute-Instances"
  description    = "All compute instances"
  matching_rule  = "ALL {instance.compartment.id = '${oci_identity_compartment.app.id}'}"
}
```

### Step 3: OKE Cluster
```hcl
resource "oci_containerengine_cluster" "oke" {
  compartment_id = oci_identity_compartment.oke.id
  name           = "production-oke"
  kubernetes_version = "v1.30.5"
  vcn_id         = oci_core_vcn.main.id

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

  endpoint_config {
    subnet_id   = oci_core_subnet.private.id
    is_public_ip_enabled = false
  }
}

resource "oci_containerengine_node_pool" "pool" {
  compartment_id = oci_identity_compartment.oke.id
  cluster_id     = oci_containerengine_cluster.oke.id
  name           = "pool-1"
  kubernetes_version = "v1.30.5"
  node_shape     = "VM.Standard.E4.Flex"

  node_config_details {
    size = 3
    placement_configs {
      availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
      subnet_id           = oci_core_subnet.private.id
    }
  }

  node_source_details {
    image_id = data.oci_core_images.oke_image.images[0].id
    source_type = "IMAGE"
  }

  node_shape_config {
    ocpus         = 4
    memory_in_gbs = 64
  }
}
```

### Step 4: Autonomous Database
```hcl
resource "oci_database_autonomous_database" "atp" {
  compartment_id       = oci_identity_compartment.database.id
  display_name         = "app-atp"
  db_name              = "APPDB"
  db_workload          = "OLTP"
  db_version           = "19c"
  is_free_tier         = false
  license_model        = "LICENSE_INCLUDED"
  cpu_core_count       = 4
  data_storage_size_in_tbs = 1
  admin_password       = var.atp_admin_password
  subnet_id            = oci_core_subnet.private.id
  is_auto_scaling_enabled = true
  is_dedicated         = false
  backup_retention_period_in_days = 30

  # Auto-backup
  is_auto_backup_enabled = true
}
```

### Step 5: Functions with API Gateway
```hcl
resource "oci_functions_application" "app" {
  compartment_id = oci_identity_compartment.app.id
  display_name   = "serverless-app"
  subnet_ids     = [oci_core_subnet.private.id]
  shape          = "GENERIC_ARM"
  syslog_url     = "tcp://logs.svc:514"
  config = {
    "DB_CONNECTION" = oci_database_autonomous_database.atp.connection_strings.1
  }
}

resource "oci_apigateway_gateway" "gw" {
  compartment_id = oci_identity_compartment.app.id
  display_name   = "api-gateway"
  endpoint_type  = "PUBLIC"
  subnet_id      = oci_core_subnet.public.id
}

resource "oci_apigateway_deployment" "api" {
  compartment_id = oci_identity_compartment.app.id
  gateway_id     = oci_apigateway_gateway.gw.id
  display_name   = "function-api"
  path_prefix    = "/v1"

  specification {
    routes {
      path    = "/process"
      methods = ["POST"]
      backend {
        type   = "ORACLE_FUNCTIONS_BACKEND"
        function_id = oci_functions_application.app.id
      }
    }
  }
}
```

## Rules & Constraints
- Never hardcode OCI credentials — use instance principals, resource principals, or API key environment variables
- Always use compartments for resource isolation
- Every VCN must have separate security lists for public and private subnets
- Use dynamic groups with resource principals for OKE and Functions
- Tag all resources with defined tags (CostCenter, Environment, Project)
- Enable auto-backup on all Autonomous Databases
- Use private subnets with NAT for compute and OKE nodes
- Enable VCN flow logs for network monitoring
- Use OCI Vault for secrets instead of Terraform state or env vars
- Apply service limits and quotas governance with compartments

## References
- `references/core-services.md` — VCN, compute, block/object storage, LB, Vault
- `references/oke-kubernetes.md` — OKE cluster creation, node pools, VCN-native
- `references/database-services.md` — Autonomous DB, MySQL HeatWave, Exadata
- `references/security-iam.md` — IAM, Vault, Cloud Guard, WAF, Security Zone
- `references/serverless-integration.md` — Functions, API Gateway, Streaming, SCH

## Handoff
After completing this skill:
- Next skill: **database-migration** — migrate on-prem to OCI databases
- Pass context: compartment OCIDs, VCN ID, subnet IDs, KMS key OCID
