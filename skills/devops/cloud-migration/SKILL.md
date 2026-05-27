---
name: devops-cloud-migration
description: >
  Use when the user asks about cloud migration, lift-and-shift, rehost, replatform, refactor, 6 Rs migration strategy, legacy-to-cloud migration, data center migration, or cloud adoption. Do NOT use for: cloud infrastructure setup (devops-aws/azure/gcp), landing zone design (cloud-architecture), or cost optimization (cloud-cost-optimization).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, cloud-migration, phase-3]
---

# Cloud Migration

## Purpose
Plan and execute cloud migration using the 6 Rs strategy: assess, design, migrate, validate, and optimize legacy workloads to cloud infrastructure.

## Agent Protocol

### Trigger
- "cloud migration", "lift and shift", "rehost", "replatform", "refactor to cloud"
- "6 Rs", "migration strategy", "legacy to cloud", "data center migration"
- "cloud adoption", "app migration", "workload migration"

### Input Context
- Current infrastructure (on-prem, co-location, legacy cloud)
- Target cloud provider (AWS, Azure, GCP, multi-cloud)
- Application inventory size and criticality
- Timeline constraints, compliance requirements, budget

### Output Artifact
- Migration strategy with 6 Rs analysis per workload
- Wave plan with phased migration timeline
- Runbook templates for migration execution
- Validation and rollback procedures

## Workflow

### Step 1: Assessment
| Activity | Output |
|----------|--------|
| Application discovery | Complete inventory of apps, dependencies, data flows |
| Dependency mapping | Inter-service dependencies, network flows, data pipelines |
| Performance baselines | CPU, memory, IOPS, network utilization |
| Licensing audit | OS, database, middleware license types and costs |
| Compliance check | Data residency, encryption, audit requirements |

### Step 2: 6 Rs Strategy
| Strategy | Description | Effort | Benefit | When to Use |
|----------|-------------|--------|---------|-------------|
| Rehost | Lift-and-shift: move as-is | Low | Quick win | Simple apps, tight timelines |
| Replatform | Lift, tweak, shift: minor cloud optimizations | Medium | Better perf/cost | RDS, managed services |
| Refactor | Re-architect for cloud-native | High | Full cloud benefits | Strategic apps, high ROI |
| Repurchase | Replace with SaaS | Low | Eliminate maintenance | Commodity functions (CRM, HR) |
| Retire | Decommission | None | Cost savings | Unused/duplicate apps |
| Retain | Keep on-premises | None | Avoid risk | Compliance, latency-sensitive |

### Step 3: Migration Wave Planning

```yaml
wave_planning:
  wave_0_foundation:
    duration: "4-8 weeks"
    activities:
      - "Set up cloud landing zone (network, identity, logging)"
      - "Establish CI/CD pipelines for migrated workloads"
      - "Configure monitoring and alerting"
      - "Set up backup and disaster recovery infrastructure"
      - "Create security controls (IAM, encryption, WAF)"
    validation: "Landing zone passes security review and compliance scan"
    
  wave_1_easy_wins:
    duration: "Weeks 5-12"
    targets: ["Stateless apps", "Development/test environments", "Content/caching layers"]
    strategy: "Rehost (60%) / Replatform (40%)"
    risk: "Low — non-critical workloads, easy rollback"
    
  wave_2_data_tier:
    duration: "Weeks 8-20"
    targets: ["Databases", "File storage", "Data warehouses"]
    strategy: "Replatform — managed database services (RDS, Cloud SQL)"
    risk: "Medium — data integrity critical, cutover requires planning"
    techniques:
      - "Database migration service (DMS) for minimal downtime"
      - "Replica seeding followed by cutover window"
      - "Read-only mode during final sync"
      
  wave_3_core_business:
    duration: "Weeks 12-30"
    targets: ["Stateful applications", "Business-critical services", "Customer-facing systems"]
    strategy: "Replatform (50%) / Refactor (50%)"
    risk: "High — user impact, complex dependencies"
    techniques:
      - "Blue-green deployment for controlled cutover"
      - "Canary testing with mirrored traffic"
      - "Feature flags to toggle between old and new"
      
  wave_4_legacy:
    duration: "Weeks 20-40"
    targets: ["Mainframe", "Legacy COTS", "Specialized hardware workloads"]
    strategy: "Rehost (30%) / Retain (40%) / Repurchase (30%)"
    risk: "Very high — complex migration, specialized dependencies"
    techniques:
      - "Parallel run with reconciliation"
      - "Strangler fig pattern for gradual migration"
```

### Step 4: Migration Execution Runbook

```yaml
runbook_template:
  pre_migration:
    - "Verify prerequisites: network connectivity, DNS delegation, firewall rules"
    - "Take full backup of source system"
    - "Set up monitoring on both source and target"
    - "Notify stakeholders of migration window"
    - "Set maintenance mode page (if user-facing)"
    
  migration:
    - "Stop writes to source (read-only mode if possible)"
    - "Execute final sync / replication catch-up"
    - "Validate data consistency between source and target"
    - "Switch DNS or load balancer to target"
    - "Verify application health on target"
    - "Enable writes on target"
    
  post_migration:
    - "Run smoke tests for all critical user journeys"
    - "Monitor error rates, latency, and resource utilization"
    - "Keep source running in read-only mode for 24h fallback"
    - "After 24h: mark source as decommission-ready"
    - "Update documentation, runbooks, and monitoring configs"
    
  rollback_plan:
    trigger: "Error rate >1% or latency >2x baseline"
    procedure:
      - "Switch DNS/LB back to source"
      - "Verify source health and data integrity"
      - "Notify stakeholders of rollback"
    post_rollback:
      - "Root cause analysis for migration failure"
      - "Fix identified issues before next attempt"
```

### Step 5: Validation
- Functional testing: all features work as expected
- Performance testing: latency, throughput within 10% of baseline
- Security testing: vulnerability scan, penetration test
- DR testing: failover and restore procedures verified
- Cost validation: actual spend vs projected

## References
  - references/cloud-migration-advanced.md — Cloud Migration Advanced Topics
  - references/cloud-migration-fundamentals.md — Cloud Migration Fundamentals
  - references/migration-phases.md — Migration Phases
  - references/migration-strategies.md — Migration Strategies Deep Dive
  - references/migration-testing.md — Migration Testing
  - references/migration-tools.md — Cloud Migration Tools
## Handoff
Related skills: cloud-architecture (landing zone), devops-aws/azure/gcp (infra setup), enterprise-legacy-migration (legacy modernization), cloud-cost-optimization.
