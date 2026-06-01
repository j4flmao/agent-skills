# AWS Advanced Topics

## Introduction
Advanced AWS covers multi-account architecture with AWS Organizations, complex networking, enterprise security, cost optimization at scale, and migration strategies.

## Multi-Account Strategy
AWS Organizations with SCPs for permission guardrails. Account per workload environment (dev, staging, prod, security, logging, shared services). Centralized logging with CloudWatch Logs cross-account subscription. Centralized networking with Transit Gateway. Consolidated billing with cost allocation tags. AWS Control Tower for automated account governance.

## Advanced Networking
Transit Gateway: hub-and-spoke connectivity between VPCs and on-premises. VPC Lattice: service-to-service connectivity across accounts and VPCs. PrivateLink: private access to services across VPC boundaries. AWS Network Firewall: managed firewall with intrusion prevention. Cloud WAN: global wide-area network. Route 53 Resolver: hybrid DNS resolution.

## Enterprise Security
AWS SSO for centralized identity with SCIM provisioning. IAM Roles Anywhere for on-premises workloads. AWS Verified Access for zero-trust network access. GuardDuty for intelligent threat detection. Detective for investigation and root cause analysis. Macie for sensitive data discovery and protection.

## Advanced Compute Patterns
ECS Anywhere: run ECS tasks on-premises. EKS Hybrid Nodes: extend on-premises servers to EKS cluster. ParallelCluster for HPC workloads. Wavelength for 5G edge computing. Outposts for AWS infrastructure on-premises. Local Zones for ultra-low-latency applications.

## Advanced Storage
S3 Object Lambda for data transformation at read. S3 Multi-Region Access Points for multi-region access. S3 Intelligent-Tiering with automatic monitoring. EFS Replication for cross-region file replication. FSx for ONTAP for NetApp-compatible storage. Storage Gateway for hybrid cloud storage.

## Advanced Database
Aurora Global Database for cross-region replication with <1s RPO. DynamoDB Accelerator (DAX) for microsecond read latency. DynamoDB Global Tables for multi-region active-active. RDS Proxy for connection pooling at scale. DocumentDB with MongoDB 6.0 compatibility. MemoryDB for Redis with durable storage.

## Advanced CI/CD
CodePipeline with parallel actions and manual approval stages. CodeBuild with batch builds for monorepos. CodeDeploy with blue/green deployments. Amazon ECR with cross-account replication. Image scanning with ECR basic and enhanced scanning.

## References
- aws-fundamentals.md -- Fundamentals
- ec2-compute.md -- EC2 Compute
- networking-vpc.md -- VPC Networking
- storage-s3.md -- Storage
- database-services.md -- Databases
- security-iam.md -- Security
- serverless.md -- Serverless
