# Cloud Cost Optimization

## Overview

Cloud cost optimization ensures that cloud infrastructure spending is aligned with business value. This guide covers cost allocation, right-sizing, reserved capacity, storage optimization, data transfer cost management, and organizational cost governance practices.

## Cost Allocation and Tagging

```yaml
cost_allocation:
  tagging_strategy:
    mandatory_tags:
      - "Environment: dev, staging, prod, test"
      - "Team/owner: team-name, contact-email"
      - "Project: project-name, project-id"
      - "Cost-center: cost-center-code"
      - "Resource-purpose: api-server, worker, database, cache"
    recommended_tags:
      - "Auto-shutdown: true/false (non-prod resources)"
      - "Compliance: hipaa, pci, soc2, none"
      - "Created-by: user, terraform, pipeline"
      - "Dept: engineering, marketing, data-science"
    enforcement:
      - "Tag policies at account/project level — deny provisioning of untagged resources"
      - "Automated tagging via IaC templates (Terraform, CloudFormation)"
      - "Weekly tag compliance report to team leads"
      
  cost_allocation_methods:
    direct: "Resources tagged to single cost center — straightforward tracking"
    proportional: "Shared resources (VPN, monitoring, logging) split by usage metrics"
    fixed: "Flat charge for shared platform services spread across teams"
    showback: "Report costs to teams without charging — visibility first"
    chargeback: "Actual cost deducted from team budget — with negotiation and credits"
```

## Right-Sizing

```yaml
right_sizing:
  compute:
    cpu_utilization:
      target: "40-60% average utilization for steady-state workloads"
      low_utilization: "<20% — downsize instance type"
      high_utilization: ">80% — consider scaling up or horizontal scaling"
    memory_utilization:
      target: "60-80% average utilization for steady-state workloads"
      low_utilization: "<40% — downsize or switch to smaller instance"
      high_utilization: ">90% — may cause OOM — scale up or optimize application"
    analysis_tools:
      - "AWS Compute Optimizer"
      - "Azure Advisor"
      - "GCP Recommender"
      - "CloudHealth, CloudCheckr (third-party)"
      
  database:
    underutilized: "Idle connections, low CPU/memory usage — downsize instance"
    overprovisioned: "Purchase larger instance for future — right-size to current needs"
    serverless_options:
      - "Aurora Serverless (AWS)"
      - "Azure SQL Serverless"
      - "Cloud SQL with auto-scaling"
    read_replicas: "Offload read traffic to replicas — scale main instance for writes only"
    
  storage:
    unallocated: "Orphaned EBS volumes, unattached disks — delete after 14 days"
    oversized: "Provisioned with more IOPS or capacity than needed — right-size"
    cold_data: "Data not accessed in 30+ days — move to colder storage tier"
```

## Reserved Capacity vs On-Demand

```yaml
reserved_capacity:
  compute_pricing:
    on_demand: "Full price — for variable/unpredictable workloads, dev/test"
    reserved_instance_1yr: "~40% discount over on-demand"
    reserved_instance_3yr: "~60% discount over on-demand"
    spot_instance: "~70-90% discount — for fault-tolerant, interruptible workloads"
    savings_plans_aws: "Flexible commitment ($/hour) across instance families and regions"
    
  selection_framework:
    steady_state_workloads: "Use reserved instances or savings plans (1yr or 3yr)"
    predictable_baseline: "Cover baseline with reserved, scale with on-demand/spot"
    batch_jobs: "Spot instances with graceful interruption handling"
    dev_test: "On-demand + scheduled shutdown during off-hours"
    containers:
      - "Fargate: no instance management — pay per task"
      - "EKS/GKE: mix of reserved + spot nodes in node group"
      
  commitment_strategy:
    phased: "Start with 1-year commitments — migrate to 3-year as usage stabilizes"
    partial: "Cover 60-80% of expected spend with reserved — leave room for growth"
    flexible: "Convertible RIs or Savings Plans for multi-instance flexibility"
```

## Storage Cost Optimization

```yaml
storage_optimization:
  object_storage_tiers:
    standard:
      use_case: "Frequently accessed data, active content"
      cost_per_gb: "Baseline"
      retrieval_cost: "Free"
    infrequent_access:
      use_case: "Backups, older data accessed monthly"
      cost_per_gb: "~50% of standard"
      retrieval_cost: "Per GB retrieval fee"
    archive:
      use_case: "Compliance archives, old backups"
      cost_per_gb: "~20% of standard"
      retrieval_cost: "Higher — takes hours to restore"
    deep_archive:
      use_case: "Legal holds, long-term compliance"
      cost_per_gb: "~10% of standard"
      retrieval_cost: "Highest — takes 12-48 hours"
      
  lifecycle_policies:
    rule_example:
      - "After 30 days: move from Standard to Infrequent Access"
      - "After 90 days: move from IA to Archive"
      - "After 365 days: delete or move to Deep Archive"
      - "Delete incomplete multipart uploads after 7 days"
    implementation: "S3 Lifecycle, Azure Blob Lifecycle, GCP Object Lifecycle"
    
  storage_efficiency:
    deduplication: "Eliminate duplicate data blocks — backup storage, shared file systems"
    compression: "Enable compression on all applicable storage (log files, backups, archives)"
    snapshot_management: "Delete stale snapshots (retain last 7 daily, 4 weekly, 12 monthly)"
```

## Data Transfer Cost Management

```yaml
data_transfer_costs:
  inter_region:
    cost: "Pay per GB between regions — significant for chatty service-to-service communication"
    optimization:
      - "Collocate services in same region when possible"
      - "Use region-local endpoints instead of global"
      - "Aggregate data transfers — batch requests over streaming"
      - "Use CDN for user-facing content distribution"
      
  internet_egress:
    cost: "Pay per GB out to internet — often the largest hidden cost"
    optimization:
      - "Use CDN (CloudFront, Cloudflare) for all user-facing content"
      - "Compress API responses (gzip, brotli)"
      - "Optimize API payloads — reduce field count, paginate lists"
      - "Cache aggressively — reduce repeated data transfer"
      - "Use CloudFront Origin Shield (AWS) for origin fetch reduction"
      
  inter_service:
    same_az: "Free — data transfer between services in same availability zone"
    cross_az: "Small charge — keep services in same AZ for chatty communication"
    cross_region: "Full charge — avoid for latency-tolerant services"
```

## Organizational Cost Governance

```yaml
cost_governance:
  budget_alerts:
    at_spend: 
      - "50% of budget: notify team lead"
      - "80% of budget: notify team + finance"
      - "100% of budget: auto-create ticket for review"
      - "120% of budget: require approval before new provisioning"
      
  cost_review_cadence:
    weekly: "Team lead reviews top-10 cost drivers — identify anomalies"
    monthly: "Finance review — compare actual vs budget, update forecasts"
    quarterly: "Executive review — optimization initiatives, RI/Savings Plan purchase"
    
  cost_anomaly_detection:
    sources: ["New service deployment with unexpected cost", "Data transfer spike", "Orphaned resources", "API call volume surge"]
    response:
      - "Analyze: identify root cause (new feature, bug, misconfig)"
      - "Classify: expected growth vs anomaly vs waste"
      - "Action: optimize, rollback, or adjust budget"
    tools: ["AWS Cost Anomaly Detection", "Azure Cost Alerts", "CloudHealth Anomaly Detection"]
    
  finops_practices:
    - "Dedicated FinOps team (or embedded FinOps champion) for accounts >$100k/month cloud spend"
    - "Unit economics: cost per transaction, per user, per API call"
    - "Showback/chargeback: teams see and own their cloud costs"
    - "Architecture cost review: cost impact evaluated during architecture review"
    - "Greenfield cost estimation: estimate monthly cost before building new features"
```
