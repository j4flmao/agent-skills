# Post-Migration Optimization

## Overview

Post-migration optimization transforms a lift-and-shift or replatformed workload to fully realize cloud benefits. Many migration projects stop at cutover, leaving performance, cost, and resilience improvements on the table. This guide covers the optimization phases after a workload is running in the cloud.

## Optimization Phases

```yaml
optimization_phases:
  phase_1_stabilize:
    duration: "Week 1-4 post-migration"
    focus: "Operational stability and monitoring"
    activities:
      - "Monitor error rates, latency, and resource utilization"
      - "Respond to incidents and regressions"
      - "Tune auto-scaling parameters based on real traffic patterns"
      - "Validate backup and disaster recovery procedures"
      - "Update runbooks with target environment specifics"
    metrics:
      - "Error rate < 0.1%"
      - "P95 latency within 10% of on-prem baseline"
      - "No P0/P1 incidents"
      
  phase_2_rightsize:
    duration: "Week 2-6"
    focus: "Resource optimization and cost reduction"
    activities:
      - "Analyze actual resource utilization (CPU, memory, IOPS)"
      - "Right-size instances based on utilization data"
      - "Implement auto-scaling policies"
      - "Reserve capacity for steady-state workloads"
      - "Identify and eliminate orphaned resources"
    metrics:
      - "Compute utilization: 40-60% average"
      - "Cost: within 80-120% of projected budget"
      - "No idle or orphaned resources"
      
  phase_3_modernize:
    duration: "Week 4-12"
    focus: "Architecture improvements for cloud-native patterns"
    activities:
      - "Database migration to managed service (RDS, Cloud SQL, Azure SQL)"
      - "Storage migration to object storage (S3, Blob, GCS)"
      - "Implement CDN for static and frequently accessed content"
      - "Adopt managed caching (ElastiCache, Redis, Memorystore)"
      - "Implement infrastructure as code (if not already)"
    metrics:
      - "Reduction in operational toil (measured in hours/week)"
      - "Performance improvement from managed services"
      
  phase_4_automate:
    duration: "Week 8-16"
    focus: "Automation and self-healing"
    activities:
      - "Implement auto-remediation for common failure scenarios"
      - "Automated backup testing and recovery validation"
      - "CI/CD pipeline optimization for cloud-native deployments"
      - "Policy as code for compliance automation"
      - "Automated cost optimization (scheduled shutdown, storage lifecycle)"
    metrics:
      - "Deployment frequency increased"
      - "Mean time to recover (MTTR) reduced"
      - "Manual operations eliminated"
```

## Cost Optimization After Migration

```yaml
cost_optimization:
  immediate_wins_week_1_4:
    - "Delete orphaned EBS volumes, elastic IPs, unused load balancers"
    - "Resize over-provisioned instances (right-size based on 1 week of metrics)"
    - "Implement auto-stop for non-production environments (off-hours)"
    - "Review data transfer costs — identify unexpected egress patterns"
    - "Enable cost allocation tags for visibility"
    
  medium_term_week_4_12:
    - "Purchase Reserved Instances / Savings Plans for steady-state workloads"
    - "Migrate cold data to cheaper storage tiers (S3 IA → Glacier)"
    - "Implement auto-scaling for variable load workloads"
    - "Consolidate small databases into larger instances"
    - "Review and optimize NAT Gateway / egress costs"
    
  long_term_month_3_6:
    - "Evaluate Graviton/ARM instances for compute workloads (20-40% cost reduction)"
    - "Consider spot instances for fault-tolerant batch workloads"
    - "Implement FinOps practices — showback/chargeback reports"
    - "Carbon optimization — choose lower-emission regions and efficient instance types"
```

## Performance Optimization

```yaml
performance_optimization:
  database:
    lift_and_shift: "Same database engine but with provisioned IOPS and GP3 storage"
    replatform:
      - "Migrate to managed service (RDS, Cloud SQL, Azure SQL)"
      - "Enable read replicas for read-heavy workloads"
      - "Implement connection pooling (PgBouncer, RDS Proxy)"
      - "Enable Performance Insights for query tuning"
    refactor:
      - "Consider purpose-built databases (DynamoDB for KV, ElastiCache for caching)"
      - "Implement database sharding for write-heavy workloads"
      - "Adopt Aurora / Spanner / Cosmos DB for global distribution"
      
  compute:
    lift_and_shift: "Same instance type but with Elastic Block Store gp3"
    replatform:
      - "Implement auto-scaling based on CPU/memory/request count"
      - "Migrate to container orchestration (ECS, EKS, GKE, AKS)"
      - "Adopt spot instances for non-critical workloads"
    refactor:
      - "Adopt serverless (Lambda, Cloud Functions, Azure Functions)"
      - "Event-driven architecture for decoupled processing"
      - "Adopt purpose-built compute: batch (AWS Batch), ML (SageMaker)"
      
  networking:
    lift_and_shift: "Same network topology, mapped to cloud VPC"
    replatform:
      - "Implement CDN (CloudFront, Cloudflare, Akamai)"
      - "Adopt Global Accelerator or Cloud CDN for multi-region traffic"
      - "Implement WAF at edge for security + performance"
    refactor:
      - "Service mesh for inter-service communication"
      - "Direct Connect / ExpressRoute for hybrid connectivity"
      - "Private Link / VPC endpoints for AWS/Azure/GCP services"
```

## Operational Maturity

```yaml
operational_maturity:
  level_1_reactive:
    characteristics: "Respond to incidents manually, runbooks exist but not automated"
    post_migration_target: "Week 1-2"
    
  level_2_monitoring:
    characteristics: "Dashboards and alerts configured, SLIs/SLOs defined"
    post_migration_target: "Week 2-4"
    
  level_3_automated:
    characteristics: "Auto-scaling, auto-remediation, CI/CD"
    post_migration_target: "Week 4-12"
    
  level_4_proactive:
    characteristics: "Chaos engineering, capacity forecasting, cost forecasting"
    post_migration_target: "Month 3-6"
    
  level_5_optimized:
    characteristics: "Continuous optimization, FinOps, carbon-aware scheduling"
    post_migration_target: "Month 6+"
```

## Post-Migration Review Template

```yaml
post_migration_review:
  section_1_summary:
    workload: "Order Processing Service"
    migration_date: "2026-06-15"
    actual_duration: "4.5 hours (planned: 4 hours)"
    rollback: "No"
    incidents: "2 minor (increased latency for 5 min, DNS propagation delay)"
    
  section_2_metrics:
    cost_comparison:
      projected_monthly: "$12,500"
      actual_monthly: "$11,800 (6% under projection)"
      vs_on_premises: "18% reduction vs on-prem TCO"
    performance:
      latency_p50: "120ms (baseline: 150ms) — 20% improvement"
      latency_p95: "380ms (baseline: 450ms) — 16% improvement"
      error_rate: "0.02% (baseline: 0.05%)"
    operational:
      incidents_week_1: "3 (2 self-healed, 1 required manual intervention)"
      pager_calls_week_1: "5 (target: <10)"
      deployment_frequency: "3×/week (was 1×/week on-prem)"
      
  section_3_optimization_plan:
    priority_1: "Right-size database instance (current: db.r6g.xlarge, target: db.r6g.large)"
    priority_2: "Implement auto-scaling for API servers"
    priority_3: "Migrate static assets to CDN"
    priority_4: "Enable RDS Performance Insights for query tuning"
    priority_5: "Reserve 3-year RDS instance for baseline capacity"
    
  section_4_lessons_learned:
    what_went_well:
      - "Pre-migration load testing caught connection pooling issue"
      - "Rollback plan was not needed but gave team confidence"
      - "DNS TTL reduction to 60s minimized propagation delay"
    what_could_be_improved:
      - "DNS propagation took 5 minutes longer than expected"
      - "Some smoke tests had hardcoded IP addresses"
      - "Monitoring dashboards not fully populated until 30 min post-cutover"
    action_items:
      - "Update DNS TTL to 60s for all future migrations"
      - "Audit all test scripts for hardcoded references"
      - "Pre-populate monitoring dashboards with synthetic data"
```
