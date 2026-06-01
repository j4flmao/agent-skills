# AWS Fundamentals

## Overview
Amazon Web Services (AWS) is the leading cloud provider with over 200 services across compute, storage, database, networking, security, analytics, and machine learning. AWS operates in 30+ geographic regions worldwide.

## Core Concepts

### Global Infrastructure
Regions: geographic areas with 2-6 Availability Zones each. AZs: isolated data centers with low-latency connectivity. Edge Locations: CDN points of presence for CloudFront. Local Zones: edge locations with compute/storage for low-latency use cases. Wavelength: edge compute for 5G applications.

### Account Structure
AWS Organizations manage multiple accounts with consolidated billing. Accounts are organized into organizational units (OUs) for policy-based management. Service Control Policies (SCPs) restrict permissions at OU level. Use separate accounts per environment (dev, staging, prod).

### VPC Architecture
VPC: isolated virtual network with CIDR block, subnets (public/private), route tables, internet gateway, NAT gateway, security groups, and network ACLs. Subnets map to single AZ. Security groups are stateful firewalls at instance level. Network ACLs are stateless at subnet level.

## Core Services

### Compute
EC2: virtual machines with instance families (general, compute, memory, GPU). Auto Scaling: dynamic scaling with health checks. Lambda: serverless function compute. ECS/EKS: container orchestration (Fargate serverless or EC2-backed). Elastic Beanstalk: PaaS for simple deployments.

### Storage
S3: object storage with 99.99999999% durability. Classes: Standard, Intelligent-Tiering, Standard-IA, One Zone-IA, Glacier, Glacier Deep Archive. EBS: block storage for EC2. EFS: managed NFS file system. FSx: managed Windows File Server and Lustre.

### Database
RDS: managed MySQL, PostgreSQL, MariaDB, SQL Server, Oracle, Aurora. DynamoDB: NoSQL key-value and document database. ElastiCache: managed Redis and Memcached. DocumentDB: MongoDB-compatible. Neptune: graph database. Redshift: data warehouse.

### Security
IAM: users, groups, roles, and policies. AWS Organizations: multi-account management. KMS: key management and encryption. CloudTrail: API audit logging. GuardDuty: threat detection. Security Hub: compliance and security dashboard. WAF: web application firewall. Shield: DDoS protection.

## Basic Operations
```bash
# CLI configuration
aws configure
aws configure set region us-east-1

# S3 operations
aws s3 ls
aws s3 cp file.txt s3://my-bucket/
aws s3 sync local/ s3://my-bucket/

# EC2 operations
aws ec2 describe-instances
aws ec2 run-instances --image-id ami-xxx --instance-type t3.micro

# IAM
aws iam list-users
aws iam create-role --role-name MyRole --assume-role-policy-document file://trust-policy.json
```

## Best Practices
- Use AWS Organizations with multiple accounts for workload isolation.
- Implement least-privilege IAM with roles instead of users.
- Enable CloudTrail in all regions and organizations.
- Use VPC with private subnets and NAT gateway for production.
- Enable S3 Block Public Access at account level.
- Use tags (Environment, Project, Team, CostCenter) on all resources.
- Enable AWS Config for resource compliance monitoring.
- Use AWS Backup for centralized backup management.

## References
- aws-advanced.md -- Advanced AWS topics
- ec2-compute.md -- EC2 Compute Services
- networking-vpc.md -- VPC Networking
- storage-s3.md -- S3 Storage
- database-services.md -- AWS Database Services
- security-iam.md -- Security and IAM
- serverless.md -- Lambda and Serverless
