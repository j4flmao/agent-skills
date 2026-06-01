---
name: terraform
description: >
  Use this skill when provisioning infrastructure with Terraform — module structure, state management, remote backends, workspaces, CI/CD integration, policy as code. This skill enforces: environment directory structure, remote backends with state locking, semantic versioning for modules, no hardcoded values, sensitive output marking, plan review before apply. Do NOT use for: configuration management (use Ansible), Kubernetes application deployment (use Helm), non-HashiCorp IaC tools.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, terraform, phase-5]
---

# Terraform Patterns

## Purpose
Define and enforce Terraform infrastructure provisioning patterns with module design, state management, and CI/CD integration.

## Agent Protocol

### Trigger
User request includes: `terraform`, `tf`, `iac`, `infrastructure as code`, `hcl`, `terraform module`, `terraform state`, `terraform workspace`, `terraform backend`, `terragrunt`.

### Input Context
- Cloud provider (AWS, GCP, Azure)
- Current IaC state (if any)
- Team structure (who manages infrastructure)
- State storage requirements
- Compliance requirements

### Output Artifact
A markdown document containing:
- Module structure (directory layout, naming)
- State management strategy (remote backend, locking)
- Workspace/environment strategy
- Module design (input/output conventions, versioning)
- CI/CD pipeline integration
- Policy as code (Sentinel, OPA/Rego)
- Secret management

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick.

### Completion Criteria
- Module directory structure documented
- Backend configuration with state locking
- Workspace or directory strategy per environment
- Module input/output conventions defined
- CI/CD pipeline steps for plan/apply

### Max Response Length
4096 tokens

## Decision Tree: Directory Structure vs Workspaces vs Terragrunt
| Strategy | When | Pros | Cons |
|----------|------|------|------|
| Directory per env | Production workloads, different configs | Clear separation, parallel applies | Config duplication |
| Workspaces | Dev/test, same config | DRY, minimal files | Accidental cross-env changes |
| Terragrunt | Multi-module dependencies | DRY, dependency resolution | Additional tooling, complexity |

**Rule**: Prefer directory per environment for production. Workspaces for dev/test only.

## Workflow

### Step 1: Set Up Repository Structure
```
terraform/
├── environments/
│   ├── production/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   ├── terraform.tfvars
│   │   ├── backend.hcl
│   │   └── provider.tf
│   ├── staging/
│   │   └── ...
│   └── development/
│       └── ...
├── modules/
│   ├── eks/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── README.md
│   ├── rds/
│   │   └── ...
│   ├── vpc/
│   │   └── ...
│   └── iam/
│       └── ...
├── policies/
│   ├── required_tags.rego
│   ├── allowed_instance_types.rego
│   └── enforce_encryption.rego
├── scripts/
│   └── plan-apply.sh
├── versions.tf
├── terragrunt.hcl
└── README.md
```

### Step 2: Configure Backend
```hcl
# environments/production/backend.hcl
bucket         = "tf-state-prod"
key            = "production/terraform.tfstate"
region         = "us-east-1"
encrypt        = true
dynamodb_table = "tf-state-lock"

# environments/production/main.tf
terraform {
  backend "s3" {
    # Use -backend-config=backend.hcl for partial config
  }
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
  }
}
```

### Step 3: Backend Selection Comparison
| Backend | State Locking | Encryption | Best For |
|---------|---------------|------------|----------|
| **S3 + DynamoDB** | Yes (DynamoDB) | SSE-S3/KMS | AWS-native teams |
| **GCS** | Yes (native) | AES256/CMEK | GCP-native teams |
| **AzureRM** | Yes (Blob lease) | SSE | Azure-native teams |
| **Terraform Cloud** | Yes (native) | At rest + in transit | Team collaboration, remote runs |
| **Consul** | Yes (session) | TLS | Self-hosted, simple |
| **local** | No | No | Personal projects only |

### Step 4: Design Modules — VPC Example
```hcl
# modules/vpc/main.tf
variable "name" {
  description = "VPC name"
  type        = string
}

variable "cidr_block" {
  description = "CIDR block for VPC"
  type        = string
  validation {
    condition     = can(cidrsubnet(var.cidr_block, 0, 0))
    error_message = "Must be a valid CIDR block."
  }
}

variable "azs" {
  description = "Availability zones"
  type        = list(string)
}

variable "enable_nat_gateway" {
  description = "Enable NAT gateway"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}

resource "aws_vpc" "this" {
  cidr_block           = var.cidr_block
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = merge(var.tags, {
    Name = var.name
  })
}

resource "aws_subnet" "public" {
  count             = length(var.azs)
  vpc_id            = aws_vpc.this.id
  cidr_block        = cidrsubnet(var.cidr_block, 8, count.index)
  availability_zone = var.azs[count.index]
  map_public_ip_on_launch = true
  tags = merge(var.tags, {
    Name = "${var.name}-public-${count.index}"
    Tier = "public"
  })
}

resource "aws_subnet" "private" {
  count             = length(var.azs)
  vpc_id            = aws_vpc.this.id
  cidr_block        = cidrsubnet(var.cidr_block, 8, count.index + 100)
  availability_zone = var.azs[count.index]
  tags = merge(var.tags, {
    Name = "${var.name}-private-${count.index}"
    Tier = "private"
  })
}

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.this.id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = aws_subnet.private[*].id
}
```

### Step 5: Module Usage and Composition
```hcl
# environments/production/main.tf
module "vpc" {
  source          = "../../modules/vpc"
  version         = "1.2.0"  # Module version pinning
  name            = "prod"
  cidr_block      = "10.0.0.0/16"
  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  enable_nat_gateway = true
  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

module "eks" {
  source       = "../../modules/eks"
  cluster_name = "prod-cluster"
  subnet_ids   = module.vpc.private_subnet_ids
  node_groups = {
    general = {
      instance_types = ["t3.medium"]
      min_size       = 2
      max_size       = 10
      desired_size   = 3
      disk_size      = 50
    }
    gpu = {
      instance_types = ["g5.xlarge"]
      min_size       = 0
      max_size       = 5
      desired_size   = 0
      disk_size      = 200
    }
  }
  tags = {
    Environment = "production"
  }
}
```

### Step 6: CI/CD Pipeline with Plan Approval
```yaml
name: Terraform
on:
  pull_request:
    paths: ['terraform/**']
  push:
    branches: [main]
    paths: ['terraform/**']

env:
  TF_VERSION: 1.7.0
  ENV: ${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: hashicorp/setup-terraform@v3
      with:
        terraform_version: ${{ env.TF_VERSION }}
    - name: Init
      run: |
        terraform init \
          -backend-config=environments/${{ env.ENV }}/backend.hcl \
          -reconfigure
      working-directory: terraform/environments/${{ env.ENV }}
    - name: Validate
      run: terraform validate
      working-directory: terraform/environments/${{ env.ENV }}
    - name: Check formatting
      run: terraform fmt -check -recursive
    - name: Security scan
      uses: aquasecurity/tfsec-action@v1.0.0
      with:
        working_directory: terraform

  plan:
    needs: validate
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Init
      run: |
        terraform init \
          -backend-config=environments/${{ env.ENV }}/backend.hcl
      working-directory: terraform/environments/${{ env.ENV }}
    - name: Plan
      id: plan
      run: |
        terraform plan \
          -var-file=terraform.tfvars \
          -out=tfplan \
          -no-color
      working-directory: terraform/environments/${{ env.ENV }}
    - name: Post plan comment (PR only)
      if: github.event_name == 'pull_request'
      uses: actions/github-script@v7
      with:
        script: |
          const output = `${{ steps.plan.outputs.stdout }}`;
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: `## Terraform Plan (${process.env.ENV}) \n\`\`\`\n${output}\n\`\`\``
          })

  apply:
    needs: plan
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production  # Requires approval in GitHub Environments
    steps:
    - uses: actions/checkout@v4
    - name: Init
      run: |
        terraform init \
          -backend-config=environments/${{ env.ENV }}/backend.hcl
      working-directory: terraform/environments/${{ env.ENV }}
    - name: Apply
      run: terraform apply tfplan
      working-directory: terraform/environments/${{ env.ENV }}
```

### Step 7: Policy as Code — OPA/Rego
```rego
# policies/enforce_encryption.rego
package terraform

deny[msg] {
  resource := input.resource_changes[_]
  resource.type == "aws_s3_bucket"
  not resource.change.after.server_side_encryption_configuration
  msg := sprintf("%s (%s) must have encryption enabled", [resource.type, resource.address])
}

deny[msg] {
  resource := input.resource_changes[_]
  resource.type == "aws_db_instance"
  not resource.change.after.storage_encrypted
  msg := sprintf("%s (%s) must have storage encrypted", [resource.type, resource.address])
}

deny[msg] {
  resource := input.resource_changes[_]
  resource.type in ["aws_security_group", "aws_security_group_rule"]
  resource.change.after.from_port == 0
  resource.change.after.to_port == 65535
  resource.change.after.cidr_blocks[_] == "0.0.0.0/0"
  msg := sprintf("%s (%s) has overly permissive ingress from 0.0.0.0/0", [resource.type, resource.address])
}
```

### Step 8: Secret Management
```hcl
# Option 1: Terraform sensitive variables
variable "db_password" {
  description = "Database admin password"
  type        = string
  sensitive   = true
}

# Option 2: Vault data source
data "vault_kv_secret_v2" "db" {
  mount = "secret"
  name  = "production/database"
}

resource "aws_db_instance" "main" {
  password = data.vault_kv_secret_v2.db.data["password"]
}

# Option 3: AWS Secrets Manager
data "aws_secretsmanager_secret_version" "db" {
  secret_id = "production/database"
}

resource "aws_db_instance" "main" {
  password = jsondecode(data.aws_secretsmanager_secret_version.db.secret_string)["password"]
}

# Option 4: sops-encrypted vars
# Use `sops` to encrypt terraform.tfvars.sops
# Decode in pipeline: sops -d terraform.tfvars.sops > terraform.tfvars
```

### Step 9: State Operations
```bash
# Import existing resources
terraform import aws_s3_bucket.my_bucket my-bucket-name
terraform import module.vpc.aws_vpc.this vpc-12345

# State list and show
terraform state list
terraform state show aws_s3_bucket.my_bucket

# State move (rename resource)
terraform state mv aws_s3_bucket.old aws_s3_bucket.new

# State removal
terraform state rm aws_s3_bucket.deleted

# State recovery
terraform state pull > backup.tfstate
# Edit manually, then:
terraform state push backup.tfstate

# Force unlock (DANGER: only when lock is orphaned)
terraform force-unlock LOCK_ID
```

### Step 10: Advanced Module Patterns
```hcl
# modules/rds/main.tf — Multi-engine RDS
variable "engine" {
  description = "Database engine"
  type        = string
  validation {
    condition     = contains(["postgres", "mysql", "aurora"], var.engine)
    error_message = "Engine must be postgres, mysql, or aurora."
  }
}

variable "performance_insights_enabled" {
  description = "Enable Performance Insights"
  type        = bool
  default     = true
}

locals {
  engine_port = {
    postgres = 5432
    mysql    = 3306
    aurora   = 3306
  }
  port = local.engine_port[var.engine]
}

resource "aws_db_instance" "this" {
  engine         = var.engine
  port           = local.port
  identifier     = "${var.name}-${var.engine}"
  performance_insights_enabled = var.performance_insights_enabled
  performance_insights_retention_period = var.performance_insights_enabled ? 7 : 0
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  backup_retention_period = var.environment == "production" ? 30 : 7
}
```

## Rules
- State files NEVER in Git. Remote backend + locking required.
- All modules published with semantic versioning tag.
- Every module has README with usage, inputs, outputs.
- `terraform plan` output must be reviewed before `apply` in CI.
- No hardcoded values in modules — all configurable via variables.
- Sensitive outputs marked with `sensitive = true`.
- Directory per environment for production; workspaces for development/testing.
- Always pin provider versions in required_providers.

## Production Considerations
- Use Terraform Cloud or Atlantis for collaborative plan/apply workflow.
- Set up state file versioning (S3 versioning, GCS object versioning).
- Run `terraform validate` and `tflint` in CI before plan.
- Use Terraform workspaces only for dev/test, not production.
- Tag all resources with `ManagedBy: terraform` for cost tracking.
- Use `prevent_destroy` lifecycle on critical resources.
- Set `create_before_destroy` for zero-downtime replacements.
- Use `terraform plan -out=tfplan` to lock the plan for apply.
- Run cost estimation tools (Infracost) in CI.

## Anti-Patterns
- State in Git — plaintext secrets, merge conflicts, corruption risk.
- No state locking — concurrent applies corrupt state.
- Hardcoded values in modules — not reusable across environments.
- No provider version pinning — unexpected provider changes break infrastructure.
- One monolithic state file for everything — slow, high blast radius.
- `terraform apply` without `plan` — uncontrolled changes.
- Not using sensitive flag for passwords — secrets in plaintext output.
- `ignore_changes` as a crutch — masks real drift.
- Overusing `count` instead of `for_each` — index-based references break on reorder.
- Manual state edits without backup — corrupt state, data loss.

## References
  - references/modules-composition.md — Terraform Modules and Composition
  - references/state-management.md — Terraform State Management
  - references/terraform-advanced.md — Terraform Advanced
  - references/terraform-ecosystem.md — Terraform Ecosystem
  - references/terraform-fundamentals.md — Terraform Fundamentals
  - references/terraform-modules.md — Terraform Module Design
  - references/terraform-state.md — Terraform State Management
## Handoff
Hand off to `devops/helm-patterns/SKILL.md` for K8s application deployment. Hand off to `devops/ansible/SKILL.md` for post-provisioning configuration.
