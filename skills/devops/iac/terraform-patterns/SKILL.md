---
name: terraform-patterns
description: >
  Use this skill when the user says 'terraform patterns', 'terraform remote state', 'terraform state locking', 's3 backend use_lockfile', 'terraform module structure', 'terraform environments', 'terraform for_each vs count', 'terraform moved block', 'terraform import block', 'terraform ci plan apply'. Applies proven Terraform/OpenTofu patterns: remote state with native S3 locking, module design and versioning, environment separation, refactoring with moved/import/removed blocks, and plan/apply in CI. Do NOT use for: full Terraform reference incl. testing, Sentinel/OPA and workspaces at scale (terraform), Pulumi (devops-pulumi), Ansible configuration (ansible-automation).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [devops, iac, terraform, opentofu, modules, remote-state]
---

# Terraform IaC Patterns

## Purpose
Terraform reconciles declared resources with real infrastructure through a state file. Most production failures come from state handling (local state, missing locks, giant shared states), unpinned providers/modules, and unsafe refactors. These patterns keep plans small, reviewable, and reproducible.

## Agent Protocol

### Trigger
"terraform patterns", "remote state", "state locking", "use_lockfile", "module structure", "terraform environments", "for_each vs count", "moved block", "import block", "terraform in CI".

### Input Context
- Terraform or OpenTofu version, cloud provider(s), backend.
- Number of environments/accounts, team ownership boundaries.
- Existing state layout and pain points.

### Output Artifact
HCL (backend, modules, root configs) and CI steps. No file unless requested.

### Response Format
```
State layout: {one state per env x component}
Backend: {s3 + use_lockfile | gcs | azurerm | HCP Terraform}
Modules: {source, version pin}
Refactor: {moved/import/removed blocks}
CI: {fmt, validate, plan on PR, apply on merge with approval}
```

### Completion Criteria
- [ ] Remote state with locking and encryption; no secrets in outputs without `sensitive = true`.
- [ ] `required_version` and `required_providers` pinned; `.terraform.lock.hcl` committed.
- [ ] Plans reviewed before apply; apply uses the reviewed plan file.

## Remote State and Locking
```hcl
terraform {
  required_version = ">= 1.10"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
  backend "s3" {
    bucket       = "acme-tfstate-prod"
    key          = "network/terraform.tfstate"
    region       = "eu-west-1"
    encrypt      = true
    use_lockfile = true      # S3-native lock (<key>.tflock), Terraform >= 1.10
  }
}
```
- S3-native locking (`use_lockfile`) was added in Terraform 1.10; DynamoDB locking (`dynamodb_table`) is deprecated since 1.11 and will be removed in a future version. During migration both can be set.
- Enable bucket versioning (state recovery) and block public access; restrict IAM to the state prefix (`s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` on the `.tflock` key).
- Split state by **environment × component** (network, data, apps). Small states = fast plans, small blast radius, parallel teams. Read other states via outputs (`terraform_remote_state`) or, better, data sources/SSM parameters to reduce coupling.

## Repository Layout
```
modules/
  vpc/            # reusable, no provider/backend config inside
  service/
live/
  prod/
    network/      # root module: backend + module calls
    services/
  staging/
    network/
    services/
```
Environment differences live in variables of each root module, not in `count = var.env == "prod" ? 1 : 0` sprinkled across modules. CLI workspaces suit identical short-lived copies (feature envs), not prod vs staging with different accounts.

## Module Design
```hcl
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 6.0"            # always pin registry modules
  name    = "prod"
  cidr    = "10.10.0.0/16"
  azs             = ["eu-west-1a", "eu-west-1b", "eu-west-1c"]
  private_subnets = ["10.10.1.0/24", "10.10.2.0/24", "10.10.3.0/24"]
  public_subnets  = ["10.10.101.0/24", "10.10.102.0/24", "10.10.103.0/24"]
}
```
- Inputs typed with `validation` blocks; outputs minimal.
- Git-sourced modules pinned with `?ref=v1.4.0` tags.
- Avoid thin wrapper modules around a single resource.

## for_each over count
```hcl
variable "buckets" {
  type = map(object({ versioning = bool }))
}

resource "aws_s3_bucket" "this" {
  for_each = var.buckets
  bucket   = each.key
}
```
`count` indexes shift when an item is removed from the middle of a list, destroying/recreating resources; `for_each` keys are stable.

## Safe Refactoring (config-driven, reviewable in plan)
```hcl
moved {                       # rename/move without destroy (Terraform >= 1.1)
  from = aws_s3_bucket.logs
  to   = module.logging.aws_s3_bucket.this
}

import {                      # adopt existing resource (Terraform >= 1.5)
  to = aws_s3_bucket.legacy
  id = "acme-legacy-bucket"
}

removed {                     # stop managing without destroying (Terraform >= 1.7)
  from = aws_instance.old
  lifecycle { destroy = false }
}
```
`terraform plan -generate-config-out=generated.tf` drafts HCL for import blocks.

## CI Workflow
```bash
terraform fmt -check -recursive
terraform init -input=false
terraform validate
terraform plan -input=false -out=tfplan        # on PR; post summary as comment
terraform show -no-color tfplan > plan.txt
# after approval/merge, apply exactly the reviewed plan:
terraform apply -input=false tfplan
```
Add `tflint`, `checkov`/`trivy config` for policy, and `terraform test` (1.6+) for module tests. Authenticate CI via OIDC roles, not static keys.

## Anti-Patterns
- Local or committed `terraform.tfstate`; secrets in state without encryption at rest.
- One state for the whole company.
- Unpinned providers (`>= 4.0`) — major upgrades break plans unexpectedly.
- `terraform apply -auto-approve` from laptops against prod.
- `-target` as a routine workflow (hides dependency issues).
- `lifecycle { ignore_changes = all }` to silence drift.

## Checklist
- [ ] Backend: encrypted, versioned, `use_lockfile = true`.
- [ ] Provider + module versions pinned; lock file committed.
- [ ] State split per env × component.
- [ ] Refactors via `moved`/`import`/`removed`, never manual `state mv` in prod without review.
- [ ] CI: fmt/validate/lint/policy → plan on PR → apply reviewed plan.

## References
- Related skills: `skills/devops/terraform/SKILL.md`, `skills/devops/pulumi/SKILL.md`, `skills/devops/iac/ansible-automation/SKILL.md`.
