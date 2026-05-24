# Terraform Advanced

## Sentinel / OPA Policy as Code

```hcl
# Sentinel — require all resources have cost_center tag
import "tfplan/v2" as tfplan
all_resources_have_cost_center = rule {
  all tfplan.resource_changes as _, rc {
    rc.change.after.tags.cost_center else false != ""
  }
}
main = rule {
  all_resources_have_cost_center
}
```

```rego
# OPA/Rego — enforce instance types
package terraform
deny[msg] {
  r := input.resource_changes[_]
  r.type == "aws_instance"
  not startswith(r.change.after.instance_type, "t3.")
  msg := sprintf("%v must use t3.* instance type", [r.address])
}
```

## Terraform Cloud / Enterprise

| Feature | Benefit |
|---------|---------|
| Remote state | No manual state management, RBAC |
| Run tasks | Pre/post-apply checks (tfsec, Checkov, Infracost) |
| Sentinel | Policy enforcement before apply |
| VCS integration | Auto-trigger plans on PR |
| Private module registry | Share modules across teams |
| Cost estimation | Infracost integration per plan |

## Workspace Strategies

| Strategy | When | Pattern |
|----------|------|---------|
| Single workspace per env | Clear env isolation | `workspace dev/staging/prod` |
| Tag-based workspaces | Dynamic ephemeral envs | `workspace feature-123` |
| Branch-based workspaces | GitOps workflow | `workspace refs/heads/main` |

## Testing and Validation

| Tool | Purpose | When |
|------|---------|------|
| `terraform validate` | Syntax/attribute validation | Pre-commit, CI lint |
| `terraform fmt -check` | Formatting consistency | Pre-commit |
| `tflint` | Provider-specific best practices | CI |
| `tfsec` / `checkov` | Security scanning | CI, pre-apply |
| `infracost` | Cost estimation | PR comment |
| `terratest` / `tf-test` | Integration testing | CI (post-deploy) |

## Module Testing with Terratest

```go
func TestTerraformAwsExample(t *testing.T) {
  terraformOptions := &terraform.Options{
    TerraformDir: "../examples/simple",
    Vars: map[string]interface{}{
      "region": "us-west-2",
    },
  }
  defer terraform.Destroy(t, terraformOptions)
  terraform.InitAndApply(t, terraformOptions)
  endpoint := terraform.Output(t, terraformOptions, "endpoint")
  assert.Contains(t, endpoint, "amazonaws.com")
}
```
