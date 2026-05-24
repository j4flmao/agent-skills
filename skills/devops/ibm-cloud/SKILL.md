---
name: ibm-cloud
description: >
  Use this skill when the user says 'IBM Cloud', 'IBM', 'IKS', 'OpenShift',
  'Code Engine', 'Cloud Foundry', 'VPC', 'VSI', 'Cloud Object Storage',
  'IBM Db2', 'Terraform IBM', 'ibmcloud CLI', 'Container Registry', 'Secrets
  Manager'. Covers: core IBM Cloud services, IKS, OpenShift, VPC/compute,
  Cloud Foundry, Code Engine serverless, COS, databases.
  Do NOT use this for: AWS, Azure, GCP, or other cloud providers.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, cloud, ibm-cloud, infrastructure, phase-5]
---

# IBM Cloud

## Purpose
Design, deploy, and manage IBM Cloud infrastructure using Terraform, ibmcloud CLI, and best practices for Kubernetes (IKS/OpenShift), VPC/compute, Cloud Foundry, Code Engine, and storage/databases.

## Agent Protocol

### Trigger
Exact user phrases: "IBM Cloud", "IBM", "IKS", "OpenShift", "Code Engine", "Cloud Foundry", "VPC", "VSI", "Cloud Object Storage", "IBM Db2", "Terraform IBM", "ibmcloud CLI", "Container Registry", "Secrets Manager".

### Input Context
Before activating, verify:
- IBM Cloud account and resource group structure.
- Region and multi-zone region (us-south, eu-de, eu-gb, jp-tok).
- Authentication method (IAM API key, ibmcloud CLI, Trusted Profile).
- Compliance requirements (HIPAA, SOC2, PCI, FS Cloud).

### Output Artifact
Writes to Terraform HCL, ibmcloud CLI commands, Kubernetes manifests, Cloud Foundry manifest YAML, Code Engine configuration.

### Response Format
HCL, YAML, or CLI commands with no extraneous explanation.

No preamble. No postamble. No explanations. No filler/hedging/transitions.

### Completion Criteria
This skill is complete when:
- [ ] VPC with subnets, security groups, and public gateway is configured.
- [ ] IKS or OpenShift cluster is provisioned with worker pools.
- [ ] Cloud Foundry app or Code Engine project is deployed.
- [ ] Cloud Object Storage bucket with IBM Db2 or PostgreSQL is provisioned.
- [ ] Monitoring (IBM Cloud Monitoring) and logging (Log Analysis) are configured.

## Quick Start
Resource group → VPC with 3 subnets in a multi-zone region → IKS cluster with 2 worker pools → COS bucket for backup → Cloud Foundry app with Auto-Scaling → Code Engine job for batch processing.

## Core Workflow

### Step 1: VPC and Compute
```hcl
# Terraform: VPC with subnets, public gateway, and VSI
resource "ibm_is_vpc" "main" {
  name = "production-vpc"
}

resource "ibm_is_public_gateway" "gw" {
  name = "main-gateway"
  vpc  = ibm_is_vpc.main.id
  zone = "us-south-1"
}

resource "ibm_is_subnet" "app" {
  name            = "app-subnet"
  vpc             = ibm_is_vpc.main.id
  zone            = "us-south-1"
  ipv4_cidr_block = "10.0.1.0/24"
  public_gateway  = ibm_is_public_gateway.gw.id
}

resource "ibm_is_security_group" "web" {
  name = "web-sg"
  vpc  = ibm_is_vpc.main.id
}

resource "ibm_is_security_group_rule" "web_http" {
  group     = ibm_is_security_group.web.id
  direction = "inbound"
  remote    = "0.0.0.0/0"
  tcp {
    port_min = 80
    port_max = 80
  }
}

resource "ibm_is_security_group_rule" "web_https" {
  group     = ibm_is_security_group.web.id
  direction = "inbound"
  remote    = "0.0.0.0/0"
  tcp {
    port_min = 443
    port_max = 443
  }
}

resource "ibm_is_instance" "app" {
  name    = "app-vsi-1"
  vpc     = ibm_is_vpc.main.id
  zone    = "us-south-1"
  profile = "bx2-4x16"

  primary_network_interface {
    subnet          = ibm_is_subnet.app.id
    security_groups = [ibm_is_security_group.web.id]
  }

  keys = [ibm_is_ssh_key.terraform.id]
  image = data.ibm_is_image.ubuntu.id
}
```

### Step 2: IKS (IBM Kubernetes Service)
```hcl
resource "ibm_container_vpc_cluster" "iks" {
  name              = "production-iks"
  vpc_id            = ibm_is_vpc.main.id
  flavor            = "bx2.4x16"
  worker_count      = 3
  resource_group_id = data.ibm_resource_group.default.id
  zones {
    subnet_id = ibm_is_subnet.app.id
    name      = "us-south-1"
  }
  wait_till = "OneWorkerNodeReady"

  kube_version = "1.30.5"
}

resource "ibm_container_worker_pool" "gpu_pool" {
  cluster         = ibm_container_vpc_cluster.iks.id
  resource_group_id = data.ibm_resource_group.default.id
  worker_pool_name = "gpu-pool"
  flavor           = "gx2.8x64x1v100"
  worker_count     = 2

  zones {
    subnet_id = ibm_is_subnet.app.id
    name      = "us-south-1"
  }
}
```

### Step 3: Cloud Foundry
```yaml
# manifest.yml
applications:
- name: api-app
  memory: 512M
  instances: 3
  disk_quota: 1G
  buildpack: sdk-for-nodejs
  command: npm start
  random-route: false
  routes:
  - route: api.myapp.example.com
  services:
  - my-db-instance
  env:
    NODE_ENV: production
    OPTIMIZE_MEMORY: "true"
---
# Auto-scaling policy (configured via ibmcloud CLI)
# ibmcloud app-autoscaler policy-update api-app --policy-file scaling-policy.json
{
  "instance_min_count": 2,
  "instance_max_count": 10,
  "scaling_rules": [
    {
      "metric_type": "cpu",
      "stat_window_seconds": 120,
      "breach_duration_seconds": 300,
      "threshold": 70,
      "operator": ">=",
      "cool_down_seconds": 120,
      "adjustment": "+1"
    },
    {
      "metric_type": "memory",
      "stat_window_seconds": 120,
      "breach_duration_seconds": 300,
      "threshold": 85,
      "operator": ">=",
      "cool_down_seconds": 120,
      "adjustment": "+1"
    }
  ]
}
```

### Step 4: Code Engine (Serverless)
```hcl
resource "ibm_code_engine_project" "serverless" {
  name              = "serverless-app"
  resource_group_id = data.ibm_resource_group.default.id
}

resource "ibm_code_engine_app" "api" {
  project_id = ibm_code_engine_project.serverless.id
  name       = "api-service"
  image_reference = "us.icr.io/myapp/api:latest"
  scale_min_instances = 1
  scale_max_instances = 10
  scale_cpu_limit     = "2"
  scale_memory_limit  = "4G"
  run_env = {
    "LOG_LEVEL" = "info"
  }
}

resource "ibm_code_engine_job" "batch" {
  project_id = ibm_code_engine_project.serverless.id
  name       = "nightly-batch"
  image_reference = "us.icr.io/myapp/batch:latest"
  scale_cpu_limit    = "4"
  scale_memory_limit = "8G"
  run_env = {
    "JOB_TYPE" = "nightly"
  }
}
```

### Step 5: Cloud Object Storage
```hcl
resource "ibm_resource_instance" "cos" {
  name              = "app-cos"
  service           = "cloud-object-storage"
  plan              = "standard"
  location          = "global"
  resource_group_id = data.ibm_resource_group.default.id
}

resource "ibm_cos_bucket" "backups" {
  bucket_name          = "app-backups-prod"
  resource_instance_id = ibm_resource_instance.cos.id
  region_location      = "us-south"
  storage_class        = "smart"

  resource "ibm_cos_bucket_lifecycle_configuration" "backups" {
    bucket_crn      = ibm_cos_bucket.backups.crn
    resource_instance_id = ibm_resource_instance.cos.id
    lifecycle_rule {
      rule_id = "expire-old"
      enable  = true
      expiration {
        days = 90
      }
    }
  }
}
```

## Rules & Constraints
- Never hardcode IBM Cloud credentials — use IAM API key environment variables or ibmcloud CLI
- Always use resource groups for resource organization and access control
- VPC flow logs must be enabled for production VPCs
- IKS clusters should use KMS encryption with IBM Key Protect
- Enable auto-scaling for Cloud Foundry apps in production
- COS buckets must have public access blocked by default
- Use Secrets Manager for database passwords and API keys
- Tag all resources with Resource Group, Environment, and Owner metadata
- Prefer multi-zone regions (MZR) for HA deployments

## References
- `references/ibm-kubernetes.md` — IKS, OpenShift, worker nodes, ingress, logging
- `references/vpc-compute.md` — VPC, subnets, security groups, VSIs, LB, VPN
- `references/cloud-foundry.md` — Cloud Foundry, Code Engine, buildpacks
- `references/cos-databases.md` — COS, IBM Db2, PostgreSQL, backup/DR

## Handoff
After completing this skill:
- Next skill: **observability** — Monitoring, logging, and alerting with IBM Cloud
- Pass context: VPC ID, cluster ID/name, COS bucket CRN, resource group ID
