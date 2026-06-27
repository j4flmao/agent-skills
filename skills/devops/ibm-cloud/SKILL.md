---
name: ibm-cloud
description: >
  Use this skill when the user says 'ibm cloud', 'ibm cloud
  infrastructure', 'ibm cloud services', 'ibm cloud pak',
  'ibm cloud foundry', 'ibm cloud kubernetes', 'iks', 'ibm
  cloud satellite', 'ibm cloud schematics', 'ibm cloud terraform',
  'ibm cloud iam', 'ibm cloud vpc', 'ibm cloud vsi', 'ibm cloud
  load balancer', 'ibm cloud dns', 'ibm cloud direct link',
  'ibm cloud cos', 'ibm cloud object storage', 'ibm cloud
  databases', 'ibm cloud data engines', 'ibm cloud event
  streams', 'ibm cloud api gateway', 'ibm cloud functions',
  'ibm cloud code engine', 'ibm cloud monitoring', 'ibm cloud
  logging', 'ibm cloud activity tracker', 'ibm cloud security
  groups', 'ibm cloud acl', 'ibm cloud transit gateway',
  'watson', 'ibm cloud pak for data', 'ibm cloud pak for
  applications', 'ibm cloud pak for integration'.
  Covers: IBM Cloud VPC, IKS (Kubernetes), Object Storage, VSI,
  IAM, networking, terraform provider, Satellite, Schematics.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, ibm-cloud, cloud-provider, phase-4]
---

# IBM Cloud

## Purpose
Manage IBM Cloud resources: VPC infrastructure, IKS (Kubernetes), Object Storage, IAM, networking, and automation with Terraform and Schematics.

## Agent Protocol

### Trigger
Exact user phrases: "ibm cloud", "iks", "ibm kubernetes", "ibm vpc", "ibm cloud terraform", "ibm schematics", "ibm satellite", "ibm direct link", "ibm cloud object storage", "ibm cloud databases".

### Input Context
- IBM Cloud account and resource group structure.
- Region and multizone zones (MZR).
- Service requirements (VPC, IKS, COS, Databases).
- Automation preference (Terraform, Schematics, or CLI).
- IAM access groups and policies.

### Output Artifact
Terraform HCL or IBM Cloud CLI commands for resource provisioning.

### Response Format
Terraform HCL or ibmcloud CLI commands. No preamble.

### Completion Criteria
- [ ] VPC with subnets, ACLs, security groups, public gateway.
- [ ] IKS cluster with worker pools and ingress configuration.
- [ ] Object Storage instance with buckets and HMAC keys.
- [ ] IAM access groups and service IDs with policies.
- [ ] Direct Link or Transit Gateway configured.
- [ ] Monitoring with IBM Cloud Monitoring (Sysdig).
- [ ] Automation with Schematics workspaces.

### Max Response Length
400 lines.

## Quick Start
Create VPC with public/private subnets → Deploy IKS cluster with 3 worker nodes → Provision COS bucket with HMAC → Set up IAM access groups → Configure Direct Link for hybrid connectivity → Enable Monitoring and Logging.

## Decision Tree: IBM Cloud Compute Options
| Option | Use Case | Management |
|--------|----------|------------|
| **IKS (IBM Kubernetes Service)** | Containerized workloads | Managed control plane |
| **Code Engine** | Serverless containers, batch jobs | Fully managed, scale-to-zero |
| **VSI (Virtual Server Instance)** | Traditional apps, legacy | Self-managed OS |
| **Bare Metal** | High-performance, licensed DBs | Self-managed, dedicated |
| **Cloud Foundry** | PaaS apps (legacy) | Managed runtime |
| **Satellite** | Hybrid/edge, consistent services | IBM-managed control plane on customer hardware |

## Core Workflow

### Step 1: VPC Networking
```hcl
terraform {
  required_providers {
    ibm = {
      source  = "IBM-Cloud/ibm"
      version = "~> 1.65"
    }
  }
}

resource "ibm_is_vpc" "main" {
  name           = "vpc-prod"
  resource_group = data.ibm_resource_group.rg.id
  address_prefix_management = "manual"
}

resource "ibm_is_vpc_address_prefix" "prefix" {
  vpc  = ibm_is_vpc.main.id
  name = "prefix-zone1"
  cidr = "10.0.0.0/16"
}

resource "ibm_is_subnet" "public" {
  name           = "subnet-public"
  vpc            = ibm_is_vpc.main.id
  zone           = "${var.region}-1"
  ipv4_cidr_block = "10.0.1.0/24"
  public_gateway = ibm_is_public_gateway.main.id
}

resource "ibm_is_subnet" "private" {
  name           = "subnet-private"
  vpc            = ibm_is_vpc.main.id
  zone           = "${var.region}-1"
  ipv4_cidr_block = "10.0.2.0/24"
}
```

### Step 2: Security Groups and ACLs
```hcl
resource "ibm_is_security_group" "sg" {
  name           = "sg-web"
  vpc            = ibm_is_vpc.main.id
  resource_group = data.ibm_resource_group.rg.id
}

resource "ibm_is_security_group_rule" "http" {
  group     = ibm_is_security_group.sg.id
  direction = "inbound"
  remote    = "0.0.0.0/0"
  tcp {
    port_min = 80
    port_max = 80
  }
}

resource "ibm_is_security_group_rule" "https" {
  group     = ibm_is_security_group.sg.id
  direction = "inbound"
  remote    = "0.0.0.0/0"
  tcp {
    port_min = 443
    port_max = 443
  }
}

resource "ibm_is_network_acl" "nacl" {
  name = "nacl-public"
  vpc  = ibm_is_vpc.main.id
  rules {
    name        = "allow-all-outbound"
    action      = "allow"
    direction   = "outbound"
    source      = "0.0.0.0/0"
    destination = "0.0.0.0/0"
  }
}
```

### Step 3: IKS (IBM Kubernetes Service)
```hcl
resource "ibm_container_vpc_cluster" "cluster" {
  name              = "iks-prod"
  vpc_id            = ibm_is_vpc.main.id
  worker_count      = 3
  flavor            = "bx2.4x16"
  kube_version      = "1.28.9"
  resource_group_id = data.ibm_resource_group.rg.id
  zones {
    subnet_id = ibm_is_subnet.private.resource_crn
    name      = "${var.region}-1"
  }
  service_subnet = "172.16.0.0/16"
  pod_subnet     = "172.17.0.0/16"

  # ALB ingress controller
  public_service_endpoint  = true
  private_service_endpoint = true
}

resource "ibm_container_worker_pool" "pool" {
  cluster         = ibm_container_vpc_cluster.cluster.id
  worker_pool_name = "pool-gpu"
  flavor          = "gx2.8x64x1v100"
  worker_count    = 2
  zones {
    subnet_id = ibm_is_subnet.private.resource_crn
    name      = "${var.region}-1"
  }
}
```

### Step 4: Object Storage (COS)
```hcl
resource "ibm_resource_instance" "cos" {
  name              = "cos-prod"
  service           = "cloud-object-storage"
  plan              = "standard"
  location          = "global"
  resource_group_id = data.ibm_resource_group.rg.id
}

resource "ibm_cos_bucket" "bucket" {
  bucket_name           = "app-data-bucket"
  resource_instance_id  = ibm_resource_instance.cos.id
  region_location       = var.region
  storage_class         = "standard"
  force_delete          = true

  # Lifecycle rules
  lifecycle_rule {
    enabled = true
    id      = "archive-90d"
    expiration {
      days = 90
    }
  }
}

resource "ibm_cos_bucket" "archive" {
  bucket_name           = "app-archive-bucket"
  resource_instance_id  = ibm_resource_instance.cos.id
  region_location       = var.region
  storage_class         = "vault"
}
```

### Step 5: IAM Access Management
```hcl
resource "ibm_iam_access_group" "ops" {
  name        = "DevOpsEngineers"
  description = "DevOps engineering team"
}

resource "ibm_iam_access_group_policy" "ops_policy" {
  access_group_id = ibm_iam_access_group.ops.id
  roles           = ["Viewer", "Editor"]

  resources {
    resource_type = "resource-group"
    resource      = data.ibm_resource_group.rg.id
  }
}

resource "ibm_iam_access_group_policy" "ops_backup" {
  access_group_id = ibm_iam_access_group.ops.id
  roles           = ["Operator"]
  resource_attributes {
    name     = "serviceName"
    value    = "cloud-object-storage"
    operator = "stringEquals"
  }
}

# Service ID for automation
resource "ibm_iam_service_id" "ci" {
  name        = "ci-pipeline"
  description = "CI/CD pipeline service ID"
}

resource "ibm_iam_service_policy" "ci_policy" {
  iam_service_id = ibm_iam_service_id.ci.id
  roles          = ["Writer"]
  resources {
    resource_type = "bucket"
    resource      = ibm_cos_bucket.bucket.id
    service       = "cloud-object-storage"
  }
}
```

### Step 6: IBM Cloud Databases
```hcl
resource "ibm_resource_instance" "postgres" {
  name              = "postgres-prod"
  service           = "databases-for-postgresql"
  plan              = "standard"
  location          = var.region
  resource_group_id = data.ibm_resource_group.rg.id

  parameters = {
    members_cpu_allocation_count       = 6
    members_memory_allocation_mb        = 16384
    members_disk_allocation_mb         = 102400
    service_endpoints                  = "private"
    auto_scaling_enabled               = true
  }
}

resource "ibm_database" "redis" {
  resource_group_id = data.ibm_resource_group.rg.id
  name              = "redis-prod"
  plan              = "standard"
  location          = var.region
  service           = "databases-for-redis"
  adminpassword     = var.redis_password
  members_cpu_count = 2
  members_memory_mb = 8192
  members_disk_mb   = 51200
  service_endpoints = "private-only"
}
```

### Step 7: IBM Cloud Satellite (Hybrid)
```hcl
resource "ibm_satellite_location" "location" {
  location        = "edge-location-1"
  managed_from    = var.region
  resource_group_id = data.ibm_resource_group.rg.id
  zones {
    name     = "zone-1"
    provider = "ibm"
  }
}

resource "ibm_satellite_cluster" "cluster" {
  name         = "satellite-cluster"
  location     = ibm_satellite_location.location.id
  kube_version = "1.28.9"
  worker_count = 3
  host_labels  = {
    "env" = "production"
  }
}
```

### Step 8: Direct Link (Private Connectivity)
```hcl
resource "ibm_dl_gateway" "dl" {
  name           = "direct-link-primary"
  speed_mbps     = 1000
  customer_asn   = 65001
  bgp_base_cidr  = "10.200.0.0/30"
  bgp_ibm_cidr   = "10.200.0.1/30"
  cross_connect_router   = "LAB-xcr01.dal05"
  location      = "DAL05"
  resource_group = data.ibm_resource_group.rg.id
}
```

### Step 9: IBM Cloud Monitoring and Logging
```hcl
resource "ibm_resource_instance" "cloud_monitor" {
  name              = "monitoring-prod"
  service           = "sysdig-monitor"
  plan              = "graduated-tier"
  location          = var.region
  resource_group_id = data.ibm_resource_group.rg.id
  parameters = {
    default_receiver = true
    ingest_key       = var.sysdig_ingest_key
  }
}

resource "ibm_resource_instance" "logdna" {
  name              = "logging-prod"
  service           = "logdna"
  plan              = "graduated-tier"
  location          = var.region
  resource_group_id = data.ibm_resource_group.rg.id
  parameters = {
    default_receiver = true
    ingest_key       = var.logdna_ingest_key
  }
}
```

### Step 10: Event Notifications
```hcl
resource "ibm_resource_instance" "en" {
  name              = "event-notifications"
  service           = "event-notifications"
  plan              = "lite"
  location          = var.region
  resource_group_id = data.ibm_resource_group.rg.id
}

resource "ibm_en_topic" "alerts" {
  instance_guid = ibm_resource_instance.en.guid
  name          = "alerts-topic"
  description   = "Production alerts"
}

resource "ibm_en_destination" "pagerduty" {
  instance_guid = ibm_resource_instance.en.guid
  name          = "pagerduty-destination"
  type          = "push_android"
  config {
    params {
      api_key = var.pagerduty_api_key
    }
  }
}
```

## Rules
- Always use resource groups for resource isolation — never default resource group.
- Use private service endpoints for production databases and IKS.
- Every IKS cluster must have both public and private service endpoints enabled.
- COS buckets must have HMAC or IAM-based access — never anonymous.
- Tag all resources with cost-accounting tags (environment, project, owner).
- Enable Activity Tracker for audit logging on all production resources.
- Prefer reserved instances for steady-state compute to save up to 55%.
- Use IBM Cloud Shell for ephemeral CLI access without key management.
- Set budget alerts on all resource groups before deploying production workloads.
- Use Transit Gateway for connecting multiple VPCs instead of VPC peering.

## Production Considerations
- IBM Cloud regions use multizone regions (MZR) with 3 zones — deploy across all zones.
- IKS control plane is highly available across zones when using private service endpoints.
- COS cross-region buckets replicate to 3 regions — use for DR scenarios.
- Satellite locations require 3+ hosts for control plane HA.
- Direct Link supports 1 Gbps, 5 Gbps, and 10 Gbps connections at minimum.
- IBM Cloud Databases for PostgreSQL supports read replicas across zones.
- Use Code Engine for batch jobs and serverless workloads to reduce compute costs.
- VPC file shares are available via VPC file storage service (NFS).
- IAM trusted profiles allow assigning service IDs based on conditions.
- Activity Tracker routing: send to COS bucket for long-term retention.

## Anti-Patterns
- Using classic infrastructure (non-VPC) for new workloads — VPC is the future.
- No resource group tagging — cost allocation is opaque.
- Public service endpoints for databases — increases attack surface.
- Default COS storage class for everything — use vault/cold vault for archives.
- Manual IAM key rotation — automate with Terraform or CLI scripts.
- Single-zone IKS cluster — no HA, downtime during zone maintenance.
- No Activity Tracker — can't audit changes for compliance.
- Using IBM Cloud Internet Services without CDN caching configuration.
- VPC peering for multi-VPC connectivity — Transit Gateway scales better.
- Ignoring IBM Cloud Secrets Manager — plaintext API keys in code.

## References
  - references/iks-kubernetes.md — IKS Cluster and Worker Pool Management
  - references/ibm-vpc-networking.md — VPC, Subnets, ACLs, Security Groups
  - references/ibm-cloud-advanced.md — IBM Cloud Advanced Topics
  - references/ibm-cloud-fundamentals.md — IBM Cloud Fundamentals
  - references/ibm-satellite.md — Satellite for Hybrid Deployments
  - references/ibm-cos.md — Cloud Object Storage Configuration
## Handoff
- `devops-kubernetes` for workload deployment on IKS clusters.
- `devops-terraform` for Terraform state and module patterns for IBM Cloud.
- `devops-hybrid-cloud` for connectivity between IBM Cloud and on-prem/other clouds.
- `devops-backup-dr` for backup strategies using IBM Cloud services.
- `devops-observability` for monitoring and logging integration with IBM Cloud.

## Architecture Decision Trees

### IBM Cloud IKS vs OpenShift

| Decision | IKS (IBM Kubernetes Service) | OpenShift (ROKS) |
|---|---|---|
| Management | IBM-managed control plane | Red Hat managed |
| Container runtime | containerd | CRI-O (OpenShift) |
| Networking | IBM Cloud VLAN + Calico | OpenShift SDN (OVN-K8s) |
| Developer tooling | kubectl, standard K8s | oc, Web Console, Operators |
| Security | IBM Cloud IAM + RBAC | SCC + built-in cert rotation |
| Best for | Standard K8s workloads | Enterprise, compliance-heavy |

### Cloud Object Storage vs Block Storage

| Aspect | COS (Object Storage) | Block Storage |
|---|---|---|
| Access | REST API (HTTP/S) | iSCSI volume mount |
| Throughput | Scales with concurrent requests | Single volume limit |
| Use case | Backup, archival, data lake | Databases, stateful apps |
| Capacity | Effectively unlimited | Up to 2 TB per volume |
| Cost | Low, pay-per-GB-stored | Higher, provisioned IOPS |

## Implementation Patterns

### Terraform: IBM Cloud VPC with IKS Cluster

```hcl
resource "ibm_is_vpc" "main" {
  name = "production-vpc"
}

resource "ibm_is_subnet" "workers" {
  count         = 3
  name          = "workers-${count.index + 1}"
  vpc           = ibm_is_vpc.main.id
  zone          = "us-south-${count.index + 1}"
  ipv4_cidr_block = cidrsubnet(var.vpc_cidr, 4, count.index)
}

resource "ibm_container_vpc_cluster" "iks" {
  name              = "production-iks"
  vpc_id            = ibm_is_vpc.main.id
  worker_count      = 3
  flavor            = "bx2.4x16"
  kube_version      = "1.28"
  update_all_workers = true
  zones {
    subnet_id = ibm_is_subnet.workers[0].id
    name      = "us-south-1"
  }
  zones {
    subnet_id = ibm_is_subnet.workers[1].id
    name      = "us-south-2"
  }
  zones {
    subnet_id = ibm_is_subnet.workers[2].id
    name      = "us-south-3"
  }
}

resource "ibm_resource_instance" "cos" {
  name     = "app-backup-cos"
  service  = "cloud-object-storage"
  plan     = "standard"
  location = "global"
}
```

### Bash: IBM Cloud CLI Automation

```bash
#!/usr/bin/env bash
ibmcloud_login() {
  ibmcloud login --apikey "$IBM_CLOUD_API_KEY" -r us-south -g production
}

iks_credentials() {
  local cluster=$1
  ibmcloud ks cluster config --cluster "$cluster" --admin
  export KUBECONFIG="${HOME}/.bluemix/plugins/container-service/clusters/${cluster}/kube-config-prod.yaml"
}

list_all_resources() {
  ibmcloud resource service-instances --all-resource-groups \
    --output json | jq -r '.[].name'
}
```

## Production Considerations

- Enable **IBM Cloud Activity Tracker** for all API events with LogDNA integration
- Use **IAM trusted profiles** for compute resources instead of hardcoded service IDs
- Deploy **IKS clusters** with at least 3 worker nodes across different zones for HA
- Configure **IBM Cloud Backup** (Veeam-powered) for all block storage volumes
- Enable **HSM** (IBM Cloud Hyper Protect Crypto Services) for FIPS 140-2 Level 3 key management
- Use **Cloud Internet Services** (CIS) for DDoS protection and global load balancing
- Implement **IBM Cloud Security and Compliance Center** for continuous posture assessment

## Anti-Patterns

- Using **classic infrastructure** (non-VPC) for new deployments — VPC is the future on IBM Cloud
- Ignoring **IAM resource groups** — without them, RBAC becomes unmanageable at scale
- Storing **API keys in source code** — use IBM Cloud Secrets Manager or IAM trusted profiles
- Using **default worker pool** sizing — IOPS and memory profiles need workload-specific tuning
- Skipping **Key Protect** — all data at rest should use customer-managed KMS keys
- Over-provisioning **COS buckets** — plan bucket naming convention and lifecycle policies ahead
- Managing **IPSec VPNs** manually — use IBM Cloud Transit Gateway for site-to-site connectivity

## Performance Optimization

- Use **IBM Cloud Hyper Protect Virtual Servers** for sensitive workloads requiring isolation
- Enable **COS accelerate** configuration for high-throughput data transfer to compute regions
- Choose **dedicated IBM Cloud hosts** for predictable performance in IKS clusters
- Optimize **COS multipart uploads** with 100 MB part size for large file transfers
- Use **CDN (Akamai via CIS)** for static asset delivery with POPs in every region
- Right-size **IKS worker node flavors** — monitor CPU/memory and adjust worker pool instance types
- Configure **IBM Cloud Databases for etcd** with autoscaling for K8s control plane durability

## Security Considerations

- Enable **IBM Cloud Flow Logs** on all VPC subnets for network traffic analysis
- Use **IAM access groups** with least-privilege policies rather than per-user permissions
- Rotate **IBM Cloud API keys** every 30 days and use short-lived IAM tokens in automation
- Encrypt **COS buckets** with IBM Key Protect and enable Object Lock for immutability
- Enable **Hyper Protect Crypto Services** for applications requiring HSM-backed keys
- Deploy **IBM Cloud Internet Services** WAF for all web-facing applications
- Audit **IAM policy changes** with Activity Tracker alerts for privilege escalation attempts
## Implementation Patterns

### Observer Pattern for Event Handling
`
interface EventObserver<T> {
  onEvent(event: T): Promise<void>;
}

class EventBus<T> {
  private observers: Set<EventObserver<T>> = new Set();
  subscribe(observer: EventObserver<T>): void {
    this.observers.add(observer);
  }
  unsubscribe(observer: EventObserver<T>): void {
    this.observers.delete(observer);
  }
  async emit(event: T): Promise<void> {
    const results = Array.from(this.observers).map(o => o.onEvent(event));
    await Promise.allSettled(results);
  }
}
`

### Configuration-Driven Approach
`
config:
  defaults:
    timeout: 30s
    retryCount: 3
  overrides:
    production:
      timeout: 60s
      retryCount: 5
    development:
      timeout: 300s
      retryCount: 1
`

## Production Considerations

### Deployment Checklist
- [ ] Configuration validated against schema before startup
- [ ] Health check endpoints registered and monitored
- [ ] Graceful shutdown with draining period (30s timeout)
- [ ] Resource limits configured (CPU, memory, file descriptors)
- [ ] Log level set appropriate for environment
- [ ] Metrics endpoint secured and exposed
- [ ] Rate limiting configured per-tier
- [ ] TLS certificates valid and auto-renewing
- [ ] Database migrations run as separate deployment step
- [ ] Feature flags ready for gradual rollout

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% over 5min | Critical | Page on-call |
| p99 latency | > 2s over 5min | Warning | Investigate |
| Throughput drop | > 50% over 1min | Critical | Check upstream |
| Queue depth | > 1000 over 1min | Warning | Scale consumers |
| Disk usage | > 85% | Warning | Clean or expand |
| Memory usage | > 90% heap | Critical | Restart or scale |

## Anti-Patterns

| Anti-Pattern | Symptom | Root Cause | Solution |
|-------------|---------|------------|----------|
| Premature optimization | Complex code for no measured benefit | Guessing instead of profiling | Measure first, optimize based on data |
| Copy-paste reuse | Duplicate code across codebase | Lack of abstraction | Extract shared logic into libraries |
| Gold-plating | Features with no current requirement | Over-engineering | YAGNI — build what's needed now |
| Magical thinking | Assumptions without validation | Skipping error handling | Handle all failure modes explicitly |

## Performance Optimization

### Caching Strategy
Cache hierarchy: L1 (in-memory local) → L2 (distributed Redis/Memcached) → L3 (CDN/Edge).
Cache invalidation: TTL-based (simple, stale), event-based (complex, fresh), write-through (consistent, higher write latency), write-behind (fast writes, eventual consistency).

### Resource Pooling
- Database connections: Pool of reusable connections (HikariCP, pgBouncer)
- HTTP connections: Keep-alive + connection pooling for external calls
- Thread pool: Bounded thread pools for async task execution

### Profiling Methodology
1. Establish baseline with production traffic profile
2. Profile CPU with sampling profiler (pprof, perf, async-profiler)
3. Profile memory with heap dumps and allocation tracking
4. Profile I/O with strace/perf trace for syscall analysis
5. Profile latency with distributed tracing (OpenTelemetry)
6. Identify bottleneck, formulate hypothesis, implement fix
7. Re-profile to verify improvement, repeat

## Security Considerations

### Threat Modeling (STRIDE)
- Spoofing: Identity validation, authentication
- Tampering: Integrity checks, digital signatures
- Repudiation: Audit logs, non-repudiation
- Information disclosure: Encryption, access control
- Denial of service: Rate limiting, resource quotas
- Elevation of privilege: Principle of least privilege

### Supply Chain Security
- Dependency scanning: Snyk, Dependabot, Trivy
- SBOM generation: CycloneDX or SPDX format
- Signed commits: GPG or SSH commit signing
- Artifact verification: Checksum validation, signature verification

### Secrets Management
- Secrets never in code — always in secrets manager (Vault, AWS Secrets Manager)
- Rotation policy: Rotate database credentials every 90 days
- Access audit: Log every secrets access, alert on anomalies
- Encryption at rest and in transit for all secrets
- Principle of least privilege: each service gets only its own secrets

## Rules
- Default-deny security posture — allow only explicitly required access.
- All inputs validated, all outputs encoded, all errors handled.
- Defend in depth — multiple layers of security controls.
- Fail securely — errors default to safe behavior.
- Log security-relevant events for audit and investigation.
- Keep dependencies updated — automate vulnerability scanning.
- Design for observability from day one, not as an afterthought.
- Document all architectural decisions with rationale.
- Review code for security, performance, and correctness before merging.