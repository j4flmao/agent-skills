# Well-Architected Framework

## Five Pillars

### 1. Operational Excellence
Run and monitor systems to deliver business value.

| Practice | AWS Well-Architected | Azure Well-Architected | GCP Architecture Framework |
|----------|---------------------|----------------------|---------------------------|
| IaC | CloudFormation/CDK | ARM/Bicep/Terraform | Deployment Manager/Terraform |
| CI/CD | CodePipeline, CodeBuild | DevOps Pipelines | Cloud Build |
| Monitoring | CloudWatch, X-Ray | Monitor, App Insights | Cloud Monitoring, Trace |
| Runbooks | Systems Manager | Automation, Runbooks | Cloud Workflows |
| Change Management | Change Manager | Change Analysis | Deployment Manager |

### 2. Security
Protect data, systems, and assets.

| Practice | AWS | Azure | GCP |
|----------|-----|-------|-----|
| IAM | IAM roles, policies | RBAC, Managed Identity | IAM, Service Accounts |
| Encryption | KMS, ACM, CloudHSM | Key Vault | Cloud KMS, CMEK |
| Network Security | Security Groups, NACL, WAF | NSG, Azure Firewall, WAF | VPC Firewall, Cloud Armor |
| Secret Management | Secrets Manager, Parameter Store | Key Vault | Secret Manager |
| Threat Detection | GuardDuty, Security Hub | Defender for Cloud | Security Command Center |

### 3. Reliability
Recover from failures, mitigate disruptions.

| Practice | AWS | Azure | GCP |
|----------|-----|-------|-----|
| HA Multi-AZ | Auto Scaling, ELB | Availability Zones, Load Balancer | Managed Instance Groups, LB |
| DR Cross-Region | RDS Cross-Region, S3 CRR | Site Recovery, GRS | Cloud Storage dual-region |
| Backup | Backup, S3 Versioning | Backup Center, Recovery Vault | Backup and DR Service |
| Health Checks | Route53, ELB health | Load Balancer probes | Health Check, LB |

### 4. Performance Efficiency
Use resources efficiently.

| Practice | AWS | Azure | GCP |
|----------|-----|-------|-----|
| Auto Scaling | EC2 Auto Scaling, ECS/EKS | VMSS, AKS autoscale | MIG, GKE autopilot |
| Caching | ElastiCache, CloudFront | Redis Cache, CDN | Memorystore, Cloud CDN |
| Serverless | Lambda, Fargate | Functions, Container Apps | Cloud Functions, Cloud Run |
| CDN | CloudFront | Front Door/CDN | Cloud CDN, Cloud Load Balancer |

### 5. Cost Optimization
Avoid unnecessary costs.

| Practice | AWS | Azure | GCP |
|----------|-----|-------|-----|
| Right-sizing | Compute Optimizer | Advisor | Recommender |
| Reserved Instances | RI, Savings Plan | Reserved VM Instances | Committed Use Discounts |
| Spot/Preemptible | Spot Instances | Spot VMs | Preemptible VMs |
| Storage Tiering | S3 Intelligent-Tiering | Blob Access Tiers | Nearline/Coldline/Archive |
| Cost Visibility | Cost Explorer | Cost Management | Billing Reports |

## Well-Architected Review Checklist
- [ ] Pillar 1: Operational Excellence — IaC, monitoring, runbooks, CI/CD
- [ ] Pillar 2: Security — IAM, encryption, network security, secrets, threat detection
- [ ] Pillar 3: Reliability — HA, DR, backup, health checks, SLAs
- [ ] Pillar 4: Performance Efficiency — Auto scaling, caching, right-sizing, serverless
- [ ] Pillar 5: Cost Optimization — Reserved capacity, storage tiering, cost monitoring
- [ ] Cross-cutting: tagging strategy, logging, alerting, compliance
