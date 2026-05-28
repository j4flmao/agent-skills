# FinOps Cost Optimization Levers

## Overview

Cost optimization levers are the specific actions, strategies, and configurations that reduce cloud spending. This reference catalogs every major optimization lever across compute, storage, network, database, Kubernetes, and ancillary services, with implementation guidance, expected savings, risk assessment, and prioritization frameworks.

## Optimization Lever Framework

### Lever Categories

```
+----------------------------------+
|     Compute Optimization        |
|  - Right-sizing                  |
|  - Spot/Preemptible instances   |
|  - Reserved Instances           |
|  - Savings Plans               |
|  - Auto-scaling                |
+----------------------------------+
|     Storage Optimization        |
|  - Lifecycle policies           |
|  - Tiering                     |
|  - Compression                 |
|  - Cleanup (orphans)           |
+----------------------------------+
|     Network Optimization        |
|  - Data transfer minimization  |
|  - CDN usage                   |
|  - VPC endpoints               |
+----------------------------------+
|     Database Optimization       |
|  - Right-sizing                |
|  - Reserved capacity           |
|  - Serverless                  |
+----------------------------------+
|     Kubernetes Optimization     |
|  - Namespace allocation        |
|  - VPA/HPA tuning              |
|  - Node right-sizing           |
|  - Spot nodes                  |
+----------------------------------+
|     Ancillary Optimization      |
|  - Support plans               |
|  - Data transfer out           |
|  - Licensing                   |
+----------------------------------+
```

### Lever Prioritization Matrix

| Lever | Effort | Impact | Risk | Priority |
|---|---|---|---|---|
| Delete unattached volumes | Very Low | Medium | Low | P0 |
| Right-size underutilized instances | Low | High | Low | P0 |
| Enable auto-scaling | Medium | High | Medium | P0 |
| Delete orphaned snapshots | Low | Low | Low | P0 |
| Purchase RIs for stable baseline | Medium | High | Low | P1 |
| Implement S3 lifecycle policies | Low | Medium | Low | P1 |
| Adopt spot instances | Medium | High | Medium | P1 |
| Enable CDN for egress | Medium | Medium | Low | P1 |
| Right-size RDS instances | Medium | High | Low | P1 |
| Implement VPC endpoints | Medium | Medium | Low | P1 |
| K8s right-sizing via VPA | Medium | High | Medium | P2 |
| Implement Karpenter | High | High | Medium | P2 |
| Purchase Savings Plans | Medium | High | Low | P2 |
| Implement chargeback | High | Medium | High | P2 |
| Migrate to gp3 volumes | Low | Low | Low | P2 |

## Compute Optimization Levers

### Right-Sizing

**Description**: Adjusting instance types and sizes to match workload requirements.

**Methodology**:
1. Collect CPU, memory, network, and disk utilization for 14+ days
2. Identify underutilized (avg CPU < 20%, memory < 40%)
3. Identify overutilized (avg CPU > 60%, memory > 80%)
4. Map to appropriate instance family and size
5. Schedule changes during maintenance windows
6. Verify post-change performance

**Expected Savings**: 20-40% of compute spend

**Risk**: Low for downsizing (performance maintained or improved). Medium for upgrading (may over-provision if not validated).

**Implementation**:
```yaml
right_sizing:
  review_cadence: "monthly"
  data_window: "14 days"
  tools:
    - "AWS Compute Optimizer"
    - "Azure Advisor"
    - "GCP Recommender"
    - "CloudHealth"
    
  rules:
    - condition: "avg CPU < 20% AND avg memory < 40%"
      action: "downsize one tier"
    - condition: "avg CPU < 10% AND avg memory < 20%"
      action: "downsize two tiers"
    - condition: "avg CPU > 60% OR avg memory > 80%"
      action: "upgrade one tier"
      
  exclusions:
    - "Workloads with known performance requirements"
    - "Instances with irregular but critical peak usage"
    - "Instances scheduled for migration"
```

### Spot and Preemptible Instances

**Description**: Using spare cloud capacity at significant discount (60-90% off on-demand).

**Eligibility Criteria**:
- Fault-tolerant, stateless workloads
- Batch processing and data analytics
- CI/CD build agents
- Web servers with load balancing
- Container workloads with pod disruption budgets
- GPU training jobs (checkpointing enabled)

**Savings**: 60-90% vs on-demand

**Risk**: Medium -- instances can be interrupted with 2-minute notice (AWS) or 30-second notice (GCP)

**Implementation**:
```yaml
spot_strategy:
  coverage_target: "80% of eligible workloads"
  
  diversification:
    instance_types: 3+ (e.g., m5.large, m5a.large, m6i.large)
    availability_zones: 2+
    
  fallback:
    primary: "spot"
    secondary: "on-demand"
    tertiary: "reserved"
    
  interruption_handling:
    - "Drain connections on termination notice"
    - "Save checkpoint state"
    - "Requeue batch jobs"
    - "Pod disruption budgets for K8s"
```

### Reserved Instances

**Description**: Pre-purchasing compute capacity for 1-3 year terms at discounted rates.

**Coverage Target**: 60-80% of stable baseline usage

**Term Selection**:
- 1-year: volatile workloads, growth phase
- 3-year: stable baseline, known requirements
- Partial upfront: best balance of discount and cash flow

**Expected Savings**: 40-72% vs on-demand

**Risk**: Low if utilization is tracked. Medium if over-provisioned.

**Implementation**:
```yaml
ri_strategy:
  coverage_target: "65% of stable baseline"
  
  evaluation:
    frequency: "monthly"
    metrics:
      - "RI utilization rate (target > 70%)"
      - "Coverage percentage"
      - "Effective savings rate"
    
  purchase_workflow:
    1: "Analyze 30-day baseline usage"
    2: "Right-size before purchasing"
    3: "Select term and payment option"
    4: "Purchase with automated recommendations"
    5: "Track utilization monthly"
    6: "Renew 60 days before expiry"
    
  modification_policy:
    - "Modify attributes within same family"
    - "Exchange for different family (AWS)"
    - "Sell unused RIs on marketplace"
```

### Savings Plans

**Description**: Flexible discount model covering EC2, Fargate, and Lambda.

**Types**:
- Compute Savings Plans: highest flexibility, covers EC2+Fargate+Lambda
- EC2 Savings Plans: covers EC2, specific family
- SageMaker Savings Plans: covers SageMaker

**Expected Savings**: 30-66% vs on-demand

**Risk**: Lower than RIs (more flexible). Underutilized Savings Plans cannot be resold.

**Implementation**:
```yaml
savings_plans:
  recommendation:
    - "Compute SP for diverse workloads"
    - "EC2 SP for dedicated EC2 fleets"
    - "Combine SP + RIs + spot for max coverage"
    
  monitoring:
    utilization: "monthly"
    alert_threshold: "70%"
    action_on_low_util: "modify or supplement with RIs"
```

### Auto-Scaling

**Description**: Dynamic capacity adjustment based on demand.

**Strategies**:
- Dynamic scaling: based on utilization metrics
- Scheduled scaling: based on known patterns
- Predictive scaling: ML-based forecasting
- Target tracking: maintain target utilization

**Expected Savings**: 30-50% vs fixed capacity provisioned for peak

**Risk**: Medium -- misconfigured scaling can cause performance issues or fail to scale down.

**Implementation**:
```yaml
auto_scaling:
  compute:
    - "ASG with target tracking policy"
    - "CPU target: 60-70%"
    - "Memory target: 70-80%"
    - "Cooldown: 60-300 seconds"
    
  kubernetes:
    - "HPA: CPU/memory based"
    - "VPA: resource request optimization"
    - "Cluster Autoscaler: node level"
    - "Karpenter: instance type aware"
    
  serverless:
    - "Lambda: reserved concurrency"
    - "Provisioned concurrency for cold start"
    
  database:
    - "Aurora Auto Scaling for read replicas"
    - "DynamoDB auto-scaling"
```

## Storage Optimization Levers

### Lifecycle Policies

**Description**: Automatically transition data between storage tiers based on age and access patterns.

**Implementation**:
```yaml
lifecycle_policy:
  default_rule:
    transitions:
      - "Standard -> IA after 30 days"
      - "IA -> Glacier after 90 days"
      - "Glacier -> Deep Archive after 1 year"
    expiration:
      - "Delete after 3 years"
      
  logs_rule:
    prefix: "logs/"
    transitions:
      - "Standard -> IA after 7 days"
      - "IA -> Glacier after 30 days"
      - "Glacier -> Deep Archive after 90 days"
    expiration:
      - "Delete after 1 year"
      
  backup_rule:
    prefix: "backups/"
    transitions:
      - "Standard -> Glacier after 30 days"
      - "Glacier -> Deep Archive after 180 days"
    expiration:
      - "Delete after 3 years"
```

**Expected Savings**: 40-70% reduction in storage costs for cold data

**Risk**: Very low -- data not permanently deleted for 30+ days

### EBS Volume Optimization

**Actions**:
1. Delete unattached volumes (immediate savings)
2. Convert gp2 to gp3 (up to 20% savings, better performance)
3. Downsize over-provisioned volumes
4. Use snapshots for backup instead of volume copies
5. Delete orphaned snapshots

**Expected Savings**: 10-30% of block storage costs

**Implementation**:
```yaml
ebs_optimization:
  unattached_volumes:
    detection: "daily scan"
    grace_period: "14 days"
    action: "delete"
    
  orphaned_snapshots:
    detection: "weekly scan"
    threshold: "30 days without parent volume"
    action: "delete"
    
  volume_type_migration:
    - "gp2 -> gp3: automatic"
    - "io1 -> io2: when performance needed"
    - "sc1 -> standard: only if not cold data"
    
  size_optimization:
    - "Reduce volume size if utilization < 50%"
    - "Use snapshots for migration"
```

## Network Optimization Levers

### Data Transfer Cost Reduction

**Description**: Minimizing expensive cross-region and internet data transfer.

**Savings Sources**:

| Action | Typical Savings | Effort |
|---|---|---|
| Co-locate dependent services in same region | 50-80% of cross-region costs | High |
| Use CloudFront/CDN for egress | 30-60% of egress costs | Medium |
| Replace NAT Gateway with VPC endpoints | 100% of NAT processing charges | Medium |
| Use Direct Connect for bulk data | 30-50% vs internet | High |
| Compress data before transfer | 30-70% reduction | Low |
| Cache frequently accessed data | 20-40% reduction | Medium |

**Implementation**:
```yaml
network_optimization:
  cross_region:
    analysis: "monthly data transfer report"
    action: "identify and co-locate major cross-region traffic"
    exception: "latency-sensitive global workloads"
    
  egress:
    - "Route internet-facing traffic through CloudFront"
    - "Use S3 Transfer Acceleration for uploads"
    - "Enable compression for API responses"
    - "Cache at edge layer"
    
  internal_traffic:
    - "VPC endpoints over NAT Gateway"
    - "Transit Gateway for hub-and-spoke"
    - "Private Link for third-party services"
```

## Database Optimization Levers

### RDS Right-Sizing

**Description**: Adjusting database instance size and configuration.

**Actions**:
1. Right-size underutilized instances
2. Reserve capacity for stable workloads
3. Enable Storage Auto Scaling
4. Use Aurora Serverless for variable workloads
5. Migrate to gp3 storage (from io1)
6. Delete unused database instances
7. Enable auto-stop for dev/test instances

**Expected Savings**: 20-50% of database costs

### Reserved Database Capacity

**Description**: Pre-purchasing database capacity at discounted rates.

**Expected Savings**: 30-60% vs on-demand

**Coverage Target**: 60-80% of stable baseline

## Kubernetes Optimization Levers

### Namespace Cost Allocation

**Description**: Identifying cost by namespace, label, and deployment.

**Implementation via Kubecost**:
```yaml
kubecost:
  allocation:
    - "namespace: production"
    - "namespace: staging"
    - "label: team=platform"
    - "label: app=api"
    
  savings_identified:
    - "Idle cluster capacity: 25% of total"
    - "Over-provisioned requests: 15% of namespace costs"
    - "Orphaned resources: 2% of total"
    
  actions:
    - "Right-size namespace resource quotas"
    - "Remove orphaned PVCs and services"
    - "Add namespace budget alerts"
```

### VPA and HPA Tuning

**Description**: Right-sizing container resource requests and limits.

**VPA Actions**:
1. Set VPA to "recommendation" mode for 7 days
2. Review recommended CPU and memory values
3. Apply recommendations to deployment specs
4. Set VPA to "auto" mode for ongoing tuning

**HPA Actions**:
1. Set HPA target CPU to 60-70%
2. Set HPA target memory (if supported)
3. Set min replicas for baseline load
4. Set max replicas for peak
5. Tune scale-up and scale-down behavior

**Expected Savings**: 20-40% of K8s compute costs

### Node Right-Sizing with Karpenter

**Description**: Optimizing node types and sizes for pod workloads.

**Implementation**:
```yaml
karpenter:
  provisioner: "cost-optimized"
  
  requirements:
    - "Mix of spot and on-demand"
    - "Diverse instance types (3+ families)"
    - "Consolidation enabled"
    - "Bin packing for high utilization"
    
  expected_savings:
    - "Spot diversification: 50-70% vs on-demand"
    - "Consolidation: 10-20% reduction in nodes"
    - "Right-sizing: 15-30% reduction in waste"
```

## Ancillary Cost Levers

### Support Plan Optimization

**Description**: Right-sizing cloud support plans.

| Plan | Cost | Best For |
|---|---|---|
| Basic | Free | Dev/test only |
| Developer | $29/month + 3% | Small teams |
| Business | $100/month + 3-10% | Production workloads |
| Enterprise On-Ramp | $5,500/month | Mid-size enterprises |
| Enterprise | $15,000+/month + % | Large enterprises |

**Savings**: 30-60% by downgrading from Enterprise to Business for appropriate accounts

### Data Transfer Out

**Description**: Reducing costs for data leaving cloud provider.

**Actions**:
1. Use CDN (CloudFront) for internet egress
2. Cache frequently accessed data
3. Compress data before transfer
4. Use Direct Connect for large transfers
5. Review and terminate idle data transfer resources

**Expected Savings**: 10-30% of data transfer costs

## Implementation Framework

### Optimization Cycle

```
1. Measure
   - Current baseline spend
   - Identify top 10 cost services
   - Tagging compliance check
   
2. Identify
   - Right-sizing candidates
   - Waste (unattached volumes, idle resources)
   - RI/SP coverage gaps
   - Optimization opportunities
   
3. Prioritize
   - Impact vs effort matrix
   - Quick wins first
   - Plan quarterly roadmap
   
4. Implement
   - Schedule changes
   - Automate where possible
   - Validate post-change
   
5. Verify
   - Measure savings realized
   - Update baseline
   - Adjust recommendations
   
6. Repeat
   - Monthly optimization cycle
   - Quarterly roadmap review
   - Continuous improvement
```

### Monthly Optimization Process

```yaml
monthly_optimization:
  week_1:
    - "Generate right-sizing recommendations"
    - "Review RI/SP utilization and coverage"
    - "Identify waste via automated scans"
    
  week_2:
    - "Approve and schedule changes"
    - "Implement quick wins (delete orphaned resources)"
    - "Submit RI/SP purchase requests"
    
  week_3:
    - "Execute scheduled changes"
    - "Monitor post-change performance"
    - "Verify savings realized"
    
  week_4:
    - "Report savings for the month"
    - "Update optimization roadmap"
    - "Review next month's priorities"
```

### Savings Tracking

```yaml
savings_tracker:
  month: "2025-01"
  total_savings: "$45,230"
  savings_by_lever:
    right_sizing: "$12,500"
    spot_instances: "$18,700"
    ri_sp: "$8,300"
    storage_lifecycle: "$3,200"
    waste_cleanup: "$1,500"
    data_transfer: "$1,030"
    
  cumulative_ytd: "$180,500"
  savings_rate: "14.2% of total spend"
  
  active_savings_projects:
    - name: "K8s right-sizing"
      expected_savings: "$15,000/month"
      completion: "2025-03-01"
    - name: "RI purchase optimization"
      expected_savings: "$5,000/month"
      completion: "2025-02-15"
```

## Key Points

- Compute optimization (right-sizing, spot, RI/SP) offers largest savings potential
- Quick wins: delete unattached volumes, orphaned snapshots, idle resources
- Auto-scaling reduces waste from peak provisioning
- Storage lifecycle policies provide 40-70% savings on cold data
- Data transfer costs are often overlooked but significant
- K8s optimization via Kubecost + Karpenter is essential for containerized workloads
- RI/SP utilization must be tracked monthly to avoid waste
- Spot instances offer 60-90% savings but require fault tolerance
- Right-sizing before purchasing RIs is critical (don't reserve waste)
- Monthly optimization cycle ensures continuous improvement
- Savings tracking and reporting maintains momentum
- Cross-region data transfer is 3-10x more expensive than intra-region
- Support plan optimization is easy to overlook but can save thousands
- Ancillary costs (data egress, support, licensing) add up -- review quarterly
- Optimization is ongoing, not a one-time project

## Compute Optimization

### Instance Right-Sizing

```yaml
right_sizing_process:
  data_collection:
    - "CPU utilization (p50, p95, p99 over 14 days)"
    - "Memory utilization (p50, p95, p99)"
    - "Network throughput (peak)"
    - "EBS IOPS usage (peak)"
    - "Instance family-specific metrics (GPU, FPGA usage)"
  analysis:
    - "Identify consistently over-provisioned instances (CPU < 20%)"
    - "Identify burstable instances (T-family) with high average load"
    - "Identify instances with mismatched families (compute vs memory)"
    - "Graviton migration eligibility check"
  recommendation:
    - "Downsize: m5.xlarge -> m5.large (50% savings)"
    - "Family change: r5 -> m6g (Graviton, 20-40% savings)"
    - "Burstable: t3.large -> m5.large (consistent performance)"
  automation:
    - "Use AWS Compute Optimizer for weekly recommendations"
    - "Automated right-sizing during maintenance windows"
    - "CI/CD pipeline cost gates for new deployments"
```

### Graviton Migration

```yaml
graviton_migration:
  benefits:
    cost: "20-40% reduction vs comparable x86"
    performance: "Up to 40% better price-performance"
    eco: "Up to 60% lower carbon footprint"
  migration_steps:
    phase_1_evaluation:
      - "Audit all workloads for ARM compatibility"
      - "Identify blocking dependencies (native extensions, closed-source binaries)"
      - "Test critical workloads on Graviton in staging"
    phase_2_migration:
      - "Migrate stateless workloads first (web servers, APIs)"
      - "Container workloads: multi-architecture builds (linux/amd64, linux/arm64)"
      - "Database workloads: evaluate Graviton benchmarks vs x86"
    phase_3_optimization:
      - "Profile and tune for ARM architecture"
      - "Update CI/CD pipelines for multi-arch builds"
      - "Monitor performance regressions post-migration"
```

### Spot Instance Strategy

```yaml
spot_strategy:
  workload_suitability:
    good:
      - "Stateless web servers with auto-scaling"
      - "Batch processing and ETL jobs"
      - "CI/CD build agents"
      - "Big data workloads (Spark, EMR)"
      - "Container workloads (EKS, ECS with Spot)"

    avoid:
      - "Stateful databases (RDS, ElastiCache)"
      - "Applications without graceful shutdown"
      - "Low-latency real-time services"
      - "Long-running single-instance jobs"

  spot_best_practices:
    - "Use diverse instance types (at least 3-4 families)"
    - "Set max spot price to On-Demand rate"
    - "Use capacity pools across multiple AZs"
    - "Implement graceful shutdown with lifecycle hooks"
    - "Drain connections before termination"
    - "Buffer with On-Demand capacity (50% spot, 50% OD)"

  spot_architecture:
    mixed_instance_policy:
      on_demand_percentage: 30
      spot_percentage: 70
      instance_types:
        - m6g.large
        - m6i.large
        - m5.large
        - c6g.large
      allocation_strategy: "capacity-optimized-prioritized"
```

## Storage Optimization

### EBS Optimization

```yaml
ebs_optimization:
  gp2_to_gp3_migration:
    savings: "20-50% per volume"
    process:
      - "Modify volume type from gp2 to gp3"
      - "Baseline performance: 3000 IOPS, 125 MB/s (included)"
      - "Additional IOPS at $0.005 per provisioned IOPS"
      - "Additional throughput at $0.04 per MB/s"
    automation:
      - "Use AWS Config rule to identify gp2 volumes"
      - "Lambda function to batch modify volumes"
      - "Schedule migration during low-traffic windows"

  unattached_volumes:
    detection:
      - "CloudWatch alarm: VolumeInUse = false for > 7 days"
      - "AWS Config: ebs-unattached-volume managed rule"
    action:
      - "Create snapshot before deletion"
      - "Retain snapshot for 30 days"
      - "Delete unattached volume"
      - "Notify owner via SNS"

  lifecycle:
    - "Document: Take weekly snapshot"
    - "Archive: Convert snapshot to archive tier after 90 days"
    - "Expire: Delete snapshot after 365 days"
    - "Policy: Replicate critical snapshots to secondary region"
```

### S3 Optimization

```yaml
s3_optimization:
  lifecycle_policies:
    standard: 30 days
    infrequent_access: 90 days
    glacier_instant: 180 days
    glacier_flexible: 365 days
    glacier_deep_archive: 730 days
    expire: 2555 days (7 years)

  storage_class_analysis:
    - "Enable Storage Class Analysis on all buckets"
    - "Review 30-day, 60-day, 90-day access patterns"
    - "Create lifecycle policy based on analysis"
    - "Monitor transition cost vs storage savings"

  intelligent_tiering:
    cost: "$0.0025 per 1000 objects"
    savings: "40% vs S3 Standard for unpredictable access"
    best_for:
      - "Data with unknown or changing access patterns"
      - "Data lakes with mixed hot/cold data"
      - "Backup data with occasional restores"
```

## Data Transfer Optimization

```yaml
data_transfer:
  cost_levers:
    - "Use CloudFront for egress to internet (lower cost than direct S3/ALB)"
    - "Place workloads in same AZ for free intra-region transfer"
    - "Use VPC endpoints (Gateway for S3/DynamoDB, Interface for others)"
    - "Direct Connect reduces data transfer costs for large volumes"
    - "Compression: Gzip/Brotli for API responses, Parquet for data"

  common_waste:
    - "Cross-AZ traffic for NAT gateways ($0.045/GB)"
    - "Internet egress from ALB/NLB"
    - "Uncompressed log shipping to centralized systems"
    - "Frequent S3 GET/PUT from external services"
    - "EBS snapshots to S3 without lifecycle management"

  optimization_checklist:
    - "Are services in same AZ communicating via Private IP?"
    - "Is CloudFront configured for API and static assets?"
    - "Are VPC endpoints used instead of NAT gateway?"
    - "Is compression enabled for all API responses?"
    - "Are data pipelines using compression and optimized formats?"
    - "Is Direct Connect bandwidth fully utilized?"
    - "Are multi-region data sync costs monitored?"
