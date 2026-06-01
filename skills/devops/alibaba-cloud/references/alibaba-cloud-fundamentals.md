# Alibaba Cloud Fundamentals

## Overview
Alibaba Cloud (Aliyun) is the leading cloud provider in China and Asia-Pacific, offering compute, storage, database, networking, and security services with global presence across 30+ regions.

## Core Concepts

### Region and Zone Architecture
Alibaba Cloud operates regions (geographic areas) and zones (isolated locations within regions). Each region has multiple zones for high availability. Resources within the same VPC across different zones communicate via low-latency private network. Cross-region traffic requires VPC Peering, CEN (Cloud Enterprise Network), or public internet.

### Resource Hierarchy
Account -> Resource Groups -> VPC -> vSwitch (subnet) -> ECS/ACK/RDS. RAM (Resource Access Management) controls access at account, group, or resource level. Resource groups enable cost tracking and management isolation.

### Billing Models
Subscription (monthly/yearly): discounted, best for stable workloads. Pay-as-you-go: hourly billing, best for elastic workloads. Preemptible instances: up to 90% discount, reclaimable within 5 minutes notice. Savings plans: flexible commitment across services.

## Core Services

### Compute
ECS (Elastic Compute Service): VMs with instance families (ecs.g7.xlarge = general purpose). Auto Scaling: automatic scaling based on policies. ECI (Elastic Container Instance): serverless containers. ACK (Alibaba Container Service for Kubernetes): managed Kubernetes.

### Networking
VPC: isolated network with CIDR blocks and vSwitches. Slb (Server Load Balancer): Layer 4/7 load balancing. Nat Gateway: outbound internet for private instances. CEN (Cloud Enterprise Network): interconnect VPCs across regions. DNS (Alibaba Cloud DNS): domain resolution.

### Storage
OSS (Object Storage Service): S3-compatible, 99.99999999% durability. NAS: shared file storage for ECS. Elastic Block Storage (EBS): block storage for ECS. OSS supports CDN integration, lifecycle policies, versioning, and cross-region replication.

### Database
RDS: managed MySQL/PostgreSQL/SQL Server/MariaDB with HA, read replicas, and automated backups. Redis (ApsaraDB for Redis): managed Redis with persistence and cluster mode. MongoDB: managed MongoDB. PolarDB: cloud-native MySQL/PostgreSQL compatible with 6x performance.

## Security
RAM: identity and access management with policies, roles, and SSO. Security Center: unified threat detection and compliance. WAF: web application firewall. Anti-DDoS: DDoS protection up to 300 Gbps. KMS: key management and encryption. SSL Certificates: certificate management.

## Basic Operations
```bash
# Install and configure CLI
pip install aliyun-cli
aliyun configure

# Manage ECS instances
aliyun ecs DescribeInstances --RegionId cn-hangzhou
aliyun ecs CreateInstance --ImageId ubuntu_24_04_x64 --InstanceType ecs.g7.xlarge

# Manage OSS buckets
aliyun oss ls
aliyun oss cp file.txt oss://my-bucket/

# Manage RDS
aliyun rds DescribeDBInstances --RegionId cn-hangzhou
```

## Best Practices
- Use VPC with private subnets and NAT Gateway for production.
- Enable multi-zone deployment for HA across all services.
- Use OSS lifecycle policies to transition cold data.
- Enable auto-scaling for ECS groups handling variable traffic.
- Use RAM roles instead of access keys for ECS instances.
- Enable Security Center for continuous compliance monitoring.
- Use Resource Groups for cost allocation by project/team.

## Common Use Cases
- China-market applications requiring ICP license hosting.
- Global applications needing Asia-Pacific presence.
- E-commerce with elastic traffic patterns.
- Media and entertainment with CDN delivery.
- Enterprise hybrid cloud with Alibaba Cloud Express Connect.

## References
- alibaba-cloud-advanced.md -- Advanced Alibaba Cloud topics
- ecs-compute.md -- ECS Compute Services
- networking-cdn.md -- Networking and CDN
- security-compliance.md -- Security and Compliance
