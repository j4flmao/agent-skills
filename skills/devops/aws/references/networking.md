# Networking

## VPC Design

```
10.0.0.0/16 VPC
├── 10.0.0.0/24  public-us-east-1a    (IGW → NAT)
├── 10.0.1.0/24  public-us-east-1b    (IGW → NAT)
├── 10.0.2.0/24  public-us-east-1c    (IGW → NAT)
├── 10.0.100.0/24 private-us-east-1a  (NAT → Egress)
├── 10.0.101.0/24 private-us-east-1b  (NAT → Egress)
├── 10.0.102.0/24 private-us-east-1c  (NAT → Egress)
├── 10.0.200.0/24 database-us-east-1a (No egress)
├── 10.0.201.0/24 database-us-east-1b (No egress)
├── 10.0.202.0/24 database-us-east-1c (No egress)
└── 10.0.250.0/24 endpoint-subnet     (VPC Endpoints only)
```

## Security Groups

```hcl
# ALB — allows internet HTTP/HTTPS
resource "aws_security_group" "alb" {
  name        = "alb"
  description = "ALB security group"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS from internet"
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP redirect to HTTPS"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["10.0.0.0/8"]
    description = "Traffic to private subnets"
  }
}

# App — allows traffic only from ALB
resource "aws_security_group" "app" {
  name        = "app"
  description = "App security group"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
    description     = "HTTP from ALB"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Internet access (via NAT)"
  }
}

# RDS — allows traffic only from App SG
resource "aws_security_group" "rds" {
  name        = "rds"
  description = "RDS security group"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
    description     = "PostgreSQL from app"
  }
}
```

## NACLs

```hcl
# Stateless subnet-level rules
resource "aws_network_acl" "public" {
  vpc_id     = aws_vpc.main.id
  subnet_ids = aws_subnet.public[*].id

  ingress {
    rule_no    = 100
    protocol   = "tcp"
    from_port  = 80
    to_port    = 80
    cidr_block = "0.0.0.0/0"
    action     = "allow"
  }

  ingress {
    rule_no    = 110
    protocol   = "tcp"
    from_port  = 443
    to_port    = 443
    cidr_block = "0.0.0.0/0"
    action     = "allow"
  }

  ingress {
    rule_no    = 120
    protocol   = "tcp"
    from_port  = 1024
    to_port    = 65535
    cidr_block = "0.0.0.0/0"
    action     = "allow"
  }

  egress {
    rule_no    = 100
    protocol   = "tcp"
    from_port  = 80
    to_port    = 80
    cidr_block = "0.0.0.0/0"
    action     = "allow"
  }

  egress {
    rule_no    = 110
    protocol   = "tcp"
    from_port  = 443
    to_port    = 443
    cidr_block = "0.0.0.0/0"
    action     = "allow"
  }

  egress {
    rule_no    = 120
    protocol   = "tcp"
    from_port  = 1024
    to_port    = 65535
    cidr_block = "0.0.0.0/0"
    action     = "allow"
  }
}
```

## VPC Endpoints

```hcl
# Gateway endpoint (S3, DynamoDB — free)
resource "aws_vpc_endpoint" "s3" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.us-east-1.s3"
  route_table_ids = aws_route_table.private[*].id
}

# Interface endpoint (other services — $)
resource "aws_vpc_endpoint" "ecr" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.us-east-1.ecr.api"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.endpoint[*].id
  security_group_ids  = [aws_security_group.endpoints.id]
  private_dns_enabled = true
}

resource "aws_vpc_endpoint" "secrets_manager" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.us-east-1.secretsmanager"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.endpoint[*].id
  security_group_ids  = [aws_security_group.endpoints.id]
  private_dns_enabled = true
}
```

## Transit Gateway

```hcl
resource "aws_ec2_transit_gateway" "main" {
  description                    = "Main TGW"
  amazon_side_asn                = 64512
  auto_accept_shared_attachments = "enable"
  default_route_table_association = "enable"
  default_route_table_propagation = "enable"
}

resource "aws_ec2_transit_gateway_vpc_attachment" "dev" {
  subnet_ids         = aws_subnet.private[*].id
  transit_gateway_id = aws_ec2_transit_gateway.main.id
  vpc_id             = aws_vpc.dev.id
}

resource "aws_ec2_transit_gateway_vpc_attachment" "prod" {
  subnet_ids         = aws_subnet.private[*].id
  transit_gateway_id = aws_ec2_transit_gateway.main.id
  vpc_id             = aws_vpc.prod.id
}
```

## Architecture Rules

- 3 AZ minimum for production
- Never place RDS in public subnets
- Security Groups > NACLs (stateful vs stateless)
- VPC Endpoints over NAT for AWS service access (cost, security)
- Use PrivateLink for third-party SaaS integration
- Flow Logs to S3 for network monitoring
- Prefix Lists for repeatable CIDR management
