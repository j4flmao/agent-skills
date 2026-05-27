# Migration Runbook Template

## Overview

A migration runbook provides step-by-step instructions for executing a workload migration. This template covers pre-migration validation, migration execution, post-migration verification, and rollback procedures. Each migration should have its own runbook derived from this template.

## Runbook Structure

```yaml
runbook_sections:
  header:
    migration_id: "MIG-2026-001"
    workload_name: "Order Processing Service"
    source: "On-premises data center — DC-1"
    target: "AWS us-east-1 — Production account"
    migration_strategy: "Replatform (lift and shift + RDS migration)"
    owner: "Platform team"
    date_scheduled: "2026-06-15 02:00-06:00 UTC"
    risk_level: "Medium"
    
  prerequisites:
    - "Network connectivity verified between source and target"
    - "DNS delegation for target environment configured"
    - "IAM roles and security groups created (see Appendix A)"
    - "Target infrastructure provisioned (CloudFormation stack MIG-001)"
    - "Database replica seeding completed (see Appendix B)"
    - "Monitoring dashboards configured (CloudWatch dashboard: mig-001)"
    - "Smoke test scripts prepared (repo: migrations/tests/)"
    - "Stakeholders notified of migration window"
    - "Rollback resources confirmed provisioned"
```

## Pre-Migration Checklist

```yaml
pre_migration:
  t_minus_7_days:
    - "Final dependency mapping review with all dependent teams"
    - "Performance baseline captured from source (CPU, memory, IOPS, latency p50/p95/p99)"
    - "DR test of target environment completed"
    - "Communication plan distributed to stakeholders"
    
  t_minus_24_hours:
    - "Final backup of source system taken"
    - "Database replica lag verified (<1 second)"
    - "Target environment health check passed"
    - "Rollback resources confirmed available"
    - "Migration team identified and on-call schedule confirmed"
    
  t_minus_1_hour:
    - "Incident response bridge established"
    - "Monitoring tools confirmed receiving data from both source and target"
    - "Database sync lag verified"
    - "Smoke test scripts confirmed working against staging"
    - "Final stakeholder notification sent"
```

## Migration Execution

```yaml
migration_execution:
  phase_1_prepare_source:
    steps:
      - "1.1 Set source application to read-only mode"
      - "1.2 Wait for in-flight transactions to complete (timeout: 5 minutes)"
      - "1.3 Verify no active database connections (except replication)"
      - "1.4 Take final incremental backup of database"
      
  phase_2_sync_target:
    steps:
      - "2.1 Verify database replica is fully caught up"
      - "2.2 Promote read replica to primary"
      - "2.3 Validate data consistency (row count checksum on 3 key tables)"
      - "2.4 Update connection strings in target application configuration"
      
  phase_3_cutover:
    steps:
      - "3.1 Start target application instances"
      - "3.2 Run health check against target (expected: healthy)"
      - "3.3 Run smoke tests against target (expected: all pass)"
      - "3.4 Run load test at 10% of peak traffic (expected: p95 latency within 10% of baseline)"
      - "3.5 Update DNS to point to target load balancer"
      - "3.6 Verify traffic reaching target (monitor request count)"
      - "3.7 Run smoke tests against production URL"
      - "3.8 Enable writes on target"
      
  phase_4_validation:
    checks:
      functional:
        - "All critical user journeys pass (smoke test suite)"
        - "API responses match expected format"
        - "Background jobs processing"
        - "Email notifications sending"
      performance:
        - "p95 latency within 10% of baseline"
        - "Error rate <0.1%"
        - "No 5xx errors from new endpoints"
      operational:
        - "Logs shipping to centralized logging"
        - "Metrics appearing in dashboards"
        - "Alerts configured and triggering correctly"
      
  phase_5_observe:
    duration: "1 hour"
    activities:
      - "Monitor error rates every 5 minutes"
      - "Monitor latency every 5 minutes"
      - "Monitor resource utilization every 5 minutes"
      - "Support team on standby for user reports"
    criteria:
      keep_migrated: "Error rate <1%, latency within 20% of baseline, no P1 incidents"
      rollback: "Error rate >5%, latency >2× baseline, any P0 incident"
```

## Rollback Procedure

```yaml
rollback:
  trigger_conditions:
    - "Error rate exceeds 5% for 5+ minutes"
    - "Latency exceeds 2× baseline for 10+ minutes"
    - "Critical user journey is completely broken"
    - "Data integrity issue detected"
    
  rollback_steps:
    step_1_stop_target_writes:
      - "Set target application to read-only mode"
      - "Wait for in-flight writes to complete"
      
    step_2_restore_source:
      - "Point DNS back to source load balancer"
      - "Verify source health endpoint responds"
      - "Verify monitoring shows traffic restored to source"
      
    step_3_validate_source:
      - "Run smoke tests against source"
      - "Verify no data loss (compare source DB with pre-migration backup)"
      - "Enable writes on source"
      
    step_4_communicate:
      - "Notify stakeholders of rollback"
      - "Schedule post-mortem within 24 hours"
      - "Document rollback trigger and findings"
      
  post_rollback:
    - "Restore target to pre-migration state (if needed for next attempt)"
    - "Analyze root cause — log files, application errors, database errors"
    - "Fix identified issues before next migration attempt"
    - "Update runbook with lessons learned"
```

## Communication Plan

```yaml
communication:
  audience_groups:
    stakeholders:
      contact: "Email distribution list: stakeholders@company.com"
      updates: "Start, cutover, completion, or any delays >30 minutes"
    support_team:
      contact: "Slack channel: #migration-war-room"
      updates: "Real-time — every phase completion, any issues"
    users:
      contact: "Status page: status.company.com"
      updates: "Maintenance window notification (sent 24h before)"
      
  notification_templates:
    migration_start: "Migration of {workload} starting. Expected downtime: {duration}. Status page: {link}"
    migration_cutover: "Cutover in progress. Services will be briefly unavailable. Monitoring status."
    migration_complete: "Migration of {workload} complete. All systems operational. Report any issues to {slack}."
    migration_delayed: "Migration of {workload} experiencing unexpected {issue}. Estimated delay: {duration}."
    migration_rollback: "Migration of {workload} rolled back. Source systems restored. Post-mortem scheduled."
```

## Post-Migration Tasks

```yaml
post_migration:
  day_1:
    - "Source system kept running in read-only mode"
    - "Monitor target for any issues"
    - "Respond to user reports"
    
  week_1:
    - "Decommission source application servers"
    - "Schedule source database decommission"
    - "Update architecture documentation with new topology"
    - "Update runbooks with new environment details"
    - "Update monitoring dashboards to point to new primary"
    
  month_1:
    - "Confirm source system fully decommissioned"
    - "Cost analysis: compare actual cost vs projected"
    - "Performance analysis: compare actual performance vs baseline"
    - "Post-migration review with all teams involved"
    - "Document lessons learned for future migrations"
```

## Appendix

```yaml
appendix:
  a_infrastructure_reference:
    - "CloudFormation stack: MIG-001-order-service"
    - "Terraform state file: s3://company-terraform-state/mig-001/"
    - "Load balancer DNS: mig-001-order-lb-123456789.us-east-1.elb.amazonaws.com"
    - "Database endpoint: mig-001-order-db.cluster-xxxxx.us-east-1.rds.amazonaws.com"
    
  b_database_replication:
    - "Replication tool: AWS DMS Task ID: dms-task-abc123"
    - "CDC lag check: SELECT extract(epoch from now() - replica_lag) FROM dms_monitoring"
    - "Full sync validation: row count comparison script (repo: migrations/scripts/validate_sync.sh)"
    
  c_smoke_tests:
    - "Test suite: migrations/tests/smoke_test.py"
    - "Pre-conditions: valid API key in environment variable SMOKE_TEST_API_KEY"
    - "Expected: all 15 tests pass with <2s response time per test"
    
  d_monitoring_dashboards:
    - "CloudWatch dashboard: mig-001-order-service"
    - "Datadog dashboard: Migration — Order Service"
    - "PagerDuty escalation policy: Migration Support"
```
