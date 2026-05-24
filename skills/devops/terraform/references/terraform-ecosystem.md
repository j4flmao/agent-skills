# Terraform Ecosystem

## Terragrunt

| Feature | Purpose |
|---------|---------|
| DRY configuration | Root `terragrunt.hcl` with remote state, provider, inputs shared across modules |
| Dependency management | `dependency` block to reference outputs from other modules |
| Catalog | Reusable module catalog with standardized inputs |
| Run commands | `run-all` to apply/plan across multiple modules |
| Before/after hooks | Pre/post apply scripts for validation |

```hcl
# terragrunt.hcl
terraform {
  source = "git::git@github.com:org/infra-modules//vpc?ref=v1.2.0"
}
remote_state {
  backend = "s3"
  config = {
    bucket = "tf-state-${get_aws_account_id()}"
    key    = "${path_relative_to_include()}/terraform.tfstate"
    region = "us-east-1"
  }
}
inputs = {
  vpc_cidr = "10.0.0.0/16"
  region   = "us-east-1"
}
```

## CDKTF (CDK for Terraform)

| Language | Use Case |
|----------|----------|
| TypeScript | Teams with TypeScript expertise |
| Python | Data/ML infrastructure |
| Java | Enterprise Java teams |
| Go | Platform engineering teams |
| C# | .NET ecosystem teams |

## OpenTofu

Open-source fork of Terraform (v1.6+). Drop-in replacement. Key differences:
- Apache 2.0 license (vs BSL for Terraform)
- Same HCL syntax, providers, modules
- State file compatible with Terraform
- Additional features: `encryption` block in state backend, `provider-defined functions`
- Roadmap: client-side state encryption, `tofu test` native

## Module Registry

| Registry | Scope |
|----------|-------|
| Terraform Registry | Public, verified modules |
| Private registry (TFC) | Internal modules, versioned |
| GitHub + Git tags | Simple, no registry needed |
| S3/GCS/HTTP backend | Versioned tarballs |

## Provider Ecosystem

| Provider | Scope |
|----------|-------|
| AWS / Azure / GCP | Cloud infrastructure |
| Kubernetes / Helm | K8s resources |
| Vault / Consul | HashiCorp stack |
| Datadog / Grafana / PagerDuty | Observability |
| GitHub / GitLab | Code platform |
| Cloudflare / Fastly / DNS | Edge/CDN |
| Auth0 / Okta | Identity |
