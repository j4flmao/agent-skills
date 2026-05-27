---
name: alibaba-cloud
description: >
  Use this skill when the user says 'Alibaba Cloud', 'Alibaba', 'Aliyun',
  'ECS', 'ACK', 'ACK One', 'ApsaraDB', 'PolarDB', 'SLB', 'RAM', 'KMS',
  'WAF', 'Security Center', 'Anti-DDoS', 'Container Registry', 'ASM',
  'Terraform Alibaba', 'aliyun CLI'. Covers: core Alibaba Cloud services,
  ECS/VPC, ACK Kubernetes, ApsaraDB, security/RAM, Terraform provider.
  Do NOT use this for: AWS, Azure, GCP, or other cloud providers.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, cloud, alibaba-cloud, infrastructure, phase-5]
---

# Alibaba Cloud

## Purpose
Design, deploy, and manage Alibaba Cloud (Aliyun) infrastructure using Terraform, aliyun CLI, and best practices for ECS, VPC, ACK Kubernetes, ApsaraDB, and security.

## Agent Protocol

### Trigger
Exact user phrases: "Alibaba Cloud", "Alibaba", "Aliyun", "ECS", "ACK", "ACK One", "ApsaraDB", "PolarDB", "SLB", "RAM", "KMS", "WAF", "Security Center", "Anti-DDoS", "Container Registry", "ASM", "Terraform Alibaba", "aliyun CLI".

### Input Context
Before activating, verify:
- Alibaba Cloud region and zone (cn-hangzhou, ap-southeast-1, us-west-1, etc.).
- Resource group structure (default or custom).
- Authentication method (AccessKey+SecretKey, RAM role, STS token).
- Compliance requirements (ISO 27001, SOC2, PCI-DSS, MLPS).

### Output Artifact
Writes to Terraform HCL, aliyun CLI commands, RAM policy JSON, Kubernetes YAML.

### Response Format
HCL, YAML, JSON, or CLI commands with no extraneous explanation.

No preamble. No postamble. No explanations. No filler/hedging/transitions.

### Completion Criteria
This skill is complete when:
- [ ] VPC with vSwitches in multiple zones and security groups is configured.
- [ ] ECS instances or ACK cluster are provisioned with HA.
- [ ] ApsaraDB RDS or PolarDB is deployed with backup and read replicas.
- [ ] RAM roles, policies, and KMS keys are configured.
- [ ] WAF, Anti-DDoS, and Security Center are enabled.

## Quick Start
Resource group → VPC with vSwitches across 2 zones → ACK managed K8s cluster → ApsaraDB RDS MySQL with read replica → RAM role for ECS → WAF on SLB.

## Core Workflow

### Step 1: VPC and Networking
```hcl
# Terraform: VPC, vSwitches, security group, and SLB
resource "alicloud_vpc" "main" {
  vpc_name   = "production-vpc"
  cidr_block = "10.0.0.0/8"
}

resource "alicloud_vswitch" "app" {
  count        = 2
  vpc_id       = alicloud_vpc.main.id
  cidr_block   = "10.${count.index}.0.0/16"
  zone_id      = data.alicloud_zones.default.zones[count.index].id
  vswitch_name = "app-vswitch-${count.index}"
}

resource "alicloud_security_group" "web" {
  name        = "web-sg"
  vpc_id      = alicloud_vpc.main.id
  description = "Security group for web servers"
}

resource "alicloud_security_group_rule" "web_http" {
  type              = "ingress"
  ip_protocol       = "tcp"
  nic_type          = "intranet"
  policy            = "accept"
  port_range        = "80/80"
  priority          = 1
  security_group_id = alicloud_security_group.web.id
  cidr_ip           = "0.0.0.0/0"
}

resource "alicloud_security_group_rule" "web_https" {
  type              = "ingress"
  ip_protocol       = "tcp"
  nic_type          = "intranet"
  policy            = "accept"
  port_range        = "443/443"
  priority          = 1
  security_group_id = alicloud_security_group.web.id
  cidr_ip           = "0.0.0.0/0"
}
```

### Step 2: ECS and Auto Scaling
```hcl
resource "alicloud_instance" "app" {
  count              = 2
  availability_zone  = data.alicloud_zones.default.zones[count.index].id
  instance_name      = "app-ecs-${count.index}"
  instance_type      = "ecs.g7.xlarge"
  image_id           = "ubuntu_24_04_x64_20G_alibase_20250101.vhd"
  vswitch_id         = alicloud_vswitch.app[count.index].id
  security_groups    = [alicloud_security_group.web.id]
  system_disk_category = "cloud_essd"
  system_disk_size   = 40
  internet_max_bandwidth_out = 10

  password = data.alicloud_kms_secret.db_password.plaintext

  tags = {
    Environment = "production"
    Project     = "myapp"
  }
}

# Auto Scaling group
resource "alicloud_ess_scaling_group" "app" {
  scaling_group_name = "app-asg"
  min_size           = 2
  max_size           = 10
  vswitch_ids        = alicloud_vswitch.app[*].id
  removal_policies   = ["OldestInstance", "NewestInstance"]
  default_cooldown   = 300
}
```

### Step 3: ACK (Alibaba Container Service for Kubernetes)
```hcl
resource "alicloud_cs_managed_kubernetes" "ack" {
  name                         = "production-ack"
  cluster_spec                 = "ack.pro.small"
  version                      = "1.30.3"
  worker_vswitch_ids           = alicloud_vswitch.app[*].id
  pod_vswitch_ids              = [alicloud_vswitch.pod.0.id, alicloud_vswitch.pod.1.id]
  new_nat_gateway              = false
  service_cidr                 = "172.16.0.0/20"
  worker_number                = 3
  worker_instance_types        = ["ecs.g7.xlarge"]
  worker_system_disk_category  = "cloud_essd"
  worker_system_disk_size      = 40
  password                     = var.ecs_password

  maintenance_window {
    enable           = true
    maintenance_time = "03:00:00Z"
    duration         = "3h"
    weekly_period    = "Sunday"
  }
}
```

### Step 4: ApsaraDB RDS MySQL
```hcl
resource "alicloud_db_instance" "mysql" {
  engine           = "MySQL"
  engine_version   = "8.0"
  instance_type    = "mysql.x8.xlarge.2"
  instance_storage = 200
  instance_charge_type = "PostPaid"
  vswitch_id       = alicloud_vswitch.app[0].id
  security_ips     = ["10.0.0.0/8"]
  db_instance_storage_type = "cloud_essd"

  tags = {
    Environment = "production"
  }
}

resource "alicloud_db_read_write_splitting_connection" "split" {
  instance_id       = alicloud_db_instance.mysql.id
  connection_prefix = "app-db-rw"
  distribution_type = "Standard"
}

resource "alicloud_db_readonly_instance" "replica" {
  count              = 1
  engine_version     = alicloud_db_instance.mysql.engine_version
  instance_type      = alicloud_db_instance.mysql.instance_type
  instance_storage   = alicloud_db_instance.mysql.instance_storage
  master_db_instance_id = alicloud_db_instance.mysql.id
  instance_name      = "mysql-readonly-${count.index}"
  vswitch_id         = alicloud_vswitch.app[1].id
  zone_id            = data.alicloud_zones.default.zones[1].id
}

resource "alicloud_rds_backup" "mysql" {
  instance_id = alicloud_db_instance.mysql.id
  backup_method = "Physical"
  backup_type   = "FullBackup"
  backup_retention_period = 30
}
```

### Step 5: RAM and Security
```json
{
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "oss:GetObject",
        "oss:PutObject",
        "oss:ListObjects"
      ],
      "Resource": [
        "acs:oss:*:*:my-app-bucket",
        "acs:oss:*:*:my-app-bucket/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt",
        "kms:GenerateDataKey"
      ],
      "Resource": "acs:kms:*:*:key/*"
    }
  ],
  "Version": "1"
}
```

```hcl
# Terraform: RAM role, policy, and KMS
resource "alicloud_ram_role" "ecs_role" {
  name     = "ecs-application-role"
  document = <<-EOF
  {
    "Statement": [
      {
        "Action": "sts:AssumeRole",
        "Effect": "Allow",
        "Principal": {
          "Service": ["ecs.aliyuncs.com"]
        }
      }
    ],
    "Version": "1"
  }
  EOF
}

resource "alicloud_kms_key" "app" {
  description            = "Application encryption key"
  pending_window_in_days = 7
  status                 = "Enabled"
}
```

## Rules & Constraints
- Never hardwrite Alibaba Cloud AccessKey/SecretKey — use RAM roles, STS, or Environment variables (ALICLOUD_ACCESS_KEY, ALICLOUD_SECRET_KEY)
- Always use VPC with multiple vSwitches across at least 2 zones for HA
- Enable security group rules with least-privilege (avoid 0.0.0.0/0 where possible)
- Use ESSD cloud disks for production ECS instances
- Enable auto-backup for all ApsaraDB RDS instances
- Use RAM roles for ECS instances instead of embedding AccessKeys in applications
- Enable Security Center (Basic or Enterprise) for threat detection
- Use KMS for encrypting RDS, OSS, and disk data
- Enable Anti-DDoS for public-facing SLB and ECS
- Tag all resources with Environment, Project, and Owner

## References
  - references/alibaba-cloud-advanced.md — Alibaba Cloud Advanced Topics
  - references/alibaba-cloud-fundamentals.md — Alibaba Cloud Fundamentals
  - references/aliyun-database.md — Alibaba Cloud Databases
  - references/aliyun-ecs-vpc.md — Alibaba Cloud ECS and VPC
  - references/aliyun-kubernetes.md — ACK (Alibaba Container Service for Kubernetes)
  - references/aliyun-security.md — Alibaba Cloud Security
## Handoff
After completing this skill:
- Next skill: **backup-dr** — Cross-region DR, OSS cross-region replication
- Pass context: VPC ID, vSwitch IDs, ACK cluster ID, RAM role ARN, KMS key ID
