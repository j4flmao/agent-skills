# Terraform Fundamentals

Terraform (and its open-source fork OpenTofu, which shares most syntax) declares infrastructure in HCL and reconciles real resources to match. This reference covers the core workflow, language building blocks, meta-arguments, state basics and safe habits. Deeper topics: `terraform-state.md`, `terraform-modules.md`, `terraform-testing.md`, `terraform-advanced.md`.

## Core Workflow

```bash
terraform init            # download providers/modules, configure backend
terraform fmt -recursive  # format
terraform validate        # syntax and internal consistency
terraform plan -out=tfplan
terraform apply tfplan    # apply exactly the reviewed plan
terraform destroy         # remove everything in this configuration (use with care)
```

Always apply a saved plan in automation so what was reviewed is what runs.

## Project Layout

```
infra/
  versions.tf      # terraform and provider version constraints
  providers.tf     # provider configuration
  backend.tf       # remote state
  variables.tf
  main.tf
  outputs.tf
  terraform.tfvars # non-secret values per environment (or env/*.tfvars)
```

## Versions and Providers

```hcl
terraform {
  required_version = ">= 1.9.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
  default_tags {
    tags = { project = "orders", managed_by = "terraform", env = var.env }
  }
}
```

Commit `.terraform.lock.hcl` so every run uses the same provider builds. Upgrade deliberately with `terraform init -upgrade`.

## Remote State

```hcl
terraform {
  backend "s3" {
    bucket       = "acme-tfstate-prod"
    key          = "orders/terraform.tfstate"
    region       = "eu-west-1"
    encrypt      = true
    use_lockfile = true   # S3-native locking, Terraform 1.10+
  }
}
```

State maps configuration to real resource IDs and may contain secrets: store it remotely, encrypted, with versioning and restricted access. Older configurations used a DynamoDB table for S3 locking; S3-native lockfiles replace that in current versions. Other backends: `gcs`, `azurerm`, HCP Terraform/Terraform Enterprise, and others.

## Variables, Locals, Outputs

```hcl
variable "env" {
  type        = string
  description = "Deployment environment"
  validation {
    condition     = contains(["dev", "staging", "prod"], var.env)
    error_message = "env must be dev, staging or prod."
  }
}

variable "db_password" {
  type      = string
  sensitive = true          # redacted in plan output; still stored in state
}

locals {
  name_prefix = "orders-${var.env}"
}

output "bucket_name" {
  value = aws_s3_bucket.assets.bucket
}
```

Value precedence (lowest to highest): defaults, `terraform.tfvars`, `*.auto.tfvars`, `-var-file`, `-var`; environment variables `TF_VAR_name` sit just above defaults. Prefer fetching secrets from a secret manager (data source or ephemeral resources in newer versions) over passing them as variables.

## Resources and Data Sources

```hcl
resource "aws_s3_bucket" "assets" {
  bucket = "${local.name_prefix}-assets"
}

resource "aws_s3_bucket_public_access_block" "assets" {
  bucket                  = aws_s3_bucket.assets.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

data "aws_caller_identity" "current" {}
```

References (`aws_s3_bucket.assets.id`) create implicit dependencies; Terraform builds a graph and parallelizes independent operations.

## Meta-Arguments

| Meta-argument | Use |
|---------------|-----|
| `count` | N identical copies, or conditional creation (`count = var.enabled ? 1 : 0`) |
| `for_each` | One instance per map key/set element; stable addresses when items change |
| `depends_on` | Explicit dependency when no reference exists (use sparingly) |
| `provider` | Select an aliased provider (other region/account) |
| `lifecycle` | `create_before_destroy`, `prevent_destroy`, `ignore_changes`, `replace_triggered_by`, preconditions/postconditions |

Prefer `for_each` over `count` for collections: removing one element from a `count` list shifts indexes and can recreate others.

```hcl
resource "aws_iam_user" "devs" {
  for_each = toset(var.developer_names)
  name     = each.key
}
```

## Expressions

```hcl
locals {
  subnet_ids = [for s in aws_subnet.private : s.id]
  tags_by_az = { for s in aws_subnet.private : s.availability_zone => s.tags }
  instance_type = var.env == "prod" ? "m7g.large" : "t4g.small"
}

dynamic "ingress" {
  for_each = var.allowed_ports
  content {
    from_port   = ingress.value
    to_port     = ingress.value
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidrs
  }
}
```

## Refactoring Without Recreating

```hcl
# Rename a resource address without destroy/create
moved {
  from = aws_s3_bucket.static
  to   = aws_s3_bucket.assets
}

# Bring an existing resource under management (Terraform 1.5+)
import {
  to = aws_s3_bucket.legacy
  id = "acme-legacy-bucket"
}
```

`terraform plan -generate-config-out=generated.tf` drafts configuration for import blocks. `removed` blocks (1.7+) stop managing a resource without destroying it.

## Reading Plans

| Symbol | Meaning |
|--------|---------|
| `+` | Create |
| `-` | Destroy |
| `~` | Update in place |
| `-/+` or `+/-` | Replace (destroy and create, order depends on `create_before_destroy`) |
| `<=` | Read data source |

Look for unexpected replacements ("forces replacement") on stateful resources such as databases.

## Safe Habits

- One state per environment and per blast-radius boundary (network, data, apps), not one giant state.
- Plan in CI on pull requests; apply from CI after approval, with credentials via OIDC rather than long-lived keys.
- `prevent_destroy` on critical data stores.
- Never edit state files by hand; use `terraform state mv/rm` or `moved`/`removed` blocks.
- Run `terraform plan` regularly to detect drift.
- Static checks: `tflint`, `trivy config` or `checkov` for misconfigurations.

## Checklist

- [ ] Version constraints and committed lock file
- [ ] Remote, encrypted, locked state with restricted access
- [ ] Variables typed, described, validated; secrets marked sensitive and sourced from a secret manager
- [ ] `for_each` for collections; `moved`/`import` for refactors
- [ ] Saved plans reviewed and applied from CI
- [ ] Critical resources protected with lifecycle rules
- [ ] Linting and security scanning in CI
