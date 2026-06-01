---
name: alibaba-cloud
description: >
  Use this skill when the user says 'Alibaba Cloud', 'Aliyun', 'ECS', 'ACK',
  'OSS', 'SLB', 'RDS', 'ApsaraDB', 'Alibaba Cloud Kubernetes', 'Container Service',
  'VPC', 'Security Group', 'Resource Access Management', 'RAM',
  'Terraform Alibaba Cloud', 'terraform alicloud'.
  Covers: compute (ECS, ECI), container orchestration (ACK, ASK),
  networking (VPC, SLB, PrivateLink), storage (OSS, NAS, block storage),
  database (RDS, PolarDB, Redis), security (RAM, KMS, WAF),
  serverless (FC, SAE), and cost optimization.
  Do NOT use for: AWS, GCP, Azure, or other cloud providers.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, alibaba-cloud, cloud, infrastructure, phase-5]
---

# Alibaba Cloud (Aliyun)

## Purpose
Design, deploy, and manage Alibaba Cloud infrastructure using Terraform/Alibaba Cloud CLI with security, cost optimization, and operational excellence.

## Agent Protocol

### Trigger
Exact user phrases: "Alibaba Cloud", "Aliyun", "ECS", "ACK", "OSS", "SLB", "RDS", "ApsaraDB", "Alibaba Cloud Kubernetes", "Container Service", "VPC", "RAM", "terraform alicloud", "aliyun cli".

### Input Context
Before activating, verify:
- Region and zone preference (Alibaba Cloud has 30+ regions; China regions require ICP license).
- Service type needed: compute (ECS/ECI), container (ACK/ASK), serverless (FC/SAE).
- Authentication method (RAM user key, STS token, RAM role).
- Compliance requirements (ISO 27001, SOC 2, PCI DSS, MLPS in China).
- Network topology (VPC with NAT gateway vs Internet gateway, VPN/CEN for hybrid).

### Output Artifact
Writes to Terraform HCL (alicloud provider), Alibaba Cloud CLI commands, RAM policies, YAML for ACK/ASK deployments, and ROS (Resource Orchestration Service) templates.

### Response Format
Terraform HCL, RAM policy JSON, ACK YAML, or CLI commands. No extraneous explanation.

No preamble. No postamble. No explanations. No filler/hedging/transitions.

### Completion Criteria
- [ ] Core infrastructure defined (VPC, subnets, security groups, NAT gateway).
- [ ] RAM roles and policies follow least privilege.
- [ ] Cost optimization with Pay-As-You-Go or subscription billing applied.
- [ ] High availability across multiple zones (at least 2 zones).
- [ ] Monitoring and alerting configured (CloudMonitor, ActionTrail).

### Max Response Length
Direct file write. No response text.

## Architecture Decision Trees

### Compute: ECS vs ECI vs ACK vs SAE vs FC
| Workload Profile | Recommended Service | Key Consideration |
|---|---|---|
| Stateful VM, custom OS | ECS (Elastic Compute Service) | Full OS control, dedicated instance |
| Batch job, short-lived container | ECI (Elastic Container Instance) | Serverless container, pay-per-second |
| Kubernetes orchestration | ACK (Container Service for K8s) | Managed K8s, integrates with SLB/NAS |
| Serverless K8s (no nodes) | ASK (Serverless K8s) | No node management, auto-scaling |
| Microservices on K8s | SAE (Serverless App Engine) | War/Jar/Image deploy, auto-scaling |
| Event-driven function | FC (Function Compute) | Pay-per-invocation, HTTP/OSS triggers |

### Database: RDS vs PolarDB vs Redis vs MongoDB vs HBase
| Requirement | Recommended | Reason |
|---|---|---|
| MySQL/PostgreSQL compatible | RDS or PolarDB | PolarDB has 6x MySQL throughput |
| High-throughput OLTP | PolarDB-X | Distributed SQL, auto-sharding |
| In-memory cache | ApsaraDB for Redis | Redis-compatible, 256GB max |
| Document store | ApsaraDB for MongoDB | MongoDB 4.x/5.x compatible |
| Wide-column analytics | ApsaraDB for HBase | HBase compatible, hot/cold separation |

### Networking: Internet vs NAT vs VPN vs CEN
| Scenario | Solution | Cost |
|---|---|---|
| Public-facing services | Internet Gateway + SLB | ~$0.02/GB data transfer |
| Outbound-only egress | NAT Gateway | ~$0.05/GB + hourly fee |
| Site-to-site VPN | VPN Gateway (IPsec) | ~$0.03/hour |
| Multi-region private network | Cloud Enterprise Network (CEN) | ~$0.01/GB intra-region |
| Private Link to services | PrivateLink | No public IP needed |

## Quick Start
VPC with public/private subnets across 2 zones → RAM role with least privilege → ECS/ACK in private subnets → OSS bucket with versioning → CloudMonitor alerts → Cost tags on all resources.

## Core Workflow

### Step 1: VPC and Networking
```hcl
# Terraform: VPC with public + private subnets across 2 zones
terraform {
  required_providers {
    alicloud = {
      source  = "aliyun/alicloud"
      version = "~> 1.209.0"
    }
  }
}

provider "alicloud" {
  region = "cn-hangzhou"
}

resource "alicloud_vpc" "main" {
  vpc_name   = "main-vpc"
  cidr_block = "10.0.0.0/16"
}

resource "alicloud_vswitch" "public" {
  count             = 2
  vpc_id            = alicloud_vpc.main.id
  cidr_block        = "10.0.${count.index}.0/24"
  zone_id           = data.alicloud_zones.available.zones[count.index].id
  vswitch_name      = "public-${count.index}"
}

resource "alicloud_vswitch" "private" {
  count             = 2
  vpc_id            = alicloud_vpc.main.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  zone_id           = data.alicloud_zones.available.zones[count.index].id
  vswitch_name      = "private-${count.index}"
}

resource "alicloud_nat_gateway" "ngw" {
  vpc_id           = alicloud_vpc.main.id
  specification    = "Small"
  nat_gateway_name = "main-nat"
}
```

### Step 2: RAM Roles and Policies
```json
{
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "oss:GetObject",
        "oss:ListObjects",
        "oss:PutObject"
      ],
      "Resource": [
        "acs:oss:*:*:my-app-assets",
        "acs:oss:*:*:my-app-assets/*"
      ],
      "Condition": {
        "StringEquals": {
          "acs:SourceAccount": "1234567890123456"
        }
      }
    },
    {
      "Effect": "Deny",
      "Action": ["oss:DeleteObject"],
      "Resource": ["acs:oss:*:*:my-app-assets/backup/*"]
    }
  ],
  "Version": "1"
}
```

### Step 3: ECS Instance with Auto Scaling
```hcl
resource "alicloud_security_group" "app" {
  name   = "app-sg"
  vpc_id = alicloud_vpc.main.id
}

resource "alicloud_security_group_rule" "allow_http" {
  type              = "ingress"
  ip_protocol       = "tcp"
  nic_type          = "intranet"
  policy            = "accept"
  port_range        = "80/80"
  priority          = 1
  security_group_id = alicloud_security_group.app.id
  cidr_ip           = "0.0.0.0/0"
}

resource "alicloud_ecs_auto_snapshot_policy" "daily" {
  name            = "daily-snapshots"
  repeat_weekdays = ["1", "2", "3", "4", "5", "6", "7"]
  retention_days  = 7
  time_points     = ["1"]
}

resource "alicloud_ess_scaling_group" "app" {
  scaling_group_name = "app-asg"
  min_size           = 2
  max_size           = 10
  default_cooldown   = 300
  vswitch_ids        = alicloud_vswitch.private[*].id
  removal_policies   = ["OldestInstance", "NewestInstance"]
}

resource "alicloud_ess_scaling_configuration" "app" {
  scaling_group_id  = alicloud_ess_scaling_group.app.id
  image_id          = "aliyun_3_x64_20G_alibase_2023_v2"
  instance_type     = "ecs.g6.large"
  security_group_id = alicloud_security_group.app.id
  system_disk_category = "cloud_essd"
  system_disk_size     = 40
  internet_max_bandwidth_in  = 5
  internet_max_bandwidth_out = 0
  active = true
  enable = true
}
```

### Step 4: OSS with Best Practices
```hcl
resource "alicloud_oss_bucket" "assets" {
  bucket = "my-app-assets-production"
  acl    = "private"

  lifecycle_rule {
    id      = "archive"
    enabled = true
    prefix  = "logs/"
    transitions {
      days          = 90
      storage_class = "Archive"
    }
    expiration {
      days = 365
    }
  }

  versioning {
    status = "Enabled"
  }

  server_side_encryption_rule {
    sse_algorithm = "KMS"
    kms_master_key_id = alicloud_kms_key.oss.id
  }
}

resource "alicloud_oss_bucket_public_access_block" "assets" {
  bucket              = alicloud_oss_bucket.assets.id
  block_public_access = true
}
```

### Step 5: Container Service for Kubernetes (ACK)
```hcl
resource "alicloud_cs_managed_kubernetes" "ack" {
  name                   = "my-ack-cluster"
  cluster_spec           = "ack.pro.small"
  worker_vswitch_ids     = alicloud_vswitch.private[*].id
  worker_instance_types  = ["ecs.g6.large"]
  worker_number          = 3
  password               = var.ack_node_password
  pod_cidr               = "172.16.0.0/16"
  service_cidr           = "172.17.0.0/20"
  new_nat_gateway        = false
  slb_internet_enabled   = false
  slb_internet_charge_type = "PayByBandwidth"
  enable_ssh             = false
  node_port_range        = "30000-32767"
  kube_config            = var.kube_config_path
  maintenance_window {
    enable        = true
    weekly_period = "Monday"
    daily_period  = "03:00:00Z-05:00:00Z"
    duration      = "2h"
  }
}

resource "alicloud_cs_autoscaling_config" "default" {
  cluster_id            = alicloud_cs_managed_kubernetes.ack.id
  is_scale_in_enabled   = true
  scale_down_enabled    = true
  utilization_threshold = "0.5"
  unneeded_duration     = "15m"
}
```

### Step 6: CloudMonitor and Alerts
```hcl
resource "alicloud_cms_alarm" "high_cpu" {
  name              = "app-high-cpu"
  project           = "acs_ecs_dashboard"
  metric            = "CPUUtilization"
  dimensions        = {
    instanceId = alicloud_ess_scaling_configuration.app.id
  }
  statistics        = "Average"
  period            = 300
  operator          = ">"
  threshold         = 80
  triggered_count   = 2
  contact_groups    = ["ops-team"]
  notify_type       = 1
  enabled           = true
  start_time        = 0
  end_time          = 24
  silence_time      = 86400
}

resource "alicloud_cms_alarm" "disk_usage" {
  name              = "app-high-disk"
  project           = "acs_ecs_dashboard"
  metric            = "diskusage_utilization"
  dimensions        = {
    instanceId  = "*"
    mountPoint  = "/"
    device      = "/dev/vda1"
  }
  statistics        = "Average"
  period            = 300
  operator          = ">"
  threshold         = 85
  triggered_count   = 1
  contact_groups    = ["ops-team"]
}
```

## Tool Comparison: Alibaba Cloud vs Other Providers

| Capability | Alibaba Cloud | AWS Equivalent | GCP Equivalent |
|---|---|---|---|
| Compute VM | ECS | EC2 | Compute Engine |
| Container K8s | ACK | EKS | GKE |
| Serverless Container | ASK (Serverless K8s) | Fargate | Cloud Run |
| Serverless Function | FC (Function Compute) | Lambda | Cloud Functions |
| Object Storage | OSS | S3 | Cloud Storage |
| RDBMS | RDS / PolarDB | RDS / Aurora | Cloud SQL |
| NoSQL (document) | MongoDB | DynamoDB | Firestore |
| Cache | Redis (ApsaraDB) | ElastiCache | Memorystore |
| Load Balancer | SLB | ELB/ALB | Cloud Load Balancer |
| WAF | WAF | WAF | Cloud Armor |
| DNS | DNS (PrivateZone) | Route53 | Cloud DNS |
| Monitoring | CloudMonitor | CloudWatch | Cloud Monitoring |
| Audit | ActionTrail | CloudTrail | Cloud Audit Logs |
| Key Management | KMS | KMS | Cloud KMS |
| Container Registry | ACR | ECR | Artifact Registry |
| Message Queue | MNS | SQS | Pub/Sub |
| Event Streaming | EventBridge | EventBridge | Eventarc |

## Anti-Patterns

### Anti-Pattern 1: Ignoring Zone Disasters
Failing to deploy across at least 2 zones. Alibaba Cloud zones can fail independently; single-zone deployments are not covered by SLA for most services.

### Anti-Pattern 2: Public IPs on All ECS Instances
Assigning public IPs to every ECS instance instead of using NAT Gateway + SLB. This creates a large attack surface and bypasses centralized security controls.

### Anti-Pattern 3: Over-Provisioned ECS Instances
Choosing `ecs.g7.4xlarge` when `ecs.g6.large` suffices. Right-sizing based on CloudMonitor metrics can save 40-60% on compute costs. Use subscription billing for steady-state workloads.

### Anti-Pattern 4: No OSS Lifecycle Policies
Storing logs and temporary files in OSS indefinitely without lifecycle transitions. Logs older than 90 days should transition to Archive tier ($0.003/GB/month vs $0.02/GB/month Standard).

### Anti-Pattern 5: Hardcoded RAM Access Keys
Embedding AccessKey ID/Secret in application code or configuration files. Always use RAM roles (for ECS/ACK) or STS temporary tokens for external apps.

## Production Considerations

### Security
- Enable ActionTrail for all regions to audit API calls.
- Use RAM roles for cross-account access instead of sharing AccessKey pairs.
- Enable SSL/TLS on SLB listeners; disable legacy protocols (SSLv3, TLS 1.0).
- Use KMS for encryption of OSS buckets, RDS instances, and disk snapshots.
- Enable Security Center (SAS) for threat detection and vulnerability scanning.
- Use PrivateLink instead of public IP for accessing Alibaba Cloud services from VPC.

### Cost Optimization
- **Subscription billing**: 1-month, 1-year, 3-year terms. 1-year ECS subscription saves ~50% vs Pay-As-You-Go.
- **Reserved instances for RDS/PolarDB**: Up to 50% discount for 1-year commitment.
- **Preemptible instances**: Up to 90% discount for fault-tolerant batch workloads (max 24h).
- **OSS lifecycle**: Tier data from Standard → Infrequent Access → Archive based on access patterns.
- **NAT Gateway**: Use NAT Gateway only when instances have no public IP; use EIP for single-instance egress.
- **CDN**: Use Alibaba Cloud CDN for static assets to reduce origin OSS data transfer costs.

### High Availability
- Deploy across minimum 2 availability zones (available in all major regions).
- Use SLB with cross-zone load balancing for HTTP/HTTPS traffic.
- Use RDS with multi-zone deployment (standby in different zone).
- Configure auto-scaling for ECS and ACK to handle traffic spikes.
- Use DNS round-robin or GeoDNS for multi-region failover.

## Troubleshooting Guide

| Issue | Likely Cause | Solution |
|---|---|---|
| ECS cannot access internet | No public IP and no NAT Gateway | Attach EIP or create NAT Gateway in VPC |
| SLB health check fails | Backend server not listening on health check port | Verify service is running; check security group rules |
| OSS upload slow | Cross-region access | Use OSS in same region as application |
| ACK pod cannot pull image | ACR not in same VPC; no NAT | Enable VPC access for ACR or use NAT for public registry |
| RDS connection timeout | Security group not allowing app traffic | Add ECS security group to RDS whitelist |
| RAM access denied | Policy not attached; STS token expired | Check policy attachment; refresh STS token |
| High data transfer cost | Cross-region traffic; no CDN | Use CDN for static; keep data in same region |

## Rules & Constraints
- Never hardcode Alibaba Cloud AccessKey — use RAM roles, STS, or Alibaba Cloud CLI profiles.
- Always enable OSS bucket versioning and server-side encryption.
- Every security group must have least-privilege rules; no 0.0.0.0/0 for SSH/RDP.
- Tag all resources with Project, Environment, Owner, and CostCenter tags.
- Enable CloudMonitor detailed monitoring for production ECS instances.
- Use PrivateLink or VPC endpoints over public endpoints for Alibaba Cloud service access.
- Deploy ACK clusters with private SLB only; expose via Application Load Balancer (ALB).
- Enable deletion protection on RDS and OSS buckets.
- Use Alibaba Cloud CLI with `ram` profile for scripting, never plaintext keys.
- Enable ActionTrail trail for all regions with OSS storage for audit logs.

## Output Format
Terraform HCL (alicloud provider), Alibaba Cloud CLI commands, RAM policy JSON, or ROS templates.

## References
  - references/alibaba-cloud-advanced.md
  - references/alibaba-cloud-fundamentals.md
  - references/aliyun-database.md
  - references/aliyun-ecs-vpc.md
  - references/aliyun-kubernetes.md
  - references/aliyun-security.md
  - references/network-comparison.md

## Handoff
After completing this skill:
- Next skill: **terraform** — Terraform for multi-cloud IaC with alicloud provider
- Pass context: VPC ID, security group IDs, RAM role ARN, region
