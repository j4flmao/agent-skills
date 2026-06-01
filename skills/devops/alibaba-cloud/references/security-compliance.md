# Alibaba Cloud Security and Compliance

## IAM Best Practices
RAM (Resource Access Management): manage users, groups, roles. Least privilege: grant only required permissions. RAM roles for cross-account access. OIDC/SAML federation with enterprise IdP. AccessKey rotation: rotate every 90 days. RAM policy conditions: source IP, MFA, time window.

## Network Security
Security Groups: stateful firewall per ECS instance. Configure inbound/outbound rules with specific CIDR. Default deny inbound, allow outbound. Network ACLs: stateless, subnet-level filtering. SSL VPN for remote user access. IPsec-VPN for site-to-site connectivity.

## Data Protection
KMS (Key Management Service): envelope encryption, key rotation. OSS server-side encryption with KMS or AES256. RDS encryption at rest and in transit. SSL/TLS enforcement for database connections. Backup compliance: cross-region backup for critical data.

## Compliance Certifications
ISO 27001, SOC 2, SOC 3, PCI DSS, GDPR. Alibaba Cloud compliance center provides reports. Region-specific compliance (China: MLPS, Germany: C5). Compliance responsibility: Alibaba secures the cloud, customer secures in cloud.

## Logging and Monitoring
ActionTrail: record all API calls for audit. Configure multi-region trail for global coverage. Log Service for real-time log analysis. OSS log storage with retention policies. Security Center for vulnerability management. SIEM integration with ActionTrail logs.

## References
- alibaba-cloud-fundamentals.md -- Fundamentals
- aliyun-ecs-vpc.md -- ECS and VPC
- aliyun-kubernetes.md -- Kubernetes
- aliyun-security.md -- Security
- aliyun-database.md -- Database
