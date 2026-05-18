# Well-Architected Framework

## Six Pillars

### 1. Operational Excellence
```hcl
# Infrastructure as Code
resource "aws_cloudformation_stack" "app" {
  name         = "app-stack"
  template_body = file("template.yaml")
  tags = {
    Environment = "production"
  }
}

# Deployment automation with CodePipeline
resource "aws_codepipeline" "app" {
  name     = "app-pipeline"
  role_arn = aws_iam_role.codepipeline.arn

  artifact_store {
    location = aws_s3_bucket.artifacts.bucket
    type     = "S3"
  }

  stage {
    name = "Source"
    action {
      name             = "Source"
      category         = "Source"
      owner            = "AWS"
      provider         = "CodeCommit"
      version          = "1"
      output_artifacts = ["source"]
    }
  }

  stage {
    name = "Build"
    action {
      name             = "Build"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      version          = "1"
      input_artifacts  = ["source"]
      output_artifacts = ["build"]
    }
  }

  stage {
    name = "Deploy"
    action {
      name            = "Deploy"
      category        = "Deploy"
      owner           = "AWS"
      provider        = "CodeDeploy"
      version         = "1"
      input_artifacts = ["build"]
    }
  }
}
```

### 2. Security
```hcl
# KMS encryption
resource "aws_kms_key" "main" {
  description             = "Main encryption key"
  deletion_window_in_days = 30
  enable_key_rotation     = true
}

# CloudTrail
resource "aws_cloudtrail" "main" {
  name                       = "main-trail"
  s3_bucket_name             = aws_s3_bucket.trail.id
  include_global_service_events = true
  enable_log_file_validation = true
  is_multi_region_trail      = true
  event_selector {
    read_write_type           = "All"
    include_management_events = true
  }
}

# GuardDuty
resource "aws_guardduty_detector" "main" {
  enable = true
}
```

### 3. Reliability
```hcl
# Multi-AZ deployment
resource "aws_lb" "app" {
  name           = "app-alb"
  internal       = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id
  enable_deletion_protection = true
  drop_invalid_header_fields = true
}

resource "aws_autoscaling_group" "app" {
  min_size         = 2
  max_size         = 10
  desired_capacity = 2
  vpc_zone_identifier = aws_subnet.private[*].id
  health_check_type   = "ELB"
  health_check_grace_period = 300

  target_group_arns = [aws_lb_target_group.app.arn]

  tag {
    key                 = "AmazonECSManaged"
    value               = true
    propagate_at_launch = false
  }
}

# RDS Multi-AZ
resource "aws_db_instance" "postgres" {
  multi_az = true
}
```

### 4. Performance Efficiency
```hcl
# Auto Scaling
resource "aws_autoscaling_policy" "cpu" {
  name                   = "cpu-target-tracking"
  autoscaling_group_name = aws_autoscaling_group.app.name
  policy_type            = "TargetTrackingScaling"
  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = 70.0
  }
}

# CloudFront for global content delivery
resource "aws_cloudfront_distribution" "cdn" {
  default_cache_behavior {
    viewer_protocol_policy = "redirect-to-https"
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6" # CachingOptimized
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
  }
  price_class = "PriceClass_100"  # US/Europe only
}

# RDS Performance Insights
resource "aws_db_instance" "postgres" {
  performance_insights_enabled    = true
  performance_insights_retention_period = 7
}
```

### 5. Cost Optimization
```hcl
# Instance sizing
resource "aws_autoscaling_group" "app" {
  mixed_instances_policy {
    launch_template {
      launch_template_specification {
        launch_template_id = aws_launch_template.app.id
      }
    }
    instances_distribution {
      on_demand_percentage_above_base_capacity = 50
      spot_allocation_strategy                = "capacity-optimized"
    }
  }
}

# S3 lifecycle
resource "aws_s3_bucket_lifecycle_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id
  rules {
    id     = "expire-old-logs"
    status = "Enabled"
    expiration {
      days = 90
    }
    transitions {
      days          = 30
      storage_class = "GLACIER_IR"
    }
  }
}

# Budget alert
resource "aws_budgets_budget" "monthly" {
  name         = "monthly-budget"
  budget_type  = "COST"
  limit_amount = "10000"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator = "GREATER_THAN"
    threshold          = 80
    threshold_type     = "PERCENTAGE"
    notification_type  = "ACTUAL"
    subscriber_email_addresses = ["ops@example.com"]
  }
}
```

### 6. Sustainability
```hcl
# Graviton instances (better perf/watt)
resource "aws_launch_template" "app" {
  instance_type = "t4g.small"  # ARM-based, not t3
}

# Serverless where possible
resource "aws_lambda_function" "processor" {
  architectures = ["arm64"]  # ARM is more energy efficient
}

# Delete unused resources
resource "aws_ebs_snapshot" "backup" {
  volume_id = aws_ebs_volume.data.id
  tags = {
    DeleteAfter = "2025-12-31"  # Tag for cleanup automation
  }
}
```

## Cost Optimization Checklist

- [ ] Right-size instances (use Compute Optimizer recommendations)
- [ ] Use Spot Instances for fault-tolerant workloads
- [ ] Implement S3 Lifecycle policies to transition/expire data
- [ ] Use Savings Plans or Reserved Instances for steady-state workloads
- [ ] Enable EC2 Auto Scaling to match demand
- [ ] Use Graviton (ARM) instances for better perf/$
- [ ] Delete untagged/unused resources (EBS snapshots, EIPs, ELBs)
- [ ] Use S3 Intelligent-Tiering for unknown access patterns
- [ ] Monitor with Cost Explorer and Budget alerts
- [ ] Enable Trusted Advisor for cost checks

## Well-Architected Review Questions

| Pillar | Key question |
|--------|-------------|
| Operational Excellence | Are operations documented and runbooks tested? |
| Security | Is data encrypted at rest and in transit? |
| Reliability | Can the system survive an AZ failure? |
| Performance Efficiency | Are resources right-sized and monitored? |
| Cost Optimization | Are there unused resources being billed? |
| Sustainability | Are energy-efficient instance types used? |
