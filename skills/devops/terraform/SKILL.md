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
├── policies/                 # OPA/Rego policies
│   ├── allowed_images.rego
│   └── required_tags.rego
├── scripts/
│   └── plan-apply.sh
├── versions.tf               # Terraform/provider version constraints
├── terragrunt.hcl            # If using Terragrunt
└── README.md
```

### Step 2: Configure Backend

```hcl
# environments/production/main.tf
terraform {
  backend "s3" {
    bucket         = "tf-state-prod"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "tf-state-lock"
  }
  required_version = ">= 1.5"
}
```

**Backend Selection**

| Backend | When |
|---|---|
| **S3 + DynamoDB** | AWS, default choice |
| **GCS** | GCP |
| **AzureRM** | Azure |
| **Terraform Cloud** | Team collaboration, remote runs |
| **Consul** | Self-hosted, simple |

### Step 3: Design Modules

**Module Structure**

```hcl
# modules/eks/main.tf
variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
}

variable "node_groups" {
  description = "Node group configuration"
  type = map(object({
    instance_types = list(string)
    min_size       = number
    max_size       = number
    desired_size   = number
  }))
}

resource "aws_eks_cluster" "this" {
  name     = var.cluster_name
  role_arn = aws_iam_role.eks.arn
  vpc_config {
    subnet_ids = var.subnet_ids
  }
}
```

**Module Output Convention**

```hcl
output "cluster_endpoint" {
  description = "EKS cluster API endpoint"
  value       = aws_eks_cluster.this.endpoint
}

output "cluster_certificate" {
  description = "EKS cluster certificate authority data"
  value       = aws_eks_cluster.this.certificate_authority[0].data
  sensitive   = true
}
```

### Step 4: Define Workspace Strategy

| Strategy | When | Structure |
|---|---|---|
| **Directory per env** | Different configs per env | `environments/{env}/` |
| **Workspaces** | Same config, different state | `terraform workspace select {env}` |
| **Terragrunt** | DRY, dependencies across modules | `terragrunt.hcl` per env |

**Rule**: Prefer directory per environment for production workloads. Workspaces for development/testing.

### Step 5: Integrate CI/CD Pipeline

```yaml
# .github/workflows/terraform.yml
name: Terraform
on:
  pull_request:
    paths: ['terraform/**']
  push:
    branches: [main]
    paths: ['terraform/**']

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.5.0
      - name: Init
        run: terraform init -backend-config=environments/${{ env.ENV }}/backend.hcl
      - name: Validate
        run: terraform validate
      - name: Plan
        run: terraform plan -out=tfplan -var-file=environments/${{ env.ENV }}/terraform.tfvars
      - name: Apply (main only)
        if: github.ref == 'refs/heads/main'
        run: terraform apply tfplan
```

### Step 6: Apply Policy as Code (OPA/Rego)

```rego
# policies/required_tags.rego
package terraform

deny[msg] {
  resource := input.resource_changes[_]
  resource.type in ["aws_instance", "aws_lb", "aws_s3_bucket"]
  not resource.change.after.tags.Environment
  msg := sprintf("%s %s missing required tag: Environment", [resource.type, resource.change.after.tags.Name])
}
```

### Step 7: Manage Secrets

| Method | Tool | When |
|---|---|---|
| **Sensitive variables** | Terraform `sensitive = true` | Non-secret sensitive values |
| **Vault** | HashiCorp Vault | Dynamic secrets, full lifecycle |
| **AWS Secrets Manager** | `data.aws_secretsmanager_secret` | AWS native |
| **sops** | Mozilla sops | Encrypted in Git |

## Rules
- State files NEVER in Git. Remote backend + locking required.
- All modules published with semantic versioning tag.
- Every module has README with usage, inputs, outputs.
- `terraform plan` output must be reviewed before `apply` in CI.
- No hardcoded values in modules — all configurable via variables.
- Sensitive outputs marked with `sensitive = true`.
- Directory per environment for production; workspaces for development/testing.

## References

### Reference Files
- `references/terraform-modules.md` — Module design patterns, composition, versioning
- `references/terraform-state.md` — State management, migration, locking, disaster recovery
- `references/terraform-advanced.md` — Sentinel/OPA policy, Terraform Cloud, testing, validation
- `references/terraform-ecosystem.md` — Terragrunt, CDKTF, OpenTofu, module registry, providers

### Related Skills
- `devops/helm-patterns/SKILL.md` — Kubernetes deployment via Helm
- `devops/ansible/SKILL.md` — Configuration management
- `devops/cicd-pipeline/SKILL.md` — CI/CD for Terraform
- `devops/monitoring/SKILL.md` — Monitoring infrastructure provisioning

## Handoff

Hand off to `devops/helm-patterns/SKILL.md` for K8s application deployment. Hand off to `devops/ansible/SKILL.md` for post-provisioning configuration.
