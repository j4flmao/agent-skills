# Cloud Migration Fundamentals

## Overview
Cloud migration is the process of moving digital assets (applications, data, infrastructure) from on-premises data centers or other cloud providers to a target cloud platform. It requires careful planning, assessment, and execution to minimize risk and downtime.

## Core Concepts

### The 6 R"s of Migration
Rehost (Lift and Shift): move applications as-is to cloud IaaS. Fastest migration, least optimization. Best for quick wins and compliance-driven moves.

Replatform (Lift, Tinker, and Shift): make minor cloud optimizations without changing core architecture. Move to managed services (RDS instead of self-managed DB). Moderate effort, moderate benefits.

Refactor/Re-architect: redesign applications to use cloud-native features (microservices, serverless). Highest effort, highest benefits. Best for applications needing improved scalability or agility.

Repurchase: move to SaaS alternatives. Drop custom application for commercial product. Best when SaaS meets requirements at lower cost.

Retire: decommission applications no longer needed. Eliminates migration effort and ongoing costs.

Retain: keep applications on-premises. For compliance, latency, or technical debt reasons.

### Migration Phases
Assess: inventory applications, dependencies, and performance baselines. Plan: prioritize migration waves, define target architecture, select migration strategy. Migrate: execute migration wave by wave, validate each wave. Operate: monitor, optimize, and decommission source systems.

### Dependency Mapping
Map application dependencies: databases, APIs, auth services, file shares, network connectivity. Use discovery tools (AWS MGN, Azure Migrate, ServiceNow). Identify hard dependencies (hardcoded IPs, DNS, certificates). Plan migration waves around dependency boundaries.

## Key Migration Strategies

### Database Migration
Homogeneous: same database engine (on-prem MySQL to Cloud SQL MySQL). Use native replication or dump/restore. Heterogeneous: different database engine (Oracle to Aurora PostgreSQL). Use schema conversion tools (AWS SCT, Azure DMS). Plan for SQL compatibility issues and application changes.

### Network Connectivity
Site-to-site VPN: encrypted tunnel over internet. Quick to set up, limited bandwidth. Direct Connect/ExpressRoute: dedicated private connection. Higher bandwidth, lower latency, more setup time. Transit Gateway: hub-and-spoke connectivity for multi-VPC architectures.

### Data Transfer
Online: VPN or Direct Connect for incremental sync. Use AWS DMS, Azure DMS, or Striim for ongoing replication. Offline: AWS Snowball, Azure Data Box for large datasets (10+ TB). Physical device shipped to cloud provider for ingestion.

## Basic Migration

### AWS DMS Replication
```hcl
resource "aws_dms_replication_task" "migration" {
  replication_task_id       = "migrate-orders"
  source_endpoint_arn       = aws_dms_endpoint.source.arn
  target_endpoint_arn        = aws_dms_endpoint.target.arn
  migration_type            = "full-load-and-cdc"
  table_mappings            = jsonencode({
    rules = [{
      rule-type = "selection"
      rule-id   = "1"
      rule-name = "1"
      object-locator = {
        schema-name = "%"
        table-name  = "orders_%"
      }
      rule-action = "include"
    }]
  })
  replication_task_settings = jsonencode({
    TargetMetadata = {
      TargetSchema = ""
      SupportLobs = true
    }
  })
}
```

## Best Practices
- Start with low-risk applications (dev/test, internal tools).
- Automate everything: IaC, CI/CD, configuration management.
- Test migration in staging environment first.
- Plan rollback strategy before starting migration.
- Monitor application performance after migration.
- Decommission source systems after validation period.
- Document lessons learned and optimize next waves.

## References
- cloud-migration-advanced.md -- Advanced Cloud Migration topics
- migration-assessment.md -- Migration Assessment
- database-migration.md -- Database Migration
- network-connectivity.md -- Network Connectivity
- cutover-planning.md -- Cutover Planning
