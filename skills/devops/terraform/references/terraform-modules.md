# Terraform Module Design

## Module Structure

```
modules/
├── vpc/
│   ├── main.tf
│   ├── variables.tf     # All inputs documented with description/type/default
│   ├── outputs.tf       # All outputs with description
│   └── README.md        # Usage example, requirements, inputs, outputs
```

## Input Convention

```hcl
variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string

  validation {
    condition     = length(var.cluster_name) >= 3
    error_message = "Cluster name must be at least 3 characters."
  }
}

variable "tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default     = {}
}
```

## Output Convention

```hcl
output "vpc_id" {
  description = "ID of the created VPC"
  value       = aws_vpc.this.id
}

output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = aws_subnet.private[*].id
}
```

## Versioning

```bash
git tag modules/vpc/v1.0.0
git tag modules/rds/v2.1.0
```
