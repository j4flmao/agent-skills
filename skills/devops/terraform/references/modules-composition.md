# Terraform Modules and Composition

## Overview
Terraform modules encapsulate reusable infrastructure components. They support inputs, outputs, versioning, and composition patterns. This reference covers module structure, inputs/outputs, versioning, registry modules, and best practices.

## Module Structure

### Basic Module Layout
```
modules/
├── vpc/
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   ├── versions.tf
│   └── README.md
├── ecs/
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   └── versions.tf
└── rds/
    ├── main.tf
    ├── variables.tf
    ├── outputs.tf
    └── versions.tf
```

### VPC Module Example
```hcl
# modules/vpc/variables.tf
variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "azs" {
  description = "Availability zones"
  type        = list(string)
}

variable "private_subnets" {
  description = "Private subnet CIDRs"
  type        = list(string)
}

variable "public_subnets" {
  description = "Public subnet CIDRs"
  type        = list(string)
}

variable "enable_nat_gateway" {
  description = "Enable NAT gateway"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Additional tags"
  type        = map(string)
  default     = {}
}

# modules/vpc/main.tf
resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(var.tags, {
    Name        = "${var.environment}-vpc"
    Environment = var.environment
  })
}

resource "aws_subnet" "private" {
  count             = length(var.private_subnets)
  vpc_id            = aws_vpc.this.id
  cidr_block        = var.private_subnets[count.index]
  availability_zone = var.azs[count.index]

  tags = merge(var.tags, {
    Name        = "${var.environment}-private-${var.azs[count.index]}"
    Environment = var.environment
    Type        = "private"
  })
}

resource "aws_subnet" "public" {
  count             = length(var.public_subnets)
  vpc_id            = aws_vpc.this.id
  cidr_block        = var.public_subnets[count.index]
  availability_zone = var.azs[count.index]
  map_public_ip_on_launch = true

  tags = merge(var.tags, {
    Name        = "${var.environment}-public-${var.azs[count.index]}"
    Environment = var.environment
    Type        = "public"
  })
}

# modules/vpc/outputs.tf
output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.this.id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = aws_subnet.private[*].id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "vpc_cidr_block" {
  description = "VPC CIDR block"
  value       = aws_vpc.this.cidr_block
}

# modules/vpc/versions.tf
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}
```

## Module Composition

### Root Module
```hcl
# root/main.tf
module "vpc" {
  source = "./modules/vpc"

  environment     = var.environment
  vpc_cidr        = "10.0.0.0/16"
  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  enable_nat_gateway = var.environment == "prod" ? true : false
  tags = {
    Project     = "myapp"
    ManagedBy   = "terraform"
  }
}

module "rds" {
  source = "./modules/rds"

  environment    = var.environment
  vpc_id         = module.vpc.vpc_id
  subnet_ids     = module.vpc.private_subnet_ids
  instance_class = var.environment == "prod" ? "db.r6g.large" : "db.t3.medium"
  allocated_storage = var.environment == "prod" ? 100 : 20
  database_name  = "myapp_${var.environment}"
  master_username = "admin"
  master_password = random_password.db_master.result
}

module "ecs_cluster" {
  source = "./modules/ecs"

  environment     = var.environment
  vpc_id          = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  container_port  = 8080
  desired_count   = var.environment == "prod" ? 3 : 1
}
```

## Module Registry

### Using Registry Modules
```hcl
# Terraform Registry module
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"

  name = "myapp-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  enable_vpn_gateway = false

  tags = {
    Environment = var.environment
  }
}
```

### Private Registry
```hcl
# Private registry module
module "internal_vpc" {
  source  = "app.terraform.io/myorg/vpc/aws"
  version = "~> 1.0"

  environment = var.environment
  cidr_block  = "10.0.0.0/16"
}
```

## Conditional Modules

### Conditional Module Creation
```hcl
# Using count for conditional modules
module "bastion" {
  source = "./modules/bastion"
  count  = var.environment == "prod" ? 1 : 0

  vpc_id         = module.vpc.vpc_id
  subnet_id      = module.vpc.public_subnet_ids[0]
  instance_type  = "t3.micro"
}

# Using for_each
module "buckets" {
  source   = "./modules/s3-bucket"
  for_each = var.buckets

  name   = each.key
  policy = each.value.policy
  versioning = each.value.versioning
}
```

## Module Dependencies

### Explicit Dependencies
```hcl
# Module depends on other modules
module "database" {
  source = "./modules/rds"
  subnet_ids = module.vpc.private_subnet_ids
  # Implicit dependency through subnet_ids reference
}

# Explicit dependency when needed
resource "null_resource" "wait_for_cluster" {
  depends_on = [module.eks_cluster]

  provisioner "local-exec" {
    command = "aws eks update-kubeconfig --name ${module.eks_cluster.cluster_name}"
  }
}
```

## Module Versioning

### Version Constraints
```hcl
# Root module
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = ">= 5.0.0, < 6.0.0"  # Pessimistic constraint
}

module "ecs" {
  source  = "terraform-aws-modules/ecs/aws"
  version = "~> 4.0"  # Any 4.x version
}

module "rds" {
  source  = "terraform-aws-modules/rds/aws"
  version = "~> 5.0"
}
```

## Key Points
- Modules follow a standard structure: main.tf, variables.tf, outputs.tf
- Input variables define the module's configuration interface
- Outputs expose resource attributes to consumers
- Terraform Registry provides pre-built community modules
- Private registries support internal module distribution
- Version constraints ensure module compatibility
- Count and for_each enable conditional module usage
- Module composition builds complex infrastructure from simple parts
- Dependencies between modules resolve automatically
- Provider requirements should be specified in each module
- Modules can be nested for hierarchical composition
- Documentation (README) should describe module usage
- Tests in subdirectories validate module behavior
- Semantic versioning communicates module changes
- Prefer shallow module trees for maintainability
