---
name: cloud-migration
description: >
  Use this skill when the user says 'cloud migration', 'migrate to cloud',
  'lift and shift', 'rehost', 'replatform', 'refactor', 'rearchitect',
  '7 Rs', 'migration strategy', 'AWS MGN', 'Azure Migrate', 'Google Migrate',
  'Database Migration Service', 'storage migration', 'cutover', 'migration testing'.
  Covers: 7 Rs migration strategies, migration assessment, workload discovery,
  migration tools, cutover planning, post-migration optimization, migration testing,
  database migration, data transfer, rollback planning.
  Do NOT use for: specific cloud provider implementation (use aws/azure/gcp).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, cloud-migration, migration, phase-5]
---

# Cloud Migration

## Purpose
Plan and execute cloud migrations using the 7 Rs strategy framework, with tools, testing, cutover planning, and post-migration optimization.

## Architecture Decision Trees

### 7 Rs Migration Strategies
| Strategy | Definition | Effort | Duration | Cloud Benefit |
|---|---|---|---|---|
| Retire | Decommission | Low | Short | Cost savings |
| Retain | Keep on-prem | None | N/A | None |
| Rehost (Lift-Shift) | Move as-is to IaaS | Low | Weeks-Months | Minimal (lower DC cost) |
| Replatform | Move to managed service | Medium | Months | Moderate |
| Refactor / Rearchitect | Rewrite for cloud-native | High | Months-Years | Maximum |
| Repurchase | Switch to SaaS | Medium | Weeks-Months | Functional improvement |
| Relocate | Move to hyperscaler DC | Low | Weeks | Lower latency |

### Readiness Assessment
| Dimension | Assessment | Metrics |
|---|---|---|
| Technical | Architecture compatibility | OS, DB, dependency graph |
| Operational | Process maturity | Monitoring, backup, DR |
| Security | Compliance requirements | Encryption, IAM, audit logs |
| Financial | TCO analysis | Current vs cloud cost |
| Skills | Team readiness | Training needs assessment |

### Discovery Tool Selection
| Tool | Scope | Platform | Data Collected |
|---|---|---|---|
| AWS MGN (Application Migration) | VMs | AWS | OS, apps, resources |
| Azure Migrate | VMs + databases | Azure | Dependency mapping |
| Google Migrate for Compute | VMs | GCP | Utilization, network |
| RVTools | VMware VMs | Any | VM config, storage |
| ServiceNow ITOM | Enterprise | Any | CMDB, dependencies |
| CloudHealth | Multi-cloud | Any | Cost, utilization |

### Migration Wave Planning
| Wave | Type | Risk | Duration | Max Workloads |
|---|---|---|---|---|
| Wave 0 | Foundation | Low | 2-4 weeks | N/A (infrastructure) |
| Wave 1 | Pilot (low-risk) | Low | 2 weeks | 3-5 workloads |
| Wave 2 | Early adopters | Low-Medium | 4 weeks | 10-15 workloads |
| Wave 3-N | Bulk migration | Medium | 4-6 weeks ea. | 20-50 workloads |
| Final Wave | Complex/high-risk | High | 4-8 weeks | 5-10 workloads |

## Core Workflow

### Step 1: Migration Assessment — TCO Analysis
```python
# assessment/tco_analysis.py
"""Total Cost of Ownership comparison for on-prem vs cloud."""
import json
from dataclasses import dataclass, asdict

@dataclass
class WorkloadSpec:
    name: str
    vcpu: int
    memory_gb: int
    storage_gb: int
    storage_type: str  # HDD, SSD, NVMe
    network_throughput: str  # Mbps
    licenses: list[str]  # Windows, SQL, Oracle, etc.

    def estimate_cloud_cost(self, provider="aws", region="us-east-1"):
        """Estimate monthly cloud cost."""
        cost = 0
        # Compute costs (example pricing)
        if provider == "aws":
            instance_map = {
                (2, 4): "m6i.large",
                (4, 16): "m6i.xlarge",
                (8, 32): "m6i.2xlarge",
                (16, 64): "m6i.4xlarge",
            }
            key = (self.vcpu, self.memory_gb)
            instance = instance_map.get(key, "m6i.xlarge")
            compute = {"m6i.large": 69, "m6i.xlarge": 138,
                       "m6i.2xlarge": 276, "m6i.4xlarge": 553}
            cost += compute.get(instance, 138)

        # Storage costs
        storage_rates = {"HDD": 0.08, "SSD": 0.125, "NVMe": 0.25}
        cost += self.storage_gb * storage_rates.get(self.storage_type, 0.125)

        # License costs
        license_rates = {"Windows": 50, "SQL": 300, "Oracle": 500}
        for lic in self.licenses:
            cost += license_rates.get(lic, 0)

        return cost

    def estimate_onprem_cost(self):
        """Estimate monthly on-prem cost (3-year amortized)."""
        hardware = (self.vcpu * 200 + self.memory_gb * 15 + self.storage_gb * 2)
        power_cooling = hardware * 0.3
        admin = 1500  # shared admin overhead
        return (hardware / 36) + power_cooling / 12 + admin

# Example
workload = WorkloadSpec("web-app", 4, 16, 200, "SSD", "1Gbps", ["Windows"])
onprem = workload.estimate_onprem_cost()
cloud = workload.estimate_cloud_cost()
print(f"Workload: {workload.name}")
print(f"  On-prem: ${onprem:.0f}/mo")
print(f"  Cloud:   ${cloud:.0f}/mo")
```

### Step 2: Database Migration — AWS DMS
```hcl
# migration/dms.tf
resource "aws_dms_replication_subnet_group" "main" {
  replication_subnet_group_description = "DMS subnet group"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_dms_replication_instance" "main" {
  replication_instance_class = "dms.c5.large"
  replication_instance_id    = "production-migration"
  allocated_storage          = 100
  multi_az                   = true
  publicly_accessible        = false
  vpc_security_group_ids     = [aws_security_group.dms.id]
  replication_subnet_group_id = aws_dms_replication_subnet_group.main.id
}

resource "aws_dms_endpoint" "source" {
  endpoint_id   = "source-onprem"
  endpoint_type = "source"
  engine_name   = "postgres"
  server_name   = "192.168.1.100"
  port          = 5432
  database_name = "production_db"
  username      = var.db_migration_user
  password      = var.db_migration_password
  ssl_mode      = "require"

  extra_connection_attributes = "ParallelLoadThreads=4;ParallelLoadBufferSize=64"
}

resource "aws_dms_endpoint" "target" {
  endpoint_id             = "target-rds"
  endpoint_type           = "target"
  engine_name             = "postgres"
  server_name             = aws_db_instance.main.address
  port                    = 5432
  database_name           = "production_db"
  username                = var.db_username
  password                = var.db_password
  ssl_mode                = "require"
}

resource "aws_dms_replication_task" "full_load" {
  replication_task_id       = "initial-load"
  replication_instance_arn  = aws_dms_replication_instance.main.replication_instance_arn
  source_endpoint_arn       = aws_dms_endpoint.source.endpoint_arn
  target_endpoint_arn       = aws_dms_endpoint.target.endpoint_arn
  migration_type            = "full-load-and-cdc"
  table_mappings            = jsonencode({
    rules: [{
      "rule-type": "selection"
      "rule-id": "1"
      "rule-name": "1"
      "object-locator": {"schema-name": "public", "table-name": "%"}
      "rule-action": "include"
    }]
  })
  replication_task_settings = jsonencode({
    FullLoadSettings: {
      TargetTablePrepMode: "DROP_AND_CREATE",
      CreatePkAfterFullLoad: true,
      MaxFullLoadSubTasks: 8,
    },
    Logging: { EnableLogging: true }
  })
}
```

### Step 3: Cutover Plan Template
```yaml
# migration/cutover-plan.yaml
migration_id: "MIG-2025-001"
workload: "Payment Processing System"
target_platform: "AWS (us-east-1)"
scheduled_date: "2025-06-15T02:00:00 UTC"

pre_cutover:
  - task: "Final data sync check"
    owner: "DBA-Team"
    duration: 15m
  - task: "Application shutdown"
    owner: "App-Team"
    duration: 5m
  - task: "Final incremental backup"
    owner: "DBA-Team"
    duration: 10m
  - task: "DNS TTL reduction (60s)"
    owner: "NetOps"
    duration: 5m
  - task: "Scale up target environment"
    owner: "CloudOps"
    duration: 10m

cutover:
  - task: "Start DMS CDC replication"
    owner: "DBA-Team"
    duration: 5m
  - task: "Verify data consistency (row counts, checksums)"
    owner: "DBA-Team"
    duration: 15m
  - task: "Stop source database writes"
    owner: "DBA-Team"
    duration: 2m
  - task: "Apply final CDC changes"
    owner: "DBA-Team"
    duration: 5m
  - task: "Promote target database"
    owner: "DBA-Team"
    duration: 2m
  - task: "Update DNS to target load balancer"
    owner: "NetOps"
    duration: 2m
  - task: "Start application on target"
    owner: "App-Team"
    duration: 5m

post_cutover:
  - task: "Run smoke tests"
    owner: "QA-Team"
    duration: 15m
  - task: "Verify monitoring/alerts on target"
    owner: "CloudOps"
    duration: 10m
  - task: "Monitor error rates for 30 min"
    owner: "App-Team"
    duration: 30m
  - task: "Declare cutover complete"
    owner: "Migration-Lead"
    duration: 2m

rollback_triggers:
  - condition: "Application error rate > 5% for 5 minutes"
    action: "Revert DNS to source; failback database"
  - condition: "Database replication lag > 60s"
    action: "Abort cutover; keep source as primary"
  - condition: "Data consistency check fails"
    action: "Investigate; abort if > 0.01% mismatch"

rollback:
  - task: "Revert DNS to source IP"
    duration: 2m
  - task: "Re-enable source application"
    duration: 5m
  - task: "Verify source operation"
    duration: 15m
  - task: "Stop DMS replication"
    duration: 2m
  - task: "Notify stakeholders"
    duration: 5m
```

### Step 4: Migration Runbook
```markdown
# Migration Runbook: Production Database
## Pre-Migration Checklist
- [ ] Source: PostgreSQL 15.3 on-prem (192.168.1.100:5432)
- [ ] Target: RDS PostgreSQL 15.4 (production-db.xxx.us-east-1.rds.amazonaws.com)
- [ ] DMS replication instance running (dms.c5.large)
- [ ] Full load completed successfully
- [ ] CDC replication lag < 5 seconds
- [ ] Application config updated for target DB endpoint
- [ ] Snapshot of target DB created
- [ ] Rollback plan reviewed and approved
- [ ] Stakeholders notified of maintenance window

## Cutover Commands
```bash
# 1. Stop source application
ssh app-server 'systemctl stop app-service'

# 2. Wait for CDC to catch up
aws dms describe-replication-tasks \
  --filters Name=replication-task-id,Values=dms-full-load

# 3. Stop CDC replication
aws dms stop-replication-task \
  --replication-task-arn arn:aws:dms:...

# 4. Verify target data
psql -h production-db.xxx.rds.amazonaws.com \
  -c "SELECT count(*) FROM orders;"

# 5. Point app to target
aws rds modify-db-instance \
  --db-instance-identifier production-db \
  --new-db-instance-identifier production-db-primary

# 6. Start application on target
kubectl -n production set image deployment/app-service \
  app=myapp:latest

# 7. Verify
curl -f https://app.example.com/health
```

## Anti-Patterns

### Anti-Pattern 1: Lift-and-Shift Without Optimization
Moving everything to IaaS VMs without considering managed services. Replatform databases to RDS/Aurora, use Lambda for batch jobs.

### Anti-Pattern 2: No Rollback Plan
Not planning for migration failure. Every migration must have a tested rollback procedure that can be executed within RTO.

### Anti-Pattern 3: Big Bang Migration
Moving everything at once. Use wave-based migration: pilot → early adopters → bulk → complex.

### Anti-Pattern 4: Ignoring Data Transfer Costs
Moving terabytes without understanding egress costs. Use Snowball/AWS DataSync for large data, and minimize cross-region traffic.

### Anti-Pattern 5: No Performance Baseline
Not measuring pre-migration performance. Establish baselines (latency, throughput, error rate) before migration to validate post-migration.

## Rules & Constraints
- Every migration must have a defined rollback plan.
- Test cutover in staging before production.
- Establish performance baselines before migration.
- Use wave-based migration — never "big bang".
- Run data consistency checks after every data migration.
- Monitor post-migration for at least 72 hours.

## References
  - references/cloud-migration-advanced.md
  - references/cloud-migration-fundamentals.md
  - references/migration-phases.md
  - references/migration-runbook-template.md
  - references/migration-strategies.md
  - references/migration-testing.md
  - references/migration-tools.md
  - references/post-migration-optimization.md
  - references/cutover-checklist.md

## Handoff
Next: **database-migration** — detailed DB migration strategies.
