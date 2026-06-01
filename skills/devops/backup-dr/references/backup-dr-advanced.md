# Backup and Disaster Recovery Advanced Topics

## Introduction
Advanced backup and DR covers cross-region replication, automated DR orchestration, ransomware protection, compliance-driven retention, and continuous data protection.

## Cross-Region Disaster Recovery
Implement active-passive DR with cross-region replication. Use Route 53 DNS failover with health checks. Read replicas in DR region with promotion on failover. Database cross-region replication (Aurora Global, DynamoDB Global Tables). S3 Cross-Region Replication for object storage. Image replication for EBS and AMIs. Automate DR failover with AWS Systems Manager or custom scripts.

## Automated DR Orchestration
Use AWS Resilience Hub for resilience policy management. CloudEndure Disaster Recovery for continuous block-level replication. AWS Elastic Disaster Recovery (DRS) for automated failback. Pilot Light: replicate data, minimal compute in DR site. Warm Standby: scaled-down copy in DR region ready to scale.

## Ransomware Protection
Immutable backups with S3 Object Lock (WORM mode). Air-gapped backup with offline or isolated storage. Backup vaults with vault lock for compliance. Least-privilege backup policies and role separation. Monitoring for mass deletion or modification events. Quorum-based approval for backup deletions.

## Compliance-Driven Retention
Define retention policies per data classification tier (critical, important, routine). Financial records: 7 years. Healthcare records: 6-10 years (varies by jurisdiction). Legal hold: indefinite until hold released. Automate deletion after retention period. Audit backup compliance with AWS Config and Azure Policy.

## Continuous Data Protection
Block-level continuous replication with near-zero RPO. Database transaction log shipping for point-in-time recovery. Change Data Capture for ongoing data sync. Application-level continuous backup with CDC tools (Debezium, AWS DMS). File system continuous backup with Cloud storage sync.

## Backup for Kubernetes
Velero with CSI snapshot support. Backup etcd for cluster state recovery. PV snapshots with CSI driver. Application-consistent backups with hooks. Cluster migration between regions with Velero. Backup validation with automated restore testing.

## References
- backup-dr-fundamentals.md -- Fundamentals
- dr-strategies.md -- Disaster Recovery Strategies
- backup-automation.md -- Backup Automation
- velero-k8s-backup.md -- Velero Kubernetes Backup
- cloud-backup-services.md -- Cloud Backup Services
