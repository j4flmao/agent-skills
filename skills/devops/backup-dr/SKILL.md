---
name: devops-backup-dr
description: |
  Trigger: "backup", "disaster recovery", "DR plan", "backup strategy",
  "RTO", "RPO", "data restore", "backup retention", "cross-region replication",
  "disaster recovery testing", "business continuity", "failover",
  "backup verification"
  Exclusion: Not for general storage configuration — use cloud-specific skills.
version: 1.0.0
author: j4flmao
license: MIT
compatibility:
  cli: true
  core: true
  editor: true
  api: true
tags: [devops, backup, disaster-recovery, phase-7]
---

# devops-backup-dr

## Purpose
Design and implement backup and disaster recovery strategies — define RTO/RPO per system tier, select backup tools, enforce retention policies, and validate recoverability through regular testing.

## Agent Protocol

### Trigger
Any user message referencing backup, DR, RTO, RPO, data restore, retention, cross-region replication, failover, Velero, or business continuity.

### Input Context
System inventory, criticality tiers, compliance retention requirements, cloud provider(s), K8s clusters, databases, file storage volumes.

### Output Artifact
Backup strategy document, DR runbook, Velero configuration, retention policy, failover procedures, testing schedule.

### Response Format
Configuration YAML, CLI commands, procedural checklists. Tables for RTO/RPO and retention tiers.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
Backup schedule running, restore verified, DR runbook documented, failover test passed, RTO/RPO targets met.

### Max Response Length
8000 tokens.

## Components

### Backup Types (Detailed)
Full backup: complete copy of all data — weekly cadence, higher storage cost, fastest restore for full recovery. Incremental backup: changes since last backup of any type — daily cadence, lowest storage cost, slower restore (must replay all incrementals). Differential backup: changes since last full backup — daily cadence, moderate storage, faster restore than incremental. Snapshot: point-in-time copy of storage volume — almost instant, cloud provider managed (EBS, PD, managed disk), limited to platform. WAL archive: continuous write-ahead log archiving for PostgreSQL — enables second-level RPO, stored in S3/GCS/Blob. Dump: logical backup via pg_dump/mysqldump — portable across versions, slower backup/restore, good for migrations.

### 3-2-1 Rule and Variants
3-2-1: 3 copies of data, 2 different storage types (e.g., S3 + tape, or local disk + cloud), 1 copy offsite (different region). 3-2-1-1-0: adds 1 immutable/air-gapped copy (for ransomware protection) and 0 errors after restore verification. 4-3-2: 4 copies, 3 media types, 2 offsite (for ultra-critical systems). Apply at each system tier: Tier 1 uses 3-2-1-1-0, Tier 2 uses 3-2-1, Tier 3 uses simple replication.

### DR Strategy Comparison
| Strategy | RTO | RPO | Cost | Complexity | Use Case |
|---|---|---|---|---|---|
| Backup-Restore | Hours | Minutes | $ | Low | Tier 3, dev/test |
| Pilot Light | <1hr | <5min | $$ | Medium | Tier 2 migration path |
| Warm Standby | <30min | <5min | $$$ | High | Tier 1 cost-conscious |
| Active-Active | Near-zero | Near-zero | $$$$ | Very High | Mission-critical Tier 1 |

### Database Backup Comparison
Snapshot: fast (seconds), simple (cloud API), limited to cloud provider, cannot restore to different DB version. PITR: second-level granularity, requires WAL/transaction log archiving, restore to any point within retention window. WAL Archiving: continuous, low storage overhead (WAL files are small), enables PITR, requires periodic archive cleanup. Dump: portable across versions, can restore to different DB engine, slower (hours for large DB), locks during backup without --no-lock flag.
RPO — acceptable data loss measured in time (seconds, minutes, hours). RTO — acceptable downtime to restore service. System criticality tiers: Tier 1 (critical — RPO <5min, RTO <1hr, payment, auth), Tier 2 (important — RPO <1hr, RTO <4hr, order management, reporting), Tier 3 (non-critical — RPO <24hr, RTO <24hr, logs, analytics), Tier 4 (best effort — no RPO/RTO, dev/test). Compliance requirements determine minimum retention periods (SOC2: 1yr, PCI-DSS: 1yr, HIPAA: 6yr, GDPR: deletion on request).

### 2. Backup Strategies
Full backup: complete copy of all data, weekly cadence. Incremental backup: changes since last backup of any type, daily cadence. Differential backup: changes since last full backup, daily cadence. 3-2-1 rule: 3 copies of data, 2 different storage media/types, 1 copy offsite (different region/account). Database backup: full daily + WAL archive every 5min (PITR capability). K8s backup: Velero for cluster state + PV snapshots. File backup: cross-region replication for blob storage. Application config: IaC snapshotted every change (Terraform state, K8s manifests).

### 3. Disaster Recovery Tiers
RPO/RTO definitions per tier: Tier 1 (RPO <5min, RTO <1hr), Tier 2 (RPO <1hr, RTO <4hr), Tier 3 (RPO <24hr, RTO <24hr), Tier 4 (no requirement). Recovery objectives drive architecture decisions: tighter RPO requires synchronous replication, tighter RTO requires pre-provisioned standby infrastructure.

### 4. DR Strategies
Backup-Restore: cheapest, slowest recovery (RTO hours, RPO minutes). Pilot Light: core services running in DR at minimum scale, scale up on failover (RTO <1hr, RPO <5min). Warm Standby: full DR environment running at reduced capacity, scale up on failover (RTO <30min, RPO <5min). Multi-Region Active-Active: traffic distributed across regions, near-zero RTO/RPO, most expensive. Strategy selection based on system tier and budget.

### 5. Tools by Platform
K8s: Velero for cluster state backup, PV snapshots, namespace-level restore, scheduled backups, cross-cloud migration. Veeam: enterprise backup for VMs, databases, and applications, with instant recovery and replication. AWS Backup: centralized backup service for RDS, EBS, S3, EFS, DynamoDB with lifecycle policies. Azure Backup: centralized backup for VMs, SQL, SAP HANA, file shares. GCP Backup and DR: managed backup/disaster recovery for Compute Engine, Cloud SQL, GKE.

### 6. Database Backup
Snapshot: cloud provider automated snapshots (RDS, Cloud SQL, Azure SQL) — fast, simple, limited to platform. PITR (Point-in-Time Recovery): restore to any point within retention window using WAL/transaction log archiving. WAL Archiving: continuous archive of write-ahead logs for PostgreSQL, enables second-level RPO. Dump: logical backup via pg_dump/mysqldump — portable, slower, good for migration or selective restore.

### 7. Testing Drills
Schedule: Tier 1 failover test quarterly, Tier 2 semi-annually, Tier 3 annually. Backup restore test monthly — restore to isolated environment, verify data integrity. Tabletop exercises to validate RTO assumptions with stakeholders. Recovery runbook documented, version-controlled, and reviewed after each test. Non-disruptive tests first (verify backups without failover), then full failover exercises.

### 8. Compliance and Governance
Retention policies aligned with compliance requirements (SOC2, PCI-DSS, HIPAA, GDPR). Immutable backups (WORM/Object Lock) to prevent ransomware deletion. Backup monitoring with alerts on failure or missed schedule. Audit trail of backup operations, restore tests, and DR drills. Encryption in transit (TLS) and at rest (AES-256, KMS). Backup storage isolated from production account/region.

## Automation and Tooling

### Automated Backup Scheduling
Database: cloud provider automated backup (RDS Automated, Cloud SQL Backup) scheduled daily during low-traffic window. Full backup: weekly on Sunday 02:00 UTC, retained 4 weeks. Transaction log: every 5 minutes, retained 7 days for PITR. Kubernetes: Velero schedule for daily cluster state backup, weekly PV snapshot. File storage: automated lifecycle policy transitions to lower tiers. Terraform state: Cloud Storage with object versioning, no explicit backup needed.

### Backup Monitoring and Alerting
Alert conditions: missed backup (no backup created within schedule window), failed backup (backup job exited with error), corrupted backup (restore validation failure), low storage (backup target near capacity). Monitoring tools: Velero built-in Prometheus metrics, cloud provider backup status via CloudWatch/Monitoring, custom Grafana dashboard showing backup age, size, and status. Notification channels: PagerDuty for failed backups, Slack for warning conditions, email digest for weekly backup status report.

### Restore Testing Automation
Monthly restore test: Velero restore to isolated namespace/RDS restore to new instance, validate data integrity (row counts, checksum), verify application health, cleanup test resources. Automated restore test script: trigger restore from latest backup -> wait for completion -> run validation queries -> report pass/fail -> cleanup. Restore test report: backup age, restore duration, data integrity check results, test pass/fail, recommendations.

### Ransomware Protection Strategy
Immutable backups: WORM storage (S3 Object Lock, GCS retention policy, Azure Blob immutability) prevents backup deletion/modification during retention period. Air-gapped backup: separate AWS account or GCP project for backups with no IAM cross-account access from production. Alert on bulk delete: monitor for unusual delete operations on backup storage, page security team. Recovery plan: isolate affected systems, identify last clean backup, restore to clean infrastructure, verify no persistence, resume operations. Frequency: immutable backup versioning with 7-year retention for critical systems.

## Rules
1. 3-2-1 backup rule: 3 copies, 2 different media types, 1 offsite.
2. RTO/RPO defined per system tier and reviewed quarterly.
3. Backups encrypted in transit (TLS) and at rest (AES-256).
4. Backup restore tested monthly — untested backup is not a backup.
5. DR runbook tested quarterly with full failover.
6. Cross-region replication for all Tier 1 and Tier 2 systems.
7. Immutable backups to prevent ransomware deletion.
8. Backup monitoring with alerts on failure or missed schedule.
9. Retention policies aligned with compliance requirements.
10. Full + incremental backup strategy for cost-effective coverage.
11. Air-gapped backup account with no IAM trust from production.
12. Restore test automation in CI — human forgets, automation does not.
13. WORM/immutable storage for all production backups.
14. Backup failure alerts paged within 5 minutes of missed schedule.
15. DR runbook includes fallback procedure for when primary failover fails.
16. Compliance retention policy overrides cost optimization for backup storage.
17. Backup encryption keys stored separately from backup data (KMS/HSM).
18. Backup integrity verified by checksum validation after every backup job.
19. DR test simulates real failure conditions — not just button-click validation.
20. Backup storage costs tracked separately per system tier for chargeback and optimization.

## DR Scenario Playbooks

### Scenario: Regional Outage (Primary Region Down)
Tier 1 systems trigger automated failover: health check fails in primary region, Route53/CloudDNS shifts traffic to DR region, Cloud SQL Read Replica promoted to primary, Velero backup restored in DR region if needed. Tier 2 systems: manual failover begins 15 minutes after Tier 1. Tier 3 systems: backup-restore mode, provision infrastructure from Terraform, restore from backup, update DNS. Post-failover: validate all systems in DR region, monitor for 30 minutes, communicate status to stakeholders.

### Scenario: Database Corruption
Detect: data integrity check fails, application error rate spikes, users report incorrect data. Contain: isolate affected database, block write traffic, switch read traffic to read replica. Recover: identify last clean backup before corruption timestamp, restore database to isolated instance, validate data integrity, cut over to restored database. Learn: investigate root cause (bug, migration error, operator error), add data integrity checks, improve backup validation, review database access controls.

### Scenario: Ransomware Attack
Detect: unusual encryption pattern on files, ransom note discovered. Contain: isolate affected systems from network, block storage write access, preserve forensic evidence. Assess: determine blast radius — which systems, what data, backup status. Recover: restore from immutable backup in air-gapped account, rebuild infrastructure from IaC, verify no attacker persistence. Learn: improve immutable backup strategy, test restores, review IAM policies, implement backup air-gapping, review incident response plan.

## Compliance and Audit
Regulatory requirements by framework: SOC2 — backup retention 1 year, annual DR test. PCI-DSS — backup retention 1 year, quarterly restore test, encrypted backups, access logging. HIPAA — backup retention 6 years, annual DR test, BAA with backup provider, encryption at rest and in transit. GDPR — right to erasure extends to backups (deletion within 30 days of request), data inventory mapping to backup sets. Compliance mapping: each backup strategy document includes compliance framework references, retention policy derived from strictest applicable regulation, audit evidence collected automatically via backup tool logs and restore test reports.

## Integration with Incident Response
Backup/DR incidents declared through incident management process (SEV classification). Backup failure: missed schedule for 24+ hours escalates as SEV3, 48+ hours as SEV2. Restore failure: restore test fails for Tier 1 data escalates as SEV2. DR test failure: failover test fails for Tier 1 escalates as SEV1. Incident runbook includes: check backup status, verify backup integrity, initiate restore from last known good backup, escalate to backup admin if needed, communicate timeline to stakeholders.

## Business Continuity Planning
BCP defines organizational response beyond technical DR: alternate work locations, communication tree for stakeholders, customer notification templates, regulatory reporting requirements, insurance claim procedures. BCP linked to DR runbooks: when to declare business continuity event (vs technical incident), who makes the call (CEO/CISO for BCP, on-call engineer for technical incident), how long before BCP is enacted (typically 4-8 hours of downtime). BCP testing: annual tabletop exercise with business stakeholders, quarterly update of contact lists and templates.

## References
- [Backup Strategies](./references/backup-strategies.md) — database backup, K8s Velero, file replication, retention policies
- [Disaster Recovery](./references/disaster-recovery.md) — DR patterns, RTO/RPO, failover, testing, runbooks

## Handoff
Hand off to backup-dr for backup strategy and DR planning. Hand off to cloud-specific skills (aws/azure/gcp) for cloud storage and replication. Hand off to kubernetes-patterns for Velero setup. Hand off to monitoring for backup health alerts. Hand off to incident-response when DR failover triggers incident response process. Hand off to security for ransomware protection and backup encryption key management. Hand off to finops for backup storage cost optimization and lifecycle management.
