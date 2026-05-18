---
name: aws
description: >
  Use this skill when the user says 'AWS', 'EC2', 'S3', 'RDS', 'Lambda', 'VPC',
  'IAM', 'Well-Architected', 'cost optimization', 'CloudFormation',
  'Terraform AWS', 'EKS', 'ECS', 'ELB', 'Route53', 'CloudFront', 'WAF',
  'Auto Scaling', 'Security Group', 'NACL', 'AWS CLI', 'AWS SDK',
  'boto3', 'aws-vault', 'SSM', 'Secrets Manager', 'KMS', 'CloudWatch'.
  Covers: core services, IAM policies, networking, Well-Architected Framework,
  cost optimization, security best practices.
  Do NOT use this for: GCP, Azure, or other cloud providers.
version: "1.0.0"
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
Design, deploy, and manage AWS infrastructure following the Well-Architected Framework.

## Agent Protocol

### Trigger
Exact user phrases: "AWS", "EC2", "S3", "RDS", "Lambda", "VPC", "IAM", "Well-Architected", "cost optimization", "CloudFormation", "Terraform AWS", "EKS", "ECS", "ELB", "Security Group", "AWS CLI", "boto3", "SSM", "CloudWatch".

### Input Context
Before activating, verify:
- AWS region and account structure (multi-account, single).
- Service primitives needed (compute, storage, database, serverless).
- Authentication method (CLI profile, IAM role, SSO, aws-vault).
- Compliance/security requirements (HIPAA, SOC2, PCI).

### Output Artifact
Writes to Terraform HCL, CloudFormation YAML, AWS CLI commands, IAM policy JSON, and/or CDK TypeScript/Python.

### Response Format
HCL, YAML, JSON, or CLI commands with no extraneous explanation.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
This skill is complete when:
- [ ] Core infrastructure is defined (VPC, subnets, security groups).
- [ ] IAM policies follow least privilege.
- [ ] Cost optimization tags are applied.
- [ ] High availability and fault tolerance are addressed.
- [ ] Monitoring and alerting are configured (CloudWatch).

### Max Response Length
Direct file write. No response text.

## Quick Start
VPC with public/private subnets across 3 AZs → IAM role with least-privilege policy → EC2 or ECS service in private subnets → S3 with bucket policy → CloudWatch alarms.

## When to Use This Skill
- Setting up a new AWS account or VPC
- Designing IAM policies and roles
- Optimizing AWS costs
- Implementing Well-Architected best practices
- Migrating workloads to AWS

## Core Workflow

### Step 1: VPC and Networking
```hcl
# Terraform: VPC with public + private subnets across 3 AZs
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

resource "aws_nat_gateway" "main" {
  count         = 3
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
}
```

### Step 2: IAM Roles and Policies
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
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
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt",
        "kms:GenerateDataKey"
      ],
      "Resource": "arn:aws:kms:us-east-1:123456789012:key/abc123"
    }
  ]
}
```

### Step 3: EC2 Auto Scaling
```hcl
resource "aws_launch_template" "app" {
  name          = "app-lt"
  image_id      = data.aws_ami.amazon_linux_2023.id
  instance_type = "t3.medium"
  user_data     = base64encode(file("userdata.sh"))
  vpc_security_group_ids = [aws_security_group.app.id]
  iam_instance_profile   = aws_iam_instance_profile.app.name
  monitoring {
    enabled = true
  }
  tag_specifications {
    resource_type = "instance"
    tags = { Name = "app-instance" }
  }
}

resource "aws_autoscaling_group" "app" {
  name               = "app-asg"
  vpc_zone_identifier = aws_subnet.private[*].id
  min_size           = 2
  max_size           = 10
  desired_capacity   = 2
  target_group_arns  = [aws_lb_target_group.app.arn]
  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }
  tag {
    key                 = "Environment"
    value               = "production"
    propagate_at_launch = true
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
  }
}

resource "aws_s3_bucket_public_access_block" "assets" {
  bucket                  = aws_s3_bucket.assets.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

### Step 5: CloudWatch Monitoring
```hcl
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "app-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "EC2 CPU > 80% for 10 minutes"
  alarm_actions       = [aws_sns_topic.ops_alerts.arn]
  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.app.name
  }
}
```

## Rules & Constraints
- Never hardcode AWS credentials — use IAM roles, SSO, or aws-vault
- Always enable S3 bucket versioning and encryption
- Every S3 bucket must have public access blocked unless explicitly required
- Use Security Groups over NACLs for instance-level traffic control
- Tag all resources with Environment, Project, Owner, and CostCenter
- Enable CloudWatch detailed monitoring for production workloads
- Use PrivateLink or VPC endpoints instead of NAT for AWS service access
- Follow the principle of least privilege for all IAM policies

## Output Format
Terraform HCL, CloudFormation YAML, AWS CLI commands, or IAM policy JSON.

## References
- `references/core-services.md` — EC2, S3, RDS, Lambda, ECS, EKS
- `references/iam-policies.md` — policy syntax, roles, trust policies, conditions
- `references/networking.md` — VPC, subnets, security groups, NACLs, endpoints
- `references/well-architected.md` — six pillars, cost optimization, best practices

## Handoff
After completing this skill:
- Next skill: **serverless** — Lambda functions, API Gateway, event sources
- Pass context: VPC ID, subnet IDs, security group IDs, IAM role ARN
