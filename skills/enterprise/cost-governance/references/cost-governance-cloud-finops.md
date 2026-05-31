# Cloud FinOps and Cost Optimization

## Overview

This reference covers FinOps principles, cloud cost optimization techniques, commitment-based discounting strategies, and operational practices for managing cloud economics across AWS, Azure, and GCP.

## FinOps Principles

### The Six FinOps Principles

1. Teams need to collaborate: Engineering, Finance, Product, and Executives must work together with shared visibility into cloud costs.
2. Decisions are driven by business value: Cost optimization must be balanced against velocity, reliability, and security.
3. Everyone takes ownership for their cloud usage: Each team owns their cloud costs.
4. FinOps reports should be accessible and timely: Cost data within 24 hours, self-serve reporting.
5. A centralized team drives FinOps: A dedicated FinOps team establishes governance and enables teams.
6. Take advantage of the variable cost model: The cloud value is in elastic pricing. Do not fix all costs.

### FinOps Persona Needs

Executives: Total spend vs budget, unit economics, optimization ROI, 4-quarter forecast.

Finance: Cost allocation per business unit, accruals, commitment amortization, invoice reconciliation.

Engineering: Per-service cost breakdown, optimization recommendations, CI/CD cost feedback, tag compliance.

Product: Cost per feature/customer, infrastructure cost of new products, platform investment ROI.

## Cloud Provider Cost Management Tools

### AWS Tools

AWS Cost Explorer: Pre-built dashboards, filter by service/region/account/tag, 12-month forecast, RI/SP recommendations.

AWS Budgets: Cost, usage, RI, and Savings Plans coverage budgets with SNS alert integration. Budget Actions for automated remediation.

AWS Cost Anomaly Detection: ML-based cost and usage anomaly detection. Root cause analysis. Slack/email alerts.

AWS Compute Optimizer: ML-based rightsizing for EC2, ASG, EBS, Lambda. Identifies over/under-provisioned resources.

AWS Trusted Advisor: Idle resources, underutilized EBS, idle RDS, RI optimization.

### Azure Tools

Azure Cost Management + Billing: Cost analysis, budgets with action groups, anomaly detection, RI/SP recommendations.

Azure Advisor: Rightsizing (90+ days utilization data), RI purchase recommendations, idle resource identification.

Azure Reservations: 1-year or 3-year terms. Covers VMs, SQL DB, Cosmos DB. Flexible size and region scope.

### GCP Tools

GCP Cloud Billing: Cost tables, budgets, BigQuery export, committed use discount management.

GCP Recommender: Rightsizing, CUD recommendations, idle project detection.

GCP Committed Use Discounts: 1-year or 3-year for vCPUs and memory. Applies regionally.

## Compute Optimization

### Rightsizing Methodology

Rightsizing is the highest-impact optimization activity. Process:

1. Collect utilization data for all compute instances over 14+ days
2. Analyze CPU, memory, and network utilization patterns
3. Identify candidate instances: CPU < 20% average, memory < 30% average for 14 days
4. Evaluate smaller instance type, same family
5. Evaluate different family (compute vs memory optimized)
6. Consider Graviton/ARM-based instances (AWS, 20-40% cost reduction)
7. Apply change: create recommendation ticket, schedule resize
8. Monitor for performance regression (7 days post-change)
9. Confirm savings: compare pre/post cost

Rightsizing by pattern:
- Steady low utilization: Downsize to smaller type
- Periodic spikes: Downsize + autoscaling to handle spikes
- Burstable workloads: Use T-series instances with credits
- Batch jobs: Use spot instances with fallback to on-demand

### Spot/Preemptible Instances

Spot instances offer 60-90% discount over on-demand with trade-off of potential interruption.

Workloads suitable for spot:
- Stateless batch processing
- CI/CD build agents
- Data analytics and ETL
- ML training (checkpoint-friendly)
- Container clusters with diverse instance pools
- Web servers (with ASG mixing on-demand and spot)

Workloads unsuitable for spot:
- Stateful databases
- Real-time transaction processing
- Long-running critical jobs without checkpointing
- Systems requiring deterministic capacity

Best practices for spot adoption:
- Use diverse instance types and sizes (maximize spot capacity pool)
- Set maximum spot price (or use recommended price)
- Use Spot Fleet / EC2 Fleet for diversified allocation
- Implement graceful shutdown handling (SIGTERM -> save state -> terminate)
- Monitor interruption rates by instance type and region
- Mix spot with on-demand (minimum 20% on-demand for reliability)

Spot adoption goal: 40-60% of compute on spot for suitable workloads.

### Container Optimization

Container-specific optimization:

Resource Requests and Limits:
- Set requests = typical usage (not peak)
- Set limits = peak + buffer (typically 1.5-2x requests)
- Use VPA (Vertical Pod Autoscaler) to recommend optimal requests
- Review and update quarterly

Cluster Right-sizing:
- Use Cluster Autoscaler with diverse instance types
- Combine spot and on-demand node groups
- Use node auto-repair and auto-provisioning
- Monitor cluster utilization: target 60-70% node average

Pod Density Optimization:
- Right-size pod requests (reduces nodes needed)
- Remove sidecar containers when not needed
- Share sidecars across pods (Istio injection, logging agent)
- Use pod priority classes for preemption

## Storage Optimization

### Storage Tiering

Implement lifecycle policies to automatically move data through storage tiers:

| Tier | Access Pattern | Cost/GB/month | Use Case |
|------|---------------|---------------|----------|
| Hot (SSD) | Real-time | $0.08-0.16 | Production databases, active files |
| Warm (HDD) | Hourly-daily | $0.02-0.05 | Application logs, media files |
| Cold (Standard) | Monthly | $0.01-0.025 | Backups, older logs, completed jobs |
| Archive | Rarely (< 1/yr) | $0.001-0.004 | Compliance archives, old backups |

Lifecycle rules (S3 example):
```json
{
  "rules": [
    {
      "id": "tier-to-ia",
      "status": "Enabled",
      "transitions": [
        {
          "days": 30,
          "storage_class": "STANDARD_IA"
        },
        {
          "days": 90,
          "storage_class": "GLACIER"
        },
        {
          "days": 365,
          "storage_class": "DEEP_ARCHIVE"
        }
      ],
      "expiration": {
        "days": 2555
      }
    }
  ]
}
```

### Storage Optimization Actions

EBS Optimization:
- Delete unattached volumes (snapshot first if needed)
- Right-size: monitor IOPS and throughput, not just GB
- Use gp3 instead of io1/io2 (baseline performance included)
- Snapshot lifecycle: delete old snapshots per retention policy
- Use instance store where data is ephemeral

S3 Optimization:
- Lifecycle policies for all buckets
- S3 Intelligent-Tiering for unpredictable access patterns
- S3 Storage Lens for cost and usage analytics
- Enable S3 Object Lambda for transformation without storage copies
- Use S3 Batch Operations for large-scale cost optimization

Backup Optimization:
- Tier backups to cold/archive storage
- Incremental backups instead of full (where supported)
- Define retention policies (daily -> weekly -> monthly -> yearly)
- Delete backups for terminated resources

## Data Transfer Optimization

### Network Egress Reduction

Data transfer (egress) is often a significant and overlooked cost:

- CDN: Cache at edge, reduce origin requests by 60-90%
- Compression: Enable gzip/brotli, reduce bytes transferred by 50-80%
- Image optimization: Resize and compress at edge, reduce image bytes by 40-80%
- API optimization: GraphQL batching, field selection, reduce response size
- Protocol: HTTP/2 multiplexing, reduce connection overhead
- Caching headers: Set long cache lifetimes for static assets

Multi-region egress costs:
- Keep data within same region when possible
- Use CloudFront / Global Accelerator for global traffic
- Cross-region data transfer costs: $0.01-0.09/GB
- Same-region (AZ to AZ): $0.01/GB
- Same-AZ: Free

## Commitment-Based Discounting

### Reserved Instances (AWS)

Standard RI: 1-year or 3-year term, specific instance family. 40-60% discount.

Convertible RI: 1-year or 3-year, can change instance family. 30-50% discount.

Sizing flexibility: Standard RIs apply to instance family usage across any size in the same AZ.

RI Purchase Strategy:
1. Baseline: Identify stable base load (minimum 24x7 usage)
2. Coverage target: 60-80% of base load on RI
3. Term: Start with 1-year, renew to 3-year for confirmed steady workloads
4. Payment: All upfront yields highest discount (vs partial or no upfront)
5. Scope: Regional (flexible) vs Zonal (specific AZ, for capacity reservation)

RI Coverage Monitoring:
- Coverage % = RI Usage / Total Usage
- Target: 60-80% coverage for stable workloads
- Below 40%: RIs underutilized, check for waste
- Above 90%: Potential over-commitment, risk of unused RI

### Savings Plans (AWS)

Compute Savings Plans: 1-year or 3-year. Applies to any compute (EC2, Fargate, Lambda).

EC2 Instance Savings Plans: 1-year or 3-year. Applies within instance family.

Savings Plans are more flexible than RIs and recommended as the default commitment vehicle:

- Compute SP covers more services (EC2, Fargate, Lambda)
- Automatically applies to any region, OS, tenancy
- No instance exchange needed if you change instance types

Savings Plans vs RIs: Use Savings Plans as default. Use RIs only for specific capacity reservations (zonal) or when greater discount is needed for fixed workloads.

### Azure Reserved Instances

1-year or 3-year. Up to 72% discount. Applies to VM series across regions (with instance size flexibility).

Azure Hybrid Benefit: Use existing Windows Server/SQL Server licenses for additional savings.

### GCP Committed Use Discounts (CUD)

1-year or 3-year. Covers vCPU and memory. Regional scope.

GCP has no upfront payment requirement. CUDs are billed monthly regardless of usage.

Resource-based CUD vs spend-based CUD:
- Resource-based: Commit to specific machine type
- Spend-based: Commit to minimum spend per month (e.g., $1000/month). More flexible.

### Commitment Purchase Workflow

```
1. Analyze: Review 90-day compute usage. Identify stable base load.
2. Recommend: Run cloud provider recommendations for RI/SP/CUD.
3. Approve: Engineering + Finance review. Verify workload stability.
4. Purchase: Buy RI/SP/CUD. All upfront for maximum savings.
5. Monitor: Track coverage and utilization weekly.
6. Adjust: Sell/modify RIs if workload changes. Purchase additional.
7. Report: Monthly savings report vs on-demand baseline.
```

## Database Optimization

### RDS Optimization

- Right-size instance: monitor CPU, memory, connections, IOPS
- Use Storage Auto Scaling (prevents out-of-space events)
- Reserved instances for 24x7 databases (40-60% savings)
- Read replicas: offload read traffic from primary
- Aurora: Better performance/cost ratio than standard RDS
- Serverless (Aurora Serverless v2): For variable workloads
- Backup retention: match regulatory requirements, no longer

### DynamoDB Optimization

- On-demand vs Provisioned: On-demand for variable workloads, provisioned for steady (up to 70% savings)
- Auto-scaling: Set min/max RCU/WCU reasonably
- DAX caching: Reduce read capacity by 80%+ for hot data
- TTL: Expire old items automatically (reduce storage cost)
- S3 integration: Store large attributes in S3, reference in DynamoDB

### Data Warehouse Optimization

- Redshift: Use RA3 for managed storage (separate compute from storage)
- Redshift: Concurrency scaling for spike handling
- BigQuery: Flat-rate pricing for predictable workloads
- BigQuery: Partition and cluster tables to reduce query cost
- Snowflake: Auto-suspend for idle warehouses
- Snowflake: Use standard edition (not enterprise) when possible

## Serverless Cost Optimization

### Lambda Optimization

- Memory allocation: Higher memory = faster execution = shorter duration
  - 256MB vs 128MB: 2x speed often costs same (half the duration)
  - Tune memory for optimal cost-performance (1ms time-tradeoff factor)
- Provisioned concurrency: Only for latency-critical paths
- Avoid recursive functions (S3 -> Lambda -> S3 -> Lambda)
- Use Lambda Power Tuning tool to find optimal memory
- Monitor for cold start rate and provisioned concurrency waste

### API Gateway Optimization

- Use regional endpoints (not edge-optimized) when users are regional
- Enable caching for stable response data
- Throttle aggressively (per-client, per-method)
- Use CloudFront in front of API Gateway for DDoS protection + caching

## Managed Service Optimization

### Kubernetes/EKS Cost Optimization

- Rightsize pod resource requests and limits
- Use cluster autoscaler with diverse instance types
- Enable CA over-provisioning for rapid scale-up
- Use spot instances for worker nodes
- Implement node auto-repair and rebalancing
- Consider Fargate for burst capacity (no node management)
- Use Karpenter for AWS EKS (direct instance provisioning, higher utilization)

### Monitoring and Logging Optimization

- Log retention: 30 days hot, 90 days warm, 1 year cold, 7 years archive
- Sampling: Reduce log volume for high-volume services (1:10 sample)
- Metrics: Align metric retention with actual need (not defaults)
- Tracing: Sample traces (1% for production, 10% for staging)
- Aggregated logging: Use structured logging to reduce volume
- CloudWatch Logs: Subscribe to S3/Elasticsearch for cheaper long-term storage

## Savings Tracking and Reporting

### Savings Calculation Methodology

Gross Savings: Cost before optimization - Cost after optimization
Net Savings: Gross Savings - Cost of optimization (tooling, team time, commitments)

Savings from:
- Rightsizing (downsizing instances) = (old_cost - new_cost) * hours
- Eliminating waste (deleting unused) = old_cost (full savings)
- RI/SP purchases = on_demand_cost - committed_cost
- Storage tiering = hot_cost - cold_cost
- Spot adoption = on_demand_cost - spot_cost

Important: Adjust for usage changes. If usage increased 20% but cost stayed flat, that is still savings.

### Savings Dashboard

```
| Category | Current Month | YTD | Annualized |
|----------|--------------|-----|------------|
| Rightsizing | $12,400 | $87,000 | $148,800 |
| RI/SP Coverage | $45,200 | $316,000 | $542,400 |
| Waste Elimination | $8,100 | $56,700 | $97,200 |
| Storage Optimization | $3,800 | $26,600 | $45,600 |
| Spot Adoption | $6,500 | $45,500 | $78,000 |
| Total Optimization | $76,000 | $531,800 | $912,000 |

Optimization ROI (YTD): $531,800 saved / $120,000 cost = 4.4x
```

## FinOps Operational Practices

### Cost Visibility Implementation

1. Deploy resource tagging: mandatory tag enforcement
2. Set up cost and usage reports: daily export to analysis tool
3. Build cost dashboards: by cost center, service, environment
4. Configure anomaly detection: ML-based for comprehensive coverage
5. Create budget alerts: graduated thresholds with routing

### Operational Reviews

Weekly (15 min): Review anomalies, top cost changes, budget alerts.

Monthly (60 min): Cloud Cost Council meeting. Review cost vs budget, optimization progress, commitment coverage, unit economics.

Quarterly (90 min): Deep dive with each cost center. Review trends, set optimization goals, evaluate RI/SP strategy.

### Continuous Improvement Loop

1. Visibility: See cost data (dashboards, reports)
2. Analysis: Identify optimization opportunities (rightsizing, waste, commitments)
3. Implementation: Apply changes (IaC, manual, automated)
4. Verification: Confirm savings realized
5. Governance: Track metrics, report progress
6. Repeat: Next cycle with new focus areas
