---
name: aws
description: >
  Use this skill when the user says 'AWS', 'EC2', 'S3', 'RDS', 'Lambda', 'VPC',
  'IAM', 'Well-Architected', 'cost optimization', 'CloudFormation',
  'Terraform AWS', 'EKS', 'ECS', 'ELB', 'Route53', 'CloudFront', 'WAF',
  'Auto Scaling', 'Security Group', 'NACL', 'AWS CLI', 'AWS SDK',
  'boto3', 'aws-vault', 'SSM', 'Secrets Manager', 'KMS', 'CloudWatch'.
  Covers: compute selection (EC2 vs Lambda vs ECS vs EKS), IAM policies,
  networking patterns, Well-Architected Framework, cost optimization,
  security best practices, multi-account strategy.
  Do NOT use for: GCP, Azure, Alibaba Cloud.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, aws, cloud, infrastructure, phase-5]
---

# AWS

## Purpose
Design, deploy, and manage AWS infrastructure following the Well-Architected Framework with service decision trees, networking patterns, security best practices, and cost optimization.

## Agent Protocol

### Trigger
Exact user phrases: "AWS", "EC2", "S3", "RDS", "Lambda", "VPC", "IAM", "Well-Architected", "cost optimization", "CloudFormation", "Terraform AWS", "EKS", "ECS", "ELB", "Security Group", "AWS CLI", "boto3", "SSM", "CloudWatch".

### Input Context
Before activating, verify:
- AWS region and account structure (single vs multi-account, Organizations).
- Service primitives needed (compute, storage, database, serverless, container).
- Authentication method (CLI profile, IAM role, SSO, aws-vault, OIDC).
- Compliance/security requirements (HIPAA, SOC2, PCI DSS, FedRAMP).
- Budget constraints (Pay-As-You-Go vs Reserved vs Savings Plans).

### Output Artifact
Writes to Terraform HCL, CloudFormation YAML, AWS CLI commands, IAM policy JSON, and/or CDK TypeScript/Python.

### Response Format
HCL, YAML, JSON, or CLI commands with no extraneous explanation.

No preamble. No postamble. No explanations. No filler/hedging/transitions.

### Completion Criteria
- [ ] Core infrastructure defined (VPC, subnets, security groups, NAT).
- [ ] IAM policies follow least privilege with conditions.
- [ ] Compute service selected based on workload characteristics.
- [ ] Cost optimization tags applied to all resources.
- [ ] High availability and fault tolerance addressed (multi-AZ).
- [ ] Monitoring and alerting configured (CloudWatch, EventBridge).

### Max Response Length
Direct file write. No response text.

## Architecture Decision Trees

### Compute: EC2 vs Lambda vs ECS vs EKS vs Fargate vs App Runner
| Workload Type | Recommended | When | Cost Model |
|---|---|---|---|
| Stateful VM, custom OS, legacy | EC2 | Need full OS control, GPU, bare metal | Per-hour instance |
| Short-lived, event-driven | Lambda | <15min execution, event sources | Per-invocation + duration |
| Container, orchestrated | ECS on Fargate | No K8s complexity, containers only | Per-task vCPU/memory |
| Container, full K8s | EKS (managed node groups) | Need K8s ecosystem, multi-service | Per-cluster + node costs |
| Container, serverless K8s | EKS with Fargate profiles | No node management | Per-pod (Fargate pricing) |
| Web app, simple deploy | App Runner | From source/GitHub, no infra config | Per-instance + traffic |
| Batch, flexible | AWS Batch | Job scheduling, queue-based | Per-job compute |

### Database: RDS vs Aurora vs DynamoDB vs ElastiCache vs Neptune
| Data Model | Recommended | Best For | HA Model |
|---|---|---|---|
| Relational (SQL) | RDS Multi-AZ | Standard OLTP, <16TB | Synchronous standby |
| Relational (high perf) | Aurora | >16TB, 6-way replication | 6 copies across 3 AZs |
| Key-Value / Document | DynamoDB | Serverless, auto-scaling, single-digit ms | Auto-replicated 3 AZs |
| Cache | ElastiCache (Redis) | Sub-millisecond reads, session store | Multi-AZ with replicas |
| Graph | Neptune | Social graphs, fraud detection | Multi-AZ |
| Time series | Timestream | IoT, DevOps metrics | Auto-tiered storage |
| Ledger | QLDB | Immutable audit trail | Auto-replicated |

### Storage: S3 vs EBS vs EFS vs FSx
| Use Case | Recommended | Performance | Max Size |
|---|---|---|---|
| Object storage, static files | S3 | 3500 PUT/5500 GET per prefix per sec | Unlimited |
| Block storage for EC2 | EBS (gp3/io2) | 16000 IOPS per volume (io2) | 64TiB |
| Shared file system (NFS) | EFS | 10GB/s burst | Unlimited |
| Windows file server | FSx for Windows | SMB protocol | 64TiB |
| Lustre HPC | FSx for Lustre | 100s GB/s throughput | Unlimited |
| Archive, long-term | S3 Glacier | Minutes to hours retrieval | Unlimited |

### Networking: Internet vs NAT vs PrivateLink vs Direct Connect
| Scenario | Solution | Cost | Throughput |
|---|---|---|---|
| Public web services | ALB + CloudFront | ~$0.0225/LCU-hour | Up to 1M+ QPS |
| Outbound from private subnet | NAT Gateway | ~$0.045/hr + $0.045/GB | Up to 45 Gbps |
| VPC-to-AWS service (private) | VPC Endpoint (Gateway) | Free | Up to 10 Gbps |
| VPC-to-AWS service (private) | VPC Endpoint (Interface) | ~$0.01/hr + $0.01/GB | Up to 10 Gbps |
| VPC-to-VPC peering | VPC Peering | Free (data transfer cost) | Up to 25 Gbps |
| On-prem to AWS | Direct Connect | ~$0.02/hr + port fees | 50M-100Gbps |
| Site-to-site VPN | VPN Connection | ~$0.05/hr | Up to 1.25 Gbps |

## Quick Start
VPC with public/private subnets across 3 AZs → IAM role with least-privilege policy → EC2/ECS service in private subnets → S3 with versioning/encryption → CloudWatch alarms → Cost tags.

## Core Workflow

### Step 1: VPC and Networking
```hcl
# Terraform: VPC with public + private subnets across 3 AZs
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = { Name = "main", Environment = "production" }
}

resource "aws_subnet" "public" {
  count                   = 3
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.${count.index}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  tags = { Name = "public-${count.index}", Tier = "public" }
}

resource "aws_subnet" "private" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 100}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]
  tags = { Name = "private-${count.index}", Tier = "private" }
}

resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.main.id
}

resource "aws_eip" "nat" {
  count  = 3
  domain = "vpc"
}

resource "aws_nat_gateway" "main" {
  count         = 3
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
}

resource "aws_vpc_endpoint" "s3" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.${var.aws_region}.s3"
  route_table_ids = aws_subnet.private[*].route_table_id
}
```

### Step 2: IAM Roles and Policies
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3ReadAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::my-app-assets",
        "arn:aws:s3:::my-app-assets/*"
      ],
      "Condition": {
        "StringEquals": {
          "aws:SourceAccount": "123456789012"
        },
        "IpAddress": {
          "aws:SourceIp": "10.0.0.0/16"
        }
      }
    },
    {
      "Sid": "KMSDecrypt",
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt",
        "kms:GenerateDataKey"
      ],
      "Resource": "arn:aws:kms:us-east-1:123456789012:key/abc123",
      "Condition": {
        "ForAnyValue:StringLike": {
          "kms:ViaService": "s3.us-east-1.amazonaws.com"
        }
      }
    },
    {
      "Sid": "DenyResourceDeletion",
      "Effect": "Deny",
      "Action": [
        "ec2:DeleteSecurityGroup",
        "ec2:DeleteSubnet",
        "ec2:DeleteVpc"
      ],
      "Resource": "*"
    }
  ]
}
```

### Step 3: Compute Selection — ECS with Fargate (default choice for containers)
```hcl
resource "aws_ecs_cluster" "main" {
  name = "main-cluster"
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_ecs_task_definition" "app" {
  family                   = "app-task"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "512"    # 0.5 vCPU
  memory                   = "1024"   # 1 GB
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.app_task.arn

  container_definitions = jsonencode([
    {
      name      = "app"
      image     = "${aws_ecr_repository.app.repository_url}:latest"
      essential = true
      portMappings = [
        { containerPort = 8080, protocol = "tcp" }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/app"
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])
}

resource "aws_ecs_service" "app" {
  name            = "app-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 3
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = aws_subnet.private[*].id
    security_groups = [aws_security_group.app.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "app"
    container_port   = 8080
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  service_connect_configuration {
    enabled  = true
    namespace = aws_service_discovery_http_namespace.main.arn
  }
}
```

### Step 4: S3 with Best Practices
```hcl
resource "aws_s3_bucket" "assets" {
  bucket        = "my-app-assets-production"
  force_destroy = false
}

resource "aws_s3_bucket_versioning" "assets" {
  bucket = aws_s3_bucket.assets.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.s3.key_id
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "assets" {
  bucket                  = aws_s3_bucket.assets.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id
  rule {
    id     = "transition-to-glacier"
    status = "Enabled"
    filter {
      prefix = "logs/"
    }
    transition {
      days          = 90
      storage_class = "GLACIER_IR"
    }
    transition {
      days          = 365
      storage_class = "DEEP_ARCHIVE"
    }
    expiration {
      days = 730
    }
  }
}

resource "aws_s3_bucket_replication_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id
  role   = aws_iam_role.replication.arn
  rule {
    id     = "cross-region-replication"
    status = "Enabled"
    destination {
      bucket        = aws_s3_bucket.dr.arn
      storage_class = "STANDARD_IA"
    }
  }
}
```

### Step 5: CloudWatch Monitoring and Observability
```hcl
resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/app"
  retention_in_days = 30
  kms_key_id        = aws_kms_key.cloudwatch.arn
}

resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "app-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "ECS CPU > 80% for 10 minutes"
  alarm_actions       = [aws_sns_topic.ops_alerts.arn]
  ok_actions          = [aws_sns_topic.ops_alerts.arn]
  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.app.name
  }
  tags = { Environment = "production" }
}

resource "aws_cloudwatch_composite_alarm" "app_health" {
  alarm_name        = "app-composite-health"
  alarm_rule        = "ALARM(\"${aws_cloudwatch_metric_alarm.high_cpu.alarm_name}\") || ALARM(\"${aws_cloudwatch_metric_alarm.high_error_rate.alarm_name}\")"
  alarm_actions     = [aws_sns_topic.ops_alerts.arn]
}
```

### Step 6: Cost Optimization Tags
```hcl
# Enforce cost tags via AWS Config
resource "aws_config_config_rule" "required_tags" {
  name = "required-tags"

  source {
    owner             = "AWS"
    source_identifier = "REQUIRED_TAGS"
  }

  input_parameters = jsonencode({
    tag1Key = "Environment"
    tag2Key = "Project"
    tag3Key = "Owner"
    tag4Key = "CostCenter"
  })
}

# Cost allocation tags (created once)
# aws cloudformation create-stack --stack-name cost-tags --template-body file://cost-tags.yaml

# Resource tagging example
resource "aws_ecs_service" "app" {
  tags = {
    Environment = "production"
    Project     = "my-app"
    Owner       = "platform-team"
    CostCenter  = "CC-12345"
    Terraform   = "true"
  }
}
```

## Tool Comparison: AWS Compute Services Pricing (us-east-1, 2025)

| Service | Unit | Price | Best For |
|---|---|---|---|
| EC2 t3.medium (2 vCPU, 4GB) | On-Demand/hour | $0.0416 | Steady-state apps |
| EC2 t3.medium (1yr reserved) | /hour | $0.0250 | Predictable workloads |
| Lambda 1GB, 128ms | Per 1M invocations | $0.26 | Low-volume, bursty |
| ECS Fargate 0.5 vCPU, 1GB | Per hour | $0.056 | Container apps |
| EKS cluster (control plane) | Per hour | $0.10 | K8s workloads |
| App Runner (1 vCPU, 2GB) | Per hour | $0.102 | Simple web apps |

## Anti-Patterns

### Anti-Pattern 1: Single-AZ Everything
Deploying all resources in one Availability Zone. AWS services like EBS, RDS, and EC2 can all fail when an AZ goes down. Always deploy across >= 2 AZs for production.

### Anti-Pattern 2: Overly Permissive IAM
Using `"Effect": "Allow", "Action": "*", "Resource": "*"`. Follow least privilege with resource-level constraints and condition keys.

### Anti-Pattern 3: Public Subnets for Everything
Putting databases and application servers in public subnets. Use private subnets with NAT Gateway or VPC endpoints for all private resources.

### Anti-Pattern 4: No S3 Lifecycle Policies
Storing all data in S3 Standard indefinitely. Use lifecycle policies to transition to Glacier/DEEP_ARCHIVE based on access patterns.

### Anti-Pattern 5: Ignoring Service Quotas
Hitting default limits (500 VPCs per region, 20 ALBs, etc.) during production incidents. Request quota increases early.

### Anti-Pattern 6: Hardcoded Credentials
Storing AWS access keys in code, config files, or environment variables. Use IAM roles (EC2/ECS/EKS) or STS for temporary credentials.

## Production Considerations

### Security
- Enable AWS Config with mandatory rules for all accounts.
- Use AWS Security Hub for centralized security findings.
- Enable GuardDuty for threat detection.
- Use AWS WAF and Shield Advanced for DDoS protection.
- Enable S3 Block Public Access at account level.
- Use IAM Access Analyzer for external access analysis.
- Enable CloudTrail in all regions with log file validation.
- Use AWS KMS for encryption with automatic key rotation.

### Cost Optimization
- Use Compute Optimizer for instance right-sizing.
- Purchase Reserved Instances / Savings Plans for steady-state workloads (30-60% savings).
- Use Spot Instances for fault-tolerant, stateless workloads (60-90% savings).
- Implement S3 lifecycle policies to transition cold data.
- Delete unused EBS volumes, EIPs, and old snapshots.
- Use Cost Explorer and Budgets with anomaly detection alerts.
- Implement multi-account with consolidated billing for volume discounts.

### Multi-Account Strategy
- Use AWS Organizations with SCPs (Service Control Policies).
- Separate accounts: Network (shared services), Log Archive, Security (audit), Dev/Test/Prod per workload.
- Use IAM Roles for cross-account access, never IAM users.
- Deploy CloudTrail organization trail in Log Archive account.

## Troubleshooting Guide

| Issue | Likely Cause | Solution |
|---|---|---|
| EC2 can't reach internet | No public IP and no NAT | Add EIP or NAT Gateway to VPC |
| S3 access denied | Bucket policy or IAM incorrect | Check policy evaluation; use IAM policy simulator |
| RDS connection refused | Security group not allowing traffic | Add app security group to RDS ingress rule |
| Lambda timeout | Function duration > configured timeout | Increase timeout; optimize function code |
| ECS task failing | Task role missing permissions | Check task execution role policies; verify image |
| CloudFormation rollback | Resource limit or IAM permission | Check CloudTrail for specific error |

## Rules & Constraints
- Never hardcode AWS credentials — use IAM roles, SSO, or aws-vault.
- Always enable S3 bucket versioning and encryption.
- Every S3 bucket must have public access blocked unless explicitly required.
- Use Security Groups over NACLs for instance-level traffic control.
- Tag all resources with Environment, Project, Owner, and CostCenter.
- Enable CloudWatch detailed monitoring for production workloads.
- Use PrivateLink or VPC endpoints instead of NAT for AWS service access.
- Follow the principle of least privilege for all IAM policies.
- Deploy across minimum 2 Availability Zones.
- Enable termination protection on production EC2/RDS.

## Output Format
Terraform HCL, CloudFormation YAML, AWS CLI commands, or IAM policy JSON.

## References
  - references/aws-advanced.md
  - references/aws-fundamentals.md
  - references/core-services.md
  - references/ecs-architecture.md
  - references/iam-policies.md
  - references/lambda-triggers.md
  - references/networking.md
  - references/well-architected.md
  - references/service-comparison-guide.md

## Handoff
After completing this skill:
- Next skill: **terraform** — Terraform AWS multi-account setup
- Pass context: VPC ID, subnet IDs, security group IDs, IAM role ARN, account structure
