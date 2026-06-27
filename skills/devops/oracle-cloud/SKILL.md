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

## Architecture Decision Trees

### OCI IAM vs Federation

| Decision | OCI Native IAM | Federated (SSO/OIDC) |
|---|---|---|
| User management | OCI console, manual | Central IdP (Okta, Azure AD) |
| MFA | OCI built-in MFA | IdP-managed MFA |
| Group sync | Manual or API | SCIM provisioning |
| Audit trail | OCI Audit logs | IdP audit + OCI Audit |
| Complexity | Lower (in-platform) | Higher (IdP setup + mapping) |
| Best for | Small teams, isolated OCI | Enterprise with SSO requirement |

### Compute Shapes: AMD vs ARM (Ampere)

| Aspect | AMD (Standard) | ARM / Ampere A1 |
|---|---|---|
| vCPU ratio | 1:2 per core | 1:1 per core |
| Price-performance | Baseline | 20-40% better for scale-out |
| Software compat | Universal | Requires ARM64 builds |
| GPU support | Available | Not available |
| Best for | General workloads, legacy | Containerized, web, K8s nodes |

## Implementation Patterns

### Terraform: OCI VCN with Public and Private Subnets

```hcl
resource "oci_identity_compartment" "prod" {
  name        = "production"
  description = "Production compartment"
}

resource "oci_core_vcn" "main" {
  compartment_id = oci_identity_compartment.prod.id
  display_name   = "production-vcn"
  cidr_block     = "10.0.0.0/16"
  dns_label      = "prod"

  defined_tags = {
    "Operations.CostCenter" = "12345"
  }
}

resource "oci_core_subnet" "public" {
  compartment_id    = oci_identity_compartment.prod.id
  vcn_id            = oci_core_vcn.main.id
  cidr_block        = "10.0.1.0/24"
  display_name      = "public-lb"
  security_list_ids = [oci_core_security_list.lb.id]
  route_table_id    = oci_core_route_table.public.id
  dhcp_options_id   = oci_core_dhcp_options.main.id
  dns_label         = "public"
  prohibit_public_ip_on_vnic = false
}

resource "oci_core_subnet" "private" {
  compartment_id    = oci_identity_compartment.prod.id
  vcn_id            = oci_core_vcn.main.id
  cidr_block        = "10.0.2.0/24"
  display_name      = "private-app"
  security_list_ids = [oci_core_security_list.app.id]
  route_table_id    = oci_core_route_table.private.id
  dhcp_options_id   = oci_core_dhcp_options.main.id
  dns_label         = "private"
  prohibit_public_ip_on_vnic = true
}

resource "oci_core_instance" "app" {
  compartment_id  = oci_identity_compartment.prod.id
  display_name    = "app-server-01"
  shape           = "VM.Standard.A1.Flex"
  shape_config {
    ocpus         = 4
    memory_in_gbs = 24
  }
  source_details {
    source_type = "image"
    source_id   = var.ol8_image_id
  }
  create_vnic_details {
    subnet_id = oci_core_subnet.private.id
    assign_public_ip = false
  }
  metadata = {
    ssh_authorized_keys = var.ssh_public_key
  }
}
```

### Bash: OCI CLI Automation for OKE

```bash
#!/usr/bin/env bash
oci_login() {
  oci session authenticate --region us-ashburn-1
}

oke_kubeconfig() {
  local cluster_id=$1
  oci ce cluster create-kubeconfig \
    --cluster-id "$cluster_id" \
    --file "${HOME}/.kube/oke-config" \
    --region us-ashburn-1 \
    --token-version 2.0.0
  export KUBECONFIG="${HOME}/.kube/oke-config"
}

list_compartments() {
  oci iam compartment list \
    --compartment-id-in-subtree true \
    --all \
    --query 'data[*].{Name:name, Id:id, State:"lifecycle-state"}' \
    --output table
}
```

## Production Considerations

- Use **compartments** for resource isolation per team/environment with IAM policies at compartment level
- Enable **OCI Cloud Guard** target on every compartment for threat detection and misconfiguration alerts
- Configure **Vault (KMS)** for encryption keys — encrypt all block volumes, object storage, and databases
- Deploy **OKE clusters** with `--pod-cidr` and `--service-cidr` that don't overlap with on-prem or VCN ranges
- Use **Flex shapes** (VM.Standard.E5.Flex) for most workloads — better price-performance than fixed shapes
- Set up **budgets** at compartment level with threshold alerts to Slack/email
- Enable **VCN Flow Logs** for network traffic analysis and security investigation

## Anti-Patterns

- Using **root compartment** for all resources — prevents fine-grained IAM and cost tracking
- Exposing **database ports (1521, 3306)** to 0.0.0.0/0 in security lists — always scope to app subnet
- Skipping **OCI Vulnerability Scanning Service** — containers and OS images should be scanned weekly
- Using **burstable shapes** (VM.Standard.E2.1.Micro) for production — they throttle CPU under load
- Ignoring **block volume backups** — enable automatic backups with 7-day retention as minimum
- Applying **broad IAM policies** at tenancy level — use compartment-level policies with conditions
- Over-provisioning **boot volumes** (default 50 GB) — resize only when needed to avoid waste

## Performance Optimization

- Use **DenseIO shapes** for database and analytics workloads requiring high local NVMe performance
- Enable **FastConnect** for dedicated, low-latency connectivity to OCI regions
- Configure **load balancer** with session persistence and health checks for zero-downtime deployments
- Use **OCI Object Storage** with standard tier for frequently accessed data, infrequent tier for logs
- Tune **OKE worker node shapes** by workload: `VM.Standard.E5.Flex` for general, `BM.Optimized3.36` for AI/ML
- Enable **autoscaling** on OKE node pools with cluster autoscaler and spot instances for batch workloads
- Use **OCI Cache (Redis)** for session state and query result caching instead of local instance storage

## Security Considerations

- Enable **OCI Identity Domain** with MFA for all console users — enforce password policies
- Use **resource principal** (instance principals) for OKE and Compute VMs — never store API keys
- Restrict **object storage bucket access** with pre-authenticated requests (PAR) and least-privilege policies
- Rotate **OCI API keys** every 90 days and use API key versioning for key rotation without downtime
- Enable **Cloud Guard** with detector recipes for storage, networking, and IAM misconfigurations
- Use **Vault (HSM)** for master encryption keys and auto-rotate DEKs every 180 days
- Audit **IAM policy changes** with OCI Audit logs and stream to OCI Object Storage for retention
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