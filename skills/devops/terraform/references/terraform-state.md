# Terraform State Management

## State Storage

```hcl
# Production backend
terraform {
  backend "s3" {
    bucket         = "company-tfstate"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
```

## State Operations

```bash
# Pull state
terraform state pull > terraform.tfstate.backup

# List resources
terraform state list

# Move resource
terraform state mv aws_instance.web aws_instance.web_new

# Remove from state (not destroy)
terraform state rm aws_instance.old
```
