# Backup and Disaster Recovery Fundamentals

## Overview
Backup and Disaster Recovery (DR) strategies ensure data protection, business continuity, and regulatory compliance. Backup creates point-in-time copies of data. Disaster Recovery restores IT infrastructure after a catastrophic failure.

## Core Concepts

### Recovery Objectives
RPO (Recovery Point Objective): maximum acceptable data loss measured in time. RPO of 1 hour means losing at most 1 hour of data. Determines backup frequency. RTO (Recovery Time Objective): maximum acceptable downtime after failure. RTO of 4 hours means system must be restored within 4 hours. Determines recovery strategy complexity.

### Backup Types
Full backup: complete copy of all data. Largest storage, longest to create, fastest to restore. Incremental backup: only data changed since last backup. Fastest to create, smallest storage, requires full + all incrementals to restore. Differential backup: only data changed since last full backup. Medium size and speed, requires full + latest differential to restore.

### 3-2-1 Rule
Three copies of data. Two different storage media. One copy offsite (different geographic location). Modern variants add: one copy immutable (air-gapped or object lock) and one copy in a different cloud or on-prem.

### Disaster Recovery Strategies
Backup and Restore: cheapest, highest RTO (hours-days). Pilot Light: core services running minimal, scale up on DR. Warm Standby: scaled-down copy of production running continuously. Multi-Site Active/Active: full production in two locations, immediate failover. Hot Standby: duplicate production ready to take over instantly.

## Key Components

### Backup Sources
Databases: transaction logs enable point-in-time recovery. Applications: configuration, state, and data stores. Filesystems: file-level or block-level backups. Virtual Machines: entire VM snapshots and images. Kubernetes: etcd, PV snapshots, cluster config. Cloud Resources: S3 versioning, RDS snapshots, EBS snapshots.

### Backup Storage
Local disk: fastest restore, vulnerable to site failure. Network storage: centralized management. Cloud object storage: durable, scalable, geo-redundant. Tape: slow, durable, air-gapped, for archival compliance. Immutable storage: object lock prevents deletion or modification.

### Backup Software
Velero: Kubernetes backup and migration. Veeam: enterprise backup for VMs, cloud, and SaaS. Commvault: enterprise data protection. Restic/Rclone: open-source backup tools. AWS Backup: centralized backup across AWS services. Azure Backup: native Azure backup service.

## Basic Backup Strategy

### RDS Backup Strategy
```hcl
resource "aws_db_instance" "main" {
  backup_retention_period = 30
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-05:00"
  copy_tags_to_snapshot   = true
  deletion_protection     = true
  skip_final_snapshot     = false
  final_snapshot_identifier = "final-${var.environment}"
}
```

### Kubernetes Backup with Velero
```bash
velero install --provider aws --bucket velero-backups --backup-location-config region=us-east-1
velero backup create daily-backup --include-namespaces production --ttl 720h
velero schedule create daily --schedule "0 3 * * *" --include-namespaces production --ttl 720h
velero restore create --from-backup daily-backup
```

## Best Practices
- Define RPO and RTO for each service tier (critical, important, best-effort).
- Automate backup scheduling and monitoring.
- Test restore procedures quarterly at minimum.
- Implement the 3-2-1 rule for critical data.
- Use immutable backups to protect against ransomware.
- Monitor backup success/failure and alert on failures.
- Document DR runbook with step-by-step recovery steps.
- Store encryption keys separately from backup data.

## References
- backup-dr-advanced.md -- Advanced Backup and DR topics
- dr-strategies.md -- Disaster Recovery Strategies
- backup-automation.md -- Backup Automation
- velero-k8s-backup.md -- Velero Kubernetes Backup
- cloud-backup-services.md -- Cloud Backup Services
