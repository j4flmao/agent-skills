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

Design and implement backup and disaster recovery strategies — define RTO/RPO
per system tier, select backup tools, enforce retention policies, and
validate recoverability through regular testing.

## Agent Protocol

### Trigger

Any user message referencing backup, DR, RTO, RPO, data restore, retention,
cross-region replication, failover, Velero, or business continuity.

### Input Context

System inventory, criticality tiers, compliance retention requirements,
cloud provider(s), K8s clusters, databases, file storage volumes.

### Output Artifact

Backup strategy document, DR runbook, Velero configuration, retention
policy, failover procedures, testing schedule.

### Response Format

Configuration YAML, CLI commands, procedural checklists. Tables for RTO/RPO
and retention tiers.

No preamble. No postamble. No explanations. No filler/hedging/transitions.
Compress output — why use many token when few do trick.

### Completion Criteria

Backup schedule running, restore verified, DR runbook documented,
failover test passed, RTO/RPO targets met.

### Max Response Length

8000 tokens.

## Workflow

### 1. Requirements Gathering

RPO — acceptable data loss measured in time (seconds, minutes, hours). RTO
— acceptable downtime to restore service. System criticality tiers: Tier 1
(critical — RPO <5min, RTO <1hr), Tier 2 (important — RPO <1hr, RTO <4hr),
Tier 3 (non-critical — RPO <24hr, RTO <24hr). Compliance requirements
determine minimum retention periods (e.g. SOC2, PCI-DSS, HIPAA, GDPR).

### 2. Backup Types

Database — full daily backup + incremental/WAL archive every 5 minutes.
Application config — IaC snapshotted on every change (Terraform state,
K8s manifests). File storage — cross-region replication for blob storage.
Kubernetes — Velero for cluster state, PV snapshots, and namespace-level
restore. VM snapshots with application-consistent quiescing.

### 3. Storage & Retention

Backup storage in separate region or account from production. Encryption at
rest (AES-256, KMS/Customer-managed key). Retention tiers: daily backups
retained 7 days, weekly 4 weeks, monthly 12 months, yearly 7 years.
Immutable storage for compliance — WORM or Object Lock to prevent deletion.

### 4. Recovery Procedures

Database — point-in-time recovery (PITR) to any timestamp within retention
window. Application — full redeploy from IaC + config + data restore.
Kubernetes — Velero restore: `velero restore create --from-backup <name>`.
Full DR — active-passive model: failover DNS to standby region, restore
data, verify health, update DNS.

### 5. DR Testing

Scheduled failover test quarterly for Tier 1, semi-annually for Tier 2.
Tabletop exercises to validate RTO assumptions with stakeholders. Backup
restore test monthly — restore to isolated environment and verify data
integrity. Recovery runbook documented, version-controlled, and reviewed
after each test.

## Rules

1. 3-2-1 backup rule: 3 copies, 2 different media types, 1 offsite.
2. RTO/RPO defined per system tier and reviewed quarterly.
3. Backups encrypted in transit (TLS) and at rest (AES-256).
4. Backup restore tested monthly — untested backup is not a backup.
5. DR runbook tested quarterly with full failover.
6. Cross-region replication for all Tier 1 and Tier 2 systems.
7. Immutable backups to prevent ransomware deletion.
8. Backup monitoring with alerts on failure or missed schedule.

## References

- [Backup Strategies](./references/backup-strategies.md) — database backup,
  K8s Velero, file replication, retention policies
- [Disaster Recovery](./references/disaster-recovery.md) — DR patterns,
  RTO/RPO, failover, testing, runbooks

## Handoff

Hand off to backup-dr for backup strategy and DR planning.
Hand off to cloud-specific skills (aws/azure/gcp) for cloud storage
and replication. Hand off to kubernetes-patterns for Velero setup.
Hand off to monitoring for backup health alerts.
