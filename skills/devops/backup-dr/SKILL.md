---
name: backup-dr
description: >
  Use this skill when the user says 'backup', 'disaster recovery', 'DR',
  'RPO', 'RTO', 'backup strategy', '3-2-1 rule', 'business continuity',
  'disaster recovery plan', 'failover', 'failback', 'replication',
  'snapshot', 'backup automation', 'backup validation', 'offsite backup',
  'immutable backup', 'ransomware protection'.
  Covers: backup strategies (3-2-1 rule), disaster recovery planning,
  RPO/RTO definition, backup automation, replication, failover testing,
  cloud DR (pilot light, warm standby, multi-region), backup validation,
  compliance (SOC 2, HIPAA, PCI), ransomware recovery.
  Do NOT use for: database-specific replication (use database-migration),
  storage architecture design (use storage-infrastructure).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, backup, disaster-recovery, business-continuity, phase-5]
---

# Backup and Disaster Recovery

## Purpose
Design and implement backup strategies and disaster recovery plans with defined RPO/RTO, the 3-2-1 rule, automation, validation, and cloud DR patterns.

## Agent Protocol

### Trigger
Exact user phrases: "backup", "disaster recovery", "DR", "RPO", "RTO", "backup strategy", "3-2-1 rule", "business continuity", "failover", "failback", "snapshot", "backup automation".

### Input Context
Before activating, verify:
- Infrastructure type (on-prem VMs, cloud instances, Kubernetes, databases, files).
- Current RPO/RTO targets (recovery point/time objectives).
- Compliance requirements (HIPAA, PCI, SOC 2, GDPR — determines retention).
- Budget for backup storage and DR infrastructure.
- Criticality tier: Tier 1 (minutes RPO), Tier 2 (hours), Tier 3 (days).
- Existing backup tools (Veeam, Rubrik, Commvault, cloud-native).

### Output Artifact
Writes to backup automation scripts (Python/Bash/PowerShell), Terraform for DR infra, runbooks, and CI/CD pipeline for backup validation.

### Response Format
Configuration files, scripts, and runbook templates with no extraneous explanation.

No preamble. No postamble. No explanations. No filler/hedging/transitions.

### Completion Criteria
- [ ] RPO and RTO defined per workload tier.
- [ ] 3-2-1 backup strategy implemented (3 copies, 2 media, 1 offsite).
- [ ] Backup automation configured with alerting.
- [ ] DR plan documented with failover/failback procedures.
- [ ] Backup validation testing scheduled (automated restore test).
- [ ] Immutable backups configured for ransomware protection.

### Max Response Length
Direct file write. No response text.

## Architecture Decision Trees

### Backup Strategy by Workload Tier
| Tier | RPO | RTO | Backup Frequency | Storage | Cost |
|---|---|---|---|---|---|
| Tier 1 (Critical) | <15 min | <1 hour | Continuous / 5 min | SSD + offsite replica | $$$ |
| Tier 2 (Important) | <1 hour | <4 hours | Hourly | HDD + offsite | $$ |
| Tier 3 (Standard) | <24 hours | <24 hours | Daily | HDD + cold archive | $ |
| Tier 4 (Archive) | N/A | <7 days | Weekly/Monthly | Cold/Glacier | $ |

### Backup Target: On-Prem vs Cloud vs Hybrid
| Strategy | Recovery Speed | Cost | Complexity | Security |
|---|---|---|---|---|
| On-prem only (tape/NAS) | Fast (local) | High (CAPEX) | Low | Physical security |
| Cloud only (S3/Blob) | Depends on network | Pay-per-use | Low | Encryption built-in |
| Hybrid (local + cloud) | Fast local, cloud DR | Medium | Medium | Best of both |
| Multi-cloud backup | DR flexibility | High | High | Complex compliance |

### Cloud DR Patterns
| Pattern | RTO | RPO | Cost | Use Case |
|---|---|---|---|---|
| Backup & Restore | Hours | 24 hours | Low | Non-critical |
| Pilot Light (core only) | Minutes | ~1 hour | Medium | Critical but budget-constrained |
| Warm Standby (scaled-down) | Minutes | ~15 min | Medium-High | Always-on failover |
| Multi-site Active-Active | Real-time | Real-time | Very High | Zero downtime required |

### Cloud Provider DR Services
| AWS | Azure | GCP | Purpose |
|---|---|---|---|
| AWS Backup | Azure Backup | Backup and DR | Managed backup service |
| S3 Cross-Region Replication | Azure Site Recovery | Cloud Storage DR | Storage replication |
| RDS Multi-AZ / Cross-Region | Azure SQL Geo-Replication | Cloud SQL HA | Database DR |
| DRS (Elastic Disaster Recovery) | Azure Site Recovery | Migrate for Compute | VM-level replication |
| CloudEndure | Azure Site Recovery | Migrate for Compute | Continuous block-level |

### Ransomware Protection Methods
| Protection | How It Works | Immutable | Recovery Speed |
|---|---|---|---|
| Immutable S3 (Object Lock) | WORM policy on S3 buckets | Yes (compliance mode) | Fast |
| Air-gapped backup | Physically disconnected backup storage | Yes | Slow (needs connection) |
| Write-Once tape | Physical WORM tape | Yes | Very slow |
| Cloud object lock (Blob/Azure) | Immutable blobs with legal hold | Yes | Fast |
| Backup copy with retention lock | Veeam/Commvault immutable copy | Yes (vendor) | Fast |

## Quick Start
Identify workload tiers → Set RPO/RTO → Implement 3-2-1 backup → Automate with scripts/CI → Configure alerts → Test restore → Document DR plan → Schedule recurring validation.

## Core Workflow

### Step 1: Backup Policy Definition
```yaml
# backup-policies.yaml
workloads:
  - name: production-database
    tier: 1
    type: postgresql
    rpo: 15m
    rto: 1h
    backup_frequency: continuous_wal
    full_backup: daily
    retention:
      daily: 30
      weekly: 12
      monthly: 12
      yearly: 7
    storage:
      primary: ssd_gp3
      offsite: s3_standard
      archive: glacier_deep_archive
    replication:
      type: cross_region
      target_region: us-west-2
    encryption:
      at_rest: aes256
      in_transit: tls12
    monitoring:
      backup_success_sli: 99.9
      restore_test_frequency: monthly

  - name: application-files
    tier: 2
    type: file_server
    rpo: 1h
    rto: 4h
    backup_frequency: hourly
    retention:
      hourly: 24
      daily: 30
      weekly: 8
      monthly: 6
    storage:
      primary: hdd_sc1
      offsite: s3_standard_ia

  - name: development-servers
    tier: 3
    type: ec2_instances
    rpo: 24h
    rto: 24h
    backup_frequency: daily
    retention:
      daily: 7
      weekly: 4
    storage:
      primary: s3_standard
      offsite: s3_glacier_instant
```

### Step 2: AWS Backup Automation
```terraform
# backup/aws-backup.tf
resource "aws_backup_vault" "primary" {
  name        = "primary-backup-vault"
  kms_key_arn = aws_kms_key.backup.arn
}

resource "aws_backup_vault" "dr" {
  name        = "dr-backup-vault"
  kms_key_arn = aws_kms_key.backup_dr.arn
}

resource "aws_backup_vault_lock_configuration" "primary" {
  backup_vault_name   = aws_backup_vault.primary.name
  min_retention_days  = 7
  max_retention_days  = 3650
  changeable_for_days = 3
}

resource "aws_backup_plan" "production" {
  name = "production-backup-plan"

  rule {
    rule_name           = "daily-full-backup"
    target_vault_name   = aws_backup_vault.primary.name
    schedule            = "cron(0 2 * * ? *)"
    start_window        = 60
    completion_window   = 180
    lifecycle {
      delete_after = 90
    }
    recovery_point_tags = {
      Environment = "production"
      Type        = "daily"
    }
  }

  rule {
    rule_name           = "hourly-log-backup"
    target_vault_name   = aws_backup_vault.primary.name
    schedule            = "cron(0 * * * ? *)"
    start_window        = 15
    completion_window   = 30
    lifecycle {
      delete_after = 7
    }
  }

  rule {
    rule_name         = "cross-region-copy"
    target_vault_name = aws_backup_vault.dr.name
    lifecycle {
      delete_after = 365
    }
    copy_action {
      lifecycle {
        delete_after = 365
      }
      destination_vault_arn = aws_backup_vault.dr.arn
    }
  }

  advanced_backup_setting {
    backup_options = {
      WindowsVSS = "enabled"
    }
    resource_type = "EC2"
  }
}

resource "aws_backup_selection" "production_resources" {
  name         = "production-backup-selection"
  plan_id      = aws_backup_plan.production.id
  resources = [
    aws_rds_cluster.production.arn,
    aws_ec2_instance.app.arn,
    aws_efs_file_system.data.arn,
    aws_dynamodb_table.orders.arn,
  ]
  selection_tag {
    type  = "STRING_EQUAL"
    key   = "BackupPlan"
    value = "production"
  }
}

resource "aws_backup_global_settings" "org_settings" {
  global_settings = {
    "crossAccountBackupEnabled" = "true"
  }
}
```

### Step 3: Database Backup Automation (PostgreSQL)
```python
#!/usr/bin/env python3
# backup/db_backup.py
"""Automated PostgreSQL backup with WAL archiving and offsite replication."""

import os
import sys
import json
import boto3
import logging
import subprocess
from datetime import datetime, timedelta
from pathlib import Path

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configuration
DB_NAME = os.environ.get("DB_NAME", "production")
DB_HOST = os.environ.get("DB_HOST", "localhost")
DB_PORT = os.environ.get("DB_PORT", "5432")
DB_USER = os.environ.get("DB_USER", "backup_user")
S3_BUCKET = os.environ.get("S3_BUCKET", "myapp-backups")
BACKUP_DIR = Path("/backup")
RETENTION_DAYS = 90
WAL_RETENTION_HOURS = 24

def create_full_backup():
    """Create a full database backup using pg_dump with parallel compression."""
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    backup_file = BACKUP_DIR / f"{DB_NAME}_full_{timestamp}.dump.gz"

    logger.info(f"Starting full backup: {backup_file}")

    # Use pg_dump with custom format for parallel restore support
    cmd = [
        "pg_dump",
        f"--dbname=postgresql://{DB_USER}@{DB_HOST}:{DB_PORT}/{DB_NAME}",
        "--format=custom",      # Custom format for pg_restore
        "--compress=9",         # Max compression
        "--verbose",
        "--no-owner",           # Portable
        "--no-acl",             # Portable
        f"--file={backup_file}",
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        logger.error(f"Backup failed: {result.stderr}")
        raise RuntimeError(f"pg_dump failed: {result.stderr}")

    logger.info(f"Full backup completed: {backup_file} ({backup_file.stat().st_size / 1024 / 1024:.2f} MB)")
    return backup_file

def upload_to_s3(file_path, storage_class="STANDARD_IA"):
    """Upload backup file to S3 with server-side encryption."""
    s3_key = f"db-backups/{DB_NAME}/{file_path.name}"

    s3_client = boto3.client("s3")
    s3_client.upload_file(
        Filename=str(file_path),
        Bucket=S3_BUCKET,
        Key=s3_key,
        ExtraArgs={
            "StorageClass": storage_class,
            "ServerSideEncryption": "aws:kms",
            "SSEKMSKeyId": os.environ.get("KMS_KEY_ID"),
            "Metadata": {
                "database": DB_NAME,
                "timestamp": datetime.utcnow().isoformat(),
                "type": "full",
            }
        }
    )

    # Verify upload
    response = s3_client.head_object(Bucket=S3_BUCKET, Key=s3_key)
    assert response["ContentLength"] == file_path.stat().st_size
    logger.info(f"Uploaded to s3://{S3_BUCKET}/{s3_key} ({response['ContentLength'] / 1024 / 1024:.2f} MB)")
    return s3_key

def cleanup_old_backups():
    """Remove local backup files older than retention period."""
    cutoff = datetime.utcnow() - timedelta(days=RETENTION_DAYS)
    for f in BACKUP_DIR.glob(f"{DB_NAME}_full_*.dump.gz"):
        mtime = datetime.fromtimestamp(f.stat().st_mtime)
        if mtime < cutoff:
            f.unlink()
            logger.info(f"Cleaned up old backup: {f}")

def verify_backup_integrity(backup_file):
    """Verify backup file integrity using pg_restore --list."""
    cmd = ["pg_restore", "--list", str(backup_file)]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        logger.error(f"Backup integrity check failed: {result.stderr}")
        raise RuntimeError("Backup file corrupted")
    logger.info(f"Backup integrity verified: {backup_file}")
    return True

def backup_wal():
    """Archive WAL segments for point-in-time recovery."""
    wal_dir = Path("/var/lib/postgresql/16/main/pg_wal")
    s3_client = boto3.client("s3")
    cutoff = datetime.utcnow() - timedelta(hours=WAL_RETENTION_HOURS)

    for wal_file in wal_dir.glob("0*"):
        mtime = datetime.fromtimestamp(wal_file.stat().st_mtime)
        s3_key = f"db-backups/{DB_NAME}/wal/{wal_file.name}"

        if mtime < cutoff:
            continue  # already archived

        try:
            s3_client.head_object(Bucket=S3_BUCKET, Key=s3_key)
        except boto3.exceptions.ClientError:
            s3_client.upload_file(
                Filename=str(wal_file),
                Bucket=S3_BUCKET,
                Key=s3_key,
                ExtraArgs={"StorageClass": "STANDARD_IA"}
            )
            logger.debug(f"Archived WAL: {wal_file.name}")

def main():
    """Main backup orchestration."""
    try:
        backup_file = create_full_backup()
        verify_backup_integrity(backup_file)
        upload_to_s3(backup_file)
        backup_wal()
        cleanup_old_backups()
        logger.info("Backup cycle completed successfully")
        return 0
    except Exception as e:
        logger.error(f"Backup cycle failed: {e}")
        # Alert via SNS
        sns = boto3.client("sns")
        sns.publish(
            TopicArn=os.environ["SNS_TOPIC_ARN"],
            Subject=f"[ALERT] Database backup failed - {DB_NAME}",
            Message=str(e),
        )
        return 1

if __name__ == "__main__":
    sys.exit(main())
```

### Step 4: Disaster Recovery Runbook
```markdown
# Disaster Recovery Runbook — Production Environment
# Version: 2.1
# Last tested: 2025-05-15

## 1. Incident Classification
| Severity | Description | Response Time |
|---|---|---|
| SEV1 | Complete outage, data loss | 15 min |
| SEV2 | Partial outage, degraded | 30 min |
| SEV3 | Minor, non-critical | 2 hours |

## 2. Activation Criteria
- Primary region unreachable for > 5 minutes (health check timeout)
- Data corruption detected (checksum mismatch > 0.1%)
- Ransomware detected in production environment
- > 10% of production instances unhealthy

## 3. Pre-Flight Checks (run before failover)
- [ ] Verify DR infrastructure is operational (DR region resources)
- [ ] Confirm DNS TTL set to 60 seconds (or lower)
- [ ] Check network connectivity between DR region and dependencies
- [ ] Verify backup consistency (latest restore test passed)
- [ ] Notify stakeholders (incident channel, on-call, management)
- [ ] Scale up DR environment to production capacity

## 4. Failover Procedure (estimated: 30-60 min)

### Phase 1: Database Failover (15 min)
```bash
# Promote read replica to primary in DR region
aws rds promote-read-replica \
  --db-instance-identifier production-dr \
  --region us-west-2

# Update application config to point to new primary
aws rds describe-db-instances \
  --db-instance-identifier production-dr \
  --query 'DBInstances[0].Endpoint.Address' \
  --region us-west-2

# Verify database is accepting writes
psql -h $DR_ENDPOINT -U app_user -d production -c "SELECT NOW();"
```

### Phase 2: Compute Failover (15 min)
```bash
# Update Route53 DNS to point to DR load balancer
aws route53 change-resource-record-sets \
  --hosted-zone-id ZONE_ID \
  --change-batch '{
    "Changes": [
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "app.example.com",
          "Type": "A",
          "AliasTarget": {
            "HostedZoneId": "DR_ALB_ZONE_ID",
            "DNSName": "dr-alb-123456.us-west-2.elb.amazonaws.com",
            "EvaluateTargetHealth": true
          }
        }
      }
    ]
  }'

# Scale up DR application fleet
aws autoscaling update-auto-scaling-group \
  --auto-scaling-group-name dr-app-asg \
  --min-size 3 \
  --max-size 20 \
  --desired-capacity 5
```

### Phase 3: Validation (15 min)
```bash
# Health check
curl -f https://app.example.com/health

# Database connectivity
curl -f https://app.example.com/api/health/db

# Data integrity - compare row counts
psql -h $DR_ENDPOINT -d production \
  -c "SELECT count(*) FROM orders WHERE created_at > NOW() - INTERVAL '1 hour';"

# Verify cache is warm
curl -f http://redis-metrics:9121/metrics | grep redis_keyspace_hits
```

### Phase 4: Verification Checklist
- [ ] All services responding with 200 OK
- [ ] Database read/write operational
- [ ] Background jobs processing
- [ ] Monitoring alerts firing correctly (DR baseline)
- [ ] Team notified of successful failover
- [ ] Incident ticket updated

## 5. Failback Procedure (when primary is restored)
1. Reverse database replication (promote original primary)
2. Point DNS back to primary region
3. Update monitoring to primary region baseline
4. Run data consistency check
5. Scale down DR resources
6. Document lessons learned

## 6. Contact Information
| Role | Name | Phone | Email |
|---|---|---|---|
| Incident Commander | On-call SRE | N/A | sre@company.com |
| Database Admin | On-call DBA | N/A | dba@company.com |
| Network Engineer | On-call NetOps | N/A | netops@company.com |
| Management | VP Engineering | N/A | vp-eng@company.com |

## 7. Post-Incident
- Conduct post-mortem within 48 hours
- Update RPO/RTO targets if needed
- Improve automation for failover steps
- Schedule next DR test
```

### Step 5: Backup Validation Pipeline
```yaml
# .github/workflows/backup-validation.yml
name: Backup Validation
on:
  schedule:
    - cron: '0 4 * * 0'  # Every Sunday at 4 AM
  workflow_dispatch:

jobs:
  validate-backups:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: pip install boto3 pg8000

      - name: Restore database backup to validation instance
        run: |
          # Spin up temporary RDS instance
          aws rds create-db-instance \
            --db-instance-identifier backup-validation \
            --db-instance-class db.t3.small \
            --engine postgres \
            --master-username validator \
            --master-user-password ${{ secrets.DB_PASSWORD }} \
            --no-multi-az \
            --allocated-storage 20

          # Wait for instance to be ready
          aws rds wait db-instance-available \
            --db-instance-identifier backup-validation

          # Restore from latest backup
          latest_backup=$(aws s3 ls s3://myapp-backups/db-backups/production/ \
            | sort | tail -1 | awk '{print $4}')
          aws s3 cp s3://myapp-backups/db-backups/production/$latest_backup ./restore.dump
          pg_restore -h ${{ secrets.DB_VALIDATION_HOST }} \
            -U validator -d production \
            --jobs=4 \
            --verbose \
            ./restore.dump

      - name: Validate data integrity
        run: |
          # Check row counts match expected ranges
          pytest tests/test_backup_integrity.py \
            --db-host ${{ secrets.DB_VALIDATION_HOST }} \
            --db-password ${{ secrets.DB_PASSWORD }}

      - name: Cleanup validation instance
        if: always()
        run: |
          aws rds delete-db-instance \
            --db-instance-identifier backup-validation \
            --skip-final-snapshot

      - name: Report results
        if: always()
        run: |
          # Send results to monitoring
          METRIC_VALUE=$([ "${{ job.status }}" == "success" ] && echo 1 || echo 0)
          aws cloudwatch put-metric-data \
            --namespace "BackupValidation" \
            --metric-data "MetricName=RestoreSuccess,MetricValue=$METRIC_VALUE,Unit=Count"
```

## Tool Comparison: Backup Solutions

| Feature | AWS Backup | Veeam | Rubrik | Commvault | Velero (K8s) |
|---|---|---|---|---|---|
| Cloud-native | Excellent | Good | Good | Good | Limited |
| On-prem support | Limited | Excellent | Excellent | Excellent | Limited |
| K8s backup | Limited | Via plugin | Good | Via plugin | Native |
| Immutable backup | S3 Object Lock | S3 Object Lock / hardened repo | Native (immutable fs) | Native | Bucket-level |
| Ransomware detection | GuardDuty | Built-in | ML-based | AI-based | Manual |
| Backup validation | Manual | SureBackup | Automated | Automated | Manual |
| Cost | Pay-per-use | License + infra | License + infra | License + infra | Free (OSS) |
| Cross-region | Built-in | Via copy | Via replication | Via copy | Manual |
| Linux agent | SSM-based | Agent | Agent | Agent | K8s-native |

## Anti-Patterns

### Anti-Pattern 1: Backup Without Restore Testing
Creating backups but never testing restores. A backup that can't be restored is worthless. Schedule automated restore tests monthly.

### Anti-Pattern 2: Single Copy of Backup
Storing all backups in one location. Violates the 3-2-1 rule: 3 copies, 2 media types, 1 offsite.

### Anti-Pattern 3: No Immutable Backups
Storing backups that can be modified or deleted by attackers. Use object lock / WORM to prevent ransomware from encrypting backups.

### Anti-Pattern 4: Ignoring RPO for WAL-based Systems
Full backups only without WAL archiving for databases. RPO is the time between full backups (could be 24h). Implement continuous WAL archiving for 15-min RPO.

### Anti-Pattern 5: Testing DR Once Per Year
Annual DR tests are insufficient for Tier 1 workloads. Test quarterly at minimum, and automate partial failover testing monthly.

### Anti-Pattern 6: No Backup Monitoring
Silent backup failures going undetected for weeks. Monitor backup success rates, completion time, and storage usage with alerts.

## Production Considerations

### Security
- Enable S3 Object Lock (Compliance mode) for immutable backups.
- Encrypt backups at rest (AES-256) and in transit (TLS 1.2+).
- Use separate AWS account for backup storage with restricted access.
- Enable MFA delete on S3 backup buckets.
- Rotate backup encryption keys annually.
- Audit backup access logs quarterly (CloudTrail + Athena).

### Cost Optimization
- Use tiered backup storage: hot (7d), warm (30d), cold (90d), archive (365d+).
- Deduplicate backup data at source when possible.
- Use incremental backups after initial full backup.
- Compress backup data before transfer.
- Delete expired recovery points automatically.
- Right-size backup frequency — don't back up every 5 min if RPO is 1 hour.

### Compliance
- HIPAA: require encryption, access logging, backup retention >= 6 years.
- PCI DSS: require backups of cardholder data, annual restore testing, audit trails.
- SOC 2: backup availability controls, change management for backup config.
- GDPR: right to erasure includes backup copies. Implement purge procedures.

## Troubleshooting Guide

| Issue | Likely Cause | Solution |
|---|---|---|
| Backup fails mid-way | Storage full or network timeout | Check disk space; increase timeout |
| Restore slow | No parallelism in restore tool | Use --jobs=N with pg_restore |
| Cross-region copy fails | IAM role missing permissions | Check vault policy and KMS key permissions |
| Snapshot deletion blocked | Lock policy or retention lock | Check backup vault lock and retention settings |
| Backup size unexpectedly large | No deduplication or compression | Enable compression; check for log bloat |
| Validation test fails | Data corruption during backup | Create fresh full backup; check storage integrity |

## Rules & Constraints
- All backups must follow 3-2-1 rule: 3 copies, 2 media, 1 offsite.
- Immutable backups for all Tier 1 workloads — no exceptions.
- Automated restore test every 30 days minimum.
- Backup monitoring with alerts on failure — never rely on manual checks.
- Encryption at rest (AES-256) and in transit (TLS 1.2+) for all backup data.
- RPO/RTO defined per workload tier and documented in runbook.
- DR plan tested quarterly for Tier 1, annually for Tier 2-3.
- Backup retention minimum: 90 days for production, 7 years for compliance.
- MFA required for backup deletion operations.
- Backup logs exported to SIEM for analysis.

## Output Format
Backup automation scripts (Python/Bash), Terraform for backup infrastructure, runbook markdown, CI/CD validation pipeline.

## References
  - references/backup-3-2-1.md
  - references/backup-automation.md
  - references/backup-disaster-recovery.md
  - references/backup-dr-advanced.md
  - references/backup-dr-fundamentals.md
  - references/backup-strategies.md
  - references/disaster-recovery.md
  - references/dr-recovery.md
  - references/ransomware-protection-guide.md

## Handoff
After completing this skill:
- Next skill: **storage-infrastructure** — storage architecture for backup targets
- Pass context: workload tiers, RPO/RTO, backup schedule, DR runbook location
