# Core Services

## EC2

```hcl
# Launch template with best practices
resource "aws_launch_template" "web" {
  name          = "web-lt"
  image_id      = data.aws_ami.amazon_linux_2023.id
  instance_type = "t3.small"
  key_name      = var.key_name

  network_interfaces {
    associate_public_ip_address = false
    security_groups             = [aws_security_group.web.id]
    delete_on_termination       = true
  }

  iam_instance_profile {
    name = aws_iam_instance_profile.web.name
  }

  monitoring {
    enabled = true
  }

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = 20
      volume_type           = "gp3"
      iops                  = 3000
      throughput            = 125
      delete_on_termination = true
      encrypted             = true
    }
  }

  tag_specifications {
    resource_type = "instance"
    tags = { Name = "web-server" }
  }

  user_data = base64encode(<<-EOF
    #!/bin/bash
    yum update -y
    yum install -y docker
    systemctl enable docker && systemctl start docker
    EOF
  )
}
```

## S3

```hcl
# Data lake bucket
resource "aws_s3_bucket" "data_lake" {
  bucket = "my-org-data-lake-production"
}

resource "aws_s3_bucket_lifecycle_configuration" "data_lake" {
  bucket = aws_s3_bucket.data_lake.id
  rules {
    id     = "transition-to-ia"
    status = "Enabled"
    filter {
      prefix = "logs/"
    }
    transitions {
      days          = 30
      storage_class = "STANDARD_IA"
    }
    transitions {
      days          = 90
      storage_class = "GLACIER"
    }
    expiration {
      days = 365
    }
  }
}

resource "aws_s3_bucket_policy" "data_lake" {
  bucket = aws_s3_bucket.data_lake.id
  policy = data.aws_iam_policy_document.data_lake.json
}
```

## RDS

```hcl
resource "aws_db_instance" "postgres" {
  identifier     = "app-db"
  engine         = "postgres"
  engine_version = "16.3"
  instance_class = "db.t4g.small"
  allocated_storage     = 100
  storage_type          = "gp3"
  storage_encrypted     = true
  db_name  = "app"
  username = var.db_username
  password = var.db_password

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  backup_retention_period = 30
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"

  deletion_protection = true
  skip_final_snapshot = false
  final_snapshot_identifier = "app-db-final"

  enabled_cloudwatch_logs_exports = ["postgresql"]

  tags = { Name = "app-db" }
}

resource "aws_db_subnet_group" "main" {
  name       = "main"
  subnet_ids = aws_subnet.private[*].id
}
```

## Lambda

```hcl
resource "aws_lambda_function" "processor" {
  function_name = "data-processor"
  role          = aws_iam_role.lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs22.x"
  filename      = "function.zip"
  timeout       = 30
  memory_size   = 512
  architectures = ["arm64"]

  environment {
    variables = {
      BUCKET = aws_s3_bucket.data_lake.id
    }
  }

  tracing_config {
    mode = "Active"
  }

  tags = { Name = "data-processor" }
}
```

## ECS (Fargate)

```hcl
resource "aws_ecs_cluster" "main" {
  name = "main"
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_ecs_task_definition" "app" {
  family                   = "app"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "app"
      image     = "${aws_ecr_repository.app.repository_url}:latest"
      essential = true
      portMappings = [{ containerPort = 3000, protocol = "tcp" }]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/app"
          "awslogs-region"        = "us-east-1"
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])
}

resource "aws_ecs_service" "app" {
  name            = "app"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = aws_subnet.private[*].id
    security_groups = [aws_security_group.ecs.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "app"
    container_port   = 3000
  }
}
```

## EKS

```hcl
resource "aws_eks_cluster" "main" {
  name     = "main"
  role_arn = aws_iam_role.eks.arn
  version  = "1.30"

  vpc_config {
    subnet_ids              = aws_subnet.private[*].id
    endpoint_private_access = true
    endpoint_public_access  = false
  }

  enabled_cluster_log_types = ["api", "audit", "authenticator"]

  encryption_config {
    provider {
      key_arn = aws_kms_key.eks.arn
    }
    resources = ["secrets"]
  }
}
```

## Service Selection

| Need | Service | When to use |
|------|---------|-------------|
| VMs | EC2 | Full control, legacy apps, custom OS |
| Containers | ECS/EKS | Microservices, portability, orchestration |
| Serverless | Lambda | Event-driven, sporadic traffic |
| SQL | RDS/Aurora | Relational data, transactions |
| NoSQL | DynamoDB | Key-value, high throughput, low latency |
| Object storage | S3 | Files, backups, data lakes, static assets |
| CDN | CloudFront | Global content delivery, edge caching |
| DNS | Route53 | Domain management, routing policies |
| Cache | ElastiCache | Redis/Memcached, session store, query cache |
| Queue | SQS | Decoupling services, async processing |
| Stream | Kinesis | Real-time data ingestion, analytics |
| Email | SES | Transactional email, marketing |
