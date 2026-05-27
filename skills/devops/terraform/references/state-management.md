# Terraform State Management

## Overview
Terraform state maps real-world resources to configuration. Proper state management ensures consistency, enables collaboration, and prevents resource drift. This reference covers remote backends, state locking, migration, and advanced patterns.

## Remote State Backends

### S3 Backend
```hcl
terraform {
  backend "s3" {
    bucket         = "myorg-terraform-state"
    key            = "prod/network/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
    kms_key_id     = "alias/terraform-bucket-key"
    acl            = "bucket-owner-full-control"
  }
}
```

### DynamoDB Lock Table
```hcl
# Lock table configuration
resource "aws_dynamodb_table" "terraform_lock" {
  name         = "terraform-state-lock"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  server_side_encryption {
    enabled = true
  }

  point_in_time_recovery {
    enabled = true
  }
}
```

### Azure Backend
```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "myorgterraformstate"
    container_name       = "tfstate"
    key                  = "prod.terraform.tfstate"
    access_key           = "storage-account-access-key"
  }
}
```

### GCS Backend
```hcl
terraform {
  backend "gcs" {
    bucket      = "myorg-terraform-state"
    prefix      = "prod/network"
    encryption_key = "base64-encoded-key"
  }
}
```

## State Operations

### State Commands
```bash
# List resources in state
terraform state list
terraform state list | grep module.vpc

# Show resource details
terraform state show aws_instance.web[0]
terraform state show 'module.vpc.aws_subnet.private[0]'

# Move resource in state
terraform state mv \
  aws_instance.web \
  aws_instance.api_server

# Remove from state (not destroy)
terraform state rm aws_instance.legacy

# Pull state to local file
terraform state pull > backup.tfstate

# Push state from local file
terraform state push backup.tfstate
```

### Importing Resources
```bash
# Import existing resource
terraform import aws_instance.web i-1234567890abcdef0

# Import with count.index
terraform import 'aws_instance.web[0]' i-1234567890abcdef0

# Import module resource
terraform import 'module.vpc.aws_subnet.private[0]' subnet-abc123

# Import using for_each key
terraform import 'aws_s3_bucket.buckets["logs"]' myorg-logs
```

## State Locking

### Manual Lock Management
```bash
# Force unlock (use cautiously!)
terraform force-unlock LOCK_ID

# Check lock status
# For S3: Check DynamoDB table
aws dynamodb get-item \
  --table-name terraform-state-lock \
  --key '{"LockID": {"S": "myorg-terraform-state/prod/terraform.tfstate-md5"}}'

# Remove stale lock
aws dynamodb delete-item \
  --table-name terraform-state-lock \
  --key '{"LockID": {"S": "myorg-terraform-state/prod/terraform.tfstate-md5"}}'
```

## State Workspaces

### Workspace Management
```hcl
# Workspace-aware configuration
locals {
  environment = terraform.workspace
  instance_config = {
    default = {
      instance_type = "t3.micro"
      min_size     = 1
      max_size     = 2
    }
    dev = {
      instance_type = "t3.small"
      min_size     = 1
      max_size     = 2
    }
    staging = {
      instance_type = "t3.medium"
      min_size     = 2
      max_size     = 4
    }
    prod = {
      instance_type = "t3.large"
      min_size     = 3
      max_size     = 10
    }
  }
  config = local.instance_config[local.environment]
}

resource "aws_instance" "app" {
  instance_type = local.config.instance_type
  # ...
}
```

```bash
# Workspace commands
terraform workspace new dev
terraform workspace new staging
terraform workspace new prod
terraform workspace select dev
terraform workspace list
terraform workspace show
```

## State File Management

### State File Structure
```hcl
# Separate state files per environment
terraform {
  backend "s3" {
    bucket = "myorg-terraform-state"
    key    = "${var.environment}/${var.service}/terraform.tfstate"
  }
}

# Separate state files per component
# network/terraform.tfstate
# database/terraform.tfstate
# app/terraform.tfstate
```

### State Data Source
```hcl
# Access state from another configuration
data "terraform_remote_state" "network" {
  backend = "s3"
  config = {
    bucket = "myorg-terraform-state"
    key    = "prod/network/terraform.tfstate"
    region = "us-east-1"
  }
}

# Use network outputs
resource "aws_instance" "app" {
  subnet_id = data.terraform_remote_state.network.outputs.private_subnet_ids[0]
  vpc_security_group_ids = [
    data.terraform_remote_state.network.outputs.app_security_group_id
  ]
}
```

## State Migration

### Migrating to Remote State
```bash
# Initialize with local state first
terraform init

# Then update backend configuration
# Change backend {} block to s3

# Reinitialize to migrate
terraform init -migrate-state

# Force copy without prompts
terraform init -force-copy
```

## Sensitive State Data

### Protecting State
```hcl
# Mark outputs as sensitive
output "db_password" {
  value     = random_password.db.result
  sensitive = true
}

# Enable sensitive in variables
variable "api_key" {
  type      = string
  sensitive = true
}
```

### State Encryption
```hcl
# S3 bucket encryption
resource "aws_s3_bucket" "terraform_state" {
  bucket = "myorg-terraform-state"

  versioning {
    enabled = true
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.terraform_state.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

## Key Points
- Remote backends enable team collaboration
- State locking prevents concurrent modifications
- DynamoDB provides locking for S3 backend
- Workspaces manage multiple environments in one backend
- Separate state files reduce blast radius
- terraform_remote_state shares outputs across configurations
- Import brings existing resources under management
- State mv/rm refactor without destroying resources
- Migrate from local to remote with init -migrate-state
- Sensitive outputs and variables protect secrets
- Versioning and encryption protect state files
- Force-unlock removes stale locks cautiously
- Backend configuration can use partial configuration
- State contains resource dependencies and metadata
