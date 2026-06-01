# Terraform Testing Strategies

## Unit Testing with Terratest
Go-based testing framework for Terraform modules. Validate outputs: assert output values match expected. Validate resources: check resource existence and properties. Plan assertion: verify plan creates expected resources. Example: assert.Equal(t, "t2.micro", terraform.Output(t, "instance_type")).

## Integration Testing
Terratest deploy: terraform.InitAndApply(t, options). Validate infrastructure: HTTP request to ALB, SSH to instance, database connection. Cleanup: defer terraform.Destroy(t, options). Parallelism: unique workspace names for parallel tests. Infrastructure verification with test assertions.

## Plan Validation
terraform plan -out=tfplan: save plan for analysis. terraform show -json tfplan: JSON output for programmatic checks. Sentinel policies: HashiCorp policy framework. OPA with terraform: opa eval against terraform plan JSON. Validate: no deletion of production databases.

## Module Testing
Fixtures directory: example module usage within module. Test with multiple configurations: override variables. Validate outputs match variable inputs. Cross-module integration: test module composition. Terraform test (1.6+): built-in test framework with assert block.

## Static Analysis
tflint: provider-specific linting (deprecated resources, best practices). tfsec/checkov: security scanning for Terraform code. terraform validate: syntax and internal consistency. fmt check: terraform fmt -check for formatting. infrastructure-lint with custom rules.

## Compliance Testing
Sentinel (HCP): policy-as-code for Terraform Cloud/Enterprise. OPA: evaluate policies against terraform plan JSON. Checkov: SAST for Terraform security and compliance. CIS benchmarks: check resources against CIS best practices. Cost estimation: infracost for Terraform cost in CI/CD.

## References
- terraform-fundamentals.md -- Fundamentals
- terraform-state.md -- State Management
- terraform-modules.md -- Modules
- terraform-ecosystem.md -- Ecosystem
- terraform-advanced.md -- Advanced
